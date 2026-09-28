import { useEffect,useRef,useState } from 'react'
import { loadRobotAtlas,robotMotion } from './robotMotion.js'
import { createRobotRig } from './robotRig.js'
import './robot.css'

export function RobotPortrait(){
  const ref=useRef(null)
  useEffect(()=>{
    let alive=true
    loadRobotAtlas().then(atlas=>{
      if(!alive||!ref.current)return
      const canvas=ref.current,ctx=canvas.getContext('2d');canvas.width=canvas.height=128
      const cell=atlas.width/2
      // Header icon uses the character's head from the neutral pose.
      ctx.drawImage(atlas,cell*.30,cell*.03,cell*.53,cell*.42,0,10,128,102)
    }).catch(()=>{})
    return()=>{alive=false}
  },[])
  return <canvas className="webot-portrait" ref={ref} aria-label="Webot robot" role="img"/>
}

export default function Robot2D({state='idle',entryId=0,label='Online'}){
  const ref=useRef(null),fallbackRef=useRef(null),latest=useRef(state)
  const [fallback,setFallback]=useState(false),[error,setError]=useState(''),[generation,setGeneration]=useState(0)
  latest.current=state
  useEffect(()=>{
    let dead=false,raf=0,rig,visible=true,last=0
    let mode=latest.current,modeAt=performance.now(),from=0,to=0,changed=modeAt
    const canvas=ref.current,motion=window.matchMedia('(prefers-reduced-motion: reduce)')
    const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0].isIntersecting})
    observer?.observe(canvas.parentElement)
    const lost=e=>{e.preventDefault();rig=null;setFallback(true)}
    const restored=()=>setGeneration(x=>x+1)
    canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored)
    loadRobotAtlas().then(atlas=>{
      if(dead)return
      try{rig=createRobotRig(canvas,atlas);setFallback(false)}catch{setFallback(true)}
      const origin=performance.now();modeAt=origin
      function draw(now){
        if(dead)return
        raf=requestAnimationFrame(draw)
        if(document.hidden||!visible||now-last<1000/30)return
        last=now
        if(mode!==latest.current){mode=latest.current;modeAt=now}
        const pose=robotMotion(mode,(now-modeAt)/1000,(now-origin)/1000,motion.matches)
        if(to!==pose.frame){from=to;to=pose.frame;changed=now}
        const values={...pose,from,to,mix:Math.min(1,(now-changed)/120)}
        if(rig)rig.draw(values)
        else if(fallbackRef.current){
          const out=fallbackRef.current,ctx=out.getContext('2d'),cell=atlas.width/2
          out.width=out.height=480;ctx.clearRect(0,0,480,480);ctx.save()
          ctx.globalAlpha=pose.opacity;ctx.translate(240+pose.translateX*480,240)
          ctx.rotate(pose.motion*.013*Math.sin(pose.time*1.5));ctx.translate(-240,-240)
          ctx.drawImage(atlas,(to%2)*cell,Math.floor(to/2)*cell,cell,cell,0,Math.sin(pose.time*2)*pose.motion*2,480,480)
          ctx.restore()
        }
      }
      raf=requestAnimationFrame(draw)
    }).catch(e=>{if(!dead)setError(e.message)})
    return()=>{dead=true;cancelAnimationFrame(raf);rig?.dispose();observer?.disconnect();canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored)}
  },[entryId,generation])
  return <div className="webot-robot" data-motion={state}>
    <canvas ref={ref} className={fallback?'webot-canvas-hidden':''} role="img" aria-label={`Webot. ${label}`}/>
    {fallback&&<canvas ref={fallbackRef} className="webot-robot-fallback" aria-hidden="true"/>}
    {error&&<span className="webot-art-error" role="status">{error}</span>}
    <span className="webot-robot-shadow" aria-hidden="true"/>
  </div>
}
