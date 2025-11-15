/**
 * Gladia MCP Server
 * Provides speech-to-text transcription via Model Context Protocol
 * Port: 8000
 * Protocol: JSON-RPC 2.0 (FastMCP)
 */

import { FastMCP } from 'fastmcp'
import dotenv from 'dotenv'
import { transcribeAudio, getSupportedLanguages } from './tools.js'

// Load environment variables
dotenv.config({ path: '../../.env' })

const PORT = 8000
const SERVER_NAME = 'gladia-mcp'

// Initialize FastMCP server
const mcp = new FastMCP(SERVER_NAME)

console.log(`[${SERVER_NAME}] Initializing Gladia MCP Server...`)

// Tool 1: Transcribe Audio
mcp.addTool({
  name: 'transcribe_audio',
  description: 'Transcribe audio file or URL to text using Gladia API. Supports multiple languages and audio formats (MP3, WAV, M4A, FLAC, etc.).',
  parameters: {
    type: 'object',
    properties: {
      audioUrl: {
        type: 'string',
        description: 'URL to audio file or local file path to transcribe'
      },
      language: {
        type: 'string',
        description: 'Language code for transcription (auto, en, es, fr, de, it, pt, ru, zh, ja, ko, ar, hi, etc.). Defaults to auto-detect.',
        default: 'auto'
      },
      enableDiarization: {
        type: 'boolean',
        description: 'Enable speaker diarization to identify different speakers in the audio',
        default: false
      }
    },
    required: ['audioUrl']
  },
  execute: async (params) => {
    console.log(`[${SERVER_NAME}] Executing transcribe_audio with params:`, params)
    return await transcribeAudio(params)
  }
})

// Tool 2: Get Supported Languages
mcp.addTool({
  name: 'get_supported_languages',
  description: 'Get list of supported languages for transcription with their language codes',
  parameters: {
    type: 'object',
    properties: {}
  },
  execute: async () => {
    console.log(`[${SERVER_NAME}] Executing get_supported_languages`)
    return await getSupportedLanguages()
  }
})

// Health check endpoint
mcp.server.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'gladia-mcp',
    timestamp: new Date().toISOString(),
    port: PORT,
    tools: ['transcribe_audio', 'get_supported_languages']
  })
})

// Start server
console.log(`[${SERVER_NAME}] Starting server on port ${PORT}...`)
console.log(`[${SERVER_NAME}] Tools registered: transcribe_audio, get_supported_languages`)
console.log(`[${SERVER_NAME}] Health endpoint: http://localhost:${PORT}/health`)

await mcp.run('streamable-http', {
  port: PORT
})

console.log(`[${SERVER_NAME}] Server running on port ${PORT}`)
