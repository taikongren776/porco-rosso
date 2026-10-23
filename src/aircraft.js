import * as THREE from 'three';

const cream = new THREE.MeshStandardMaterial({ color: '#eee5c8', roughness: .68, metalness: .08 });
const green = new THREE.MeshStandardMaterial({ color: '#416454', roughness: .7, metalness: .04 });
const red = new THREE.MeshStandardMaterial({ color: '#b44838', roughness: .6, metalness: .08 });
const metal = new THREE.MeshStandardMaterial({ color: '#465356', roughness: .65, metalness: .35 });
const dark = new THREE.MeshStandardMaterial({ color: '#342d33', roughness: 1 });
const leather = new THREE.MeshStandardMaterial({ color: '#785043', roughness: 1 });
const gold = new THREE.MeshStandardMaterial({ color: '#b39a6c', roughness: .5, metalness: .3 });

function mesh(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position); m.scale.set(...scale); parent.add(m); return m;
}
function rod(parent, a, b, radius = .045, material = metal) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const m = mesh(parent, new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 7), material);
  m.position.copy(start).add(end).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
  return m;
}
// An elliptical airfoil, swept and tapered at the tip, rather than a flat box.
function wingGeometry(span, chord, thickness) {
  const vertices = [], indices = []; const rings = 32, steps = 18;
  for (let i = 0; i <= rings; i++) {
    const s = i / rings * 2 - 1, taper = Math.pow(Math.max(.001, 1 - Math.pow(Math.abs(s), 6)), .36);
    for (let j = 0; j <= steps; j++) {
      const a = j / steps * Math.PI * 2;
      vertices.push(s * span / 2, Math.sin(a) * thickness * taper / 2 + Math.abs(s) * .08,
        Math.cos(a) * chord * taper / 2 + Math.abs(s) * .28);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < steps; j++) {
    const a = i * (steps + 1) + j, b = a + steps + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}
function hullGeometry() {
  const profile = [[-3.7,.05],[-3.35,.5],[-2.65,.74],[-1.6,.83],[-.35,.73],[1.1,.54],[2.6,.3],[4.1,.12],[4.35,.025]];
  const v = [], idx = [], n = 24;
  for (const [z, r] of profile) for (let j = 0; j <= n; j++) {
    const a = j / n * Math.PI * 2;
    v.push(Math.cos(a) * r * .82, Math.sin(a) * r * .85 + .13, z);
  }
  for (let i = 0; i < profile.length - 1; i++) for (let j = 0; j < n; j++) {
    const a = i * (n + 1) + j, b = a + n + 1; idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function insignia(parent, x, y, z) {
  for (const [radius, material, lift] of [[.58, cream, 0], [.39, green, .003], [.19, red, .006]]) {
    const roundel = mesh(parent, new THREE.CircleGeometry(radius, 40), material, [x, y + lift, z]); roundel.rotation.x = -Math.PI / 2;
  }
}
export function createAircraft({ companion = false } = {}) {
  const plane = new THREE.Group(); plane.name = companion ? 'Wingmate' : 'Adriatic seaplane';
  const bodyMaterial = companion ? red : cream;
  mesh(plane, hullGeometry(), bodyMaterial);
  const upper = mesh(plane, wingGeometry(13.8, 2.2, .22), companion ? cream : green, [0, 1.65, -.45]);
  mesh(plane, wingGeometry(10.8, 1.8, .18), companion ? bodyMaterial : green, [0, -.32, -.35]);
  mesh(plane, wingGeometry(4.6, 1.55, .12), cream, [0, .45, 3.2]);
  // Painted outer wing panels and hand-built aileron seams.
  for (const side of [-1, 1]) {
    const tip = mesh(plane, wingGeometry(2.05, 1.62, .23), red, [side * 5.65, 1.69, -.18]);
    tip.rotation.z = side * .014;
    insignia(plane, side * 3.9, 1.8, -.3);
    rod(plane, [side * 1.0, .3, -.95], [side * 1.6, 1.6, -1.05]);
    rod(plane, [side * 1.1, .3, .55], [side * 1.6, 1.6, .35]);
    rod(plane, [side * 4.5, -.22, -.95], [side * 4.6, 1.65, -.95]);
    rod(plane, [side * 4.5, -.22, .25], [side * 4.6, 1.65, .35]);
    rod(plane, [side * 1.2, -.25, -.95], [side * 4.6, 1.65, -.95], .013, gold);
    rod(plane, [side * 1.2, 1.65, .35], [side * 4.5, -.25, .25], .013, gold);
    rod(plane, [side * 3, 1.77, .42], [side * 5.6, 1.81, .5], .012, metal);
    // Twin floats and their diagonal attachment struts.
    mesh(plane, new THREE.SphereGeometry(1, 24, 14), cream, [side * 1.65, -1.7, -.2], [.33, .35, 2.7]);
    mesh(plane, new THREE.SphereGeometry(1, 24, 12), green, [side * 1.65, -1.86, -.15], [.32, .2, 2.55]);
    rod(plane, [side * .4, -.4, -1.5], [side * 1.65, -1.45, -1.5], .055);
    rod(plane, [side * .4, -.35, 1.1], [side * 1.65, -1.45, 1.1], .055);
    rod(plane, [side * 1.65, -1.4, -1.5], [side * 1.65, -1.4, 1.2], .035);
  }
  // Rounded upright tail with the Italian tricolour.
  const fin = new THREE.Group(); fin.position.set(0,.75,3.15); plane.add(fin);
  const finShape = new THREE.Shape(); finShape.moveTo(-.8,0); finShape.quadraticCurveTo(-.3,2.05,.45,1.6); finShape.quadraticCurveTo(.95,1.1,1.05,0); finShape.closePath();
  const finMesh = mesh(fin, new THREE.ExtrudeGeometry(finShape,{depth:.12,bevelEnabled:true,bevelSize:.045,bevelThickness:.045,bevelSegments:2,steps:1}), cream);
  finMesh.rotation.y = Math.PI/2;
  for (const side of [-1,1]) {
    mesh(plane, new THREE.BoxGeometry(.012, .8, .26), green, [side*.12,1.35,2.85]);
    mesh(plane, new THREE.BoxGeometry(.012, .85, .26), red, [side*.12,1.35,3.4]);
  }
  // Open cockpit, leather rim, pilot and low wraparound windscreen.
  mesh(plane, new THREE.SphereGeometry(1,24,12), dark, [0,.65,1.1],[.42,.09,.65]);
  const rim = mesh(plane, new THREE.TorusGeometry(.43,.045,8,32), leather, [0,.67,1.1],[1,1.5,1]); rim.rotation.x = Math.PI/2;
  mesh(plane, new THREE.SphereGeometry(.2,16,12), leather, [0,.96,1.28],[1,1.15,1]);
  mesh(plane, new THREE.SphereGeometry(.21,16,12), cream, [0,.84,1.26],[1.3,.5,1]);
  const glass = new THREE.MeshStandardMaterial({color:'#b6d5cf',transparent:true,opacity:.57,roughness:.18,metalness:.15,side:THREE.DoubleSide});
  const windshield = mesh(plane, new THREE.SphereGeometry(.43,24,12,0,Math.PI,0,Math.PI/2),glass,[0,.7,.7],[1,1,1]); windshield.rotation.y = Math.PI;
  // Raised engine pod, exhausts, nose ring and four-blade propeller.
  rod(plane, [-.3,.5,-1.8],[-.3,2.25,-1.2],.06);
  rod(plane, [.3,.5,-1.8],[.3,2.25,-1.2],.06);
  mesh(plane, new THREE.SphereGeometry(1,32,16), red,[0,2.3,-1.2],[.46,.47,1.25]);
  const collar = mesh(plane, new THREE.CylinderGeometry(.39,.42,.25,32), metal,[0,2.3,-2.2]); collar.rotation.x = Math.PI/2;
  for (let i=0;i<4;i++) for (const side of [-1,1]) rod(plane,[side*.38,2.2,-1.7+i*.3],[side*.58,2.13,-1.6+i*.3],.055,metal);
  const propeller = new THREE.Group(); propeller.position.set(0,2.3,-2.44); plane.add(propeller);
  for (let i=0;i<4;i++) {
    const blade = mesh(propeller,new THREE.SphereGeometry(1,12,8),dark,[0,0,0],[.12,1.28,.045]);
    blade.rotation.z=i*Math.PI/2;
  }
  mesh(propeller,new THREE.SphereGeometry(.24,20,12),cream,[0,0,-.1],[1,1,1.5]);
  const blur = mesh(plane,new THREE.CircleGeometry(1.28,48),new THREE.MeshBasicMaterial({color:'#ecd7ab',transparent:true,opacity:.065,side:THREE.DoubleSide,depthWrite:false}),[0,2.3,-2.44]);
  plane.userData.propeller=propeller; plane.userData.blur=blur; plane.userData.wing=upper;
  return plane;
}
