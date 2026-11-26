export const SCHEMA = 1;
export const STORAGE_KEY = 'ipsonote-ut:pilot-v1';
export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
export function koreaTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}
export function koreaStamp(date) {
  return new Intl.DateTimeFormat('ko-KR', {timeZone:'Asia/Seoul',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(date));
}
export function makeState(revision, school = 'star') {
  return {schema:SCHEMA,revision,participantId:globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    startedAt:new Date().toISOString(),consent:null,started:false,taskIndex:0,phase:'basic',completed:[],finished:false,
    answers:{},inquiries:[],events:[],basicBeforeProbes:null,
    app:{page:'home',school,infoTab:'basic',notificationTab:'rank',notificationChild:'all',history:[],scroll:0}};
}
export function restoreState(raw, revision, schoolIds, taskCount) {
  try {
    const v = JSON.parse(raw);
    if (!v || v.schema!==SCHEMA || v.revision!==revision || !v.answers || typeof v.answers!=='object' || Array.isArray(v.answers)
        || !v.app || !schoolIds.includes(v.app.school) || !Number.isInteger(v.taskIndex) || v.taskIndex<0 || v.taskIndex>=taskCount
        || !['basic','probe'].includes(v.phase) || !Array.isArray(v.completed) || !Array.isArray(v.events) || !Array.isArray(v.inquiries)
        || typeof v.participantId!=='string' || Number.isNaN(Date.parse(v.startedAt))) return null;
    const pages = ['home','notifications','history','recruitment','ranks','rankGuide','info'];
    if (!pages.includes(v.app.page)) return null;
    v.app.history = Array.isArray(v.app.history) ? v.app.history.filter(x=>pages.includes(x.page)&&schoolIds.includes(x.school)).slice(-30) : [];
    v.app.scroll = Number.isFinite(v.app.scroll) ? Math.max(0,v.app.scroll) : 0;
    v.events = v.events.slice(-3000);
    return v;
  } catch { return null; }
}
export function toggleExclusive(current, value, checked, exclusive = []) {
  const next = new Set(Array.isArray(current) ? current : []);
  if (!checked) next.delete(value);
  else if (exclusive.includes(value)) return [value];
  else { exclusive.forEach(x=>next.delete(x)); next.add(value); }
  return [...next];
}
export function questionError(q, answer, allAnswers = {}) {
  if (q.type==='text') return typeof answer==='string' && answer.trim() ? '' : '답변을 입력해 주세요.';
  if (q.type==='single') {
    if (!q.options.some(o=>o.id===answer)) return '답변을 선택해 주세요.';
    if (answer==='other' && !String(allAnswers[q.id+'Other'] || '').trim()) return '기타 내용을 입력해 주세요.';
    return '';
  }
  if (q.type==='multi') {
    if (!Array.isArray(answer) || !answer.length || answer.some(v=>!q.options.some(o=>o.id===v))) return '한 가지 이상 선택해 주세요.';
    if (answer.length>1 && answer.some(v=>q.exclusive?.includes(v))) return '단독 선택 항목을 다른 항목과 함께 고를 수 없습니다.';
    return '';
  }
  if (q.type==='schoolTexts') return ['sunny','star','forest'].every(k=>typeof answer?.[k]==='string'&&answer[k].trim()) ? '' : '각 어린이집에 대해 답해 주세요. 확인하지 않았다면 그렇게 적어 주세요.';
  if (q.type==='counts') return ['recruitment','responses'].every(k=>answer?.[k]?.unknown===true || /^\d+$/.test(String(answer?.[k]?.value??''))) ? '' : '각 인원을 입력하거나 ‘기억나지 않음’을 선택해 주세요.';
  return '알 수 없는 질문 형식입니다.';
}
export function validateQuestions(questions, answers = {}) {
  return Object.fromEntries(questions.map(q=>[q.id,questionError(q,answers[q.id],answers)]).filter(([,v])=>v));
}
export function validEndpoint(endpoint, allowedOrigins) {
  try { const u = new URL(endpoint); return u.protocol==='https:' && allowedOrigins.includes(u.origin); } catch { return false; }
}
export function exportPayload(state, settings, tasks, schools) {
  return {schema:SCHEMA,study:'ipsonote-ut',revision:settings.revision,participantId:state.participantId,
    startedAt:state.startedAt,completedAt:new Date().toISOString(),consent:state.consent,
    completedTasks:state.completed,answers:state.answers,basicBeforeProbes:state.basicBeforeProbes,
    inquiries:state.inquiries,events:state.events,
    studySnapshot:{tasks,schools,childName:settings.childName,desiredMonth:settings.desiredMonth,age:settings.age}};
}
