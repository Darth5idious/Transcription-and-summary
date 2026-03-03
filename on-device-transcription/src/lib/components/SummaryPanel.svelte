<script lang="ts">
	import { marked } from 'marked';

	export let summary: string = '';
	export let isGenerating: boolean = false;

	$: renderedHtml = summary ? marked(summary) : '';
</script>

<div class="flex flex-col h-full border border-gray-200 rounded-xl overflow-hidden bg-white">
	<div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center space-x-2">
		<h3 class="text-sm font-semibold text-gray-600">Summary</h3>
		{#if isGenerating}
			<div
				class="w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"
			/>
		{/if}
	</div>

	<div class="flex-1 overflow-y-auto p-4 no-scrollbar">
		{#if isGenerating && !summary}
			<div class="flex flex-col items-center justify-center h-full">
				<div
					class="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-3"
				/>
				<p class="text-sm text-gray-400">Generating summary...</p>
			</div>
		{:else if summary}
			<div class="prose prose-sm max-w-none text-gray-800">
				{@html renderedHtml}
			</div>
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
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				<p class="text-gray-400 text-sm">Summary will appear after recording stops</p>
			</div>
		{/if}
	</div>
</div>
