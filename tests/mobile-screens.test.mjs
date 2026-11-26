import test from 'node:test';
import assert from 'node:assert/strict';
import {createMobileScreens} from '../mobile-design.js';
import {escapeHTML} from '../core.js';
import {SETTINGS,SCHOOLS} from '../config.js';
function fixture(){
  const state={app:{school:'star',infoTab:'basic',notificationTab:'rank',notificationChild:'all'},startedAt:'2026-11-26T00:00:00Z'};
  const data=structuredClone(SCHOOLS);
  const views=createMobileScreens({settings:SETTINGS,e:escapeHTML,icon:()=>'',button:(a,t)=>`<button data-action="${a}">${t}</button>`,shortTime:()=> '09:00',updated:()=> '11월 26일',koreaStamp:()=> '11월 26일',historyRows:()=>[],state:()=>state,data:()=>data});
  return{state,data,views};
}
test('school switching and preview edits reach all relevant views without stale values',()=>{
  const {state,data,views}=fixture();
  state.app.school='forest';data.forest.rank=61;data.forest.recruitment=12;data.forest.responses=7;data.forest.teachers=6;data.forest.enrolled=24;
  assert.match(views.home(),/61<small>번/);
  assert.match(views.home(),/<strong>12<\/strong>/);
  assert.match(views.recruitment(),/12<small>명/);
  assert.match(views.ranks(),/61번/);
  assert.match(views.history(),/61<small>번/);
  state.app.infoTab='teacher';
  assert.match(views.info(),/아동 약 4\.0명이에요/);
  state.app.school='star';assert.match(views.ranks(),/4번/);
});
test('Figma layouts keep editable names and explanations escaped',()=>{
  const {state,data,views}=fixture();
  data.star.name='<img src=x onerror=alert(1)>';
  data.star.reason='<script>alert(1)</script>';
  for(const html of [views.home(),views.ranks(),views.info(),views.recruitment(),views.history()]){
    assert.ok(!html.includes('<img src=x'));
    assert.ok(!html.includes('<script>'));
  }
  state.app.notificationChild=SETTINGS.childName;
  assert.ok(!views.notifications().includes('이하랑 ·'));
});
