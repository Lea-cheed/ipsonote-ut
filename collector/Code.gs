// 입소노트 UT 응답 수집 — Google Apps Script V8.
// Bind this project to the researcher's private spreadsheet. Never publish sheet contents.
const SHEET_ID = '1htVh5n2nwifx3gYlVof1b3CIIcgk1kmzLKLduFN3znY';
const HEADERS = {
  '참여자':['제출 ID','참여자 ID','시작 시각 (한국)','제출 시각 (한국)','문항 버전','완료 과제 수','전화 버튼 클릭 수','저장 문의 수','마지막 의견'],
  '과제응답':['제출 ID','참여자 ID','과제','질문 ID','질문','질문 유형','답변','기본 답변 저장 시각 (한국)'],
  '전화문의':['제출 ID','참여자 ID','과제','어린이집','문의처','화면','문의 내용','입력 시각 (한국)'],
  '행동기록':['제출 ID','참여자 ID','순서','시각 (한국)','과제','어린이집','화면','행동','부가 정보'],
  '원본':['제출 ID','조각 번호','전체 조각 수','JSON']
};

function setup() {
  const ss=SpreadsheetApp.openById(SHEET_ID);
  ss.setSpreadsheetTimeZone('Asia/Seoul');
  Object.keys(HEADERS).forEach(name=>{
    const sh=ss.getSheetByName(name);
    if(!sh)throw new Error('수집 탭 누락: '+name);
    const expected=HEADERS[name],actual=sh.getRange(1,1,1,expected.length).getValues()[0];
    if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('수집 열 불일치: '+name);
    sh.setFrozenRows(1);
  });
  return '연결 준비 완료';
}

// Public health check only. There is no public API to read survey responses.
function doGet() {return json_({ok:true,study:'ipsonote-ut',schema:1});}

function doPost(e) {
  const lock=LockService.getScriptLock();
  let locked=false;
  try {
    const body=e&&e.postData&&e.postData.contents;
    if(!body||body.length>1000000)throw new Error('INVALID_REQUEST');
    const p=JSON.parse(body);validate_(p);
    lock.waitLock(25000);locked=true;
    const ss=SpreadsheetApp.openById(SHEET_ID);
    const receiptSheet=ss.getSheetByName('참여자');
    const existing=findId_(receiptSheet,p.submissionId);
    if(existing.length){
      const row=receiptSheet.getRange(existing[0],1,1,2).getValues()[0];
      if(row[1]!==p.participantId)throw new Error('ID_CONFLICT');
      return json_({ok:true,submissionId:p.submissionId});
    }
    // A prior interrupted write has no receipt. Remove only its partial child rows.
    ['과제응답','전화문의','행동기록','원본'].forEach(name=>removePending_(ss.getSheetByName(name),p.submissionId));
    const rows=makeRows_(p,new Date());
    ['과제응답','전화문의','행동기록','원본'].forEach(name=>append_(ss.getSheetByName(name),rows[name],name));
    SpreadsheetApp.flush();
    // Commit marker is written last. Retries return this same receipt, without duplicate rows.
    append_(receiptSheet,rows['참여자'],'참여자');
    SpreadsheetApp.flush();
    return json_({ok:true,submissionId:p.submissionId});
  } catch(err) {
    console.error(String(err&&err.message||err));
    return json_({ok:false,error:'응답을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'});
  } finally {if(locked)lock.releaseLock();}
}

function validate_(p) {
  if(!p||p.schema!==1||p.study!=='ipsonote-ut'||!p.consent||p.consent.study!==true)throw new Error('INVALID_STUDY');
  const id=/^[a-zA-Z0-9-]{8,100}$/;
  if(!id.test(p.submissionId)||!id.test(p.participantId))throw new Error('INVALID_ID');
  if(!p.answers||typeof p.answers!=='object'||Array.isArray(p.answers))throw new Error('INVALID_ANSWERS');
  if(!Array.isArray(p.completedTasks)||!['task-1','task-2','task-3'].every(k=>p.completedTasks.indexOf(k)>=0))throw new Error('INCOMPLETE_STUDY');
  if(!Array.isArray(p.events)||p.events.length>3000||!Array.isArray(p.inquiries)||p.inquiries.length>200)throw new Error('INVALID_RECORDS');
  if(!p.studySnapshot||!Array.isArray(p.studySnapshot.tasks)||p.studySnapshot.tasks.length!==3)throw new Error('MISSING_SNAPSHOT');
  if(Number.isNaN(Date.parse(p.startedAt)))throw new Error('INVALID_TIME');
}

