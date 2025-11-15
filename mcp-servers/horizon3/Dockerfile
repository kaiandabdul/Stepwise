FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application code
COPY src/ ./src/

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:8002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Expose MCP server port
EXPOSE 8002

# Start server
CMD ["node", "src/index.js"]
