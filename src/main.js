import * as THREE from 'three';
import { createAircraft } from './aircraft.js';
import { createSky, createClouds, createOcean, createWake, SUN_DIRECTION } from './environment.js';
import { tracerEnvelope, FlightClock } from './director.js';
import { PlayerFlight, FLIGHT_KEYS, keyboardAxes } from './player.js';
import './style.css';

const root=document.querySelector('#experience'),canvas=document.querySelector('#scene');
const pauseButton=document.querySelector('#pause'),fullscreenButton=document.querySelector('#fullscreen');
const resetButton=document.querySelector('#reset'),stick=document.querySelector('#joystick'),boostButton=document.querySelector('#boost');
const status=document.querySelector('#status');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)'),coarse=matchMedia('(pointer: coarse)').matches;
const clock=new FlightClock();clock.paused=reduceMotion.matches;clock.hidden=document.hidden;
const player=new PlayerFlight(),keys=new Set();
const touch={turn:0,climb:0,boost:false};let stickPointer=null,boostPointer=null;
let renderer,scene,camera,sky,clouds,ocean,lead,companion,wake,tracers;
let request=0,last=0,frame=0,performanceSum=0,performanceFrames=0,qualityReduced=false;
const desiredCamera=new THREE.Vector3(),desiredTarget=new THREE.Vector3(),target=new THREE.Vector3();

