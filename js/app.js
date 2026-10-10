// 앱 셸: 해시 라우터 + 하단 탭(모바일) / 사이드바(데스크톱)
import { loadData } from './data.js';
import * as store from './store.js';
import { icon } from './icons.js';
import { toast } from './ui.js';

import * as home from './screens/home.js';
import * as detail from './screens/detail.js';
import * as play from './screens/play.js';
import * as review from './screens/review.js';
import * as rewards from './screens/rewards.js';
import * as my from './screens/my.js';
import * as misc from './screens/misc.js';

const routes = [
  [/^$/, home.render, 'home'],
  [/^game\/([\w-]+)$/, detail.render, 'home', true],
  [/^play\/([\w-]+)$/, play.render, null],
  [/^review\/([\w-]+)$/, review.render, 'home', true],
  [/^rewards$/, rewards.render, 'rewards'],
  [/^my$/, my.render, 'my'],
  [/^ranking$/, misc.ranking, 'ranking'],
  [/^friends$/, misc.friends, 'friends'],
  [/^category\/([\w-]+)$/, misc.category, 'home'],
  [/^search$/, misc.search, 'home'],
];

const TABS = [
  ['home', '#/', '홈', 'home'],
  ['ranking', '#/ranking', '랭킹', 'chart'],
  ['friends', '#/friends', '친구', 'users'],
  ['rewards', '#/rewards', '리워드', 'gift'],
  ['my', '#/my', '내 게임', 'grid'],
];

const view = document.getElementById('view');
let cleanup = null;

function hasClaimable() {
  // 리워드 탭 빨간 점: 받을 수 있는 보상이 있을 때
  const a = store.attendance();
  return a.chestReady || (store.flag('invited') && !store.missionDone('friend'));
}

function renderNav(active) {
  const noti = hasClaimable();
  document.querySelector('.tabbar').innerHTML = TABS.map(([id, href, label, ic]) =>
    `<a class="tab ${id === active ? 'on' : ''}" href="${href}" ${id === active ? 'aria-current="page"' : ''}>
      <span class="pill">${icon(ic, 22)}</span>${label}${id === 'rewards' && noti ? '<i class="noti"></i>' : ''}</a>`).join('');
  const a = store.attendance();
  document.querySelector('.sidebar').innerHTML = `
    <a class="logo" href="#/">놀이터 ${icon('star', 22)}</a>
    ${TABS.map(([id, href, label, ic]) => `<a class="side-link ${id === active ? 'on' : ''}" href="${href}">${icon(ic, 22)}${label}${id === 'rewards' && noti ? '<i class="noti"></i>' : ''}</a>`).join('')}
    <a class="side-link" href="#/search">${icon('search', 22)}검색</a>
    <div class="side-foot">
      <a class="chip dim" href="#/rewards">${icon('fire', 18)}<span data-streak>${a.streak}일째 출석</span></a>
      <a class="chip" href="#/rewards">${icon('coin', 20)}<span data-points>${store.getPoints().toLocaleString('ko-KR')}</span></a>
    </div>`;
}

async function route() {
  const path = location.hash.replace(/^#\/?/, '');
  // 뒤로 가기 판단용 깊이 기록
  if (history.state?.depth == null) history.replaceState({ depth: (window.__lastDepth ?? -1) + 1 }, '');
  window.__lastDepth = history.state.depth;
  window.__navDepth = history.state.depth;

  cleanup?.(); cleanup = null;
  document.body.classList.remove('playing');
  const hit = routes.find(([re]) => re.test(path)) || routes[0];
  const params = path.match(hit[0])?.slice(1) || [];
  if (hit[2]) renderNav(hit[2]);
  document.body.classList.toggle('no-tabs', !!hit[3]);
  view.innerHTML = '';
  window.scrollTo(0, 0);
  try {
    cleanup = (await hit[1](view, ...params)) || null;
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="soon-page"><h2>앗, 화면을 못 열었어요</h2><p style="margin:10px 0 16px;color:var(--muted)">${String(err.message || err)}</p><a class="btn btn-yellow" href="#/">홈으로</a></div>`;
  }
}

// 포인트·출석 숫자 실시간 갱신
store.subscribe(() => {
  document.querySelectorAll('[data-points]').forEach(el => { el.textContent = store.getPoints().toLocaleString('ko-KR'); });
});

async function start() {
  await loadData();
  const c = store.checkIn();
  window.addEventListener('hashchange', route);
  await route();
  if (c.granted) setTimeout(() => toast(`출석 체크! 연속 ${c.streak}일째`, c.points), 400);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
start();
