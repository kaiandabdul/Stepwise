# Gladia MCP Server Dockerfile
# Base image: Node.js 20 alpine (optimized size)
FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

# Expose port 8000
EXPOSE 8000

# Health check - verify server responds (any HTTP status is OK)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl --fail-with-body -s -o /dev/null -w "%{http_code}" http://localhost:8000/mcp | grep -q "^[0-9]" || exit 1

# Start server
CMD ["node", "src/index.js"]
