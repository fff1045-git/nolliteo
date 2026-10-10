// 취향 추천 — 태그 점수 방식
// 1) 내가 플레이한 게임 태그에 플레이 시간만큼 가중치  2) 안 해본 게임을 태그 점수 합으로 정렬
// 3) 기록이 없으면 추천률 순  4) 근거 문장을 함께 돌려준다
import { allGames, stats } from './data.js';
import { playtimeMap } from './store.js';

export function recommend(limit = 6) {
  const games = allGames();
  const pt = playtimeMap();
  const played = games.filter(g => (pt[g.slug] || 0) > 0).sort((a, b) => pt[b.slug] - pt[a.slug]);
  const rateOf = g => stats(g.slug).rate ?? 0;

  if (!played.length) {
    const live = g => (g.status === 'live' ? 1 : 0);
    const list = [...games].sort((a, b) => live(b) - live(a) || rateOf(b) - rateOf(a)).slice(0, limit);
    return { list, reason: '바로 할 수 있는 인기 게임부터 골랐어요' };
  }

  const tagScore = {};
  for (const g of played) for (const t of g.tags) tagScore[t] = (tagScore[t] || 0) + pt[g.slug];
  const score = g => g.tags.reduce((s, t) => s + (tagScore[t] || 0), 0);

  const fresh = games.filter(g => !pt[g.slug]).sort((a, b) => score(b) - score(a) || rateOf(b) - rateOf(a));
  const list = [...fresh, ...played].slice(0, limit);
  const fav = played[0];
  const shared = fav.tags.filter(t => fresh[0]?.tags.includes(t))[0];
  const reason = shared ? `${fav.name} 좋아하셨죠? #${shared} 게임 모음` : `${fav.name} 좋아하셨죠?`;
  return { list, reason };
}