function makeRows_(p,receivedAt) {
  const rows={};Object.keys(HEADERS).forEach(n=>rows[n]=[]);
  const prefix=[p.submissionId,p.participantId],snap=p.studySnapshot;
  const schools=snap.schools||{},schoolName=k=>schools[k]&&schools[k].name||k||'';
  const tasks=snap.tasks||[],taskName=k=>{const t=tasks.find(t=>t.id===k);return t?t.title:k||'';};
  rows['참여자'].push(prefix.concat([new Date(p.startedAt),receivedAt,p.revision,p.completedTasks.length,p.events.filter(x=>x.name==='call_intent').length,p.inquiries.length,p.finalFeedback||'']));
  tasks.forEach(t=>{
    const answers=p.answers[t.id]||{},before=p.basicBeforeProbes&&p.basicBeforeProbes.taskId===t.id?p.basicBeforeProbes:null;
    (t.questions||[]).concat(t.probes||[]).forEach(q=>{
      const isBasic=(t.questions||[]).some(b=>b.id===q.id);
      const saved=before&&isBasic?before.answers:answers;
      const time=before&&isBasic?new Date(before.at):'';
      rows['과제응답'].push(prefix.concat([t.title,q.id,q.label,q.type,answerText_(q,saved[q.id],saved,schoolName),time]));
    });
  });
  p.inquiries.forEach(i=>rows['전화문의'].push(prefix.concat([taskName(i.taskId),schoolName(i.school),i.provider==='어린이집'?schoolName(i.school):i.provider,i.page,i.text,new Date(i.at)])));
  p.events.forEach((event,i)=>{
    const extra={};Object.keys(event).forEach(k=>{if(['name','taskId','school','page','at'].indexOf(k)<0)extra[k]=event[k];});
    rows['행동기록'].push(prefix.concat([i+1,new Date(event.at),taskName(event.taskId),schoolName(event.school),event.page,event.name,JSON.stringify(extra)]));
  });
  const codepoints=Array.from(JSON.stringify(p)),parts=[];
  for(let i=0;i<codepoints.length;i+=14000)parts.push(codepoints.slice(i,i+14000).join(''));
  parts.forEach((part,i)=>rows['원본'].push([p.submissionId,i+1,parts.length,part]));
  return rows;
}

function answerText_(q,value,answers,schoolName) {
  const label=k=>{const o=(q.options||[]).find(o=>o.id===k);return o?o.label:String(k||'');};
  if(q.type==='single')return label(value)+(value==='other'?' '+String(answers[q.id+'Other']||''):'');
  if(q.type==='multi')return Array.isArray(value)?value.map(label).join('\n'):'';
  if(q.type==='schoolTexts')return ['sunny','star','forest'].map(k=>schoolName(k)+': '+String(value&&value[k]||'')).join('\n');
  if(q.type==='counts')return [['recruitment','모집 인원'],['responses','입소 의사 확인 인원']].map(x=>x[1]+': '+(value&&value[x[0]]&&value[x[0]].unknown?'기억나지 않음':String(value&&value[x[0]]&&value[x[0]].value||'0'))).join('\n');
  return value==null?'':String(value);
}

function safeCell_(value) {
  if(value instanceof Date)return Number.isNaN(value.getTime())?'':value;
  if(typeof value==='number'||typeof value==='boolean')return value;
  const s=String(value==null?'':value);
  return /^[=+\-@]/.test(s.trimStart())?"'"+s:s;
}
function append_(sheet,rows,name) {
  if(!rows.length)return;
  if(!sheet)throw new Error('MISSING_TAB');
  const start=sheet.getLastRow()+1,last=start+rows.length-1;
  if(last>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),last-sheet.getMaxRows());
  const range=sheet.getRange(start,1,rows.length,HEADERS[name].length);
  range.setValues(rows.map(r=>r.map(safeCell_)));
  range.setVerticalAlignment('top');
  if(name==='원본')range.setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  else {range.setWrap(true);sheet.autoResizeRows(start,rows.length);}
  const dates={'참여자':[3,4],'과제응답':[8],'전화문의':[8],'행동기록':[4]}[name]||[];
  dates.forEach(col=>sheet.getRange(start,col,rows.length,1).setNumberFormat('yyyy-mm-dd hh:mm:ss'));
}
function findId_(sheet,id) {
  if(!sheet||sheet.getLastRow()<2)return [];
  return sheet.getRange(2,1,sheet.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).findAll().map(r=>r.getRow());
}
function removePending_(sheet,id) {
  const indices=findId_(sheet,id).sort((a,b)=>a-b);
  for(let i=indices.length-1;i>=0;){let end=indices[i],start=end;i--;while(i>=0&&indices[i]===start-1){start=indices[i];i--;}sheet.deleteRows(start,end-start+1);}
}
function json_(data) {return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
