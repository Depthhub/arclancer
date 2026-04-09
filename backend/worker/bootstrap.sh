#!/bin/bash
set -e

# ArcLancer OpenClaw Worker Bootstrap Script
# This script initializes the OpenClaw workspace and safely bridges
# ephemeral environment variables from the orchestrator payload
# into OpenClaw's secure local `.env` and configuration.

echo "[ArcLancer Worker] Bootstrapping OpenClaw workspace..."

# 1. Provide a clean workspace
mkdir -p /app/workspace/.openclaw
cd /app/workspace

# 2. Inject API Keys securely via providerAuthAliases strategy
# Note: We enforce these directly into the local env and NOT via untrusted workspace `.env` 
# which is actively blocked by the v2026.4.9 patch.
if [ -n "$GROQ_API_KEY" ]; then
    echo "GROQ_API_KEY=$GROQ_API_KEY" > /app/workspace/.openclaw/secure.env
elif [ -n "$OPENROUTER_API_KEY" ]; then
    echo "OPENROUTER_API_KEY=$OPENROUTER_API_KEY" > /app/workspace/.openclaw/secure.env
else
    echo "[!] Warning: No API keys provided to the workspace."
    touch /app/workspace/.openclaw/secure.env
fi

# 3. Mount ArcLancer Auditor skill plugin
mkdir -p /app/workspace/plugins
cp -r /app/plugins/arclancer-auditor /app/workspace/plugins/

# 4. Generate local OpenClaw gateway config
# We whitelist only the client's Telegram ID provided via ARC_TELEGRAM_UID
CLIENT_UID="${ARC_TELEGRAM_UID:-pairing}"

cat <<EOF > /app/workspace/openclaw.yaml
version: 1
gateway:
  port: 18789
providers:
  groq:
    authProfile: "secure.env"
  openrouter:
    authProfile: "secure.env"
channels:
  telegram:
    enabled: true
    dmPolicy: "open"
    allowFrom:
      - "$CLIENT_UID"
agents:
  defaults:
    llm:
      idleTimeoutSeconds: 3600
plugins:
  arclancer-auditor:
    path: "./plugins/arclancer-auditor"
EOF

echo "[ArcLancer Worker] Configuration complete. Starting OpenClaw Gateway daemon..."

# 5. Start OpenClaw with native logging
exec openclaw gateway --config /app/workspace/openclaw.yaml --verbose