function clearInputs(){
  keys.clear();touch.turn=0;touch.climb=0;touch.boost=false;
  if(stickPointer!==null&&stick.hasPointerCapture(stickPointer))stick.releasePointerCapture(stickPointer);
  if(boostPointer!==null&&boostButton.hasPointerCapture(boostPointer))boostButton.releasePointerCapture(boostPointer);
  stickPointer=null;boostPointer=null;
  stick.style.setProperty('--stick-x','0px');stick.style.setProperty('--stick-y','0px');
  stick.classList.remove('active');boostButton.classList.remove('active');
}
function syncPause(){
  pauseButton.setAttribute('aria-label',clock.paused?'Resume flight':'Pause flight');
  pauseButton.title=clock.paused?'Resume · Space':'Pause · Space';
  document.querySelector('#pause-icon').hidden=clock.paused;document.querySelector('#play-icon').hidden=!clock.paused;
  root.classList.toggle('paused',clock.paused);canvas.dataset.paused=String(clock.paused);
}
function syncCamera(dt=0,snap=false){
  const portrait=innerWidth/innerHeight<.8,distance=portrait?1.65:1;
  desiredCamera.set(...player.localPoint((portrait?5:11)*distance,5*distance,35*distance));
  desiredTarget.set(...player.localPoint(portrait?-4:-2,2,-11));
  const alpha=snap?1:1-Math.exp(-dt*5);
  camera.position.lerp(desiredCamera,alpha);target.lerp(desiredTarget,alpha);
  camera.position.y=Math.max(camera.position.y,6);camera.lookAt(target);
}
function updateDiagnostics(){
  Object.assign(canvas.dataset,{phase:clock.time.toFixed(2),frames:String(frame),x:player.x.toFixed(2),altitude:player.y.toFixed(2),z:player.z.toFixed(2),heading:player.heading.toFixed(3),bank:player.bank.toFixed(3),speed:player.speed.toFixed(1),paused:String(clock.paused),pixelRatio:renderer.getPixelRatio().toFixed(2)});
}
function renderPose(){
  const time=clock.time;
  lead.position.set(player.x,player.y,player.z);lead.rotation.set(player.pitch,player.heading,player.bank,'YXZ');
  companion.position.set(...player.localPoint(-24,7+Math.sin(time*Math.PI/24)*2,-30));
  companion.rotation.set(player.pitch*.8,player.heading,player.bank*.8,'YXZ');
  for(const plane of [lead,companion]){plane.userData.propeller.rotation.z=time*Math.PI*36;plane.userData.blur.visible=!clock.paused;}
  ocean.position.x=player.x;ocean.position.z=player.z;ocean.material.uniforms.uTime.value=time;
  sky.position.copy(lead.position);
  // Recycle distant banks outside the fog range for open-ended flight.
  for(const cloud of clouds.children){
    cloud.position.x=player.x+THREE.MathUtils.euclideanModulo(cloud.position.x-player.x+9000,18000)-9000;
    cloud.position.z=player.z+THREE.MathUtils.euclideanModulo(cloud.position.z-player.z+9000,18000)-9000;
  }
  wake.position.set(player.x,.06,player.z);wake.rotation.y=player.heading;wake.material.opacity=Math.max(0,1-(player.y-7)/24)*.38;
  tracers.visible=tracerEnvelope(time)>0;
  if(tracers.visible){
    tracers.position.copy(companion.position);tracers.rotation.copy(companion.rotation);tracers.material.opacity=tracerEnvelope(time)*.4;
    const p=tracers.geometry.attributes.position;
    for(let i=0;i<6;i++){const z=-6-((time*30+i*9)%65);p.setXYZ(i*2,(i%2?1:-1)*2,0,z);p.setXYZ(i*2+1,(i%2?1:-1)*2,0,z-1.8);}p.needsUpdate=true;
  }
  renderer.render(scene,camera);
}
function animate(now){
  request=0;if(clock.hidden)return;
  const delta=last?Math.min(Math.max(0,(now-last)/1000),.05):0;last=now;
  if(!clock.paused){
    const keyboard=keyboardAxes(keys);
    player.step(delta,{turn:THREE.MathUtils.clamp(keyboard.turn+touch.turn,-1,1),climb:THREE.MathUtils.clamp(keyboard.climb+touch.climb,-1,1),boost:keyboard.boost||touch.boost});
    clock.tick(delta);syncCamera(delta);
  }
  renderPose();frame++;
  if(frame%15===0||clock.paused)updateDiagnostics();
  if(!clock.paused&&frame>90&&!qualityReduced){
    performanceSum+=delta;performanceFrames++;
    if(performanceFrames>=120){
      if(performanceSum/performanceFrames>1/36){renderer.setPixelRatio(Math.min(devicePixelRatio,1));qualityReduced=true;}
      performanceSum=0;performanceFrames=0;
    }
  }
  if(!clock.paused)request=requestAnimationFrame(animate);
}
function start(){if(!request&&!clock.hidden&&!pauseButton.disabled){last=0;request=requestAnimationFrame(animate);}}
function setPaused(paused){clock.paused=paused;clearInputs();syncPause();status.textContent=paused?'Flight paused.':'Flight resumed.';start();}
function resetFlight(){
  if(pauseButton.disabled)return;
  clearInputs();player.reset();clock.time=0;syncCamera(0,true);renderPose();updateDiagnostics();status.textContent='Flight reset.';
}
function fallback(message){
  if(request)cancelAnimationFrame(request);request=0;clearInputs();
  root.classList.add('unavailable');root.classList.remove('ready');pauseButton.disabled=true;resetButton.disabled=true;boostButton.disabled=true;
  status.textContent=message;renderer?.dispose();
}
function resize(){
  if(!renderer||pauseButton.disabled)return;
  camera.aspect=innerWidth/innerHeight;camera.fov=camera.aspect<.8?49:46;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);syncCamera(0,true);renderPose();
}
try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,coarse?1.35:1.65));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#dcb09c',.00011);camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.5,20000);
  scene.add(new THREE.HemisphereLight('#f8d5bd','#545c78',1.45));
  const sunlight=new THREE.DirectionalLight('#ffdab0',2.4);sunlight.position.copy(SUN_DIRECTION).multiplyScalar(1000);scene.add(sunlight);
  const fill=new THREE.DirectionalLight('#d3c7df',.7);fill.position.set(30,50,80);scene.add(fill);
  sky=createSky(scene);clouds=createClouds(scene,coarse);ocean=createOcean(scene,coarse);wake=createWake(scene);
  lead=createAircraft();lead.scale.setScalar(1.25);companion=createAircraft({companion:true});companion.scale.setScalar(.93);scene.add(lead,companion);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(36),3));
  tracers=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#ffe2a4',transparent:true,opacity:0,depthWrite:false}));tracers.frustumCulled=false;scene.add(tracers);
  resize();updateDiagnostics();root.classList.add('ready');syncPause();start();
}catch(error){console.error('Scene initialization failed:',error);fallback('Your browser cannot display WebGL. A still sunset is shown instead.');}

