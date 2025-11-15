# HoneyHive MCP Server - Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Note: .env file should be passed via docker run --env-file
# Do not copy .env into the image for security reasons

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"

# Run server
CMD ["python", "src/server.py"]
