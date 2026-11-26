import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makeState,exportPayload} from '../core.js';
import {SETTINGS,SCHOOLS,TASKS} from '../config.js';
const context=vm.createContext({Date,console});
vm.runInContext(fs.readFileSync(new URL('../collector/Code.gs',import.meta.url),'utf8'),context);
function payload(){
 const s=makeState(SETTINGS.revision);s.consent={study:true};s.completed=TASKS.map(t=>t.id);
 s.answers={'task-1':{understanding:'연락 대기',nextAction:'wait_then_call',reason:'안내 참고',missing:'없음'},'task-2':{nextAction:'other',nextActionOther:'추가 모집 확인',counts:{recruitment:{value:'9'},responses:{unknown:true}}},'task-3':{keep:['star','forest']}};
 s.events=[{name:'call_intent',taskId:'task-1',school:'star',page:'info',at:s.startedAt}];
 s.inquiries=[{taskId:'task-1',school:'star',provider:'어린이집',page:'info',text:'언제 연락하나요?',at:s.startedAt}];
 return{...exportPayload(s,SETTINGS,TASKS,SCHOOLS),submissionId:crypto.randomUUID(),finalFeedback:'좋습니다'};
}
test('collector preserves selected choice labels, counts and inquiry context',()=>{
 const p=payload();context.validate_(p);const rows=context.makeRows_(p,new Date('2026-11-26T00:00:00Z'));
 assert.equal(rows['참여자'][0][6],1);assert.equal(rows['참여자'][0][7],1);
 const counts=rows['과제응답'].find(r=>r[3]==='counts');assert.match(counts[6],/모집 인원: 9/);assert.match(counts[6],/기억나지 않음/);
 const keep=rows['과제응답'].find(r=>r[3]==='keep');assert.equal(keep[6],'별빛 어린이집\n숲속 어린이집');
 assert.equal(rows['전화문의'][0][3],'별빛 어린이집');assert.equal(rows['전화문의'][0][6],'언제 연락하나요?');
 assert.equal(rows['원본'].map(r=>r[3]).join(''),JSON.stringify(p));
});
test('collector rejects missing consent and incomplete submissions',()=>{
 const p=payload();p.consent.study=false;assert.throws(()=>context.validate_(p));
 p.consent.study=true;p.completedTasks=['task-1'];assert.throws(()=>context.validate_(p));
});
test('spreadsheet formula injection is escaped; numeric and date values remain typed',()=>{
 assert.equal(context.safeCell_('=IMPORTXML("x")'),'\'=IMPORTXML("x")');
 assert.equal(context.safeCell_(' @SUM(A1)'),"' @SUM(A1)");
 assert.equal(context.safeCell_(0),0);const d=new Date();assert.equal(context.safeCell_(d),d);
});
test('JSON chunks reassemble without splitting emoji surrogate pairs',()=>{
 const p=payload();p.finalFeedback='😄'.repeat(20000);const rows=context.makeRows_(p,new Date());
 assert.ok(rows['원본'].length>1);assert.equal(rows['원본'].map(r=>r[3]).join(''),JSON.stringify(p));
 for(const row of rows['원본'])assert.ok(row[3].length<=28000);
});
