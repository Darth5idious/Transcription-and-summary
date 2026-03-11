<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let isRecording: boolean = false;
	export let isPaused: boolean = false;
	export let elapsedTime: number = 0;
	export let audioLevel: number = 0;

	const dispatch = createEventDispatcher();

	function formatTime(totalSeconds: number): string {
		const h = Math.floor(totalSeconds / 3600);
		const m = Math.floor((totalSeconds % 3600) / 60);
		const s = Math.floor(totalSeconds % 60);
		if (h > 0) {
			return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		}
		return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	}

	$: meterWidth = (isPaused || !isRecording) ? 0 : Math.min(Math.sqrt(audioLevel) * 5, 1.0) * 100;
	$: meterColor =
		meterWidth > 80 ? 'bg-red-500' : meterWidth > 50 ? 'bg-yellow-500' : 'bg-green-500';
</script>

<div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
	<div class="flex items-center space-x-4">
		<button
			on:click={() => dispatch(isRecording ? 'stop' : 'start')}
			class="w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm
				{isRecording
				? 'bg-red-500 hover:bg-red-600 shadow-red-200'
				: 'bg-red-500 hover:bg-red-600 shadow-red-200'}"
		>
			{#if isRecording}
				<div class="w-5 h-5 bg-white rounded-sm" />
			{:else}
				<div class="w-5 h-5 bg-white rounded-full" />
			{/if}
		</button>

		{#if isRecording}
			<button
				on:click={() => dispatch('togglePause')}
				class="w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm
					{isPaused
					? 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200'
					: 'bg-gray-200 hover:bg-gray-300 shadow-gray-200'}"
				title={isPaused ? "Resume Recording" : "Pause Recording"}
			>
				{#if isPaused}
					<svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
				{:else}
					<div class="flex space-x-1.5">
						<div class="w-2 h-5 bg-gray-600 rounded-sm" />
						<div class="w-2 h-5 bg-gray-600 rounded-sm" />
					</div>
				{/if}
			</button>
		{/if}

		<div class="flex flex-col space-y-1.5 flex-1">
			<div class="flex items-center space-x-3">
				<span class="font-mono text-xl text-gray-700 w-24 tabular-nums">
					{formatTime(elapsedTime)}
				</span>
				{#if isRecording}
					<span class="flex items-center space-x-1.5">
						<span class="w-2 h-2 rounded-full {isPaused ? 'bg-yellow-500' : 'bg-red-500'} {isPaused ? '' : 'animate-pulse'}" />
						<span class="{isPaused ? 'text-yellow-600' : 'text-red-500'} text-xs font-medium uppercase tracking-wide">
							{isPaused ? 'Paused' : 'Recording'}
						</span>
					</span>
				{:else if elapsedTime === 0}
					<span class="text-xs text-gray-400">Press to start recording</span>
				{/if}
			</div>

			<div class="h-2.5 bg-gray-200 rounded-full overflow-hidden">
				<div
					class="h-full rounded-full transition-all duration-75 {meterColor}"
					style="width: {isRecording ? meterWidth : 0}%"
				/>
			</div>
		</div>
	</div>
</div>
