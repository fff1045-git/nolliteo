// 하트 UI: 머리글 하트 칩(남은 충전 시간), 하트 창(받은 하트함·친구에게 보내기), 1초마다 숫자 갱신
import * as store from './store.js';
import { getPerson, esc } from './data.js';
import { icon } from './icons.js';
import { sheet, toast } from './ui.js';

export const mmss = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const heartIcon = (on = true, size = 18) => `<svg class="hi ${on ? 'on' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>`;
export { heartIcon };

function timerText(h) { return h.n >= h.max ? '가득' : mmss(h.nextIn); }

/** 머리글용 하트 칩 */
export function heartChip() {
  const h = store.hearts();
  return `<button class="chip heart-chip" data-hearts aria-label="하트 ${h.n}개">${heartIcon(true, 18)}<span data-heart-n>${h.n}</span><small data-heart-timer>${timerText(h)}</small>${h.inbox ? `<i class="dot" data-heart-dot></i>` : ''}</button>`;
}

/** 친구에게 하트 보내기 버튼 (10분에 1번) */
export function sendHeartBtn(id) {
  const wait = store.sendHeartWait(id);
  return wait ? `<button class="btn btn-sm btn-ghost" disabled data-send-wait="${id}">${heartIcon(false, 14)}${Math.ceil(wait / 60000)}분</button>`
    : `<button class="btn btn-sm btn-pink" data-send-heart="${id}" aria-label="${esc(getPerson(id)?.name || '')}에게 하트 보내기">${heartIcon(true, 14)}보내기</button>`;
}

export function sendHeart(id, after) {
  const p = getPerson(id);
  if (store.sendHeart(id)) toast(`${p?.name || '친구'}에게 하트를 보냈어요`);
  else toast(`${Math.ceil(store.sendHeartWait(id) / 60000)}분 뒤에 다시 보낼 수 있어요`);
  after?.();
}

/** 하트 창 */
export function openHeartSheet(onChange) {
  let close;
  const body = () => {
    const h = store.hearts(), inbox = store.heartInbox().sort((a, b) => b.at - a.at);
    const friends = store.friendIds().map(getPerson).filter(Boolean);
    return `<h3>하트 ${h.n}개</h3>
      <div class="heart-row">${Array.from({ length: Math.max(h.max, h.n) }, (_, i) => heartIcon(i < h.n, 30)).join('')}</div>
      <p>${h.n >= h.max ? '하트가 가득 찼어요. 한 판 할 때마다 1개씩 써요.' : `다음 하트까지 <b data-heart-timer>${mmss(h.nextIn)}</b> · 5분마다 1개씩 차요 (최대 5개)`}</p>
      <div class="sec-head" style="margin-top:18px"><h2 style="font-size:19px">받은 하트</h2><span class="sub">${inbox.length}개</span>
        ${inbox.length ? '<button class="btn btn-sm btn-yellow" data-accept-all style="margin-left:auto">모두 받기</button>' : ''}</div>
      ${inbox.length ? `<div class="heart-list">${inbox.map(x => { const p = getPerson(x.from); return `<div class="friend-row"><span class="avatar lg" style="background:${p?.color || '#ccc'}">${esc(p?.name?.[0] || '?')}</span><div class="fi"><b>${esc(p?.name || '친구')}</b><small>하트를 보냈어요</small></div><div class="fa"><button class="btn btn-sm btn-yellow" data-accept="${x.id}">받기</button></div></div>`; }).join('')}</div>`
        : '<p style="font-size:13px">친구가 보낸 하트가 여기에 쌓여요. 받은 하트는 5개를 넘어도 돼요.</p>'}
      <div class="sec-head" style="margin-top:18px"><h2 style="font-size:19px">친구에게 보내기</h2><span class="sub">친구마다 10분에 1번</span></div>
      ${friends.length ? `<div class="heart-list">${friends.map(p => `<div class="friend-row"><span class="avatar lg" style="background:${p.color}">${esc(p.name[0])}</span><div class="fi"><b>${esc(p.name)}</b><small>${esc(p.mood || '')}</small></div><div class="fa">${sendHeartBtn(p.id)}</div></div>`).join('')}</div>`
        : '<p style="font-size:13px">친구를 추가하면 하트를 주고받을 수 있어요.</p>'}
      <div class="acts"><button class="btn btn-ghost" data-close>닫기</button></div>`;
  };
  close = sheet(body(), {
    onMount(el) {
      el.addEventListener('click', e => {
        const t = e.target;
        const acc = t.closest('[data-accept]');
        if (acc) { store.acceptHeart(acc.dataset.accept); toast('하트 +1'); }
        else if (t.closest('[data-accept-all]')) { const k = store.acceptAllHearts(); toast(`하트 +${k}`); }
        else if (t.closest('[data-send-heart]')) sendHeart(t.closest('[data-send-heart]').dataset.sendHeart);
        else return;
        el.innerHTML = body(); onChange?.();
      });
    },
  });
  return close;
}

// 1초마다 화면의 하트 숫자·타이머 갱신
setInterval(() => {
  const h = store.hearts();
  document.querySelectorAll('[data-heart-n]').forEach(e => { e.textContent = h.n; });
  document.querySelectorAll('[data-heart-timer]').forEach(e => { e.textContent = timerText(h); });
}, 1000);
