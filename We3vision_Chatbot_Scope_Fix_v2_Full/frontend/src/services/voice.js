const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000'

const GUJLISH_WORDS = new Set([
  'kem', 'cho', 'tame', 'tamari', 'tamaru', 'tamaro', 'shu', 'su', 'chhe',
  'nathi', 'mane', 'ame', 'aapo', 'karsho', 'karvu', 'mate', 'pachhi', 'krupya',
])

const HINGLISH_WORDS = new Set([
  'aap', 'kaise', 'kya', 'hai', 'hain', 'nahi', 'nahin', 'mujhe', 'mera',
  'meri', 'mere', 'batao', 'bataiye', 'karna', 'karo', 'kripya', 'abhi',
])

function containsCodePointInRange(text, start, end) {
  return Array.from(text).some(ch => {
    const cp = ch.codePointAt(0)
    return cp >= start && cp <= end
  })
}

export function detectFrontendLanguage(text = '') {
  const value = String(text || '').trim()
  if (!value) return { code: 'en', locale: 'en-IN' }

  if (containsCodePointInRange(value, 0x0A80, 0x0AFF)) {
    return { code: 'gu', locale: 'gu-IN' }
  }
  if (containsCodePointInRange(value, 0x0900, 0x097F)) {
    return { code: 'hi', locale: 'hi-IN' }
  }

  const words = value.toLowerCase().match(/[a-z']+/g) || []
  let guScore = 0
  let hiScore = 0
  for (const word of words) {
    if (GUJLISH_WORDS.has(word)) guScore += 1
    if (HINGLISH_WORDS.has(word)) hiScore += 1
  }

  const lower = value.toLowerCase()
  if (lower.includes('kem cho') || lower.includes('shu chhe') || lower.includes('tame ')) guScore += 2
  if (lower.includes('kaise ho') || lower.includes('kya hai') || lower.includes('mujhe ')) hiScore += 2

  if (guScore >= 2 && guScore > hiScore) return { code: 'gu', locale: 'gu-IN' }
  if (hiScore >= 2 && hiScore > guScore) return { code: 'hi', locale: 'hi-IN' }
  return { code: 'en', locale: 'en-IN' }
}

export function localizedConnectionError(userText = '') {
  const { code } = detectFrontendLanguage(userText)
  if (code === 'gu') {
    return 'માફ કરશો, હમણાં AI સર્વર સાથે કનેક્શન થઈ રહ્યું નથી. કૃપા કરીને થોડીવાર પછી ફરી પ્રયાસ કરો.'
  }
  if (code === 'hi') {
    return 'क्षमा करें, अभी AI सर्वर से कनेक्शन नहीं हो पा रहा है। कृपया थोड़ी देर बाद फिर प्रयास करें।'
  }
  return 'Unable to connect to the AI service right now. Please try again in a moment.'
}

const SPEECH_LOCALES = {
  en: 'en-IN',
  gu: 'gu-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  pa: 'pa-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
}

export function localeForLanguage(language = 'en') {
  const code = String(language || 'en').toLowerCase().split('-')[0]
  return SPEECH_LOCALES[code] || language || 'en-IN'
}

export async function requestNeuralSpeech(text, language = 'en') {
  const response = await fetch(`${API_URL}/api/voice/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  })

  if (!response.ok) {
    throw new Error(`TTS request failed with status ${response.status}`)
  }

  const blob = await response.blob()
  if (!blob.size) throw new Error('TTS returned empty audio')
  return blob
}

export async function requestSynchronizedSpeech(text, language = 'en', signal) {
  const response = await fetch(`${API_URL}/api/voice/tts-sync`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ text, language }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || `Speech request failed (${response.status})`)
  }
  const data = await response.json()
  if (!data.audio_base64) throw new Error('The speech service returned empty audio')
  const bytes = Uint8Array.from(atob(data.audio_base64), ch => ch.charCodeAt(0))
  return { ...data, audio_base64: undefined,
    blob: new Blob([bytes], { type: data.mime_type || 'audio/mpeg' }) }
}
