# Gladia MCP Server

MCP (Model Context Protocol) server providing speech-to-text transcription capabilities using the Gladia API v2.

## Overview

The Gladia MCP Server enables AI agents and applications to transcribe audio files and URLs into text. It supports:

- **Multi-language transcription** (15+ languages with auto-detection)
- **Speaker diarization** (identify different speakers)
- **Multiple audio formats** (MP3, WAV, M4A, FLAC, OGG, etc.)
- **High accuracy** with confidence scores
- **Word-level timestamps** for precise alignment

## Features

- **JSON-RPC 2.0 Protocol**: Standard MCP communication
- **FastMCP Framework**: Built on the official MCP server framework
- **Docker Support**: Containerized deployment with health checks
- **Error Handling**: Comprehensive error handling and logging
- **Production Ready**: Suitable for E2B sandboxes and production environments

## Installation

### Prerequisites

- Node.js 18+ installed
- Gladia API key (get one at [gladia.io](https://www.gladia.io))
- Environment variable `GLADIA_API_KEY` set

### Local Setup

```bash
# Install dependencies
npm install

# Set environment variable
export GLADIA_API_KEY="your-api-key-here"

# Start server
npm start
```

Server will run on **port 8000**.

### Docker Setup

```bash
# Build image
docker build -t gladia-mcp:latest .

# Run container
docker run -p 8000:8000 \
  -e GLADIA_API_KEY="your-api-key-here" \
  gladia-mcp:latest
```

## Usage

### Health Check

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "service": "gladia-mcp",
  "timestamp": "2025-11-15T12:00:00.000Z",
  "port": 8000,
  "tools": ["transcribe_audio", "get_supported_languages"]
}
```

### MCP Tools

#### 1. transcribe_audio

Transcribe an audio file or URL to text.

**Parameters:**
- `audioUrl` (string, required): URL to audio file or local path
- `language` (string, optional): Language code (default: "auto")
- `enableDiarization` (boolean, optional): Enable speaker identification (default: false)

**Example JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "transcribe_audio",
    "arguments": {
      "audioUrl": "https://example.com/meeting.mp3",
      "language": "en",
      "enableDiarization": true
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "transcription": "Hello, this is a test transcription of the audio file.",
    "language": "en",
    "confidence": 0.95,
    "diarization": [
      {
        "speaker": "Speaker 1",
        "text": "Hello, this is a test",
        "start": 0.0,
        "end": 2.5
      },
      {
        "speaker": "Speaker 2",
        "text": "transcription of the audio file.",
        "start": 2.5,
        "end": 5.0
      }
    ],
    "metadata": {
      "duration": 5.0,
      "words": 10
    }
  }
}
```

#### 2. get_supported_languages

Get list of supported languages for transcription.

**Parameters:** None

**Example JSON-RPC Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_supported_languages",
    "arguments": {}
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "success": true,
    "languages": [
      { "code": "auto", "name": "Auto-detect" },
      { "code": "en", "name": "English" },
      { "code": "es", "name": "Spanish" },
      { "code": "fr", "name": "French" },
      { "code": "de", "name": "German" },
      { "code": "it", "name": "Italian" },
      { "code": "pt", "name": "Portuguese" },
      { "code": "ru", "name": "Russian" },
      { "code": "zh", "name": "Chinese" },
      { "code": "ja", "name": "Japanese" },
      { "code": "ko", "name": "Korean" },
      { "code": "ar", "name": "Arabic" },
      { "code": "hi", "name": "Hindi" },
      { "code": "nl", "name": "Dutch" },
      { "code": "pl", "name": "Polish" }
    ]
  }
}
```

## Supported Audio Formats

The Gladia API supports the following audio formats:

- MP3
- WAV
- M4A
- AAC
- FLAC
- OGG
- OPUS
- WebM
- AMR

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GLADIA_API_KEY` | Yes | Your Gladia API key from gladia.io |
| `PORT` | No | Server port (default: 8000) |

## Error Handling

The server returns structured error responses:

```json
{
  "success": false,
  "error": "Gladia API error (401): Unauthorized: Invalid API key",
  "transcription": null
}
```

Common error codes:
- **401**: Invalid API key
- **429**: Rate limit exceeded
- **500**: Internal server error

## Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Development

```bash
# Install all dependencies (including dev)
npm install

# Run in development mode with auto-reload
npm run dev
```

## Architecture

```
src/
├── index.js      # FastMCP server initialization, tool registration
└── tools.js      # Tool implementations (transcribeAudio, getSupportedLanguages)

tests/
└── tools.test.js # Unit tests with >80% coverage

Dockerfile        # Production container with health checks
package.json      # Dependencies and scripts
```

## Integration with Stepwise Agent

This server is part of the Stepwise Live API Debugger Agent project. It integrates with:

- **E2B Sandboxes**: Runs in isolated Docker containers
- **StepwiseAgent**: Called via MCPClient for workflow execution
- **HoneyHive**: All transcriptions are traced for observability
- **Frontend**: Audio recordings sent to Gladia for speech-to-text

## API Documentation

Full Gladia API documentation: [https://docs.gladia.io/](https://docs.gladia.io/)

## License

MIT

## Support

For issues with this MCP server, open an issue in the Stepwise repository.
For Gladia API issues, contact [support@gladia.io](mailto:support@gladia.io).
