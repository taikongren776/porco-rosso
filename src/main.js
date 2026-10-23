import * as THREE from 'three';
import { createAircraft } from './aircraft.js';
import { createSky, createClouds, createOcean, createWake, SUN_DIRECTION } from './environment.js';
import { flightPose, cameraPose, tracerEnvelope, FlightClock } from './director.js';
import './style.css';

const root=document.querySelector('#experience');
const canvas=document.querySelector('#scene');
const pauseButton=document.querySelector('#pause');
const fullscreenButton=document.querySelector('#fullscreen');
const status=document.querySelector('#status');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const coarse=matchMedia('(pointer: coarse)').matches;
const clock=new FlightClock();clock.paused=reduceMotion.matches;
let renderer,scene,camera,ocean,lead,companion,wake,tracers;
let request=0,last=0,frame=0,performanceSum=0,performanceFrames=0,qualityReduced=false,cycles=0;
const pointer=new THREE.Vector2(), smoothPointer=new THREE.Vector2();let pointerAt=-Infinity;
const target=new THREE.Vector3();

function syncPause(){
  pauseButton.setAttribute('aria-label',clock.paused?'Play animation':'Pause animation');
  pauseButton.title=clock.paused?'Play · Space':'Pause · Space';
  document.querySelector('#pause-icon').hidden=clock.paused;
  document.querySelector('#play-icon').hidden=!clock.paused;
}
function renderPose(){
  const time=clock.time;
  for(const [plane,isCompanion] of [[lead,false],[companion,true]]){
    const pose=flightPose(time,isCompanion);plane.position.set(...pose.position);plane.rotation.set(...pose.rotation);
    // Integral revolutions across each 48-second cycle keep the loop exact.
    plane.userData.propeller.rotation.z=time*Math.PI*2*18;
    plane.userData.blur.visible=!clock.paused;
  }
  const shot=cameraPose(time,innerWidth/innerHeight<.8);
  camera.position.set(...shot.position);camera.position.x+=smoothPointer.x*2;camera.position.y+=smoothPointer.y*1.2;
  target.set(...shot.target);camera.lookAt(target);
  ocean.material.uniforms.uTime.value=time;
  wake.position.set(lead.position.x,.06,lead.position.z+4);
  wake.material.opacity=.18+Math.max(0,22-lead.position.y)*.045;
  tracers.visible=tracerEnvelope(time)>0;
  if(tracers.visible){
    tracers.position.copy(companion.position);tracers.rotation.copy(companion.rotation);
    tracers.material.opacity=tracerEnvelope(time)*.45;
    const p=tracers.geometry.attributes.position;
    for(let i=0;i<6;i++){const z=-6-((time*30+i*9)%65);p.setXYZ(i*2,(i%2?1:-1)*2,0,z);p.setXYZ(i*2+1,(i%2?1:-1)*2,0,z-1.8);}p.needsUpdate=true;
  }
  renderer.render(scene,camera);
}
function animate(now){
  request=0;if(clock.hidden)return;
  const delta=last?Math.max(0,(now-last)/1000):0;last=now;
  const previousTime=clock.time;clock.tick(delta);if(clock.time<previousTime)cycles++;
  if(now-pointerAt>1700)pointer.set(0,0);
  smoothPointer.lerp(pointer,1-Math.exp(-delta*2.2));
  renderPose();frame++;
  if(frame%30===0||clock.paused){canvas.dataset.phase=clock.time.toFixed(2);canvas.dataset.cycles=String(cycles);canvas.dataset.frames=String(frame);canvas.dataset.pixelRatio=renderer.getPixelRatio().toFixed(2);canvas.dataset.fps=delta>0?String(Math.round(1/delta)):'0';}
  if(!clock.paused&&frame>90&&!qualityReduced){
    performanceSum+=delta;performanceFrames++;
    if(performanceFrames>=120){
      if(performanceSum/performanceFrames>1/36){renderer.setPixelRatio(Math.min(devicePixelRatio,1));qualityReduced=true;}
      performanceSum=0;performanceFrames=0;
    }
  }
  if(!clock.paused)request=requestAnimationFrame(animate);
}
function start(){if(!request&&!clock.hidden){last=0;request=requestAnimationFrame(animate);}}
function setPaused(paused){clock.paused=paused;syncPause();smoothPointer.set(0,0);pointer.set(0,0);status.textContent=paused?'Animation paused.':'Animation playing.';start();}
function fallback(message){
  if(request)cancelAnimationFrame(request);request=0;
  root.classList.add('unavailable');root.classList.remove('ready');pauseButton.disabled=true;
  status.textContent=message;renderer?.dispose();
}
function resize(){
  if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.fov=camera.aspect<.8?49:43;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(clock.paused)renderPose();
}

try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,coarse?1.35:1.65));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#dcb09c',.00011);
  camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.5,20000);
  scene.add(new THREE.HemisphereLight('#f8d5bd','#545c78',1.45));
  const sunlight=new THREE.DirectionalLight('#ffdab0',2.4);sunlight.position.copy(SUN_DIRECTION).multiplyScalar(1000);scene.add(sunlight);
  const fill=new THREE.DirectionalLight('#d3c7df',.7);fill.position.set(30,50,80);scene.add(fill);
  createSky(scene);createClouds(scene,coarse);ocean=createOcean(scene,coarse);wake=createWake(scene);
  lead=createAircraft();lead.scale.setScalar(1.25);companion=createAircraft({companion:true});companion.scale.setScalar(.93);scene.add(lead,companion);
  const tracerGeometry=new THREE.BufferGeometry();tracerGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(36),3));
  tracers=new THREE.LineSegments(tracerGeometry,new THREE.LineBasicMaterial({color:'#ffe2a4',transparent:true,opacity:0,depthWrite:false}));tracers.frustumCulled=false;scene.add(tracers);
  resize();renderPose();root.classList.add('ready');syncPause();start();
}catch(error){console.error('Scene initialization failed:',error);fallback('Your browser cannot display WebGL. A still sunset is shown instead.');}

pauseButton.addEventListener('click',()=>setPaused(!clock.paused));
document.addEventListener('keydown',event=>{
  if(event.code==='Space'&&!event.repeat&&!['BUTTON','INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!pauseButton.disabled){event.preventDefault();setPaused(!clock.paused);}
});
if(!document.fullscreenEnabled){fullscreenButton.hidden=true;document.querySelector('.control-divider').hidden=true;}
fullscreenButton.addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}
  catch{status.textContent='Fullscreen is not available in this browser.';}
});
document.addEventListener('fullscreenchange',()=>{const full=!!document.fullscreenElement;fullscreenButton.setAttribute('aria-label',full?'Exit fullscreen':'Enter fullscreen');fullscreenButton.title=full?'Exit fullscreen':'Fullscreen';});
document.addEventListener('visibilitychange',()=>{clock.hidden=document.hidden;canvas.dataset.suspended=String(clock.hidden);if(clock.hidden){if(request)cancelAnimationFrame(request);request=0;last=0;}else if(renderer&&!pauseButton.disabled)start();});
window.addEventListener('resize',resize);
window.addEventListener('pointermove',event=>{if(coarse||reduceMotion.matches||clock.paused)return;pointer.set((event.clientX/innerWidth-.5)*2,-(event.clientY/innerHeight-.5)*2);pointerAt=performance.now();});
document.addEventListener('pointerleave',()=>pointer.set(0,0));
reduceMotion.addEventListener('change',event=>{if(!pauseButton.disabled)setPaused(event.matches);});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback('Graphics were interrupted. Reload the page to resume the flight.');});

