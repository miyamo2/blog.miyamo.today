FROM --platform=linux/amd64 mcr.microsoft.com/devcontainers/javascript-node:22-bookworm

ENV BUN_INSTALL=/usr/local

# Install Bun
RUN apt-get update \
    && curl -fsSL https://bun.sh/install | bash -s "bun-v1.2.2"