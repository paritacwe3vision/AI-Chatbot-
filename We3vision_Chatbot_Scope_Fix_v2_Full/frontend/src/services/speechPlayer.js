import { requestSynchronizedSpeech, localeForLanguage } from './voice.js'

// Convert rich/Markdown text into natural speech without changing what is
// rendered in the chat. In particular, Markdown table borders/separators are
// never spoken, while the actual cell content is preserved in reading order.
export function cleanTextForSpeech(text = '') {
  const spokenLines = []

  for (const originalLine of String(text || '').split(/\r?\n/)) {
    const trimmed = originalLine.trim()
    if (!trimmed) continue

    // Markdown table separator rows are visual formatting only. Never send
    // their pipes or dash runs to any TTS engine.
    const tableBody = trimmed.replace(/^\|/, '').replace(/\|$/, '')
    const tableCells = tableBody.split('|').map(cell => cell.trim())
    const isTableSeparator = tableCells.length > 1
      && tableCells.every(cell => !cell || /^:?-{3,}:?$/.test(cell))

    if (isTableSeparator || /^:?-{3,}:?$/.test(trimmed)) continue

    // For table-like text, preserve only real cell content. This also handles
    // streaming chunks where a header row and separator row arrive together.
    if (trimmed.includes('|') || trimmed.includes('¦')) {
      const contentCells = trimmed
        .replace(/¦/g, '|')
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell && !/^:?-{2,}:?$/.test(cell))

      if (contentCells.length) {
        spokenLines.push(contentCells.join('. '))
        continue
      }
      continue
    }

    spokenLines.push(originalLine)
  }

  return spokenLines.join(' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^\s*[-*•]+\s*/gm, '')
    // Final hard guard: no table pipe can ever be spoken, and standalone dash
    // runs used as table borders are removed. Single hyphens inside real words
    // or URL paths (for example brand-identity) are left untouched.
    .replace(/[|¦]/g, ' ')
    .replace(/:?-{2,}:?/g, ' ')
    .replace(/(^|\s)[-–—]+(?=[\s.,;:]|$)/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
}

// One media element and one clock own the entire utterance queue. The avatar
// reads audio.currentTime, so buffering, playback rate and seeks cannot drift.
export class SpeechPlayer {
  constructor({ onSpeaking = () => {}, onError = () => {}, request = requestSynchronizedSpeech } = {}) {
    this.onSpeaking = onSpeaking
    this.onError = onError
    this.request = request
    this.clock = { active: false, visemes: [], words: [] }
    this.queue = []
    this.pending = new Set()
    this.session = 0
    this.processing = false
    this.enabled = true
    this.audio = null
    this.context = null
    this.source = null
    this.cancelPlayback = null
  }

  get busy() { return this.processing || this.queue.length > 0 }

  unlock() {
    if (!this.audio) {
      this.audio = new Audio()
      this.audio.preload = 'auto'
      this.audio.playsInline = true
    }
    try {
      const Context = window.AudioContext || window.webkitAudioContext
      if (!this.context && Context) {
        this.context = new Context()
        this.source = this.context.createMediaElementSource(this.audio)
        const analyser = this.context.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = .5
        this.source.connect(analyser)
        analyser.connect(this.context.destination)
        this.clock.analyser = analyser
        this.analyser = analyser
        this.clock.samples = new Float32Array(analyser.fftSize)
        this.clock.spectrum = new Uint8Array(analyser.frequencyBinCount)
      }
      if (this.context?.state === 'suspended') void this.context.resume().catch(() => {})
    } catch { /* Audio still plays without amplitude analysis on older browsers. */ }
    window.speechSynthesis?.resume()
  }

  setSpeaking(active) {
    this.clock.active = active
    this.onSpeaking(active)
  }

  stop() {
    this.session++
    this.queue.length = 0
    for (const job of this.pending) job.controller.abort()
    this.pending.clear()
    this.cancelPlayback?.()
    this.cancelPlayback = null
    this.audio?.pause()
    try { window.speechSynthesis?.cancel() } catch { /* no Web Speech */ }
    this.clock.visemes = []
    this.clock.words = []
    this.clock.audio = null
    this.setSpeaking(false)
  }

  enqueue(text, language = 'en', onEnd) {
    const speechText = cleanTextForSpeech(text)
    if (!this.enabled || !speechText) { onEnd?.(); return }
    this.queue.push({ text: speechText, language, session: this.session, onEnd })
    this.prefetch()
    void this.drain()
  }

  enqueueBundle(bundle, onEnd) {
    if (!this.enabled) { onEnd?.(); return }
    this.queue.push({ text: bundle.text, language: bundle.language, session: this.session,
      onEnd, prepared: Promise.resolve({ bundle }) })
    void this.drain()
  }

  prefetch() {
    // Limit cloud synthesis to two phrases ahead; stop aborts both immediately.
    for (const job of this.queue.slice(0, 2)) {
      if (job.prepared || this.pending.size >= 2) continue
      job.controller = new AbortController()
      this.pending.add(job)
      const timer = setTimeout(() => job.controller.abort(), 45000)
      job.prepared = this.request(job.text, job.language, job.controller.signal)
        .then(bundle => ({ bundle }), error => ({ error }))
        .finally(() => { clearTimeout(timer); this.pending.delete(job); this.prefetch() })
    }
  }

  async drain() {
    if (this.processing) return
    this.processing = true
    try {
      while (this.enabled && this.queue.length) {
        this.prefetch()
        const job = this.queue.shift()
        if (job.session !== this.session) continue
        // A previous generation may still have been finishing when enqueued.
        if (!job.prepared) {
          this.queue.unshift(job)
          await Promise.race([...this.pending].map(x => x.prepared))
          continue
        }
        const result = await job.prepared
        this.prefetch()
        if (job.session !== this.session || !this.enabled) { job.onEnd?.(); continue }
        try {
          if (result.error) throw result.error
          await this.playBundle(result.bundle, job)
        } catch (error) {
          if (job.session === this.session && this.enabled) {
            try { await this.browserFallback(job) }
            catch (fallbackError) {
              this.onError(`${fallbackError.message} ${result.error ? result.error.message : 'Click the message speaker button to retry.'}`)
            }
          }
        } finally { job.onEnd?.() }
      }
    } finally {
      this.processing = false
      if (this.queue.length && this.enabled) void this.drain()
      else this.setSpeaking(false)
    }
  }

  playBundle(bundle, job) {
    this.unlock()
    const audio = this.audio
    const url = URL.createObjectURL(bundle.blob)
    Object.assign(this.clock, { audio, text: job.text, language: job.language,
      analyser: this.analyser,
      visemes: bundle.visemes || [], words: bundle.words || [],
      timingSource: bundle.timing_source, active: false })
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = error => {
        if (settled) return
        settled = true
        clearTimeout(watchdog)
        audio.onplaying = audio.onended = audio.onerror = audio.onpause = audio.onwaiting = null
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
        URL.revokeObjectURL(url)
        if (this.cancelPlayback === cancel) this.cancelPlayback = null
        this.setSpeaking(false)
        error ? reject(error) : resolve()
      }
      const cancel = () => finish()
      this.cancelPlayback = cancel
      // Never leave the queue blocked if a device loses its output mid-phrase.
      const watchdog = setTimeout(() => finish(new Error('Speech playback timed out.')), 180000)
      audio.onplaying = () => { if (job.session === this.session) this.setSpeaking(true) }
      audio.onwaiting = audio.onpause = () => this.setSpeaking(false)
      audio.onended = () => finish()
      audio.onerror = () => finish(new Error('Audio playback failed.'))
      audio.src = url
      audio.play().catch(finish)
    })
  }

  browserFallback(job) {
    const synth = window.speechSynthesis
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      return Promise.reject(new Error('Speech is unavailable in this browser.'))
    }
    const code = job.language.toLowerCase().split('-')[0]
    const voice = synth.getVoices().find(v => v.lang.toLowerCase() === localeForLanguage(job.language).toLowerCase())
      || synth.getVoices().find(v => v.lang.toLowerCase().split('-')[0] === code)
    // Never silently use Hindi/English for Gujarati or an unrelated language.
    if (!voice) return Promise.reject(new Error(`No ${job.language} browser voice is installed.`))
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(job.text)
      utterance.voice = voice
      utterance.lang = voice.lang
      utterance.rate = ['gu', 'hi'].includes(code) ? .96 : 1
      let settled = false
      const finish = error => {
        if (settled) return
        settled = true
        clearTimeout(watchdog)
        utterance.onstart = utterance.onend = utterance.onerror = utterance.onboundary = null
        if (this.cancelPlayback === cancel) this.cancelPlayback = null
        this.setSpeaking(false)
        error ? reject(error) : resolve()
      }
      const cancel = () => finish()
      const watchdog = setTimeout(() => { synth.cancel(); finish(new Error('Browser speech timed out.')) }, 180000)
      this.cancelPlayback = cancel
      utterance.onstart = () => {
        Object.assign(this.clock, { audio: null, analyser: null, text: job.text,
          startedAt: performance.now(), visemes: [], words: [], timingSource: 'browser-boundaries' })
        this.setSpeaking(true)
      }
      // Browser speech has no accessible waveform or guaranteed phoneme events.
      // Show a modest articulation only during a real word-boundary event.
      utterance.onboundary = e => {
        if (e.name && e.name !== 'word') return
        const elapsed = (performance.now() - this.clock.startedAt) / 1000
        this.clock.visemes = [{ start: elapsed, end: elapsed + .12, viseme: 'aa' }]
        this.clock.words = [{ start: elapsed, end: elapsed + .12 }]
      }
      utterance.onend = () => finish()
      utterance.onerror = e => finish(new Error(`Browser speech failed (${e.error}).`))
      synth.speak(utterance)
    })
  }

  dispose() {
    this.stop()
    void this.context?.close().catch(() => {})
    this.context = this.source = this.audio = null
  }
}
