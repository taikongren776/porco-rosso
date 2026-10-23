import {test} from 'node:test';
import assert from 'node:assert/strict';
import { flightPose,cameraPose,tracerEnvelope,FlightClock,LOOP_SECONDS } from '../src/director.js';

test('planes and cameras join continuously at the loop boundary',()=>{
  for(const evaluate of [t=>flightPose(t),t=>flightPose(t,true),t=>cameraPose(t),t=>cameraPose(t,true)]){
    const first=evaluate(0),last=evaluate(LOOP_SECONDS);
    for(const key of Object.keys(first))first[key].forEach((value,i)=>assert.ok(Math.abs(value-last[key][i])<1e-9));
    const before=evaluate(LOOP_SECONDS-.001),after=evaluate(.001);
    for(const key of Object.keys(first))before[key].forEach((value,i)=>assert.ok(Math.abs(value-after[key][i])<.02));
  }
});
test('the entire flight stays above the sea and aircraft do not collide',()=>{
  for(let t=0;t<LOOP_SECONDS;t+=.05){
    const a=flightPose(t).position,b=flightPose(t,true).position;
    assert.ok(a[1]>10&&b[1]>10,'floats clear the water');
    assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))>15,'airframes do not intersect');
    assert.ok(cameraPose(t).position[1]>15,'camera never enters the sea');
  }
});
test('pause and background suspension freeze the shared clock without a resume jump',()=>{
  const c=new FlightClock();c.tick(.016);const initial=c.time;c.paused=true;c.tick(10);assert.equal(c.time,initial);
  c.paused=false;c.hidden=true;c.tick(10);assert.equal(c.time,initial);c.hidden=false;c.tick(10);assert.equal(c.time,initial+.05);
});
test('tracers stay brief and absent at the loop seam',()=>{
  assert.equal(tracerEnvelope(0),0);assert.equal(tracerEnvelope(48),0);assert.equal(tracerEnvelope(24),0);assert.ok(tracerEnvelope(22.5)>.9);
});
