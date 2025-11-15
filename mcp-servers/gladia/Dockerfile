# Gladia MCP Server Dockerfile
# Base image: Node.js 20 slim (updated for undici compatibility)
FROM node:20-slim

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

# Health check - verify server responds
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start server
CMD ["node", "src/index.js"]
