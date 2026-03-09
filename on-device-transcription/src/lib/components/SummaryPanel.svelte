<script lang="ts">
	import { marked } from 'marked';
	import { downloadMarkdown, downloadText } from '$lib/utils/download';

	export let summary: string = '';
	export let isGenerating: boolean = false;
	export let downloadFilename: string = 'summary.md';

	$: renderedHtml = summary ? marked(summary) : '';
	$: txtFilename = downloadFilename.replace(/\.md$/, '.txt');
</script>

<div class="flex flex-col h-full border border-gray-200 rounded-xl overflow-hidden bg-white">
	<div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center">
		<h3 class="text-sm font-semibold text-gray-600 flex-1">Summary</h3>
		<div class="flex items-center space-x-2">
			{#if isGenerating}
				<div class="w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
			{/if}
			{#if summary && !isGenerating}
				<button
					on:click={() => downloadText(summary, txtFilename)}
					title="Download as TXT"
					class="flex items-center space-x-1 px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-medium transition-colors"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
					<span>TXT</span>
				</button>
				<button
					on:click={() => downloadMarkdown(summary, downloadFilename)}
					title="Download as MD"
					class="flex items-center space-x-1 px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-medium transition-colors"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
					<span>MD</span>
				</button>
			{/if}
		</div>
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
