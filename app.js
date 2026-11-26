import {createMobileScreens} from './mobile-design.js';
import {SETTINGS, SCHOOLS, TASKS} from './config.js?v=20261126-collection';
import {STORAGE_KEY, escapeHTML as e, koreaTime, koreaStamp, makeState, restoreState, toggleExclusive, validateQuestions, validEndpoint, exportPayload} from './core.js';

const $ = s => document.querySelector(s);
const screen = $('#phone-screen');
const panel = $('#question-panel');
const modal = $('#main-dialog');
let storageAvailable = true;
let raw = null;
try { raw = localStorage.getItem(STORAGE_KEY); } catch { storageAvailable = false; }
let state = restoreState(raw, SETTINGS.revision, Object.keys(SCHOOLS), TASKS.length) || makeState(SETTINGS.revision);
let data = structuredClone(SCHOOLS);
if (state.previewSchools) {
  for (const id of Object.keys(data)) {
    const override = state.previewSchools[id];
    if (override && ['rank','recruitment','responses'].every(k=>Number.isInteger(override[k])&&override[k]>=0&&override[k]<=9999)) {
      for(const k of ['rank','recruitment','responses']) data[id][k]=override[k];
      data[id].previousRank=Math.max(1,data[id].rank+data[id].delta);
      data[id].delta=data[id].previousRank-data[id].rank;
    }
  }
}
let errors = {};
let inquiryDraft = '';
let toastTimer;
let lastFocus;
let submitting = false;
let saveTimer;
const paths = {
  arrow:'m9 5 7 7-7 7', back:'m15 5-7 7 7 7', down:'m6 9 6 6 6-6',
  bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  phone:'M5 3h4l1 5-3 2a13 13 0 0 0 7 7l2-3 5 1v4c0 2-2 3-4 2C9 19 5 15 3 7 2 5 3 3 5 3Z',
  note:'M7 3h12v18H7ZM3 7h4M3 12h4M3 17h4M10 8h6M10 12h6M10 16h4',
  check:'m4 12 5 5L20 5', user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0',
  chart:'M4 14v7h4v-7Zm6-10v17h4V4Zm6 5v12h4V9Z', home:'m3 11 9-8 9 8M5 9v12h14V9M9 21v-7h6v7',
  close:'m5 5 14 14M5 19 19 5', info:'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
};
// Actual SVGs exported from the final Figma mobile screens.
const sourceIcons = {
  "note": "<svg aria-hidden=\"true\" focusable=\"false\" data-figma-node=\"I419:8840;356:7266;356:7261\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M9 4H19C19.6667 4 20 4.33333 20 5V19C20 19.6667 19.6667 20 19 20H5C4.33333 20 4 19.6667 4 19V8C4 7.33333 4.33333 7 5 7H8V5C8 4.33333 8.33333 4 9 4ZM7 7H8V19H7V7ZM11.5 7.75H16.5C17 7.75 17.25 8 17.25 8.5C17.25 9 17 9.25 16.5 9.25H11.5C11 9.25 10.75 9 10.75 8.5C10.75 8 11 7.75 11.5 7.75ZM11.5 11.75H14.5C15 11.75 15.25 12 15.25 12.5C15.25 13 15 13.25 14.5 13.25H11.5C11 13.25 10.75 13 10.75 12.5C10.75 12 11 11.75 11.5 11.75Z\" fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"#222222\"/>\n</svg>\n",
  "check": "<svg aria-hidden=\"true\" focusable=\"false\" data-figma-node=\"I419:8840;356:7270;356:7257\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M8 12.5L10.1947 14.6947C10.6215 15.1215 11.3264 15.0757 11.6944 14.5973L16 9M7 20H17C18.6569 20 20 18.6569 20 17V7C20 5.34315 18.6569 4 17 4H7C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20Z\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke=\"#BABABA\"/>\n</svg>\n",
  "user": "<svg aria-hidden=\"true\" focusable=\"false\" data-figma-node=\"I419:8840;356:7274;356:7257\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M6 18C6.66667 17 8.8 15 12 15C15.2 15 17.3333 17 18 18M15 9.75C15 8.23122 13.7688 7 12.25 7C10.7312 7 9.5 8.23122 9.5 9.75C9.5 11.2688 10.7312 12.5 12.25 12.5C13.7688 12.5 15 11.2688 15 9.75ZM20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C7.30558 20.5 3.5 16.6944 3.5 12C3.5 7.30558 7.30558 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12Z\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke=\"#BABABA\"/>\n</svg>\n",
  "bell": "<svg aria-hidden=\"true\" focusable=\"false\" data-figma-node=\"I419:8841;351:7254\" width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M9.98372 3.23177V2.39844M9.98372 3.23177C12.9753 3.23177 15.4004 5.6569 15.4004 8.64844V11.5484C15.4004 11.5576 15.4079 11.5651 15.4171 11.5651C16.3283 11.5651 17.0671 12.3038 17.0671 13.2151V13.4401C17.0671 14.4756 16.2276 15.3151 15.1921 15.3151H12.0671M9.98372 3.23177C6.99218 3.23177 4.56706 5.6569 4.56706 8.64844V11.5484C4.56706 11.5576 4.5596 11.5651 4.55039 11.5651C3.63912 11.5651 2.90039 12.3038 2.90039 13.2151V13.4401C2.90039 14.4756 3.73986 15.3151 4.77539 15.3151H7.90039M7.90039 15.3151V15.5172C7.90039 16.6678 8.83313 17.6005 9.98372 17.6005C11.1343 17.6005 12.0671 16.6678 12.0671 15.5172V15.3151M7.90039 15.3151H12.0671\" stroke-width=\"1.25\" stroke-linecap=\"round\" stroke=\"#222222\"/>\n<rect x=\"12\" y=\"2\" width=\"6\" height=\"6\" rx=\"3\" fill=\"#0976FF\"/>\n</svg>\n",
  "down": "<svg aria-hidden=\"true\" focusable=\"false\" data-figma-node=\"I419:8841;351:7251\" width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M5.83301 8.33203L10.0004 12.1487L14.1663 8.33203\" stroke-width=\"1.25\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke=\"#222222\"/>\n</svg>\n",
  "phone": "<svg aria-hidden=\"true\" focusable=\"false\" data-figma-node=\"419:8761\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M20.6638 18.7715C20.6638 18.7715 19.5052 19.9095 19.2212 20.2432C18.7587 20.7367 18.2137 20.9698 17.4992 20.9698C17.4305 20.9698 17.3573 20.9698 17.2886 20.9653C15.9284 20.8784 14.6644 20.3483 13.7164 19.8958C11.1243 18.6435 8.8482 16.8657 6.95678 14.6125C5.3951 12.7341 4.35093 10.9974 3.6594 9.13265C3.23349 7.99464 3.07778 7.10799 3.14647 6.27162C3.19227 5.73689 3.39835 5.29357 3.77847 4.91423L5.34015 3.35574C5.56455 3.14551 5.8027 3.03125 6.03626 3.03125C6.32478 3.03125 6.55835 3.20492 6.7049 3.35117C6.70948 3.35574 6.71406 3.36031 6.71864 3.36489C6.998 3.62539 7.26362 3.89504 7.54298 4.18298C7.68495 4.32923 7.8315 4.47548 7.97805 4.6263L9.22831 5.874C9.71376 6.35846 9.71376 6.80635 9.22831 7.29081C9.0955 7.42335 8.96727 7.55589 8.83446 7.68386C8.44976 8.0769 8.75196 7.77532 8.35353 8.13181C8.34437 8.14095 8.33521 8.14552 8.33063 8.15466C7.93677 8.54771 8.01005 8.93162 8.09248 9.19213C8.09706 9.20584 8.10164 9.21955 8.10622 9.23326C8.43138 10.0194 8.88935 10.7598 9.58547 11.6418L9.59005 11.6464C10.854 13.2003 12.1867 14.4115 13.6568 15.3392C13.8446 15.4581 14.0369 15.554 14.2201 15.6454C14.385 15.7277 14.5407 15.8054 14.6735 15.8877C14.6918 15.8968 14.7101 15.9105 14.7285 15.9197C14.8842 15.9974 15.0307 16.0339 15.1819 16.0339C15.562 16.0339 15.8001 15.7963 15.878 15.7186L16.7757 14.8227C16.9314 14.6673 17.1787 14.48 17.4672 14.48C17.7511 14.48 17.9847 14.6582 18.1267 14.8136C18.1312 14.8182 18.1312 14.8182 18.1358 14.8227L20.6592 17.341C21.1309 17.8072 20.6638 18.7715 20.6638 18.7715Z\" fill=\"white\"/>\n</svg>\n",
  "chart": "<svg aria-hidden=\"true\" focusable=\"false\" data-figma-node=\"419:8829\" width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<rect x=\"1.78711\" y=\"12.832\" width=\"5.15417\" height=\"5.66667\" rx=\"1\" fill=\"#ADC9F6\"/>\n<rect x=\"7.42383\" y=\"1.5\" width=\"5.15417\" height=\"17\" rx=\"1\" fill=\"#8CB8FF\"/>\n<rect x=\"13.0605\" y=\"8.10938\" width=\"5.15417\" height=\"10.3889\" rx=\"1\" fill=\"#66A0FD\"/>\n</svg>\n",
  "home": "<svg aria-hidden=\"true\" focusable=\"false\" data-figma-node=\"419:8834\" width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M2 8.12066C2 7.79434 2.15921 7.48855 2.42654 7.30142L9.42654 2.40142C9.77086 2.1604 10.2291 2.1604 10.5735 2.40142L17.5735 7.30142C17.8408 7.48855 18 7.79434 18 8.12066V17C18 17.5523 17.5523 18 17 18H3C2.44772 18 2 17.5523 2 17V8.12066Z\" fill=\"#8CB8FF\"/>\n<path d=\"M6.80078 11C6.80078 10.4477 7.2485 10 7.80078 10H12.2008C12.7531 10 13.2008 10.4477 13.2008 11V18H6.80078V11Z\" fill=\"white\"/>\n</svg>\n"
};
function icon(name) { return sourceIcons[name] || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.info}"/></svg>`; }
function button(action, label, cls = '', attrs = '') { return `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`; }
function task() { return TASKS[state.taskIndex]; }
function school() { return data[state.app.school]; }
function questions() { return state.phase==='probe' ? task().probes || [] : task().questions; }
function answers() { return state.answers[task().id] ||= {}; }
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageAvailable = true; }
  catch { storageAvailable = false; }
  const status = $('#save-status');
  if (status) { status.classList.toggle('failed', !storageAvailable); status.textContent = storageAvailable ? '이 기기에 임시 저장됨' : '임시 저장 불가 · 창을 닫지 마세요'; }
  const count = $('#answer-count');
  if (count) count.textContent = `${questions().filter(q=>!validateQuestions([q],answers())[q.id]).length}/${questions().length}`;
}
function track(name, detail = {}) {
  if (!state.started) return;
  state.events.push({name,taskId:task().id,school:state.app.school,page:state.app.page,at:new Date().toISOString(),...detail});
  state.events = state.events.slice(-3000);
  if (state.consent?.analytics && window.clarity) { window.clarity('set','ut_task',task().id); window.clarity('event',name); }
  save();
}
function startAnalytics() {
  if (!state.consent?.analytics || !/^[a-zA-Z0-9]+$/.test(SETTINGS.clarityProjectId)) return;
  if (!window.clarity) {
    window.clarity = function(...args) {(window.clarity.q ||= []).push(args);};
    const s = document.createElement('script'); s.async = true; s.src = `https://www.clarity.ms/tag/${SETTINGS.clarityProjectId}`; document.head.append(s);
  }
  window.clarity('consentv2',{analytics_Storage:'granted',ad_Storage:'denied'});
  window.clarity('identify',state.participantId);
  window.clarity('set','ut_revision',SETTINGS.revision);
}
function toast(message) { const t = $('#app-toast'); t.textContent=message; t.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('visible'),2800); }
function clock() { $('#korea-clock').textContent=koreaTime(); $('#korea-clock').dateTime=new Date().toISOString(); }
clock(); setInterval(clock,1000);

