import test from 'node:test';
import assert from 'node:assert/strict';
import {escapeHTML,koreaTime,makeState,restoreState,toggleExclusive,questionError,validateQuestions,validEndpoint,exportPayload} from '../core.js';
import {SETTINGS,SCHOOLS,TASKS} from '../config.js';

test('Korea clock uses Seoul time across date boundaries',()=>{
  assert.equal(koreaTime(new Date('2026-11-26T00:05:00Z')),'09:05');
  assert.equal(koreaTime(new Date('2026-11-26T15:02:00Z')),'00:02');
});
test('answers cannot inject HTML into question fields',()=>{
  assert.equal(escapeHTML('<script>"&\'</script>'),'&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');
});
test('restore preserves answers and navigation but rejects incompatible or broken saves',()=>{
  const state=makeState(SETTINGS.revision);
  state.answers['task-1']={understanding:'연락을 기다림'};
  state.app.history=[{page:'info',school:'star',scroll:123},{page:'invalid',school:'star'}];
  const restored=restoreState(JSON.stringify(state),SETTINGS.revision,Object.keys(SCHOOLS),3);
  assert.equal(restored.answers['task-1'].understanding,'연락을 기다림');
  assert.equal(restored.app.history.length,1);
  assert.equal(restored.app.history[0].scroll,123);
  for(const raw of ['bad','null',JSON.stringify({...state,revision:'old'}),JSON.stringify({...state,taskIndex:3})]){
    assert.equal(restoreState(raw,SETTINGS.revision,Object.keys(SCHOOLS),3),null);
  }
});
test('exclusive choices replace school choices and vice versa',()=>{
  const exclusives=['none','unclear'];
  assert.deepEqual(toggleExclusive(['star','sunny'],'none',true,exclusives),['none']);
  assert.deepEqual(toggleExclusive(['none'],'forest',true,exclusives),['forest']);
  assert.deepEqual(toggleExclusive(['forest'],'star',true,exclusives),['forest','star']);
  assert.deepEqual(toggleExclusive(['forest'],'forest',false,exclusives),[]);
});
test('question validation requires other details and accepts zero or unknown counts',()=>{
  const action=TASKS[0].questions[1],counts=TASKS[1].probes[0];
  assert.ok(questionError(action,'other',{}));
  assert.equal(questionError(action,'other',{nextActionOther:'정보 확인'}),'');
  assert.ok(questionError(action,'not-an-option'));
  assert.equal(questionError(counts,{recruitment:{value:'0'},responses:{unknown:true}}),'');
  assert.ok(questionError(counts,{recruitment:{value:'-1'},responses:{value:'9'}}));
  assert.ok(questionError(counts,{recruitment:{value:'1.2'},responses:{value:'9'}}));
  assert.equal(Object.keys(validateQuestions(TASKS[0].questions,{})).length,4);
  const keep=TASKS[2].questions.find(q=>q.id==='keep');
  assert.ok(questionError(keep,['star','none']));
  assert.equal(questionError(keep,['star','forest']),'');
});
test('tasks open the agreed screens and task 2 probes are separate',()=>{
  assert.deepEqual(TASKS.map(t=>[t.school,t.startPage]),[['star','home'],['forest','home'],['sunny','home']]);
  assert.equal(TASKS[0].questions[1].options[1].label,'1~3일동안 기다리고, 연락이 없으면 전화한다.');
  assert.equal(TASKS[1].questions.length,4);
  assert.equal(TASKS[1].probes.length,2);
  assert.equal(SCHOOLS.forest.recruitment,9);
  assert.equal(SCHOOLS.forest.responses,9);
  for(const s of Object.values(SCHOOLS))assert.equal(s.previousRank-s.rank,s.delta);
});
test('collector requires HTTPS and an explicitly allowed origin',()=>{
  assert.equal(validEndpoint('https://collector.example/api',['https://collector.example']),true);
  assert.equal(validEndpoint('http://collector.example/api',['http://collector.example']),false);
  assert.equal(validEndpoint('https://collector.example.evil/api',['https://collector.example']),false);
  assert.equal(validEndpoint('',[]),false);
});
test('export ties answers and inquiry events to anonymous participant and study snapshot',()=>{
  const state=makeState(SETTINGS.revision);
  state.inquiries.push({taskId:'task-1',school:'star',text:'언제 연락하나요?'});
  state.basicBeforeProbes={answers:{understanding:'모집이 끝남'}};
  const payload=exportPayload(state,SETTINGS,TASKS,SCHOOLS);
  assert.equal(payload.participantId,state.participantId);
  assert.equal(payload.inquiries[0].school,'star');
  assert.equal(payload.studySnapshot.schools.forest.responses,9);
  assert.deepEqual(payload.basicBeforeProbes,state.basicBeforeProbes);
});
