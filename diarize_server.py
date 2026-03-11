#!/usr/bin/env python3
"""
Speaker diarization microservice.

POST /diarize
  multipart fields:
    file      - WAV audio file
    api_key   - Groq API key
    language  - language code (default: 'en')

Returns:
  { "segments": [{ "speaker": "Speaker 1", "text": "...", "start": 0.0, "end": 2.3 }] }
"""

import io
import os
import sys
import tempfile
import logging

# Use local clone of SpeechBrain
sys.path.insert(0, '/home/darth/Documents/Transcript/speechbrain')
import numpy as np
import httpx

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("diarize_server")

# ---------------------------------------------------------------------------
# Global model (loaded once at startup)
# ---------------------------------------------------------------------------
_encoder = None  # SpeechBrain EncoderClassifier


def load_encoder():
    global _encoder
    if _encoder is not None:
        return _encoder
    log.info("Loading SpeechBrain ECAPA-TDNN model (first run downloads ~200 MB)…")
    from speechbrain.pretrained import EncoderClassifier
    _encoder = EncoderClassifier.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        savedir="pretrained_models/spkrec-ecapa-voxceleb",
        run_opts={"device": "cpu"},
    )
    log.info("Model loaded.")
    return _encoder


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load in background thread so server starts fast
    import threading
    threading.Thread(target=load_encoder, daemon=True).start()
    yield


# ---------------------------------------------------------------------------
app = FastAPI(title="Diarization Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SPEAKER_COLORS = [
    "Speaker 1", "Speaker 2", "Speaker 3",
    "Speaker 4", "Speaker 5", "Speaker 6",
]

GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"


async def whisper_with_words(wav_bytes: bytes, api_key: str, language: str) -> dict:
    """Call Groq Whisper with word-level timestamps."""
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            GROQ_TRANSCRIPTION_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            data={
                "model": "whisper-large-v3-turbo",
                "language": language or "en",
                "response_format": "verbose_json",
                "timestamp_granularities[]": "word",
            },
            files={"file": ("recording.wav", wav_bytes, "audio/wav")},
        )
    if not resp.is_success:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


def extract_segments_from_whisper(data: dict) -> list[dict]:
    """Extract word-level segments with start/end times."""
    words = data.get("words") or []
    # Fall back to segment-level if word timestamps unavailable
    if not words:
        segments = data.get("segments") or []
        return [{"text": s.get("text", ""),
                 "start": s.get("start", 0.0),
                 "end": s.get("end", 0.0)} for s in segments if s.get("text")]
    return [{"text": w.get("word", ""),
             "start": w.get("start", 0.0),
             "end": w.get("end", 0.0)} for w in words if w.get("word")]


def embed_segments(wav_path: str, word_segments: list[dict]) -> np.ndarray:
    """
    Extract ECAPA-TDNN embeddings for each word segment window.
    Groups words into ~2-second windows to get stable embeddings.
    """
    import torchaudio
    import torch

    encoder = load_encoder()
    wav, sr = torchaudio.load(wav_path)  # (1, T)
    if sr != 16000:
        wav = torchaudio.functional.resample(wav, sr, 16000)
        sr = 16000

    WINDOW = 2.0  # seconds per embedding window
    embeddings = []

    # Group words into ~2 second windows
    windows = []
    bucket_words = []
    bucket_start = None

    for w in word_segments:
        if bucket_start is None:
            bucket_start = w["start"]
        bucket_words.append(w)
        if w["end"] - bucket_start >= WINDOW:
            windows.append((bucket_start, w["end"], list(bucket_words)))
            bucket_words = []
            bucket_start = None

    if bucket_words:
        windows.append((bucket_start, bucket_words[-1]["end"], bucket_words))

    for (start, end, words) in windows:
        s = max(0, int(start * sr))
        e = min(wav.shape[1], int(end * sr) + 1)
        chunk = wav[:, s:e]
        if chunk.shape[1] < 160:
            embeddings.append((words, None))
            continue
        with torch.no_grad():
            emb = encoder.encode_batch(chunk)  # (1, 1, D)
        emb_np = emb.squeeze().cpu().numpy()
        embeddings.append((words, emb_np))

    return windows, embeddings


