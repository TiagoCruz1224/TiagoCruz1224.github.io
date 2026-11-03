// The overworld map is the home page and the menu; each level opens over it as a screen.
// Each page holds its own text (/ in English, /pt/ in European Portuguese). PT below covers only what this script writes.
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pt = root.lang === 'pt-PT';
  const app = document.getElementById('app');
  const screens = [...document.querySelectorAll('[data-screen]')];
  const nodes = [...document.querySelectorAll('.node')];
  const cursor = document.querySelector('.cursor');
  let open = null, origin = null;

  screens.forEach(s => { s.hidden = true; });

  // cursor follows the level you point at or focus
  const here = node => {
    nodes.forEach(n => n.classList.toggle('is-here', n === node));
    cursor.style.setProperty('--cx', node.style.getPropertyValue('--x'));
    cursor.style.setProperty('--cy', node.style.getPropertyValue('--y'));
  };
  nodes.forEach((n, i) => {
    n.addEventListener('mouseenter', () => here(n));
    n.addEventListener('focus', () => here(n));
    n.addEventListener('keydown', e => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step) { e.preventDefault(); nodes[(i + step + nodes.length) % nodes.length].focus(); }
      if (e.key === 'Home') { e.preventDefault(); nodes[0].focus(); }
      if (e.key === 'End') { e.preventDefault(); nodes[nodes.length - 1].focus(); }
    });
    n.addEventListener('click', e => { e.preventDefault(); show(n.dataset.level, n); });
  });

  const centre = el => {
    if (!el) return [innerWidth / 2, innerHeight / 2];
    const r = (el.querySelector('.orb') || el).getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  const radius = (x, y) => Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  // The signature move: the orb you chose pulses, then the level opens out of it as an iris.
  // Level-to-level ("Next level") slides instead, because there is no orb on screen to open from.
  function show(id, from) {
    const s = document.getElementById(id);
    if (!s || open === s) return;
    const prev = open;
    origin = from || nodes.find(n => n.dataset.level === id) || origin;
    open = s;
    s.hidden = false;
    s.scrollTop = 0;
    // a video's cover loads only when its level opens, not with the map
    s.querySelectorAll('video[data-poster]').forEach(v => { v.poster = v.dataset.poster; v.removeAttribute('data-poster'); });
    app.inert = true;
    root.style.overflow = 'hidden';
    // every screen is a history entry, so the browser's back button closes it
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    s.querySelector('[tabindex="-1"]').focus({ preventScroll: true });
    const hidePrev = () => { if (prev) { prev.hidden = true; prev.classList.remove('entering'); } };
    if (reduce.matches) return hidePrev();
    s.classList.add('entering');
    setTimeout(() => s.classList.remove('entering'), 1200);
    if (prev || !from) {
      s.animate([{ opacity: 0, transform: 'translateX(48px)' }, { opacity: 1, transform: 'none' }],
        { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = hidePrev;
      return;
    }
    const orb = from.querySelector('.orb');
    if (orb) orb.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(.88)' }, { transform: 'scale(1.3)' }],
      { duration: 240, easing: 'ease-out' });
    const [x, y] = centre(from);
    s.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${radius(x, y)}px at ${x}px ${y}px)` }],
      { duration: 720, delay: 160, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'backwards' });
  }

  // fromHistory: the browser has already changed the address (back or forward), so no new entry
  function close(fromHistory) {
    if (!open) return;
    const s = open, back = origin && document.contains(origin) ? origin : nodes[0];
    open = null;
    if (!fromHistory) history.pushState(null, '', location.pathname + location.search);
    const done = () => {
      if (open !== s) s.hidden = true;
      if (open) return; // another screen opened while this one was closing
      app.inert = false;
      root.style.overflow = '';
      if (back.classList.contains('node')) here(back);
      back.focus({ preventScroll: true });
    };
    if (reduce.matches) return done();
    const [x, y] = centre(back);
    s.animate([{ clipPath: `circle(${radius(x, y)}px at ${x}px ${y}px)` }, { clipPath: `circle(0px at ${x}px ${y}px)` }],
      { duration: 560, easing: 'cubic-bezier(.7,0,.2,1)' }).onfinish = done;
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-close],[data-go],[data-open]');
    if (!t) return;
    if (t.matches('[data-close]')) close();
    else if (t.dataset.go) { const n = nodes.find(x => x.dataset.level === t.dataset.go); if (n) here(n); show(t.dataset.go); }
    else show(t.dataset.open, t);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) close(); });

  // Mission: break in
  const tries = [
    { m: 'POST', p: '/api/register', who: 'visitor', st: '201 Created', ok: true,
      body: '{\n  "email": "ana@example.com",\n  "password": "••••••••••",\n  "roles": ["ROLE_ADMIN"]\n}',
      res: '{\n  "message": "User registered successfully",\n  "user": { "id": 7, "email": "ana@example.com" }\n}',
      why: 'Role ignored. The account exists, but only as ROLE_USER.' },
    { m: 'GET', p: '/api/pages/13', who: "Bearer <ana's token>", st: '404 Not Found', ok: false, body: '(no body)',
      res: '{\n  "error": "Page not found"\n}',
      why: 'Drafts are visible only to their author and admins. To everyone else they do not exist.' },
    { m: 'PUT', p: '/api/profile', who: 'Bearer <stolen token>', st: '403 Forbidden', ok: false,
      body: '{\n  "password": "••••••••••"\n}',
      res: '{\n  "error": "Current password is required to change email or password"\n}',
      why: 'A stolen token is not enough. Changing the password needs the current one.' },
    { m: 'GET', p: '/api/pages/21', who: 'visitor', st: '404 Not Found', ok: false, body: '(no body)',
      res: '{\n  "error": "Page not found"\n}',
      why: 'Scheduled pages stay hidden until their publication window opens.' }
  ];
  const $ = id => document.getElementById(id);
  const PT = {
    "Sending…": "A enviar…",
    "(no body)": "(sem corpo)",
    "visitor": "visitante",
    "Bearer <ana's token>": "Bearer <token da ana>",
    "Bearer <stolen token>": "Bearer <token roubado>",
    "Role ignored. The account exists, but only as ROLE_USER.": "Papel ignorado. A conta existe, mas só como ROLE_USER.",
    "Drafts are visible only to their author and admins. To everyone else they do not exist.": "Os rascunhos só são visíveis para o autor e para os administradores. Para os outros, não existem.",
    "A stolen token is not enough. Changing the password needs the current one.": "Um token roubado não chega. Para mudar a palavra-passe é preciso a atual.",
    "Scheduled pages stay hidden until their publication window opens.": "As páginas agendadas ficam escondidas até a janela de publicação abrir.",
    "Back office": "Back-office",
    "Public page": "Página pública",
    "Calendar": "Calendário",
    "Google reviews": "Críticas Google",
    "The restaurant updates the daily menu itself, in the back office.": "O próprio restaurante atualiza a ementa do dia, no back-office.",
    "The weekly menu is managed in the same back office.": "A ementa da semana gere-se no mesmo back-office.",
    "The reservation calendar is built but switched off for now: bookings go by phone or WhatsApp.": "O calendário de reservas está feito, mas desligado por agora: as reservas fazem-se por telefone ou WhatsApp.",
    "Google reviews show on the page, with a fallback.": "As críticas Google aparecem na página, com alternativa."
  };
  const tr = en => (pt && PT[en]) || en;
  const of4 = n => n + (pt ? ' de 4' : ' of 4');
  const atks = [...document.querySelectorAll('#cms .atk')];
  const pips = [...document.querySelectorAll('#cms .score .pips i')];
  const con = $('console');
  let timer;
  function fill(i) {
    const t = tries[i];
    $('c-m').textContent = t.m; $('c-p').textContent = t.p; $('c-who').textContent = tr(t.who);
    $('c-body').textContent = tr(t.body); $('c-st').textContent = t.st; $('c-st').className = t.ok ? 'ok' : 'bad';
    $('c-res').textContent = t.res; $('c-why').textContent = tr(t.why);
  }
  function send(i) {
    atks.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    clearTimeout(timer);
    const land = () => {
      fill(i); con.classList.remove('pending');
      atks[i].dataset.done = 'true';
      const n = atks.filter(b => b.dataset.done === 'true').length;
      pips.forEach((p, k) => p.classList.toggle('on', k < n));
      $('score').textContent = of4(n);
      const st = $('c-stamp'); st.classList.remove('hit'); void st.offsetWidth; st.classList.add('hit');
      if (n === 4) $('done').hidden = false;
    };
    if (reduce.matches) return land();
    con.classList.add('pending');
    $('c-st').textContent = tr('Sending…'); $('c-st').className = '';
    timer = setTimeout(land, 320);
  }
  atks.forEach((b, i) => b.addEventListener('click', () => send(i)));
  fill(0);

  // Mission: guided tour (Bila Buffet). Visiting is the whole game: nothing to block, just see where each part lives.
  const stops = [
    { where: 'Back office', tool: 'EasyAdmin', what: 'The restaurant updates the daily menu itself, in the back office.' },
    { where: 'Back office', tool: 'EasyAdmin', what: 'The weekly menu is managed in the same back office.' },
    { where: 'Public page', tool: 'Calendar', what: 'The reservation calendar is built but switched off for now: bookings go by phone or WhatsApp.' },
    { where: 'Public page', tool: 'Google reviews', what: 'Google reviews show on the page, with a fallback.' }
  ];
  const sbtn = [...document.querySelectorAll('#bila .stop')];
  const spips = [...document.querySelectorAll('#bila .pips i')];
  function visit(i, first) {
    sbtn.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    document.querySelectorAll('#tour .mock').forEach((m, j) => { m.hidden = j !== i; });
    $('t-where').textContent = tr(stops[i].where); $('t-tool').textContent = tr(stops[i].tool); $('t-what').textContent = tr(stops[i].what);
    if (first) return;
    sbtn[i].dataset.done = 'true';
    const n = sbtn.filter(b => b.dataset.done === 'true').length;
    spips.forEach((p, k) => p.classList.toggle('on', k < n));
    $('t-score').textContent = of4(n);
    if (n === 4) $('t-done').hidden = false;
  }
  sbtn.forEach((b, i) => b.addEventListener('click', () => visit(i)));
  visit(0, true);

  // The language link keeps the open level, and the choice is remembered for the next visit to /
  document.querySelectorAll('.lang').forEach(a => a.addEventListener('click', () => {
    a.hash = location.hash;
    try { localStorage.setItem('lang', pt ? 'en' : 'pt'); } catch (e) {}
  }));

  // open the level named in the address, without the iris; follow the browser's back and forward too
  const route = () => {
    const id = location.hash.slice(1);
    if (id && document.getElementById(id)?.matches('[data-screen]')) show(id);
    else close(true);
  };
  addEventListener('popstate', route);
  route();
})();
