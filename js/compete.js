// 친구 경쟁 (카카오 게임식): 게임마다 친구들의 이번 주 최고 점수·판 수, 내 순위, 다음 추월 대상
// 연습 버전이라 친구 점수는 예시 데이터로 만든다(친구·게임·주마다 고정된 값).
import { getPerson } from './data.js';
import * as store from './store.js';

// 게임마다 점수 범위 (친구 예시 점수를 이 안에서 만든다)
const RANGE = {
  'block-pop': [200, 2500], '2048': [800, 16000], 'pop-star': [600, 9000], 'flap-bird': [2, 45],
  'endless-jump': [15, 220], 'cat-pang': [8000, 90000], 'dragon-flight': [3000, 60000], 'kakaka': [800, 25000],
};
const week = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toLocaleDateString('sv-SE'); };
function rand(seed) {   // 문자열 → 0~1 고정 난수
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
export const scoreUnit = slug => ({ 'flap-bird': '점', 'endless-jump': '계단' }[slug] || '점');

/** 친구 한 명의 이 게임 기록 (안 한 친구는 plays 0) */
export function friendRecord(id, slug) {
  const [lo, hi] = RANGE[slug] || [100, 5000];
  const r1 = rand(`${id}|${slug}|${week()}`), r2 = rand(`${slug}|${id}|plays|${week()}`);
  if (r2 < .18) return { best: 0, plays: 0 };
  const best = Math.round(lo + (hi - lo) * Math.pow(r1, 1.6));
  return { best, plays: 1 + Math.floor(r2 * 28) };
}

/** 이 게임의 친구 랭킹 (나 포함). [{ id, name, color, avatar, best, plays, me, rank }] */
export function ranking(slug, myScoreOverride) {
  const mine = store.record(slug);
  const home = store.myHome();
  const rows = store.friendIds().map(id => {
    const p = getPerson(id);
    if (!p) return null;
    return { id, name: p.name, color: p.color, avatar: p.avatar || 1, ...friendRecord(id, slug), me: false };
  }).filter(r => r && r.plays > 0);
  const myBest = Math.max(mine.best, myScoreOverride || 0);
  rows.push({ id: 'me', name: '나', color: '#6C4CF5', avatar: home?.avatar || 1, best: myBest, plays: mine.plays, me: true });
  rows.sort((a, b) => b.best - a.best || (a.me ? -1 : 1));
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}
export function myRank(slug, score) {
  const rows = ranking(slug, score);
  return { rank: rows.find(r => r.me).rank, total: rows.length, rows };
}
/** 지금 점수로 다음에 넘어야 할 친구 (없으면 null = 1등) */
export function nextTarget(slug, score) {
  const above = ranking(slug, score).filter(r => !r.me && r.best > score);
  return above.length ? above[above.length - 1] : null;
}