def cluster_embeddings(embeddings_with_words: list, n_speakers: int = None) -> list[dict]:
    """
    Cluster embeddings and assign speaker labels.
    Returns list of { speaker, text, start, end } merged by contiguous speaker.
    """
    from sklearn.cluster import AgglomerativeClustering
    from sklearn.preprocessing import normalize

    valid_idx = [i for i, (_, emb) in enumerate(embeddings_with_words) if emb is not None]
    if not valid_idx:
        # No embeddings, assign all to Speaker 1
        all_words = [w for (words, _) in embeddings_with_words for w in words]
        return fallback_single_speaker(all_words)

    emb_matrix = np.stack([embeddings_with_words[i][1] for i in valid_idx])
    emb_matrix = normalize(emb_matrix)

    # Auto-detect number of speakers (2–6) using distance threshold
    if n_speakers is None:
        n_speakers = min(len(valid_idx), 6)
        clustering = AgglomerativeClustering(
            n_clusters=None,
            distance_threshold=0.65,
            metric="cosine",
            linkage="average",
        )
    else:
        clustering = AgglomerativeClustering(
            n_clusters=min(n_speakers, len(valid_idx)),
            metric="cosine",
            linkage="average",
        )

    labels = clustering.fit_predict(emb_matrix)

    # Map cluster int to speaker name
    seen = {}
    speaker_counter = 1
    named_labels = []
    for label in labels:
        if label not in seen:
            seen[label] = f"Person {speaker_counter}"
            speaker_counter += 1
        named_labels.append(seen[label])

    # Assign speakers to ALL windows, handling None embeddings by carrying over the last speaker
    word_speaker = []
    valid_ptr = 0
    current_speaker = named_labels[0] if named_labels else "Person 1"
    
    for words, emb in embeddings_with_words:
        if emb is not None:
            current_speaker = named_labels[valid_ptr]
            valid_ptr += 1
            
        for w in words:
            word_speaker.append({"speaker": current_speaker, "text": w["text"],
                                  "start": w["start"], "end": w["end"]})

    return merge_consecutive_speakers(word_speaker)


def fallback_single_speaker(words: list[dict]) -> list[dict]:
    if not words:
        return []
    return [{"speaker": "Speaker 1",
             "text": "".join(w["text"] for w in words),
             "start": words[0]["start"],
             "end": words[-1]["end"]}]


def merge_consecutive_speakers(word_speaker: list[dict]) -> list[dict]:
    """Merge consecutive words from the same speaker into segments."""
    if not word_speaker:
        return []
    segments = []
    current = dict(word_speaker[0])
    current["text"] = current["text"]

    for w in word_speaker[1:]:
        if w["speaker"] == current["speaker"]:
            current["text"] += w["text"]
            current["end"] = w["end"]
        else:
            segments.append(current)
            current = dict(w)

    segments.append(current)
    return segments


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": _encoder is not None}


@app.post("/diarize")
async def diarize(
    file: UploadFile = File(...),
    api_key: str = Form(...),
    language: str = Form(default="en"),
    words: str = Form(default=None),
):
    wav_bytes = await file.read()

    if words:
        import json
        log.info("Using provided word segments, skipping Whisper API")
        raw_words = json.loads(words)
        word_segments = [{"text": w.get("word", ""), "start": w.get("start", 0.0), "end": w.get("end", 0.0)} for w in raw_words if w.get("word")]
    else:
        # 1. Transcribe with Groq Whisper (word timestamps)
        log.info(f"Transcribing {len(wav_bytes)//1024} KB of audio…")
        try:
            whisper_data = await whisper_with_words(wav_bytes, api_key, language)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Groq Whisper error: {e}")

        word_segments = extract_segments_from_whisper(whisper_data)
        log.info(f"Got {len(word_segments)} word segments from Whisper")

    if not word_segments:
        return {"segments": []}

    # If audio is very short (< 3s), skip diarization
    duration = word_segments[-1]["end"] if word_segments else 0
    if duration < 3.0:
        text = "".join(w["text"] for w in word_segments)
        return {"segments": [{"speaker": "Speaker 1", "text": text,
                               "start": word_segments[0]["start"],
                               "end": word_segments[-1]["end"]}]}

    # 2. Save WAV temporarily for torchaudio
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(wav_bytes)
        tmp_path = tmp.name

    try:
        # 3. Extract embeddings
        windows, embeddings_with_words = embed_segments(tmp_path, word_segments)

        # 4. Cluster into speakers
        segments = cluster_embeddings(embeddings_with_words)
    except Exception as e:
        log.error(f"Diarization error: {e}", exc_info=True)
        # Fallback: return plain single-speaker transcript
        text = whisper_data.get("text", "").strip()
        return {"segments": [{"speaker": "Speaker 1", "text": text,
                               "start": word_segments[0]["start"] if word_segments else 0,
                               "end": word_segments[-1]["end"] if word_segments else 0}]}
    finally:
        os.unlink(tmp_path)

    log.info(f"Diarization complete: {len(set(s['speaker'] for s in segments))} speaker(s), {len(segments)} segment(s)")
    return {"segments": segments}


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    log.info("Starting diarization server on http://localhost:8765")
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="info")
