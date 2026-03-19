<script lang="ts">
	import { groupedSessions, activeSessionId, deleteSession } from '$lib/stores/sessions';
	import { currentUser, logout } from '$lib/stores/auth';
	import type { Session } from '$lib/types';

	export let onNewSession: () => void;
	export let onOpenAuth: (mode: 'login' | 'signup') => void;

	let collapsed = false;

	function selectSession(session: Session) {
		$activeSessionId = session.id;
	}

	function formatDuration(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function handleDelete(e: MouseEvent, id: string) {
		e.stopPropagation();
		deleteSession(id);
	}
</script>

<!-- Collapsed strip -->
{#if collapsed}
	<div class="w-10 bg-gray-50 border-r border-gray-200 flex flex-col items-center h-full shrink-0 py-3 space-y-3">
		<button
			on:click={() => (collapsed = false)}
			title="Expand sessions"
			class="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
		>
			<!-- Chevron right -->
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>
{:else}
	<!-- Full sidebar -->
	<div class="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full shrink-0">
		<div class="p-4 border-b border-gray-200 flex items-center justify-between">
			<div class="flex items-center space-x-2">
				<h2 class="text-base font-semibold text-gray-800">Sessions</h2>
				<span class="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">Auth V2</span>
			</div>
			<button
				on:click={() => (collapsed = true)}
				title="Collapse sidebar"
				class="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
			>
				<!-- Chevron left -->
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
		</div>

		<!-- Auth / Account Section -->
		<div class="px-3 py-4 border-b border-gray-100 bg-white/50">
			{#if $currentUser}
				<div class="flex flex-col space-y-2">
					<div class="flex items-center space-x-2 px-2 text-gray-700">
						<div class="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						</div>
						<span class="text-sm font-semibold truncate">{$currentUser.username}</span>
					</div>
					<button
						on:click={logout}
						class="w-full text-left px-2 py-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all font-medium"
					>
						Sign Out
					</button>
				</div>
			{:else}
				<div class="space-y-2">
					<button
						on:click={() => onOpenAuth('signup')}
						class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center space-x-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
						</svg>
						<span>Create Account</span>
					</button>
					<button
						on:click={() => onOpenAuth('login')}
						class="w-full px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold"
					>
						Sign In
					</button>
					<div class="flex items-center justify-center space-x-4 pt-1">
						<a href="/login" class="text-[10px] text-blue-500 hover:underline font-medium">Full Login Page</a>
						<span class="text-[10px] text-gray-300">|</span>
						<a href="/signup" class="text-[10px] text-blue-500 hover:underline font-medium">Full Signup Page</a>
					</div>
					<p class="text-[10px] text-gray-400 px-1 text-center font-medium">
						Sign in to save summaries to the cloud
					</p>
				</div>
			{/if}
		</div>

		<div class="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
			{#each Object.entries($groupedSessions) as [dateLabel, dateSessions]}
				<div>
					<p class="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1.5">
						{dateLabel}
					</p>
					{#each dateSessions as session}
						<button
							class="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors group relative mb-1
								{$activeSessionId === session.id
								? 'bg-blue-100 text-blue-900'
								: 'hover:bg-gray-100 text-gray-700'}"
							on:click={() => selectSession(session)}
						>
							<div class="flex items-center space-x-1.5">
								<p class="font-medium truncate pr-6">{session.title}</p>
								{#if session.id.startsWith('db_')}
									<svg class="w-3 h-3 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
										<path d="M17.5,19c-3.037,0-5.5-2.463-5.5-5.5c0-0.038,0.001-0.076,0.002-0.114C11.396,13.842,10.718,14,10,14 c-2.209,0-4-1.791-4-4c0-2.198,1.782-3.982,3.974-4C10.147,4.673,11.447,4,13,4c2.209,0,4,1.791,4,4c0,0.117-0.005,0.232-0.015,0.347 C19.141,8.746,21,10.655,21,13C21,15.761,18.761,18,17.5,19z"/>
									</svg>
								{/if}
							</div>
							<p class="text-xs text-gray-400 mt-0.5">{formatDuration(session.duration)}</p>
							<button
								class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
									text-gray-400 hover:text-red-500 transition-all p-1"
								on:click={(e) => handleDelete(e, session.id)}
								title="Delete session"
							>
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</button>
					{/each}
				</div>
			{:else}
				<p class="text-xs text-gray-400 text-center mt-8 px-4">
					No sessions yet. Click "New Recording" to get started.
				</p>
			{/each}
		</div>

		<div class="p-3 border-t border-gray-200">
			<button
				on:click={onNewSession}
				class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium
					hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				<span>New Recording</span>
			</button>
		</div>
	</div>
{/if}
