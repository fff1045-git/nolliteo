// 친구: 내 친구 코드, 닉네임·코드로 찾기, 내 친구 목록, 최근 같이 한 친구, 추천 친구, 초대 링크
// 연습 버전이라 친구 요청 없이 바로 추가되고, 접속 상태는 예시 데이터(data/friends.json)다.
import { allPeople, getPerson, getGame, esc, asset } from '../data.js';
import * as store from '../store.js';
import { icon } from '../icons.js';
import { toast, sheet, copyText, playAction } from '../ui.js';

const ago = ms => {
  const m = Math.floor(ms / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
};
const statusText = p => {
  if (p.status?.online) {
    const g = getGame(p.status.playing);
    return g ? `${g.name} 하는 중` : '접속 중';
  }
  return `${ago((p.status?.lastSeenMin || 60) * 60000)} 접속`;
};

/** 추천 친구: 내가 즐겨 한 게임과 겹치는 사람 + 함께 아는 친구가 많은 사람 */
function recommended() {
  const pt = store.playtimeMap();
  const mine = Object.keys(pt).filter(k => pt[k] > 0);
  const recent = new Set(store.playedWith().map(r => r.id));   // '최근 같이 한 친구'에 이미 나오는 사람은 빼기
  return allPeople()
    .filter(p => !store.isFriend(p.id) && !recent.has(p.id))
    .map(p => {
      const shared = p.fav.filter(s => mine.includes(s)).sort((a, b) => pt[b] - pt[a]);
      const score = shared.reduce((s, k) => s + Math.min(pt[k], 1800), 0) / 60 + p.mutual * 8 + (p.status?.online ? 3 : 0);
      const reason = shared.length ? `나처럼 ${getGame(shared[0])?.name || ''}을(를) 자주 해요`
        : p.mutual ? `함께 아는 친구 ${p.mutual}명` : `${getGame(p.fav[0])?.name || '게임'}을(를) 좋아해요`;
      return { p, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function row(p, sub, actions) {
  const on = p.status?.online;
  return `<div class="friend-row">
    <span class="avatar lg" style="background:${p.color}">${esc(p.name[0])}${on ? '<i class="online" aria-label="접속 중"></i>' : ''}</span>
    <div class="fi"><b>${esc(p.name)}</b><small>${sub}</small></div>
    <div class="fa">${actions}</div>
  </div>`;
}
const addBtn = p => store.isFriend(p.id)
  ? `<span class="badge badge-mint">친구</span>`
  : `<button class="btn btn-sm btn-primary" data-add="${p.id}">${icon('userPlus', 16)}추가</button>`;

export function render(view) {
  let query = '';
  const draw = () => {
    const friends = store.friendIds().map(getPerson).filter(Boolean);
    const recent = store.playedWith().map(r => ({ ...r, p: getPerson(r.id) })).filter(r => r.p).slice(0, 6);
    const recs = recommended();
    const q = query.trim().toLowerCase();
    const found = q ? allPeople().filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase() === q || p.code.toLowerCase().replace('nol-', '') === q) : [];

    view.querySelector('[data-body]').innerHTML = `
      ${q ? `<div class="sec-head"><h2>찾은 사람</h2><span class="sub">${found.length}명</span></div>
        <div class="card friend-list">${found.length ? found.map(p => row(p, `${esc(p.code)} · ${esc(statusText(p))}`, addBtn(p))).join('') : '<p class="friend-empty">그런 이름이나 코드를 가진 사람이 없어요</p>'}</div>` : ''}

      <div class="sec-head"><h2>내 친구</h2><span class="sub">${friends.length}명 · 접속 중 ${friends.filter(p => p.status?.online).length}명</span></div>
      ${friends.length ? `<div class="card friend-list">${friends.map(p => {
        const g = p.status?.online && getGame(p.status.playing);
        return row(p, esc(statusText(p)), `${g && g.status === 'live' ? `<button class="btn btn-sm btn-yellow" data-join="${g.slug}">같이 하기</button>` : ''}<button class="icon-btn sm" data-remove="${p.id}" aria-label="${esc(p.name)} 친구 삭제">${icon('x', 16)}</button>`);
      }).join('')}</div>`
        : `<div class="empty">아직 친구가 없어요. 아래 추천 친구를 추가하거나<br>닉네임·친구 코드로 찾아보세요.</div>`}

      <div class="sec-head"><h2>최근 같이 한 친구</h2></div>
      ${recent.length ? `<div class="card friend-list">${recent.map(r => row(r.p, `${esc(getGame(r.slug)?.name || '')} · ${r.count}번 같이 함 · ${ago(Date.now() - r.at)}`, addBtn(r.p))).join('')}</div>`
        : `<div class="empty">게임을 하면 같이 있던 친구가 여기 나와요.</div>`}

      <div class="sec-head"><h2>추천 친구</h2><span class="sub">즐겨 하는 게임·함께 아는 친구 기준</span></div>
      ${recs.length ? `<div class="rec-grid">${recs.map(({ p, reason }) => `
        <div class="card rec-friend">
          <span class="avatar lg" style="background:${p.color}">${esc(p.name[0])}${p.status?.online ? '<i class="online"></i>' : ''}</span>
          <b>${esc(p.name)}</b><small>${esc(reason)}</small>
          <button class="btn btn-sm btn-primary" data-add="${p.id}">${icon('userPlus', 16)}친구 추가</button>
        </div>`).join('')}</div>`
        : `<div class="empty">추천할 친구를 모두 추가했어요!</div>`}

      <div class="sec-head"><h2>친구 초대</h2></div>
      <div class="card" style="padding:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <img src="${asset('assets/img/app-icon.webp')}" alt="" width="52" height="52" style="border-radius:14px">
        <p style="flex:1;min-width:160px;font-size:14px">놀이터에 없는 친구는 링크로 불러오세요.<br><small style="color:var(--muted)">링크를 복사하면 리워드 미션 +30</small></p>
        <button class="btn btn-yellow" data-invite>${icon('userPlus', 18)}초대 링크 복사</button>
      </div>`;
  };
  // 검색창은 한 번만 그린다 (한글 입력 중 다시 그리면 글자 조합이 깨짐). 아래 목록만 갱신.
  view.innerHTML = `
    <header class="hero-head"><div class="page topbar"><h1 style="font-size:28px">친구</h1><span class="spacer"></span>
      <button class="chip" data-mycode aria-label="내 친구 코드 복사">${icon('link', 16)}${esc(store.myCode())}</button></div></header>
    <div class="page pad">
      <form class="search-box" data-search style="margin-top:6px">
        <label class="sr-only" for="fq">닉네임 또는 친구 코드</label>
        <input id="fq" class="input" type="search" placeholder="닉네임 또는 친구 코드(NOL-XXXX)로 찾기" autocomplete="off">
      </form>
      <div data-body></div>
    </div>`;
  draw();

  const onClick = async e => {
    const t = e.target;
    const add = t.closest('[data-add]');
    if (add) {
      const p = getPerson(add.dataset.add);
      if (store.addFriend(p.id)) toast(`${p.name}님을 친구로 추가했어요`);
      return draw();
    }
    const rm = t.closest('[data-remove]');
    if (rm) {
      const p = getPerson(rm.dataset.remove);
      sheet(`<h3>${esc(p.name)}님을 친구에서 삭제할까요?</h3><p>나중에 추천 친구나 검색으로 다시 추가할 수 있어요.</p>
        <div class="acts"><button class="btn btn-ghost" data-close>취소</button><button class="btn btn-pink" data-confirm>삭제</button></div>`, {
        onMount(el, close) { el.querySelector('[data-confirm]').addEventListener('click', () => { store.removeFriend(p.id); close(); toast('친구에서 삭제했어요'); draw(); }); },
      });
      return;
    }
    const join = t.closest('[data-join]');
    if (join) { const g = getGame(join.dataset.join); if (g) playAction(g); return; }
    if (t.closest('[data-mycode]')) { if (await copyText(store.myCode())) toast(`내 친구 코드 ${store.myCode()} 복사했어요`); return; }
    if (t.closest('[data-invite]')) {
      await copyText(asset(`index.html?from=${store.myCode()}`));
      store.setFlag('invited');
      toast('초대 링크 복사! 리워드에서 +30 받기');
    }
  };
  const onInput = e => { if (e.target.id === 'fq') { query = e.target.value; draw(); } };
  const onSubmit = e => { if (e.target.matches('[data-search]')) e.preventDefault(); };
  view.addEventListener('click', onClick);
  view.addEventListener('input', onInput);
  view.addEventListener('submit', onSubmit);
  return () => { view.removeEventListener('click', onClick); view.removeEventListener('input', onInput); view.removeEventListener('submit', onSubmit); };
}
