import { useState, useEffect, useRef, useCallback, useReducer } from 'react'
import { sendChatMessage, streamChatMessage } from '../../services/api.js'
import Robot2D, { RobotPortrait } from '../avatar/Robot2D.jsx'
import { initialWindowState, windowTransition, ENTRANCE_MS, GOODBYE_MS } from './windowState.js'
import '../avatar/robot-placement.css'
import { useAvatarSpeech } from '../../hooks/useAvatarSpeech.js'
import { detectFrontendLanguage, localizedConnectionError } from '../../services/voice.js'

/* ═══════════════════════════════════════════════════
   BUSINESS-AGENT WELCOME COPY
   All real answers come from the FastAPI/LangGraph backend.
   There is intentionally no English-only rule-engine fallback.
   ═══════════════════════════════════════════════════ */
const WELCOME_MESSAGES = [
  "Hello! I'm Webot, the We3vision AI Business Assistant. I can help with company services, technologies, projects, project inquiries, careers, and general We3vision information. How can I help you?",
  "Hi! I'm Webot, the We3vision AI Business Assistant. Ask me about our services, technologies, projects, careers, or how to start a project with our team.",
]

/* ═══════════════════════════════════════════════════
   STATE MANAGEMENT (useReducer)
   ═══════════════════════════════════════════════════ */
const initialState = {
  messages: [],
  ...initialWindowState,
  isTyping: false,
  avatarState: 'idle', // idle | thinking | speaking
  error: null,
  lastUserMsg: null,
  ttsEnabled: true,
  isSpeaking: false,
  showHistory: false,
  chatHistory: [], // array of { id, title, messages, timestamp }
  currentChatId: null,
}

function chatReducer(state, action) {
  const nextWindow = windowTransition(state, action)
  if (nextWindow) return nextWindow
  switch (action.type) {
    case 'ADD_MESSAGE': return { ...state, messages: [...state.messages, action.payload] }
    case 'UPDATE_MESSAGE_CONTENT': return {
      ...state,
      messages: state.messages.map(message =>
        message.id === action.payload.id
          ? { ...message, content: action.payload.content, language: action.payload.language || message.language, locale: action.payload.locale || message.locale }
          : message
      ),
    }
    case 'SET_TYPING': return { ...state, isTyping: action.payload }
    case 'SET_AVATAR': return { ...state, avatarState: action.payload }
    case 'SET_ERROR': return { ...state, error: action.payload }
    case 'CLEAR_ERROR': return { ...state, error: null }
    case 'SET_LAST_USER': return { ...state, lastUserMsg: action.payload }
    case 'TOGGLE_TTS': return { ...state, ttsEnabled: !state.ttsEnabled }
    case 'SET_SPEAKING': return { ...state, isSpeaking: action.payload, avatarState: action.payload ? 'speaking' : 'idle' }
    case 'TOGGLE_HISTORY': return { ...state, showHistory: !state.showHistory }
    case 'SET_HISTORY': return { ...state, chatHistory: action.payload }
    case 'LOAD_CHAT': return { ...state, messages: action.payload.messages, currentChatId: action.payload.id, showHistory: false }
    case 'SET_CURRENT_CHAT_ID': return { ...state, currentChatId: action.payload }
    case 'SAVE_CURRENT_CHAT': {
      if (state.messages.length === 0) return state
      const title = state.messages.find(m => m.role === 'user')?.content?.slice(0, 40) || 'Conversation'
      const existing = state.chatHistory.find(c => c.id === state.currentChatId)
      let newHistory
      if (existing) {
        newHistory = state.chatHistory.map(c =>
          c.id === state.currentChatId
            ? { ...c, messages: state.messages, timestamp: Date.now(), title }
            : c
        )
      } else {
        const newChat = {
          id: state.currentChatId || Date.now(),
          title,
          messages: state.messages,
          timestamp: Date.now(),
        }
        newHistory = [newChat, ...state.chatHistory].slice(0, 20)
      }
      return { ...state, chatHistory: newHistory, currentChatId: existing ? state.currentChatId : (state.currentChatId || Date.now()) }
    }
    case 'DELETE_CHAT': {
      const newHistory = state.chatHistory.filter(c => c.id !== action.payload)
      return { ...state, chatHistory: newHistory }
    }
    default: return state
  }
}

