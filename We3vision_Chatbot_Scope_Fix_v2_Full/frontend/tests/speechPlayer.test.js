import test from 'node:test'
import assert from 'node:assert/strict'
import { SpeechPlayer } from '../src/services/speechPlayer.js'

globalThis.window={speechSynthesis:{cancel(){},resume(){},getVoices(){return []}}}
const turn=()=>new Promise(resolve=>setImmediate(resolve))

test('stop discards a stale response and the next utterance can start',async()=>{
  const callbacks=new Map(),played=[]
  const player=new SpeechPlayer({request:(text,lang,signal)=>new Promise((resolve,reject)=>{
    callbacks.set(text,resolve)
    signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')))
  })})
  player.playBundle=async(bundle,job)=>{played.push(job.text)}
  player.enqueue('old','gu')
  player.stop()
  player.enqueue('new','hi')
  callbacks.get('old')?.({blob:'old'})
  callbacks.get('new')({blob:'new'})
  await turn();await turn()
  assert.deepEqual(played,['new'])
  assert.equal(player.clock.active,false)
  assert.equal(player.busy,false)
  assert.equal(player.pending.size,0)
})

test('playback follows text order even when later speech downloads first',async()=>{
  const ready=new Map(),played=[]
  const player=new SpeechPlayer({request:text=>new Promise(resolve=>ready.set(text,resolve))})
  player.playBundle=async(bundle,job)=>{played.push(job.text)}
  player.enqueue('one');player.enqueue('two');player.enqueue('three')
  assert.equal(player.pending.size,2)
  ready.get('two')({blob:'two'});await turn()
  assert.deepEqual(played,[])
  ready.get('one')({blob:'one'});await turn()
  ready.get('three')({blob:'three'});await turn();await turn()
  assert.deepEqual(played,['one','two','three'])
})

test('muting cancels pending requests and never falls back to another voice',async()=>{
  let aborted=false,spoken=false
  const player=new SpeechPlayer({request:(text,lang,signal)=>new Promise((resolve,reject)=>{
    signal.addEventListener('abort',()=>{aborted=true;reject(new Error('abort'))})
  })})
  player.browserFallback=async()=>{spoken=true}
  player.enqueue('નમસ્તે','gu')
  player.enabled=false;player.stop()
  await turn();await turn()
  assert.equal(aborted,true);assert.equal(spoken,false)
  assert.equal(player.clock.active,false)
})

test('Gujarati fallback refuses an unrelated installed Hindi voice',async()=>{
  globalThis.SpeechSynthesisUtterance=class{}
  window.speechSynthesis.getVoices=()=>[{lang:'hi-IN',name:'Hindi'}]
  const player=new SpeechPlayer()
  await assert.rejects(player.browserFallback({text:'નમસ્તે',language:'gu'}),/No gu browser voice/)
  delete globalThis.SpeechSynthesisUtterance
})
