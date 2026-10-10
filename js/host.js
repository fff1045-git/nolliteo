// 게임 호스트 — iframe 안 게임과 postMessage로만 대화한다 (SDK의 상대편).
// 플레이 화면(play.js)과 게임별 홈 화면 런처(g/<slug>/)가 함께 쓴다.
//
// 메시지 형식: { pg: 1, type, id?, data? }  — 모르는 메시지는 무시한다.
// 플레이 시간: 게임이 시작됐고(gameStart~gameOver) 화면이 보이는 동안만 1초씩 센다.
import * as store from './store.js';

const TYPES = new Set(['ready', 'gameStart', 'score', 'gameOver', 'save', 'load']);

export function createHost({ iframe, slug, onEvent = () => {} }) {
  let running = false;
  let pending = 0;

  const reply = msg => iframe.contentWindow?.postMessage({ pg: 1, ...msg }, '*'); // 샌드박스 iframe은 출처가 없어서 '*'

  const flush = () => {
    if (!pending) return;
    const beforeAll = store.playSeconds(slug);
    const beforeToday = store.playSecondsToday(slug);
    store.addPlay(slug, pending);
    pending = 0;
    if (beforeAll < store.REVIEW_MIN_SEC && store.playSeconds(slug) >= store.REVIEW_MIN_SEC) onEvent('reviewUnlocked');
    if (beforeToday < store.PLAY_MISSION_SEC && store.playSecondsToday(slug) >= store.PLAY_MISSION_SEC) onEvent('playMission');
  };

  const onMessage = e => {
    if (e.source !== iframe.contentWindow) return;
    const m = e.data;
    if (!m || m.pg !== 1 || !TYPES.has(m.type)) return;
    switch (m.type) {
      case 'ready': onEvent('ready'); break;
      case 'gameStart':
        if (!running) { running = true; store.markPlayed(slug); }
        onEvent('start'); break;
      case 'score':
        if (Number.isFinite(m.data)) onEvent('score', m.data); break;
      case 'gameOver':
        running = false; flush();
        onEvent('gameOver', Number.isFinite(m.data) ? m.data : null); break;
      case 'save':
        store.setSave(slug, m.data ?? null); break;
      case 'load':
        reply({ type: 'loadResult', id: m.id, data: store.getSave(slug) }); break;
    }
  };

  const timer = setInterval(() => {
    if (running && document.visibilityState === 'visible') {
      pending += 1;
      if (pending >= 5) flush();
    }
  }, 1000);
  const onHide = () => { if (document.visibilityState === 'hidden') flush(); };

  window.addEventListener('message', onMessage);
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', flush);

  return {
    destroy() {
      flush();
      clearInterval(timer);
      window.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    },
  };
}
