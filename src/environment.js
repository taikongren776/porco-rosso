import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const SUN_DIRECTION = new THREE.Vector3(-.44, .038, -.89).normalize();
function randomGenerator(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function createSky(scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(14000,32,20), new THREE.ShaderMaterial({
    side:THREE.BackSide, depthWrite:false,
    uniforms:{ sunDirection:{value:SUN_DIRECTION} },
    vertexShader:`varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader:`
      varying vec3 vWorld; uniform vec3 sunDirection;
      void main(){
        vec3 d=normalize(vWorld-cameraPosition); float h=max(d.y,0.);
        vec3 low=vec3(1.,.715,.49), mid=vec3(.78,.49,.52), high=vec3(.37,.34,.51);
        vec3 color=mix(low,mid,smoothstep(0.,.38,h)); color=mix(color,high,smoothstep(.26,.95,h));
        float sun=dot(d,sunDirection);
        color+=vec3(.12,.05,.015)*pow(max(sun,0.),20.);
        color+=vec3(.08,.04,.012)*pow(max(sun,0.),250.);
        color=mix(color,vec3(1.,.94,.74),smoothstep(.99935,.99955,sun)*.97);
        gl_FragColor=vec4(color,1.);
      }`
  })); sky.renderOrder=-10; scene.add(sky); return sky;
}

export function createClouds(scene, mobile) {
  const random = randomGenerator(1709);
  const material = new THREE.ShaderMaterial({
    uniforms:{ sunDirection:{value:SUN_DIRECTION}, haze:{value:new THREE.Color('#e9aa98')} },
    vertexShader:`varying vec3 vWorld; varying vec3 vNormal; void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader:`
      varying vec3 vWorld; varying vec3 vNormal; uniform vec3 sunDirection; uniform vec3 haze;
      void main(){
        vec3 n=normalize(vNormal); float light=dot(n,normalize(vec3(-.5,.8,.45)));
        float top=smoothstep(-.4,.85,n.y);
        vec3 bottom=vec3(.29,.235,.38), middle=vec3(.54,.405,.57), rim=vec3(.94,.66,.68);
        vec3 color=mix(bottom,middle,top);
        color=mix(color,rim,smoothstep(-.05,.85,light)*.76);
        color+=vec3(.09,.047,.035)*smoothstep(.45,.95,n.y)*smoothstep(-.35,.7,light);
        float d=distance(vWorld,cameraPosition); float fog=1.-exp(-d*.000075);
        color=mix(color,haze,fog*.66);
        gl_FragColor=vec4(color,1.);
      }`
  });
  const clouds = new THREE.Group(); clouds.name='Violet cumulus';
  // Tall, overlapping banks with a clear opening for the sun and the lead aircraft.
  const formations = [
    [-2300,380,-1900,400],[-3300,650,-3200,600],[-4900,750,-3900,800],
    [950,280,-2300,380],[1900,530,-3000,630],[3200,890,-4100,850],
    [-600,190,-3000,230],[-5000,450,-1700,500],[3900,330,-1700,450],
    [-3800,220,-5200,350],[800,220,-5600,450],[-6500,1000,-6200,1100],
    [5800,1250,-6500,1200],[-6500,220,-7500,300],[2000,100,-8000,330],
    [-2000,650,900,600],[2400,700,400,600],[-5500,1500,-9000,1200],
  ];
  for (const [x,y,z,size] of formations) {
    const pieces=[]; const count=mobile?16:26;
    for(let i=0;i<count;i++){
      const u=i/count, px=(random()-.5)*size*2.6, pz=(random()-.5)*size*.65;
      const mound=Math.pow(Math.max(0,1-Math.abs(px)/(size*1.5)),1.2);
      const py=(i<count*.45?random()*.13:random()*.5+mound*.6)*size;
      const radius=size*(.24+random()*.2);
      const g=new THREE.SphereGeometry(radius,mobile?12:18,mobile?9:12);
      const pos=g.getAttribute('position');
      for(let j=0;j<pos.count;j++){
        const vx=pos.getX(j),vy=pos.getY(j),vz=pos.getZ(j);
        const wobble=1+.04*Math.sin(vx*.04+vz*.03)*Math.sin(vy*.04);
        pos.setXYZ(j,vx*wobble,vy*wobble,vz*wobble);
      }
      g.scale(1.25+random()*.4, .8+random()*.5, .7+random()*.35);
      g.translate(px,Math.max(-size*.16,py-radius*.3),pz); g.computeVertexNormals();pieces.push(g);
    }
    const merged=mergeGeometries(pieces); pieces.forEach(g=>g.dispose());
    const cloud=new THREE.Mesh(merged,material); cloud.position.set(x,y,z);clouds.add(cloud);
  }
  scene.add(clouds);
  // Wispy high-altitude brush strokes, spread well behind the cumulus banks.
  const wisps = new THREE.Group();
  const wispMaterial=new THREE.MeshBasicMaterial({color:'#e7a8a7',transparent:true,opacity:.17,depthWrite:false});
  for(let i=0;i<14;i++){
    const wisp=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),wispMaterial);
    wisp.position.set((random()-.5)*15000,2400+random()*1700,-8500-random()*2500);
    wisp.scale.set(650+random()*1400,12+random()*30,90); wisp.rotation.z=(random()-.5)*.1;wisps.add(wisp);
  }
  scene.add(wisps);return clouds;
}

