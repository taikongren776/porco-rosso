import {test} from 'node:test';
import assert from 'node:assert/strict';
import { tracerEnvelope,FlightClock } from '../src/director.js';
test('pause and background suspension freeze the shared clock without a resume jump',()=>{
  const c=new FlightClock();c.tick(.016);const initial=c.time;c.paused=true;c.tick(10);assert.equal(c.time,initial);
  c.paused=false;c.hidden=true;c.tick(10);assert.equal(c.time,initial);c.hidden=false;c.tick(10);assert.equal(c.time,initial+.05);
});
test('tracers stay brief and absent at the loop seam',()=>{
  assert.equal(tracerEnvelope(0),0);assert.equal(tracerEnvelope(48),0);assert.equal(tracerEnvelope(24),0);assert.ok(tracerEnvelope(22.5)>.9);
});
