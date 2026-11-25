/* OITAVA - site behaviour. Plain script, works from file:// */
(function () {
  'use strict';
  var d = document, root = d.documentElement, body = d.body;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || d).querySelectorAll(s)); };
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var base = body.getAttribute('data-base') || '';
  // accent-insensitive text for searching ("Pinhao" finds "Pinhão")
  var plain = function (s) { s = s.toLowerCase(); return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s; };
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  var esc = function (s) { var e = d.createElement('i'); e.textContent = s; return e.innerHTML; };

  /* Intro: once per visit (flag is set by the inline script in <head>) */
  if (root.getAttribute('data-intro') === 'play') {
    var endIntro = function () {
      if (root.getAttribute('data-intro') !== 'play') return;
      root.setAttribute('data-intro', 'leaving');
      setTimeout(function () { root.removeAttribute('data-intro'); }, 600);
    };
    setTimeout(endIntro, calm ? 200 : 2700);
    $('.intro').addEventListener('click', endIntro);
  }

  /* Header + floating pill */
  var nav = $('.nav'), pill = $('.pill'), solid = body.hasAttribute('data-solid'), lastScrolled = null;
  function onScroll() {
    var s = solid || scrollY > 40;
    if (s !== lastScrolled) { lastScrolled = s; nav.classList.toggle('scrolled', s); }
    if (pill) pill.classList.toggle('show', solid || scrollY > 200);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mega menu */
  $$('.has-mega').forEach(function (item) {
    var btn = $('.menu__link', item), panel = $('.mega', item), t;
    var set = function (o) {
      clearTimeout(t);
      item.classList.toggle('open', o);
      btn.setAttribute('aria-expanded', o);
      panel.inert = !o;
      if (o) $$('img[data-src]', panel).forEach(function (i) { i.src = i.getAttribute('data-src'); i.removeAttribute('data-src'); });
    };
    panel.inert = true;
    item.addEventListener('mouseenter', function () { set(true); });
    item.addEventListener('mouseleave', function () { t = setTimeout(function () { set(false); }, 160); });
    btn.addEventListener('click', function (e) { if (e.detail === 0 || matchMedia('(hover: none)').matches) set(!item.classList.contains('open')); else set(true); });
    item.addEventListener('focusout', function (e) { if (!item.contains(e.relatedTarget) && !item.matches(':hover')) set(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  });

  /* Drawer */
  var drawer = $('.drawer'), veil = $('.veil'), burger = $('.burger');
  function setDrawer(o) {
    drawer.classList.toggle('open', o); veil.classList.toggle('show', o);
    drawer.setAttribute('aria-hidden', !o); burger.setAttribute('aria-expanded', o);
    if (o) $('.drawer__x').focus({ preventScroll: true }); else if (drawer.contains(d.activeElement)) burger.focus({ preventScroll: true });
  }
  burger.addEventListener('click', function () { setDrawer(true); });
  $('.drawer__x').addEventListener('click', function () { setDrawer(false); });
  veil.addEventListener('click', function () { setDrawer(false); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); });
  $$('.drawer a').forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });
  $$('.drawer__toggle').forEach(function (b) {
    var fold = b.nextElementSibling; fold.inert = true;
    b.addEventListener('click', function () {
      var o = b.parentNode.classList.toggle('open');
      b.setAttribute('aria-expanded', o); fold.inert = !o;
    });
  });

  /* Reveal on scroll */
  var rev = $$('.reveal');
  rev.forEach(function (e) { if (e.dataset.delay) e.style.setProperty('--d', e.dataset.delay / 1000 + 's'); });
  if (calm || !('IntersectionObserver' in window)) rev.forEach(function (e) { e.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    rev.forEach(function (e) { io.observe(e); });
  }

  /* Count-up numbers */
  $$('[data-count]').forEach(function (el) {
    var full = el.getAttribute('data-count'), m = full.match(/^([^0-9]*)([0-9][0-9,]*)(.*)$/);
    if (!m || calm || !('IntersectionObserver' in window)) { el.textContent = full; return; }
    var n = parseInt(m[2].replace(/,/g, ''), 10), year = n > 1500 && n < 2100;
    if (year) { el.textContent = full; return; }
    var show = function (v) { el.textContent = m[1] + Math.round(v).toLocaleString('en-US') + m[3]; };
    show(0);
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now();
      (function f(t) { var k = Math.min(1, (t - t0) / 1600); k = Math.max(0, k); show(n * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(f); })(t0);
    }, { threshold: 0.4 });
    o.observe(el);
  });

  /* Ring that travels from the hero to the statement */
  (function () {
    var home = $('.home'), fly = $('.flyer'), a = $('.hero__emblem'), b = $('.say__ring');
    if (!home || !fly || !a || !b || calm) return;
    var A, B, rot = -12, op = 0.16, start = 1, queued = 0, state = '', imgs = $$('img', fly);
    var lerp = function (x, y, t) { return x + (y - x) * t; };
    function box(e) {
      var r = e.getBoundingClientRect(), h = home.getBoundingClientRect();
      return { x: r.left + r.width / 2 - h.left, y: r.top + r.height / 2 - h.top, w: e.offsetWidth || r.width };
    }
    function measure() {
      A = box(a); B = box(b);
      op = parseFloat(getComputedStyle(b).opacity) || 0.16;
      start = Math.max(1, home.getBoundingClientRect().top + scrollY + B.y - innerHeight / 2);
      fly.style.width = fly.style.height = B.w + 'px';
      draw();
    }
    function draw() {
      queued = 0;
      var p = Math.min(1, Math.max(0, scrollY / start));
      p = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      var s = p <= 0.001 ? 'rest' : p >= 0.999 ? 'landed' : 'flying';
      if (s !== state) {
        state = s;
        home.classList.toggle('flying', s === 'flying');
        home.classList.toggle('landed', s === 'landed');
        if (s !== 'flying') fly.style.opacity = 0;
      }
      if (s !== 'flying') return;
      var k = lerp(A.w, B.w, p) / B.w, mix = Math.min(1, Math.max(0, (p - 0.25) / 0.5));
      fly.style.opacity = lerp(1, op, p);
      fly.style.transform = 'translate3d(' + (lerp(A.x, B.x, p) - B.w / 2) + 'px,' + (lerp(A.y, B.y, p) - B.w / 2) + 'px,0) scale(' + k + ') rotate(' + (lerp(0, rot, p) + p * (1 - p) * -180) + 'deg)';
      imgs[0].style.opacity = 1 - mix; imgs[1].style.opacity = mix;
    }
    home.classList.add('flight');
    measure();
    addEventListener('scroll', function () { if (!queued) queued = requestAnimationFrame(draw); }, { passive: true });
    addEventListener('resize', measure);
    addEventListener('load', measure);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(measure);
  })();

  /* Hero video: play only while visible */
  $$('video[data-play]').forEach(function (v) {
    if (calm) { v.removeAttribute('autoplay'); v.pause(); return; }
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
    }).observe(v);
  });

  /* Place search combobox */
  var PLACES = window.OITAVA_PLACES || { coasts: [], villages: [] };
  function goHomes(q) {
    var p = [];
    for (var k in q) if (q[k]) p.push(k + '=' + encodeURIComponent(q[k]));
    location.href = base + 'homes.html' + (p.length ? '?' + p.join('&') : '');
  }
  $$('.loc').forEach(function (loc, n) {
    var input = $('.loc__input', loc), menu = null, opts = [], at = -1, find = loc.closest('.find');
    var form = loc.closest('form');
    function match(list, q) {
      if (!q) return list;
      return list.filter(function (l) { var s = plain(l); return s.indexOf(q) === 0 || s.split(/[^a-z0-9]+/).some(function (w) { return w.indexOf(q) === 0; }); }).slice(0, 6);
    }
    function close() { if (menu) { menu.remove(); menu = null; } at = -1; input.setAttribute('aria-expanded', 'false'); }
    function choose(v) { input.value = v; close(); form.dispatchEvent(new CustomEvent('place', { detail: v })); }
    function hl(i) { at = i; opts.forEach(function (o, k) { o.classList.toggle('on', k === i); }); if (opts[i]) opts[i].scrollIntoView({ block: 'nearest' }); }
    function open() {
      var q = plain(input.value.trim()), c = match(PLACES.coasts, q), v = match(PLACES.villages, q);
      close(); if (!c.length && !v.length) return;
      menu = d.createElement('ul'); menu.className = 'loc__menu'; menu.id = 'loc-' + n; menu.setAttribute('role', 'listbox');
      var html = '';
      [['Destinations', c], ['Villages', v]].forEach(function (g) {
        if (!g[1].length) return;
        html += '<li role="presentation"><span class="loc__group">' + g[0] + '</span></li>';
        g[1].forEach(function (x) { html += '<li role="presentation"><button type="button" role="option" tabindex="-1" class="loc__opt">' + esc(x) + '</button></li>'; });
      });
      menu.innerHTML = html; opts = $$('.loc__opt', menu);
      opts.forEach(function (o, i) {
        o.addEventListener('mousedown', function (e) { e.preventDefault(); });
        o.addEventListener('mouseenter', function () { hl(i); });
        o.addEventListener('click', function () { choose(o.textContent); });
      });
      if (find) {
        var r = $('.find__bar', find).getBoundingClientRect(), hero = find.closest('.hero').getBoundingClientRect();
        var below = Math.min(hero.bottom, innerHeight) - r.bottom - 22, above = r.top - Math.max(hero.top, 0) - 22;
        var up = innerWidth > 860 && above > below && below < 260;
        find.classList.toggle('up', up);
        find.style.setProperty('--menu-max', Math.max(120, Math.min(340, up ? above - 60 : below)) + 'px');
      }
      loc.appendChild(menu); input.setAttribute('aria-expanded', 'true');
    }
    input.addEventListener('focus', open);
    input.addEventListener('input', open);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!menu) return open();
        hl((at + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length);
      } else if (e.key === 'Enter' && menu && at >= 0) { e.preventDefault(); choose(opts[at].textContent); }
      else if (e.key === 'Escape') close();
    });
    d.addEventListener('mousedown', function (e) { if (!loc.contains(e.target)) close(); });
    input.addEventListener('blur', function () { setTimeout(close, 120); });
  });
  $$('form[data-search]').forEach(function (f) {
    var go = function () {
      var q = {}; $$('input,select', f).forEach(function (i) { if (i.value && i.value !== 'Any') q[i.name || 'q'] = i.value; });
      goHomes(q);
    };
    f.addEventListener('submit', function (e) { e.preventDefault(); go(); });
    if (f.getAttribute('data-search') === 'quick') f.addEventListener('place', go);
  });
  $$('[data-chip]').forEach(function (b) { b.addEventListener('click', function () { goHomes({ q: b.getAttribute('data-chip') }); }); });

  /* Custom selects */
  function initSelect(box, onChange) {
    var btn = $('button', box), menu = null, opts = JSON.parse(box.getAttribute('data-opts')), label = box.getAttribute('data-label');
    var cls = box.classList.contains('pick') ? ['pick__btn', 'has'] : ['fsel__btn', 'has'];
    box.value = box.getAttribute('data-value') || '';
    function paint() {
      var o = opts.filter(function (x) { return x[0] === box.value; })[0], t = $('span', btn);
      t.textContent = o ? o[1] : label; btn.classList.toggle(cls[1], !!(o && (o[0] || box.hasAttribute('data-strong'))));
    }
    function close() { if (menu) { menu.remove(); menu = null; box.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } }
    function open() {
      menu = d.createElement('ul'); menu.className = 'fsel__menu'; menu.setAttribute('role', 'listbox');
      menu.innerHTML = opts.map(function (o) { return '<li><button type="button" role="option" class="fsel__opt' + (o[0] === box.value ? ' sel on' : '') + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button></li>'; }).join('');
      box.appendChild(menu); box.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
      var os = $$('.fsel__opt', menu), r = menu.getBoundingClientRect();
      if (r.right > innerWidth - 10) { menu.style.left = 'auto'; menu.style.right = '0'; }
      os.forEach(function (o) {
        o.addEventListener('mouseenter', function () { os.forEach(function (x) { x.classList.remove('on'); }); o.classList.add('on'); });
        o.addEventListener('click', function () { box.value = o.getAttribute('data-v'); paint(); close(); btn.focus(); if (onChange) onChange(); });
      });
    }
    btn.addEventListener('click', function () { if (menu) close(); else open(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault(); if (!menu) open();
        var os = $$('.fsel__opt', menu), i = os.indexOf(d.activeElement);
        os[(i + (e.key === 'ArrowDown' ? 1 : -1) + os.length) % os.length].focus();
      }
    });
    d.addEventListener('mousedown', function (e) { if (!box.contains(e.target)) close(); });
    box.set = function (v) { box.value = v; paint(); };
    paint();
  }

  /* Homes browser: filter, sort, paginate */
  (function () {
    var br = $('.browse'); if (!br) return;
    var PAGE = 21, grid = $('.grid', br), cards = $$('.card', grid), count = $('.browse__count', br), pager = $('.pager', br), page = 1;
    var input = $('.loc__input', br), boxes = {};
    $$('.fsel', br).forEach(function (b) { boxes[b.getAttribute('data-k')] = b; initSelect(b, function () { page = 1; run(); }); });
    var p = new URLSearchParams(location.search);
    if (p.get('q')) input.value = p.get('q');
    ['min', 'max', 'beds', 'baths', 'type', 'status'].forEach(function (k) { if (p.get(k)) boxes[k].set(p.get(k)); });
    var empty = d.createElement('div'); empty.className = 'empty'; empty.hidden = true;
    empty.innerHTML = '<p>No homes match that search yet. Widen it, or tell us what you are looking for.</p><button type="button">Clear all filters</button>';
    grid.appendChild(empty);
    $('button', empty).addEventListener('click', function () {
      input.value = ''; for (var k in boxes) boxes[k].set(boxes[k].getAttribute('data-value') || ''); page = 1; run();
    });
    function run(jump) {
      var q = plain(input.value.trim()), v = function (k) { return boxes[k].value; };
      var list = cards.filter(function (c) {
        var s = c.dataset;
        if (q && plain(s.text).indexOf(q) < 0) return false;
        if (v('min') && +s.price < +v('min')) return false;
        if (v('max') && +s.price > +v('max')) return false;
        if (v('beds') && +s.beds < +v('beds')) return false;
        if (v('baths') && +s.baths < +v('baths')) return false;
        if (v('type') && s.type !== v('type')) return false;
        if (v('status') === 'open' && s.left === '0') return false;
        if (v('status') === 'full' && s.left !== '0') return false;
        return true;
      });
      var so = v('sort');
      list.sort(function (a, b) {
        a = a.dataset; b = b.dataset;
        return so === 'low' ? a.price - b.price : so === 'high' ? b.price - a.price : so === 'left' ? b.left - a.left : a.no - b.no;
      });
      var pages = Math.max(1, Math.ceil(list.length / PAGE)); page = Math.min(page, pages);
      var from = (page - 1) * PAGE, show = list.slice(from, from + PAGE);
      cards.forEach(function (c) { c.hidden = true; });
      show.forEach(function (c) { c.hidden = false; grid.insertBefore(c, empty); });
      empty.hidden = list.length > 0;
      count.textContent = list.length ? 'Showing ' + (from + 1) + '-' + (from + show.length) + ' of ' + list.length + ' homes' : 'No homes found';
      var h = '<button type="button" data-p="' + (page - 1) + '"' + (page < 2 ? ' disabled' : '') + '>Previous</button>';
      for (var i = 1; i <= pages; i++) h += '<button type="button" data-p="' + i + '"' + (i === page ? ' class="on" aria-current="page"' : '') + '>' + i + '</button>';
      h += '<button type="button" data-p="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + '>Next</button>';
      pager.innerHTML = h; pager.hidden = pages < 2;
      if (jump) scrollTo({ top: br.getBoundingClientRect().top + scrollY - 70, behavior: calm ? 'auto' : 'smooth' });
    }
    pager.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b && !b.disabled) { page = +b.dataset.p; run(true); } });
    var f = $('.filters__loc', br);
    f.addEventListener('submit', function (e) { e.preventDefault(); page = 1; run(); });
    f.addEventListener('place', function () { page = 1; run(); });
    input.addEventListener('input', function () { if (!input.value) { page = 1; run(); } });
    run();
  })();

  /* Modal helper: lock page, trap Escape */
  function lock(o) { if (o) { root.setAttribute('data-modal', ''); root.style.overflow = 'hidden'; } else { root.removeAttribute('data-modal'); root.style.overflow = ''; } }
  function trap(box, e) {
    if (e.key !== 'Tab') return;
    var f = $$('button,input,a[href],textarea,select', box).filter(function (x) { return x.offsetParent !== null && x.tabIndex >= 0; });
    if (!f.length) return;
    if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  /* Gate: "Save this home" and "View full details" */
  function gate(o) {
    if ($('.gate')) return;
    var from = d.activeElement, g = d.createElement('div');
    g.className = 'gate'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-label', o.title);
    g.innerHTML = '<div class="gate__card"><div class="gate__media"><img src="' + o.img + '" alt=""><span class="gate__addr">' + esc(o.addr) + '</span></div>' +
      '<div class="gate__panel"><span class="gate__eye">Oitava</span><h2 class="gate__h">' + o.title + '</h2><p class="gate__sub">' + o.sub + '</p>' +
      '<ul class="gate__perks"><li>Full photos and floor plan</li><li>Saved homes on any device</li><li>Alerts for homes like this</li></ul>' +
      '<form class="gate__form"><input type="text" placeholder="Full Name" aria-label="Full name" required autocomplete="off"><input type="email" placeholder="Email" aria-label="Email" required autocomplete="off"><input type="tel" placeholder="Phone" aria-label="Phone" autocomplete="off">' +
      '<label class="ok"><input type="checkbox" required><span>I agree to be contacted by Oitava about shared homes by phone, email or text. I can opt out at any time.</span></label>' +
      '<button class="gate__go">' + o.cta + '</button></form><p class="gate__trust">Your details stay with Oitava. Never sold, never shared.</p></div></div>';
    body.appendChild(g); lock(true);
    function close() { g.remove(); lock(false); d.removeEventListener('keydown', key); if (from && from.focus) from.focus({ preventScroll: true }); }
    function key(e) { if (e.key === 'Escape' && o.free) close(); trap(g, e); }
    d.addEventListener('keydown', key);
    g.addEventListener('mousedown', function (e) { if (e.target === g && o.free) close(); });
    $('form', g).addEventListener('submit', function (e) { e.preventDefault(); if (o.done) o.done(); close(); });
    var f = $('input', g); if (innerWidth > 900) f.focus({ preventScroll: true });
    if (o.skip) setTimeout(function () {
      if (!g.isConnected) return;
      var s = d.createElement('button'); s.type = 'button'; s.className = 'gate__skip'; s.textContent = 'No thanks, browse without saved homes or share alerts';
      s.addEventListener('click', function () { if (o.done) o.done(); close(); });
      $('.gate__panel', g).appendChild(s);
    }, 5000);
  }
  $$('.heart').forEach(function (h) {
    h.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (h.classList.contains('on')) { h.classList.remove('on'); h.setAttribute('aria-pressed', 'false'); return; }
      var on = function () { h.classList.add('on'); h.setAttribute('aria-pressed', 'true'); store.set('oitava-member', '1'); };
      if (store.get('oitava-member')) return on();
      var c = h.closest('.card');
      gate({ title: 'Save This Home', sub: 'Register once to keep your saved homes and get a note when a share like this opens up.', cta: 'Save Home', img: $('img', c).currentSrc || $('img', c).src, addr: $('.card__addr', c).textContent, free: true, done: on });
    });
  });
  var ld = $('.ld');
  // add ?preview to a home's address to open it without the registration card
  if (ld && location.search.indexOf('preview') < 0 && !store.get('oitava-member') && !store.get('oitava-skip')) setTimeout(function () {
    gate({ title: 'View Full Home Details', sub: 'Register once for complete information, photos and first notice of new shares across our four destinations.', cta: 'View Home', img: $('.tile--main img').src, addr: ld.getAttribute('data-addr'), skip: true, done: function () { store.set('oitava-skip', '1'); } });
  }, 1600);

  /* Lightbox */
  (function () {
    var tiles = $$('[data-shot]'); if (!tiles.length) return;
    var shots = JSON.parse(ld.getAttribute('data-shots'));
    function open(i) {
      var from = d.activeElement, l = d.createElement('div'); l.className = 'light'; l.setAttribute('role', 'dialog'); l.setAttribute('aria-modal', 'true'); l.setAttribute('aria-label', 'Photos');
      l.innerHTML = '<div class="light__stage"><img alt=""></div><span class="light__n"></span><button class="light__x" aria-label="Close">×</button><button class="light__nav light__nav--p" aria-label="Previous photo">‹</button><button class="light__nav light__nav--n" aria-label="Next photo">›</button><span class="light__cap"></span>';
      body.appendChild(l); lock(true);
      function show(n) { i = (n + shots.length) % shots.length; $('img', l).src = shots[i][0]; $('img', l).alt = shots[i][1]; $('.light__cap', l).textContent = shots[i][1]; $('.light__n', l).textContent = (i + 1) + ' / ' + shots.length; }
      function close() { l.remove(); lock(false); d.removeEventListener('keydown', key); if (from) from.focus({ preventScroll: true }); }
      function key(e) { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); trap(l, e); }
      d.addEventListener('keydown', key);
      $('.light__x', l).addEventListener('click', close);
      $('.light__nav--p', l).addEventListener('click', function () { show(i - 1); });
      $('.light__nav--n', l).addEventListener('click', function () { show(i + 1); });
      l.addEventListener('click', function (e) { if (e.target === l || e.target.className === 'light__stage') close(); });
      var x0 = null;
      l.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      l.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
      show(i); $('.light__x', l).focus();
    }
    tiles.forEach(function (t) { t.addEventListener('click', function () { open(+t.getAttribute('data-shot')); }); });
  })();

  /* Mobile action bar hides over the enquiry form */
  var bar = $('.bar'), askBox = $('.ask');
  if (bar && askBox && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { bar.classList.toggle('hide', es[0].isIntersecting); }).observe(askBox);

  /* Forms: static site, so they only confirm on screen */
  $$('form[data-done]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var t = f.getAttribute('data-done').split('|'), box = d.createElement('div');
      box.className = 'done'; box.setAttribute('role', 'status'); box.tabIndex = -1;
      box.innerHTML = '<h3>' + esc(t[0]) + '</h3><p>' + esc(t[1]) + '</p>';
      box.style.minHeight = f.offsetHeight + 'px';
      f.replaceWith(box); box.focus({ preventScroll: true });
    });
  });

  /* Valuation in three steps */
  (function () {
    var f = $('.value form'); if (!f) return;
    var steps = $$('.value__step', f), dots = $$('.steps3 li'), err = $('.value__err'), at = 0;
    $$('.pick', f).forEach(function (p) { initSelect(p); });
    function show(i) { at = i; steps.forEach(function (s, k) { s.hidden = k !== i; }); dots.forEach(function (x, k) { x.classList.toggle('on', k <= i); }); err.hidden = true; }
    function say(m) { err.textContent = m; err.hidden = false; }
    $$('.value__go', f).forEach(function (b) {
      if (b.type === 'submit') return;
      b.addEventListener('click', function () { if (at === 0 && !$('#v-addr').value.trim()) { $('#v-addr').focus(); return say('Please enter the address of the house.'); } show(at + 1); });
    });
    $$('.value__back', f).forEach(function (b) { b.addEventListener('click', function () { show(at - 1); }); });
    var ad = $('#v-addr'), list = $('.vf__list', f);
    ad.addEventListener('input', function () {
      var v = ad.value.trim(); if (v.length < 4) { list.hidden = true; return; }
      list.innerHTML = PLACES.coasts.map(function (c) { return '<button type="button">' + esc(v + ', ' + c) + '</button>'; }).join(''); list.hidden = false;
    });
    list.addEventListener('mousedown', function (e) { if (e.target.tagName === 'BUTTON') { e.preventDefault(); ad.value = e.target.textContent; list.hidden = true; } });
    ad.addEventListener('blur', function () { list.hidden = true; });
    ad.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); list.hidden = true; $('.value__go', steps[0]).click(); } });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!$('#v-name').value.trim() || !/.+@.+\..+/.test($('#v-mail').value)) return say('Please add your name and a valid email.');
      if (!$('.value .ok input').checked) return say('Please tick the box so we may reply to you.');
      $('.value__flow').hidden = true; var dn = $('.value__done'); dn.hidden = false; dn.focus({ preventScroll: true });
    });
    show(0);
  })();

  /* Destination guide */
  (function () {
    var ex = $('.ex'); if (!ex) return;
    var G = window.OITAVA_GUIDE, map = $('.map', ex), svg = $('svg', map), pinsBox = $('.map__pins', map);
    var panel = $('.panel__in', ex), stage = $('.stage', ex), listEl = $('.places', ex), chips = $('.chips', ex);
    var hood = '', cat = '', sel = -1, all = false, W = 0, H = 0;
    var V = { x: 700, y: 400, z: 1 }, anim = 0;
    var catName = G.cats;

    var pins = G.pois.map(function (p, i) {
      var b = d.createElement('button'); b.className = 'pin'; b.type = 'button'; b.setAttribute('data-cat', p[1]); b.setAttribute('aria-label', p[2]);
      b.innerHTML = '<i></i><b>' + esc(p[2]) + '</b>';
      b.addEventListener('click', function () { pick(i, true); });
      pinsBox.appendChild(b); return b;
    });
    var towns = G.towns.map(function (t) { var e = d.createElement('div'); e.className = 'map__town'; e.innerHTML = '<span>' + esc(t[0]) + '</span>'; map.insertBefore(e, pinsBox); return [e, t[1], t[2]]; });

    function fit() { return Math.max(W / 1400, H / 800); }
    function paint() {
      var k = fit() * V.z, ox = W / 2 - V.x * k, oy = H / 2 - V.y * k;
      svg.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + k + ')';
      G.pois.forEach(function (p, i) { pins[i].style.transform = 'translate(' + (ox + p[4] * k) + 'px,' + (oy + p[5] * k) + 'px)'; });
      towns.forEach(function (t) { t[0].style.transform = 'translate(' + (ox + t[1] * k) + 'px,' + (oy + t[2] * k) + 'px)'; });
    }
    function clamp(t) {
      var k = fit() * t.z, hw = W / 2 / k, hh = H / 2 / k;
      t.x = hw * 2 >= 1400 ? 700 : Math.min(1400 - hw, Math.max(hw, t.x));
      t.y = hh * 2 >= 800 ? 400 : Math.min(800 - hh, Math.max(hh, t.y));
      return t;
    }
    function fly(x, y, z) {
      cancelAnimationFrame(anim);
      var t = clamp({ x: x, y: y, z: z }), a = { x: V.x, y: V.y, z: V.z };
      if (calm) { V = t; return paint(); }
      var t0 = performance.now();
      (function f(now) {
        var k = Math.min(1, Math.max(0, (now - t0) / 1100)), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        V = { x: a.x + (t.x - a.x) * e, y: a.y + (t.y - a.y) * e, z: a.z + (t.z - a.z) * e };
        paint(); if (k < 1) anim = requestAnimationFrame(f);
      })(t0);
    }
    function size() { W = map.clientWidth; H = map.clientHeight; V = clamp(V); paint(); }
    addEventListener('resize', size);

    // drag to pan; vertical swipes on touch keep scrolling the page
    var drag = null;
    map.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.pin') || e.pointerType === 'mouse' && e.button) return;
      cancelAnimationFrame(anim); drag = { x: e.clientX, y: e.clientY, vx: V.x, vy: V.y, t: e.pointerType };
      if (e.pointerType === 'mouse') { map.setPointerCapture(e.pointerId); map.classList.add('drag'); }
    });
    map.addEventListener('pointermove', function (e) {
      if (!drag) return; var k = fit() * V.z;
      V = clamp({ x: drag.vx - (e.clientX - drag.x) / k, y: drag.t === 'mouse' ? drag.vy - (e.clientY - drag.y) / k : drag.vy, z: V.z }); paint();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { map.addEventListener(n, function () { drag = null; map.classList.remove('drag'); }); });
    $$('.zoom button', ex).forEach(function (b) { b.addEventListener('click', function () { fly(V.x, V.y, Math.min(5, Math.max(1, V.z * (b.hasAttribute('data-in') ? 1.5 : 1 / 1.5)))); }); });

    function shown() { var r = []; G.pois.forEach(function (p, i) { if ((!hood || p[0] === hood) && (!cat || p[1] === cat)) r.push(i); }); return r; }
    function hoodName(id) { return (G.hoods.filter(function (h) { return h[0] === id; })[0] || [])[1]; }
    function foot(p) { return '<div class="place__foot"><span>' + esc(hoodName(p[0])) + '</span><a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p[2] + ' ' + G.name + ' Portugal') + '" target="_blank" rel="noopener">Directions ↗</a></div>'; }
    function meta(p, full) { return '<span class="place__meta"><i></i>' + esc(catName[p[1]]) + (full ? ' · ' + esc(hoodName(p[0])) : '') + '</span>'; }

    function drawPanel() {
      var h = G.hoods.filter(function (x) { return x[0] === hood; })[0], i = G.hoods.indexOf(h), html;
      if (!h) html = '<div class="panel__top"><span class="kicker">' + G.hoods.length + ' areas · ' + G.pois.length + ' local favourites</span></div><h3>All of ' + esc(G.name) + '</h3><p>Pick an area above to see its character and landmarks, or tap any pin for the details.</p>';
      else html = '<div class="panel__top"><span class="kicker">' + esc(h[2]) + '</span><span class="panel__i">0' + (i + 1) + ' / 0' + G.hoods.length + '</span></div><h3>' + esc(h[1]) + '</h3><p>' + esc(h[3]) + '</p><div class="anchors">' +
        G.pois.map(function (p, k) { return p[0] === hood ? '<button type="button" data-i="' + k + '">' + esc(p[2]) + '</button>' : ''; }).join('') + '</div>';
      html += '<button type="button" class="askbtn"><img src="' + base + 'assets/img/ines.jpg" alt="" width="48" height="48"><span><b>Ask Inês</b>Homes, villages and weeks in ' + esc(h ? h[1] : G.name) + '</span><i>→</i></button>';
      panel.innerHTML = html; panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
      $$('.anchors button', panel).forEach(function (b) { b.addEventListener('click', function () { pick(+b.dataset.i, true); }); });
      $('.askbtn', panel).addEventListener('click', function () { sheet(h ? h[1] + ', ' + G.name : G.name, h ? h[1] : G.name); });
    }
    function drawChips() {
      var pool = G.pois.filter(function (p) { return !hood || p[0] === hood; }), n = {};
      pool.forEach(function (p) { n[p[1]] = (n[p[1]] || 0) + 1; });
      chips.innerHTML = '<button type="button" class="catchip' + (cat ? '' : ' on') + '" data-c="">Everything <small>' + pool.length + '</small></button>' +
        Object.keys(catName).filter(function (c) { return n[c]; }).map(function (c) { return '<button type="button" class="catchip' + (cat === c ? ' on' : '') + '" data-c="' + c + '" data-cat="' + c + '"><i></i>' + esc(catName[c]) + ' <small>' + n[c] + '</small></button>'; }).join('');
    }
    chips.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; unpick(); drawChips(); drawList(); });
    function drawList() {
      var s = shown();
      pins.forEach(function (p, i) { p.classList.toggle('off', s.indexOf(i) < 0); });
      $('.legend b', ex).textContent = s.length;
      listEl.className = 'places ' + (all ? 'all' : 'row');
      listEl.innerHTML = s.map(function (i) { var p = G.pois[i]; return '<li class="place" data-i="' + i + '" data-cat="' + p[1] + '"><button type="button" class="place__main">' + meta(p, true) + '<span class="place__name">' + esc(p[2]) + '</span><span class="place__note">' + esc(p[3]) + '</span></button>' + foot(p) + '</li>'; }).join('');
      $('.showall', ex).textContent = all ? 'Show as a row' : 'Show all ' + s.length;
      $$('.round', ex).forEach(function (b) { b.hidden = all; });
      listEl.scrollLeft = 0; arrows();
    }
    listEl.addEventListener('click', function (e) { var m = e.target.closest('.place__main'); if (m) pick(+m.parentNode.dataset.i, true); });
    var arr = $$('.round', ex);
    function arrows() { arr[0].disabled = listEl.scrollLeft < 4; arr[1].disabled = listEl.scrollLeft > listEl.scrollWidth - listEl.clientWidth - 4; }
    listEl.addEventListener('scroll', arrows, { passive: true });
    arr.forEach(function (b, i) { b.addEventListener('click', function () { listEl.scrollBy({ left: (i ? 1 : -1) * listEl.clientWidth * 0.8, behavior: calm ? 'auto' : 'smooth' }); }); });
    $('.showall', ex).addEventListener('click', function () { all = !all; drawList(); });

    function unpick() {
      sel = -1; pins.forEach(function (p) { p.classList.remove('on'); }); $$('.place.on', ex).forEach(function (p) { p.classList.remove('on'); });
      var c = $('.mcard', stage); if (c) c.remove();
    }
    function pick(i) {
      unpick(); sel = i; var p = G.pois[i];
      pins[i].classList.add('on');
      var li = $('.place[data-i="' + i + '"]', ex);
      if (li) { li.classList.add('on'); if (!all) listEl.scrollTo({ left: li.offsetLeft - listEl.offsetLeft - 2, behavior: calm ? 'auto' : 'smooth' }); }
      var c = d.createElement('div'); c.className = 'mcard'; c.setAttribute('data-cat', p[1]);
      c.innerHTML = '<button type="button" class="mcard__x" aria-label="Close">×</button>' + meta(p) + '<span class="place__name">' + esc(p[2]) + '</span><span class="place__note">' + esc(p[3]) + '</span>' + foot(p);
      stage.appendChild(c); $('.mcard__x', c).addEventListener('click', unpick);
      fly(p[4], p[5], 3);
      var r = stage.getBoundingClientRect();
      if (r.top < 0 || r.top > innerHeight * 0.5) scrollTo({ top: scrollY + r.top - 96, behavior: calm ? 'auto' : 'smooth' });
    }
    function setHood(id) {
      hood = id; cat = ''; unpick();
      $$('.tab', ex).forEach(function (t) { var on = t.dataset.h === id; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); if (on && innerWidth <= 900) t.parentNode.scrollTo({ left: t.offsetLeft - 40, behavior: calm ? 'auto' : 'smooth' }); });
      drawPanel(); drawChips(); drawList();
      var h = G.hoods.filter(function (x) { return x[0] === id; })[0];
      var shift = innerWidth > 900 ? -70 : 0;
      if (h) fly(h[4] + shift, h[5], 2.2); else fly(700, 400, 1);
    }
    $$('.tab', ex).forEach(function (t) { t.addEventListener('click', function () { setHood(t.dataset.h); }); });

    /* Ask sheet */
    var sh = $('.sheet'), shFrom;
    function sheet(topic, label) {
      shFrom = d.activeElement; $('b', sh).textContent = 'Ask Inês about ' + label;
      var ta = $('textarea', sh); if (ta) ta.value = 'I would love to hear about homes in ' + topic + '.';
      sh.classList.add('open'); lock(true); $('.sheet__x', sh).focus({ preventScroll: true });
    }
    function shut() { sh.classList.remove('open'); lock(false); if (shFrom) shFrom.focus({ preventScroll: true }); }
    $('.sheet__x', sh).addEventListener('click', shut); $('.sheet__bg', sh).addEventListener('click', shut);
    d.addEventListener('keydown', function (e) { if (!sh.classList.contains('open')) return; if (e.key === 'Escape') shut(); trap($('.sheet__box', sh), e); });

    size();
    var q = new URLSearchParams(location.search).get('area');
    if (q && G.hoods.some(function (h) { return h[0] === q; })) setHood(q); else { drawPanel(); drawChips(); drawList(); }
  })();

  /* Prefill exchange + contact from links such as ?topic=... */
  $$('[data-topic]').forEach(function (a) { a.addEventListener('click', function () { var t = $('#enquire textarea'); if (t) t.value = 'I would like to know more about ' + a.getAttribute('data-topic') + '.'; }); });
})();