/* ═══════════════════════════════════════════════════
   MESSAGE BUBBLE
   ═══════════════════════════════════════════════════ */
function MessageBubble({ message, onTTS, onStopTTS, isError }) {
  const isUser = message.role === 'user'
  const [ttsPlaying, setTtsPlaying] = useState(false)

  const handleTTSClick = () => {
    if (ttsPlaying) {
      onStopTTS?.()
      setTtsPlaying(false)
    } else {
      onTTS(message.content, message.locale || message.language || 'en', () => setTtsPlaying(false))
      setTtsPlaying(true)
    }
  }

  const formatText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
      }
      return part.split('\n').map((line, j, arr) => (
        <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
      ))
    })
  }

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} group`}>
      <div className={`text-[10px] font-medium uppercase tracking-wider mb-0.5 ${isUser ? 'text-indigo-400/70' : 'text-slate-500'}`}>
        {isUser ? 'YOU' : 'WEBOT'}
      </div>
      <div
        className={`relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed transition-all max-w-[95%] ${isUser
          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-sm shadow-lg shadow-indigo-500/20'
          : isError
            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-200 rounded-tl-sm'
            : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm'
          }`}
      >
        <span>{formatText(message.content)}</span>
      </div>

      <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <span className="text-[10px] text-slate-600">{message.time}</span>
        {!isUser && !isError && (
          <button
            onClick={handleTTSClick}
            className={`opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md ${ttsPlaying ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            title={ttsPlaying ? 'Stop' : 'Play aloud'}
          >
            {ttsPlaying ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   TYPING INDICATOR
   ═══════════════════════════════════════════════════ */
function TypingIndicator() {
  return (
    <div className="flex flex-col gap-1 items-start">
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-0.5">WEBOT</div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400"
            style={{ animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   QUICK REPLY CHIPS
   ═══════════════════════════════════════════════════ */
const QUICK_REPLIES = [
  { label: '🧩 Services', msg: 'What services does We3vision provide?' },
  { label: '🤖 AI Development', msg: 'Tell me about your AI development services.' },
  { label: '💼 Start a Project', msg: 'I have a project idea and want to discuss it.' },
  { label: '🛠 Technologies', msg: 'Which technologies does We3vision use?' },
  { label: '📂 Projects', msg: 'Tell me about some We3vision projects.' },
  { label: '📞 Contact', msg: 'How can I contact the We3vision team?' },
]
/* ═══════════════════════════════════════════════════
   HISTORY PANEL
   ═══════════════════════════════════════════════════ */
function HistoryPanel({ history, currentChatId, onLoad, onDelete, onClose }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#0d0d16]/98 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <h3 className="text-sm font-semibold text-white">Chat History</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 chat-scrollbar">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">No previous conversations</p>
            <p className="text-xs text-slate-600 mt-1">Start chatting and your history will appear here</p>
          </div>
        ) : (
          history.map(chat => (
            <div
              key={chat.id}
              className={`group flex items-start gap-2.5 p-3 rounded-xl cursor-pointer transition-all ${chat.id === currentChatId
                ? 'bg-indigo-500/15 border border-indigo-500/30'
                : 'hover:bg-white/5 border border-transparent'
                }`}
              onClick={() => onLoad(chat)}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-indigo-400">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate font-medium">{chat.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {new Date(chat.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{chat.messages.length} messages
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(chat.id) }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                title="Delete"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* Extract speech-friendly phrases while the LLM is still streaming. The first
   phrase is released at a natural sentence/clause boundary; very long sentences
   are split at a word boundary so speech never waits for the full answer. */
function extractRealtimeSpeechChunks(buffer, flush = false) {
  let remaining = String(buffer || '')
  const chunks = []

  const take = (endIndex) => {
    const raw = remaining.slice(0, endIndex).trim()
    remaining = remaining.slice(endIndex).trimStart()
    const cleaned = raw
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*/g, '')
      .replace(/^\s*[-*•]+\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleaned) chunks.push(cleaned)
  }

  while (remaining.trim()) {
    let boundary = -1
    const minPhrase = 28

    for (let i = minPhrase; i < remaining.length; i += 1) {
      if (/[.!?।！？\n]/.test(remaining[i])) {
        boundary = i + 1
        break
      }
    }

    if (boundary < 0 && remaining.length >= 64) {
      const searchTo = Math.min(92, remaining.length)
      const clause = remaining.slice(34, searchTo).search(/[,;:，；]/)
      if (clause >= 0) boundary = 34 + clause + 1
    }

    if (boundary < 0 && remaining.length >= 98) {
      const candidate = remaining.slice(0, 88)
      const space = Math.max(candidate.lastIndexOf(' '), candidate.lastIndexOf('\n'))
      boundary = space >= 54 ? space + 1 : 88
    }

    if (boundary < 0) break
    take(boundary)
  }

  if (flush && remaining.trim()) {
    take(remaining.length)
  }

  return { chunks, remainder: remaining }
}

/* ═══════════════════════════════════════════════════
   MAIN CHATBOT COMPONENT
   ═══════════════════════════════════════════════════ */
export default function Chatbot() {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const ttsEnabledRef = useRef(true)
  const lastLanguageRef = useRef('en')
  const chatSessionRef = useRef(0)
  const closingRef = useRef(false)
  const fabRef = useRef(null)
  const [unread, setUnread] = useState(0)

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aria_chat_history')
      if (saved) {
        dispatch({ type: 'SET_HISTORY', payload: JSON.parse(saved) })
      }
    } catch { }
  }, [])

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem('aria_chat_history', JSON.stringify(state.chatHistory))
    } catch { }
  }, [state.chatHistory])

  // Keep an immediate, non-stale copy for async TTS callbacks.
  useEffect(() => {
    ttsEnabledRef.current = state.ttsEnabled
  }, [state.ttsEnabled])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [state.messages, state.isTyping, scrollToBottom])

  useEffect(() => {
    if (state.isOpen && !state.isMinimized) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300)
      setUnread(0)
      return () => clearTimeout(timer)
    }
  }, [state.isOpen, state.isMinimized])

  // Welcome message
  useEffect(() => {
    if (state.isOpen && state.messages.length === 0 && !state.showHistory) {
      const welcome = {
        id: Date.now(),
        role: 'assistant',
        content: WELCOME_MESSAGES[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }
      dispatch({ type: 'ADD_MESSAGE', payload: welcome })
    }
  }, [state.isOpen, state.messages.length, state.showHistory])

  const { player: speechPlayer, stopTTS, unlockAudioForAutomaticSpeech,
    enqueueStreamingSpeech, speakText } = useAvatarSpeech(state.ttsEnabled, dispatch)

  // Robot lifecycle matches the previous Webot version.
  useEffect(() => {
    if (!state.isOpen || !state.isEntering) return
    const timer = setTimeout(() => dispatch({ type: 'ENTRY_FINISHED', entryId: state.entryId }), ENTRANCE_MS)
    return () => clearTimeout(timer)
  }, [state.isOpen, state.isEntering, state.entryId])

  useEffect(() => {
    if (!state.isClosing) return
    const timer = setTimeout(() => dispatch({ type: 'CLOSE_FINISHED' }), GOODBYE_MS)
    return () => clearTimeout(timer)
  }, [state.isClosing])

  useEffect(() => {
    if (!state.isOpen && closingRef.current) fabRef.current?.focus()
  }, [state.isOpen])

  /* ── Send message: streamed text + streamed speech ── */
  const sendMessage = useCallback(async (content) => {
    if (closingRef.current || !content.trim()) return

    // Prime browser audio during the real user gesture. The first spoken phrase
    // will arrive later from the streaming AI request, but playback is already unlocked.
    stopTTS()
    if (ttsEnabledRef.current) unlockAudioForAutomaticSpeech()
    const requestSession = ++chatSessionRef.current
    const voiceSession = speechPlayer.session

    dispatch({ type: 'CLEAR_ERROR' })

    // Keep one stable Google Sheets session ID for this complete conversation.
    const conversationSessionId = String(state.currentChatId || Date.now())
    if (!state.currentChatId) {
      dispatch({ type: 'SET_CURRENT_CHAT_ID', payload: conversationSessionId })
    }

    const localLanguage = detectFrontendLanguage(content)
    lastLanguageRef.current = localLanguage.code

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: content.trim(),
      language: localLanguage.code,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg })
    dispatch({ type: 'SET_LAST_USER', payload: content.trim() })
    dispatch({ type: 'SET_TYPING', payload: true })
    dispatch({ type: 'SET_AVATAR', payload: 'thinking' })
    setInputValue('')

    const assistantId = Date.now() + 1
    const messageTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    let responseLanguage = localLanguage.code
    let responseLocale = localLanguage.locale
    let accumulated = ''
    let speechBuffer = ''
    let assistantAdded = false

    const addOrUpdateAssistant = (text) => {
      if (requestSession !== chatSessionRef.current) return
      if (!assistantAdded) {
        assistantAdded = true
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: assistantId,
            role: 'assistant',
            content: text,
            language: responseLanguage,
            locale: responseLocale,
            time: messageTime,
          },
        })
        dispatch({ type: 'SET_TYPING', payload: false })
      } else {
        dispatch({
          type: 'UPDATE_MESSAGE_CONTENT',
          payload: {
            id: assistantId,
            content: text,
            language: responseLanguage,
            locale: responseLocale,
          },
        })
      }
    }

    const queueSpeakableText = (incoming, flush = false) => {
      if (requestSession !== chatSessionRef.current || voiceSession !== speechPlayer.session) return
      if (incoming) speechBuffer += incoming
      const parsed = extractRealtimeSpeechChunks(speechBuffer, flush)
      speechBuffer = parsed.remainder
      if (ttsEnabledRef.current) {
        parsed.chunks.forEach(chunk => enqueueStreamingSpeech(chunk, responseLocale || responseLanguage))
      }
    }

    try {
      const finalEvent = await streamChatMessage({
        message: content,
        userId: 'web_user',
        sessionId: conversationSessionId,
        onMeta: (meta) => {
          if (requestSession !== chatSessionRef.current) return
          responseLanguage = meta.language || responseLanguage
          responseLocale = meta.locale || responseLocale
          lastLanguageRef.current = responseLanguage
        },
        onDelta: (delta) => {
          if (requestSession !== chatSessionRef.current) return
          if (!delta) return
          accumulated += delta
          addOrUpdateAssistant(accumulated)
          dispatch({ type: 'SET_AVATAR', payload: 'thinking' })
          queueSpeakableText(delta, false)
        },
        onDone: (event) => {
          if (requestSession !== chatSessionRef.current) return
          responseLanguage = event.language || responseLanguage
          responseLocale = event.locale || responseLocale
          lastLanguageRef.current = responseLanguage
        },
      })

      if (requestSession !== chatSessionRef.current) return

      // Speak the final unfinished phrase immediately when generation stops.
      queueSpeakableText('', true)

      const finalReply = finalEvent?.reply || accumulated
      if (!assistantAdded && finalReply) {
        accumulated = finalReply
        addOrUpdateAssistant(finalReply)
      } else if (finalReply && finalReply !== accumulated) {
        accumulated = finalReply
        addOrUpdateAssistant(finalReply)
      }

      dispatch({ type: 'SET_TYPING', payload: false })
      if (!speechPlayer.busy) {
        dispatch({ type: 'SET_AVATAR', payload: 'idle' })
      }
      dispatch({ type: 'SAVE_CURRENT_CHAT' })

      if (!state.isOpen || state.isMinimized) {
        setUnread(prev => prev + 1)
      }
    } catch (streamError) {
      if (requestSession !== chatSessionRef.current) return
      console.warn('[Webot Stream] Streaming path failed.', streamError)

      // If no streamed text reached the user, fall back to the original reliable
      // non-streaming API. This keeps the chatbot usable with providers/proxies that
      // do not support streaming.
      if (!assistantAdded) {
        try {
          const apiData = await sendChatMessage(
            content,
            'web_user',
            conversationSessionId
          )
          if (requestSession !== chatSessionRef.current) return
          const response = apiData.reply
          responseLanguage = apiData.language || localLanguage.code
          responseLocale = apiData.locale || responseLanguage
          lastLanguageRef.current = responseLanguage
          accumulated = response
          addOrUpdateAssistant(response)
          dispatch({ type: 'SET_TYPING', payload: false })
          dispatch({ type: 'SET_AVATAR', payload: 'idle' })
          dispatch({ type: 'SAVE_CURRENT_CHAT' })
          if (ttsEnabledRef.current && voiceSession === speechPlayer.session) void speakText(response, responseLocale)
          return
        } catch (fallbackError) {
          if (requestSession !== chatSessionRef.current) return
          streamError = fallbackError
        }
      } else {
        // Preserve and finish speaking any valid partial streamed answer.
        queueSpeakableText('', true)
      }

      const errorText = localizedConnectionError(content)
      if (!assistantAdded) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: assistantId,
            role: 'assistant',
            content: errorText,
            language: localLanguage.code,
            time: messageTime,
          },
        })
        if (ttsEnabledRef.current && voiceSession === speechPlayer.session) void speakText(errorText, localLanguage.code)
      }
      dispatch({ type: 'SET_TYPING', payload: false })
      dispatch({ type: 'SET_AVATAR', payload: 'idle' })
      dispatch({ type: 'SET_ERROR', payload: streamError?.message || 'Unable to reach the AI service.' })
    }
  }, [
    state.currentChatId,
    state.isOpen,
    state.isMinimized,
    speechPlayer,
    enqueueStreamingSpeech,
    speakText,
    stopTTS,
    unlockAudioForAutomaticSpeech,
  ])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (inputValue.trim()) sendMessage(inputValue)
    }
  }, [inputValue, sendMessage])

  const beginClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    chatSessionRef.current++
    stopTTS()
    dispatch({ type: 'BEGIN_CLOSE' })
  }, [stopTTS])

  const currentAvatarState = state.isClosing ? 'goodbye' : state.isEntering ? 'entering'
    : state.isSpeaking ? 'speaking'
    : (state.isTyping || speechPlayer.busy) ? 'thinking' : state.avatarState

  const statusLabel = {
    idle: 'Online',
    entering: 'Hello!',
    goodbye: 'See you soon!',
    thinking: 'Thinking...',
    speaking: 'Speaking...',
  }[currentAvatarState] || 'Online'

  return (
    <>
      <style>{`
        @keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes dotBounce { 0%{transform:translateY(0)} 50%{transform:translateY(-5px)} 100%{transform:translateY(0)} }
        @keyframes chatSlideUp { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fabPop { from{transform:scale(0)} to{transform:scale(1)} }
        @keyframes ringPulse { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.15);opacity:0} }
        .chat-slide-up { animation: chatSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .fab-pop { animation: fabPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .ring-pulse { animation: ringPulse 2s ease-out infinite; }
        .chat-scrollbar::-webkit-scrollbar { width: 4px; }
        .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .chat-scrollbar::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.25); border-radius: 2px; }
      `}</style>

      {/* ═══ FAB BUTTON ═══ */}
      {!state.isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-center gap-2 fab-pop">
          {unread > 0 && (
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center z-10 shadow-lg">
              {unread}
            </div>
          )}
          <span className="absolute w-16 h-16 rounded-full bg-indigo-500/20 ring-pulse" />
          <button
            id="chatbot-fab"
            ref={fabRef}
            onClick={() => {
              closingRef.current = false
              if (ttsEnabledRef.current) unlockAudioForAutomaticSpeech()
              dispatch({ type: 'OPEN' })
            }}
            className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:scale-110 active:scale-95 transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)' }}
            aria-label="Open We3vision AI chatbot"
          >
            <span className="w-full h-full rounded-full overflow-hidden"><RobotPortrait /></span>
          </button>
          <span className="text-[10px] text-indigo-300 font-medium tracking-wide">Ask Webot</span>
        </div>
      )}

      {/* ═══ CHAT PANEL ═══ */}
      {state.isOpen && (
        <div
          id="chatbot-panel"
          data-closing={state.isClosing}
          data-minimized={state.isMinimized}
          className={`fixed z-[9999] bottom-6 right-6 flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/50 chat-slide-up transition-all duration-300
            ${state.isMinimized
              ? 'w-72 h-14'
              : 'w-[680px] h-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-3rem)]'}
          `}
          style={{
            background: 'linear-gradient(160deg, rgba(17,17,28,0.98) 0%, rgba(13,13,22,0.99) 100%)',
            border: '1px solid rgba(99,102,241,0.25)',
            backdropFilter: 'blur(24px)',
          }}
        >
          {/* ── HEADER ── */}
          <div
            inert={state.isClosing || undefined}
            className="flex items-center justify-between px-4 py-2.5 shrink-0"
            style={{ borderBottom: state.isMinimized ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-md"
                style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)' }}>
                <RobotPortrait />
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  Webot
                  <span className={`w-1.5 h-1.5 rounded-full ${currentAvatarState === 'thinking' ? 'bg-amber-400' :
                    currentAvatarState === 'speaking' ? 'bg-emerald-400' :
                      'bg-emerald-400'
                    }`} />
                </div>
                {!state.isMinimized && (
                  <div className="text-[10px] text-slate-500">We3vision Business AI · {statusLabel}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              {!state.isMinimized && (
                <>
                  {/* History */}
                  <button
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_HISTORY' }) }}
                    className={`p-1.5 rounded-lg transition-all ${state.showHistory ? 'text-indigo-400 bg-indigo-500/15' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                      }`}
                    title="Chat history"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  </button>
                  {/* TTS */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (state.ttsEnabled) {
                        stopTTS()
                      } else {
                        // Enabling speech is itself a user gesture, so prime browser audio.
                        unlockAudioForAutomaticSpeech()
                      }
                      dispatch({ type: 'TOGGLE_TTS' })
                    }}
                    className={`p-1.5 rounded-lg transition-all ${state.ttsEnabled ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-600 hover:text-slate-400'
                      }`}
                    title={state.ttsEnabled ? 'Automatic voice ON — click to mute' : 'Automatic voice OFF — click to enable'}
                  >
                    {state.ttsEnabled ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    )}
                  </button>
                </>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'MINIMIZE' }) }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
                title={state.isMinimized ? 'Expand' : 'Minimize'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {state.isMinimized ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); beginClose() }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                title="Close"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── BODY ── */}
          {!state.isMinimized && (
            <div className="aria-chat-body flex flex-1 min-h-0 relative" inert={state.isClosing || undefined}>
              {/* History overlay */}
              {state.showHistory && (
                <HistoryPanel
                  history={state.chatHistory}
                  currentChatId={state.currentChatId}
                  onLoad={(chat) => { chatSessionRef.current++; stopTTS(); dispatch({ type: 'SET_TYPING', payload: false }); dispatch({ type: 'LOAD_CHAT', payload: chat }) }}
                  onDelete={(id) => dispatch({ type: 'DELETE_CHAT', payload: id })}
                  onClose={() => dispatch({ type: 'TOGGLE_HISTORY' })}
                />
              )}

              {/* ── LEFT: IMAGE ZONE ── */}
              <div
                className="aria-avatar-zone relative shrink-0 flex flex-col items-center border-r border-white/6"
                style={{
                  background: 'linear-gradient(160deg, rgba(67,56,202,0.15) 0%, rgba(13,13,22,0.6) 100%)',
                }}
              >
                {/* Badges */}
                <div className="aria-avatar-badges absolute top-3 left-3 right-3 flex gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Real-time
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-white/8 text-slate-400 border border-white/10">
                    Business Agent
                  </span>
                </div>

                <div className="aria-avatar" data-avatar-state={currentAvatarState}>
                  <div className="webot-character-slot">
                    <Robot2D state={currentAvatarState} entryId={state.entryId} label={statusLabel} />
                  </div>
                  <div className="aria-avatar-status" aria-live="polite">
                    <i data-mode={currentAvatarState} />{statusLabel}
                  </div>
                </div>

                {/* Quick action chips */}
                <div className="aria-avatar-chips absolute bottom-4 left-3 right-3 flex flex-wrap gap-1.5 justify-center">
                  {['Services', 'AI Development', 'Start project'].map(label => (
                    <button
                      key={label}
                      onClick={() => sendMessage(
                        label === 'Services' ? 'What services does We3vision provide?' :
                          label === 'AI Development' ? 'Tell me about your AI development services.' :
                            'I have a project idea and want to discuss it.'
                      )}
                      className="px-2.5 py-1 rounded-full text-[10px] font-medium text-slate-300 bg-white/8 border border-white/10 hover:bg-indigo-500/20 hover:text-white hover:border-indigo-500/30 transition-all"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── RIGHT: CHAT ZONE ── */}
              <div className="flex-1 flex flex-col min-w-0">
                {state.error && (
                  <div className="mx-3 mt-2 flex items-center justify-between px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-xs text-rose-400">{state.error}</span>
                    <button
                      onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
                      className="text-xs text-rose-400 hover:text-rose-300 ml-2"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 chat-scrollbar">
                  {state.messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      onTTS={speakText}
                      onStopTTS={stopTTS}
                      isError={false}
                    />
                  ))}
                  {state.isTyping && <TypingIndicator />}

                  {!state.isTyping && state.messages.length <= 2 && (
                    <div className="pt-2">
                      <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-wider font-medium">Quick topics</p>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_REPLIES.map(({ label, msg }) => (
                          <button
                            key={label}
                            onClick={() => sendMessage(msg)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:text-white"
                            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div
                    className="flex items-end gap-1.5 rounded-xl px-2.5 py-2 transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder='Ask about We3vision, services, projects...'
                      rows={1}
                      disabled={state.isTyping}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 resize-none outline-none leading-relaxed max-h-24 overflow-y-auto py-1"
                      style={{ scrollbarWidth: 'none' }}
                      onInput={e => {
                        e.target.style.height = 'auto'
                        e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
                      }}
                    />

                    {/* Send */}
                    <button
                      onClick={() => inputValue.trim() && sendMessage(inputValue)}
                      disabled={!inputValue.trim() || state.isTyping}
                      className="p-1.5 rounded-lg transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                      style={{
                        background: inputValue.trim() ? 'linear-gradient(135deg, #4338ca, #6366f1)' : 'rgba(99,102,241,0.1)',
                        color: inputValue.trim() ? 'white' : 'rgba(99,102,241,0.4)',
                      }}
                      title="Send message (Enter)"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-center text-[9px] text-slate-700 mt-1.5">
                    Enter to send · Automatic text-to-speech available
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
