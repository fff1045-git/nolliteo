// 공통 UI 조각: 토스트, 바텀시트, 숫자 애니메이션, 게임 카드, 준비 중 안내, 홈 화면 추가 안내
import { icon } from './icons.js';
import { asset, esc, stats, getGame } from './data.js';
import * as store from './store.js';

export function toast(text, pts) {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.append(box); }
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `${pts ? `<span class="pts">+${pts}</span>` : ''}<span>${esc(text)}</span>`;
  box.append(t);
  setTimeout(() => t.remove(), 2600);
}

/** 바텀시트(데스크톱에서는 가운데 모달). html 안에 [data-close] 버튼을 두면 닫힘 */
export function sheet(html, { onMount } = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(ov);
  ov.querySelector('button, a, textarea, input')?.focus({ preventScroll: true });
  onMount?.(ov.querySelector('.sheet'), close);
  return close;
}

export function countUp(el, to, from = 0, ms = 900) {
  const start = performance.now();
  const step = now => {
    const k = Math.min(1, (now - start) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * e).toLocaleString('ko-KR');
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function pointsChip() {
  return `<a class="chip" href="#/rewards" aria-label="내 포인트">${icon('coin', 20)}<span data-points>${store.getPoints().toLocaleString('ko-KR')}</span></a>`;
}
export function streakChip() {
  const a = store.attendance();
  return `<a class="chip dim" href="#/rewards" aria-label="연속 출석">${icon('fire', 18)}<span data-streak>${a.streak}일째</span></a>`;
}

export function ratePill(slug) {
  const s = stats(slug);
  return s.rate === null ? `<span class="rate-pill none">리뷰 없음</span>` : `<span class="rate-pill">추천 ${s.rate}%</span>`;
}

export function gameHref(g) { return `#/game/${g.slug}`; }

/** 정사각 썸네일 카드 (가로 스크롤·그리드 공용) */
export function gameCard(g, cls = 'gcard') {
  const mark = g.status === 'soon' ? `<span class="badge badge-ink tilt-r soon-mark">준비 중</span>` : g.badge ? `<span class="badge badge-theme tilt-r soon-mark">${esc(g.badge)}</span>` : '';
  return `<a class="${cls}" href="${gameHref(g)}">
    <div class="thumb" style="background:${g.color}"><img src="${asset(g.image)}" alt="" loading="lazy" width="512" height="512">${mark}</div>
    <span class="name">${esc(g.name)}</span>
    ${cls === 'grid-card' ? `<span class="meta">${esc(g.genre)} · ${esc(g.developer)}</span>` : ''}
    ${ratePill(g.slug)}
  </a>`;
}

export function soonSheet(g) {
  sheet(`
    <div class="thumb" style="width:120px;margin:0 auto 14px;background:${g.color};transform:rotate(-4deg)"><img src="${asset(g.image)}" alt=""></div>
    <h3 style="text-align:center">곧 만나요!</h3>
    <p style="text-align:center">${esc(g.name)}은(는) 지금 준비 중이에요.<br>출시되면 홈 배너에서 가장 먼저 알려 드릴게요.</p>
    <div class="acts"><button class="btn btn-yellow" data-close>알겠어요</button></div>`);
}

/** 플레이 버튼: 출시 게임은 플레이 화면, 준비 중이면 안내 */
export function playAction(g) {
  if (g.status === 'soon') return soonSheet(g);
  // 터치 기기에서는 가능하면 브라우저 전체 화면으로 (버튼을 누른 순간에만 허용됨)
  if (matchMedia('(pointer: coarse)').matches && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  location.hash = `#/play/${g.slug}`;
}

// ---------- 홈 화면에 추가 ----------
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;

export function addToHomeSheet(slug) {
  const g = getGame(slug);
  const launcher = asset(`g/${slug}/`);
  if (isStandalone()) return toast('이미 앱으로 실행 중이에요');
  if (isIOS()) {
    sheet(`
      <h3>홈 화면에 ${esc(g.name)} 추가</h3>
      <p>아이폰은 사파리에서 직접 추가해야 해요. 아래 버튼으로 게임 전용 페이지를 연 뒤 따라 해 주세요.</p>
      <ol class="steps">
        <li><span class="n">1</span><span>아래 "게임 페이지 열기"를 눌러요</span><span class="pic">${icon('link')}</span></li>
        <li><span class="n">2</span><span>사파리 아래쪽 공유 버튼을 눌러요</span><span class="pic">${icon('share')}</span></li>
        <li><span class="n">3</span><span>"홈 화면에 추가"를 고르면 끝!</span><span class="pic">${icon('addHome')}</span></li>
      </ol>
      <div class="acts"><button class="btn btn-ghost" data-close>닫기</button><a class="btn btn-primary" href="${launcher}?install=1">게임 페이지 열기</a></div>`);
    return;
  }
  sheet(`
    <h3>홈 화면에 ${esc(g.name)} 추가</h3>
    <p>게임 전용 페이지가 열리면 위쪽의 <b>"앱 설치"</b> 버튼을 눌러 주세요. 그러면 폰 홈 화면에 ${esc(g.name)} 아이콘이 생기고, 누르면 바로 풀스크린으로 시작해요.</p>
    <ol class="steps">
      <li><span class="n">1</span><span>"게임 페이지 열기"</span><span class="pic">${icon('link')}</span></li>
      <li><span class="n">2</span><span>"앱 설치" 또는 브라우저 메뉴 → "홈 화면에 추가"</span><span class="pic">${icon('addHome')}</span></li>
    </ol>
    <div class="acts"><button class="btn btn-ghost" data-close>닫기</button><a class="btn btn-primary" href="${launcher}?install=1">게임 페이지 열기</a></div>`);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}
export async function shareGame(g) {
  const url = asset(`index.html#/game/${g.slug}`);
  if (navigator.share) { try { await navigator.share({ title: g.name, text: `놀이터에서 ${g.name} 같이 하자!`, url }); return; } catch { return; } }
  if (await copyText(url)) toast('게임 링크를 복사했어요');
}

/** 뒤로 가기: 앱 안에서 왔으면 history.back, 아니면 홈 */
export function goBack(fallback = '#/') {
  if (window.__navDepth > 0) history.back(); else location.hash = fallback;
}
