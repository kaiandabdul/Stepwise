# E2B Custom Template for Stepwise
#
# This Dockerfile creates a custom E2B template with:
# - Docker + Docker Compose pre-installed
# - Node.js and Python runtime
# - MCP server dependencies
#
# Phase 3 Implementation Required

FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    python3.10 \
    python3-pip \
    nodejs \
    npm \
    docker.io \
    docker-compose \
    && rm -rf /var/lib/apt/lists/*

# This file will be enhanced in Phase 3 with:
# - Docker Compose pre-configuration
# - MCP server dependencies
# - Custom startup scripts
# - Environment setup
