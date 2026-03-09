/**
 * Download utilities for transcript, summary, and audio.
 */

/** Trigger a browser file download with given content and filename. */
function triggerDownload(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/** Download a text string as a .txt file. */
export function downloadText(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
}

/** Download a markdown string as a .md file. */
export function downloadMarkdown(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/markdown; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
}

/** Download the audio blobURL directly as a WAV (fast, no encoding needed). */
export function downloadWav(blobUrl: string, filename: string) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
}

/**
 * Convert a Float32Array of 16kHz mono PCM audio to an MP3 Blob using lamejs,
 * then trigger a download. Falls back to WAV download if lamejs fails.
 */
export async function downloadMp3(
    audioData: Float32Array,
    filename: string,
    blobUrlFallback?: string
) {
    try {
        // Dynamic import so it's only loaded when requested
        const { Mp3Encoder } = await import('@breezystack/lamejs');

        const sampleRate = 16000;
        const kbps = 128;
        const encoder = new Mp3Encoder(1, sampleRate, kbps);

        // lamejs expects Int16Array
        const samples = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
            const s = Math.max(-1, Math.min(1, audioData[i]));
            samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const mp3Chunks: Uint8Array[] = [];
        const CHUNK = 1152; // lamejs standard chunk size

        for (let i = 0; i < samples.length; i += CHUNK) {
            const chunk = samples.subarray(i, i + CHUNK);
            const encoded = encoder.encodeBuffer(chunk);
            if (encoded.length > 0) mp3Chunks.push(new Uint8Array(encoded.buffer));
        }

        const final = encoder.flush();
        if (final.length > 0) mp3Chunks.push(new Uint8Array(final.buffer));

        const mp3Blob = new Blob(mp3Chunks.map(c => c.slice()), { type: 'audio/mp3' });
        const url = URL.createObjectURL(mp3Blob);
        triggerDownload(url, filename);
    } catch (e) {
        console.warn('MP3 encoding failed, falling back to WAV:', e);
        if (blobUrlFallback) {
            downloadWav(blobUrlFallback, filename.replace('.mp3', '.wav'));
        }
    }
}