pauseButton.addEventListener('click',()=>setPaused(!clock.paused));resetButton.addEventListener('click',resetFlight);
function editableTarget(element){return element instanceof HTMLElement&&(element.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(element.tagName));}
document.addEventListener('keydown',event=>{
  if(editableTarget(event.target)||event.ctrlKey||event.metaKey||event.altKey||pauseButton.disabled)return;
  if(FLIGHT_KEYS.has(event.code)){event.preventDefault();if(!clock.paused&&!clock.hidden)keys.add(event.code);}
  if(event.code==='Space'&&!event.repeat&&event.target.tagName!=='BUTTON'){event.preventDefault();setPaused(!clock.paused);}
  if(event.code==='KeyR'&&!event.repeat){event.preventDefault();resetFlight();}
});
document.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',clearInputs);
function moveStick(event){
  const box=stick.getBoundingClientRect(),radius=box.width*.32;
  let x=(event.clientX-box.left-box.width/2)/radius,y=(event.clientY-box.top-box.height/2)/radius;
  const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
  touch.turn=Math.abs(x)<.08?0:x;touch.climb=Math.abs(y)<.08?0:-y;
  stick.style.setProperty('--stick-x',`${x*radius}px`);stick.style.setProperty('--stick-y',`${y*radius}px`);
}
stick.addEventListener('pointerdown',event=>{if(clock.paused||pauseButton.disabled||stickPointer!==null)return;event.preventDefault();stickPointer=event.pointerId;stick.setPointerCapture(event.pointerId);stick.classList.add('active');moveStick(event);});
stick.addEventListener('pointermove',event=>{if(event.pointerId===stickPointer)moveStick(event);});
function releaseStick(event){if(event.pointerId!==stickPointer)return;stickPointer=null;touch.turn=0;touch.climb=0;stick.style.setProperty('--stick-x','0px');stick.style.setProperty('--stick-y','0px');stick.classList.remove('active');}
for(const name of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,releaseStick);
boostButton.addEventListener('pointerdown',event=>{if(clock.paused||boostButton.disabled||boostPointer!==null)return;event.preventDefault();boostPointer=event.pointerId;boostButton.setPointerCapture(event.pointerId);touch.boost=true;boostButton.classList.add('active');});
for(const name of ['pointerup','pointercancel','lostpointercapture'])boostButton.addEventListener(name,event=>{if(event.pointerId!==boostPointer)return;boostPointer=null;touch.boost=false;boostButton.classList.remove('active');});
if(!document.fullscreenEnabled)fullscreenButton.hidden=true;
fullscreenButton.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}catch{status.textContent='Fullscreen is not available in this browser.';}});
document.addEventListener('fullscreenchange',()=>{const full=!!document.fullscreenElement;fullscreenButton.setAttribute('aria-label',full?'Exit fullscreen':'Enter fullscreen');fullscreenButton.title=full?'Exit fullscreen':'Fullscreen';});
document.addEventListener('visibilitychange',()=>{clock.hidden=document.hidden;canvas.dataset.suspended=String(clock.hidden);clearInputs();if(clock.hidden){if(request)cancelAnimationFrame(request);request=0;last=0;}else start();});
window.addEventListener('resize',resize);reduceMotion.addEventListener('change',event=>{if(!pauseButton.disabled)setPaused(event.matches);});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback('Graphics were interrupted. Reload the page to resume the flight.');});
