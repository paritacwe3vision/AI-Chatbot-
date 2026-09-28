import test from 'node:test'
import assert from 'node:assert/strict'
import { initialWindowState, windowTransition, GOODBYE_MS } from '../src/components/chatbot/windowState.js'
import { robotMotion, matteRobotAtlas } from '../src/components/avatar/robotMotion.js'

const move = (state,type,extra={}) => windowTransition(state,{type,...extra})
const opened = () => move({...initialWindowState,messages:[{content:'નમસ્તે'}],currentChatId:42,ttsEnabled:false},'OPEN')

test('minimize and restore retain conversation and voice choice',()=>{
  const original=opened(), minimized=move(original,'MINIMIZE'),restored=move(minimized,'MINIMIZE')
  assert.equal(minimized.isMinimized,true)
  assert.equal(restored.isMinimized,false)
  for(const key of ['messages','currentChatId','ttsEnabled','entryId']) assert.equal(restored[key],original[key])
})
test('closing from the bar reveals the robot, then closes without clearing history',()=>{
  const original=opened(), closing=move(move(original,'MINIMIZE'),'BEGIN_CLOSE')
  assert.equal(closing.isOpen,true)
  assert.equal(closing.isMinimized,false)
  assert.equal(closing.isClosing,true)
  assert.equal(GOODBYE_MS,1300)
  assert.equal(move(closing,'BEGIN_CLOSE'),closing)
  assert.equal(move(closing,'MAXIMIZE'),closing)
  assert.equal(move(closing,'MINIMIZE'),closing)
  const closed=move(closing,'CLOSE_FINISHED')
  assert.equal(closed.isOpen,false)
  assert.equal(closed.messages,original.messages)
  assert.equal(closed.currentChatId,42)
  assert.equal(closed.ttsEnabled,false)
  assert.equal(move(closed,'BEGIN_CLOSE'),closed)
})
test('reopening replays the entrance and ignores a stale entrance timer',()=>{
  const first=opened(), next=move(move(move(first,'BEGIN_CLOSE'),'CLOSE_FINISHED'),'OPEN')
  assert.equal(next.entryId,first.entryId+1)
  assert.equal(next.isEntering,true)
  assert.equal(move(next,'ENTRY_FINISHED',{entryId:first.entryId}),next)
  assert.equal(move(next,'ENTRY_FINISHED',{entryId:next.entryId}).isEntering,false)
  assert.equal(move(next,'CLOSE_FINISHED'),next)
})
test('entrance travels from the left and lands fully visible',()=>{
  assert.ok(robotMotion('entering',0,0).translateX < -.8)
  const landed=robotMotion('entering',1.15,1.15)
  assert.ok(Math.abs(landed.translateX)<1e-8)
  assert.equal(landed.opacity,1)
  assert.equal(landed.stride,0)
})
test('goodbye remains visible for the wave before its final fade',()=>{
  assert.equal(robotMotion('goodbye',1,10).opacity,1)
  assert.ok(robotMotion('goodbye',1.2,10).opacity>0)
  assert.ok(robotMotion('goodbye',1.3,10).opacity<.0001)
})
test('speech uses one fixed pose in every language with gentle body motion',()=>{
  for(const t of [0,.1,.7,1,2,7]){
    const pose=robotMotion('speaking',t,t)
    assert.equal(pose.frame,2)
    assert.equal(pose.gesture,1)
    assert.equal(pose.wave,0)
  }
  assert.equal(robotMotion('thinking',0,0).gesture,0)
  assert.equal(robotMotion('idle',0,0).gesture,0)
})
test('reduced motion preserves visibility and removes movement',()=>{
  for(const mode of ['idle','speaking','entering','thinking','goodbye']){
    const pose=robotMotion(mode,.8,10,true)
    for(const key of ['translateX','wave','gesture','thinking','stride','motion']) assert.ok(pose[key]===0)
    assert.equal(pose.opacity,1)
  }
})
test('matte removes border backdrop but retains cyan and enclosed silver highlights',()=>{
  const w=16,h=16,data=new Uint8ClampedArray(w*h*4)
  const put=(x,y,r,g,b)=>data.set([r,g,b,255],(y*w+x)*4)
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)put(x,y,200,200,200)
  for(let y=2;y<=5;y++)for(let x=2;x<=5;x++)put(x,y,30,80,95)
  put(3,3,240,240,240);put(4,4,30,240,235)
  const result=matteRobotAtlas(data,w,h)
  assert.equal(result[3],0)
  assert.equal(result[(3*w+3)*4+3],255)
  assert.equal(result[(4*w+4)*4+3],255)
  assert.equal(data[3],255)
})

