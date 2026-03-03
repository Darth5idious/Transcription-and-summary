import { writable, derived } from 'svelte/store';
import type { Session } from '$lib/types';

export const sessions = writable<Session[]>([]);
export const activeSessionId = writable<string | null>(null);

export const activeSession = derived(
	[sessions, activeSessionId],
	([$sessions, $activeSessionId]) =>
		$sessions.find((s) => s.id === $activeSessionId) ?? null
);

export const groupedSessions = derived(sessions, ($sessions) => {
	const groups: Record<string, Session[]> = {};
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	const yesterday = today - 86400000;

	for (const session of $sessions) {
		const sessionDate = new Date(session.createdAt);
		const dayStart = new Date(
			sessionDate.getFullYear(),
			sessionDate.getMonth(),
			sessionDate.getDate()
		).getTime();

		let label: string;
		if (dayStart === today) label = 'Today';
		else if (dayStart === yesterday) label = 'Yesterday';
		else
			label = sessionDate.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
			});

		if (!groups[label]) groups[label] = [];
		groups[label].push(session);
	}
	return groups;
});

export async function loadSessions() {
	if (typeof window !== 'undefined' && window.electronAPI) {
		const list = await window.electronAPI.listSessions();
		sessions.set(list);
	}
}

export async function saveSession(session: Session) {
	if (typeof window !== 'undefined' && window.electronAPI) {
		await window.electronAPI.saveSession(session);
	}
	sessions.update((list) => {
		const idx = list.findIndex((s) => s.id === session.id);
		if (idx >= 0) {
			list[idx] = session;
			return [...list];
		}
		return [session, ...list];
	});
}

export async function deleteSession(id: string) {
	if (typeof window !== 'undefined' && window.electronAPI) {
		await window.electronAPI.deleteSession(id);
	}
	sessions.update((list) => list.filter((s) => s.id !== id));
	activeSessionId.update((current) => (current === id ? null : current));
}
