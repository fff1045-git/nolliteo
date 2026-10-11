// 플레이: 풀스크린 게임(iframe 샌드박스) + 음성챗·채팅
// 친구 채팅: 이 PC에 AI 친구 서버(ai-friends/server.py)가 켜져 있으면 민지·하준이 Codex(코덱스 짭 MCP)로 대답,
//            없으면 연습용 대사로 동작한다. 음성챗은 아직 흉내만.
// 모바일: 위(나가기·음성챗·초대) / 가운데 게임 / 아래(리액션·채팅)
// 데스크톱: 가운데 세로 게임 프레임 + 오른쪽 채팅 패널
import { getGame, asset, esc } from '../data.js';
import * as store from '../store.js';
import { createHost } from '../host.js';
import { icon } from '../icons.js';
import { toast, goBack, copyText, soonSheet } from '../ui.js';
import { connectAiFriends } from '../ai-friends.js';

const FRIENDS = { 민지: '#4CC9F0', 하준: '#FFD23F', 나: '#FF5DA2' };
const SCRIPT = [
  ['민지', '3판 2선승 ㄱ?'],
  ['하준', '콜! 지는 사람이 리뷰 쓰기'],
  ['민지', '나 방금 두 줄 동시에 터뜨림 ㅋㅋ'],
  ['하준', '손 풀렸네… 나 아직 1판째'],
  ['민지', '구석부터 채우는 게 국룰임'],
  ['하준', '오 진짜 되네?'],
  ['민지', '이따 랭킹 캡처해서 보내줘'],
];
const REACTS = [['나이스!', 'btn-mint'], ['한 판 더', 'btn-yellow'], ['도와줘', 'btn']];

