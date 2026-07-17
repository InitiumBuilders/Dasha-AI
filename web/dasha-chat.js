/* Dasha chat widget — mounts on any <div data-dasha> (mode: "panel" | "full"). */
(function () {
  'use strict';
  var API = '/api/chat';
  var LSKEY = 'dasha.sessions.v1';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  /* minimal, safe markdown: fences → pre, `x` → code, links, **bold**; everything else escaped */
  function md(s) {
    var parts = String(s).split(/```(\w*)\n?/); var html = '', inCode = false, i;
    for (i = 0; i < parts.length; i++) {
      if (inCode) { html += '<pre>' + esc(parts[i]) + '</pre>'; inCode = false; i; continue; }
      if (i % 2 === 1) { inCode = true; continue; } // language tag slot
      var t = esc(parts[i]);
      t = t.replace(/`([^`\n]+)`/g, '<code class="inl">$1</code>');
      t = t.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
      t = t.replace(/(https?:\/\/[^\s<)"']+)/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener">' + u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 44) + '</a>'; });
      t = t.replace(/\n/g, '<br/>');
      html += t;
    }
    return html;
  }

  function store() { try { return JSON.parse(localStorage.getItem(LSKEY)) || { list: [], cur: null }; } catch (e) { return { list: [], cur: null }; } }
  function save(st) { try { localStorage.setItem(LSKEY, JSON.stringify(st)); } catch (e) {} }
  function newSession(st) {
    var s = { id: 'c' + Date.now().toString(36), title: 'New chat', msgs: [] };
    st.list.unshift(s); if (st.list.length > 8) st.list.length = 8;
    st.cur = s.id; save(st); return s;
  }
  function cur(st) { var s = st.list.find(function (x) { return x.id === st.cur; }); return s || newSession(st); }

  var HELLO = '<div class="dchat-hello"><b>Hi, I’m Dasha</b> — the Dash community’s support AI. I search the official docs, read live governance data, and check the chain in real time. Wallets, masternodes, data contracts, code — ask me anything. When you need a person, type <code class="inl">/human-support</code>.'
    + '<div class="dchips">'
    + '<button class="dchip" type="button">Draft a data contract for my app</button>'
    + '<button class="dchip" type="button">What proposals are passing right now?</button>'
    + '<button class="dchip" type="button">What do the docs say about identity credits?</button>'
    + '<button class="dchip" type="button">How busy is the Dash network today?</button>'
    + '<button class="dchip" type="button">/human-support</button>'
    + '</div></div>';

  function mount(el) {
    var full = (el.getAttribute('data-dasha') === 'full');
    el.innerHTML = ''
      + '<div class="dchat' + (full ? ' full' : '') + '">'
      + '  <div class="dchat-head"><span class="dot-live"></span><div><div class="ttl">DASHA</div><div class="sub">Dash Support AI · grounded in the Dash docs</div></div><span class="spacer"></span><button class="dchat-new" type="button">New chat</button></div>'
      + (full ? '<div class="dsessions"></div>' : '')
      + '  <div class="dchat-log"></div>'
      + '  <div class="dchat-input"><textarea rows="1" placeholder="Ask Dasha anything about Dash…" aria-label="Message Dasha"></textarea>'
      + '  <button class="dchat-send" type="button" aria-label="Send"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12h14M13 6l6 6-6 6" stroke="#04111f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>'
      + '  <div class="dchat-foot"><span>Answers cite the Dash docs — verify anything critical.</span><a href="/dasha-ai">How she works</a><a href="https://github.com/InitiumBuilders/Dasha-AI" target="_blank" rel="noopener">Open source</a></div>'
      + '</div>';

    var log = el.querySelector('.dchat-log'), ta = el.querySelector('textarea'),
        send = el.querySelector('.dchat-send'), newBtn = el.querySelector('.dchat-new'),
        sessBar = el.querySelector('.dsessions');
    var st = store(); var busy = false;

    function paintSessions() {
      if (!sessBar) return;
      sessBar.innerHTML = '';
      st.list.forEach(function (s) {
        var b = document.createElement('button'); b.type = 'button';
        b.className = 'dsess' + (s.id === st.cur ? ' on' : '');
        b.textContent = s.title;
        b.addEventListener('click', function () { st.cur = s.id; save(st); paint(); });
        sessBar.appendChild(b);
      });
      if (st.list.length > 1) {
        var d = document.createElement('button'); d.type = 'button'; d.className = 'dsess del'; d.textContent = '× delete';
        d.addEventListener('click', function () { st.list = st.list.filter(function (s) { return s.id !== st.cur; }); st.cur = st.list.length ? st.list[0].id : null; if (!st.cur) newSession(st); save(st); paint(); });
        sessBar.appendChild(d);
      }
    }
    /* what she actually reached for — honest transparency, not theater */
    var TOOL_LABEL = {
      search_dash_docs: 'searched the official Dash docs',
      dash_governance: 'read live DashCentral governance',
      dash_network_stats: 'checked live network stats',
      lookup_tx: 'looked up the transaction on-chain',
      lookup_address: 'looked up the address on-chain'
    };
    var DEPTH_LABEL = {
      requested: 'deep thinking · you asked',
      code: 'deep thinking · code',
      debugging: 'deep thinking · debugging',
      'builder-skill': 'deep thinking · builder work',
      'deep-work': 'deep thinking',
      complex: 'deep thinking · complex ask',
      'multi-part': 'deep thinking · multi-part',
      counsel: 'considered judgement'
    };
    function toolStrip(tools, depth) {
      var chips = [];
      if (depth) chips.push('<span class="dtool deep">✦ ' + (DEPTH_LABEL[depth] || 'deep thinking') + '</span>');
      if (tools && tools.length) {
        var uniq = tools.filter(function (t, i) { return tools.indexOf(t) === i; });
        uniq.forEach(function (t) { chips.push('<span class="dtool">◆ ' + (TOOL_LABEL[t] || t) + '</span>'); });
      }
      return chips.length ? ('<div class="dtools">' + chips.join('') + '</div>') : '';
    }
    function bubble(role, text, tools, qForFeedback, depth) {
      var d = document.createElement('div');
      d.className = 'dmsg ' + role;
      d.innerHTML = role === 'dasha' ? md(text) : esc(text);
      if (role === 'dasha') {
        var strip = toolStrip(tools, depth);
        if (strip) d.insertAdjacentHTML('afterbegin', strip);
        var fb = document.createElement('div');
        fb.className = 'dfb';
        fb.innerHTML = '<button class="fbb" data-g="1" type="button" aria-label="Helpful">👍</button>'
          + '<button class="fbb" data-g="0" type="button" aria-label="Not helpful">👎</button><span class="fbt"></span>';
        d.appendChild(fb);
        [].forEach.call(fb.querySelectorAll('.fbb'), function (b) {
          b.addEventListener('click', function () {
            var good = b.getAttribute('data-g') === '1';
            fb.querySelector('.fbt').textContent = good ? 'Thank you — noted.' : 'Thank you — the team will see this.';
            [].forEach.call(fb.querySelectorAll('.fbb'), function (x) { x.disabled = true; x.style.opacity = '.35'; });
            fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ feedback: { good: good, q: qForFeedback || '', a: String(text).slice(0, 900), tools: (tools || []).join(',') } }) }).catch(function () {});
          });
        });
      }
      log.appendChild(d); log.scrollTop = log.scrollHeight;
      return d;
    }
    function paint() {
      var s = cur(st); log.innerHTML = '';
      if (!s.msgs.length) { log.innerHTML = HELLO; wireChips(); }
      s.msgs.forEach(function (m, i) {
        var prevQ = i > 0 ? s.msgs[i - 1].content : '';
        bubble(m.role === 'assistant' ? 'dasha' : 'user', m.content, m.tools, prevQ, m.depth);
      });
      paintSessions();
    }
    function wireChips() {
      [].forEach.call(log.querySelectorAll('.dchip'), function (c) {
        c.addEventListener('click', function () { ta.value = c.textContent; go(); });
      });
    }
    var thinkTimer = null;
    function think(on) {
      var t = log.querySelector('.dthink');
      if (on && !t) {
        t = document.createElement('div'); t.className = 'dthink dmsg dasha';
        t.innerHTML = '<i></i><i></i><i></i><span class="dthinkt"></span>';
        log.appendChild(t); log.scrollTop = log.scrollHeight;
        clearTimeout(thinkTimer);
        thinkTimer = setTimeout(function () {
          var lab = log.querySelector('.dthinkt');
          if (lab) lab.textContent = 'reaching for live sources…';
        }, 7000);
      }
      if (!on) { clearTimeout(thinkTimer); if (t) t.remove(); }
    }
    function go() {
      if (busy) return;
      var q = ta.value.trim(); if (!q) return;
      var s = cur(st);
      if (!s.msgs.length) { var hello = log.querySelector('.dchat-hello'); if (hello) hello.remove(); s.title = q.slice(0, 34); }
      s.msgs.push({ role: 'user', content: q }); save(st);
      bubble('user', q); ta.value = ''; ta.style.height = '';
      busy = true; send.disabled = true; think(true);
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: s.msgs.slice(-12) }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (x) {
          think(false);
          if (!x.ok || x.d.error) { bubble('err', (x.d && x.d.error) || 'Something went sideways — try again.'); return; }
          s.msgs.push({ role: 'assistant', content: x.d.reply, tools: x.d.tools || [], depth: x.d.depth || null }); save(st);
          bubble('dasha', x.d.reply, x.d.tools || [], q, x.d.depth || null);
        })
        .catch(function () { think(false); bubble('err', 'Network hiccup — try again, or find a human at t.me/TheDashSupportTEAM'); })
        .finally(function () { busy = false; send.disabled = false; paintSessions(); });
    }
    send.addEventListener('click', go);
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
    ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(150, ta.scrollHeight) + 'px'; });
    newBtn.addEventListener('click', function () { newSession(st); paint(); });
    paint();
  }

  function init() { [].forEach.call(document.querySelectorAll('[data-dasha]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
