// 마이홈 (싸이월드 미니홈피 느낌): 미니룸 + 미니미 아바타 + 오늘의 기분 + 방명록, 친구 홈 놀러 가기
// #/my → 내 홈 (꾸미기 가능, 아래에 내 게임 기록)   #/minihome/:id → 친구 홈 (구경·방명록·하트)
import { getPerson, asset, esc } from '../data.js';
import * as store from '../store.js';
import { icon } from '../icons.js';
import { toast, sheet, goBack } from '../ui.js';
import { sendHeartBtn } from '../hearts-ui.js';
import * as my from './my.js';

// 가구: 이름 · 미니룸 폭 대비 크기(%) · 바닥에 까는 것인지
// 가구: [이름, 미니룸 폭 대비 크기(%), 종류]  종류 floor=바닥 가구 · rug=바닥에 까는 것 · wall=벽에 거는 것 · prop=작은 소품
export const ITEMS = {
  bed: ['침대', 34, 'floor'], sofa: ['소파', 28, 'floor'], desk: ['책상', 28, 'floor'], shelf: ['책장', 20, 'floor'], piano: ['피아노', 27, 'floor'],
  tv: ['TV', 20, 'floor'], plant: ['화분', 15, 'floor'], lamp: ['스탠드', 10, 'floor'], tree: ['트리', 16, 'floor'], rug: ['러그', 32, 'rug'],
  window: ['창문', 22, 'wall'], frame: ['액자', 12, 'wall'], clock: ['시계', 9, 'wall'], calendar: ['달력', 10, 'wall'], door: ['문', 18, 'wall'],
  bear: ['곰인형', 14, 'prop'], cat: ['고양이', 16, 'prop'], books: ['책 더미', 10, 'prop'], suitcase: ['캐리어', 11, 'prop'], guitar: ['기타', 10, 'prop'], console: ['게임기', 14, 'prop'],
};
export const KINDS = [['floor', '가구'], ['wall', '벽 꾸미기'], ['prop', '소품']];
export const ROOMS = { 1: '하트 벽지 방', 2: '구름 벽지 방', 3: '나무 방', 4: '물방울 벽지 방', 5: '별빛 다락방' };
export const AVATARS = [1, 2, 3, 4, 5, 6];
// 미니미 자세: [이름, 파일 뒷이름, 미니룸 폭 대비 크기(%)]
export const POSES = { stand: ['서기', '', 13], sit: ['앉아서 책 읽기', '-sit', 14], lie: ['누워 자기', '-lie', 22] };
const avSrc = (a, pose = 'stand') => asset(`assets/home/av-${a}${POSES[pose]?.[1] ?? ''}.webp`);
const kindOf = key => ITEMS[key]?.[2] || 'floor';
const DEFAULT_HOME = () => ({ avatar: 1, pose: 'stand', mood: '오늘도 한 판!', room: 1, ax: 46, ay: 72, items: [
  { key: 'rug', x: 50, y: 74 }, { key: 'window', x: 30, y: 36 }, { key: 'clock', x: 70, y: 30 }, { key: 'sofa', x: 30, y: 58 },
  { key: 'plant', x: 72, y: 50 }, { key: 'lamp', x: 18, y: 50 }, { key: 'books', x: 60, y: 80 },
] });

function hash(s) { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
/** 친구 홈은 친구마다 고정된 모습으로 만든다 (연습용) */
function friendHome(p) {
  const h = hash(p.id);
  const pick = (kind, n) => { const ks = Object.keys(ITEMS).filter(k => kindOf(k) === kind); return ks[(h >> n) % ks.length]; };
  const items = [
    { key: 'rug', x: 50, y: 74 },
    { key: pick('wall', 1), x: 30, y: 36 }, { key: pick('wall', 4), x: 72, y: 32 },
    { key: pick('floor', 2), x: 28, y: 58, flip: !!(h & 1) }, { key: pick('floor', 6), x: 72, y: 54 },
    { key: pick('prop', 3), x: 24, y: 80 }, { key: pick('prop', 7), x: 78, y: 80 },
  ];
  const pose = ['stand', 'sit', 'lie'][h % 3];
  return { avatar: p.avatar || 1, pose, mood: p.mood || '', room: (h % 5) + 1, ax: 50, ay: pose === 'lie' ? 76 : 70, items };
}
function seededGuestbook(ownerId) {
  const lines = ['놀러 왔다 감~ 오늘도 한 판 하자!', '미니룸 너무 예쁘다ㅠㅠ 나도 소파 사야지', '어제 블록 팡팡 기록 깼더라? 축하해!', '하트 보냈어 ❤ 받아줘~', '방명록 1등! ㅋㅋ'];
  const others = ['minji', 'hajun', 'seoyeon', 'doyun', 'jiwoo'].filter(id => id !== ownerId);
  const h = hash(ownerId);
  return [0, 1, 2].map(i => ({ from: others[(h + i) % others.length], text: lines[(h + i * 2) % lines.length], at: Date.now() - (i + 1) * 3.7 * 3600000 }));
}
const ago = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 60 ? `${Math.max(1, m)}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`; };

