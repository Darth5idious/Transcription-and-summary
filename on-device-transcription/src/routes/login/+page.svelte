<script lang="ts">
	import { login } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import toast from 'svelte-french-toast';

	let username = '';
	let password = '';
	let loading = false;
	let error = '';

	async function handleSubmit() {
		error = '';
		if (!username.trim() || !password) {
			error = 'Please fill in all fields';
			return;
		}

		loading = true;
		const result = await login(username.trim(), password);
		loading = false;

		if (result.success) {
			toast.success('Signed in successfully!');
			goto('/');
		} else {
			error = result.error || 'Login failed';
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
	<div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
		<div class="text-center">
			<h1 class="text-2xl font-bold text-gray-900">Welcome Back</h1>
			<p class="text-gray-500 mt-2">Sign in to access your cloud sessions</p>
		</div>

		<form on:submit|preventDefault={handleSubmit} class="space-y-4">
			<div>
				<label for="username" class="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
				<input
					id="username"
					type="text"
					bind:value={username}
					class="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
					placeholder="Enter your username"
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
					placeholder="Enter your password"
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
				{loading ? 'Signing in...' : 'Sign In'}
			</button>
		</form>

		<div class="text-center pt-4">
			<p class="text-sm text-gray-500">
				Don't have an account? 
				<a href="/signup" class="text-blue-600 hover:underline font-semibold">Sign Up</a>
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
