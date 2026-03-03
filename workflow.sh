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

# Use tee to see output in real-time and save to file
$PNPM --dir "$SUMMARIZE_DIR" run s "$FILE_PATH" --extract --plain --timeout 5m | tee "$OUT_FILE"

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
