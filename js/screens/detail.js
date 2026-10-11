// 게임 상세: 일러스트 배너, 정보 카드, 추천률, 바로 플레이·홈에 추가, 추천 막대, BEST 리뷰, 리뷰 목록, 리뷰 쓰기 버튼
import { getGame, asset, esc, stats, reviewsFor, fmtTime } from '../data.js';
import * as store from '../store.js';
import { icon } from '../icons.js';
import { playAction, addToHomeSheet, shareGame, goBack, toast, soonSheet } from '../ui.js';
import { friendRankHtml } from '../compete-ui.js';

export function reviewCard(r, best = false) {
  const on = store.isHelpful(r.id);
  return `<article class="card review ${best ? 'best' : ''}">
    ${best ? '<span class="badge badge-pink tilt-r best-badge">BEST 리뷰</span>' : ''}
    <div class="who"><span class="avatar" style="background:${r.color}"></span><span class="nick">${esc(r.user)}</span><span class="ptime">플레이 ${fmtTime(r.playSec)}</span>${r.mine ? '<span class="badge badge-yellow">내 리뷰</span>' : ''}</div>
    <p class="verdict ${r.rec ? 'y' : 'n'}">${icon(r.rec ? 'up' : 'down', 18)}${r.rec ? '추천해요' : '추천하지 않아요'}</p>
    <p class="body">${esc(r.text)}</p>
    ${r.devReply ? `<div class="dev-reply"><b>개발사 답글</b> ${esc(r.devReply)}</div>` : ''}
    <div class="foot">
      ${r.mine ? '' : `<button class="btn btn-sm helpful ${on ? 'on' : ''}" data-helpful="${r.id}" aria-pressed="${on}">도움돼요 ${r.helpfulCount}</button>`}
      <span>${esc(r.date)}</span>
    </div>
  </article>`;
}

export function render(view, slug) {
  const g = getGame(slug);
  if (!g) { view.innerHTML = `<div class="soon-page"><h2>게임을 찾을 수 없어요</h2><a class="btn btn-yellow" href="#/" style="margin-top:16px">홈으로</a></div>`; return; }
  const soon = g.status === 'soon';

  const draw = () => {
    const s = stats(slug);
    const list = reviewsFor(slug);
    const others = s.best ? list.filter(r => r.id !== s.best.id) : list;
    const can = store.canReview(slug);
    const played = store.playSeconds(slug);
    let cta = '';
    if (!soon) {
      if (can.ok) cta = `<a class="btn btn-yellow btn-lg" href="#/review/${slug}">${icon('pencil', 20)}리뷰 쓰고 +50 받기</a>`;
      else if (can.why === 'done') cta = `<button class="btn btn-ghost btn-lg" disabled>${icon('check', 20)}리뷰 작성 완료</button>`;
      else cta = `<button class="btn btn-yellow btn-lg" data-locked>${icon('lock', 20)}리뷰 쓰고 +50 받기</button><span class="hint">3분 이상 플레이하면 쓸 수 있어요 · 지금 ${fmtTime(played)}</span>`;
    }
    view.innerHTML = `
    <header class="hero-head detail-head">
      <div class="bar page">
        <button class="icon-btn" data-back aria-label="뒤로">${icon('back', 22)}</button>
        <button class="icon-btn" data-share aria-label="공유">${icon('share', 22)}</button>
      </div>
      <div class="detail-art-wrap"><div class="detail-art" style="background:${g.color}"><img src="${asset(g.image)}" alt="${esc(g.name)} 일러스트"></div></div>
    </header>
    <div class="detail-wrap">
      <section class="card info-card">
        <h1>${esc(g.name)}</h1>
        <div class="rate-sticker ${s.rate === null ? 'none' : ''}"><b>${s.rate === null ? '-' : s.rate + '%'}</b><span>추천</span></div>
        <p class="by">${esc(g.developer)} · ${esc(g.genre)} · ${g.orientation === 'portrait' ? '세로 화면' : '가로 화면'}</p>
        <div class="tags">${g.tags.map((t, i) => `<span class="tag" style="background:${['var(--yellow)', 'var(--sky)', 'var(--pink)', 'var(--mint)'][i % 4]};${i % 4 === 2 ? 'color:#fff' : ''}">#${esc(t)}</span>`).join('')}</div>
        <div class="cta-row">
          <button class="btn btn-primary btn-lg" data-playnow>${icon('play', 18)}${soon ? '출시 예정' : '바로 플레이'}</button>
          <button class="btn btn-lg" data-addhome ${soon ? 'disabled' : ''}>${icon('addHome', 20)}홈에 추가</button>
        </div>
        <p class="desc">${esc(g.description)}</p>
        ${played ? `<p class="desc">${icon('clock', 16, 'style="vertical-align:-3px"')} 내 플레이 시간 ${fmtTime(played)}</p>` : ''}
      </section>

      <div class="reviews-col pad-m">
        ${soon ? '' : friendRankHtml(slug)}
        <div class="sec-head"><h2>플레이어 리뷰</h2><span class="sub" style="color:#0FA678;font-weight:700">${esc(s.label)}</span><span class="sub">· ${s.total}개</span></div>
        ${s.total ? `<div class="rec-bar" role="img" aria-label="추천 ${s.rec}개, 비추천 ${s.total - s.rec}개"><i class="y" style="width:${s.rate}%"></i><i class="n" style="flex:1"></i></div>
        <div class="rec-legend"><span>추천 ${s.rec}</span><span>비추천 ${s.total - s.rec}</span></div>` : ''}
        <div class="reviews" style="margin-top:26px">
          ${s.best ? reviewCard(s.best, true) : '<div class="empty">아직 리뷰가 없어요. 첫 리뷰의 주인공이 되어 보세요!</div>'}
          ${others.map(r => reviewCard(r)).join('')}
        </div>
        <div class="sticky-cta">${cta}</div>
      </div>
    </div>`;
  };
  draw();

  const onClick = e => {
    const t = e.target;
    if (t.closest('[data-back]')) return goBack();
    if (t.closest('[data-share]')) return shareGame(g);
    if (t.closest('[data-playnow]')) {
      if (soon) return soonSheet(g);
      return playAction(g);
    }
    if (t.closest('[data-addhome]')) return addToHomeSheet(slug);
    if (t.closest('[data-locked]')) return toast(`리뷰는 3분 이상 플레이한 뒤 쓸 수 있어요 (지금 ${fmtTime(store.playSeconds(slug))})`);
    const h = t.closest('[data-helpful]');
    if (h) {
      const y = window.scrollY;
      store.toggleHelpful(h.dataset.helpful);
      draw();
      window.scrollTo(0, y);
    }
  };
  const onHearts = () => { const y = window.scrollY; draw(); window.scrollTo(0, y); };
  view.addEventListener('click', onClick);
  window.addEventListener('hearts-changed', onHearts);
  return () => { view.removeEventListener('click', onClick); window.removeEventListener('hearts-changed', onHearts); };
}
