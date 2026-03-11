<script lang="ts">
	import type { DiarizedSegment } from '$lib/types';
	import { downloadText } from '$lib/utils/download';

	export let transcript: string = '';
	export let segments: DiarizedSegment[] = [];
	export let isLive: boolean = false;
	export let label: string | undefined = undefined;
	export let downloadFilename: string = 'transcript.txt';

	function handleDownload() {
		const content = segments.length > 0
			? segments.map(s => `[${s.speaker}]\n${s.text}`).join('\n\n')
			: transcript;
		downloadText(content, downloadFilename);
	}

	let scrollContainer: HTMLDivElement;

	// Speaker color palette — cycles if > 6 speakers
	const SPEAKER_COLORS: Record<string, { border: string; badge: string; name: string }> = {
		'Person 1': { border: '#3b82f6', badge: '#dbeafe', name: '#1d4ed8' },
		'Person 2': { border: '#a855f7', badge: '#f3e8ff', name: '#7e22ce' },
		'Person 3': { border: '#22c55e', badge: '#dcfce7', name: '#15803d' },
		'Person 4': { border: '#f97316', badge: '#ffedd5', name: '#c2410c' },
		'Person 5': { border: '#ec4899', badge: '#fce7f3', name: '#be185d' },
		'Person 6': { border: '#14b8a6', badge: '#ccfbf1', name: '#0f766e' },
	};

	const FALLBACK_COLORS = [
		{ border: '#3b82f6', badge: '#dbeafe', name: '#1d4ed8' },
		{ border: '#a855f7', badge: '#f3e8ff', name: '#7e22ce' },
		{ border: '#22c55e', badge: '#dcfce7', name: '#15803d' },
		{ border: '#f97316', badge: '#ffedd5', name: '#c2410c' },
		{ border: '#ec4899', badge: '#fce7f3', name: '#be185d' },
		{ border: '#14b8a6', badge: '#ccfbf1', name: '#0f766e' },
	];

	function getColors(speaker: string) {
		return SPEAKER_COLORS[speaker] ?? FALLBACK_COLORS[parseInt(speaker.replace(/\D/g, '') || '1') % FALLBACK_COLORS.length];
	}

	$: hasSegments = segments && segments.length > 0;

	$: if ((transcript || hasSegments) && scrollContainer) {
		if (isLive) {
			requestAnimationFrame(() => {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			});
		}
	}
</script>

<div class="flex flex-col h-full border border-gray-200 rounded-xl overflow-hidden bg-white">
	<div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center">
		<h3 class="text-sm font-semibold text-gray-600 flex-1">{label ?? 'Transcription'}</h3>
		{#if isLive}
			<span class="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
		{/if}
		<div class="flex items-center space-x-2">
			{#if hasSegments}
				<span class="text-xs text-gray-400 font-medium">
					{new Set(segments.map((s) => s.speaker)).size} speaker{new Set(segments.map((s) => s.speaker)).size === 1 ? '' : 's'}
				</span>
			{/if}
			{#if transcript && !isLive}
				<button
					on:click={handleDownload}
					title="Download transcript"
					class="flex items-center space-x-1 px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-medium transition-colors"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
					<span>TXT</span>
				</button>
			{/if}
		</div>
	</div>

	<div bind:this={scrollContainer} class="flex-1 overflow-y-auto p-4 no-scrollbar">
		{#if hasSegments}
			<!-- Speaker-diarized view -->
			<div class="space-y-3">
				{#each segments as segment}
					{@const colors = getColors(segment.speaker)}
					<div
						class="flex flex-col space-y-1 pl-3 py-1"
						style="border-left: 3px solid {colors.border};"
					>
						<span
							class="text-xs font-semibold px-2 py-0.5 rounded-full w-fit"
							style="background: {colors.badge}; color: {colors.name};"
						>
							{segment.speaker}
						</span>
						<p class="text-sm leading-relaxed text-gray-800">
							{segment.text}
						</p>
					</div>
				{/each}
			</div>
		{:else if transcript}
			<!-- Plain transcript fallback -->
			<p class="text-base leading-relaxed text-gray-800 whitespace-pre-wrap">{transcript}</p>
		{:else}
			<!-- Empty state -->
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
					{isLive ? 'Listening…' : 'Start recording to see transcription here'}
				</p>
			</div>
		{/if}
	</div>
</div>
