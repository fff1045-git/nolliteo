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
  hearts: { n: 5, at: Date.now() },   // 하트 개수, 마지막 충전 기준 시각
  heartInbox: [],                     // [{ id, from, at }] 친구가 보낸 하트
  heartSent: {},                      // 친구 id → 마지막으로 하트 보낸 시각
  heartGift: {},                      // 친구 id → 마지막으로 나에게 하트 보낸 시각 (연습용 흉내)
  records: {},                        // slug → { best, plays, last, at } 친구 경쟁용 내 기록
  activeRound: {},                    // slug → true  하트를 쓰고 진행 중인 판 (이어하기는 하트 안 씀)
  home: null,                         // 마이홈: { avatar, mood, room, items:[{ key, x, y, flip }], ax, ay }
  guestbook: {},                      // 홈 주인 id → [{ from, text, at }]
  visits: {},                         // 홈 주인 id → 방문 수
  seeded: false,                      // 기본 친구(민지·하준) 넣었는지
});

let S = load();
if (!S.seeded) {   // 처음 한 번: 채팅에 나오는 민지·하준을 기본 친구로
  S.seeded = true;
  for (const id of ['hajun', 'minji']) if (!S.friends.some(f => f.id === id)) S.friends.unshift({ id, at: Date.now() });
}

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

// ---------- 하트 (카카오 게임식) ----------
// 한 판 시작할 때 1개 사용. 5개보다 적으면 5분마다 1개씩 다시 찬다. 친구가 보낸 하트는 5개를 넘어도 된다.
export const HEART_MAX = 5, HEART_REGEN = 5 * 60 * 1000, HEART_SEND_GAP = 10 * 60 * 1000;
function regen() {
  const h = S.hearts, now = Date.now();
  if (h.n >= HEART_MAX) { h.at = now; return false; }
  const k = Math.floor((now - h.at) / HEART_REGEN);
  if (k <= 0) return false;
  h.n = Math.min(HEART_MAX, h.n + k);
  h.at = h.n >= HEART_MAX ? now : h.at + k * HEART_REGEN;
  return true;
}
/** { n, max, nextIn(ms, 가득이면 0), inbox } */
export function hearts() {
  if (regen()) persist();
  const h = S.hearts;
  return { n: h.n, max: HEART_MAX, nextIn: h.n >= HEART_MAX ? 0 : Math.max(0, HEART_REGEN - (Date.now() - h.at)), inbox: S.heartInbox.length };
}
export function useHeart() {
  regen();
  if (S.hearts.n <= 0) { persist(); return false; }
  if (S.hearts.n >= HEART_MAX) S.hearts.at = Date.now();   // 가득 찬 상태에서 쓰면 그때부터 충전 시작
  S.hearts.n -= 1;
  persist();
  return true;
}
export function heartInbox() { return [...S.heartInbox]; }
export function acceptHeart(id) {
  const i = S.heartInbox.findIndex(x => x.id === id);
  if (i < 0) return 0;
  S.heartInbox.splice(i, 1); S.hearts.n += 1;
  persist(); return 1;
}
export function acceptAllHearts() {
  const k = S.heartInbox.length;
  S.hearts.n += k; S.heartInbox = [];
  persist(); return k;
}
/** 친구에게 하트 보내기 — 친구마다 10분에 1번 */
export function canSendHeart(id) { return Date.now() - (S.heartSent[id] || 0) >= HEART_SEND_GAP; }
export function sendHeartWait(id) { return Math.max(0, HEART_SEND_GAP - (Date.now() - (S.heartSent[id] || 0))); }
export function sendHeart(id) {
  if (!canSendHeart(id)) return false;
  S.heartSent[id] = Date.now();
  persist(); return true;
}
/** 연습용: 친구들이 가끔 나에게 하트를 보낸다 (내가 보낸 친구일수록 잘 보내 줌) */
export function simulateFriendGifts() {
  const now = Date.now();
  let added = 0;
  for (const f of S.friends) {
    const last = S.heartGift[f.id] || 0;
    if (now - last < 20 * 60 * 1000) continue;
    const p = S.heartSent[f.id] && now - S.heartSent[f.id] < 60 * 60 * 1000 ? .9 : .45;
    S.heartGift[f.id] = now;
    if (Math.random() < p && S.heartInbox.length < 20) { S.heartInbox.push({ id: f.id + '-' + now, from: f.id, at: now - Math.floor(Math.random() * 15 * 60000) }); added++; }
  }
  if (added || S.friends.length) persist();
  return added;
}
/** 판 시작: 이어하던 판이면 하트를 쓰지 않는다. 하트가 없으면 false */
export function startRound(slug) {
  if (S.activeRound[slug]) return true;
  if (!useHeart()) return false;
  S.activeRound[slug] = true;
  const r = (S.records[slug] ??= { best: 0, plays: 0, last: 0, at: 0 });
  r.plays += 1;
  persist(); return true;
}

// ---------- 친구 경쟁용 내 기록 ----------
/** 판이 끝났을 때. { best, prevBest, isBest } */
export function finishRound(slug, score) {
  delete S.activeRound[slug];
  const r = (S.records[slug] ??= { best: 0, plays: 0, last: 0, at: 0 });
  const prevBest = r.best;
  r.last = score; r.at = Date.now();
  if (score > r.best) r.best = score;
  persist();
  return { best: r.best, prevBest, isBest: score > prevBest };
}
export function record(slug) { return S.records[slug] || { best: 0, plays: 0, last: 0, at: 0 }; }

// ---------- 마이홈 ----------
export function myHome() { return S.home; }
export function saveHome(home) { S.home = home; persist(); }
export function guestbook(owner) { return [...(S.guestbook[owner] || [])]; }
export function writeGuestbook(owner, text) {
  (S.guestbook[owner] ??= []).unshift({ from: 'me', text: String(text).slice(0, 200), at: Date.now() });
  persist();
}
export function visit(owner) { S.visits[owner] = (S.visits[owner] || 0) + 1; persist(); return S.visits[owner]; }

// ---------- 전체 초기화 (내 게임 화면) ----------
export function resetAll() { S = blank(); persist(); }
