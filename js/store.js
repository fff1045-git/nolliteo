// 저장소 — 포인트·출석·플레이 시간·리뷰·미션·이어하기를 localStorage 한 곳에 모은다.
// 나중에 Supabase로 바꿀 때 이 파일만 고치면 되도록, 화면 코드는 여기 함수만 쓴다.
//
// 원칙: 포인트는 게임 점수·승패·확률과 연결하지 않는다. 참여 활동(출석·플레이 시간·리뷰·친구)에만 준다.

const KEY = 'nolliteo.v1';
const listeners = new Set();

const blank = () => ({
  points: 0,
  pointLog: [],                       // [{ d, n, why }]
  attendance: { last: null, streak: 0, chestOn: null },
  playtime: { total: {}, daily: {} }, // total[slug] = 초, daily[date][slug] = 초
  lastPlayed: {},                     // slug → timestamp
  reviews: [],                        // [{ id, slug, rec, text, playSec, date }]
  helpful: [],                        // 내가 "도움돼요" 누른 리뷰 id
  missions: {},                       // date → { key: true }
  flags: {},                          // date → { invited: true }
  saves: {},                          // slug → 게임이 PG.save로 보낸 데이터
  friends: [],                        // [{ id, at }] 내가 추가한 친구
  playedWith: {},                     // id → { slug, at, count } 같이 플레이한 기록
  myCode: null,                       // 내 친구 코드 (NOL-XXXX)
});

let S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Object.assign(blank(), JSON.parse(raw));
  } catch { /* 사생활 보호 모드 등 — 메모리로만 동작 */ }
  return blank();
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장 실패해도 화면은 동작 */ }
  listeners.forEach(fn => fn(S));
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// 다른 탭(예: 홈 화면 런처)에서 바뀐 값 반영
window.addEventListener('storage', e => { if (e.key === KEY) { S = load(); listeners.forEach(fn => fn(S)); } });

// ---------- 날짜 ----------
export function today(d = new Date()) { return d.toLocaleDateString('sv-SE'); } // YYYY-MM-DD (현지 시간)
function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return today(d); }

// ---------- 포인트 ----------
export function getPoints() { return S.points; }
export function pointLog() { return S.pointLog.slice(0, 30); }
function addPoints(n, why) {
  S.points += n;
  S.pointLog.unshift({ d: new Date().toISOString(), n, why });
  S.pointLog = S.pointLog.slice(0, 60);
}

// ---------- 출석 ----------
/** 앱을 열 때 한 번 부른다. 오늘 처음이면 +10 */
export function checkIn() {
  const t = today();
  const a = S.attendance;
  if (a.last === t) return { granted: false, streak: a.streak };
  a.streak = a.last === yesterday() ? a.streak + 1 : 1;
  a.last = t;
  addPoints(10, '출석 체크');
  mark('attend');
  persist();
  return { granted: true, streak: a.streak, points: 10 };
}
export function attendance() {
  const a = S.attendance;
  const alive = a.last === today() || a.last === yesterday();
  const streak = alive ? a.streak : 0;
  const cycleDay = streak ? ((streak - 1) % 7) + 1 : 0;   // 이번 주 며칠째 (1~7)
  return {
    streak, cycleDay,
    checkedToday: a.last === today(),
    chestReady: cycleDay === 7 && a.last === today() && a.chestOn !== today(),
    chestClaimed: cycleDay === 7 && a.chestOn === today(),
  };
}
export function claimChest() {
  if (!attendance().chestReady) return 0;
  S.attendance.chestOn = today();
  addPoints(100, '7일 연속 출석 보물상자');
  persist();
  return 100;
}

