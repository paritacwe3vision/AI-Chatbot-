import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Avatar2D from './components/avatar/Avatar2D.jsx'
import { SpeechPlayer } from './services/speechPlayer.js'
import './avatar-preview.css'

const samples={
  en:'Hello! I am Aria. Thank you for visiting. How can I help you today?',
  hi:'नमस्ते! मैं आरिया हूँ। आपका स्वागत है। मैं आपकी कैसे मदद कर सकती हूँ?',
  gu:'નમસ્તે! હું આરિયા છું. તમારું સ્વાગત છે. હું તમને કેવી રીતે મદદ કરી શકું?',
}
function Preview(){
  const [language,setLanguage]=useState('gu'),[text,setText]=useState(samples.gu)
  const [mode,setMode]=useState('idle'),[speaking,setSpeaking]=useState(false)
  const [emotion,setEmotion]=useState('friendly'),[error,setError]=useState('')
  const playerRef=useRef(null)
  if(!playerRef.current)playerRef.current=new SpeechPlayer({onSpeaking:setSpeaking,onError:setError})
  const player=playerRef.current
  useEffect(()=>()=>player.dispose(),[player])
  const current=speaking?'speaking':mode
  const playSample=async()=>{
    player.stop();player.unlock();setError('');setMode('idle')
    const session=player.session
    try {
      const response=await fetch(`/avatar/samples/${language}.json`)
      if(!response.ok)throw new Error('The included voice sample could not load.')
      const data=await response.json()
      if(session!==player.session)return
      const bytes=Uint8Array.from(atob(data.audio_base64),c=>c.charCodeAt(0))
      setText(data.text)
      player.enqueueBundle({...data,blob:new Blob([bytes],{type:data.mime_type})})
    }catch(e){setError(e.message)}
  }
  return <main className="preview-page">
    <div className="preview-heading"><span>WE3VISION / ARIA</span><h1>Meet your assistant.</h1><p>Try her expressions, then hear her speak in your language.</p></div>
    <section className="preview-card">
      <div className="preview-character"><Avatar2D state={current} clock={player.clock} text={text}
        emotion={speaking?undefined:emotion} label={{idle:'Ready to help',thinking:'Thinking…',listening:'Listening…',speaking:'Speaking…'}[current]} /></div>
      <div className="preview-controls">
        <label htmlFor="language">Language</label>
        <select id="language" value={language} onChange={e=>{player.stop();setLanguage(e.target.value);setText(samples[e.target.value])}}>
          <option value="gu">ગુજરાતી · Gujarati</option><option value="hi">हिन्दी · Hindi</option><option value="en">English</option>
        </select>
        <label htmlFor="speech-text">What should Aria say?</label>
        <textarea id="speech-text" value={text} onChange={e=>setText(e.target.value)} rows="4" maxLength="800" />
        <div className="preview-buttons"><button onClick={()=>{setError('');setMode('idle');player.stop();player.unlock();player.enqueue(text,language)}} disabled={!text.trim()}>Speak</button><button className="secondary" onClick={playSample}>Play sample</button><button className="secondary" onClick={()=>player.stop()}>Stop</button></div>
        <span className="preview-label">Expression & movement</span>
        <div className="preview-expressions">{[['idle','friendly','Relaxed'],['listening','friendly','Listening'],['thinking','friendly','Thinking'],['idle','happy','Happy'],['idle','empathetic','Empathetic']].map(([s,e,label])=><button key={label} className={mode===s&&emotion===e?'selected':''} onClick={()=>{player.stop();setMode(s);setEmotion(e)}}>{label}</button>)}</div>
        {error&&<p role="alert" className="preview-error">{error}</p>}
        <p className="preview-note">Play sample works without the backend. Speak reads your own text using the running backend and an internet connection. This preview does not need the chat model.</p>
        <a href="/">Open website chatbot →</a>
      </div>
    </section>
  </main>
}
createRoot(document.getElementById('root')).render(<Preview/> )
