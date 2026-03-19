<script>
	import { onMount } from 'svelte';
	import { Toaster } from 'svelte-french-toast';
	import { currentUser, checkSession, logout } from '$lib/stores/auth';
	import AuthModal from '$lib/components/AuthModal.svelte';
	import '../app.css';

	import { getContext } from 'svelte';
	let authModalRef;

	onMount(() => {
		checkSession();

		const authHandler = (e: CustomEvent) => {
			if (authModalRef) authModalRef.open(e.detail);
		};
		window.addEventListener('open-auth', authHandler);
		return () => window.removeEventListener('open-auth', authHandler);
	});

	function triggerNewSession() {
		const actions = getContext('app_actions') as any;
		if (actions?.handleNewSession) {
			actions.handleNewSession();
		}
	}
</script>

<svelte:head>
	<link rel="preload" as="image" href="images/pause.svg" />
	<link rel="preload" as="image" href="images/play.svg" />
</svelte:head>

<Toaster />

<div class="h-screen flex flex-col bg-white overflow-hidden">
	<div class="titleBar flex items-center px-4 shrink-0">
		<span class="text-sm font-medium text-gray-500 ml-20 select-none flex-1">Transcription Studio</span>
	</div>

	<!-- Main content area -->
	<div class="flex-1 flex overflow-hidden">
		<!-- Sidebar -->
		<Sidebar
			onNewSession={triggerNewSession}
			onOpenAuth={(mode) => authModalRef?.open(mode)}
		/>

		<!-- Main content -->
		<div class="flex-1 flex flex-col p-6 space-y-4 overflow-hidden">
			<slot />
		</div>
	</div>
</div>

<AuthModal bind:this={authModalRef} />

<style>
	.titleBar {
		-webkit-app-region: drag;
		background-color: #f9fafb;
		height: 38px;
		border-bottom: 1px solid #e5e7eb;
	}
	.auth-buttons {
		-webkit-app-region: no-drag;
	}
</style>
