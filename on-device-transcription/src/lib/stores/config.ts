import { writable } from 'svelte/store';
import type { AppConfig } from '$lib/types';

const STORAGE_KEY = 'transcription-studio-config';

const defaultConfig: AppConfig = {
	groqApiKey: '',
	transcriptionModel: 'whisper-large-v3-turbo',
	summarizationModel: 'llama-3.3-70b-versatile',
	language: 'en',
};

function createConfigStore() {
	let initial = defaultConfig;
	if (typeof localStorage !== 'undefined') {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				initial = { ...defaultConfig, ...JSON.parse(stored) };
			} catch {
				// ignore parse errors
			}
		}
	}

	const { subscribe, set, update } = writable<AppConfig>(initial);

	return {
		subscribe,
		set: (value: AppConfig) => {
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
			}
			set(value);
		},
		update: (fn: (config: AppConfig) => AppConfig) => {
			update((current) => {
				const updated = fn(current);
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
				}
				return updated;
			});
		},
	};
}

export const config = createConfigStore();
