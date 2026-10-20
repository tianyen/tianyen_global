/* TIANYEN real-time art study. Original five-octave fractal domain warp.
   The generated art is a texture, not a video. All distortion runs on the GPU.
   This is an artistic flow field, not a Navier-Stokes physical simulation. */
const VERTEX = `in vec2 position;out vec2 vUv;void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const FRAGMENT = `precision highp float;
in vec2 vUv;out vec4 outColor;
uniform sampler2D art;uniform vec2 resolution;uniform vec2 imageSize;uniform vec2 pointer;
uniform float time;uniform float intensity;uniform float palette;uniform float scroll;uniform float ripple;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;mat2 rot=mat2(.8,-.6,.6,.8);for(int i=0;i<5;i++){n+=a*noise(p);p=rot*p*2.03+vec2(2.7,1.3);a*=.5;}return n;}
void main(){
 vec2 uv=vUv;float ratio=resolution.x/resolution.y,ir=imageSize.x/imageSize.y;
 vec2 fit=ratio>ir?vec2(1.,ir/ratio):vec2(ratio/ir,1.);
 vec2 tex=(uv-.5)*fit+.5;
 vec2 p=uv*vec2(ratio,1.);vec2 m=pointer*vec2(ratio,1.);float d=length(p-m);
 float t=time*.095;
 vec2 q=vec2(fbm(p*2.4+vec2(t,-t)),fbm(p*2.4+vec2(4.8-t,t*.6)));
 vec2 flow=vec2(fbm(p*3.+2.4*q+vec2(.2,t)),fbm(p*3.+2.4*q+vec2(8.2,-t)))-.5;
 float strength=(.008+intensity*.034);
 float nearMouse=exp(-d*d*5.5);
 vec2 swirl=vec2(-(p.y-m.y),p.x-m.x)*nearMouse*.07*intensity;
 float wave=sin(d*29.-ripple*7.)*exp(-d*2.5)*exp(-ripple*.65)*step(.001,ripple);
 tex+=flow*strength+swirl+normalize(p-m+vec2(.0001))*wave*.016;
 tex.y+=sin(scroll*1.1)*.014;tex=clamp(tex,vec2(.004),vec2(.996));
 vec3 color=texture(art,tex).rgb;
 float light=dot(color,vec3(.2126,.7152,.0722));
 vec3 copper=mix(vec3(light*.82,light*.67,light*.48),vec3(color.b*1.12,color.g*.75,color.r*.49),.8);
 vec3 pearl=mix(vec3(light*1.02,light*.96,light*.86),color,.12);
 color=mix(color,copper,clamp(palette,0.,1.));color=mix(color,pearl,clamp(palette-1.,0.,1.));
 float gleam=(fbm(p*5.+q+vec2(t*.4))-0.5)*.065*intensity;
 color+=gleam*light;float edge=smoothstep(.0,.12,uv.x)*smoothstep(.0,.12,uv.y)*(1.-smoothstep(.92,1.,uv.y));
 color=mix(vec3(.063,.075,.075),color,edge);
 outColor=vec4(color,1.);
}`;
export class FluidArt {
 constructor(host,{paused=false,onFallback=()=>{}}={}){
  this.host=host;this.canvas=host.querySelector('canvas');this.paused=paused;this.onFallback=onFallback;this.visible=false;this.time=12;this.last=0;this.pointer=[.7,.45];this.target=[.7,.45];this.intensity=.5;this.palette=0;this.paletteTarget=0;this.ripple=20;this.ready=false;this.raf=0;
  if(new URLSearchParams(location.search).get('art')==='still'){this.fallback();return;}
  const opts={alpha:false,antialias:false,depth:false,powerPreference:'low-power'};
  this.gl=this.canvas.getContext('webgl2',opts);this.is2=!!this.gl;
  if(!this.gl)this.gl=this.canvas.getContext('webgl',opts);
  if(!this.gl){this.fallback();return;}
  try{this.setup()}catch(err){console.warn('Artwork fallback:',err.message);this.fallback();return;}
  this.resizeObserver=new ResizeObserver(()=>{this.resize();this.render()});this.resizeObserver.observe(host);
  this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.wake();else this.stop()},{rootMargin:'80px'});this.observer.observe(host);
  const surface=host.parentElement;
  surface.addEventListener('pointermove',e=>{if(this.paused)return;const r=host.getBoundingClientRect();this.target=[(e.clientX-r.left)/r.width,1-(e.clientY-r.top)/r.height];this.wake()},{passive:true});
  surface.addEventListener('pointerdown',e=>{if(this.paused||e.target.closest('a,button,input,fieldset'))return;const r=host.getBoundingClientRect();this.target=[(e.clientX-r.left)/r.width,1-(e.clientY-r.top)/r.height];this.ripple=.01;this.wake()},{passive:true});
  document.addEventListener('visibilitychange',()=>document.hidden?this.stop():this.wake());
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.fallback()});
  this.canvas.addEventListener('webglcontextrestored',()=>{try{this.setup();this.wake()}catch{this.fallback()}});
 }
 setup(){
  const gl=this.gl;
  const convert=(s,frag)=>this.is2?'#version 300 es\n'+s:s.replace(/in vec2 position;/,'attribute vec2 position;').replace(/out vec2 vUv;/,'varying vec2 vUv;').replace(/in vec2 vUv;/,'varying vec2 vUv;').replace(/out vec4 outColor;/,'').replace(/outColor/g,'gl_FragColor').replace(/texture\(/g,'texture2D(');
  const compile=(type,s)=>{const sh=gl.createShader(type);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh};
  const v=compile(gl.VERTEX_SHADER,convert(VERTEX,false)),f=compile(gl.FRAGMENT_SHADER,convert(FRAGMENT,true));
  this.program=gl.createProgram();gl.attachShader(this.program,v);gl.attachShader(this.program,f);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.deleteShader(v);gl.deleteShader(f);gl.useProgram(this.program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  this.u=Object.fromEntries(['resolution','imageSize','pointer','time','intensity','palette','scroll','ripple','art'].map(k=>[k,gl.getUniformLocation(this.program,k)]));
  this.texture=gl.createTexture();const img=new Image();img.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.imageSize=[img.naturalWidth,img.naturalHeight];this.ready=true;this.host.dataset.ready='true';this.host.dataset.renderer=this.is2?'webgl2':'webgl';this.resize();this.render();this.wake()};img.onerror=()=>this.fallback();img.src=this.host.querySelector('img').src;
 }
 resize(){const r=this.host.getBoundingClientRect();const cap=matchMedia('(max-width:760px)').matches?.85:1.1;const scale=Math.min(devicePixelRatio,cap,Math.sqrt(1250000/(r.width*r.height)));this.canvas.width=Math.max(1,Math.round(r.width*scale));this.canvas.height=Math.max(1,Math.round(r.height*scale));this.gl.viewport(0,0,this.canvas.width,this.canvas.height)}
 render(){if(!this.ready)return;const gl=this.gl;gl.useProgram(this.program);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(this.u.art,0);gl.uniform2f(this.u.resolution,this.canvas.width,this.canvas.height);gl.uniform2f(this.u.imageSize,...this.imageSize);gl.uniform2f(this.u.pointer,...this.pointer);gl.uniform1f(this.u.time,this.time);gl.uniform1f(this.u.intensity,this.intensity);gl.uniform1f(this.u.palette,this.palette);gl.uniform1f(this.u.ripple,this.ripple);gl.uniform1f(this.u.scroll,window.scrollY/window.innerHeight);gl.drawArrays(gl.TRIANGLES,0,6);}
 frame=(stamp)=>{this.raf=0;if(this.paused||!this.visible||document.hidden||!this.ready)return;if(stamp-this.last>=32){const dt=Math.min((stamp-this.last)/1000,.05);this.last=stamp;this.time+=dt;this.ripple+=dt;this.pointer=this.pointer.map((v,i)=>v+(this.target[i]-v)*.065);this.palette+=(this.paletteTarget-this.palette)*.065;this.render()}this.raf=requestAnimationFrame(this.frame)};
 wake(){if(!this.paused&&this.visible&&!document.hidden&&this.ready&&!this.raf){this.last=performance.now();this.raf=requestAnimationFrame(this.frame)}}
 stop(){cancelAnimationFrame(this.raf);this.raf=0}
 setPaused(v){this.paused=v;if(v)this.stop();else this.wake()}
 setPalette(v){this.paletteTarget=v;if(this.paused){this.palette=v;this.render()}if(!this.ready)this.host.querySelector('img').style.filter=v===1?'sepia(.7) saturate(.7)':v===2?'grayscale(.85) sepia(.2)':'none'}
 setIntensity(v){this.intensity=v;this.render()}
 reset(){this.target=[.7,.45];this.pointer=[.7,.45];this.time=12;this.ripple=20;this.setIntensity(.5);this.setPalette(0);this.render()}
 fallback(){this.stop();this.ready=false;this.host.dataset.ready='false';this.host.dataset.renderer='static';this.onFallback()}
}
