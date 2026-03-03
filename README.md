# Transcription and Summary System

A unified system for on-device and cloud-based transcription and summarization.

## Features
- **Live Transcription**: Persistent real-time transcription using IBM Granite (local) or Groq API.
- **Indefinite Recording**: No automatic silence-based stopping. Recording continues until manually stopped (Ctrl+C).
- **Periodic Live Updates**: CLI updates every 5 seconds with cumulative transcription progress.
- **Automatic Summarization**: Summaries are generated using Groq LLMs and saved alongside the transcripts.
- **Persistent Storage**: Transcripts are saved to timestamped `.txt` files and audio to `.mp3`.

## Components
- `granite-transcribe.py`: Core transcription engine (Python).
- `on-device-transcription/`: Svelte-based web interface for browser-based transcription.
- `summarize/`: CLI tool for summarizing text using various LLM providers.
- `workflow.sh`: Convenience script for processing audio files.
- `live-transcribe.sh`: Convenience script for starting live sessions.

## Usage
### Live Transcription
```bash
./live-transcribe.sh
```
Adjust parameters in `granite-transcribe.py` or use flags for Groq.

### File Processing
```bash
./workflow.sh <audio_file>
```
