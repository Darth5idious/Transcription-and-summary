<script lang="ts">
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';

	// Components
	import Sidebar from '$lib/components/Sidebar.svelte';
	import RecordingControls from '$lib/components/RecordingControls.svelte';
	import TranscriptPanel from '$lib/components/TranscriptPanel.svelte';
	import SummaryPanel from '$lib/components/SummaryPanel.svelte';
	import SoundWave from '$lib/components/SoundWave.svelte';
	import Settings from '$lib/components/Settings.svelte';

	// Services
	import { Microphone } from '$lib/Microphone';
	import { transcribeAudioChunk, transcribeFullRecording, float32ToWavBlob } from '$lib/services/groqTranscription';
	import { streamSummarizeTranscript, streamTranslateToEnglish } from '$lib/services/groqSummarization';
	import { diarizeAudio, isDiarizeServerAvailable } from '$lib/services/diarizationService';
	import { downloadMp3 } from '$lib/utils/download';
	import type { DiarizedSegment } from '$lib/types';

	// Stores
	import { config } from '$lib/stores/config';
	import {
		activeSessionId,
		activeSession,
		loadSessions,
		saveSession,
	} from '$lib/stores/sessions';
	import { currentUser } from '$lib/stores/auth';

	// State
	let isRecording = false;
	let isTranscribing = false;
	let isSummarizing = false;
	let isTranslating = false;
	let isDiarizing = false;
	let settingsRef: Settings;
	let transcript = '';
	let summary = '';
	let translation = ''; // English translation (German mode only)
	let segments: DiarizedSegment[] = [];
	let elapsedTime = 0;
	let audioLevel = 0;
	let blobURL = '';
	let showSoundWave = false;

	// Recording internals
	let mic: Microphone | null = null;
	let accumulatedAudio = new Float32Array(0);
	let recordingTimer: ReturnType<typeof setInterval> | null = null;
	let transcriptionTimer: ReturnType<typeof setInterval> | null = null;
	let lastTranscribedLength = 0;
	let currentSessionId: string | null = null;
	let isViewingSaved = false;
	let isPaused = false;

	// Derived filename base (used for downloads)
	$: fileBase = (() => {
		const title = $activeSession?.title || generateTitle(transcript) || 'recording';
		return title.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase().slice(0, 40);
	})();

	onMount(async () => {
		await loadSessions();

		// Try to load Groq key from file if none stored
		if (!$config.groqApiKey && window.electronAPI) {
			const fileKey = await window.electronAPI.readGroqKeyFile();
			if (fileKey) {
				config.update((c) => ({ ...c, groqApiKey: fileKey }));
				toast.success('Loaded Groq API key from ~/Documents/groq.txt');
			}
		}
	});

	// Reload sessions when user logs in or out
	$: if ($currentUser !== undefined) {
		loadSessions();
	}

	// React to active session changes (loading a saved session)
	$: if ($activeSession && !isRecording) {
		transcript = $activeSession.transcript;
		summary = $activeSession.summary;
		segments = $activeSession.segments ?? [];
		translation = $activeSession.translation ?? '';
		isViewingSaved = true;
		if ($activeSession.hasAudio) {
			loadSessionAudio($activeSession.id);
		} else {
			blobURL = '';
			showSoundWave = false;
		}
	}

	async function loadSessionAudio(sessionId: string) {
		try {
			if (!window.electronAPI) return;
			const buffer = await window.electronAPI.loadAudio(sessionId);
			const blob = new Blob([buffer], { type: 'audio/wav' });
			blobURL = URL.createObjectURL(blob);
			showSoundWave = true;
		} catch {
			showSoundWave = false;
		}
	}

	function generateId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	}

	function generateTitle(text: string): string {
		if (!text) return `Recording ${new Date().toLocaleTimeString()}`;
		const clean = text.replace(/^\.{3}\s*/, '').trim();
		return clean.length > 50 ? clean.slice(0, 50) + '...' : clean;
	}

	async function startRecording() {
		if (!$config.groqApiKey) {
			settingsRef?.open();
			toast.error('Please set your Groq API key first.');
			return;
		}

		isRecording = true;
		isPaused = false;
		isViewingSaved = false;
		transcript = '';
		summary = '';
		translation = '';
		segments = [];
		blobURL = '';
		showSoundWave = false;
		elapsedTime = 0;
		audioLevel = 0;
		accumulatedAudio = new Float32Array(0);
		lastTranscribedLength = 0;
		currentSessionId = generateId();
		$activeSessionId = null;

		// Elapsed time counter
		recordingTimer = setInterval(() => {
			if (!isPaused) elapsedTime += 1;
		}, 1000);

		// Start microphone
		mic = new Microphone((chunk) => {
			if (isPaused) {
				audioLevel = 0;
				return;
			}
			const newAudio = new Float32Array(accumulatedAudio.length + chunk.length);
			newAudio.set(accumulatedAudio);
			newAudio.set(chunk, accumulatedAudio.length);
			accumulatedAudio = newAudio;

			// Compute RMS audio level
			let sum = 0;
			for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
			audioLevel = Math.sqrt(sum / chunk.length);
		});

		try {
			await mic.start();
		} catch (e) {
			console.error('Microphone error:', e);
			toast.error('Could not access microphone.');
			isRecording = false;
			if (recordingTimer) clearInterval(recordingTimer);
			return;
		}

		// Periodic transcription every 5 seconds
		transcriptionTimer = setInterval(async () => {
			if (isTranscribing || accumulatedAudio.length === lastTranscribedLength) return;
			if (accumulatedAudio.length < 16000) return; // Need at least 1 second

			isTranscribing = true;
			lastTranscribedLength = accumulatedAudio.length;

			try {
				// Use sliding window: last 30 seconds for efficiency
				const WINDOW_SAMPLES = 30 * 16000;
				const audioToTranscribe =
					accumulatedAudio.length > WINDOW_SAMPLES
						? accumulatedAudio.slice(-WINDOW_SAMPLES)
						: accumulatedAudio;

				const result = await transcribeAudioChunk(
					audioToTranscribe,
					$config.groqApiKey,
					$config.transcriptionModel,
					$config.language
				);

				if (result.text) {
					transcript = result.text;
				}
			} catch (e) {
				console.error('Transcription error:', e);
			} finally {
				isTranscribing = false;
			}
		}, 5000);
	}

	async function stopRecording() {
		// Stop microphone
		if (mic) {
			mic.stop();
			mic = null;
		}
		isRecording = false;
		isPaused = false;
		audioLevel = 0;

		// Stop timers
		if (recordingTimer) {
			clearInterval(recordingTimer);
			recordingTimer = null;
		}
		if (transcriptionTimer) {
			clearInterval(transcriptionTimer);
			transcriptionTimer = null;
		}

		// Final full transcription
		let finalWords = [];
		if (accumulatedAudio.length > 0) {
			isTranscribing = true;
			try {
				const result = await transcribeFullRecording(
					accumulatedAudio,
					$config.groqApiKey,
					$config.transcriptionModel,
					$config.language
				);
				if (result.text) {
					transcript = result.text;
					finalWords = result.words || [];
				}
			} catch (e) {
				console.error('Final transcription error:', e);
				toast.error('Final transcription failed.');
			} finally {
				isTranscribing = false;
			}
		}

		// Create WAV blob for playback + diarization
		if (accumulatedAudio.length > 0) {
			const wavBlob = float32ToWavBlob(accumulatedAudio, 16000);
			blobURL = URL.createObjectURL(wavBlob);
			showSoundWave = true;

			// Save audio to disk
			if (currentSessionId && window.electronAPI) {
				const buffer = await wavBlob.arrayBuffer();
				await window.electronAPI.saveAudio({ sessionId: currentSessionId, buffer });
			}

			// Try speaker diarization (requires local Python server)
			const serverUp = await isDiarizeServerAvailable();
			if (serverUp && $config.groqApiKey) {
				isDiarizing = true;
				try {
					segments = await diarizeAudio(wavBlob, $config.groqApiKey, $config.language, finalWords);
				} catch (e) {
					console.warn('Diarization failed, using plain transcript:', e);
					segments = [];
				} finally {
					isDiarizing = false;
				}
			}
		}

		// Generate summary (streaming) — always in recorded language
		if (transcript) {
			isSummarizing = true;
			summary = '';
			try {
				for await (const chunk of streamSummarizeTranscript(
					transcript,
					$config.groqApiKey,
					$config.summarizationModel
				)) {
					summary += chunk;
				}
			} catch (e) {
				console.error('Summarization error:', e);
				toast.error('Failed to generate summary.');
			} finally {
				isSummarizing = false;
			}
		}

		// Generate English translation (streaming) — German mode only
		if (transcript && $config.language === 'de') {
			isTranslating = true;
			translation = '';
			try {
				for await (const chunk of streamTranslateToEnglish(
					transcript,
					$config.groqApiKey,
					$config.summarizationModel
				)) {
					translation += chunk;
				}
			} catch (e) {
				console.error('Translation error:', e);
			} finally {
				isTranslating = false;
			}
		}

		// Save session
		if (currentSessionId) {
			const session = {
				id: currentSessionId,
				title: generateTitle(transcript),
				createdAt: Date.now(),
				duration: elapsedTime,
				transcript,
				summary,
				segments: segments.length > 0 ? segments : undefined,
				translation: translation || undefined,
				hasAudio: accumulatedAudio.length > 0,
			};
			await saveSession(session);
			$activeSessionId = currentSessionId;
			isViewingSaved = true;
		}
	}

	function handleNewSession() {
		$activeSessionId = null;
		isViewingSaved = false;
		transcript = '';
		summary = '';
		translation = '';
		segments = [];
		blobURL = '';
		showSoundWave = false;
		elapsedTime = 0;
		audioLevel = 0;
	}

	// Expose handleNewSession for the layout/sidebar
	import { setContext } from 'svelte';
	setContext('app_actions', { handleNewSession });
