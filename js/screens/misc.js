// 랭킹 · 카테고리 · 검색
import { allGames, CATEGORIES, esc, asset } from '../data.js';
import { friendRankHtml } from '../compete-ui.js';
import { icon } from '../icons.js';
import { gameCard, goBack } from '../ui.js';
import { rankRows, onPlayClick } from './home.js';

const head = (title, back = false) => `<header class="hero-head"><div class="page topbar">
  ${back ? `<button class="icon-btn" data-back aria-label="뒤로">${icon('back', 22)}</button>` : ''}
  <h1 style="font-size:28px">${title}</h1></div></header>`;

function bind(view, extra) {
  const fn = e => {
    if (e.target.closest('[data-back]')) return goBack();
    onPlayClick(e);
    extra?.(e);
  };
  view.addEventListener('click', fn);
  return () => view.removeEventListener('click', fn);
}

export function ranking(view) {
  const live = allGames().filter(g => g.status === 'live');
  let pick = live[0]?.slug;
  const draw = () => {
    view.innerHTML = `${head('랭킹')}
    <div class="page pad">
      <div class="sec-head"><h2>친구 랭킹</h2><span class="sub">게임마다 이번 주 최고 기록</span></div>
      <div class="game-chips" role="tablist">${live.map(g => `<button class="chip-tab ${g.slug === pick ? 'on' : ''}" role="tab" aria-selected="${g.slug === pick}" data-pick="${g.slug}"><img src="${asset(g.image)}" alt="" width="26" height="26">${esc(g.name)}</button>`).join('')}</div>
      ${friendRankHtml(pick, { title: false })}
      <div class="sec-head"><h2>지금 인기</h2><span class="badge badge-pink">LIVE</span><span class="sub">플레이 수·추천률 기준 (연습용 예시)</span></div>
      <div class="card" style="padding:8px 16px"><div class="rank-list">${rankRows(allGames())}</div></div>
    </div>`;
  };
  draw();
  const off = bind(view, e => { const b = e.target.closest('[data-pick]'); if (b) { pick = b.dataset.pick; draw(); } });
  const onHearts = () => draw();
  window.addEventListener('hearts-changed', onHearts);
  return () => { off(); window.removeEventListener('hearts-changed', onHearts); };
}

export function category(view, id) {
  const c = CATEGORIES.find(x => x.id === id) || CATEGORIES[0];
  const list = allGames().filter(g => g.categories.includes(c.id));
  view.innerHTML = `${head(esc(c.name), true)}
  <div class="page pad"><div class="sec-head"><h2>${esc(c.name)} 게임</h2><span class="sub">${list.length}개</span></div>
  ${list.length ? `<div class="game-grid">${list.map(g => gameCard(g, 'grid-card')).join('')}</div>` : '<div class="empty">아직 게임이 없어요</div>'}</div>`;
  return bind(view);
}

export function search(view) {
  view.innerHTML = `${head('검색', true)}
  <div class="page pad" style="margin-top:18px">
    <label class="search-box"><span class="sr-only">게임 검색</span><input class="input" type="search" placeholder="게임 이름, 장르, #태그" data-q autofocus></label>
    <div class="game-grid" style="margin-top:20px" data-results></div>
  </div>`;
  const q = view.querySelector('[data-q]');
  const out = view.querySelector('[data-results]');
  const draw = () => {
    const s = q.value.trim().replace(/^#/, '').toLowerCase();
    const list = allGames().filter(g => !s || [g.name, g.genre, g.developer, ...g.tags].some(x => x.toLowerCase().includes(s)));
    out.innerHTML = list.length ? list.map(g => gameCard(g, 'grid-card')).join('') : `<div class="empty" style="grid-column:1/-1">"${esc(q.value)}"에 맞는 게임이 없어요</div>`;
  };
  q.addEventListener('input', draw);
  draw();
  return bind(view);
}
