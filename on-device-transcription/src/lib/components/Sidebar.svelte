<script lang="ts">
	import { groupedSessions, activeSessionId, deleteSession } from '$lib/stores/sessions';
	import type { Session } from '$lib/types';

	export let onNewSession: () => void;

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
			<h2 class="text-base font-semibold text-gray-800">Sessions</h2>
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
							<p class="font-medium truncate pr-6">{session.title}</p>
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
