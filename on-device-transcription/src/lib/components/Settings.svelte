<script lang="ts">
	import { config } from '$lib/stores/config';
	import { currentUser, logout } from '$lib/stores/auth';

	let apiKeyValue = '';
	let languageValue = 'en';
	let transcriptionModelValue = 'whisper-large-v3-turbo';
	let summarizationModelValue = 'llama-3.3-70b-versatile';
	let visible = false;

	function triggerAuth(mode: 'login' | 'signup') {
		visible = false;
		// Dispatch custom event that layout listens to
		window.dispatchEvent(new CustomEvent('open-auth', { detail: mode }));
	}

	export function open() {
		apiKeyValue = $config.groqApiKey;
		languageValue = $config.language;
		transcriptionModelValue = $config.transcriptionModel;
		summarizationModelValue = $config.summarizationModel;
		visible = true;
	}

	function save() {
		config.set({
			groqApiKey: apiKeyValue,
			language: languageValue,
			transcriptionModel: transcriptionModelValue,
			summarizationModel: summarizationModelValue,
		});
		visible = false;
	}

	function cancel() {
		visible = false;
	}

	function onKeyup(e: KeyboardEvent) {
		if (e.key === 'Escape') cancel();
	}

	function handleApiKeyInput(e: Event) {
		apiKeyValue = (e.target as HTMLInputElement).value;
	}
</script>

{#if visible}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="overlay" on:click|self={cancel} on:keyup={onKeyup}>
		<div class="modal">
			<div class="flex items-center justify-between mb-5">
				<h2 class="text-lg font-semibold text-gray-800">Settings</h2>
				<button type="button" on:click={cancel} class="text-gray-400 hover:text-gray-600 p-1">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
							d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="space-y-5">
				<div>
					<label for="groq-key-input" class="block text-sm font-medium text-gray-700 mb-1.5">
						Groq API Key
					</label>
					<!-- Using value + on:input instead of bind:value -->
					<input
						id="groq-key-input"
						type="text"
						autocomplete="off"
						spellcheck="false"
						data-form-type="other"
						value={apiKeyValue}
						on:input={handleApiKeyInput}
						class="field"
						placeholder="gsk_..."
					/>
					<p class="text-xs text-gray-400 mt-1.5">
						Get your free API key from
						<a href="https://console.groq.com" target="_blank" rel="noopener"
							class="text-blue-500 hover:underline">console.groq.com</a>
					</p>
				</div>

				<div>
					<label for="lang-select" class="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
					<select id="lang-select" bind:value={languageValue} class="field">
						<option value="en">English</option>
						<option value="de">German</option>
						<option value="es">Spanish</option>
						<option value="fr">French</option>
						<option value="ja">Japanese</option>
						<option value="zh">Chinese</option>
						<option value="hi">Hindi</option>
						<option value="ar">Arabic</option>
						<option value="">Auto-detect</option>
					</select>
				</div>

				<div>
					<label for="t-model" class="block text-sm font-medium text-gray-700 mb-1.5">Transcription Model</label>
					<select id="t-model" bind:value={transcriptionModelValue} class="field">
						<option value="whisper-large-v3-turbo">Whisper Large v3 Turbo (Recommended)</option>
						<option value="whisper-large-v3">Whisper Large v3</option>
					</select>
				</div>

				<div>
					<label for="s-model" class="block text-sm font-medium text-gray-700 mb-1.5">Summarization Model</label>
					<select id="s-model" bind:value={summarizationModelValue} class="field">
						<option value="llama-3.3-70b-versatile">Llama 3.3 70B (Recommended)</option>
						<option value="llama-3.1-8b-instant">Llama 3.1 8B (Faster)</option>
						<option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
					</select>
				</div>

				<div class="pt-4 border-t border-gray-100">
					<label class="block text-sm font-medium text-gray-700 mb-2">Cloud Account</label>
					<div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
						{#if $currentUser}
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-600 font-medium">Logged in as <b>{$currentUser.username}</b></span>
								<button type="button" on:click={logout} class="text-xs text-red-500 hover:underline">Sign Out</button>
							</div>
						{:else}
							<p class="text-xs text-gray-500 mb-2">Sign in to save your summaries to the Vercel database.</p>
							<div class="flex space-x-2">
								<button type="button" on:click={() => triggerAuth('signup')} class="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md font-medium">Create Account</button>
								<button type="button" on:click={() => triggerAuth('login')} class="text-xs bg-white text-gray-600 border border-gray-200 px-3 py-1.5 rounded-md font-medium">Sign In</button>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100">
				<button type="button" on:click={cancel}
					class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100">
					Cancel
				</button>
				<button type="button" on:click={save}
					class="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
					Save
				</button>
			</div>
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
		width: 480px;
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