// ---------- 플레이 시간 ----------
export function addPlay(slug, sec) {
  if (!slug || sec <= 0) return;
  const t = today();
  S.playtime.total[slug] = (S.playtime.total[slug] || 0) + sec;
  S.playtime.daily[t] ??= {};
  S.playtime.daily[t][slug] = (S.playtime.daily[t][slug] || 0) + sec;
  // 오래된 날짜별 기록은 14일만 남긴다
  const days = Object.keys(S.playtime.daily).sort();
  while (days.length > 14) delete S.playtime.daily[days.shift()];
  persist();
}
export function markPlayed(slug) { S.lastPlayed[slug] = Date.now(); persist(); }
export function playSeconds(slug) { return S.playtime.total[slug] || 0; }
export function playSecondsToday(slug) { return S.playtime.daily[today()]?.[slug] || 0; }
export function totalPlaySeconds() { return Object.values(S.playtime.total).reduce((a, b) => a + b, 0); }
export function playtimeMap() { return { ...S.playtime.total }; }
export function recentPlays() {
  return Object.entries(S.lastPlayed).sort((a, b) => b[1] - a[1]).map(([slug, at]) => ({ slug, at }));
}

// ---------- 리뷰 ----------
export const REVIEW_MIN_SEC = 180;   // 3분 이상 플레이해야 작성 가능
export function myReviews() { return [...S.reviews]; }
export function myReviewFor(slug) { return S.reviews.find(r => r.slug === slug) || null; }
export function canReview(slug) {
  if (myReviewFor(slug)) return { ok: false, why: 'done' };
  if (playSeconds(slug) < REVIEW_MIN_SEC) return { ok: false, why: 'time', need: REVIEW_MIN_SEC - playSeconds(slug) };
  return { ok: true };
}
export function addReview({ slug, rec, text }) {
  const c = canReview(slug);
  if (!c.ok) return { ok: false, ...c };
  const r = { id: 'me-' + Date.now(), slug, rec: !!rec, text: String(text).slice(0, 1000), playSec: playSeconds(slug), date: today(), mine: true };
  S.reviews.unshift(r);
  addPoints(50, '리뷰 쓰기');
  mark('review');
  persist();
  return { ok: true, review: r, points: 50 };
}
export function isHelpful(id) { return S.helpful.includes(id); }
export function toggleHelpful(id) {
  const i = S.helpful.indexOf(id);
  if (i >= 0) S.helpful.splice(i, 1); else S.helpful.push(id);
  persist();
  return i < 0;
}

// ---------- 오늘의 미션 ----------
function mark(key) { const t = today(); (S.missions[t] ??= {})[key] = true; }
export function missionDone(key) { return !!S.missions[today()]?.[key]; }
export function claimMission(key, pts, why) {
  if (missionDone(key)) return 0;
  mark(key);
  addPoints(pts, why);
  persist();
  return pts;
}
export const PLAY_MISSION_SEC = 300; // 게임별 하루 5분
export function setFlag(name) { const t = today(); (S.flags[t] ??= {})[name] = true; persist(); }
export function flag(name) { return !!S.flags[today()]?.[name]; }
export function reviewedToday() { return S.reviews.some(r => r.date === today()); }

// ---------- 이어하기 (SDK가 대신 저장) ----------
export function getSave(slug) { return S.saves[slug] ?? null; }
export function setSave(slug, data) {
  try { JSON.stringify(data); } catch { return; }
  S.saves[slug] = data;
  persist();
}

// ---------- 친구 ----------
export function friendIds() { return S.friends.map(f => f.id); }
export function isFriend(id) { return S.friends.some(f => f.id === id); }
export function addFriend(id) {
  if (!id || isFriend(id)) return false;
  S.friends.unshift({ id, at: Date.now() });
  persist();
  return true;
}
export function removeFriend(id) {
  S.friends = S.friends.filter(f => f.id !== id);
  persist();
}
/** 플레이 화면에 같이 있던 친구 기록 (최근 같이 한 친구) */
export function recordPlayedWith(ids, slug) {
  for (const id of ids) {
    const prev = S.playedWith[id];
    S.playedWith[id] = { slug, at: Date.now(), count: (prev?.count || 0) + 1 };
  }
  persist();
}
export function playedWith() {
  return Object.entries(S.playedWith).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.at - a.at);
}
export function myCode() {
  if (!S.myCode) {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    S.myCode = 'NOL-' + Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
    persist();
  }
  return S.myCode;
}

// ---------- 전체 초기화 (내 게임 화면) ----------
export function resetAll() { S = blank(); persist(); }
