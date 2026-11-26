// 예시 데이터와 문항은 이 파일에서 수정합니다. 실제 참여자 답변을 넣지 마세요.
export const SETTINGS = {
  revision: 'ut-2026-11-26-v2',
  previewMode: false,
  clarityProjectId: '',
  // HTTPS로 JSON을 받아 저장 성공 시 {ok:true, submissionId:"..."}를 반환하는 수집 주소.
  // 비공개 Google Sheets에 쓰는 웹 앱 주소. 응답 조회 API는 제공하지 않습니다.
  responseEndpoint: 'https://script.google.com/macros/s/AKfycbxxdS2-KqbShTe1CS0fFBbBmc1RkkcEVFg18f8yioX_aUEv27SSGcnlPFmBhMrOyvkd/exec',
  allowedCollectorOrigins: ['https://script.google.com'],
  childName: '이하임',
  desiredMonth: '2027년 3월',
  age: '0세반',
};

export const SCHOOLS = {
  star: {
    name: '별빛 어린이집', rank: 4, previousRank: 5, delta: 1,
    reason: '앞 순번의 아동 1명이 대기신청을 취소하여 대기 순번이 올라갔어요.',
    status: '신학기 확정 및 증빙', contactPending: true,
    recruitment: 9, responses: 9, allRank: 52, regularRank: null,
    type: '국공립', address: '서울 강서구 까치산로22길 10',
    capacity: 20, teachers: 5, enrolled: 18,
  },
  sunny: {
    name: '해맑은 어린이집', rank: 39, previousRank: 27, delta: -12,
    reason: '입소 우선순위 점수가 더 높은 아동 12명이 대기 명단에 추가됐어요.',
    status: '입소대기 신청', contactPending: false,
    recruitment: 18, responses: 0, allRank: 81, regularRank: null,
    type: '국공립', address: '서울 강서구 화곡로 00',
    capacity: 40, teachers: 9, enrolled: 35,
  },
  forest: {
    name: '숲속 어린이집', rank: 8, previousRank: 17, delta: 9,
    reason: '앞 순번의 아동 9명의 입소가 확정되어 대기 순번이 올라갔어요.',
    status: '입소대기 신청', contactPending: false,
    recruitment: 9, responses: 9, allRank: 56, regularRank: null,
    type: '국공립', address: '서울 강서구 강서로 00',
    capacity: 30, teachers: 7, enrolled: 25,
  },
};

const choice = (id, label) => ({ id, label });
const actions = [
  choice('wait', '어린이집에서 연락이 올 때까지 기다린다.'),
  choice('call', '지금 어린이집에 전화해 입소 가능 여부를 확인한다.'),
  choice('search', '다른 어린이집을 더 알아본다.'),
  choice('unclear', '현재 정보만으로 판단하기 어렵다.'),
  choice('other', '기타 : 직접 입력'),
];

