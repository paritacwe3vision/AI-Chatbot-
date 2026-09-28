// Window transitions preserve messages, session IDs, voice settings and uploads.
export const ENTRANCE_MS = 1150
export const GOODBYE_MS = 1300
export const initialWindowState = {
  isOpen: false, isMinimized: false, isMaximized: false,
  isClosing: false, isEntering: false, entryId: 0,
}

export function windowTransition(state, action) {
  switch (action.type) {
    case 'OPEN':
      return { ...state, isOpen: true, isMinimized: false, isClosing: false,
        isEntering: true, entryId: state.entryId + 1 }
    case 'ENTRY_FINISHED':
      return action.entryId === state.entryId ? { ...state, isEntering: false } : state
    case 'MINIMIZE':
      return state.isClosing ? state : { ...state, isMinimized: !state.isMinimized }
    case 'MAXIMIZE':
      return state.isClosing ? state : { ...state, isMinimized: false,
        isMaximized: state.isMinimized ? true : !state.isMaximized }
    case 'BEGIN_CLOSE':
      if (!state.isOpen || state.isClosing) return state
      // Reveal the robot for its goodbye even when Close is clicked on the bar.
      return { ...state, isClosing: true, isMinimized: false, isEntering: false,
        showHistory: false, isTyping: false }
    case 'CLOSE_FINISHED':
      if (!state.isClosing) return state
      return { ...state, ...initialWindowState, entryId: state.entryId,
        showHistory: false, isSpeaking: false, isTyping: false, avatarState: 'idle' }
    default:
      return null
  }
}
