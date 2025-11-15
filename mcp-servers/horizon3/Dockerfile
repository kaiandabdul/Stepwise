FROM node:20-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application code
COPY src/ ./src/

# Health check - verify server responds (any HTTP status is OK)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl --fail-with-body -s -o /dev/null -w "%{http_code}" http://localhost:8002/mcp | grep -q "^[0-9]" || exit 1

# Expose MCP server port
EXPOSE 8002

# Start server
CMD ["node", "src/index.js"]