export const TASKS = [
  {
    id: 'task-1', title: '입소 연락을 기다릴지 판단하기', school: 'star', startPage: 'home',
    scenario: '신학기 입소를 기다리고 있는데 아직 연락을 받지 못했습니다. 현재 상황을 확인하고 다음 행동을 결정해 주세요.',
    questions: [
      { id: 'understanding', type: 'text', label: '현재 어떤 상황이라고 이해하셧나요?' },
      { id: 'nextAction', type: 'single', label: '실제라면 다음으로 무엇을 하시겠어요?', options: [
        choice('call', '지금어린이집에 전화한다.'),
        choice('wait_then_call', '1~3일동안 기다리고, 연락이 없으면 전화한다.'),
        choice('wait', '1~3일이 지나도 어린이집에서 연락할 때까지 기다린다.'),
        choice('unclear', '현재 정보만으로 판단하기 어렵다.'),
        choice('other', '기타 : 직접입력'),
      ] },
      { id: 'reason', type: 'text', label: '이렇게 판단하신 이유를 말씀해주세요.' },
      { id: 'missing', type: 'text', label: '추가로 확인하고 싶은 정보가 있나요? 있으시다면 말씀해주세요.', help: '없다면 ‘없음’이라고 적어 주세요.' },
    ],
  },
  {
    id: 'task-2', title: '순번 변동 후 입소 가능성 판단하기', school: 'forest', startPage: 'notifications',
    scenario: '신학기 입소를 기다리던 중, 숲속 어린이집의 대기 순번이 앞당겨졌다는 알림을 받았습니다. 현재 상황을 확인하고 다음 행동을 결정해 주세요.',
    questions: [
      { id: 'understanding', type: 'text', label: '현재 숲속 어린이집의 입소 상황을 어떻게 이해하셨나요?' },
      { id: 'nextAction', type: 'single', label: '실제라면 다음으로 무엇을 하시겠어요?', options: actions },
      { id: 'reason', type: 'text', label: '이렇게 판단하신 이유를 말씀해 주세요. 화면에서 참고한 정보가 있다면 함께 적어 주세요.' },
      { id: 'missing', type: 'text', label: '추가로 확인하고 싶은 정보가 있나요? 있다면 무엇이며, 어떻게 확인하시겠어요?', help: '없다면 ‘없음’이라고 적어 주세요.' },
    ],
    probes: [
      { id: 'counts', type: 'counts', label: '화면에서 모집 인원과 입소 의사 확인 인원은 각각 몇 명으로 보셨나요?' },
      { id: 'countMeaning', type: 'text', label: '이 두 인원이 현재 우리 아이의 입소 가능성과 어떤 관계가 있다고 생각하셨나요?' },
    ],
  },
  {
    id: 'task-3', title: '어린이집을 비교하고 대기 유지 결정하기', school: 'sunny', startPage: 'home',
    scenario: '아이가 2027년 3월부터 어린이집에 다니기를 희망하며, 해맑은·별빛·숲속 어린이집에 대기를 신청해 둔 상태입니다. 서비스를 살펴보고 어느 어린이집의 대기를 유지할지, 다음으로 어떻게 할지 결정해 주세요.',
    questions: [
      { id: 'understanding', type: 'schoolTexts', label: '각 어린이집의 현재 입소 상황을 어떻게 이해하셨나요?', help: '살펴보지 않았거나 판단하기 어렵다면 그렇게 적어 주세요.' },
      { id: 'keep', type: 'multi', label: '어느 어린이집의 대기를 유지하시겠어요? (복수 선택 가능)', exclusive: ['none', 'unclear'], options: [
        choice('sunny', '해맑은 어린이집'), choice('star', '별빛 어린이집'), choice('forest', '숲속 어린이집'),
        choice('none', '유지할 곳이 없다.'), choice('unclear', '현재 정보만으로 판단하기 어렵다.'),
      ], help: '‘유지할 곳이 없다’와 ‘판단하기 어렵다’는 다른 항목과 함께 선택할 수 없습니다.' },
      { id: 'nextAction', type: 'single', label: '실제라면 가장 먼저 무엇을 하시겠어요?', options: [
        choice('wait', '선택한 어린이집에서 연락이 올 때까지 기다린다.'),
        choice('call', '어린이집에 전화해 추가 정보를 확인한다.'),
        choice('search', '다른 어린이집을 더 알아본다.'),
        choice('unclear', '현재 정보만으로 판단하기 어렵다.'), choice('other', '기타 : 직접 입력'),
      ] },
      { id: 'reason', type: 'text', label: '이렇게 판단하신 이유를 말씀해 주세요. 어린이집을 비교할 때 참고한 정보가 있다면 함께 적어 주세요.' },
      { id: 'missing', type: 'text', label: '추가로 확인하고 싶은 정보가 있나요? 있다면 무엇이며, 어떻게 확인하시겠어요?', help: '없다면 ‘없음’이라고 적어 주세요.' },
    ],
  },
];
