import {SETTINGS, SCHOOLS, TASKS} from './config.js';
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
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.info}"/></svg>`; }
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
function renderHome() {
  const s = school();
  return `<header class="app-top"><div class="app-logo"><span class="brand-symbol" aria-hidden="true"></span>입소노트</div><div class="app-top-actions">${button('child',`${e(SETTINGS.childName)} ${icon('down')}`,'child-button')}${button('notifications',icon('bell'),'circle-button','aria-label="알림 보기"')}</div></header>
    <div class="greeting">안녕하세요!<br>${e(SETTINGS.childName)} 어린이의 <strong>신학기 대기현황</strong> 입니다.</div>
    <div class="school-tabs" role="tablist" aria-label="신청 어린이집">${['sunny','star','forest'].map(id=>button('school',e(data[id].name),`school-tab ${id===state.app.school?'active':''}`,`data-school="${id}" role="tab" aria-selected="${id===state.app.school}"`)).join('')}</div>
    <section class="notebook" aria-label="${e(s.name)} 입소 현황"><div class="rank-top"><strong class="rank-number">${s.rank}<small>번</small></strong><span class="delta ${s.delta<0?'down':''}">${s.delta<0?'▼':'▲'} ${Math.abs(s.delta)}</span>${button('history',`내역보기 ${icon('arrow')}`,'history-link')}</div>
    <p class="rank-reason">${e(s.reason)}</p>
    ${s.contactPending?`<div class="contact-banner">${icon('phone')}<div><strong>순차적으로 전화드릴 예정이에요</strong><small>입소 의사 확인을 위한 연락을 기다려 주세요.</small></div></div>`:''}
    <hr class="app-divider"><div class="info-row"><span>나의 대기상태</span><strong>${e(s.status)}</strong></div><div class="info-row"><span>신청 정보</span><span>${e(s.type)} · 입소 희망월&nbsp; ${e(SETTINGS.desiredMonth)}</span></div><hr class="app-divider">
    <div class="recruit-top"><span class="age-tag">${e(SETTINGS.age)}</span><time>${e(shortTime())} 기준</time>${button('recruitment',`모집현황 ${icon('arrow')}`,'recruit-link')}</div>
    <div class="recruit-numbers"><div>모집 인원 <strong>${s.recruitment}</strong>명</div><div>입소 의사 확인 <strong>${s.responses}</strong>명</div></div>
    ${button('ranks','상시·전체 순번 보기','secondary-app-button')}
    ${button('rankGuide',`<span class="colored-icon">${icon('chart')}</span>순번 안내 ${icon('arrow')}`,'link-row')}
    ${button('info',`<span class="colored-icon">${icon('home')}</span>어린이집 안내 ${icon('arrow')}`,'link-row')}</section><div style="height:25px"></div>`;
}
function renderRecruitment() {
  const s=school();
  const rows=[['만0세',s.recruitment,s.responses],['만1세',4,2],['만2세',3,1],['만3세','—','—'],['만4세','—','—'],['만5세','—','—'],['영아혼합 (만0~2세)','—','—'],['유아혼합 (만3~5세)','—','—'],['영유아혼합','—','—'],['특수장애','—','—']];
  return `${subHeader('모집 현황')}<div class="sub-body"><div class="school-type">${e(s.type)} &nbsp; ${e(SETTINGS.desiredMonth.slice(0,4))}년 신학기</div><div class="school-identity">${e(s.name)}</div><div class="summary-box"><div class="recruit-numbers"><div>${e(SETTINGS.age)} 모집 인원<strong>${s.recruitment}<small>명</small></strong></div><div>입소 의사 확인<strong>${s.responses}<small>명</small></strong></div></div></div><p class="app-note">· 입소 의사 확인은 입소를 희망한다고 응답한 인원입니다.</p><div class="table-heading"><strong>반별 모집 현황</strong><time>${e(updated())} 기준</time></div><table class="app-table"><thead><tr><th>연령반</th><th>모집 인원</th><th>입소 의사 확인</th></tr></thead><tbody>${rows.map(([age,n,r],i)=>`<tr><td>${e(age)} ${i===0?'<span class="own-child">우리 아이</span>':''}</td><td>${e(n)}${typeof n==='number'?'명':''}</td><td>${e(r)}${typeof r==='number'?'명':''}</td></tr>`).join('')}</tbody></table></div>`;
}
function historyRows() {
  const s=school(); const base=Date.parse(state.startedAt);
  return [
    {from:s.previousRank,to:s.rank,reason:s.reason,date:base},
    {from:s.previousRank+1,to:s.previousRank,reason:'앞 순번 아동 1명이 대기 신청을 취소하여 대기 순번이 올라갔어요.',date:base-2*864e5},
    {from:s.previousRank,to:s.previousRank+1,reason:'입소 우선순위가 높은 아동이 신청하여 대기 순번이 한 자리 뒤로 바뀌었어요.',date:base-3*864e5},
    {from:s.previousRank+3,to:s.previousRank,reason:'앞 순번 아동 3명의 입소가 확정되어 대기 순번이 올라갔어요.',date:base-5*864e5},
  ];
}
function renderHistory() {
  const s=school();
  return `${subHeader('순번 변동 내역')}<div class="sub-body"><div class="school-type">${e(s.name)} · ${e(SETTINGS.childName)} · 신학기 · ${e(SETTINGS.age)}</div><div class="rank-summary"><span>현재 대기 순번</span><strong class="rank-number">${s.rank}<small>번</small></strong></div><p class="app-note">${e(updated())} 기준</p><div class="table-heading"><strong>변동 내역</strong><span>최신순</span></div>${historyRows().map(r=>`<article class="history-item"><div class="history-numbers"><span>${r.from}번</span>${icon('arrow')}<span>${r.to}번</span><span class="delta ${r.to>r.from?'down':''}">${r.to>r.from?'▼':'▲'} ${Math.abs(r.from-r.to)}</span></div><p>${e(r.reason)}</p><time>${e(koreaStamp(r.date))}</time></article>`).join('')}</div>`;
}
function renderNotifications() {
  const rank=state.app.notificationTab==='rank';
  const items=rank ? [
    {school:'forest',child:'이하임',line:data.forest.reason,rank:`${data.forest.previousRank}번 → ${data.forest.rank}번`},
    {school:'star',child:'이하랑',line:'앞 순번 아동 1명이 대기 신청을 취소해 대기 순번이 올라갔어요.',rank:'6번 → 5번'},
    {school:'sunny',child:'이하윤',line:'입소 우선순위가 높은 아동이 신청해 대기 순번이 한 자리 뒤로 바뀌었어요.',rank:'3번 → 4번'},
  ] : [
    {school:'star',child:'이하임',line:'어린이집에서 연락드릴 예정이에요. 등록한 연락처로 오는 전화를 확인해 주세요.',title:'입소 의사 확인을 위해 연락드려요'},
    {school:'star',child:'이하랑',line:'어린이집에서 입소 희망 여부를 확인했어요. 다음 안내를 기다려 주세요.',title:'입소 의사가 확인됐어요'},
    {school:'sunny',child:'이하윤',line:'어린이집에서 요청한 서류와 제출 일정을 확인해 주세요.',title:'입소 서류 제출 요청이 도착했어요'},
  ];
  const shown=items.filter(i=>state.app.notificationChild==='all'||i.child===state.app.notificationChild);
  return `${subHeader('알림')}<div class="panel-tabs">${button('notification-tab','순번변동',rank?'active':'','data-tab="rank"')}${button('notification-tab','입소진행',!rank?'active':'','data-tab="admission"')}</div><div class="sub-body"><div class="notification-filters">${[['all','전체'],['이하임','이하임'],['이하랑','이하랑'],['이하윤','이하윤']].map(([id,name])=>button('notification-filter',name,`filter-chip ${state.app.notificationChild===id?'active':''}`,`data-child="${id}"`)).join('')}</div><div class="date-label">오늘</div>${shown.map(i=>button('notification-open',`<small>${e(i.child)} · ${e(data[i.school].name)}</small><strong>${rank?'대기 순번 '+e(i.rank):e(i.title)}</strong><p>${e(i.line)}</p><small>신학기 · ${e(SETTINGS.age)}</small><time>${e(shortTime())}</time>`,'notification',`data-school="${i.school}" data-child="${e(i.child)}"`)).join('')}</div>`;
}
function renderRanks() {
  const s=school();
  return `${subHeader('상시·전체 순번 보기')}<div class="sub-body"><div class="school-identity">${e(s.name)}</div><div class="rank-kind"><h3>신학기 대기 순번</h3><strong>${s.rank}번</strong><p>${e(SETTINGS.desiredMonth)}까지 입소를 희망하는 아동 중 순번이에요.</p></div><div class="rank-kind"><h3>상시 대기 순번</h3><strong>${s.regularRank===null?'—':s.regularRank+'번'}</strong><p>다음 달까지 입소를 희망하는 아동 중 순번이에요.<br>입소 희망월 한 달 전부터 확인할 수 있어요.</p></div><div class="rank-kind"><h3>전체 대기 순번</h3><strong>${s.allRank}번</strong><p>입소 희망월과 관계없이 전체 대기 아동 중 순번이에요.</p></div>${button('rankGuide','순번 안내 보기','app-outline')}</div>`;
}
function renderRankGuide() {
  return `${subHeader('순번 안내')}<div class="sub-body"><h3>대기 순번은 어떻게 정해지나요?</h3><p class="app-note">같은 어린이집도 누구와 비교하느냐에 따라 순번이 달라요.</p>${[['전체','입소 희망월과 관계없이 전체 대기 순서입니다.'],['상시','조회하는 달의 다음 달까지 입소를 희망한 순서입니다.'],['신학기','해당 신학기 3월까지 입소를 희망한 순서입니다.']].map(([h,p])=>`<div class="guide-block"><h3>${h}</h3><p>${p}</p></div>`).join('')}<h3>입소 희망월에 따라 다르게 표시돼요.</h3><p class="app-note">상시 대기 순번은 입소 희망월 한 달 전부터 확인할 수 있어요.</p><hr class="app-divider"><p class="app-note">순번 산정이나 신청 내역에 관한 문의는 아이사랑을 이용해 주세요.</p>${button('call','아이사랑 문의하기','app-primary','data-provider="아이사랑"')}</div>`;
}
function renderInfo() {
  const s=school(), tab=state.app.infoTab;
  const rows = arr => arr.map(([a,b])=>`<div class="info-line"><span>${e(a)}</span><span>${e(b)}</span></div>`).join('');
  const basic=`<div class="school-type">${e(s.type)}</div><div class="school-identity">${e(s.name)}</div><section class="info-box"><h3>기본 정보</h3>${rows([['주소',s.address],['운영시간','평일 07:30~19:30'],['휴무','토·일요일 및 공휴일']])}</section><section class="info-box"><h3>위치 및 방문 안내</h3>${rows([['오시는 길','인근 지하철역에서 도보 약 7분'],['출입구','어린이집 전용 출입구'],['주차','방문 전 문의']])}</section><section class="info-box"><h3>보육 및 시설</h3>${rows([['시설 정원',s.capacity+'명'],['보육 서비스','기본보육 · 연장보육'],['통학차량','운영 안 함']])}</section>`;
  const facility=`<h3>시설 현황</h3>${rows([['보육실 수','4개'],['놀이터 수','1개'],['통학차량','운영 안 함']])}<h3>연령별 학급 및 아동 수</h3><table class="app-table"><thead><tr><th>연령반</th><th>학급 수</th><th>아동 수</th></tr></thead><tbody>${[['만0세',2,6],['만1세',1,5],['만2세',1,s.enrolled-11],['만3세','—','—'],['만4세','—','—'],['만5세','—','—']].map(r=>'<tr>'+r.map(c=>`<td>${e(c)}</td>`).join('')+'</tr>').join('')}</tbody></table>`;
  const teacher=`<h3>교사 아동비율</h3><p class="app-note">보육교사 1명당 아동 약 ${(s.enrolled/s.teachers).toFixed(1)}명이에요.</p><div class="summary-box"><div class="recruit-numbers"><div>보육교사<strong>${s.teachers}명</strong></div><div>아동<strong>${s.enrolled}명</strong></div></div></div><h3>현 기관 근속 연수</h3><p class="app-note">1년 미만이 가장 많아요.</p><div class="tiny-chart">${[['1년 미만',40,'#00a38d'],['1~2년',20,'#828cff'],['2~4년',20,'#e269c3'],['4~6년',20,'#f6951f']].map(([label,n,color])=>`<div class="chart-col">${n}%<i style="height:${n*2}px;background:${color}"></i><span>${label}</span></div>`).join('')}</div><h3>직위별 교직원 수</h3>${rows([['원장','1명'],['보육교사',s.teachers+'명'],['조리원','1명']])}`;
  return `${subHeader('어린이집 안내')}<div class="panel-tabs">${[['basic','기본정보'],['facility','학급시설'],['teacher','교사현황']].map(([id,name])=>button('info-tab',name,id===tab?'active':'',`data-tab="${id}"`)).join('')}</div><div class="sub-body">${tab==='basic'?basic:tab==='facility'?facility:teacher}<p style="margin-top:24px">${button('call','어린이집 문의하기','app-primary','data-provider="어린이집"')}</p></div>`;
}
function renderApp(scroll = 0) {
  const renders={home:renderHome,recruitment:renderRecruitment,history:renderHistory,notifications:renderNotifications,ranks:renderRanks,rankGuide:renderRankGuide,info:renderInfo};
  screen.innerHTML=(renders[state.app.page]||renderHome)();
  const nav=$('#app-nav'); nav.hidden=state.app.page!=='home';
  nav.style.display=state.app.page==='home'?'grid':'none';
  nav.innerHTML=[['home','note','내 입소 현황'],['prepare','check','입소 준비'],['mypage','user','마이페이지']].map(([a,i,t])=>button(a,icon(i)+`<span>${t}</span>`,`nav-item ${a==='home'?'active':''}`)).join('');
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
function openQuestions() { lastFocus=document.activeElement;panel.classList.add('is-open');$('#sheet-backdrop').hidden=false;document.body.classList.add('sheet-open');$('#question-fab').setAttribute('aria-expanded','true');setPanelAccessibility();panel.querySelector('button')?.focus();track('questions_open'); }
function closeQuestions() {panel.classList.remove('is-open');$('#sheet-backdrop').hidden=true;document.body.classList.remove('sheet-open');$('#question-fab').setAttribute('aria-expanded','false');setPanelAccessibility();lastFocus?.focus?.();}
matchMedia('(max-width:1024px)').addEventListener('change',()=>{closeQuestions();setPanelAccessibility();});

function showDialog(html) { if(modal.open)modal.close();modal.innerHTML=html;modal.showModal(); }
function welcome() {
  showDialog(`<h2 id="dialog-heading">입소노트를 살펴봐 주세요</h2><p>어린이집 입소를 기다리는 보호자의 입장에서, 상황을 확인하고 다음 행동을 결정하는 테스트입니다.</p><ol class="welcome-steps"><li>상황을 읽고 휴대폰 화면을 탐색해요.</li><li>옆의 질문에 생각을 적어요.</li><li>세 가지 상황을 차례로 살펴봐요.</li></ol><p>${SETTINGS.previewMode?'현재는 시뮬레이션 버전입니다. 작성한 답변과 클릭·이동 기록은 이 기기에만 임시 저장돼요.':'클릭·화면 이동과 작성한 답변이 기록됩니다.'}</p><label class="consent-row"><input id="study-consent" type="checkbox"><span>테스트 참여와 응답·행동 기록에 동의합니다.</span></label>${SETTINGS.clarityProjectId?'<label class="consent-row"><input id="analytics-consent" type="checkbox"><span>Microsoft Clarity를 통한 행동 분석에 동의합니다. (선택)</span></label>':''}<p id="welcome-error" class="dialog-error" role="status"></p><div class="dialog-actions">${button('begin','시작하기','primary-button')}</div>`);
}
function enterTask() {closeQuestions();state.app={page:task().startPage,school:task().school,infoTab:'basic',notificationTab:'rank',notificationChild:'all',history:[],scroll:0};errors={};renderScenario();renderQuestions();renderApp();track('task_started');}
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
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    let response;
    try {response=await fetch(SETTINGS.responseEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...exportPayload(state,SETTINGS,TASKS,data),finalFeedback:state.finalFeedback,submissionId}),signal:controller.signal});} finally {clearTimeout(timer);}
    if(!response.ok)throw new Error('HTTP '+response.status);
    const result=await response.json();if(result.ok!==true||result.submissionId!==submissionId)throw new Error('Unconfirmed receipt');
    state.receipt=result.submissionId;state.finished=true;track('study_finished');save();showCompletion(true);
  } catch {$('#finish-error').textContent='전송 완료를 확인하지 못했어요. 답변은 이 기기에 남아 있습니다. 연결을 확인하고 다시 시도해 주세요.';submitButton.disabled=false;}
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
  if(action==='restart-confirm'){state=makeState(SETTINGS.revision);data=structuredClone(SCHOOLS);errors={};closeQuestions();save();modal.close();renderScenario();renderQuestions();renderApp();welcome();return;}
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
  if(!panel.classList.contains('is-open')||modal.open)return;
  if(event.key==='Escape'){event.preventDefault();closeQuestions();return;}
  if(event.key==='Tab'){const nodes=[...panel.querySelectorAll('button,input,textarea,a')].filter(n=>!n.disabled&&n.offsetParent!==null);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
screen.addEventListener('scroll',()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>{state.app.scroll=screen.scrollTop;save();},200);},{passive:true});
window.addEventListener('pagehide',()=>{state.app.scroll=screen.scrollTop;save();});
$('#preview-notice').hidden=!SETTINGS.previewMode;
document.querySelector('[data-action="open-settings"]').hidden=!SETTINGS.previewMode;
$('.preview-badge').hidden=!SETTINGS.previewMode;
renderScenario();renderQuestions();renderApp(state.app.scroll);
if(!state.started)welcome();else {startAnalytics();if(state.finished)showCompletion(Boolean(state.receipt));}
