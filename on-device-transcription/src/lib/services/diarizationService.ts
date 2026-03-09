const DIARIZE_URL = 'http://localhost:8765/diarize';

import type { DiarizedSegment } from '$lib/types';

export async function diarizeAudio(
    wavBlob: Blob,
    apiKey: string,
    language: string = 'en'
): Promise<DiarizedSegment[]> {
    const form = new FormData();
    form.append('file', wavBlob, 'recording.wav');
    form.append('api_key', apiKey);
    form.append('language', language);

    const response = await fetch(DIARIZE_URL, {
        method: 'POST',
        body: form,
    });

    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`Diarization server error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return (data.segments ?? []) as DiarizedSegment[];
}

export async function isDiarizeServerAvailable(): Promise<boolean> {
    try {
        const res = await fetch('http://localhost:8765/health', { signal: AbortSignal.timeout(2000) });
        return res.ok;
    } catch {
        return false;
    }
}
