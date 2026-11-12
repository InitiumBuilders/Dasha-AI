/* Dasha chat widget — mounts on any <div data-dasha> (mode: "panel" | "full" | "sheet").
   "sheet" is her chat opened in place from the Get help launcher (app.js): the whole screen on a
   phone, a docked panel on a wide screen. window.DashaChat.mount(el) mounts one on demand. */
(function () {
  'use strict';
  var API = '/api/chat', VOICE = '/api/voice';
  var LSKEY = 'dasha.sessions.v1';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  /* minimal, safe markdown. Everything is HTML-escaped first; the only markup that exists afterwards
     is what this file writes. Fences → a code block with a Copy button; outside fences, blocks
     (paragraphs, lists, headings, rules, tables) and then inline (links, `code`, **bold**, *italic*).
     Splitting on a NON-capturing fence pattern means odd segments are code, even are text —
     no closing-fence off-by-one, and text after a code block renders as text, not code.
     A skill she announces on the first line ("[/dash-gov]") becomes a small mark above the answer. */
  function md(s) {
    s = String(s == null ? '' : s);
    var skills = null, m = s.match(/^\s*((?:\[\/[a-z0-9-]+\][ \t]*)+)\n*/i);
    if (m) { skills = m[1].match(/\/[a-z0-9-]+/gi); s = s.slice(m[0].length); }
    var parts = s.split(/```[\w-]*\n?/);
    var html = skills ? ('<div class="dskill" aria-label="The skill she used">' + skills.map(function (k) { return '<span>' + esc(k) + '</span>'; }).join('') + '</div>') : '';
    for (var i = 0; i < parts.length; i++) {
      html += (i % 2) ? ('<div class="dcode"><div class="dcode-bar"><button class="dcopy" type="button">Copy</button></div><pre>' + esc(parts[i].replace(/\n+$/, '')) + '</pre></div>') : blocks(esc(parts[i]));
    }
    return html;
  }
  /* t is already HTML-escaped. One line at a time: a heading, a rule, a list item, a table row, or
     a line of a paragraph. A blank line ends whatever was open. */
  function blocks(t) {
    var lines = t.split('\n'), out = [], para = [], list = null, table = null, mm;
    function flushP() { if (para.length) { out.push('<p>' + para.map(inline).join('<br/>') + '</p>'); para = []; } }
    function flushL() {
      if (!list) return;
      out.push('<' + list.tag + (list.tag === 'ol' && list.start > 1 ? ' start="' + list.start + '"' : '') + '>'
        + list.items.map(function (it) { return '<li>' + it.map(inline).join('<br/>') + '</li>'; }).join('') + '</' + list.tag + '>');
      list = null;
    }
    function flushT() {
      if (!table) return;
      var rows = table.filter(function (r) { return !/^\|[\s:|-]+\|$/.test(r); }).map(function (r) { return r.replace(/^\||\|$/g, '').split('|').map(function (c) { return inline(c.trim()); }); });
      if (rows.length) out.push('<div class="dtable"><table><thead><tr>' + rows[0].map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>'
        + rows.slice(1).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
      table = null;
    }
    function flush() { flushP(); flushL(); flushT(); }
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (!L.trim()) { flush(); continue; }
      if ((mm = L.match(/^\s{0,3}#{1,4}\s+(.+?)\s*#*\s*$/))) { flush(); out.push('<h4>' + inline(mm[1]) + '</h4>'); continue; }
      if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(L)) { flush(); out.push('<hr/>'); continue; }
      if ((mm = L.match(/^\s*[-*•]\s+(.+)$/))) { flushP(); flushT(); if (!list || list.tag !== 'ul') { flushL(); list = { tag: 'ul', items: [] }; } list.items.push([mm[1]]); continue; }
      if ((mm = L.match(/^\s*(\d{1,3})[.)]\s+(.+)$/))) { flushP(); flushT(); if (!list || list.tag !== 'ol') { flushL(); list = { tag: 'ol', items: [], start: +mm[1] }; } list.items.push([mm[2]]); continue; }
      if (/^\s*\|.*\|\s*$/.test(L)) { flushP(); flushL(); (table = table || []).push(L.trim()); continue; }
      if (list && /^\s{2,}\S/.test(L)) { list.items[list.items.length - 1].push(L.trim()); continue; }   /* a wrapped line of the item above */
      flushL(); flushT(); para.push(L);
    }
    flush();
    return out.join('');
  }
  /* t is already HTML-escaped. Links are stashed as placeholders so bold/code passes never
     touch their markup, and a bare-url pass never re-links a url already inside an anchor. */
  var S0 = '\u0001';
  function inline(t) {
    var stash = [];
    function keep(h) { stash.push(h); return S0 + (stash.length - 1) + S0; }
    /* markdown links: [label](https://…) → the label is what shows, the url is where it goes */
    t = t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, label, url) {
      return keep('<a href="' + url + '" target="_blank" rel="noopener">' + label + '</a>');
    });
    /* bare urls (and www.) not already stashed; trim trailing sentence punctuation */
    t = t.replace(/(^|[\s(>–—])((?:https?:\/\/|www\.)[^\s<)"']+)/g, function (m, pre, url) {
      var trail = ''; var mm = url.match(/[.,;:!?)\]]+$/); if (mm) { trail = mm[0]; url = url.slice(0, -trail.length); }
      var href = /^www\./i.test(url) ? ('https://' + url) : url;
      return pre + keep('<a href="' + href + '" target="_blank" rel="noopener">' + url.replace(/^https?:\/\/(www\.)?/, '') + '</a>') + trail;
    });
    t = t.replace(/`([^`\n]+)`/g, function (m, c) { return keep('<code class="inl">' + c + '</code>'); });
    t = t.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
    /* *italic*: the asterisks hug the words on both sides, so a bullet's "* " is left alone */
    t = t.replace(/(^|[^\w*])\*([^*\s](?:[^*\n]*[^*\s])?)\*(?![\w*])/g, '$1<i>$2</i>');
    t = t.replace(/\n/g, '<br/>');
    return t.replace(new RegExp(S0 + '(\\d+)' + S0, 'g'), function (m, n) { return stash[+n]; });
  }

  function store() { try { return JSON.parse(localStorage.getItem(LSKEY)) || { list: [], cur: null }; } catch (e) { return { list: [], cur: null }; } }
  function save(st) { try { localStorage.setItem(LSKEY, JSON.stringify(st)); } catch (e) {} }
  function newSession(st) {
    var s = { id: 'c' + Date.now().toString(36), title: 'New chat', msgs: [] };
    st.list.unshift(s); if (st.list.length > 8) st.list.length = 8;
    st.cur = s.id; save(st); return s;
  }
  function cur(st) { var s = st.list.find(function (x) { return x.id === st.cur; }); return s || newSession(st); }
  function phone() { return !!(window.matchMedia && window.matchMedia('(max-width: 720px)').matches); }
  function copyText(t, btn, done) {
    var was = btn.textContent;
    function ok() { btn.textContent = done || 'Copied'; btn.classList.add('ok'); setTimeout(function () { btn.textContent = was; btn.classList.remove('ok'); }, 1600); }
    try { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(ok).catch(function () {}); } catch (e) {}
  }

  /* header icons, drawn: emoji render as blank boxes on some phones */
  function svg(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var IC = {
    proj: svg('<rect x="4" y="5" width="16" height="14" rx="3.5"/><path d="M8 10h8M8 14h5"/>'),
    help: svg('<path d="M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.8v.4"/><path d="M12 17.4h.01" stroke-width="2.6"/>'),
    full: svg('<path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15"/>'),
    exit: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    plus: svg('<path d="M12 5.5v13M5.5 12h13"/>'),
    voice: svg('<path d="M4 10.5v3M8 7.5v9M12 4.5v15M16 8v8M20 10.5v3"/>')
  };

  /* the first questions she offers fit the page she was opened on. The first chip is always for
     the person who doesn't know what to ask — which is most people, and the ones a menu fails
     hardest — and the last always reaches a person. */
  var STARTERS = {
    '/our-proposal': ['What does the 128 DASH pay for?', 'When do votes close?', 'How do masternodes vote on it?'],
    '/dash-alive': ['How do I list my project?', 'What proposals are passing right now?', 'What does Verified mean?'],
    '/reserve': ['How does the Pool work?', 'Who approves an award?', 'Where can I see the transactions?'],
    '/pulse': ['What do these numbers count?', 'What proposals are passing right now?', 'How do I log help I gave a builder?'],
    '/waves': ['What is a Dash Wave?', 'What are the six bindings?', 'How would my project become a Wave?'],
    '/proposal-check': ['Help me read my prepare command', 'How do I submit a proposal?', 'When should I submit to be paid next?'],
    '/tools': ['When do votes close?', 'How do I vote from Dash Core?', 'How does the pass line work?'],
    '/watch': ['Where does the film cover the ask?', 'What is the Dash Waves protocol?', 'When do votes close?'],
    '/design': ['What is in the design library?', 'How do I use a design system with my app?', 'Draft a data contract for my app']
  };
  function hello() {
    var here = location.pathname.replace(/\/$/, '').toLowerCase();
    var mid = STARTERS[here] || ['Draft a data contract for my app', 'What proposals are passing right now?', 'Is this message a scam?'];
    return '<div class="dchat-hello"><b>Hi, I’m Dasha</b> — the Dash community’s support AI. I search the official docs, read live governance data, and check the chain and Dash Platform in real time. Wallets, masternodes, data contracts, code — ask me anything. When you need a person, type <code class="inl">/human-support</code>.'
      + '<div class="dchips">'
      + '<button class="dchip lost" type="button">I don\'t know where to start</button>'
      + mid.map(function (q) { return '<button class="dchip" type="button">' + esc(q) + '</button>'; }).join('')
      + '<button class="dchip" type="button">/human-support</button>'
      + '</div></div>';
  }

  /* ---- HER VOICE. Two ways to hear a reply. When the team's voice is switched on, the server reads her own reply
     in the Honor voice, and it will read nothing else: each reply comes with a ticket only the server can make.
     Otherwise, and whenever that fails, the device's own voice reads it and nothing leaves the device.
     One reply plays at a time. ---- */
  var VO = { run: 0, audio: null, url: null, server: null, onState: null };
  var QUIET = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  /* a reply as it should be heard: the skill mark, the code and the markup are for the eye */
  function speakable(t) {
    t = String(t || '').replace(/^\s*(?:\[\/[a-z0-9-]+\]\s*)+/i, '').replace(/```[\s\S]*?```/g, ' The code is on your screen. ')
      .replace(/`([^`\n]{1,80})`/g, '$1').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/(?:www\.)?([^\s/)]+)[^\s)]*/g, '$1').replace(/^\s{0,3}#{1,6}\s*/gm, '').replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\|?[\s:|-]{3,}\|?\s*$/gm, ' ').replace(/\s*\|\s*/g, ', ').replace(/\*+/g, '')
      .replace(/\s*\n\s*\n\s*/g, '. ').replace(/\s*\n\s*/g, '. ').replace(/\s+/g, ' ').replace(/([:;,])\s*\./g, '.').replace(/([.!?])\s*(?:\.\s*)+/g, '$1 ');
    return t.trim().slice(0, 6000);
  }
  function voStop() {
    VO.run++;
    if (VO.audio) { try { VO.audio.pause(); } catch (e) {} }
    if (VO.url) { try { URL.revokeObjectURL(VO.url); } catch (e) {} VO.url = null; }
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
    var f = VO.onState; VO.onState = null; if (f) f(false);
  }
  /* a tap opens the way for sound that starts a moment later (a phone only plays what a tap began) */
  function voPrime() {
    try { var a = VO.audio || (VO.audio = new Audio()); a.src = QUIET; var p = a.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    try { if (window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') window.speechSynthesis.speak(new SpeechSynthesisUtterance(' ')); } catch (e) {}
  }
  function voDevice(text, run, done) {
    var S = window.speechSynthesis;
    if (!S || typeof SpeechSynthesisUtterance === 'undefined') { done(); return; }
    /* said a few sentences at a time: one long passage stalls some engines part-way */
    var sents = speakable(text).split(/\s+(?=[A-Z0-9"'(])/), chunks = [], cur = '';
    sents.forEach(function (s) { if (cur && (cur + ' ' + s).length > 220 && /[.!?]["')\]]?$/.test(cur)) { chunks.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s; });
    if (cur) chunks.push(cur);
    var i = 0;
    (function next() {
      if (run !== VO.run) return;
      if (i >= chunks.length) { done(); return; }
      var u = new SpeechSynthesisUtterance(chunks[i++]);
      u.onend = next; u.onerror = function () { if (run === VO.run) done(); };
      S.speak(u);
    })();
  }
  function voPart(text, ticket, part) {
    return fetch(VOICE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text, ticket: ticket, part: part }) })
      .then(function (r) {
        if (!r.ok) throw new Error('voice ' + r.status);
        var n = +(r.headers.get('X-Voice-Parts') || 1);
        return r.blob().then(function (b) { return { blob: b, parts: n }; });
      });
  }
  function voHonor(text, ticket, run, done) {
    var nextP = null;
    function play(i, got) {
      if (run !== VO.run) return;
      if (VO.url) { try { URL.revokeObjectURL(VO.url); } catch (e) {} }
      VO.url = URL.createObjectURL(got.blob);
      var a = VO.audio || (VO.audio = new Audio());
      a.onended = function () {
        if (run !== VO.run) return;
        if (i + 1 >= got.parts) { done(); return; }
        (nextP || voPart(text, ticket, i + 1)).then(function (g) { play(i + 1, g); }, function () { done(); });
      };
      a.onerror = function () { if (run === VO.run) done(); };
      a.src = VO.url;
      var p = a.play(); if (p && p.catch) p.catch(function () { if (run === VO.run) done(); });
      /* the next part is fetched while this one plays */
      nextP = (i + 1 < got.parts) ? voPart(text, ticket, i + 1) : null;
      if (nextP) nextP.catch(function () {});
    }
    voPart(text, ticket, 0).then(function (g) { play(0, g); }, function () { if (run === VO.run) voDevice(text, run, done); });
  }
  function voSpeak(text, ticket, onState) {
    voStop();
    var run = VO.run; VO.onState = onState || null;
    function done() { if (run !== VO.run) return; var f = VO.onState; VO.onState = null; if (f) f(false); }
    if (onState) onState(true);
    if (ticket && VO.server !== false) voHonor(text, ticket, run, done); else voDevice(text, run, done);
  }
  function voCan(ticket) { return !!ticket || !!(window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined'); }
  /* asked once, the first time someone opens the voice panel: is the team's voice switched on? */
  function voAsk(cb) {
    if (VO.server !== null) { cb(VO.server); return; }
    fetch(VOICE).then(function (r) { return r.json(); }).then(function (j) { VO.server = !!(j && j.voice); cb(VO.server); }).catch(function () { VO.server = false; cb(false); });
  }

  function mount(el) {
    if (el._dasha) return el._dasha;
    var mode = el.getAttribute('data-dasha'), full = (mode === 'full'), sheet = (mode === 'sheet');
    el.innerHTML = ''
      + '<div class="dchat' + (full ? ' full' : '') + '">'
      + '  <div class="dchat-head"><span class="dot-live"></span><div class="dchat-id"><div class="ttl">DASHA</div><div class="sub">Dash Support AI<span class="sub-x"> · grounded in the Dash docs</span></div></div><span class="spacer"></span>'
      + '<div class="dchat-tools"><button class="dchat-tool dproj" type="button" aria-label="Your project card" title="Your project — she remembers your build">' + IC.proj + '</button><button class="dchat-tool dhelp" type="button" aria-label="What can Dasha do?" title="All her skills">' + IC.help + '</button>'
      + '<button class="dchat-new" type="button" aria-label="New chat">' + IC.plus + '<span class="dn-t">New chat</span></button>'
      + (sheet ? '<button class="dchat-tool dfs dclose" type="button" aria-label="Close the chat" title="Close">' + IC.exit + '</button>'
               : '<button class="dchat-tool dfs" type="button" aria-label="Fullscreen" title="Fullscreen">' + IC.full + '</button>')
      + '</div></div>'
      + '  <div class="dproj-panel" hidden><label>Your project card — her memory of your build, kept only in this browser. Never stored by us; sent with your questions so every answer fits your project.</label>'
      + '  <textarea class="dproj-ta" rows="3" maxlength="420" placeholder="e.g. TapTab — a cafe loyalty dapp on Dash Platform. Stack: JS EvoSDK. Stage: designing the data contract. Blocker: index positions."></textarea>'
      + '  <div class="dproj-row"><button class="dproj-save" type="button">Save card</button><button class="dproj-clear" type="button">Forget it</button><span class="dproj-note"></span></div></div>'
      + (full ? '<div class="dsessions"></div>' : '')
      + '  <div class="dchat-log"></div>'
      + '  <div class="dproj-panel dvoice-panel" hidden><label>Voice. Dasha can read her replies aloud, and you can talk to her.</label>'
      + '  <div class="dproj-row"><button class="dproj-save dv-auto" type="button" aria-pressed="false">Read replies aloud</button><button class="dproj-clear dv-call" type="button">Start a voice call</button><span class="dproj-note dv-note" role="status"></span></div>'
      + '  <label class="dv-how"></label></div>'
      + '  <div class="dchat-input"><button class="dchat-tool dvoice" type="button" aria-label="Voice" aria-expanded="false" title="Voice: listen to her, or talk to her">' + IC.voice + '</button><textarea rows="1" placeholder="' + (window.innerWidth < 440 ? 'Ask Dasha…' : 'Ask Dasha anything about Dash…') + '" aria-label="Message Dasha"></textarea>'
      + '  <button class="dchat-send" type="button" aria-label="Send"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12h14M13 6l6 6-6 6" stroke="#04111f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>'
      + '  <div class="dchat-foot"><span>Answers cite the Dash docs — verify anything critical.</span><a href="/dasha#amap">How she works</a><a href="https://github.com/InitiumBuilders/Dasha-AI" target="_blank" rel="noopener">Open source</a>'
      + (sheet ? '<a href="/dasha">Her full page</a>' : '') + '</div>'
      + '</div>';

    /* .dchat-input textarea, SPECIFICALLY — the project-card panel also holds a textarea
       earlier in the DOM; a bare 'textarea' selector grabs that hidden field and every
       send silently reads an empty value. The user's input lives here and only here. */
    var log = el.querySelector('.dchat-log'), ta = el.querySelector('.dchat-input textarea'),
        send = el.querySelector('.dchat-send'), newBtn = el.querySelector('.dchat-new'),
        sessBar = el.querySelector('.dsessions');

    /* ---- what is visible, exactly: on a phone the keyboard covers the bottom of the screen without
       resizing the page, so while the chat fills the screen it follows the visual viewport and the
       message box always sits on top of the keyboard ---- */
    function vv() {
      var v = window.visualViewport;
      if (!v || !el.classList.contains('dchat-fs') || !phone()) { el.style.removeProperty('--dchat-h'); el.style.removeProperty('--dchat-top'); return; }
      el.style.setProperty('--dchat-h', Math.round(v.height) + 'px'); el.style.setProperty('--dchat-top', Math.round(v.offsetTop) + 'px');
    }
    if (window.visualViewport) { window.visualViewport.addEventListener('resize', vv); window.visualViewport.addEventListener('scroll', vv); }

    /* ---- fullscreen: the immersive door. A transformed ancestor (.reveal keeps a matrix)
       becomes the containing block for position:fixed — so we PORTAL the whole chat to
       <body> while fullscreen and return it home on exit. Never lock a page we can't see.
       On a phone it opens by itself with the first message, so the message box stays in reach. ---- */
    el.classList.add('dchat-fsw');
    var fsBtn = el.querySelector('.dfs'), fsHome = null, fsHist = false;
    /* on a phone the back gesture leaves the full-screen chat, not the page: entering it adds one history step,
       and leaving it by the button takes that step back */
    function fsOff(fromPop) {
      el.classList.remove('dchat-fs'); document.body.classList.remove('dchat-lock'); vv();
      if (fsHist) { fsHist = false; if (fromPop !== true) { try { history.back(); } catch (e) {} } }
      if (fsHome && fsHome.parent) { fsHome.parent.insertBefore(el, fsHome.next); fsHome = null; }
      if (fsBtn) { fsBtn.innerHTML = IC.full; fsBtn.setAttribute('aria-label', 'Fullscreen'); }
    }
    function fsOn() {
      if (sheet || el.classList.contains('dchat-fs')) return;
      fsHome = { parent: el.parentElement, next: el.nextSibling };
      document.body.appendChild(el);                    /* escape every transform */
      el.classList.add('dchat-fs');
      var h = el.getBoundingClientRect().height;
      if (h < 220) { fsOff(); return; }                 /* refuse a lock we cannot see */
      document.body.classList.add('dchat-lock');
      fsBtn.innerHTML = IC.exit; fsBtn.setAttribute('aria-label', 'Exit fullscreen');
      vv(); log.scrollTop = log.scrollHeight;
      if (phone() && !fsHist) { try { history.pushState({ dchat: 1 }, ''); fsHist = true; } catch (e) {} }
    }
    if (sheet) {
      el.classList.add('dchat-fs'); el.classList.add('dchat-sheet');
      fsBtn.addEventListener('click', function () { try { el.dispatchEvent(new CustomEvent('dasha:close', { bubbles: true })); } catch (e) {} });
    } else if (fsBtn) {
      fsBtn.addEventListener('click', function () { if (el.classList.contains('dchat-fs')) fsOff(); else fsOn(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && el.classList.contains('dchat-fs')) fsOff(); });
      window.addEventListener('popstate', function () { if (fsHist && el.classList.contains('dchat-fs')) fsOff(true); });
    }
    /* ---- the help door: one tap surfaces her whole skill stack ---- */
    var helpBtn = el.querySelector('.dhelp');
    if (helpBtn) helpBtn.addEventListener('click', function () { ta.value = 'What can you do? Show me the full menu of your skills.'; go(); });

    /* ---- THE PROJECT CARD: her memory of your build, kept by YOU. localStorage only —
       never stored by any server; it rides with each question so answers fit the project. ---- */
    var PKEY = 'dst-project';
    function pGet() { try { return localStorage.getItem(PKEY) || ''; } catch (e) { return ''; } }
    var pBtn = el.querySelector('.dproj'), pPanel = el.querySelector('.dproj-panel'),
        pTa = el.querySelector('.dproj-ta'), pNote = el.querySelector('.dproj-note');
    function pPaint() { if (pBtn) pBtn.classList.toggle('has-card', !!pGet()); }
    if (pBtn && pPanel) {
      pBtn.addEventListener('click', function () {
        var open = !pPanel.hidden;
        pPanel.hidden = open;
        if (!open) { pTa.value = pGet(); pNote.textContent = ''; pTa.focus(); }
      });
      el.querySelector('.dproj-save').addEventListener('click', function () {
        try { localStorage.setItem(PKEY, pTa.value.trim().slice(0, 420)); } catch (e) {}
        pNote.textContent = pGet() ? 'She knows your build now.' : 'Card is empty.';
        pPaint(); setTimeout(function () { pPanel.hidden = true; }, 900);
      });
      el.querySelector('.dproj-clear').addEventListener('click', function () {
        try { localStorage.removeItem(PKEY); } catch (e) {}
        pTa.value = ''; pNote.textContent = 'Forgotten — it was only ever here.'; pPaint();
      });
      pPaint();
    }

    /* ---- VOICE: listen to her, or talk to her. The panel says plainly where the sound is made. ---- */
    var vBtn = el.querySelector('.dvoice'), vPanel = el.querySelector('.dvoice-panel'), vAuto = el.querySelector('.dv-auto'),
        vCall = el.querySelector('.dv-call'), vNote = el.querySelector('.dv-note'), vHow = el.querySelector('.dv-how');
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, call = { on: false, rec: null, quiet: 0 };
    var VKEY = 'dst-voice', PH = ta.getAttribute('placeholder');
    function autoRead() { try { return localStorage.getItem(VKEY) === '1'; } catch (e) { return false; } }
    function callHint(t) { ta.setAttribute('placeholder', t || PH); }
    function paintVoice(note) {
      if (!vBtn) return;
      var on = autoRead();
      vAuto.setAttribute('aria-pressed', on ? 'true' : 'false'); vAuto.textContent = on ? 'Reading replies aloud' : 'Read replies aloud';
      vCall.hidden = !SR; vCall.textContent = call.on ? 'End the call' : 'Start a voice call';
      vBtn.classList.toggle('on', call.on || on);
      vNote.textContent = note || '';
      vHow.textContent = (VO.server === true
        ? 'Her voice is Honor, made with ElevenLabs. A reply you listen to is sent to ElevenLabs as text, and nothing else is.'
        : 'Your device reads with its own voice, and nothing leaves your device for it.')
        + (SR ? ' On a voice call your browser turns your speech into text; Chrome, Edge and Safari may use their maker’s online service for that.'
              : ' Voice calls need Chrome, Edge or Safari. Listening works here.');
    }
    function callListen() {
      if (!call.on || busy) return;
      var rec = call.rec = new SR(), heardText = '';
      rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.continuous = false;
      rec.onresult = function (e) { var s = ''; for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; heardText = s; ta.value = s; };
      rec.onerror = function (e) { if (e && (e.error === 'not-allowed' || e.error === 'service-not-allowed')) callEnd('The microphone is blocked for this page. Allow it in your browser, then start the call again.'); };
      rec.onend = function () {
        if (!call.on || call.rec !== rec) return;
        call.rec = null;
        if (heardText.trim()) { call.quiet = 0; ta.value = heardText.trim(); go(); return; }
        if (++call.quiet >= 3) { callEnd('The call ended after a quiet spell. Start it again any time.'); return; }
        setTimeout(callListen, 350);
      };
      callHint('Listening…');
      try { rec.start(); } catch (e) { callEnd('The microphone could not start.'); }
    }
    function callEnd(note) {
      call.on = false;
      if (call.rec) { var r = call.rec; call.rec = null; try { r.abort(); } catch (e) {} }
      voStop(); callHint(''); paintVoice(note);
    }
    function callStart() { if (!SR || call.on) return; voPrime(); call.on = true; call.quiet = 0; paintVoice(); callListen(); }
    if (vBtn && vPanel) {
      vBtn.addEventListener('click', function () {
        var open = !vPanel.hidden;
        vPanel.hidden = open; vBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (!open) { if (pPanel) pPanel.hidden = true; paintVoice(); voAsk(function () { paintVoice(); }); }
      });
      vAuto.addEventListener('click', function () {
        var on = !autoRead();
        try { if (on) localStorage.setItem(VKEY, '1'); else localStorage.removeItem(VKEY); } catch (e) {}
        if (on) voPrime(); else voStop();
        paintVoice(on ? 'Her next reply will be read to you.' : '');
      });
      vCall.addEventListener('click', function () { if (call.on) callEnd(''); else callStart(); });
      ta.addEventListener('keydown', function (e) { if (call.on && !busy && e.key && e.key.length === 1) callEnd('The call ended because you started typing.'); });
      paintVoice();
    }

    /* ---- her suggested next moves — rendered after the newest answer only ---- */
    function renderNext(next) {
      var old = log.querySelector('.dnext'); if (old) old.remove();
      if (!next || !next.length) return;
      var d = document.createElement('div'); d.className = 'dnext';
      d.innerHTML = '<span class="dnext-k">Her suggested next moves</span><div class="dnext-row"></div>';
      var row = d.querySelector('.dnext-row');
      next.slice(0, 3).forEach(function (t) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = t;
        b.addEventListener('click', function () { ta.value = t; go(); });
        row.appendChild(b);
      });
      log.appendChild(d);
    }
    var st = store(); var busy = false;

    function paintSessions() {
      if (!sessBar) return;
      sessBar.innerHTML = '';
      sessBar.hidden = st.list.length < 2;   /* one chat needs no tab bar */
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
    /* what she actually reached for — honest transparency, not theater. TOOL_NOW is the same tool
       while she is still reaching (her steps arrive from the server as they happen). */
    var TOOL_LABEL = {
      search_dash_docs: 'searched the official Dash docs',
      dash_governance: 'read live DashCentral governance',
      dash_network_stats: 'checked live network stats',
      lookup_tx: 'looked up the transaction on-chain',
      lookup_address: 'looked up the address on-chain',
      team_record: 'read the team’s public record',
      dash_platform: 'read Dash Platform live',
      help_form_link: 'filled in the Help given form',
      load_skill: 'opened a deeper skill',
      web_search: 'searched the open web',
      dash_chain: 'read Dash Core live',
      dash_masternodes: 'read the masternode list',
      dash_releases: 'checked the latest releases',
      dash_dip: 'read the DIP',
      verify_message: 'checked the signature',
      paxt_records: 'read the PAXT record',
      merkle_weave: 'wove a Merkle tree',
      calculate: 'worked the sums by code'
    };
    var TOOL_NOW = {
      search_dash_docs: 'Searching the Dash docs',
      dash_governance: 'Reading the live ballot',
      dash_network_stats: 'Checking the network',
      lookup_tx: 'Looking up the transaction',
      lookup_address: 'Looking up the address',
      team_record: 'Reading the team’s record',
      dash_platform: 'Reading Dash Platform',
      help_form_link: 'Filling in the form',
      load_skill: 'Opening a deeper skill',
      web_search: 'Searching the web',
      dash_chain: 'Reading Dash Core',
      dash_masternodes: 'Reading the masternode list',
      dash_releases: 'Checking the releases',
      dash_dip: 'Reading the DIP',
      verify_message: 'Checking the signature',
      paxt_records: 'Reading the PAXT record',
      merkle_weave: 'Weaving the tree',
      calculate: 'Working the sums'
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
    function cap(x) { x = String(x); return x.charAt(0).toUpperCase() + x.slice(1); }
    function toolStrip(tools, depth, motion) {
      var chips = [];
      if (depth) chips.push('<span class="dtool deep">' + cap(DEPTH_LABEL[depth] || 'deep thinking') + '</span>');
      if (motion) {
        (motion.skills || []).slice(0, 2).forEach(function (s) { chips.push('<span class="dtool">Skill ' + esc(s) + '</span>'); });
        (motion.knowledge || []).slice(0, 2).forEach(function (k) { chips.push('<span class="dtool">Her notes: ' + esc(String(k).replace(/^\s*[0-9]+b?\.\s*/, '').toLowerCase()) + '</span>'); });
      }
      if (tools && tools.length) {
        var uniq = tools.filter(function (t, i) { return tools.indexOf(t) === i; });
        uniq.forEach(function (t) { chips.push('<span class="dtool">' + cap(TOOL_LABEL[t] || String(t).replace(/_/g, ' ')) + '</span>'); });
      }
      return chips.length ? ('<div class="dtools" aria-label="How she answered">' + chips.join('') + '</div>') : '';
    }
    function bubble(role, text, tools, qForFeedback, depth, more) {
      var d = document.createElement('div');
      d.className = 'dmsg ' + role;
      d.innerHTML = role === 'dasha' ? md(text) : esc(text);
      if (role === 'dasha') {
        var strip = toolStrip(tools, depth, more && more.motion);
        if (strip) d.insertAdjacentHTML('beforeend', strip);   /* the answer leads; how she found it follows */
        /* Altitude, in one click. If an answer lands over someone's head, their only other
           option is to admit it in writing — and most people just leave instead. Nobody
           should have to apologise for not following. One tap changes the register. */
        var fb = document.createElement('div');
        fb.className = 'dfb';
        fb.innerHTML =
            '<button class="alt" data-alt="simpler" type="button">Simpler</button>'
          + '<button class="alt" data-alt="deeper" type="button">Go deeper</button>'
          + '<button class="alt dcopya" type="button">Copy</button>'
          + (voCan(more && more.say) ? '<button class="alt dsay" type="button" aria-pressed="false">Listen</button>' : '')
          + '<span class="dfb-gap"></span>'
          + '<span class="fbg" role="group" aria-label="Rate this answer"><button class="fbb" data-g="1" type="button" aria-label="Helpful" title="This helped">' + svg('<path d="M7 10v11"/><path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8a2 2 0 0 1-1.9 1.4H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9z"/>') + '</button>'
          + '<button class="fbb" data-g="0" type="button" aria-label="Not helpful" title="This missed">' + svg('<path d="M17 14V3"/><path d="M9 18.1 10 14H4.2a2 2 0 0 1-1.9-2.6l2.3-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.8a2 2 0 0 0-1.8 1.1L12 22a3.1 3.1 0 0 1-3-3.9z"/>') + '</button></span>'
          + '<span class="fbt"></span>';
        d.appendChild(fb);

        var ALT = {
          simpler: 'Say that again, simpler — assume I am new to this. Use a plain example.',
          deeper: 'Go deeper on that — I want the full picture, including what usually goes wrong.'
        };
        [].forEach.call(fb.querySelectorAll('.alt[data-alt]'), function (b) {
          b.addEventListener('click', function () {
            if (busy) return;
            ta.value = ALT[b.getAttribute('data-alt')];
            go();
          });
        });
        /* her answer, as she wrote it, without the skill mark */
        fb.querySelector('.dcopya').addEventListener('click', function () { copyText(String(text).replace(/^\s*(?:\[\/[a-z0-9-]+\]\s*)+/i, ''), this); });
        /* read this reply aloud; the same button stops it */
        var sayBtn = fb.querySelector('.dsay');
        if (sayBtn) {
          d._say = function (after) {
            voSpeak(text, (more && more.say) || null, function (on) {
              sayBtn.textContent = on ? 'Stop' : 'Listen'; sayBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
              if (!on && after) after();
            });
          };
          sayBtn.addEventListener('click', function () { if (sayBtn.getAttribute('aria-pressed') === 'true') voStop(); else d._say(); });
        }
        function sendFb(good, note) {
          fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback: { good: good, note: note || '', q: qForFeedback || '',
              a: String(text).slice(0, 900), tools: (tools || []).join(',') } }) })
            .then(function (r) { return r.json(); })
            .then(function (x) {
              var t = fb.querySelector('.fbt');
              if (!t) return;
              t.textContent = x && x.filed
                ? 'Filed publicly — thank you. Anyone can fix it now.'
                : (good ? 'Thank you — noted.' : 'Thank you — the team will see this.');
            })
            .catch(function () {});
        }
        [].forEach.call(fb.querySelectorAll('.fbb'), function (b) {
          b.addEventListener('click', function () {
            var good = b.getAttribute('data-g') === '1';
            [].forEach.call(fb.querySelectorAll('.fbb'), function (x) { x.disabled = true; x.classList.toggle('picked', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
            if (good) { fb.querySelector('.fbt').textContent = 'Thank you, noted.'; sendFb(true, ''); return; }
            /* A thumbs-down alone is a mood. A sentence about what was wrong is a gift —
               it becomes a public issue anyone can close by teaching her. So: ask. */
            fb.querySelector('.fbt').textContent = '';
            var w = document.createElement('div');
            w.className = 'fbwhy';
            w.innerHTML = '<input type="text" placeholder="What was wrong?" aria-label="What was wrong" maxlength="300" />'
              + '<button type="button">Send</button>'
              + '<p class="fbwhy-note">A note files this question and Dasha’s answer as a public issue on GitHub, so the fix happens in the open. Leave it empty and only the rating is counted.</p>';
            fb.parentNode.appendChild(w);
            var inp = w.querySelector('input'), btn = w.querySelector('button');
            inp.focus();
            function done() {
              var note = inp.value.trim();
              w.innerHTML = '<span class="fbt">' + (note ? 'Filing it publicly. Thank you.' : 'Thank you, noted.') + '</span>';
              sendFb(false, note);
            }
            btn.addEventListener('click', done);
            inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') done(); });
          });
        });
      }
      log.appendChild(d);
      return d;
    }
    /* a new answer opens at its first line, with the question still in view above it; anything
       else (a question, the wait) keeps the newest thing in view */
    function toEnd() { log.scrollTop = log.scrollHeight; }
    function toTop(d) { var prev = d.previousElementSibling; log.scrollTop = Math.max(0, (prev && prev.classList.contains('user') ? prev.offsetTop : d.offsetTop) - 12); }
    function paint() {
      var s = cur(st); log.innerHTML = '';
      if (!s.msgs.length) { log.innerHTML = hello(); wireChips(); }
      s.msgs.forEach(function (m, i) {
        var prevQ = i > 0 ? s.msgs[i - 1].content : '';
        bubble(m.role === 'assistant' ? 'dasha' : 'user', m.content, m.tools, prevQ, m.depth, { say: m.say, motion: m.motion });
      });
      var lastM = s.msgs[s.msgs.length - 1];
      if (lastM && lastM.role === 'assistant' && lastM.next && lastM.next.length) renderNext(lastM.next);
      toEnd();
      paintSessions();
    }
    function wireChips() {
      [].forEach.call(log.querySelectorAll('.dchip'), function (c) {
        c.addEventListener('click', function () { ta.value = c.textContent; go(); });
      });
    }
    /* code blocks copy with one tap: a command is most of what a builder takes away */
    log.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.dcopy') : null;
      if (b) { var box = b.closest('.dcode'), pre = box && box.querySelector('pre'); if (pre) copyText(pre.textContent, b); }
    });

    /* ---- the wait. Three dots, and beside them what she is really doing: her steps arrive from
       the server as they happen. If none arrive (an old cache, a network that holds the stream),
       the line still says something true after seven seconds. ---- */
    var thinkTimer = null, thinkTimer2 = null, heard = false;
    function think(on, label) {
      var t = log.querySelector('.dthink');
      if (on && !t) {
        heard = false;
        t = document.createElement('div'); t.className = 'dthink dmsg dasha';
        t.innerHTML = '<i></i><i></i><i></i><span class="dthinkt" role="status"></span>';
        log.appendChild(t); toEnd();
        clearTimeout(thinkTimer); clearTimeout(thinkTimer2);
        thinkTimer = setTimeout(function () { var lab = log.querySelector('.dthinkt'); if (lab && !heard) lab.textContent = 'reaching for live sources…'; }, 7000);
        thinkTimer2 = setTimeout(function () { var lab = log.querySelector('.dthinkt'); if (lab && !heard) lab.textContent = 'still working, a long answer can take half a minute…'; }, 22000);
      }
      if (on && label) { heard = true; var lab = log.querySelector('.dthinkt'); if (lab) lab.textContent = label; }
      if (!on) { clearTimeout(thinkTimer); clearTimeout(thinkTimer2); if (t) t.remove(); }
    }
    /* ---- her words as she writes them. The server sends them once there are enough to be an answer. The
       finished reply still arrives whole at the end and replaces what was shown, so this is only ever a preview
       of the same answer. A [[NEXT]] block she is still writing, and a code fence she has not closed yet, are
       kept tidy on the way. ---- */
    var live = null, liveRaf = 0;
    function partial(s) {
      s = String(s || '').replace(/\[\[(?:NEXT|VISION-LOG)\]\][\s\S]*$/, '').replace(/\[{1,2}[A-Z-]{0,11}\]{0,2}$/, '');
      if ((s.match(/```/g) || []).length % 2) s += '\n```';
      return s;
    }
    function livePaint() {
      liveRaf = 0; if (!live) return;
      var text = partial(live.base + (live.base && live.buf ? '\n\n' : '') + live.buf);
      if (!text.trim()) { if (live.el) { live.el.remove(); live.el = null; think(true); } return; }
      if (!live.el) {
        think(false);
        live.el = document.createElement('div'); live.el.className = 'dmsg dasha dlive'; live.el.setAttribute('aria-hidden', 'true');
        live.el.innerHTML = md(text); log.appendChild(live.el); toTop(live.el);
        return;
      }
      live.el.innerHTML = md(text);
      if (!live.free) toTop(live.el);   /* hold the place the finished answer will take, unless they scrolled */
    }
    function liveFree() { if (live) live.free = true; }
    log.addEventListener('wheel', liveFree, { passive: true }); log.addEventListener('touchmove', liveFree, { passive: true });
    function liveKick() { if (!liveRaf) liveRaf = (window.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(livePaint); }
    function liveAdd(t) { if (!live) live = { base: '', buf: '', el: null }; live.buf += String(t || ''); liveKick(); }
    function liveRound(said) { if (!live) live = { base: '', buf: '', el: null }; live.base = (said || []).join('\n\n'); live.buf = ''; liveKick(); }
    function liveEnd() { liveRaf = 0; if (live && live.el) live.el.remove(); live = null; }
    function step(ev) {
      if (!ev) return;
      if (ev.t === 'delta') { liveAdd(ev.text); return; }
      if (ev.t === 'round') { liveRound(ev.said); return; }
      if (ev.t === 'start') {
        if (ev.skills && ev.skills.length) think(true, 'Using ' + ev.skills.slice(0, 2).join(' and '));
        else if (ev.depth) think(true, cap(DEPTH_LABEL[ev.depth] || 'deep thinking'));
      } else if (ev.t === 'tools' && ev.tools && ev.tools.length) {
        var names = ev.tools.filter(function (x, i) { return x && ev.tools.indexOf(x) === i; });
        think(true, (TOOL_NOW[names[0]] || 'Reaching for a live source') + (names.length > 1 ? ', and ' + (names.length - 1) + ' more' : ''));
        try { window.dispatchEvent(new CustomEvent('dst:answer', { detail: { tools: names, depth: null } })); } catch (e) {}
      } else if (ev.t === 'read') think(true, 'Writing the answer');
    }
    /* one question to the server. With a stream, her steps arrive first and the answer last; a
       plain JSON reply (a refusal before she starts, or a server that doesn't stream) reads the same. */
    function ask(payload) {
      payload.stream = true; payload.deltas = true;
      return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(function (r) {
        var ct = r.headers.get('content-type') || '';
        if (ct.indexOf('text/event-stream') < 0 || !r.body || !r.body.getReader) return r.json().then(function (d) { return { ok: r.ok, d: d }; });
        var rd = r.body.getReader(), dec = new TextDecoder(), buf = '', fin = null;
        function eat(chunk) {
          chunk.split('\n').forEach(function (line) {
            if (line.indexOf('data:') !== 0) return;
            var ev = null; try { ev = JSON.parse(line.slice(5)); } catch (e) { return; }
            if (ev.t === 'done' || ev.t === 'error') fin = ev; else step(ev);
          });
        }
        function pump() {
          return rd.read().then(function (x) {
            if (x.value) { buf += dec.decode(x.value, { stream: true }); var i; while ((i = buf.indexOf('\n\n')) >= 0) { eat(buf.slice(0, i)); buf = buf.slice(i + 2); } }
            if (!x.done) return pump();
            if (buf.trim()) eat(buf);
            return fin ? { ok: fin.t === 'done', d: fin } : { ok: false, d: { error: 'The answer was cut off on its way here.' } };
          });
        }
        return pump();
      });
    }
    function fail(msg) {
      var d = bubble('err', msg);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'dretry'; b.textContent = 'Try again';
      b.addEventListener('click', function () { if (busy) return; d.remove(); run(); });
      d.appendChild(b); toEnd();
    }
    /* answer the last question in the session (a first try, or a retry after a failure) */
    function run() {
      var s = cur(st), lastQ = s.msgs.length ? s.msgs[s.msgs.length - 1] : null;
      if (!lastQ || lastQ.role !== 'user' || busy) return;
      var q = lastQ.content;
      busy = true; send.disabled = true; think(true); voStop(); if (call.on) callHint('Dasha is thinking…');
      try { window.dispatchEvent(new CustomEvent('dst:think', { detail: true })); } catch (e) {}   /* the world quickens while she thinks */
      ask({ messages: s.msgs.slice(-12), page: location.pathname, project: pGet() || undefined })
        .then(function (x) {
          liveEnd(); think(false);
          if (!x.ok || !x.d || x.d.error || !String(x.d.reply || '').trim()) { if (call.on) callEnd('The call ended because that answer did not arrive.'); fail((x.d && x.d.error) || 'Something went sideways — try again.'); return; }
          s.msgs.push({ role: 'assistant', content: x.d.reply, tools: x.d.tools || [], depth: x.d.depth || null, next: x.d.next || [], say: x.d.say || null, motion: x.d.motion || null }); save(st);
          var d = bubble('dasha', x.d.reply, x.d.tools || [], q, x.d.depth || null, { say: x.d.say || null, motion: x.d.motion || null });
          /* read aloud when they asked for that, or on a voice call; on a call she listens again when she has finished */
          if ((call.on || autoRead()) && d._say) d._say(function () { if (call.on) callListen(); });
          else if (call.on) setTimeout(callListen, 80);   /* after this answer is marked finished */
          renderNext(x.d.next || []);
          toTop(d);
          /* the tools she actually reached for light up in her mind (world.js and the answer map) */
          try { window.dispatchEvent(new CustomEvent('dst:answer', { detail: { tools: x.d.tools || [], depth: x.d.depth || null } })); } catch (e) {}
        })
        .catch(function () { liveEnd(); think(false); if (call.on) callEnd('The call ended because the connection dropped.'); fail('Network hiccup — try again, or find a human at t.me/TheDashSupportTEAM'); })
        .then(function () { busy = false; send.disabled = false; paintSessions();
          try { window.dispatchEvent(new CustomEvent('dst:think', { detail: false })); } catch (e) {} });
    }
    function go() {
      if (busy) return;
      var q = ta.value.trim(); if (!q) return;
      var s = cur(st);
      if (!s.msgs.length) { var hi = log.querySelector('.dchat-hello'); if (hi) hi.remove(); s.title = q.slice(0, 34); }
      var old = log.querySelector('.dnext'); if (old) old.remove();
      var stale = log.querySelector('.dmsg.err'); if (stale) stale.remove();
      s.msgs.push({ role: 'user', content: q }); save(st);
      bubble('user', q); ta.value = ''; ta.style.height = '';
      if (phone()) fsOn();   /* on a phone the conversation takes the screen, so the message box stays in reach */
      toEnd();
      run();
    }
    send.addEventListener('click', go);
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
    ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(150, ta.scrollHeight) + 'px'; });
    newBtn.addEventListener('click', function () { newSession(st); paint(); });
    paint();

    /* ---- THE CONCIERGE HAND-OFF: /dasha?ask=… arrives from a Dash Alive page with the
       project or proposal already in hand. A fresh session so the context is clean, the
       question typed for them, waiting for them to send it. ---- */
    function prefill(text) {
      var q = String(text || '').slice(0, 600); if (q.length < 4) return;
      if (cur(st).msgs.length) { newSession(st); paint(); }
      ta.value = q;
      ta.style.height = 'auto'; ta.style.height = Math.min(150, ta.scrollHeight) + 'px';
      ta.focus();   /* prefilled, never sent for them: they read it and press send */
    }
    if (!sheet) {
      try {
        var asked = new URLSearchParams(location.search).get('ask');
        if (asked && asked.length > 3) { prefill(asked); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
      } catch (e) { /* a bad param must never cost someone their chat */ }
    }
    el._dasha = {
      prefill: prefill,
      focus: function () { try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); } },
      /* the sheet was hidden while another page's chat wrote to the same store: read it again */
      refresh: function () { if (busy) return; st = store(); paint(); vv(); }
    };
    return el._dasha;
  }

  function init() { [].forEach.call(document.querySelectorAll('[data-dasha]'), mount); }
  window.DashaChat = { mount: mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
