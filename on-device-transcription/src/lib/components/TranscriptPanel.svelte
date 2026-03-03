<script lang="ts">
	export let transcript: string = '';
	export let isLive: boolean = false;

	let scrollContainer: HTMLDivElement;

	$: if (transcript && scrollContainer) {
		requestAnimationFrame(() => {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		});
	}
</script>

<div class="flex flex-col h-full border border-gray-200 rounded-xl overflow-hidden bg-white">
	<div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center space-x-2">
		<h3 class="text-sm font-semibold text-gray-600">Transcription</h3>
		{#if isLive}
			<span class="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
		{/if}
	</div>

	<div bind:this={scrollContainer} class="flex-1 overflow-y-auto p-4 no-scrollbar">
		{#if transcript}
			<p class="text-base leading-relaxed text-gray-800 whitespace-pre-wrap">{transcript}</p>
		{:else}
			<div class="flex flex-col items-center justify-center h-full text-center">
				<svg
					class="w-10 h-10 text-gray-300 mb-3"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
					/>
				</svg>
				<p class="text-gray-400 text-sm">
					{isLive ? 'Listening...' : 'Start recording to see transcription here'}
				</p>
			</div>
		{/if}
	</div>
</div>