</script>

<!-- Top bar with settings -->
<div class="flex items-center justify-between shrink-0">
	<div>
		{#if isViewingSaved && $activeSession}
			<h2 class="text-lg font-semibold text-gray-800 truncate max-w-lg">
				{$activeSession.title}
			</h2>
		{:else if isRecording}
			<h2 class="text-lg font-semibold text-gray-800">Recording...</h2>
		{:else}
			<h2 class="text-lg font-semibold text-gray-800">New Recording</h2>
		{/if}
	</div>
	<div class="flex items-center space-x-2">
		<!-- Language toggle button -->
		<button
			on:click={() => config.update((c) => ({ ...c, language: c.language === 'de' ? 'en' : 'de' }))}
			disabled={isRecording}
			title="Toggle language"
			class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all
				{$config.language === 'de'
					? 'bg-black text-white border-black hover:bg-gray-800'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
				disabled:opacity-40 disabled:cursor-not-allowed"
		>
			<span>{$config.language === 'de' ? '🇩🇪' : '🇬🇧'}</span>
			<span>{$config.language === 'de' ? 'DE' : 'EN'}</span>
		</button>

		<!-- Settings button -->
		<button
			on:click={() => settingsRef?.open()}
			class="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
			title="Settings"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
				/>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
				/>
			</svg>
		</button>
	</div>
</div>

<!-- Recording controls -->
{#if !isViewingSaved}
	<div class="shrink-0">
		<RecordingControls
			{isRecording}
			{isPaused}
			{elapsedTime}
			{audioLevel}
			on:start={startRecording}
			on:stop={stopRecording}
			on:togglePause={() => (isPaused = !isPaused)}
		/>
	</div>
{/if}

<!-- Transcript row (top) -->
<div class="flex space-x-4 min-h-0" style="flex: 1 1 0; min-height: 0;">
	<!-- German original transcript (always shown) -->
	<div class="flex-1 min-w-0">
		<TranscriptPanel
			{transcript}
			{segments}
			isLive={isRecording || isDiarizing}
			label={$config.language === 'de' ? '🇩🇪 Deutsch' : undefined}
			downloadFilename="{fileBase}_transcript.txt"
		/>
	</div>

	<!-- English translation (German mode only) -->
	{#if $config.language === 'de'}
		<div class="flex-1 min-w-0">
			<TranscriptPanel
				transcript={translation}
				segments={[]}
				isLive={isTranslating}
				label="🇬🇧 English"
				downloadFilename="{fileBase}_translation.txt"
			/>
		</div>
	{/if}
</div>

<!-- Audio playback + MP3 download -->
{#if blobURL && showSoundWave}
	<div class="shrink-0 flex items-center space-x-2">
		<div class="flex-1 min-w-0">
			<SoundWave {blobURL} />
		</div>
		<button
			on:click={() => downloadMp3(accumulatedAudio, `${fileBase}.mp3`, blobURL)}
			title="Download MP3"
			class="shrink-0 flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-gray-200
				bg-white text-gray-500 hover:text-gray-700 hover:border-gray-300 text-xs font-medium transition-all"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
					d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
			</svg>
			<span>MP3</span>
		</button>
	</div>
{/if}

<!-- Summary (always at bottom) -->
<div class="shrink-0" style="height: 220px; min-height: 180px;">
	<SummaryPanel {summary} isGenerating={isSummarizing} downloadFilename="{fileBase}_summary.md" />
</div>

<Settings bind:this={settingsRef} />
