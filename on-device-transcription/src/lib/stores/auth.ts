import { writable } from 'svelte/store';
import type { User } from '$lib/types';

export const currentUser = writable<User | null>(null);
export const authLoading = writable(true);

export async function checkSession(): Promise<void> {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        currentUser.set(data.user ?? null);
    } catch {
        currentUser.set(null);
    } finally {
        authLoading.set(false);
    }
}

export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
            currentUser.set(data.user);
            return { success: true };
        }
        return { success: false, error: data.error || 'Login failed' };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

export async function signup(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
            currentUser.set(data.user);
            return { success: true };
        }
        return { success: false, error: data.error || 'Signup failed' };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

export async function logout(): Promise<void> {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
        // ignore
    }
    currentUser.set(null);
}
