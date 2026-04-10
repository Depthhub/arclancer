FROM node:24-bullseye-slim

# Install base dependencies for native tools and OpenClaw
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    python3-pip \
    jq \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Foundry (forge, cast, anvil, chisel)
RUN curl -L https://foundry.paradigm.xyz | bash \
    && ~/.foundry/bin/foundryup \
    && ln -s ~/.foundry/bin/forge /usr/local/bin/forge \
    && ln -s ~/.foundry/bin/cast /usr/local/bin/cast

# Upgrade npm and install Slither (Python-based Solidity analyzer)
RUN pip3 install slither-analyzer

# Install OpenClaw globally using npm
RUN npm install -g openclaw@latest

# Prepare the workspace directory
WORKDIR /app/workspace

# Copy bootstrap script and plugins
COPY bootstrap.sh /app/bootstrap.sh
RUN chmod +x /app/bootstrap.sh

COPY plugins /app/plugins
COPY poller.js /app/poller.js

# The bootstrap script will inject secure API keys and drop into the OpenClaw startup process
ENTRYPOINT ["/app/bootstrap.sh"]
