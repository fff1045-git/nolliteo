// 리워드: 포인트 잔액(숫자 애니메이션), 7일 출석판·보물상자, 오늘의 미션, 이번 주 베스트 리뷰
// 포인트는 점수·승패와 무관한 참여 활동에만 준다.
import { liveGames, allGames, asset, esc, reviewsFor, fmtTime, getGame } from '../data.js';
import * as store from '../store.js';
import { icon } from '../icons.js';
import { countUp, toast, sheet, goBack, copyText } from '../ui.js';
import { reviewCard } from './detail.js';

let lastShown = 0;

function missionRow({ key, mark, color, title, sub, pct, state, pts, action }) {
  const btn = state === 'done' ? `<button class="btn btn-sm btn-ghost" disabled>완료</button>`
    : state === 'claim' ? `<button class="btn btn-sm btn-yellow" data-claim="${key}" data-pts="${pts}" data-why="${esc(title)}">받기</button>`
    : action;
  return `<div class="card mission">
    <span class="mi" style="background:${color}">${mark}</span>
    <div style="min-width:0"><p class="mt">${esc(title)} <span style="color:var(--theme);font-family:var(--font-title)">+${pts}</span></p>${sub ? `<p class="ms">${sub}</p>` : ''}
      <div class="progress ${state === 'done' ? 'mint' : ''}"><i style="width:${Math.min(100, Math.round(pct * 100))}%"></i></div></div>
    ${btn}
  </div>`;
}

function bestOfWeek() {
  return allGames().flatMap(g => reviewsFor(g.slug).map(r => ({ ...r, game: g }))).sort((a, b) => b.helpfulCount - a.helpfulCount)[0];
}

