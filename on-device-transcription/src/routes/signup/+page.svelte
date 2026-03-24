<script lang="ts">
	import { signup } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import toast from 'svelte-french-toast';

	let username = '';
	let password = '';
	let confirmPassword = '';
	let loading = false;
	let error = '';

	async function handleSubmit() {
		error = '';
		if (!username.trim() || !password || !confirmPassword) {
			error = 'Please fill in all fields';
			return;
		}
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}
		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			return;
		}

		loading = true;
		const result = await signup(username.trim(), password);
		loading = false;

		if (result.success) {
			toast.success('Account created successfully!');
			goto('/');
		} else {
			error = result.error || 'Signup failed';
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
	<div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
		<div class="text-center">
			<h1 class="text-2xl font-bold text-gray-900">Create Account</h1>
			<p class="text-gray-500 mt-2">Sign up to sync your transcriptions to the cloud</p>
		</div>

		<form on:submit|preventDefault={handleSubmit} class="space-y-4">
			<div>
				<label for="username" class="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
				<input
					id="username"
					type="text"
					bind:value={username}
					class="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
					placeholder="Enter username"
					required
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					class="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
					placeholder="Create a password"
					required
				/>
			</div>

			<div>
				<label for="confirm" class="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
				<input
					id="confirm"
					type="password"
					bind:value={confirmPassword}
					class="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
					placeholder="Confirm your password"
					required
				/>
			</div>

			{#if error}
				<div class="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
					{error}
				</div>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50"
			>
				{loading ? 'Creating account...' : 'Sign Up'}
			</button>
		</form>

		<div class="relative flex items-center py-2">
			<div class="flex-grow border-t border-gray-200"></div>
			<span class="flex-shrink mx-4 text-gray-400 text-sm">or</span>
			<div class="flex-grow border-t border-gray-200"></div>
		</div>

		<a
			href="/api/auth/google/login"
			class="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-gray-700 font-medium transition-all"
		>
			<svg class="w-5 h-5" viewBox="0 0 24 24">
				<path
					fill="#4285F4"
					d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				/>
				<path
					fill="#34A853"
					d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				/>
				<path
					fill="#FBBC05"
					d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
				/>
				<path
					fill="#EA4335"
					d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
				/>
			</svg>
			<span>Sign in with Google</span>
		</a>

		<div class="text-center pt-4">
			<p class="text-sm text-gray-500">
				Already have an account? 
				<a href="/login" class="text-blue-600 hover:underline font-semibold">Sign In</a>
			</p>
		</div>

		<div class="text-center border-t border-gray-100 pt-6">
			<a href="/" class="text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center space-x-1">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				<span>Back to App</span>
			</a>
		</div>
	</div>
</div>
