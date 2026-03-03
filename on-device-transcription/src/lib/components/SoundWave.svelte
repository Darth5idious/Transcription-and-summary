<script lang="ts">
	import { onMount } from 'svelte';
	import WaveSurfer from 'wavesurfer.js';
	import RegionsPlugin from 'wavesurfer.js/plugins/regions';

	export let blobURL: string;

	let waveSurfer: WaveSurfer | null = null;
	let regionPlugin: RegionsPlugin | null = null;
	let container: HTMLDivElement;
	let isAudioPlaying = false;

	onMount(() => {
		waveSurfer = WaveSurfer.create({
			container,
			waveColor: '#000000',
			progressColor: '#7F7F7F',
			barWidth: 2,
			barRadius: 100,
			url: blobURL,
			height: 48,
		});
		regionPlugin = waveSurfer.registerPlugin(RegionsPlugin.create());

		waveSurfer.on('finish', () => {
			isAudioPlaying = false;
		});

		return () => {
			waveSurfer?.destroy();
		};
	});

	function handleAudioPlayPause() {
		if (!waveSurfer) return;
		if (waveSurfer.isPlaying()) {
			waveSurfer.pause();
			isAudioPlaying = false;
		} else {
			waveSurfer.play();
			isAudioPlaying = true;
		}
	}
</script>

<div class="flex flex-row items-center w-full space-x-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
	{#if waveSurfer}
		<button
			on:click={handleAudioPlayPause}
			class="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
		>
			<img
				src={`images/${isAudioPlaying ? 'pause' : 'play'}.svg`}
				alt="Audio button"
				height="16"
				width="16"
			/>
		</button>
	{/if}
	<div bind:this={container} class="flex-1" />
</div>
