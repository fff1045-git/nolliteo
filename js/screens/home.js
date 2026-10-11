// 홈: 포인트·출석, 오늘의 게임 배너, 카테고리, 내 취향 저격, 실시간 랭킹, 전체 게임
import { allGames, asset, esc, CATEGORIES, stats } from '../data.js';
import { recommend } from '../recommend.js';
import { icon } from '../icons.js';
import { pointsChip, gameCard, playAction } from '../ui.js';
import { heartChip } from '../hearts-ui.js';

export function rankRows(games) {
  return games.map((g, i) => {
    const d = g.rankDelta;
    const delta = g.badge === 'NEW' && d == null ? `<span class="badge badge-theme">NEW</span>`
      : d > 0 ? `<span class="delta up">▲${d}</span>` : d < 0 ? `<span class="delta down">▼${-d}</span>` : `<span class="delta same">-</span>`;
    const s = stats(g.slug);
    return `<div class="rank-row">
      <span class="rank-no ${i < 3 ? 'r' + (i + 1) : ''}">${i + 1}</span>
      <a class="thumb" href="#/game/${g.slug}" style="background:${g.color}" aria-label="${esc(g.name)} 상세"><img src="${asset(g.image)}" alt="" loading="lazy"></a>
      <a href="#/game/${g.slug}" style="min-width:0"><div class="t">${esc(g.name)}</div><div class="s">${esc(g.genre)} · ${s.rate === null ? '리뷰 없음' : esc(s.label)}</div></a>
      ${delta}
      <button class="btn btn-sm" data-play="${g.slug}">${g.status === 'soon' ? '예정' : '플레이'}</button>
    </div>`;
  }).join('');
}

export function render(view) {
  const games = allGames();
  const today = games.find(g => g.today) || games[0];
  const rec = recommend(6);
  const ranking = games; // games.json 순서 = 랭킹 순서 (연습용)

  view.innerHTML = `
  <header class="hero-head">
    <div class="page topbar">
      <span class="logo">놀이터 ${icon('star', 22)}</span>
      <span class="spacer"></span>
      ${heartChip()}
      ${pointsChip()}
      <a class="icon-btn" href="#/search" aria-label="검색">${icon('search', 22)}</a>
    </div>
  </header>
  <div class="page pad" style="margin-top:-6px">
    <div class="home-grid">
      <div>
        <section class="today card" aria-label="오늘의 게임">
          <div>
            <span class="badge badge-ink tilt">오늘의 게임</span>
            <h1>${esc(today.name)}</h1>
            <p class="live"><span class="dot"></span>친구 ${today.friendsNow || 0}명이 지금 플레이 중</p>
            <button class="btn btn-primary btn-lg" data-play="${today.slug}">${icon('play', 18)}플레이</button>
          </div>
          <a class="art" href="#/game/${today.slug}" aria-label="${esc(today.name)} 상세" style="background:${today.color}"><img src="${asset(today.image)}" alt=""></a>
        </section>

        <nav class="cats" aria-label="카테고리">
          ${CATEGORIES.map(c => `<a class="cat" href="#/category/${c.id}"><span class="ic ${c.icon === 'vs' ? 'vs' : ''}" style="background:${c.color}">${c.icon === 'vs' ? 'VS' : icon(c.icon, 26)}</span>${c.name}</a>`).join('')}
        </nav>

        <div class="sec-head"><h2>내 취향 저격</h2><span class="sub">${esc(rec.reason)}</span></div>
        <div class="hscroll">${rec.list.map(g => gameCard(g)).join('')}</div>
      </div>

      <section class="rank-panel card-desktop" aria-label="실시간 랭킹">
        <div class="sec-head"><h2>실시간 랭킹</h2><span class="badge badge-pink">LIVE</span><a class="more" href="#/ranking">전체</a></div>
        <div class="rank-list">${rankRows(ranking.slice(0, 5))}</div>
      </section>
    </div>

    <div class="sec-head"><h2>전체 게임</h2><span class="sub">설치 없이 바로 플레이</span></div>
    <div class="game-grid">${games.map(g => gameCard(g, 'grid-card')).join('')}</div>
  </div>`;

  view.addEventListener('click', onPlayClick);
  return () => view.removeEventListener('click', onPlayClick);
}

export function onPlayClick(e) {
  const b = e.target.closest('[data-play]');
  if (!b) return;
  const g = allGames().find(x => x.slug === b.dataset.play);
  if (g) playAction(g);
}
