FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

# Expose port
EXPOSE 8003

# Health check - verify server responds (any HTTP status is OK)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail-with-body -s -o /dev/null -w "%{http_code}" http://localhost:8003/mcp | grep -q "^[0-9]" || exit 1

# Start server
CMD ["node", "src/index.js"]
