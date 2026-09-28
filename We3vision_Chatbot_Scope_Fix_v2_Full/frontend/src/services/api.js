const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000'


// ============================================================
// READ BACKEND ERROR MESSAGE
// ============================================================

async function getErrorMessage(response, fallbackMessage) {
  try {
    const data = await response.json()
    return data?.detail || data?.message || fallbackMessage
  } catch {
    return fallbackMessage
  }
}


// ============================================================
// NORMAL CHAT REQUEST
// ============================================================

export async function sendChatMessage(
  message,
  userId = 'guest_user',
  sessionId = null
) {
  const response = await fetch(
    `${API_URL}/api/chat`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        message,
        user_id: userId,
        session_id: sessionId,
      }),
    }
  )

  if (!response.ok) {
    const errorMessage = await getErrorMessage(
      response,
      'Unable to get a response from the chatbot'
    )

    throw new Error(errorMessage)
  }

  return response.json()
}


// ============================================================
// STREAMING CHAT REQUEST
// ============================================================

/**
 * Streams the assistant response using NDJSON.
 *
 * onMeta:
 * Called when session information is received.
 *
 * onDelta:
 * Called whenever a new piece of text is received.
 *
 * onDone:
 * Called when the complete response finishes.
 */

export async function streamChatMessage({
  message,
  userId = 'guest_user',
  sessionId = null,
  onMeta,
  onDelta,
  onDone,
}) {
  const response = await fetch(
    `${API_URL}/api/chat/stream`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
      },

      body: JSON.stringify({
        message,
        user_id: userId,
        session_id: sessionId,
      }),
    }
  )

  if (!response.ok) {
    const errorMessage = await getErrorMessage(
      response,
      'Unable to start the AI response stream'
    )

    throw new Error(errorMessage)
  }

  if (!response.body) {
    throw new Error(
      'Streaming responses are not supported in this browser'
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')

  let buffer = ''
  let finalEvent = null

  const handleLine = line => {
    const trimmedLine = line.trim()

    if (!trimmedLine) {
      return
    }

    let event

    try {
      event = JSON.parse(trimmedLine)
    } catch {
      throw new Error(
        'The backend returned an invalid streaming response'
      )
    }

    if (event.type === 'meta') {
      onMeta?.(event)
      return
    }

    if (event.type === 'delta') {
      onDelta?.(
        event.text || '',
        event
      )
      return
    }

    if (event.type === 'done') {
      finalEvent = event
      onDone?.(event)
      return
    }

    if (event.type === 'error') {
      throw new Error(
        event.message ||
        'The AI response stream failed'
      )
    }
  }

  try {
    while (true) {
      const {
        value,
        done,
      } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(
        value,
        { stream: true }
      )

      let newlineIndex

      while (
        (newlineIndex = buffer.indexOf('\n')) >= 0
      ) {
        const line = buffer.slice(
          0,
          newlineIndex
        )

        buffer = buffer.slice(
          newlineIndex + 1
        )

        handleLine(line)
      }
    }

    // Process any remaining text
    buffer += decoder.decode()

    if (buffer.trim()) {
      handleLine(buffer)
    }
  } finally {
    reader.releaseLock()
  }

  return finalEvent
}