function roomHtml(home, editing, sel) {
  const items = home.items.map((it, i) => ({ ...it, i }));
  const z = it => ({ wall: 1, rug: 2 }[kindOf(it.key)] || 10 + Math.round(it.y));
  return `<div class="miniroom ${editing ? 'editing' : ''}" data-room style="background-image:url(${asset(`assets/home/room-${home.room}.webp`)})">
    ${items.map(it => `<img class="mr-item ${sel === it.i ? 'sel' : ''}" data-item="${it.i}" src="${asset(`assets/home/it-${it.key}.webp`)}" alt="${esc(ITEMS[it.key]?.[0] || '')}" draggable="false"
       style="left:${it.x}%;top:${it.y}%;width:${ITEMS[it.key]?.[1] || 16}%;z-index:${z(it)};${it.flip ? 'transform:translate(-50%,-100%) scaleX(-1)' : ''}">`).join('')}
    <img class="mr-item mr-avatar ${sel === 'av' ? 'sel' : ''}" data-item="av" src="${avSrc(home.avatar, home.pose)}" alt="미니미" draggable="false"
       style="left:${home.ax}%;top:${home.ay}%;width:${POSES[home.pose || 'stand']?.[2] || 13}%;z-index:${10 + Math.round(home.ay) + 1}">
  </div>`;
}