export function render(view) {
  const draw = () => {
    const a = store.attendance();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = i + 1;
      if (d === 7) {
        const cls = a.chestReady ? 'ready' : '';
        return `<button class="day chest ${cls}" data-chest aria-label="7일째 보물상자 ${a.chestClaimed ? '받음' : a.chestReady ? '열기' : '잠김'}">${a.chestClaimed ? icon('check', 20) : `<img src="${asset('assets/img/chest.webp')}" alt="">`}</button>`;
      }
      if (d <= a.cycleDay) return `<span class="day done" aria-label="${d}일째 출석">${icon('check', 20)}</span>`;
      return `<span class="day ${d === a.cycleDay + 1 ? 'next' : ''}">${d}</span>`;
    }).join('');

    const missions = [
      missionRow({ key: 'attend', mark: '출', color: 'var(--yellow)', title: '출석 체크', pts: 10, pct: a.checkedToday ? 1 : 0, state: a.checkedToday ? 'done' : 'todo', action: '' }),
      ...liveGames().map(g => {
        const sec = store.playSecondsToday(g.slug);
        const done = store.missionDone('play_' + g.slug);
        return missionRow({
          key: 'play_' + g.slug, mark: '플', color: g.color, title: `${g.name} 5분 플레이`, pts: 20,
          sub: `오늘 ${fmtTime(sec)} / 5분`, pct: done ? 1 : sec / store.PLAY_MISSION_SEC,
          state: done ? 'done' : sec >= store.PLAY_MISSION_SEC ? 'claim' : 'todo',
          action: `<a class="btn btn-sm" href="#/play/${g.slug}">플레이</a>`,
        });
      }),
      missionRow({ key: 'review', mark: '글', color: 'var(--sky)', title: '리뷰 1편 쓰기', pts: 50, sub: '3분 이상 플레이한 게임만 쓸 수 있어요',
        pct: store.reviewedToday() ? 1 : 0, state: store.reviewedToday() ? 'done' : 'todo', action: `<button class="btn btn-sm" data-goreview>쓰러 가기</button>` }),
      missionRow({ key: 'friend', mark: '친', color: 'var(--mint)', title: '친구와 함께 플레이', pts: 30, sub: '연습용: 초대 링크를 복사하면 완료',
        pct: store.missionDone('friend') || store.flag('invited') ? 1 : 0,
        state: store.missionDone('friend') ? 'done' : store.flag('invited') ? 'claim' : 'todo', action: `<button class="btn btn-sm" data-invite>초대하기</button>` }),
    ].join('');

    const best = bestOfWeek();
    const log = store.pointLog();

    view.innerHTML = `
    <header class="hero-head" style="padding-bottom:30px">
      <div class="page topbar"><button class="icon-btn" data-back aria-label="뒤로">${icon('back', 22)}</button><h1 style="font-size:26px">리워드</h1></div>
      <div class="page wallet">
        <img src="${asset('assets/img/coins.webp')}" alt="">
        <div><p class="lbl">내 포인트</p><p class="num" data-wallet>${lastShown.toLocaleString('ko-KR')}</p></div>
        <button class="btn btn-yellow" data-exchange>교환</button>
      </div>
    </header>
    <div class="page">
      <div class="rewards-grid">
        <div>
          <section class="card attend" aria-label="연속 출석">
            <div class="attend-top"><h3>연속 출석 ${a.streak}일째</h3><small>7일째 보물상자 +100</small></div>
            <div class="days">${days}</div>
          </section>
          <div class="pad">
            <div class="sec-head"><h2>오늘의 미션</h2><span class="sub">점수·승패와 상관없이 참여하면 OK</span></div>
            <div class="missions">${missions}</div>
          </div>
        </div>
        <div class="pad">
          <button class="card best-banner btn-reset" data-best style="width:100%;text-align:left;border:3px solid var(--ink)">
            ${icon('trophy', 40)}
            <span><h3>이번 주 베스트 리뷰</h3><p>'도움돼요' 1위 리뷰어에게 +300 포인트 (예정)</p></span>
            <span class="icon-btn">${icon('right', 22)}</span>
          </button>
          ${best ? `<p style="margin:14px 0 8px;font-weight:700;color:var(--muted);font-size:13px">현재 1위 · ${esc(best.game.name)}</p>${reviewCard(best, true)}` : ''}
          <div class="sec-head"><h2>포인트 내역</h2></div>
          <div class="card log" style="padding:6px 16px">${log.length ? `<ul>${log.map(l => `<li><span>${esc(l.why)}<br><small style="color:var(--muted)">${new Date(l.d).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></span><span class="plus">+${l.n}</span></li>`).join('')}</ul>` : '<p style="padding:12px 0;color:var(--muted)">아직 내역이 없어요</p>'}</div>
        </div>
      </div>
    </div>`;

    const to = store.getPoints();
    countUp(view.querySelector('[data-wallet]'), to, lastShown);
    lastShown = to;
  };
  draw();

  const onClick = async e => {
    const t = e.target;
    if (t.closest('[data-back]')) return goBack();
    if (t.closest('[data-exchange]')) return sheet(`<h3>포인트 교환은 준비 중이에요</h3><p>연습 버전에서는 포인트를 모으기만 할 수 있어요. 교환처와 법률 검토가 끝나면 열릴 예정이에요.</p><div class="acts"><button class="btn btn-yellow" data-close>알겠어요</button></div>`);
    if (t.closest('[data-chest]')) {
      const n = store.claimChest();
      if (n) { toast('보물상자 열기!', n); draw(); }
      else toast(store.attendance().chestClaimed ? '오늘 보물상자는 이미 받았어요' : `7일 연속 출석하면 열려요 (지금 ${store.attendance().cycleDay}일째)`);
      return;
    }
    const c = t.closest('[data-claim]');
    if (c) {
      const n = store.claimMission(c.dataset.claim, Number(c.dataset.pts), c.dataset.why);
      if (n) { toast(c.dataset.why, n); draw(); }
      return;
    }
    if (t.closest('[data-invite]')) {
      const g = liveGames()[0];
      await copyText(asset(`index.html#/game/${g.slug}`));
      store.setFlag('invited');
      toast('초대 링크를 복사했어요. 받기를 눌러 주세요');
      draw();
      return;
    }
    if (t.closest('[data-goreview]')) {
      const g = liveGames().find(x => store.canReview(x.slug).ok);
      if (g) location.hash = `#/review/${g.slug}`;
      else toast('아직 3분 이상 플레이한 게임이 없어요. 먼저 한 판 해 볼까요?');
      return;
    }
    const h = t.closest('[data-helpful]');
    if (h) { store.toggleHelpful(h.dataset.helpful); draw(); return; }
    if (t.closest('[data-best]')) {
      const top = allGames().flatMap(g => reviewsFor(g.slug).map(r => ({ ...r, game: g }))).sort((a, b) => b.helpfulCount - a.helpfulCount).slice(0, 3);
      sheet(`<h3>이번 주 '도움돼요' 순위</h3><p>상금은 '도움돼요' 투표로만 정해요. 게임 점수와는 상관없어요.</p>
        <ol class="steps">${top.map((r, i) => `<li><span class="n">${i + 1}</span><span>${esc(r.user)} · ${esc(r.game.name)}<br><small style="color:var(--muted)">도움돼요 ${r.helpfulCount}</small></span><a class="pic" href="#/game/${r.game.slug}" data-close aria-label="${esc(r.game.name)} 리뷰 보기">${icon('right')}</a></li>`).join('')}</ol>
        <div class="acts"><button class="btn btn-yellow" data-close>닫기</button></div>`);
    }
  };
  view.addEventListener('click', onClick);
  return () => view.removeEventListener('click', onClick);
}
