// 친구 랭킹 표 (상세 화면 · 랭킹 탭 공용)
import { getGame, esc } from './data.js';
import { myRank, scoreUnit } from './compete.js';
import { sendHeartBtn } from './hearts-ui.js';
import * as store from './store.js';

export function friendRankHtml(slug, { title = true } = {}) {
  const g = getGame(slug);
  if (!g) return '';
  const { rank, total, rows } = myRank(slug, 0);
  const unit = scoreUnit(slug);
  const mine = store.record(slug);
  const head = title ? `<div class="sec-head"><h2>친구 랭킹</h2><span class="sub">이번 주 · 내 순위 ${rank}위 / ${total}명</span></div>` : `<p class="rank-sum">${esc(g.name)} · 내 순위 <b>${rank}위</b> / ${total}명</p>`;
  return `${head}
    <div class="card friend-rank">
      ${rows.map(r => `<div class="fr-row ${r.me ? 'me' : ''}">
        <span class="fr-no ${r.rank <= 3 ? 'top' + r.rank : ''}">${r.rank}</span>
        <span class="avatar" style="background:${r.color}">${esc(r.name[0])}</span>
        <span class="fr-name"><b>${esc(r.name)}</b><small>${r.me ? (mine.plays ? `${mine.plays}판` : '아직 안 해 봤어요') : `${r.plays}판`}</small></span>
        <span class="fr-score">${r.best.toLocaleString('ko-KR')}<small>${unit}</small></span>
        ${r.me ? '<span class="fr-act"></span>' : `<span class="fr-act">${sendHeartBtn(r.id)}</span>`}
      </div>`).join('')}
      ${total === 1 ? '<p class="friend-empty">친구를 추가하면 여기서 점수를 겨룰 수 있어요. <a href="#/friends" style="color:var(--theme);font-weight:700">친구 찾기 ›</a></p>' : ''}
    </div>`;
}
