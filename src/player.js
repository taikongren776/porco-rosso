const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const damp = (value, target, rate, dt) => value + (target - value) * (1 - Math.exp(-rate * dt));
export const MIN_ALTITUDE = 7;
export const MAX_ALTITUDE = 220;
export const FLIGHT_KEYS = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ShiftLeft','ShiftRight']);
export function keyboardAxes(keys) {
  return {
    turn: Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')),
    climb: Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')),
    boost: keys.has('ShiftLeft') || keys.has('ShiftRight'),
  };
}
export class PlayerFlight {
  constructor() { this.reset(); }
  reset() { this.x=0;this.y=24;this.z=0;this.heading=0;this.pitch=0;this.bank=0;this.turnRate=0;this.speed=32; }
  step(delta, input={}) {
    const dt=clamp(Number.isFinite(delta)?delta:0,0,.05);if(!dt)return;
    const turn=clamp(input.turn||0,-1,1),climb=clamp(input.climb||0,-1,1);
    this.turnRate=damp(this.turnRate,-turn*.62,3.8,dt);this.pitch=damp(this.pitch,climb*.36,3.2,dt);
    this.bank=damp(this.bank,-turn*.56,4.3,dt);this.speed=damp(this.speed,input.boost?53:32,1.7,dt);
    this.heading+=this.turnRate*dt;this.heading=Math.atan2(Math.sin(this.heading),Math.cos(this.heading));
    const horizontal=this.speed*Math.cos(this.pitch)*dt;
    this.x-=Math.sin(this.heading)*horizontal;this.z-=Math.cos(this.heading)*horizontal;
    this.y=clamp(this.y+Math.sin(this.pitch)*this.speed*dt,MIN_ALTITUDE,MAX_ALTITUDE);
    if((this.y===MIN_ALTITUDE&&this.pitch<0)||(this.y===MAX_ALTITUDE&&this.pitch>0))this.pitch=damp(this.pitch,0,12,dt);
  }
  localPoint(x,y,z) {
    const c=Math.cos(this.heading),s=Math.sin(this.heading);
    return [this.x+x*c+z*s,this.y+y,this.z-x*s+z*c];
  }
}
