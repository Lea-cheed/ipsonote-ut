// Layouts transcribed from Figma → 학부모 최종 (419:8738).
// Survey controls and state remain in app.js; values come from config.js.
export function createMobileScreens(ctx) {
  const {settings:S,e,icon,button,shortTime,updated,koreaStamp,historyRows}=ctx;
  const state=()=>ctx.state(),data=()=>ctx.data(),school=()=>data()[state().app.school];
  const head=title=>`<header class="sub-header">${button('back',icon('back'),'back-button','aria-label="이전 화면"')}<h2>${e(title)}</h2><span></span></header>`;
  const age=()=>e(S.age);
  const row=(label,value)=>`<div class="info-line"><span>${e(label)}</span><span>${e(value)}</span></div>`;
  const badge=()=>`<span class="school-badge">${e(school().type)}</span>`;
  function home() {
    const s=school(),id=state().app.school;
    return `<header class="app-top"><img class="app-logo-image" src="./assets/logo.png" width="155" height="22" alt="입소노트"><div class="app-top-actions">${button('child',`${e(S.childName)} ${icon('down')}`,'child-button')}${button('notifications',icon('bell'),'circle-button','aria-label="알림 보기"')}</div></header>
      <div class="greeting">안녕하세요!<br>${e(S.childName)} 어린이의 <strong>신학기 대기현황</strong> 입니다.</div>
      <div class="school-tabs" role="tablist" aria-label="신청 어린이집">${['sunny','star','forest'].map(key=>button('school',e(data()[key].name),`school-tab ${key===id?'active':''}`,`data-school="${key}" role="tab" aria-selected="${key===id}"`)).join('')}</div>
      <section class="notebook notebook-${id}" aria-label="${e(s.name)} 입소 현황">
        <div class="main-rank"><div class="rank-top"><strong class="rank-number">${s.rank}<small>번</small></strong><span class="delta ${s.delta<0?'down':''}">${s.delta<0?'▼':'▲'} ${Math.abs(s.delta)}</span>${button('history',`내역보기 ${icon('arrow')}`,'history-link')}</div><button type="button" class="rank-reason" data-action="history" aria-label="${e(s.reason)} 순번 변동 내역 보기">${e(s.reason).replace(id==='sunny'?'높은 ':id==='star'?'취소하여 ':'확정되어 ',id==='sunny'?'높은<br>':id==='star'?'취소하여<br>':'확정되어<br>')}</button></div>
        ${s.contactPending?`<div class="contact-banner">${icon('phone')}<div><strong>순차적으로 전화드릴 예정이에요</strong><small>입소 의사 확인을 위한 연락을 기다려 주세요.</small></div></div>`:''}
        <hr class="app-divider"><div class="main-info"><div class="info-row"><span>나의 대기상태</span><strong>${e(s.status)}</strong></div><div class="info-row application-info"><span>신청 정보</span><span>${e(s.type)}<i></i>입소 희망월&nbsp; ${e(S.desiredMonth)}</span></div></div><hr class="app-divider">
        <div class="main-recruitment"><div class="recruit-top"><span class="age-tag">${age()}</span><time>${e(shortTime())}기준</time>${button('recruitment',`모집현황 ${icon('arrow')}`,'recruit-link')}</div><div class="recruit-numbers"><div>모집 인원 <span class="count-value"><strong>${s.recruitment}</strong><small>명</small></span></div><div>입소 의사 확인 <span class="count-value"><strong>${s.responses}</strong><small>명</small></span></div></div></div>
        ${button('ranks','상시·전체 순번 보기','secondary-app-button')}
        <div class="main-links">${button('rankGuide',`<span class="colored-icon">${icon('chart')}</span><span>순번 안내</span>${icon('arrow')}`,'link-row')}${button('info',`<span class="colored-icon">${icon('home')}</span><span>어린이집 안내</span>${icon('arrow')}`,'link-row')}</div>
      </section>`;
  }
  function recruitment() {
    const s=school(),rows=[['만0세',s.recruitment,s.responses],['만1세',4,2],['만2세',3,1],['만3세','—','—'],['만4세','—','—'],['만5세','—','—'],['영아혼합\n(만0~2세)','—','—'],['유아혼합\n(만3~5세)','—','—'],['영유아혼합','—','—'],['특수장애','—','—']];
    return `${head('모집 현황')}<div class="sub-body recruitment-body"><div class="school-meta">${badge()}<span>2027년 신학기</span></div><h3 class="school-identity">${e(s.name)}</h3><div class="summary-box"><div class="recruit-numbers"><div>${age()} 모집 인원<strong>${s.recruitment}<small>명</small></strong></div><div>입소 의사 확인<strong>${s.responses}<small>명</small></strong></div></div></div><p class="app-note">· 입소 의사 확인은 입소를 희망한다고 응답한 인원입니다.</p><div class="table-heading"><strong>반별 모집 현황</strong><time>${e(updated())} 기준</time></div><table class="app-table recruitment-table"><thead><tr><th>연령반</th><th>모집 인원</th><th>입소 의사 확인</th></tr></thead><tbody>${rows.map(([a,n,r],i)=>`<tr><td>${e(a).replaceAll('\n','<br>')}${i===0?'<span class="own-child">우리 아이</span>':''}</td><td>${e(n)}${typeof n==='number'?'명':''}</td><td>${e(r)}${typeof r==='number'?'명':''}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function history() {
    const s=school();
    return `${head(s.name+' 순번 변동 내역')}<div class="sub-body history-body"><div class="history-summary"><span>현재 대기 순번</span><strong>${s.rank}<small>번</small></strong><div><span>${e(S.childName)} · 신학기 · ${age()}</span><time>${e(updated())} 기준</time></div></div><div class="table-heading"><strong>변동 내역</strong><span class="sort-chip">최신순</span></div>${historyRows().map(r=>`<article class="history-item"><div class="history-numbers"><span>${r.from}번</span><span>→</span><strong>${r.to}번</strong></div><div class="history-reason"><p>${e(r.reason)}</p><span class="delta ${r.to>r.from?'down':''}">${r.to>r.from?'▼':'▲'} ${Math.abs(r.from-r.to)}</span></div><time>${e(koreaStamp(r.date))}</time></article>`).join('')}</div>`;
  }
  function notifications() {
    const rank=state().app.notificationTab==='rank';
    const items=rank?[
      {school:'forest',child:S.childName,line:data().forest.reason,rank:`${data().forest.previousRank}번 → ${data().forest.rank}번`,age:S.age,unread:true,highlight:true},
      {school:'star',child:'이하랑',line:'앞 순번 아동 1명이 대기 신청을 취소해\n대기 순번이 올라갔어요.',rank:'6번 → 5번',age:'2세반',unread:true},
      {school:'sunny',child:'이하윤',line:'입소 우선순위가 높은 아동이 신청해\n대기 순번이 한 자리 뒤로 바뀌었어요.',rank:'3번 → 4번',age:'1세반'},
      {school:'sunny',child:S.childName,line:'앞 순번 아동 1명의 입소가 확정되어\n대기 순번이 올라갔어요.',rank:'40번 → 39번',age:S.age,older:true}
    ]:[
      {school:'star',child:S.childName,line:'어린이집에서 입소 의사 확인을 위해 연락드릴 예정이에요.',title:'입소 의사 확인을 위해 연락드려요',age:S.age,unread:true,highlight:true},
      {school:'star',child:'이하랑',line:'어린이집에서 입소 희망 여부를 확인했어요. 다음 안내를 기다려 주세요.',title:'입소 의사가 확인됐어요',age:'2세반'},
      {school:'sunny',child:'이하윤',line:'어린이집에서 요청한 서류와 제출 일정을 확인해 주세요.',title:'입소 서류 제출 요청이 도착했어요',age:'1세반'}
    ];
    const shown=items.filter(i=>state().app.notificationChild==='all'||i.child===state().app.notificationChild);
    const olderDate=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric'}).format(new Date(Date.parse(state().startedAt)-4*864e5));
    return `${head('알림')}<div class="panel-tabs">${button('notification-tab','순번변동',rank?'active':'','data-tab="rank"')}${button('notification-tab','입소진행',!rank?'active':'','data-tab="admission"')}</div><div class="notification-filters">${[['all','전체'],[S.childName,S.childName],['이하랑','이하랑'],['이하윤','이하윤']].map(([id,name])=>button('notification-filter',e(name),`filter-chip ${state().app.notificationChild===id?'active':''}`,`data-child="${e(id)}"`)).join('')}</div><div class="sub-body notification-body"><div class="date-label">오늘</div>${shown.map(i=>`${i.older?`<div class="date-label">${e(olderDate)}</div>`:''}${button('notification-open',`<small class="notification-child ${i.unread?'unread':''}">${e(i.child)} · ${e(data()[i.school].name)}</small><strong>${rank?'대기 순번 '+e(i.rank):e(i.title)}</strong><p>${e(i.line).replaceAll('\n','<br>')}</p><div class="notification-meta"><span>신학기 · ${e(i.age)}</span><time>${e(shortTime())}</time></div>`,`notification ${i.highlight?'highlight':''}`,`data-school="${i.school}" data-child="${e(i.child)}"`)}`).join('')}</div>`;
  }
  function ranks() {
    const s=school();
    return `<button class="sheet-handle" data-action="close-ranks" aria-label="순번 보기 닫기"></button><h2 id="ranks-heading">상시·전체 순번 보기</h2><p class="rank-sheet-school">${e(s.name)}</p><div class="rank-kind current"><div><h3>신학기 대기 순번</h3><strong>${s.rank}번</strong></div><p>${e(S.desiredMonth)}까지 입소를 희망하는<br>아동 중 순번이에요.</p></div><div class="rank-kind"><div><h3>상시 대기 순번</h3><strong>${s.regularRank===null?'－':s.regularRank+'번'}</strong></div><p>다음 달까지 입소를 희망하는 아동 중 순번이에요.<br>입소 희망월 한 달 전부터 확인할 수 있어요.</p></div><div class="rank-kind"><div><h3>전체 대기 순번</h3><strong>${s.allRank}번</strong></div><p>입소 희망월과 관계없이 전체 대기<br>아동 중 순번이에요.</p></div>`;
  }
  function rankGuide() {
    return `${head('순번 안내')}<div class="sub-body guide-body"><section><h3>대기 순번은 어떻게 정해지나요?</h3><p class="guide-intro">같은 어린이집도 누구와 비교하느냐에 따라 순번이 달라요.</p><dl class="rank-definitions"><div><dt>· 전체</dt><dd>희망월과 관계없이 전체 대기 순서입니다.</dd></div><div><dt>· 상시</dt><dd>조회하는 달의 다음 달까지 입소를 희망한 순서입니다.</dd></div><div><dt>· 신학기</dt><dd>해당 신학기 3월까지 입소를 희망한 순서입니다.</dd></div></dl></section><section><h3>입소희망월에 따라 다르게 표시 돼요.</h3><p class="guide-intro">예시) 2026년 11월에 확인할 때</p><table class="app-table guide-table"><thead><tr><th>입소희망월</th><th>전체</th><th>상시</th><th>신학기</th></tr></thead><tbody>${[['2026년 12월','○','○','○'],['2027년 3월','○','－','○'],['2027년 4월','○','－','－']].map(r=>'<tr>'+r.map(v=>'<td>'+e(v)+'</td>').join('')+'</tr>').join('')}</tbody></table><p class="app-note">✓ &nbsp;4월 입소를 희망하면 3월부터 상시 순번이 보여요.</p></section></div>`;
  }
  function info() {
    const s=school(),tab=state().app.infoTab;
    const basic=`<div class="nursery-gallery"><img src="./assets/nursery-1.webp" alt="어린이집 실내 전경"><div class="gallery-dots" aria-hidden="true">${Array.from({length:6},(_,i)=>`<i class="${i===1?'active':''}"></i>`).join('')}</div></div><div class="info-content"><div class="info-identity"><h3>${e(s.name)}</h3>${badge()}</div><section class="info-box"><h3>기본 정보</h3>${row('주소',s.address)}${row('운영시간','평일 07:30~19:30')}${row('휴무','토·일요일 및 공휴일')}${row('전화','02-3344-1010')}</section><section class="info-box"><h3>위치 및 방문 안내</h3>${row('오시는 길','화곡역에서 도보 약 7분')}${row('출입구','공동현관 옆 어린이집 전용 출입구')}${row('주차','방문 전 문의')}</section><section class="info-box"><h3>보육 및 시설</h3>${row('시설 정원',s.capacity+'명')}${row('보육 서비스','기본보육 · 연장보육')}${row('통학차량','운영 안 함')}</section></div>`;
    const mixed=Math.min(3,s.enrolled),young=Math.max(0,s.enrolled-mixed-8);
    const facilityRows=[['만 0세',1,3],['만 1세',1,5],['만 2세',1,young],['만 3세',0,0],['만 4세',0,0],['만 5세',0,0],['영아혼합 (만 0~2세)',1,mixed],['영유아혼합 (만 2~3세)',0,0],['유아혼합 (만 3~5세)',0,0],['특수',0,0],['총계',4,s.enrolled]];
    const facility=`<div class="info-content facility-content"><section><h3>시설 현황</h3><table class="app-table facility-summary"><tbody>${[['보육실 수','4'],['놀이터 수','1'],['통학차량','운영']].map(([a,b])=>`<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</tbody></table></section><section><h3>연령별 학급 및 아동 수</h3><table class="app-table facility-table"><thead><tr><th>직위</th><th>학급 수</th><th>아동 수</th></tr></thead><tbody>${facilityRows.map(r=>'<tr>'+r.map(v=>'<td>'+e(v)+'</td>').join('')+'</tr>').join('')}</tbody></table></section></div>`;
    const jobs=[['원장',1],['보육교사',s.teachers],['특수교사',0],['치료교사',0],['영양사',0],['보건 인력',0],['간호조무사',0],['조리원',1],['사무직원',0],['총계',s.teachers+2]];
    const colors=['#00a38d','#828cff','#e269c3','#f6951f'];
    const teacher=`<div class="info-content teacher-content"><section><h3>교사 아동비율</h3><p class="teacher-description">보육교사 1명당 아동 약 ${(s.enrolled/s.teachers).toFixed(1)}명이에요.</p><div class="ratio-bar"><i style="width:${100*s.teachers/(s.teachers+s.enrolled)}%"></i></div><div class="ratio-legend"><span><i></i>보육교사 <b>${s.teachers}명</b></span><span><i></i>아동 <b>${s.enrolled}명</b></span></div></section><section><h3>현 기관 근속 연수</h3><p class="teacher-description">1년 미만이 가장 많아요.</p><div class="tenure-chart"><div class="donut" role="img" aria-label="1년 미만 40%, 1~2년 미만 20%, 2~4년 미만 20%, 4~6년 미만 20%"></div><div class="tenure-legend">${['1년 미만','1~2년 미만','2~4년 미만','4~6년 미만'].map((label,i)=>`<div><i style="background:${colors[i]}"></i><span>${label}</span><strong>${i===0?40:20}%</strong></div>`).join('')}</div></div></section><section><h3>직위별 교직원 수</h3><table class="app-table staff-table"><thead><tr><th>직위</th><th>인원</th></tr></thead><tbody>${jobs.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table></section></div>`;
    return `${head('어린이집 안내')}<div class="panel-tabs">${[['basic','기본정보'],['facility','학급시설'],['teacher','교사현황']].map(([id,label])=>button('info-tab',label,tab===id?'active':'',`data-tab="${id}"`)).join('')}</div>${tab==='facility'?facility:tab==='teacher'?teacher:basic}`;
  }
  return {home,recruitment,history,notifications,ranks,rankGuide,info};
}