function renderScenario() {
  $('#scenario-panel').innerHTML = `<div class="scenario-card"><div class="eyebrow">TASK ${state.taskIndex+1} / ${TASKS.length}</div><h1>${e(task().title)}</h1><h2>지금 이런 상황이에요</h2><div class="scenario-content">${e(task().scenario)}</div><p class="small-note">휴대폰 화면을 자유롭게 살펴보고 옆의 질문에 답해 주세요. 질문을 보면서 다시 탐색해도 괜찮아요.</p><div class="progress-list">${TASKS.map((t,i)=>`<div class="progress-item ${i===state.taskIndex?'current':''} ${state.completed.includes(t.id)?'done':''}"><span class="progress-number">${state.completed.includes(t.id)?'✓':i+1}</span><span>${e(t.title)}</span></div>`).join('')}</div><div class="save-status" id="save-status">이 기기에 임시 저장됨</div></div>`;
}
function subHeader(title) {return `<header class="sub-header">${button('back',icon('back'),'back-button','aria-label="이전 화면"')}<h2>${e(title)}</h2><span></span></header>`;}
function shortTime() { return koreaTime(new Date(state.startedAt)); }
function updated() { return koreaStamp(state.startedAt); }
function historyRows() {
  const s=school(); const base=Date.parse(state.startedAt);
  return [
    {from:s.previousRank,to:s.rank,reason:s.reason,date:base},
    {from:s.previousRank+1,to:s.previousRank,reason:'앞 순번 아동 1명이 대기 신청을 취소하여 대기 순번이 올라갔어요.',date:base-2*864e5},
    {from:s.previousRank,to:s.previousRank+1,reason:'입소 우선순위가 높은 아동이 신청하여 대기 순번이 한 자리 뒤로 바뀌었어요.',date:base-3*864e5},
    {from:s.previousRank+3,to:s.previousRank,reason:'앞 순번 아동 3명의 입소가 확정되어 대기 순번이 올라갔어요.',date:base-5*864e5},
  ];
}
const mobile = createMobileScreens({settings:SETTINGS,e,icon,button,shortTime,updated,koreaStamp,historyRows,state:()=>state,data:()=>data});
let rankFocus;
function openRankSheet() {
  rankFocus=document.activeElement;
  const sheet=$('#phone-rank-sheet');sheet.innerHTML=mobile.ranks();sheet.hidden=false;$('#phone-sheet-backdrop').hidden=false;
  screen.inert=true;$('#app-nav').inert=true;sheet.querySelector('button')?.focus();track('rank_sheet_opened');
}
function closeRankSheet() {
  if($('#phone-rank-sheet').hidden)return;
  $('#phone-rank-sheet').hidden=true;$('#phone-sheet-backdrop').hidden=true;screen.inert=false;$('#app-nav').inert=false;rankFocus?.focus?.();
}
function renderApp(scroll = 0) {
  if(state.app.page==='ranks')state.app.page='home';
  screen.dataset.page=state.app.page;$('#device').dataset.page=state.app.page;
  screen.innerHTML=(mobile[state.app.page]||mobile.home)();
  const nav=$('#app-nav');nav.hidden=state.app.page!=='home';nav.style.display=state.app.page==='home'?'flex':'none';
  nav.innerHTML=[['home','note','내 입소 현황'],['prepare','check','입소 준비'],['mypage','user','마이페이지']].map(([a,i,t])=>button(a,icon(i)+`<span>${t}</span>`,`nav-item ${a==='home'?'active':''}`)).join('');
  const cta=$('#app-cta'),info=state.app.page==='info',guide=state.app.page==='rankGuide';
  cta.hidden=!info&&!guide;cta.classList.toggle('guide-cta',guide);screen.classList.toggle('has-cta',info||guide);
  cta.innerHTML=info||guide?`<div class="cta-gradient">${button('call',guide?'아이사랑 문의하기':'어린이집 문의하기','',guide?'data-provider="아이사랑"':'')}${guide?'<p class="cta-note">순번 산정이나 신청 내역에 관한 문의는<br>아이사랑을 이용해 주세요.</p>':''}</div><div class="home-indicator"></div>`:'';
  $('.os-bar').style.background=state.app.page==='home'?'#f5f6f8':'#fff';
  screen.scrollTop=scroll;
}
function navigate(page, changes={}) {
  const {history, ...current} = state.app;
  history.push({...current,scroll:screen.scrollTop}); state.app.history=history.slice(-30);
  Object.assign(state.app,{page,scroll:0},changes); renderApp(); track('screen_view',{destination:page});
}
function goBack() { const prev=state.app.history.pop(); if(prev)Object.assign(state.app,prev);else Object.assign(state.app,{page:'home',scroll:0});renderApp(state.app.scroll);track('back'); }

