<script lang="ts">
	import { login, signup } from '$lib/stores/auth';

	export let visible = false;

	let mode: 'login' | 'signup' = 'login';
	let username = '';
	let password = '';
	let confirmPassword = '';
	let error = '';
	let loading = false;

	export function open(initialMode: 'login' | 'signup' = 'login') {
		mode = initialMode;
		username = '';
		password = '';
		confirmPassword = '';
		error = '';
		visible = true;
	}

	function close() {
		visible = false;
	}

	async function handleSubmit() {
		error = '';

		if (!username.trim() || !password) {
			error = 'Please fill in all fields';
			return;
		}

		if (mode === 'signup') {
			if (username.trim().length < 3) {
				error = 'Username must be at least 3 characters';
				return;
			}
			if (password.length < 8) {
				error = 'Password must be at least 8 characters';
				return;
			}
			if (password !== confirmPassword) {
				error = 'Passwords do not match';
				return;
			}
		}

		loading = true;

		const result = mode === 'login'
			? await login(username.trim(), password)
			: await signup(username.trim(), password);

		loading = false;

		if (result.success) {
			close();
		} else {
			error = result.error || 'Something went wrong';
		}
	}

	function toggleMode() {
		mode = mode === 'login' ? 'signup' : 'login';
		error = '';
		confirmPassword = '';
	}

	function onKeyup(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

{#if visible}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="overlay" on:click|self={close} on:keyup={onKeyup}>
		<div class="modal">
			<div class="flex items-center justify-between mb-5">
				<h2 class="text-lg font-semibold text-gray-800">
					{mode === 'login' ? 'Sign In' : 'Create Account'}
				</h2>
				<button type="button" on:click={close} class="text-gray-400 hover:text-gray-600 p-1">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
							d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<form on:submit|preventDefault={handleSubmit} class="space-y-4">
				<div>
					<label for="auth-username" class="block text-sm font-medium text-gray-700 mb-1.5">
						Username
					</label>
					<input
						id="auth-username"
						type="text"
						autocomplete="username"
						bind:value={username}
						class="field"
						placeholder="Enter username"
					/>
				</div>

				<div>
					<label for="auth-password" class="block text-sm font-medium text-gray-700 mb-1.5">
						Password
					</label>
					<input
						id="auth-password"
						type="password"
						autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
						bind:value={password}
						class="field"
						placeholder="Enter password"
					/>
				</div>

				{#if mode === 'signup'}
					<div>
						<label for="auth-confirm" class="block text-sm font-medium text-gray-700 mb-1.5">
							Confirm Password
						</label>
						<input
							id="auth-confirm"
							type="password"
							autocomplete="new-password"
							bind:value={confirmPassword}
							class="field"
							placeholder="Confirm password"
						/>
					</div>
				{/if}

				{#if error}
					<p class="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
				{/if}

				<button
					type="submit"
					disabled={loading}
					class="w-full px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium
						hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if loading}
						<span class="inline-flex items-center space-x-2">
							<span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
							<span>Please wait...</span>
						</span>
					{:else}
						{mode === 'login' ? 'Sign In' : 'Create Account'}
					{/if}
				</button>
			</form>
			<div class="relative flex items-center py-2">
				<div class="flex-grow border-t border-gray-200"></div>
				<span class="flex-shrink mx-4 text-gray-400 text-xs uppercase letter-spacing-wider">or</span>
				<div class="flex-grow border-t border-gray-200"></div>
			</div>

			<a
				href="/api/auth/google/login"
				class="w-full flex items-center justify-center space-x-2 py-2.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors"
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24">
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
				<span>Sign {mode === 'login' ? 'in' : 'up'} with Google</span>
			</a>

			<p class="text-center text-sm text-gray-500 mt-4">
				{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
				<button
					type="button"
					on:click={toggleMode}
					class="text-blue-500 hover:underline font-medium"
				>
					{mode === 'login' ? 'Sign Up' : 'Sign In'}
				</button>
			</p>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		-webkit-app-region: no-drag;
	}
	.modal {
		background: white;
		border-radius: 1rem;
		padding: 1.5rem;
		width: 420px;
		max-width: 90vw;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		-webkit-app-region: no-drag;
	}
	.field {
		display: block;
		width: 100%;
		padding: 8px 12px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 14px;
		outline: none;
		background: white;
		-webkit-app-region: no-drag;
		-webkit-user-select: text;
		user-select: text;
	}
	.field:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
	}
</style>
