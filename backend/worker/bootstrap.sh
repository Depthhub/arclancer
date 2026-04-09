#!/bin/bash
set -e

# ArcLancer OpenClaw Worker Bootstrap Script
echo "[ArcLancer Worker] Bootstrapping OpenClaw workspace..."

# 1. Provide a clean workspace
mkdir -p /app/workspace
cd /app/workspace

# 2. Inject API Keys securely
if [ -n "$OPENROUTER_API_KEY" ]; then
    export OPENROUTER_API_KEY="$OPENROUTER_API_KEY"
    echo "[ArcLancer Worker] OpenRouter key detected."
elif [ -n "$GROQ_API_KEY" ]; then
    export GROQ_API_KEY="$GROQ_API_KEY"
    echo "[ArcLancer Worker] Groq key detected."
else
    echo "[!] Warning: No API keys provided."
fi

# 3. Mount ArcLancer Auditor skill plugin
mkdir -p /app/workspace/plugins
cp -r /app/plugins/arclancer-auditor /app/workspace/plugins/ 2>/dev/null || true

# 4. Set Telegram UID for DM access control
CLIENT_UID="${ARC_TELEGRAM_UID:-pairing}"

echo "[ArcLancer Worker] Configuration complete. Starting OpenClaw Gateway daemon..."

# 5. Start OpenClaw gateway from the workspace directory
exec openclaw gateway --port 18789 --verbose
