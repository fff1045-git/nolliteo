// AI 친구 연결 — 이 PC에서 켠 "AI 친구 서버"(ai-friends/server.py)가 있으면 민지·하준이 Codex로 대답한다.
// 서버는 코덱스 짭 MCP를 거쳐 Codex를 부른다. 서버가 없으면(폰, 다른 PC 등) null 을 돌려주고 연습용 대사로 동작한다.
const DEFAULT = 'http://127.0.0.1:8765';
const endpoint = (() => { try { return localStorage.getItem('nolliteo.aiEndpoint') || DEFAULT; } catch { return DEFAULT; } })();

async function getJSON(url, opts = {}, ms = 1500) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
  } finally { clearTimeout(t); }
}

/** 서버가 켜져 있으면 대화 객체를, 아니면 null */
export async function connectAiFriends(game) {
  // 크롬은 처음에 '로컬 네트워크 접근' 허용을 묻는다. 사용자가 고를 때까지 기다린다
  // (서버가 꺼져 있거나 거부하면 바로 실패하므로 오래 걸리지 않는다).
  try { await getJSON(`${endpoint}/health`, {}, 60000); } catch { return null; }
  const room = `${game.slug}-${Date.now().toString(36)}`;
  const info = { name: game.name, desc: game.description };
  return {
    /** event: start | message | react | help | gameOver  →  [{ who, text }] */
    async send(event, extra = {}) {
      const body = await getJSON(`${endpoint}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, event, game: info, ...extra }),
      }, 90000);
      return Array.isArray(body.replies) ? body.replies : [];
    },
  };
}
