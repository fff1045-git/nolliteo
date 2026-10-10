/* 놀이터 게임 SDK — 게임이 플랫폼과 대화하는 유일한 통로
 *
 *   PG.ready()          로딩 끝
 *   PG.gameStart()      플레이 시작 (플레이 시간 측정 시작)
 *   PG.score(n)         현재 점수 (화면 표시용)
 *   PG.gameOver(score)  한 판 끝
 *   PG.save(data)       이어하기 저장 → 플랫폼이 대신 저장
 *   PG.load()           Promise로 저장 데이터 받기
 *
 * 실행 환경 3가지를 자동으로 고른다.
 *   1) 놀이터 플레이 화면 iframe 안   → window.parent 로 postMessage
 *   2) 놀이터 모바일 앱(Flutter WebView) → NolBridge 채널로 전달, 앱이 PG._receive 로 답함
 *   3) 게임 파일을 직접 연 경우         → 이 기기 localStorage 에 저장 (개발 확인용)
 */
(function () {
  'use strict';
  var slug = (document.currentScript && document.currentScript.dataset.game) || location.pathname.split('/').filter(Boolean).slice(-2, -1)[0] || 'game';
  var inFrame = window.parent !== window;
  var seq = 0;
  var waiting = {};

  function bridge() { return window.NolBridge && typeof window.NolBridge.postMessage === 'function' ? window.NolBridge : null; }

  function send(type, data, id) {
    var msg = { pg: 1, type: type, data: data, id: id };
    if (inFrame) { window.parent.postMessage(msg, '*'); return true; }
    var b = bridge();
    if (b) { b.postMessage(JSON.stringify(msg)); return true; }
    return false;
  }

  function receive(m) {
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { return; } }
    if (!m || m.pg !== 1 || m.type !== 'loadResult' || !waiting[m.id]) return;
    waiting[m.id](m.data == null ? null : m.data);
    delete waiting[m.id];
  }
  window.addEventListener('message', function (e) {
    if (inFrame && e.source !== window.parent) return;
    receive(e.data);
  });

  var LS = 'pg-local-save:' + slug;
  function localSave(d) { try { localStorage.setItem(LS, JSON.stringify(d)); } catch (e) {} }
  function localLoad() { try { return JSON.parse(localStorage.getItem(LS)); } catch (e) { return null; } }

  window.PG = {
    ready: function () { send('ready'); },
    gameStart: function () { send('gameStart'); },
    score: function (n) { send('score', Number(n) || 0); },
    gameOver: function (score) { send('gameOver', Number(score) || 0); },
    save: function (data) { if (!send('save', data)) localSave(data); },
    load: function () {
      return new Promise(function (resolve) {
        var id = 'l' + (++seq);
        if (!inFrame && !bridge()) return resolve(localLoad());
        var done = false;
        waiting[id] = function (d) { done = true; resolve(d); };
        send('load', null, id);
        // 플랫폼이 답하지 않으면 1.5초 뒤 빈 데이터로 시작
        setTimeout(function () { if (!done) { delete waiting[id]; resolve(null); } }, 1500);
      });
    },
    vibrate: function (ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} },
    _receive: receive,
  };
})();
