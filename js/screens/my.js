// 내 게임: 최근 플레이, 총 플레이 시간, 내가 쓴 리뷰
import { getGame, asset, esc, fmtTime, allGames } from '../data.js';
import * as store from '../store.js';
import { icon } from '../icons.js';
import { sheet, toast } from '../ui.js';
import { reviewCard } from './detail.js';

export function render(view) {
  const recent = store.recentPlays().map(r => ({ ...r, g: getGame(r.slug) })).filter(r => r.g);
  const mine = store.myReviews().map(r => ({ ...r, user: '나', color: '#6C4CF5', helpfulCount: 0, mine: true }));

  view.innerHTML = `
  <header class="hero-head">
    <div class="page topbar"><h1 style="font-size:28px">내 게임</h1></div>
    <div class="page stat-row">
      <div class="card stat"><b>${fmtTime(store.totalPlaySeconds())}</b><span>총 플레이</span></div>
      <div class="card stat"><b>${recent.length}</b><span>해 본 게임</span></div>
      <div class="card stat"><b>${mine.length}</b><span>쓴 리뷰</span></div>
    </div>
  </header>
  <div class="page pad">
    <div class="sec-head"><h2>최근 플레이</h2></div>
    ${recent.length ? `<div class="rank-list">${recent.map(({ g, at }) => `
      <div class="rank-row" style="grid-template-columns:56px 1fr auto">
        <a class="thumb" href="#/game/${g.slug}" style="background:${g.color}" aria-label="${esc(g.name)} 상세"><img src="${asset(g.image)}" alt=""></a>
        <a href="#/game/${g.slug}"><div class="t">${esc(g.name)}</div><div class="s">${fmtTime(store.playSeconds(g.slug))} 플레이 · ${new Date(at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</div></a>
        <a class="btn btn-sm btn-primary" href="#/play/${g.slug}">이어하기</a>
      </div>`).join('')}</div>`
      : `<div class="empty">아직 플레이한 게임이 없어요.<br><a class="btn btn-yellow" href="#/play/${allGames()[0].slug}">${icon('play', 16)}오늘의 게임 해 보기</a></div>`}

    <div class="sec-head"><h2>내가 쓴 리뷰</h2></div>
    ${mine.length ? `<div class="reviews">${mine.map(r => `<div><p style="font-weight:700;margin-bottom:8px"><a href="#/game/${r.slug}">${esc(getGame(r.slug)?.name || r.slug)} ›</a></p>${reviewCard(r)}</div>`).join('')}</div>`
      : `<div class="empty">3분 이상 플레이한 게임에 리뷰를 쓰면 +50 포인트!</div>`}

    <div class="sec-head"><h2>설정</h2></div>
    <button class="btn btn-ghost" data-reset>${icon('refresh', 18)}연습 데이터 모두 지우기</button>
  </div>`;

  const onClick = e => {
    if (!e.target.closest('[data-reset]')) return;
    sheet(`<h3>연습 데이터를 지울까요?</h3><p>포인트, 출석, 플레이 시간, 리뷰, 이어하기 기록이 이 기기에서 모두 지워져요. 되돌릴 수 없어요.</p>
      <div class="acts"><button class="btn btn-ghost" data-close>취소</button><button class="btn btn-pink" data-confirm>모두 지우기</button></div>`, {
      onMount(el, close) {
        el.querySelector('[data-confirm]').addEventListener('click', () => {
          store.resetAll(); store.checkIn(); close(); toast('처음 상태로 돌아갔어요'); render(view);
        });
      },
    });
  };
  view.addEventListener('click', onClick);
  return () => view.removeEventListener('click', onClick);
}
