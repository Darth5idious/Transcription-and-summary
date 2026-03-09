const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are a precise summarization engine.
Summarize the following meeting/recording transcript.
Write a clear summary that covers the core points and the most important supporting details.
Use 1-3 short paragraphs followed by a "Key Points" section as a bullet list.
Do not use emojis. Be factual and do not invent details.
IMPORTANT: Always respond in the SAME LANGUAGE as the transcript. If the transcript is in German, write the summary in German. If in English, write in English.
Return only the summary in Markdown format.`;

export async function summarizeTranscript(
	transcript: string,
	apiKey: string,
	model: string = DEFAULT_MODEL
): Promise<string> {
	const response = await fetch(GROQ_CHAT_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: `Summarize this transcript:\n\n${transcript}` },
			],
			max_tokens: 1536,
			temperature: 0.3,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => '');
		throw new Error(`Groq summarization failed (${response.status}): ${errorText}`);
	}

	const payload = await response.json();
	return payload.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function* streamSummarizeTranscript(
	transcript: string,
	apiKey: string,
	model: string = DEFAULT_MODEL
): AsyncGenerator<string> {
	const response = await fetch(GROQ_CHAT_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: `Summarize this transcript:\n\n${transcript}` },
			],
			max_tokens: 1536,
			temperature: 0.3,
			stream: true,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => '');
		throw new Error(`Groq summarization failed (${response.status}): ${errorText}`);
	}

	const reader = response.body!.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
				try {
					const json = JSON.parse(trimmed.slice(6));
					const delta = json.choices?.[0]?.delta?.content;
					if (delta) yield delta;
				} catch {
					// skip malformed JSON
				}
			}
		}
	}
}

const TRANSLATE_PROMPT = `You are a professional translator.
Translate the following text to English.
Preserve all names, technical terms, and the original meaning.
Return only the translated text — no explanations or extra output.`;

export async function* streamTranslateToEnglish(
	text: string,
	apiKey: string,
	model: string = DEFAULT_MODEL
): AsyncGenerator<string> {
	const response = await fetch(GROQ_CHAT_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: 'system', content: TRANSLATE_PROMPT },
				{ role: 'user', content: text },
			],
			max_tokens: 2048,
			temperature: 0.2,
			stream: true,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => '');
		throw new Error(`Groq translation failed (${response.status}): ${errorText}`);
	}

	const reader = response.body!.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
				try {
					const json = JSON.parse(trimmed.slice(6));
					const delta = json.choices?.[0]?.delta?.content;
					if (delta) yield delta;
				} catch {
					// skip malformed JSON
				}
			}
		}
	}
}
