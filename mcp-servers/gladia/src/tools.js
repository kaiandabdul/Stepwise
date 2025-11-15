/**
 * Gladia MCP Server - Tool Implementations
 * Provides speech-to-text transcription using Gladia API v2
 */

import dotenv from 'dotenv'
dotenv.config({ path: '../../.env' })

const GLADIA_API_KEY = process.env.GLADIA_API_KEY
const GLADIA_API_URL = 'https://api.gladia.io/v2/transcription'

if (!GLADIA_API_KEY) {
  console.error('ERROR: GLADIA_API_KEY not set in environment')
  process.exit(1)
}

/**
 * Transcribe audio file or URL to text using Gladia API
 * @param {Object} params - Transcription parameters
 * @param {string} params.audioUrl - URL to audio file or local path
 * @param {string} [params.language='auto'] - Language code (auto, en, es, fr, etc.)
 * @param {boolean} [params.enableDiarization=false] - Enable speaker diarization
 * @returns {Promise<Object>} Transcription result with metadata
 */
export async function transcribeAudio({ audioUrl, language = 'auto', enableDiarization = false }) {
  try {
    // Validate input
    if (!audioUrl || typeof audioUrl !== 'string') {
      throw new Error('audioUrl is required and must be a string')
    }

    console.log(`[Gladia] Transcribing audio: ${audioUrl}`)
    console.log(`[Gladia] Language: ${language}, Diarization: ${enableDiarization}`)

    // Build request body
    const requestBody = {
      audio_url: audioUrl,
      diarization: enableDiarization
    }

    // Only include language if not auto
    if (language && language !== 'auto') {
      requestBody.language = language
    }

    // Call Gladia API
    const response = await fetch(GLADIA_API_URL, {
      method: 'POST',
      headers: {
        'X-Gladia-Key': GLADIA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gladia API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()

    // Extract transcription data
    const transcription = data.result?.transcription?.full_transcript || data.transcription || ''
    const detectedLanguage = data.result?.language || language
    const confidence = data.result?.confidence || null
    const duration = data.result?.metadata?.duration || null
    const words = data.result?.transcription?.words || []

    // Extract diarization if enabled
    let diarization = null
    if (enableDiarization && data.result?.diarization) {
      diarization = data.result.diarization
    }

    console.log(`[Gladia] Transcription successful: ${transcription.substring(0, 100)}...`)

    return {
      success: true,
      transcription,
      language: detectedLanguage,
      confidence,
      diarization,
      metadata: {
        duration,
        words: words.length
      }
    }
  } catch (error) {
    console.error(`[Gladia] Transcription error: ${error.message}`)
    return {
      success: false,
      error: error.message,
      transcription: null
    }
  }
}

/**
 * Get list of supported languages for transcription
 * @returns {Promise<Object>} List of language codes and names
 */
export async function getSupportedLanguages() {
  try {
    const languages = [
      { code: 'auto', name: 'Auto-detect' },
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' },
      { code: 'nl', name: 'Dutch' },
      { code: 'pl', name: 'Polish' }
    ]

    console.log(`[Gladia] Returning ${languages.length} supported languages`)

    return {
      success: true,
      languages
    }
  } catch (error) {
    console.error(`[Gladia] Error getting languages: ${error.message}`)
    return {
      success: false,
      error: error.message,
      languages: []
    }
  }
}
