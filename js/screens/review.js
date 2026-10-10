// 리뷰 쓰기: 추천/비추천, 본문, 작성 시점 플레이 시간, 등록(+50)
import { getGame, esc, fmtTime } from '../data.js';
import * as store from '../store.js';
import { icon } from '../icons.js';
import { toast, goBack } from '../ui.js';

const MIN_LEN = 10;

export function render(view, slug) {
  const g = getGame(slug);
  if (!g) { location.replace('#/'); return; }
  const can = store.canReview(slug);
  const played = store.playSeconds(slug);

  const head = `<header class="hero-head"><div class="page topbar">
      <button class="icon-btn" data-back aria-label="뒤로">${icon('back', 22)}</button>
      <h1 style="font-size:24px">리뷰 쓰기</h1></div></header>`;

  if (!can.ok) {
    view.innerHTML = `${head}<div class="page pad"><div class="card soon-page" style="margin-top:20px">
      <div class="big">${icon(can.why === 'done' ? 'check' : 'lock', 64)}</div>
      <h2>${can.why === 'done' ? '이미 리뷰를 썼어요' : '조금만 더 플레이해 주세요'}</h2>
      <p style="color:var(--muted);margin:10px 0 18px">${can.why === 'done'
        ? '리뷰는 게임마다 한 번만 쓸 수 있어요. 고마워요!'
        : `리뷰는 3분 이상 플레이해야 쓸 수 있어요.<br>지금 ${esc(g.name)} 플레이 시간: <b>${fmtTime(played)}</b>`}</p>
      ${can.why === 'done' ? `<a class="btn btn-yellow" href="#/game/${slug}">게임으로 돌아가기</a>` : `<a class="btn btn-primary btn-lg" href="#/play/${slug}">${icon('play', 18)}더 플레이하기</a>`}
    </div></div>`;
  } else {
    view.innerHTML = `${head}
    <div class="page pad" style="margin-top:20px;max-width:640px">
      <form class="card" style="padding:18px" data-form>
        <p style="font-weight:700">${esc(g.name)}, 어땠나요?</p>
        <p class="sub" style="color:var(--muted);font-size:13px;margin-bottom:14px">${icon('clock', 15, 'style="vertical-align:-2px"')} 내 플레이 시간 ${fmtTime(played)} — 리뷰에 함께 표시돼요</p>
        <div class="choice" role="group" aria-label="추천 여부">
          <button type="button" class="btn yes" data-rec="1" aria-pressed="false">${icon('up', 28)}추천해요</button>
          <button type="button" class="btn no" data-rec="0" aria-pressed="false">${icon('down', 28)}별로예요</button>
        </div>
        <label for="rv" style="display:block;font-weight:700;margin:18px 0 8px">어떤 점이 좋았거나 아쉬웠나요?</label>
        <textarea id="rv" class="input" maxlength="500" placeholder="다른 플레이어가 고를 때 도움이 되게 써 주세요 (10자 이상)"></textarea>
        <div class="field-hint"><span data-err></span><span><span data-len>0</span>/500</span></div>
        <button class="btn btn-yellow btn-lg btn-block" style="margin-top:16px" data-submit disabled>${icon('pencil', 20)}등록하고 +50 받기</button>
      </form>
    </div>`;
  }

  let rec = null;
  const update = () => {
    const ta = view.querySelector('#rv');
    if (!ta) return;
    const len = ta.value.trim().length;
    view.querySelector('[data-len]').textContent = ta.value.length;
    view.querySelector('[data-submit]').disabled = rec === null || len < MIN_LEN;
    view.querySelector('[data-err]').textContent = rec === null ? '추천 여부를 골라 주세요' : len < MIN_LEN ? `${MIN_LEN - len}자 더 써 주세요` : '';
  };
  update();

  const onClick = e => {
    if (e.target.closest('[data-back]')) return goBack(`#/game/${slug}`);
    const b = e.target.closest('[data-rec]');
    if (b) {
      rec = b.dataset.rec === '1';
      view.querySelectorAll('[data-rec]').forEach(x => x.setAttribute('aria-pressed', x === b));
      update();
    }
  };
  const onSubmit = e => {
    e.preventDefault();
    const text = view.querySelector('#rv').value.trim();
    const res = store.addReview({ slug, rec, text });
    if (!res.ok) return toast('리뷰를 등록하지 못했어요');
    toast('리뷰 등록 완료!', res.points);
    location.replace(`#/game/${slug}`);
  };
  view.addEventListener('click', onClick);
  view.addEventListener('input', update);
  view.addEventListener('submit', onSubmit);
  return () => { view.removeEventListener('click', onClick); view.removeEventListener('input', update); view.removeEventListener('submit', onSubmit); };
}
