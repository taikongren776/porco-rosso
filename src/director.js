export const LOOP_SECONDS = 48;
export function tracerEnvelope(seconds) {
  const phase = ((seconds % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
  return phase > 22 && phase < 23.1 ? Math.sin((phase - 22) / 1.1 * Math.PI) : 0;
}
export class FlightClock {
  constructor() { this.time = 0; this.paused = false; this.hidden = false; }
  tick(delta) { if (!this.paused && !this.hidden) this.time = (this.time + Math.min(Math.max(delta,0),.05)) % LOOP_SECONDS; return this.time; }
}
