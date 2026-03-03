import torch
import torchaudio
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
import sounddevice as sd
import soundfile as sf
import numpy as np
import sys
import queue
import time
import argparse
import subprocess
import os

# Config
MODEL_NAME = "ibm-granite/granite-speech-3.3-2b"
SAMPLE_RATE = 16000
CHUNK_DURATION = 0.5  # Process in small chunks for VAD reactivity
BLOCK_SIZE = int(SAMPLE_RATE * CHUNK_DURATION)

# VAD Config
SILENCE_DURATION = 999999.0  # Indefinite
MIN_SENTENCE_DURATION = 0.5
MAX_SENTENCE_DURATION = 999999.0  # Indefinite
VAD_ADAPTIVE_ALPHA = 0.05

# Groq Config
GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_MODEL = "whisper-large-v3"

class GraniteTranscriber:
    def __init__(self, model_name=MODEL_NAME, use_groq=False, groq_api_key=None, no_vad_transcribe=False):
        self.use_groq = use_groq
        self.groq_api_key = groq_api_key.strip() if groq_api_key else None
        self.no_vad_transcribe = no_vad_transcribe
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Performance/VAD state
        self.background_rms = 0.005 # Initial estimate
        self.vad_threshold = 0.01
        self.latest_text = ""
        
        if not use_groq:
            print(f"Loading model {model_name}...")
            self.processor = AutoProcessor.from_pretrained(model_name)
            self.tokenizer = self.processor.tokenizer
            
            load_args = {
                "device_map": "auto",
                "torch_dtype": torch.bfloat16,
                "low_cpu_mem_usage": True
            }
            
            try:
                self.model = AutoModelForSpeechSeq2Seq.from_pretrained(model_name, **load_args)
            except Exception as e:
                print(f"Error loading model with auto device map: {e}")
                print("Attempting to load directly to CPU...")
                self.model = AutoModelForSpeechSeq2Seq.from_pretrained(
                    model_name, 
                    torch_dtype=torch.bfloat16,
                    low_cpu_mem_usage=True
                )
                self.model.to(self.device)
        else:
            print("Using Groq API for transcription.")

        self.audio_queue = queue.Queue()
        self.all_audio = []  # To save the full recording

    def transcribe(self, audio_data, language=None):
        # Clear the meter line before printing transcription info
        sys.stdout.write("\r" + " " * 50 + "\r")
        sys.stdout.flush()
        
        if self.use_groq:
            return self.transcribe_groq(audio_data, language)
        else:
            return self.transcribe_local(audio_data)

    def transcribe_groq(self, audio_data, language=None):
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
            tmp_name = tmp_wav.name
            sf.write(tmp_name, audio_data, SAMPLE_RATE)
        
        try:
            import requests
            files = {
                'file': (os.path.basename(tmp_name), open(tmp_name, 'rb'), 'audio/wav'),
                'model': (None, GROQ_MODEL),
            }
            if language:
                files['language'] = (None, language)
            
            headers = {
                'Authorization': f'Bearer {self.groq_api_key}'
            }
            
            # Use verbose for debugging, but keeping CLI clean
            # print(f"Sending to Groq API ({len(audio_data)/SAMPLE_RATE:.1f}s)...", flush=True)
            response = requests.post(GROQ_API_URL, headers=headers, files=files)
            if response.status_code == 200:
                return response.json().get('text', '').strip()
            else:
                print(f"Groq API Error: {response.status_code} - {response.text}")
                return ""
        except Exception as e:
            print(f"Error during Groq transcription: {e}")
            return ""
        finally:
            if os.path.exists(tmp_name):
                os.remove(tmp_name)

    def transcribe_local(self, audio_data):
        # Convert to torch tensor
        audio_tensor = torch.from_numpy(audio_data).float()
        if audio_tensor.ndim > 1:
            audio_tensor = audio_tensor.mean(dim=1)  # Mono
            
        system_prompt = "Knowledge Cutoff Date: April 2024.\nYou are Granite, developed by IBM. You are a helpful AI assistant"
        user_prompt = "<|audio|>can you transcribe the speech into a written format?"
        
        chat = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        
        prompt = self.tokenizer.apply_chat_template(chat, tokenize=False, add_generation_prompt=True)
        
        # print(f"Transcribing {len(audio_tensor)/SAMPLE_RATE:.2f}s of audio...")
        
        t0 = time.time()
        model_inputs = self.processor(prompt, audio_tensor, sampling_rate=SAMPLE_RATE, return_tensors="pt").to(self.device)
        t1 = time.time()
        
        with torch.no_grad():
            model_outputs = self.model.generate(
                **model_inputs, 
                max_new_tokens=150, 
                do_sample=False,
                num_beams=1, # Greedy search is faster
                use_cache=True # Faster autoregressive generation
            )
        t2 = time.time()
            
        num_input_tokens = model_inputs["input_ids"].shape[-1]
        new_tokens = model_outputs[0, num_input_tokens:]
        
        t3 = time.time()
        output_text = self.tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
        t4 = time.time()
        
        # Performance summary
        # audio_len = len(audio_data) / SAMPLE_RATE
        # total_time = t4 - t0
        # rtf = total_time / audio_len if audio_len > 0 else 0
        # print(f"Done in {total_time:.2f}s (Inference: {t2-t1:.2f}s, RTF: {rtf:.2f}). Generated {len(new_tokens)} tokens.")
            
        return output_text

    def draw_meter(self, rms, text=""):
        meter_len = 20
        level = int(min(np.sqrt(rms) * 3, 1.0) * meter_len)
        bar = "█" * level + "░" * (meter_len - level)
        color = "\033[92m" # Green
        if level > meter_len * 0.5: color = "\033[93m" # Yellow
        if level > meter_len * 0.8: color = "\033[91m" # Red
        
        # Format the meter line
        meter = f"{color}[{bar}] {rms:.4f}\033[0m"
        
        # Add real-time transcription if available
        if text:
            # Truncate text if it's too long for the same line
            max_text_len = 80 
            display_text = (text[:max_text_len] + '..') if len(text) > max_text_len else text
            meter += f" | \033[94m{display_text}\033[0m"
            
        return f"\r{meter}   "

    def audio_callback(self, indata, frames, time, status):
        if status:
            print(status, file=sys.stderr)
        self.audio_queue.put(indata.copy())

    def start_live(self, language=None, output_file=None, audio_output=None):
        print(f"Starting indefinite transcription (Language: {language if language else 'auto'}).")
        print("Real-time updates will appear beside the meter. Press Ctrl+C to stop.")
        
        if output_file:
            with open(output_file, "a") as f:
                f.write(f"--- Session Started: {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
                f.flush()
                os.fsync(f.fileno())
        
        buffer = []
        samples_collected = 0
        last_update_time = time.time()
        UPDATE_INTERVAL = 3.0  # Faster real-time updates
        speech_detected = False

        try:
            with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, callback=self.audio_callback):
                while True:
                    chunk = self.audio_queue.get()
                    buffer.append(chunk)
                    samples_collected += len(chunk)
                    
                    if samples_collected >= BLOCK_SIZE:
                        audio_data = np.concatenate(buffer)
                        self.all_audio.append(audio_data)
                        rms = np.sqrt(np.mean(audio_data**2))
                        
                        # Update background noise floor 
                        self.background_rms = (1 - VAD_ADAPTIVE_ALPHA) * self.background_rms + VAD_ADAPTIVE_ALPHA * rms
                        self.vad_threshold = max(self.background_rms * 2, 0.005)

                        # Logic for 'Speech detected' pulses (internal state)
                        if rms > self.vad_threshold:
                            speech_detected = True
                        else:
                            speech_detected = False

                        # Periodic cumulative update
                        if time.time() - last_update_time > UPDATE_INTERVAL:
                            if self.all_audio:
                                # Optimization: Only transcribe the last 30 seconds for the live update
                                WINDOW_SIZE = 30 # Seconds
                                window_samples = int(WINDOW_SIZE * SAMPLE_RATE)
                                
                                full_audio = np.concatenate(self.all_audio)
                                if len(full_audio) > window_samples:
                                    window_audio = full_audio[-window_samples:]
                                    prefix = "... "
                                else:
                                    window_audio = full_audio
                                    prefix = ""
                                    
                                transcribed = self.transcribe(window_audio, language)
                                if transcribed:
                                    self.latest_text = f"{prefix}{transcribed}"
                                last_update_time = time.time()

                        # Draw the unified meter and text line
                        sys.stdout.write(self.draw_meter(rms, self.latest_text))
                        sys.stdout.flush()

                        if rms > 0.5:
                            sys.stdout.write("\nWARNING: Audio level is very high!\n")

                        buffer = []
                        samples_collected = 0
                        
        except KeyboardInterrupt:
            sys.stdout.write("\r" + " " * 80 + "\r")
            sys.stdout.flush()
            print("\nFinalizing transcription and saving to file...")
            
            try:
                if self.all_audio:
                    full_audio = np.concatenate(self.all_audio)
                    text = self.transcribe(full_audio, language)
                    if text:
                        print(f"[{time.strftime('%H:%M:%S')}] {text}")
                        if output_file:
                            with open(output_file, "a") as f:
                                f.write(f"[{time.strftime('%H:%M:%S')}] {text}\n")
                                f.flush()
                                os.fsync(f.fileno())

                    if output_file and os.path.exists(output_file):
                        # Generate summary
                        DIR = os.path.dirname(os.path.abspath(__file__))
                        SUMMARIZE_DIR = os.path.join(DIR, "summarize")
                        if os.path.isdir(SUMMARIZE_DIR):
                            groq_key = self.groq_api_key
                            if not groq_key:
                                try:
                                    with open(os.path.expanduser("~/Documents/groq.txt"), "r") as kf:
                                        groq_key = kf.read().splitlines()[0].strip()
                                except: pass
                            
                            if groq_key:
                                env = os.environ.copy()
                                env["GROQ_API_KEY"] = groq_key
                                model_id = "groq/llama-3.3-70b-versatile"
                                print(f"Generating summary...", flush=True)
                                result = subprocess.run(
                                    ["pnpm", "--dir", SUMMARIZE_DIR, "run", "s", output_file, "--model", model_id, "--force-summary", "--plain", "--length", "short"],
                                    capture_output=True, text=True, env=env
                                )
                                if result.returncode == 0 and result.stdout.strip():
                                    summary = result.stdout.strip()
                                    with open(output_file, "a") as f:
                                        f.write("\n--- Summary ---\n")
                                        f.write(summary + "\n")
                                        f.flush()
                                        os.fsync(f.fileno())
                                    print("Summary saved to file.")

                if audio_output:
                    wav_output = audio_output.replace(".mp3", ".wav") if audio_output.endswith(".mp3") else audio_output
                    sf.write(wav_output, np.concatenate(self.all_audio), SAMPLE_RATE)
                    if audio_output.endswith(".mp3"):
                        subprocess.run(["ffmpeg", "-y", "-i", wav_output, "-codec:a", "libmp3lame", "-qscale:a", "2", audio_output], capture_output=True)
                        if os.path.exists(wav_output): os.remove(wav_output)
            except Exception as e:
                print(f"Error during final processing: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IBM Granite Speech Transcriber (Persistent)")
    parser.add_argument("--lang", type=str, default=None, help="Language code")
    TIMESTAMP = time.strftime('%Y-%m-%d_%H-%M-%S')
    DEFAULT_FILENAME = f"transcription_{TIMESTAMP}.txt"
    parser.add_argument("--out", type=str, default=DEFAULT_FILENAME, help="Output TXT")
    parser.add_argument("--audio-out", dest="audio_out", type=str, default=None, help="Output Audio")
    parser.add_argument("--groq", action="store_true", help="Use Groq API")
    parser.add_argument("--groq-key", type=str, help="Groq Key")
    parser.add_argument("--no-vad-transcribe", action="store_true", help="Always persistent (implied now)")
    args = parser.parse_args()
    
    if getattr(args, "audio_out", None) is None:
        args.audio_out = os.path.splitext(args.out)[0] + ".mp3"
        
    transcriber = GraniteTranscriber(use_groq=args.groq, groq_api_key=args.groq_key, no_vad_transcribe=True)
    transcriber.start_live(language=args.lang, output_file=args.out, audio_output=args.audio_out)
