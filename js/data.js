// 게임 목록·예시 리뷰 불러오기 + 리뷰 통계
import * as store from './store.js';

const base = new URL('../', import.meta.url);   // 사이트 루트 (GitHub Pages 하위 폴더에서도 동작)
let games = [];
let seeds = [];
let people = [];   // 친구로 추가할 수 있는 사용자 (연습용 예시)

export async function loadData() {
  const [g, r, f] = await Promise.all([
    fetch(new URL('data/games.json', base)).then(res => res.json()),
    fetch(new URL('data/seed-reviews.json', base)).then(res => res.json()),
    fetch(new URL('data/friends.json', base)).then(res => res.json()).catch(() => []),
  ]);
  games = g; seeds = r; people = f;
  return games;
}
export const asset = p => new URL(p, base).href;
export const allGames = () => games;
export const liveGames = () => games.filter(g => g.status === 'live');
export const getGame = slug => games.find(g => g.slug === slug);
export const allPeople = () => people;
export const getPerson = id => people.find(p => p.id === id);

export const CATEGORIES = [
  { id: 'puzzle', name: '퍼즐', color: 'var(--sky)', icon: 'puzzle' },
  { id: 'action', name: '액션', color: 'var(--pink)', icon: 'bolt' },
  { id: 'tycoon', name: '경영', color: 'var(--mint)', icon: 'store' },
  { id: 'versus', name: '친구 대전', color: 'var(--orange)', icon: 'vs' },
  { id: 'new', name: '신작', color: 'var(--white)', icon: 'sparkle' },
];

/** 예시 리뷰 + 내 리뷰. "도움돼요" 수에 내 투표를 더한다 */
export function reviewsFor(slug) {
  const mine = store.myReviews().filter(r => r.slug === slug).map(r => ({ ...r, user: '나', color: '#6C4CF5', helpful: 0 }));
  return [...mine, ...seeds.filter(r => r.slug === slug)].map(r => ({
    ...r, helpfulCount: r.helpful + (store.isHelpful(r.id) ? 1 : 0),
  }));
}
export function stats(slug) {
  const list = reviewsFor(slug);
  const total = list.length;
  const rec = list.filter(r => r.rec).length;
  const rate = total ? Math.round((rec / total) * 100) : null;
  let label = '아직 리뷰가 없어요';
  if (rate !== null) label = rate >= 85 ? '매우 긍정적' : rate >= 70 ? '긍정적' : rate >= 40 ? '복합적' : '부정적';
  const best = total ? [...list].sort((a, b) => b.helpfulCount - a.helpfulCount)[0] : null;
  return { total, rec, rate, label, best };
}

export function fmtTime(sec) {
  sec = Math.floor(sec);
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h}시간 ${mm}분` : `${h}시간`;
}
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
