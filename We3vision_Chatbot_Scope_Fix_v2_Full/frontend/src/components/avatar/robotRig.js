// A flat 2D mesh. The face texture is never articulated; the robot keeps its smile.
export const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
uniform float u_time;
uniform float u_motion;
uniform float u_wave;
uniform float u_gesture;
uniform float u_thinking;
uniform float u_stride;
uniform float u_translateX;
vec2 rotateAt(vec2 point,vec2 pivot,float angle){
  vec2 p=point-pivot;
  return pivot+vec2(cos(angle)*p.x-sin(angle)*p.y,sin(angle)*p.x+cos(angle)*p.y);
}
void main(){
  vec2 p=a_position; v_uv=p;
  float t=u_time;
  float head=1.0-smoothstep(.39,.47,p.y);
  p=mix(p,rotateAt(p,vec2(.52,.43),u_motion*(.012*sin(t*1.25)+.012*u_gesture*sin(t*2.3))),head);
  // Raised forearm and palm wave around the elbow on the viewer's left.
  float arm=(1.0-smoothstep(.25,.34,a_position.x))*(1.0-smoothstep(.41,.50,a_position.y))*smoothstep(.13,.22,a_position.y);
  p=mix(p,rotateAt(p,vec2(.268,.454),u_wave*.32*sin(t*12.0)),arm);
  // Small independent hand gestures while audio actually plays.
  float hands=smoothstep(.13,.30,abs(a_position.x-.53))*smoothstep(.39,.46,a_position.y)*(1.0-smoothstep(.58,.66,a_position.y));
  p.y+=u_gesture*hands*.008*sin(t*3.3+a_position.x*5.0);
  float legs=smoothstep(.70,.83,a_position.y);
  p.y+=legs*u_stride*.014*sin(t*18.0+a_position.x*16.0);
  p=rotateAt(p,vec2(.52,.9),u_motion*(.009*sin(t*.75)+.007*u_gesture*sin(t*2.4)+.009*u_thinking));
  p.y+=u_motion*(.004*sin(t*1.6)+.004*u_gesture*sin(t*3.1));
  // Reserve edge room for hand movement and antennas in every pose.
  p=(p-vec2(.5,.5))*.94+vec2(.5,.5);
  p.x+=u_translateX;
  gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0);
}`

export const FRAGMENT = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_atlas;
uniform float u_from;
uniform float u_to;
uniform float u_mix;
uniform float u_opacity;
vec4 frame(float index){
  vec2 cell=vec2(mod(index,2.0),floor(index/2.0));
  return texture2D(u_atlas,(cell+clamp(v_uv,vec2(.001),vec2(.999)))/2.0);
}
void main(){
  vec4 a=frame(u_from),b=frame(u_to);
  // Premultiply before crossfading to avoid bright transparent fringes.
  a.rgb*=a.a;b.rgb*=b.a;
  gl_FragColor=mix(a,b,u_mix)*u_opacity;
}`

export function createRobotRig(canvas, atlas){
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,depth:false,powerPreference:'low-power'})
  if(!gl)throw new Error('WebGL unavailable')
  function compile(type,source){
    const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh)
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw new Error(log)}
    return sh
  }
  const vs=compile(gl.VERTEX_SHADER,VERTEX),fs=compile(gl.FRAGMENT_SHADER,FRAGMENT),program=gl.createProgram()
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program)
  gl.deleteShader(vs);gl.deleteShader(fs)
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program))
  gl.useProgram(program)
  const vertices=[],indices=[],columns=48,rows=52
  for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++)vertices.push(x/columns,y/rows)
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+columns+1;indices.push(a,b,a+1,a+1,b,b+1)}
  const vb=gl.createBuffer(),ib=gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW)
  const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW)
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex)
  for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR)
  for(const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false)
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas)
  const uniforms={}
  for(const name of ['time','motion','wave','gesture','thinking','stride','translateX','from','to','mix','opacity'])uniforms[name]=gl.getUniformLocation(program,`u_${name}`)
  gl.clearColor(0,0,0,0)
  return {
    draw(values){
      const size=Math.max(96,Math.min(900,Math.round(canvas.clientWidth*Math.min(2,window.devicePixelRatio||1))));
      if(canvas.width!==size||canvas.height!==size){canvas.width=canvas.height=size;gl.viewport(0,0,size,size)}
      gl.clear(gl.COLOR_BUFFER_BIT)
      for(const [k,v]of Object.entries(values))if(uniforms[k]!==undefined)gl.uniform1f(uniforms[k],v)
      gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0)
    },
    dispose(){gl.deleteTexture(tex);gl.deleteBuffer(vb);gl.deleteBuffer(ib);gl.deleteProgram(program)},
  }
}
