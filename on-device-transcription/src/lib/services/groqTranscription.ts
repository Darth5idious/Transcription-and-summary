const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const DEFAULT_MODEL = 'whisper-large-v3-turbo';

export function float32ToWavBlob(audioData: Float32Array, sampleRate: number): Blob {
	const numChannels = 1;
	const bitsPerSample = 16;
	const bytesPerSample = bitsPerSample / 8;
	const dataLength = audioData.length * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataLength);
	const view = new DataView(buffer);

	function writeString(offset: number, str: string) {
		for (let i = 0; i < str.length; i++) {
			view.setUint8(offset + i, str.charCodeAt(i));
		}
	}

	// WAV header
	writeString(0, 'RIFF');
	view.setUint32(4, 36 + dataLength, true);
	writeString(8, 'WAVE');
	writeString(12, 'fmt ');
	view.setUint32(16, 16, true); // PCM format chunk size
	view.setUint16(20, 1, true); // PCM format
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
	view.setUint16(32, numChannels * bytesPerSample, true);
	view.setUint16(34, bitsPerSample, true);
	writeString(36, 'data');
	view.setUint32(40, dataLength, true);

	// Convert Float32 samples to 16-bit PCM
	let offset = 44;
	for (let i = 0; i < audioData.length; i++) {
		const sample = Math.max(-1, Math.min(1, audioData[i]));
		view.setInt16(offset, sample * 0x7fff, true);
		offset += 2;
	}

	return new Blob([buffer], { type: 'audio/wav' });
}

export interface TranscriptionWord {
	word: string;
	start: number;
	end: number;
}

export interface TranscriptionResult {
	text: string;
	words: TranscriptionWord[];
}

export async function transcribeAudioChunk(
	audioData: Float32Array,
	apiKey: string,
	model: string = DEFAULT_MODEL,
	language: string = 'en'
): Promise<TranscriptionResult> {
	const wavBlob = float32ToWavBlob(audioData, 16000);

	const form = new FormData();
	form.append('file', wavBlob, 'recording.wav');
	form.append('model', model);
	form.append('response_format', 'verbose_json');
	form.append('timestamp_granularities[]', 'word');
	if (language) {
		form.append('language', language);
	}

	const response = await fetch(GROQ_TRANSCRIPTION_URL, {
		method: 'POST',
		headers: { Authorization: `Bearer ${apiKey}` },
		body: form,
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => '');
		throw new Error(`Groq transcription failed (${response.status}): ${errorText}`);
	}

	const payload = await response.json();
	const wordsList = payload.words || [];
	return {
		text: wordsList.length > 0 ? wordsList.map((w: any) => w.word).join('') : (payload.text?.trim() ?? ''),
		words: wordsList
	};
}

export async function transcribeFullRecording(
	audioData: Float32Array,
	apiKey: string,
	model: string = DEFAULT_MODEL,
	language: string = 'en'
): Promise<TranscriptionResult> {
	// Groq has a 25MB file limit. At 16kHz mono 16-bit, 10 minutes ~ 19MB.
	const MAX_DURATION_SECONDS = 600;
	const samplesPerChunk = MAX_DURATION_SECONDS * 16000;

	if (audioData.length <= samplesPerChunk) {
		return transcribeAudioChunk(audioData, apiKey, model, language);
	}

	const results: string[] = [];
	const allWords: TranscriptionWord[] = [];
	let timeOffset = 0;

	for (let i = 0; i < audioData.length; i += samplesPerChunk) {
		const { text, words } = await transcribeAudioChunk(chunk, apiKey, model, language);

		if (text) results.push(text);

		// Shift timestamps for the chunk
		for (const w of words) {
			allWords.push({
				word: w.word,
				start: w.start + timeOffset,
				end: w.end + timeOffset
			});
		}

		timeOffset += MAX_DURATION_SECONDS;
	}

	return {
		text: allWords.length > 0 ? allWords.map((w: any) => w.word).join('') : results.join(' '),
		words: allWords
	};
}