export function render(view, ownerId = 'me') {
  const mine = ownerId === 'me';
  const person = mine ? null : getPerson(ownerId);
  if (!mine && !person) { location.replace('#/friends'); return; }
  let home = mine ? (store.myHome() || DEFAULT_HOME()) : friendHome(person);
  let editing = false, sel = null, draft = null, tray = 'floor';
  const visits = store.visit(ownerId);
  const base = hash(ownerId + store.today());
  const today = (base % 9) + (mine ? 1 : visits), total = 120 + (hash(ownerId) % 900) + visits;
  const name = mine ? '나' : person.name;

  const draw = () => {
    const h = editing ? draft : home;
    const gb = [...store.guestbook(ownerId), ...seededGuestbook(ownerId)].sort((a, b) => b.at - a.at);
    view.querySelector('[data-hp]').innerHTML = `
      <div class="hp-top"><b>${esc(name)}의 미니홈피</b><span class="hp-count">TODAY <em>${today}</em> | TOTAL ${total.toLocaleString('ko-KR')}</span></div>
      <div class="hp-body">
        <div class="hp-profile card">
          <div class="hp-av"><img src="${avSrc(h.avatar)}" alt="${esc(name)} 미니미"></div>
          <p class="hp-name">${esc(name)}${mine ? ` <small>${esc(store.myCode())}</small>` : ''}</p>
          <p class="hp-mood"><span>오늘의 기분</span>${esc(h.mood || '…')}</p>
          ${mine ? `<div class="hp-acts">
              <button class="btn btn-sm" data-mood>${icon('pencil', 15)}기분 쓰기</button>
              <button class="btn btn-sm" data-avatar>미니미 바꾸기</button></div>`
            : `<div class="hp-acts">${sendHeartBtn(ownerId)}${store.isFriend(ownerId) ? '<span class="badge badge-mint">친구</span>' : `<button class="btn btn-sm btn-primary" data-addfriend>${icon('userPlus', 15)}친구 추가</button>`}</div>`}
        </div>
        <div class="hp-room">
          <div class="hp-room-head"><b>미니룸</b><span>${esc(ROOMS[h.room])}</span>
            ${mine ? (editing ? `<span class="spacer"></span><button class="btn btn-sm btn-ghost" data-cancel>취소</button><button class="btn btn-sm btn-yellow" data-save>저장</button>`
              : `<span class="spacer"></span><button class="btn btn-sm btn-yellow" data-edit>${icon('pencil', 15)}꾸미기</button>`) : ''}</div>
          ${roomHtml(h, editing, sel)}
          ${editing ? `
            <div class="mr-tools" ${sel === null ? 'hidden' : ''}>
              <span>${sel === 'av' ? '미니미' : esc(ITEMS[draft.items[sel]?.key]?.[0] || '')} 선택됨 · 끌어서 옮기기</span>
              ${sel === 'av' ? Object.entries(POSES).map(([k, v]) => `<button class="btn btn-sm ${(draft.pose || 'stand') === k ? 'btn-yellow' : ''}" data-pose="${k}">${v[0]}</button>`).join('')
                : `<button class="btn btn-sm" data-flip>좌우 뒤집기</button><button class="btn btn-sm btn-pink" data-del>빼기</button>`}
            </div>
            <p class="mr-label">방 고르기</p>
            <div class="mr-rooms">${Object.entries(ROOMS).map(([k, v]) => `<button class="mr-room ${+k === draft.room ? 'on' : ''}" data-roomset="${k}" aria-label="${v}"><img src="${asset(`assets/home/room-${k}.webp`)}" alt=""></button>`).join('')}</div>
            <p class="mr-label">가구 넣기 <small>(눌러서 방에 놓기)</small></p>
            <div class="mr-kinds" role="tablist">${KINDS.map(([k, v]) => `<button class="chip-tab ${tray === k ? 'on' : ''}" role="tab" aria-selected="${tray === k}" data-tray="${k}">${v}</button>`).join('')}</div>
            <div class="mr-tray">${Object.entries(ITEMS).filter(([k]) => (tray === 'floor' ? ['floor', 'rug'] : [tray]).includes(kindOf(k))).map(([k, v]) => `<button class="mr-pick" data-add="${k}"><img src="${asset(`assets/home/it-${k}.webp`)}" alt=""><span>${v[0]}</span></button>`).join('')}</div>` : ''}
        </div>
      </div>
      <div class="sec-head"><h2>방명록</h2><span class="sub">${gb.length}개</span></div>
      ${mine ? '' : `<form class="gb-form" data-gb><input class="input" name="t" maxlength="120" placeholder="${esc(name)}에게 방명록 남기기" autocomplete="off"><button class="btn btn-primary">남기기</button></form>`}
      <div class="card gb-list">${gb.map(e => { const p = e.from === 'me' ? null : getPerson(e.from); return `<div class="gb-row">
        <img src="${asset(`assets/home/av-${p?.avatar || store.myHome()?.avatar || 1}.webp`)}" alt="">
        <div><b>${esc(p?.name || '나')}</b> <small>${ago(e.at)}</small>${p && p.id !== ownerId ? ` <a class="gb-visit" href="#/minihome/${p.id}">홈피 가기 ›</a>` : ''}<p>${esc(e.text)}</p></div></div>`; }).join('')}</div>`;
  };

  view.innerHTML = `
    <header class="hero-head"><div class="page topbar">
      ${mine ? '' : `<button class="icon-btn" data-back aria-label="뒤로">${icon('back', 22)}</button>`}
      <h1 style="font-size:26px">${mine ? '마이홈' : `${esc(person.name)}네 홈`}</h1></div></header>
    <div class="page pad"><section class="minihome" data-hp></section>${mine ? '<div data-mygames></div>' : ''}</div>`;
  draw();
  let cleanMy = null;
  if (mine) cleanMy = my.render(view.querySelector('[data-mygames]'), { embedded: true });

  // ---- 끌어서 옮기기 (꾸미기 중) ----
  let dragging = null;
  const onDown = e => {
    if (!editing) return;
    const it = e.target.closest('[data-item]');
    if (!it) { if (e.target.closest('[data-room]')) { sel = null; draw(); } return; }
    e.preventDefault();
    sel = it.dataset.item === 'av' ? 'av' : +it.dataset.item;
    draw();
    const room = view.querySelector('[data-room]').getBoundingClientRect();
    dragging = { room };
    try { view.querySelector('[data-room]').setPointerCapture?.(e.pointerId); } catch { /* 이미 끝난 포인터면 무시 */ }
  };
  const onMove = e => {
    if (!dragging) return;
    const { room } = dragging;
    const x = Math.max(4, Math.min(96, ((e.clientX - room.left) / room.width) * 100));
    const minY = sel !== 'av' && sel !== null && kindOf(draft.items[sel]?.key) === 'wall' ? 12 : 30;
    const y = Math.max(minY, Math.min(98, ((e.clientY - room.top) / room.height) * 100));
    if (sel === 'av') { draft.ax = x; draft.ay = y; } else if (sel !== null) { draft.items[sel].x = x; draft.items[sel].y = y; }
    const el = view.querySelector(`[data-item="${sel}"]`);
    if (el) { el.style.left = x + '%'; el.style.top = y + '%'; }
  };
  const onUp = () => { if (dragging) { dragging = null; draw(); } };

  const onClick = e => {
    const t = e.target;
    if (t.closest('[data-back]')) return goBack('#/friends');
    if (t.closest('[data-edit]')) { editing = true; sel = null; draft = structuredClone(home); return draw(); }
    if (t.closest('[data-cancel]')) { editing = false; sel = null; return draw(); }
    if (t.closest('[data-save]')) { home = draft; store.saveHome(home); editing = false; sel = null; toast('미니룸을 저장했어요'); return draw(); }
    const rs = t.closest('[data-roomset]'); if (rs) { draft.room = +rs.dataset.roomset; return draw(); }
    const add = t.closest('[data-add]');
    if (add && editing) {
      if (draft.items.length >= 14) return toast('가구는 14개까지 놓을 수 있어요');
      const wall = kindOf(add.dataset.add) === 'wall';
      draft.items.push({ key: add.dataset.add, x: 35 + Math.random() * 30, y: wall ? 30 + Math.random() * 8 : 60 + Math.random() * 10 });
      sel = draft.items.length - 1; return draw();
    }
    const tb = t.closest('[data-tray]'); if (tb) { tray = tb.dataset.tray; return draw(); }
    const ps = t.closest('[data-pose]'); if (ps && editing) { draft.pose = ps.dataset.pose; if (draft.pose === 'lie') draft.ay = Math.max(draft.ay, 60); return draw(); }
    if (t.closest('[data-flip]') && typeof sel === 'number') { draft.items[sel].flip = !draft.items[sel].flip; return draw(); }
    if (t.closest('[data-del]') && typeof sel === 'number') { draft.items.splice(sel, 1); sel = null; return draw(); }
    if (t.closest('[data-avatar]')) {
      sheet(`<h3>미니미 고르기</h3><p>마이홈과 친구 랭킹에 나오는 내 캐릭터예요.</p>
        <div class="av-grid">${AVATARS.map(a => `<button class="av-pick ${a === home.avatar ? 'on' : ''}" data-pick-av="${a}" aria-label="미니미 ${a}"><img src="${asset(`assets/home/av-${a}.webp`)}" alt=""></button>`).join('')}</div>
        <div class="acts"><button class="btn btn-ghost" data-close>닫기</button></div>`, {
        onMount(el, close) { el.addEventListener('click', ev => { const b = ev.target.closest('[data-pick-av]'); if (!b) return; home = { ...home, avatar: +b.dataset.pickAv }; store.saveHome(home); close(); toast('미니미를 바꿨어요'); draw(); }); },
      });
      return;
    }
    if (t.closest('[data-mood]')) {
      sheet(`<h3>오늘의 기분</h3><input class="input" data-mood-in maxlength="30" value="${esc(home.mood || '')}" placeholder="예: 블록 팡팡 신기록 도전 중!">
        <div class="acts"><button class="btn btn-ghost" data-close>취소</button><button class="btn btn-yellow" data-mood-ok>저장</button></div>`, {
        onMount(el, close) {
          const ok = () => { home = { ...home, mood: el.querySelector('[data-mood-in]').value.trim() }; store.saveHome(home); close(); draw(); };
          el.querySelector('[data-mood-ok]').addEventListener('click', ok);
          el.querySelector('[data-mood-in]').addEventListener('keydown', ev => { if (ev.key === 'Enter') ok(); });
        },
      });
      return;
    }
    if (t.closest('[data-addfriend]')) { store.addFriend(ownerId); toast(`${person.name}님을 친구로 추가했어요`); return draw(); }
  };
  const onSubmit = e => {
    if (!e.target.matches('[data-gb]')) return;
    e.preventDefault();
    const v = e.target.elements.t.value.trim();
    if (!v) return;
    store.writeGuestbook(ownerId, v); draw(); toast('방명록을 남겼어요');
  };
  const onHearts = () => draw();
  view.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  view.addEventListener('click', onClick);
  view.addEventListener('submit', onSubmit);
  window.addEventListener('hearts-changed', onHearts);
  return () => {
    cleanMy?.();
    view.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
    view.removeEventListener('click', onClick); view.removeEventListener('submit', onSubmit); window.removeEventListener('hearts-changed', onHearts);
  };
}
