import { writable, derived, get } from 'svelte/store';
import type { Session } from '$lib/types';
import { currentUser } from '$lib/stores/auth';

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

function isElectron(): boolean {
	return typeof window !== 'undefined' && !!window.electronAPI;
}

export async function loadSessions() {
	let localSessions: Session[] = [];
	if (isElectron()) {
		localSessions = await window.electronAPI!.listSessions();
	}

	const user = get(currentUser);
	if (!user) {
		sessions.set(localSessions);
		return;
	}

	try {
		const res = await fetch('/api/summaries');
		if (res.ok) {
			const data = await res.json();
			// Convert database records to Session format
			const dbSessions: Session[] = (data.summaries || []).map((s: any) => ({
				id: `db_${s.id}`,
				title: s.title,
				createdAt: new Date(s.created_at).getTime(),
				duration: s.duration || 0,
				transcript: s.transcript || '',
				summary: s.summary || '',
				translation: s.translation || undefined,
				hasAudio: false,
				_dbId: s.id, // keep track of database ID
			}));

			// Merge local and DB sessions, avoiding duplicates if possible (by title/createdAt)
			// For simplicity, we'll just show both, but DB sessions have a 'db_' prefix
			const merged = [...dbSessions, ...localSessions].sort((a, b) => b.createdAt - a.createdAt);
			sessions.set(merged);
		} else {
			sessions.set(localSessions);
		}
	} catch (err) {
		console.error('Failed to load sessions from DB:', err);
		sessions.set(localSessions);
	}
}

export async function saveSession(session: Session) {
	if (isElectron()) {
		await window.electronAPI!.saveSession(session);
	}

	// Also save to database if logged in
	const user = get(currentUser);
	if (user) {
		try {
			await fetch('/api/summaries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: session.title,
					transcript: session.transcript,
					summary: session.summary,
					translation: session.translation,
					duration: session.duration,
				}),
			});
		} catch (err) {
			console.error('Failed to save session to DB:', err);
		}
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
	if (isElectron()) {
		await window.electronAPI!.deleteSession(id);
	}

	// Also delete from database if it's a DB session or we have a DB ID
	const sessionList = get(sessions);
	const session = sessionList.find((s) => s.id === id);
	const dbId = (session as any)?._dbId || (id.startsWith('db_') ? id.slice(3) : null);

	if (dbId) {
		try {
			await fetch(`/api/summaries/${dbId}`, { method: 'DELETE' });
		} catch (err) {
			console.error('Failed to delete session from DB:', err);
		}
	}

	sessions.update((list) => list.filter((s) => s.id !== id));
	activeSessionId.update((current) => (current === id ? null : current));
}
