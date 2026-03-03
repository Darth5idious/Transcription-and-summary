#!/bin/bash

# Configuration
GROQ_KEY_FILE="$HOME/Documents/groq.txt"
CHUNK_DURATION=10 # seconds
TEMP_DIR="/tmp/transcribe_chunks"
API_URL="https://api.groq.com/openai/v1/audio/transcriptions"
MODEL="whisper-large-v3-turbo"
# Defaults
USE_GRANITE=true
USE_GROQ=false
LANGUAGE=""

# Simple flag parsing
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --granite) USE_GRANITE=true; USE_GROQ=false ;;
        --groq) USE_GROQ=true; USE_GRANITE=false ;;
        --no-vad-transcribe) NO_VAD_TRANSCRIBE=true ;;
        de|en|fr|es|it|pt|ja|zh) LANGUAGE="$1" ;;
    esac
    shift
done

VAD_ARG=""
if [ "$NO_VAD_TRANSCRIBE" = true ]; then
    VAD_ARG="--no-vad-transcribe"
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for dependencies
if ! command -v arecord &> /dev/null; then
    echo -e "${RED}Error: arecord not found. Install alsa-utils.${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq not found. Please install it.${NC}"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl not found. Please install it.${NC}"
    exit 1
fi

# Handle Output File
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
DEFAULT_OUT_FILE="transcription_$TIMESTAMP.txt"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FULL_OUT_PATH="$DIR/$DEFAULT_OUT_FILE"

# Handle API Key only for Groq
GROQ_ARG=""
if [ "$USE_GROQ" = true ]; then
    if [ ! -f "$GROQ_KEY_FILE" ]; then
        echo -e "${RED}Error: Groq key file not found at $GROQ_KEY_FILE${NC}"
        exit 1
    fi
    GROQ_API_KEY=$(head -n 1 "$GROQ_KEY_FILE" | tr -d '[:space:]')
    GROQ_ARG="--groq --groq-key $GROQ_API_KEY"
    echo -e "${GREEN}Starting Groq Whisper Transcription (Live VAD)${NC}"
else
    echo -e "${GREEN}Starting IBM Granite Speech (Local Inference with VAD)${NC}"
fi

if [[ -n "$LANGUAGE" ]]; then
    echo -e "${BLUE}Language set to: $LANGUAGE${NC}"
fi

VENV_PATH="$DIR/venv"
if [ ! -d "$VENV_PATH" ]; then
    echo -e "${RED}Error: Virtual environment not found at $VENV_PATH${NC}"
    exit 1
fi

LANG_ARG=""
if [[ -n "$LANGUAGE" ]]; then
    LANG_ARG="--lang $LANGUAGE"
fi

# Run the python script which now handles recording, VAD, saving text, summary, and MP3
# It supports both local (Granite) and cloud (Groq) via the --groq flag
"$VENV_PATH/bin/python3" "$DIR/granite-transcribe.py" $LANG_ARG $GROQ_ARG $VAD_ARG --out "$FULL_OUT_PATH"
exit 0