export function createOcean(scene, mobile) {
  const material = new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},sunDirection:{value:SUN_DIRECTION}},
    vertexShader:`
      uniform float uTime; varying vec3 vWorld;
      void main(){
        vec3 p=position; float t=uTime*6.2831853/48.;
        p.z+=sin(p.x*.034+t*2.)*.15+cos(p.y*.026+t*3.)*.12;
        vWorld=(modelMatrix*vec4(p,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
      }`,
    fragmentShader:`
      uniform float uTime; uniform vec3 sunDirection; varying vec3 vWorld;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        float t=uTime*6.2831853/48.; vec2 p=vWorld.xz;
        float a=sin(p.x*.19+p.y*.29+t*4.);
        float b=sin(p.x*.41-p.y*.24+t*6.);
        float c=sin(p.x*.09+p.y*.14-t*2.);
        vec3 n=normalize(vec3(a*.055+b*.035,1.,c*.08+b*.035));
        vec3 v=normalize(cameraPosition-vWorld);float distanceToCamera=length(cameraPosition.xz-p);
        float horizon=1.-exp(-distanceToCamera*.0011);
        vec3 color=mix(vec3(.16,.24,.31),vec3(.62,.43,.46),horizon);
        float wave=noise(vec2(p.x*.095,p.y*.8)+vec2(sin(t),cos(t))*.55);
        float wave2=noise(vec2(p.x*.032,p.y*.3)+vec2(cos(t),sin(t)));
        color+=vec3(.11,.085,.095)*(wave-.4);
        vec3 h=normalize(v+sunDirection);
        float spec=pow(max(dot(n,h),0.),100.);
        float broad=pow(max(dot(normalize(vec3(v.x,0.,v.z)),normalize(vec3(-sunDirection.x,0.,-sunDirection.z))),0.),30.);
        float broken=smoothstep(.43,.74,wave*.75+wave2*.4);
        color=mix(color,vec3(1.,.66,.34),broad*(.12+broken*.42)*smoothstep(.0,.025,v.y));
        color+=vec3(1.,.67,.32)*spec*(.3+broken)*.7;
        float glints=smoothstep(.79,.84,wave)*smoothstep(.45,.8,wave2);
        color+=vec3(.35,.25,.16)*glints*(.1+broad);
        color=mix(color,vec3(.91,.62,.49),smoothstep(1500.,12000.,distanceToCamera)*.85);
        gl_FragColor=vec4(color,1.);
      }`
  });
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(26000,26000,mobile?80:140,mobile?80:140),material);
  ocean.rotation.x=-Math.PI/2;ocean.position.y=-.2;scene.add(ocean);return ocean;
}

export function createWake(scene) {
  const points=[];
  for(let i=0;i<100;i++) points.push((i%2?1:-1)*(1+i*.04),0,i*.6);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const wake=new THREE.Points(g,new THREE.PointsMaterial({color:'#ffe8b5',size:.1,transparent:true,opacity:.45,depthWrite:false}));
  scene.add(wake);return wake;
}