export function render(view, slug) {
  const g = getGame(slug);
  if (!g || g.status !== 'live') { location.replace('#/game/' + slug); if (g) soonSheet(g); return; }
  document.body.classList.add('playing');

  const avs = Object.entries(FRIENDS).map(([n, c]) => `<span class="avatar" data-av="${n}" style="background:${c}">${n[0]}</span>`).join('');
  const voice = `<div class="voice"><span class="vt"><b>음성챗</b><small data-talking>연결하는 중…</small></span><span class="avs">${avs}</span></div>`;
  const reacts = `<div class="reacts">${REACTS.map(([t, c]) => `<button class="btn ${c}" data-react="${t}">${t}</button>`).join('')}</div>`;
  const chatRow = (collapse) => `<form class="chat-row" data-chat>
      ${collapse ? `<button type="button" class="icon-btn dark" data-collapse aria-pressed="false" aria-label="채팅 접기">${icon('chat', 20)}</button>` : ''}
      <input class="input" name="msg" placeholder="메시지 보내기" autocomplete="off" maxlength="80" aria-label="메시지">
      <button type="button" class="icon-btn mic on" data-mic aria-pressed="true" aria-label="마이크">${icon('mic', 22)}</button>
    </form>`;

  view.innerHTML = `
  <div class="play">
    <div class="play-main">
      <div class="play-top">
        <button class="icon-btn" data-exit aria-label="나가기">${icon('x', 22)}</button>
        ${voice}
        <button class="icon-btn" style="background:var(--yellow)" data-invite aria-label="친구 초대">${icon('userPlus', 22)}</button>
      </div>
      <p class="practice-note m">연습용 — 실제 연결 없음</p>
      <div class="stage">
        <div class="frame">
          <iframe sandbox="allow-scripts" src="${asset(g.path)}" title="${esc(g.name)}" allow="autoplay"></iframe>
          <div class="stickers"></div>
        </div>
      </div>
      <div class="play-bottom"><div class="bubbles" aria-live="polite"></div>${reacts}${chatRow(true)}</div>
    </div>
    <aside class="side-chat" aria-label="채팅">
      ${voice}
      <p class="practice-note">연습용 — 실제 연결 없음</p>
      <div class="now"><span><b style="font-family:var(--font-title);font-weight:400;font-size:18px">${esc(g.name)}</b><br><small style="opacity:.7">현재 점수</small></span><span class="play-score" data-score>0</span></div>
      <button class="btn btn-yellow" data-invite>${icon('userPlus', 20)}친구 초대 링크 복사</button>
      <div class="log-box" aria-live="polite"></div>
      ${reacts}
      ${chatRow(false)}
    </aside>
  </div>`;

  const root = view.querySelector('.play');
  const iframe = root.querySelector('iframe');
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  // ---- 채팅 ----
  const say = (who, text) => {
    const html = `<i style="background:${FRIENDS[who] || '#fff'}"></i><span><b>${esc(who)}</b> ${esc(text)}</span>`;
    const b = Object.assign(document.createElement('div'), { className: 'bubble' + (who === '나' ? ' me' : ''), innerHTML: html });
    const box = root.querySelector('.bubbles');
    box.append(b);
    while (box.children.length > 1) box.firstElementChild.remove();
    later(() => b.remove(), 7000);
    const log = root.querySelector('.log-box');
    log.append(Object.assign(document.createElement('div'), { className: 'bubble' + (who === '나' ? ' me' : ''), innerHTML: html }));
    log.scrollTop = log.scrollHeight;
    if (who !== '나') talk(who);
  };
  const talk = who => {
    root.querySelectorAll('[data-av]').forEach(a => a.classList.toggle('talk', a.dataset.av === who));
    root.querySelectorAll('[data-talking]').forEach(s => { s.textContent = `${who} 말하는 중`; });
    later(() => {
      root.querySelectorAll(`[data-av="${who}"]`).forEach(a => a.classList.remove('talk'));
      root.querySelectorAll('[data-talking]').forEach(s => { s.textContent = '민지 · 하준 참여 중'; });
    }, 2200);
  };
  // ---- 친구 대화: AI 친구 서버가 있으면 Codex로, 없으면 연습용 대사 ----
  let ai = null, busy = false, alive = true, score = 0, lastAuto = 0;
  const queued = [];
  const canned = () => say(Math.random() < .5 ? '민지' : '하준', ['ㅋㅋㅋ', '인정', '오케이!', '집중해 집중'][Math.floor(Math.random() * 4)]);
  const setNote = text => root.querySelectorAll('.practice-note').forEach(p => { p.textContent = text; });
  const typing = on => {
    root.querySelectorAll('.bubble.typing').forEach(b => b.remove());
    if (!on) return;
    const html = '<span><b>민지 · 하준</b> 입력 중<span class="dots"><i></i><i></i><i></i></span></span>';
    root.querySelector('.bubbles').replaceChildren(Object.assign(document.createElement('div'), { className: 'bubble typing', innerHTML: html }));
    const log = root.querySelector('.log-box');
    log.append(Object.assign(document.createElement('div'), { className: 'bubble typing', innerHTML: html }));
    log.scrollTop = log.scrollHeight;
  };
  /** AI에게 묻고 답을 말풍선으로. 실패하면 연습용 대사 모드로 바꾸고 false */
  const askAi = async (event, extra = {}) => {
    if (!ai) return false;
    busy = true; typing(true);
    let ok = true;
    try {
      const replies = await ai.send(event, { score, ...extra });
      if (!alive) return true;
      typing(false);
      replies.forEach((r, i) => later(() => say(r.who, r.text), i * 1100));
    } catch {
      ok = false;
      if (!alive) return false;
      typing(false); ai = null;
      setNote('AI 친구 연결이 끊겼어요 — 연습용 대사로 바뀜');
      canned();
    } finally { busy = false; }
    if (ok && queued.length) askAi('message', { text: queued.splice(0).join(' / ') });
    return ok;
  };
  connectAiFriends(g).then(conn => {
    if (!alive) return;
    if (!conn) { SCRIPT.forEach(([who, text], i) => later(() => say(who, text), 2500 + i * 6500)); return; }
    ai = conn;
    setNote('AI 친구 연결됨 — 내 PC의 Codex가 대답해요');
    root.querySelectorAll('[data-talking]').forEach(t => { t.textContent = '민지 · 하준 참여 중'; });
    askAi('start');
  });

  const sticker = text => {
    const layer = root.querySelector('.stickers');
    const s = Object.assign(document.createElement('div'), { className: 'sticker', textContent: text });
    s.style.setProperty('--rot', `${(Math.random() * 14 - 7).toFixed(1)}deg`);
    s.style.left = `${15 + Math.random() * 45}%`;
    s.style.top = `${22 + Math.random() * 35}%`;
    layer.append(s);
    later(() => s.remove(), 1500);
  };

  // ---- 게임 호스트 ----
  store.recordPlayedWith(['minji', 'hajun'], slug);   // 최근 같이 한 친구

  const host = createHost({
    iframe, slug,
    onEvent(type, data) {
      if (type === 'score') { score = Number(data) || 0; root.querySelector('[data-score]').textContent = score.toLocaleString('ko-KR'); }
      if (type === 'gameOver') {
        if (!ai) later(() => say('하준', '한 판 더? 이번엔 내가 이김'), 900);
        else if (!busy && Date.now() - lastAuto > 12000) { lastAuto = Date.now(); askAi('gameOver', { score: Number(data) || score }); }
      }
      if (type === 'reviewUnlocked') toast('3분 달성! 이제 리뷰 쓰고 +50 받을 수 있어요');
      if (type === 'playMission') toast('오늘 5분 플레이 달성! 리워드에서 +20 받기');
    },
  });
  iframe.addEventListener('load', () => { if (matchMedia('(pointer: fine)').matches) iframe.focus(); });

  // ---- 버튼 ----
  const onClick = async e => {
    const t = e.target;
    if (t.closest('[data-exit]')) return goBack(`#/game/${slug}`);
    if (t.closest('[data-invite]')) {
      const ok = await copyText(asset(`index.html#/game/${slug}`));
      store.setFlag('invited');
      toast(ok ? '초대 링크 복사! 리워드에서 +30 받기' : '링크 복사를 못 했어요');
      return;
    }
    const r = t.closest('[data-react]');
    if (r) {
      sticker(r.dataset.react);
      if (ai && !busy) {
        if (r.dataset.react === '도와줘') askAi('help');
        else if (Date.now() - lastAuto > 8000) { lastAuto = Date.now(); askAi('react', { text: r.dataset.react }); }
      }
      return;
    }
    const mic = t.closest('[data-mic]');
    if (mic) {
      const on = mic.getAttribute('aria-pressed') !== 'true';
      root.querySelectorAll('[data-mic]').forEach(m => { m.setAttribute('aria-pressed', on); m.classList.toggle('on', on); m.innerHTML = icon(on ? 'mic' : 'micOff', 22); });
      toast(on ? '마이크 켜짐 (연습용)' : '마이크 꺼짐');
      return;
    }
    const col = t.closest('[data-collapse]');
    if (col) {
      const c = root.classList.toggle('collapsed');
      col.setAttribute('aria-pressed', c);
      col.setAttribute('aria-label', c ? '채팅 펼치기' : '채팅 접기');
    }
  };
  const onSubmit = e => {
    if (!e.target.matches('[data-chat]')) return;
    e.preventDefault();
    const inp = e.target.elements.msg;
    const text = inp.value.trim();
    if (!text) return;
    say('나', text);
    inp.value = '';
    inp.focus();   // 보낸 뒤에도 입력창에 그대로 남아 계속 칠 수 있게
    if (!ai) { later(canned, 1800); return; }
    if (busy) queued.push(text);   // 답을 기다리는 중이면 모아서 다음에 함께 보낸다
    else askAi('message', { text });
  };
  const onKey = e => { if (e.key === 'Escape' && document.activeElement?.tagName !== 'INPUT') goBack(`#/game/${slug}`); };
  root.addEventListener('click', onClick);
  root.addEventListener('submit', onSubmit);
  document.addEventListener('keydown', onKey);

  return () => {
    alive = false;
    host.destroy();
    timers.forEach(clearTimeout);
    document.removeEventListener('keydown', onKey);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };
}
