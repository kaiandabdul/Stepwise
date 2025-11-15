# Gladia MCP Server Dockerfile
# Base image: Node.js 20 slim (updated for undici compatibility)
FROM node:20-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Expose port 8000
EXPOSE 8000

# Health check - verify server responds (any HTTP status is OK)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl --fail-with-body -s -o /dev/null -w "%{http_code}" http://localhost:8000/mcp | grep -q "^[0-9]" || exit 1

# Start server
CMD ["node", "src/index.js"]
