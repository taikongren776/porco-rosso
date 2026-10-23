export const LOOP_SECONDS = 48;
const TAU = Math.PI * 2;
export function flightPose(seconds, companion = false) {
  const t = seconds / LOOP_SECONDS * TAU;
  const x = Math.sin(t) * 9;
  const y = 20 + Math.sin(t - .35) * 5 + Math.cos(t * 2) * 1.5;
  const z = Math.sin(t + .4) * 13;
  return {
    position: companion ? [x - 24 + Math.sin(t + .7) * 7, y + 6 + Math.cos(t + .2) * 3, z - 24 + Math.sin(t - 1) * 12] : [x, y, z],
    rotation: [.035 * Math.sin(t * 2), .12 * Math.sin(t + (companion ? .8 : 0)), .15 * Math.sin(t + (companion ? 1.4 : .4))],
  };
}
export function cameraPose(seconds, portrait = false) {
  const t = seconds / LOOP_SECONDS * TAU;
  const p = flightPose(seconds).position;
  const distance = portrait ? 1.7 : 1;
  return {
    position: [p[0] + (portrait ? 18 + Math.sin(t) * 3 : 22 + Math.sin(t) * 9) * distance, p[1] + (4 + Math.sin(t - .3) * 2) * distance, p[2] + (portrait ? 34 + Math.cos(t) * 3 : 29 + Math.cos(t) * 5) * distance],
    target: [p[0] - (portrait ? 8 : 5), p[1] + (portrait ? 3 : 1.8), p[2] - 8],
  };
}
export function tracerEnvelope(seconds) {
  const phase = ((seconds % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
  return phase > 22 && phase < 23.1 ? Math.sin((phase - 22) / 1.1 * Math.PI) : 0;
}
export class FlightClock {
  constructor() { this.time = 0; this.paused = false; this.hidden = false; }
  tick(delta) { if (!this.paused && !this.hidden) this.time = (this.time + Math.min(Math.max(delta,0),.05)) % LOOP_SECONDS; return this.time; }
}
