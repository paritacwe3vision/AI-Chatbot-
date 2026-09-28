export const ROBOT_ATLAS_URL = '/robot/webot-atlas.png'
export const ROBOT_FRAMES = Object.freeze({ idle: 0, entering: 1, goodbye: 1,
  speaking: 2, listening: 0, thinking: 3 })

const clamp = x => Math.max(0, Math.min(1, x))
const easeOut = x => 1 - Math.pow(1-clamp(x),3)

// Deterministic pose: no visemes, phonemes, lip shapes or mouth deformation.
export function robotMotion(mode, elapsed, time, reducedMotion = false) {
  const entry = mode === 'entering'
  const goodbye = mode === 'goodbye'
  const speaking = mode === 'speaking'
  const motion = reducedMotion ? 0 : 1
  return {
    frame: ROBOT_FRAMES[mode] ?? 0,
    translateX: entry ? -.92 * (1-easeOut(elapsed/.82)) * motion : 0,
    opacity: entry ? clamp(elapsed/.2) : goodbye ? 1-clamp((elapsed-1.10)/.2) : 1,
    wave: (entry ? clamp((elapsed-.40)/.22) : goodbye ? 1 : 0) * motion,
    gesture: speaking ? motion : 0,
    thinking: mode === 'thinking' ? motion : 0,
    stride: entry ? (1-easeOut(elapsed/.9)) * motion : 0,
    motion, time,
  }
}

// The art export has a neutral preview backdrop. At load time, make only
// border-connected neutral backdrop pixels transparent. Silver/cyan material
// and enclosed bright highlights are retained. No image is downloaded remotely.
export function matteRobotAtlas(input, width, height) {
  const data = new Uint8ClampedArray(input)
  const total = width * height
  const candidate = new Uint8Array(total), removed = new Uint8Array(total)
  const queue = new Uint32Array(total)
  for (let p=0;p<total;p++) {
    const i=p*4,r=data[i],g=data[i+1],b=data[i+2]
    candidate[p] = Math.min(r,g,b) >= 160 && Math.max(r,g,b)-Math.min(r,g,b) <= 9 ? 1 : 0
  }
  // Flood each cell independently. Never start from a character's interior.
  for(let row=0;row<2;row++) for(let col=0;col<2;col++) {
    const x0=Math.round(col*width/2), x1=Math.round((col+1)*width/2)-1
    const y0=Math.round(row*height/2), y1=Math.round((row+1)*height/2)-1
    let head=0,tail=0
    const add=p=>{if(candidate[p]&&!removed[p]){removed[p]=1;queue[tail++]=p}}
    for(let x=x0;x<=x1;x++){add(y0*width+x);add(y1*width+x)}
    for(let y=y0;y<=y1;y++){add(y*width+x0);add(y*width+x1)}
    while(head<tail){
      const p=queue[head++],x=p%width,y=Math.floor(p/width)
      if(x>x0)add(p-1);if(x<x1)add(p+1);if(y>y0)add(p-width);if(y<y1)add(p+width)
    }
  }
  for(let p=0;p<total;p++) if(removed[p]) data[p*4+3]=0
  return data
}

let atlasPromise
export function loadRobotAtlas() {
  if (!atlasPromise) atlasPromise = new Promise((resolve,reject)=>{
    const img=new Image()
    img.onload=()=>{
      try {
        const canvas=document.createElement('canvas')
        canvas.width=img.naturalWidth;canvas.height=img.naturalHeight
        const ctx=canvas.getContext('2d',{willReadFrequently:true})
        ctx.drawImage(img,0,0)
        const pixels=ctx.getImageData(0,0,canvas.width,canvas.height)
        // Keep authentic alpha if a future artwork export supplies it.
        const hasAlpha=pixels.data.some((v,i)=>i%4===3&&v===0)
        if(!hasAlpha){pixels.data.set(matteRobotAtlas(pixels.data,canvas.width,canvas.height));ctx.putImageData(pixels,0,0)}
        resolve(canvas)
      }catch(error){atlasPromise=null;reject(error)}
    }
    img.onerror=()=>{atlasPromise=null;reject(new Error('Webot artwork could not load.'))}
    img.src=ROBOT_ATLAS_URL
  })
  return atlasPromise
}
