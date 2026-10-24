import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PlayerFlight,keyboardAxes,MIN_ALTITUDE,MAX_ALTITUDE} from '../src/player.js';
function fly(player,input,seconds=3,fps=60){for(let i=0;i<seconds*fps;i++)player.step(1/fps,input);return player;}
test('keyboard aliases work and opposite inputs cancel',()=>{
  assert.deepEqual(keyboardAxes(new Set(['KeyW','ArrowRight','ShiftRight'])),{turn:1,climb:1,boost:true});
  assert.deepEqual(keyboardAxes(new Set(['KeyA','KeyD','ArrowUp','ArrowDown'])),{turn:0,climb:0,boost:false});
});
test('input changes the actual flight path, altitude and banking',()=>{
  const straight=fly(new PlayerFlight(),{}),right=fly(new PlayerFlight(),{turn:1},1),left=fly(new PlayerFlight(),{turn:-1},1);
  assert.equal(straight.x,0);assert.ok(straight.z<-90);
  assert.ok(right.x>0&&right.heading<0&&right.bank<0);assert.ok(left.x<0&&left.heading>0&&left.bank>0);
  assert.ok(fly(new PlayerFlight(),{climb:1}).y>45);assert.ok(fly(new PlayerFlight(),{climb:-1},1).y<24);
});
test('release levels the aircraft and boost changes travel speed',()=>{
  const p=fly(new PlayerFlight(),{turn:1,climb:1,boost:true},1);fly(p,{},5);
  assert.ok(Math.abs(p.bank)<1e-6&&Math.abs(p.pitch)<1e-6&&Math.abs(p.turnRate)<1e-6);assert.ok(Math.abs(p.speed-32)<.01);
  const boost=fly(new PlayerFlight(),{boost:true}),normal=fly(new PlayerFlight(),{});assert.ok(boost.z<normal.z-40);
});
test('sustained climb and dive stay within safe bounds',()=>{
  const p=fly(new PlayerFlight(),{climb:-1,boost:true},30);assert.equal(p.y,MIN_ALTITUDE);
  fly(p,{climb:1,boost:true},60);assert.equal(p.y,MAX_ALTITUDE);
});
test('movement is independent of display refresh rate',()=>{
  const a=fly(new PlayerFlight(),{turn:.7,climb:.3,boost:true},5,60),b=fly(new PlayerFlight(),{turn:.7,climb:.3,boost:true},5,144);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1.5);assert.ok(Math.abs(a.heading-b.heading)<.01);
});
test('reset restores heading, speed and position; zero time does not move',()=>{
  const p=fly(new PlayerFlight(),{turn:1,climb:1,boost:true});p.reset();assert.deepEqual(p,new PlayerFlight());
  p.step(0,{turn:1,climb:1});assert.deepEqual(p,new PlayerFlight());
});
test('formation stays separated through full turns and long flight',()=>{
  const p=new PlayerFlight();for(let i=0;i<6000;i++){p.step(.05,{turn:.5,climb:Math.sin(i*.01)});const q=p.localPoint(-24,7,-30);assert.ok(Math.abs(Math.hypot(q[0]-p.x,q[1]-p.y,q[2]-p.z)-39.05124837953327)<1e-8);assert.ok(Number.isFinite(p.heading));}
});
