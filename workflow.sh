#!/bin/bash

# Configuration
SUMMARIZE_DIR="$(pwd)/summarize"
PNPM="pnpm"

# Ensure pnpm is available
if ! command -v $PNPM &> /dev/null; then
    PNPM="node -e \"require('child_process').execSync('corepack enable pnpm')\" && pnpm"
fi

# Check for input file
if [ -z "$1" ]; then
    echo "Usage: ./workflow.sh <audio_or_video_file>"
    exit 1
fi

FILE_PATH="$1"

# Verify file exists
if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File not found: $FILE_PATH"
    exit 1
fi

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
OUT_FILE="transcription_$TIMESTAMP.txt"
echo "--- Step 1: Transcribing $FILE_PATH ---"
echo "Output file: $OUT_FILE"

# Step 1: Transcribe using local IBM Granite Speech
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$DIR/venv/bin/python3"
TRANSCRIBER="$DIR/granite-transcribe.py"

echo "--- Step 1: Transcribing $FILE_PATH (Local IBM Granite) ---"
# Run transcriber on the file. We use --no-vad since it's a static file.
# The script will output the full transcript to the console which we capture.
"$VENV_PYTHON" "$TRANSCRIBER" "$FILE_PATH" --out "$OUT_FILE"

# Read transcript back for summarization
TRANSCRIPT=$(cat "$OUT_FILE")

if [ -z "$TRANSCRIPT" ]; then
    echo "Error: Transcription failed."
    exit 1
fi

echo ""
echo "--- Step 2: Summarizing Transcript ---"
# Pipe the transcript into summarize and append to the file, but keep it out of the console
# We capture result to avoid printing to CLI
SUMMARY=$(echo "$TRANSCRIPT" | $PNPM --dir "$SUMMARIZE_DIR" run s - --plain --timeout 5m)

if [ $? -eq 0 ] && [ -n "$SUMMARY" ]; then
    echo "" >> "$OUT_FILE"
    echo "--- Summary ---" >> "$OUT_FILE"
    echo "$SUMMARY" >> "$OUT_FILE"
    echo "Summary generated and saved to $OUT_FILE."
else
    echo "Error: Summarization failed."
fi

echo "--- Workflow Complete ---"