function fieldHTML(q,index) {
  const a=answers(),val=a[q.id],id=`q-${task().id}-${q.id}`,err=errors[q.id];
  const textArea=(key,value,placeholder='자유롭게 적어 주세요.')=>`<textarea id="${key}" data-q="${q.id}" ${q.type==='schoolTexts'?`data-sub="${key.split('-').at(-1)}"`:''} placeholder="${e(placeholder)}" maxlength="4000" data-clarity-mask="true">${e(typeof value==='string'?value:'')}</textarea>`;
  let input='';
  if(q.type==='text')input=textArea(id,val);
  if(q.type==='single'||q.type==='multi')input=q.options.map(o=>`<label class="option"><input type="${q.type==='single'?'radio':'checkbox'}" name="${id}" data-q="${q.id}" value="${e(o.id)}" ${(q.type==='single'?val===o.id:Array.isArray(val)&&val.includes(o.id))?'checked':''}><span>${e(o.label)}</span></label>`).join('')+(q.options.some(o=>o.id==='other')?`<div data-other-wrap="${q.id}" ${val==='other'?'':'hidden'}><label class="question-help" for="${id}-other">기타 내용</label><textarea id="${id}-other" data-q="${q.id}Other" maxlength="4000" data-clarity-mask="true">${e(a[q.id+'Other']||'')}</textarea></div>`:'');
  if(q.type==='schoolTexts')input=['sunny','star','forest'].map(key=>`<div class="school-answer"><label for="${id}-${key}">${e(data[key].name)}</label>${textArea(id+'-'+key,val?.[key],'확인한 상황을 적어 주세요.')}</div>`).join('');
  if(q.type==='counts')input=[['recruitment','모집 인원'],['responses','입소 의사 확인 인원']].map(([key,label])=>`<div class="count-row"><label for="${id}-${key}">${label} (명)</label><input id="${id}-${key}" type="number" min="0" max="9999" inputmode="numeric" data-q="${q.id}" data-sub="${key}" value="${e(val?.[key]?.value??'')}" ${val?.[key]?.unknown?'disabled':''} data-clarity-mask="true"><label class="unknown-option"><input type="checkbox" data-q="${q.id}" data-sub="${key}" data-unknown="true" ${val?.[key]?.unknown?'checked':''}>기억나지 않음</label></div>`).join('');
  return `<fieldset class="question-block" data-field="${q.id}"><legend><span class="question-number">${index+1}. </span>${e(q.label)}</legend>${q.help?`<p class="question-help">${e(q.help)}</p>`:''}${input}<div class="field-error" data-error-for="${q.id}" ${err?'':'hidden'}>${e(err||'')}</div></fieldset>`;
}
function renderQuestions() {
  const open=panel.classList.contains('is-open');
  panel.innerHTML=`<div class="question-header"><div><div class="eyebrow">TASK ${state.taskIndex+1}${state.phase==='probe'?' · 추가 확인':''}</div><h2 id="question-heading">${state.phase==='probe'?'추가로 여쭤볼게요':'질문·응답'}</h2></div>${button('close-questions',icon('close'),'close-sheet','aria-label="질문창 닫기"')}</div>${state.phase==='probe'?'<p class="question-help">앞서 작성한 기본 답변은 저장됐어요.</p>':'<p class="question-help">화면을 살펴보며 답해 주세요. 답변은 자동으로 임시 저장돼요.</p>'}<form id="question-form" novalidate data-clarity-mask="true">${questions().map(fieldHTML).join('')}<div id="form-message" class="form-message" role="status"></div><button class="submit-button" type="submit">${state.phase==='basic'&&task().probes?'기본 답변 저장 · 추가 질문으로':state.taskIndex===TASKS.length-1?'답변 저장 · 마무리':'답변 저장 · 다음 상황으로'}</button></form>`;
  panel.classList.toggle('is-open',open); setPanelAccessibility(); save();
}
function setPanelAccessibility() { const narrow=matchMedia('(max-width:1024px)').matches; panel.setAttribute('aria-hidden',String(narrow&&!panel.classList.contains('is-open'))); if(narrow&&panel.classList.contains('is-open')){panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');}else{panel.removeAttribute('role');panel.removeAttribute('aria-modal');} }
function openQuestions() { closeRankSheet();lastFocus=document.activeElement;panel.classList.add('is-open');$('#sheet-backdrop').hidden=false;document.body.classList.add('sheet-open');$('#question-fab').setAttribute('aria-expanded','true');setPanelAccessibility();panel.querySelector('button')?.focus();track('questions_open'); }
function closeQuestions() {panel.classList.remove('is-open');$('#sheet-backdrop').hidden=true;document.body.classList.remove('sheet-open');$('#question-fab').setAttribute('aria-expanded','false');setPanelAccessibility();lastFocus?.focus?.();}
matchMedia('(max-width:1024px)').addEventListener('change',()=>{closeQuestions();setPanelAccessibility();});

function showDialog(html) { if(modal.open)modal.close();modal.innerHTML=html;modal.showModal(); }
function welcome() {
  showDialog(`<h2 id="dialog-heading">입소노트를 살펴봐 주세요</h2><p>어린이집 입소를 기다리는 보호자의 입장에서, 상황을 확인하고 다음 행동을 결정하는 테스트입니다.</p><ol class="welcome-steps"><li>상황을 읽고 휴대폰 화면을 탐색해요.</li><li>옆의 질문에 생각을 적어요.</li><li>세 가지 상황을 차례로 살펴봐요.</li></ol><p>클릭·화면 이동과 작성한 답변이 기록됩니다.</p><label class="consent-row"><input id="study-consent" type="checkbox"><span>테스트 참여와 응답·행동 기록에 동의합니다.</span></label>${SETTINGS.clarityProjectId?'<label class="consent-row"><input id="analytics-consent" type="checkbox"><span>Microsoft Clarity를 통한 행동 분석에 동의합니다. (선택)</span></label>':''}<p id="welcome-error" class="dialog-error" role="status"></p><div class="dialog-actions">${button('begin','시작하기','primary-button')}</div>`);
}
function enterTask() {closeRankSheet();closeQuestions();state.app={page:task().startPage,school:task().school,infoTab:'basic',notificationTab:'rank',notificationChild:'all',history:[],scroll:0};errors={};renderScenario();renderQuestions();renderApp();track('task_started');}
function inquiry(provider='어린이집') {
  inquiryDraft='';track('call_intent',{provider});const target=provider==='아이사랑'?'아이사랑':school().name;
  showDialog(`<h2 id="dialog-heading">어떤 내용을 문의하고 싶으신가요?</h2><p>실제 서비스에서는 ${e(target)}으로 전화가 연결됩니다. 이번 사용성 테스트에서는 전화 연결 대신, 문의하고 싶은 내용을 적어 주세요.</p><label class="question-help" for="inquiry-text">${e(target)}에 묻고 싶은 내용</label><textarea id="inquiry-text" class="dialog-field" rows="5" maxlength="4000" placeholder="자유롭게 적어 주세요." data-clarity-mask="true"></textarea><p id="inquiry-error" class="dialog-error" role="status"></p><div class="dialog-actions">${button('inquiry-cancel','돌아가기','secondary-button')}${button('inquiry-save','답변 저장하고 돌아가기','primary-button',`data-provider="${e(provider)}"`)}</div>`);
}
function showSettings() {
  if(!SETTINGS.previewMode)return;
  showDialog(`<h2 id="dialog-heading">시뮬레이션 설정</h2><p>숫자를 바꿔 현재 브라우저에서 시뮬레이션할 수 있어요. 다른 참여자의 화면에는 영향을 주지 않습니다.</p><form id="settings-form"><div class="settings-grid">${Object.entries(data).map(([id,s])=>`<div style="grid-column:1/-1;font-weight:700;margin-top:10px">${e(s.name)}</div>${[['rank','대기 순번'],['recruitment','모집 인원'],['responses','입소 의사 확인']].map(([k,t])=>`<label>${t}<input type="number" min="0" max="9999" name="${id}.${k}" value="${s[k]}" required></label>`).join('')}`).join('')}</div><p class="question-help">설정 변경은 미리보기 기록에 포함됩니다. 실제 참여자에게 배포할 값은 config.js에서 수정합니다.</p><div class="dialog-actions">${button('close-dialog','닫기','secondary-button')}<button class="primary-button" type="submit">이 기기에 적용</button></div></form>`);
}
function finishDialog() {
  showDialog(`<h2 id="dialog-heading">마지막으로 여쭤볼게요</h2><p>입소노트를 사용하며 가장 편리했던 점이나 불편했던 점을 자유롭게 적어 주세요.</p><textarea id="final-feedback" rows="5" class="dialog-field" maxlength="4000" data-clarity-mask="true">${e(state.finalFeedback||'')}</textarea><div class="dialog-actions">${button('finish-study',SETTINGS.previewMode?'답변 저장 · 시뮬레이션 마치기':'응답 제출하기','primary-button')}</div><p class="dialog-error" id="finish-error" role="status"></p>`);
}
async function submitStudy() {
  if(submitting)return;state.finalFeedback=$('#final-feedback')?.value||state.finalFeedback||'';
  track('study_finish_requested');save();
  if(SETTINGS.previewMode){state.finished=true;save();showCompletion(false);return;}
  if(!validEndpoint(SETTINGS.responseEndpoint,SETTINGS.allowedCollectorOrigins)){$('#finish-error').textContent='응답 수집 주소가 올바르게 설정되지 않았습니다. 답변은 임시 저장되어 있어요.';return;}
  submitting=true;const submitButton=modal.querySelector('[data-action="finish-study"]');submitButton.disabled=true;
  try {
    const submissionId=state.submissionId ||= crypto.randomUUID();save();
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
    let response;
    submitButton.textContent='제출 중…';
    const contentType=new URL(SETTINGS.responseEndpoint).hostname==='script.google.com'?'text/plain;charset=utf-8':'application/json';
    try {response=await fetch(SETTINGS.responseEndpoint,{method:'POST',headers:{'Content-Type':contentType},redirect:'follow',body:JSON.stringify({...exportPayload(state,SETTINGS,TASKS,data),finalFeedback:state.finalFeedback,submissionId}),signal:controller.signal});} finally {clearTimeout(timer);}
    if(!response.ok)throw new Error('HTTP '+response.status);
    const result=await response.json();if(result.ok!==true||result.submissionId!==submissionId)throw new Error('Unconfirmed receipt');
    state.receipt=result.submissionId;state.finished=true;track('study_finished');save();showCompletion(true);
  } catch {$('#finish-error').textContent='전송 완료를 확인하지 못했어요. 답변은 이 기기에 남아 있습니다. 연결을 확인하고 다시 시도해 주세요.';submitButton.disabled=false;submitButton.textContent='다시 제출하기';}
  finally {submitting=false;}
}
function showCompletion(sent) {
  showDialog(`<div class="success-icon" aria-hidden="true">✓</div><h2 id="dialog-heading">${sent?'응답이 제출됐어요':'시뮬레이션을 마쳤어요'}</h2><p>${sent?'참여해 주셔서 감사합니다. 답변이 정상적으로 저장됐습니다.':'답변은 이 기기에 임시 저장됐으며 연구자에게 전송되지 않았어요. 검토용 파일로 내려받을 수 있습니다.'}</p><div class="dialog-actions">${button('download','응답 파일 내려받기','secondary-button')}${button('close-dialog','화면 다시 보기','primary-button')}</div>`);
}
function download() {const payload={...exportPayload(state,SETTINGS,TASKS,data),finalFeedback:state.finalFeedback||'',receipt:state.receipt||null};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`responses-${state.participantId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}

document.addEventListener('click',event=>{
  const t=event.target.closest('[data-action]');if(!t)return;const action=t.dataset.action;
  if(action==='begin'){if(!$('#study-consent').checked){$('#welcome-error').textContent='동의 항목을 확인해 주세요.';return;}state.consent={study:true,analytics:$('#analytics-consent')?.checked||false,at:new Date().toISOString()};state.started=true;modal.close();startAnalytics();enterTask();return;}
  if(action==='open-questions'){openQuestions();return;}if(action==='close-questions'){closeQuestions();return;}
  if(action==='open-settings'){showSettings();return;}if(action==='close-dialog'){modal.close();return;}
  if(action==='download'){download();return;}if(action==='finish-study'){submitStudy();return;}
  if(action==='restart'){showDialog(`<h2 id="dialog-heading">처음부터 다시 시작할까요?</h2><p>이 기기에 저장한 답변과 탐색 기록이 초기화됩니다. 시뮬레이션 설정은 기본값으로 돌아가요.</p><div class="dialog-actions">${button('close-dialog','취소','secondary-button')}${button('restart-confirm','초기화하고 다시 시작','primary-button')}</div>`);return;}
  if(action==='restart-confirm'){closeRankSheet();state=makeState(SETTINGS.revision);data=structuredClone(SCHOOLS);errors={};closeQuestions();save();modal.close();renderScenario();renderQuestions();renderApp();welcome();return;}
  if(action==='inquiry-cancel'){track('call_cancelled');modal.close();return;}
  if(action==='inquiry-save'){const text=$('#inquiry-text').value.trim();if(!text){$('#inquiry-error').textContent='문의하고 싶은 내용을 적어 주세요.';return;}state.inquiries.push({id:crypto.randomUUID(),taskId:task().id,school:state.app.school,provider:t.dataset.provider,page:state.app.page,text,at:new Date().toISOString()});track('inquiry_saved',{provider:t.dataset.provider});modal.close();toast('문의 내용이 저장됐어요.');return;}
  if(!state.started)return;
  if(['prepare','mypage','child'].includes(action)){track('unavailable_feature',{feature:action});toast('현재 준비 중인 기능이에요.');return;}
  if(action==='school'){state.app.school=t.dataset.school;state.app.scroll=0;renderApp();track('school_changed');return;}
  if(action==='notification-tab'){state.app.notificationTab=t.dataset.tab;renderApp(screen.scrollTop);track('notification_tab_changed');return;}
  if(action==='notification-filter'){state.app.notificationChild=t.dataset.child;renderApp(screen.scrollTop);track('notification_child_filter');return;}
  if(action==='notification-open'){if(t.dataset.child!==SETTINGS.childName){track('unavailable_feature',{feature:'other_child_notification'});toast('이 알림의 상세 화면은 준비 중이에요.');return;}navigate('home',{school:t.dataset.school});track('notification_opened');return;}
  if(action==='info-tab'){state.app.infoTab=t.dataset.tab;renderApp();track('school_info_tab_changed');return;}
  if(action==='call'){inquiry(t.dataset.provider);return;}
  if(action==='ranks'){openRankSheet();return;}
  if(action==='close-ranks'){closeRankSheet();return;}
  if(action==='back'){goBack();return;}
  if(['home','notifications','history','recruitment','ranks','rankGuide','info'].includes(action)){navigate(action);return;}
});
panel.addEventListener('input',event=>{
  const el=event.target,q=el.dataset.q;if(!q)return;const a=answers();
  const descriptor=questions().find(x=>x.id===q);
  if(el.type==='radio'){a[q]=el.value;const wrap=panel.querySelector(`[data-other-wrap="${q}"]`);if(wrap)wrap.hidden=el.value!=='other';}
  else if(descriptor?.type==='multi') {a[q]=toggleExclusive(a[q],el.value,el.checked,descriptor.exclusive);panel.querySelectorAll(`[data-q="${q}"]`).forEach(n=>n.checked=a[q].includes(n.value));}
  else if(descriptor?.type==='counts'){a[q] ||= {};a[q][el.dataset.sub] ||= {};if(el.dataset.unknown){a[q][el.dataset.sub].unknown=el.checked;const input=panel.querySelector(`input[type=number][data-q="${q}"][data-sub="${el.dataset.sub}"]`);input.disabled=el.checked;}else a[q][el.dataset.sub].value=el.value;}
  else if(descriptor?.type==='schoolTexts'){a[q] ||= {};a[q][el.dataset.sub]=el.value;}
  else a[q]=el.value;
  const error=panel.querySelector(`[data-error-for="${q}"]`);if(error)error.hidden=true;
  save();
});
document.addEventListener('submit',event=>{
  if(event.target.id==='settings-form'){event.preventDefault();const form=event.target;if(!form.reportValidity())return;const f=new FormData(form);for(const [id,s]of Object.entries(data)){
    for(const k of ['rank','recruitment','responses'])s[k]=Number(f.get(id+'.'+k));
    s.previousRank=Math.max(1,s.rank+SCHOOLS[id].delta);s.delta=s.previousRank-s.rank;
  }state.previewSchools=structuredClone(data);save();modal.close();renderApp(screen.scrollTop);track('preview_data_changed');return;}
  if(event.target.id!=='question-form')return;event.preventDefault();errors=validateQuestions(questions(),answers());
  if(Object.keys(errors).length){for(const [id,message]of Object.entries(errors)){const el=panel.querySelector(`[data-error-for="${id}"]`);el.textContent=message;el.hidden=false;}$('#form-message').textContent='아직 답하지 않은 항목을 확인해 주세요.';panel.querySelector(`[data-field="${Object.keys(errors)[0]}"]`)?.scrollIntoView({block:'center',behavior:'smooth'});return;}
  track(state.phase==='probe'?'probe_answers_saved':'task_answers_saved');
  if(state.phase==='basic'&&task().probes){state.basicBeforeProbes ||= {taskId:task().id,answers:structuredClone(answers()),at:new Date().toISOString()};state.phase='probe';errors={};renderQuestions();panel.scrollTop=0;save();return;}
  if(!state.completed.includes(task().id))state.completed.push(task().id);
  if(state.taskIndex<TASKS.length-1){state.taskIndex++;state.phase='basic';enterTask();showDialog(`<h2 id="dialog-heading">다음 상황을 살펴볼게요</h2><p>${e(task().scenario)}</p><div class="dialog-actions">${button('close-dialog','화면 살펴보기','primary-button')}</div>`);}
  else {save();closeQuestions();finishDialog();}
});
modal.addEventListener('input',event=>{if(event.target.id==='inquiry-text')inquiryDraft=event.target.value;if(event.target.id==='final-feedback'){state.finalFeedback=event.target.value;save();}});
modal.addEventListener('cancel',event=>{if(!state.started){event.preventDefault();return;}if(submitting)event.preventDefault();});
document.addEventListener('keydown',event=>{
  if(!$('#phone-rank-sheet').hidden&&!modal.open){if(event.key==='Escape'){event.preventDefault();closeRankSheet();return;}if(event.key==='Tab'){event.preventDefault();$('#phone-rank-sheet button')?.focus();return;}}
  if(!panel.classList.contains('is-open')||modal.open)return;
  if(event.key==='Escape'){event.preventDefault();closeQuestions();return;}
  if(event.key==='Tab'){const nodes=[...panel.querySelectorAll('button,input,textarea,a')].filter(n=>!n.disabled&&n.offsetParent!==null);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
screen.addEventListener('scroll',()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>{state.app.scroll=screen.scrollTop;save();},200);},{passive:true});
window.addEventListener('pagehide',()=>{state.app.scroll=screen.scrollTop;save();});
document.querySelector('[data-action="open-settings"]').hidden=!SETTINGS.previewMode;
renderScenario();renderQuestions();renderApp(state.app.scroll);
if(!state.started)welcome();else {startAnalytics();if(state.finished)showCompletion(Boolean(state.receipt));}
