<script>
	import { Toaster } from 'svelte-french-toast';
	import '../app.css';
</script>

<svelte:head>
	<link rel="preload" as="image" href="images/pause.svg" />
	<link rel="preload" as="image" href="images/play.svg" />
</svelte:head>

<Toaster />

<div class="h-screen flex flex-col bg-white overflow-hidden">
	<!-- Title bar (Electron drag region) -->
	<div class="titleBar flex items-center px-4 shrink-0">
		<span class="text-sm font-medium text-gray-500 ml-20 select-none">Transcription Studio</span>
	</div>

	<!-- Main content area -->
	<div class="flex-1 flex overflow-hidden">
		<slot />
	</div>
</div>

<style>
	.titleBar {
		-webkit-app-region: drag;
		background-color: #f9fafb;
		height: 38px;
		border-bottom: 1px solid #e5e7eb;
	}
</style>
