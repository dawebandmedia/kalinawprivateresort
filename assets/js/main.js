/* Kalinaw Private Resort: motion and interactions.
   GSAP + ScrollTrigger + SplitText and Lenis come from jsDelivr. Every module is
   optional: if a library fails to load, or the visitor prefers reduced motion,
   the page stays fully readable and usable. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CFG = window.KAL || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var G = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
  var motion = !!(G && ST) && !reduce;
  var lenis = null;
  var html = document.documentElement;

  function safe(name, fn) { try { fn(); } catch (e) { if (window.console) console.warn('[kalinaw] ' + name, e); } }
  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function lstore(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  if (G && ST) { G.registerPlugin(ST); if (Split) G.registerPlugin(Split); }

  /* ------------------------------------------------------------------ year */
  safe('year', function () { $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); }); });

  /* ---------------------------------------------------------- smooth scroll */
  safe('lenis', function () {
    if (!motion || !window.Lenis || CFG.smoothScroll === false) return;
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
    lenis.on('scroll', ST.update);
    G.ticker.add(function (t) { lenis.raf(t * 1000); });
    G.ticker.lagSmoothing(0);
    // same-page anchors
    $$('a[href^="#"], a[href*=".html#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var url = new URL(a.href, location.href);
        if (url.pathname !== location.pathname || !url.hash) return;
        var t = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (!t) return;
        e.preventDefault();
        lenis.scrollTo(t, { offset: 0, duration: 1.4 });
        history.replaceState(null, '', url.hash);
      });
    });
  });

  /* ------------------------------------------------------- Antipolo clock */
  var hero = $('[data-hero]');
  var heroGL = null;
  function manilaHour() {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: CFG.timeZone || 'Asia/Manila', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      for (var i = 0; i < p.length; i++) if (p[i].type === 'hour') return parseInt(p[i].value, 10);
    } catch (e) {}
    return new Date().getHours();
  }
  function setMode(mode, user) {
    if (!hero) return;
    hero.setAttribute('data-mode', mode);
    $$('[data-sky]', hero).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sky') === mode)); });
    if (heroGL) heroGL.to(mode === 'night' ? 1 : 0, user);
    if (user) hero.setAttribute('data-user', '1');
  }
  safe('clock', function () {
    if (!hero) return;
    var out = $('[data-clock]', hero);
    function tick() {
      try { out.textContent = new Intl.DateTimeFormat('en-PH', { timeZone: CFG.timeZone || 'Asia/Manila', hour: 'numeric', minute: '2-digit' }).format(new Date()); }
      catch (e) { out.textContent = ''; }
    }
    tick(); setInterval(tick, 15000);
    var h = manilaHour();
    setMode(h >= 18 || h < 6 ? 'night' : 'day');
    $$('[data-sky]', hero).forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-sky'), true); }); });
  });

  /* --------------------------------------------------------- hero WebGL */
  safe('heroGL', function () {
    var cv = $('[data-hero-gl]');
    if (!cv || reduce) return;
    var gl = cv.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) return;
    var small = window.innerWidth < 900;
    var srcs = [cv.dataset[small ? 'daySm' : 'day'], cv.dataset[small ? 'nightSm' : 'night'], cv.dataset.mask];

    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = [
      'precision highp float;',
      'uniform sampler2D uDay,uNight,uMask;uniform vec2 uRes,uImg,uMouse;uniform float uTime,uMix,uHover,uZoom,uDpr;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}',
      'void main(){',
      ' vec2 st=gl_FragCoord.xy/uRes; st.y=1.-st.y;',
      ' float rs=uRes.x/uRes.y, ri=uImg.x/uImg.y;',
      ' vec2 sc=rs>ri?vec2(1.,ri/rs):vec2(rs/ri,1.);',
      ' vec2 uv=(st-.5)*sc/uZoom+vec2(.5,.5+(1.-sc.y)*.12);',
      ' float m=texture2D(uMask,uv).r;',
      ' float t=uTime;',
      ' vec2 w=vec2(sin(uv.y*95.+t*1.7)+sin(uv.x*48.-t*1.1+uv.y*32.)+noise(uv*40.+t*.6)*1.4,',
      '             cos(uv.x*72.+t*1.3)+sin(uv.y*130.-t*.9)+noise(uv*36.-t*.5)*1.4)*.0016*m;',
      ' vec2 asp=vec2(rs,1.);',
      ' vec2 dv=(st-uMouse)*asp; float d=length(dv);',
      ' float ring=sin(d*58.-t*5.5)*exp(-d*6.5)*uHover;',
      ' vec2 r=normalize(dv+1e-5)*ring*.006*(.25+.75*m);',
      ' vec2 q=uv+w+r;',
      ' vec3 a=texture2D(uDay,q).rgb, b=texture2D(uNight,q).rgb;',
      // a sweeping horizon: night falls from the top-right, morning returns the same way
      ' float n=noise(st*vec2(6.,3.)+t*.15)*.12;',
      ' float edge=(1.-st.y)*.55+st.x*.45+n;',
      ' float k=(1.-uMix)*1.5-.25;',
      ' float f=smoothstep(k-.16,k+.16,edge);',
      ' vec3 col=mix(a,b,f);',
      ' float band=(1.-abs(f-.5)*2.); band=band*band*(uMix>0.001&&uMix<.999?1.:0.);',
      ' col+=vec3(1.,.55,.22)*band*.38;',
      // night water sparkle and day glints
      ' float sp=pow(max(0.,sin(q.x*420.+t*2.2)*sin(q.y*260.-t*1.7)),14.)*m;',
      ' col+=sp*mix(vec3(.55,.5,.4),vec3(.45,.6,1.),f)*.5;',
      ' col*=1.-.28*pow(length((st-.5)*vec2(1.1,1.)),2.2);',
      ' gl_FragColor=vec4(col,1.);',
      '}'
    ].join('\n');

    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link');
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['uDay', 'uNight', 'uMask', 'uRes', 'uImg', 'uMouse', 'uTime', 'uMix', 'uHover', 'uZoom', 'uDpr'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });

    function load(src) { return new Promise(function (res, rej) { var im = new Image(); im.decoding = 'async'; im.onload = function () { res(im); }; im.onerror = rej; im.src = src; }); }
    function tex(im, unit) {
      var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      return t;
    }
    var state = { mix: hero.getAttribute('data-mode') === 'night' ? 1 : 0, target: 0, mx: .5, my: .6, tx: .5, ty: .6, hover: 0, th: 0, zoom: 1, visible: true, ready: false };
    state.target = state.mix;
    var dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
    function size() {
      var w = cv.clientWidth, h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(U.uRes, cv.width, cv.height);
    }
    var t0 = performance.now(), raf = 0;
    function frame(now) {
      raf = 0;
      if (!state.visible || document.hidden) return;
      state.mix += (state.target - state.mix) * 0.035;
      if (Math.abs(state.target - state.mix) < 0.002) state.mix = state.target;
      state.mx += (state.tx - state.mx) * 0.08; state.my += (state.ty - state.my) * 0.08;
      state.hover += (state.th - state.hover) * 0.05;
      gl.uniform1f(U.uTime, (now - t0) / 1000);
      gl.uniform1f(U.uMix, state.mix);
      gl.uniform2f(U.uMouse, state.mx, state.my);
      gl.uniform1f(U.uHover, state.hover);
      gl.uniform1f(U.uZoom, state.zoom);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && state.ready) raf = requestAnimationFrame(frame); }

    Promise.all(srcs.map(load)).then(function (ims) {
      gl.uniform1i(U.uDay, 0); gl.uniform1i(U.uNight, 1); gl.uniform1i(U.uMask, 2);
      tex(ims[0], 0); tex(ims[1], 1); tex(ims[2], 2);
      gl.uniform2f(U.uImg, ims[0].naturalWidth, ims[0].naturalHeight);
      size(); state.ready = true; kick();
      requestAnimationFrame(function () { hero.classList.add('gl-on'); });
    }).catch(function () {});

    window.addEventListener('resize', function () { if (state.ready) { size(); kick(); } });
    hero.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect();
      state.tx = (e.clientX - r.left) / r.width; state.ty = (e.clientY - r.top) / r.height; state.th = 1;
    });
    hero.addEventListener('pointerleave', function () { state.th = 0; });
    hero.addEventListener('pointerdown', function (e) { var r = cv.getBoundingClientRect(); state.tx = (e.clientX - r.left) / r.width; state.ty = (e.clientY - r.top) / r.height; state.mx = state.tx; state.my = state.ty; state.th = 1; state.hover = 1; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { state.visible = en[0].isIntersecting; kick(); }).observe(hero);
    document.addEventListener('visibilitychange', kick);
    heroGL = {
      to: function (v) { state.target = v; kick(); },
      zoom: function (z) { state.zoom = z; kick(); }
    };
  });

  /* ------------------------------------------------------ split headlines */
  var splits = [];
  function splitLines(el) {
    if (!Split) return null;
    var s = Split.create(el, { type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
      onSplit: function (self) {
        $$('.line', el).forEach(function (l) { if (l.parentNode && l.parentNode.classList) l.parentNode.classList.add('line-mask'); });
        if (el._played) return;
        G.set(self.lines, { yPercent: 112 });
      } });
    return s;
  }
  function playLines(el, delay) {
    if (!el || el._played) return;
    el._played = true;
    var lines = $$('.line', el);
    if (!lines.length) return;
    G.to(lines, { yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: 0.09, delay: delay || 0 });
  }
  safe('split', function () {
    if (!motion || !Split) return;
    $$('[data-split-lines]').forEach(function (el) {
      splitLines(el);
      var inHero = el.closest('.hero, .page-hero, .gallery-head, .plan-head, .nf');
      if (inHero) { splits.push(el); return; }
      ST.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { playLines(el); } });
    });
  });

  /* ----------------------------------------------------- intro sequence */
  function heroIntro() {
    if (!motion) return;
    splits.forEach(function (el, i) { playLines(el, 0.05 + i * 0.1); });
    var fades = $$('[data-hero-fade]');
    if (fades.length) G.fromTo(fades, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, delay: 0.35 });
    var media = $('.hero__media');
    if (media) G.fromTo(media, { scale: 1.14 }, { scale: 1, duration: 2.4, ease: 'expo.out' });
    var zoom = $('[data-hero-zoom] .pic');
    if (zoom) G.fromTo(zoom, { scale: 1.16 }, { scale: 1, duration: 2.2, ease: 'expo.out' });
  }

  safe('loader', function () {
    var loader = $('.loader');
    if (G) G.set('.curtain', { y: 0, yPercent: 100 });
    var fromNav = store('kal-nav') === '1';
    store('kal-nav', '0');
    var curtain = $('.curtain');
    if (motion) G.set($$('[data-hero-fade]'), { autoAlpha: 0 });

    // arriving from another page: lift the curtain
    if (fromNav && motion && curtain) {
      if (loader) loader.style.display = 'none';
      G.set(curtain, { yPercent: 0, visibility: 'visible' });
      G.set($('.curtain__sun'), { y: 0 });
      G.to($('.curtain__sun'), { y: '-40vh', duration: 0.9, ease: 'power2.in' });
      G.to(curtain, { yPercent: -100, duration: 1, ease: 'expo.inOut', delay: 0.15, onComplete: function () { G.set(curtain, { yPercent: 100, visibility: 'hidden' }); } });
      G.delayedCall(0.45, heroIntro);
      store('kal-visited', '1');
      return;
    }
    if (!loader || !motion || html.classList.contains('is-return')) {
      if (loader) loader.style.display = 'none';
      heroIntro(); store('kal-visited', '1'); return;
    }
    if (lenis) lenis.stop();
    var paths = $$('.loader__lines path', loader);
    paths.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    var tl = G.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: function () { loader.style.display = 'none'; if (lenis) lenis.start(); } });
    tl.to(paths, { strokeDashoffset: 0, duration: 1.15, stagger: 0.05 })
      .to(paths, { fillOpacity: 1, duration: 0.35 }, '-=0.2')
      .to('.loader__mark', { opacity: 1, duration: 0.45 }, '-=0.05')
      .to('.loader__lines', { opacity: 0, duration: 0.2 }, '<0.3')
      .fromTo('.loader__word', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.3')
      .fromTo('.loader__line', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.35')
      .to('.loader__inner, .loader__line', { y: -30, opacity: 0, duration: 0.6, ease: 'power2.in' }, '+=0.35')
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.05, ease: 'expo.inOut' }, '-=0.25')
      .add(heroIntro, '-=0.75');
    store('kal-visited', '1');
  });

  /* ------------------------------------------------- page transitions */
  safe('transitions', function () {
    if (!motion) return;
    var curtain = $('.curtain'), sun = $('.curtain__sun');
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.hash) return; // same page anchor
      e.preventDefault();
      store('kal-nav', '1');
      html.classList.add('is-leaving');
      G.set(curtain, { yPercent: 100, visibility: 'visible' }); G.set(sun, { y: '40vh' });
      G.to(curtain, { yPercent: 0, duration: 0.8, ease: 'expo.inOut' });
      G.to(sun, { y: 0, duration: 0.9, ease: 'expo.out', delay: 0.15, onComplete: function () { location.href = url.href; } });
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) { html.classList.remove('is-leaving'); G.set(curtain, { yPercent: 100, visibility: 'hidden' }); store('kal-nav', '0'); }
    });
  });

  /* ------------------------------------------------------------ header */
  safe('header', function () {
    var header = $('[data-header]'); if (!header) return;
    var themed = $$('[data-theme]');
    var lastY = window.scrollY, ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY, probe = header.offsetHeight * 0.5;
      header.classList.toggle('is-scrolled', y > 24);
      var dark = false;
      for (var i = 0; i < themed.length; i++) {
        var r = themed[i].getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) { dark = themed[i].getAttribute('data-theme') === 'dark'; }
      }
      var day = $('.day.is-pinned');
      if (day) { var dr = day.getBoundingClientRect(); if (dr.top <= probe && dr.bottom > probe) dark = day.classList.contains('is-night'); }
      header.classList.toggle('on-dark', dark);
      if (!html.classList.contains('menu-open')) header.classList.toggle('is-hidden', y > 400 && y > lastY + 2);
      if (y < lastY - 2) header.classList.remove('is-hidden');
      lastY = y;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
    window.__kalHeader = update;
  });

  /* -------------------------------------------------------------- menu */
  safe('menu', function () {
    var btn = $('.menu-toggle'), menu = $('#menu'); if (!btn || !menu) return;
    var bg = $('.menu__bg', menu), links = $$('.menu__nav a, .menu__foot a', menu);
    function open() {
      menu.hidden = false; html.classList.add('menu-open'); btn.setAttribute('aria-expanded', 'true');
      if (lenis) lenis.stop();
      if (motion) {
        G.fromTo(bg, { clipPath: 'circle(0% at calc(100% - 46px) 38px)' }, { clipPath: 'circle(150% at calc(100% - 46px) 38px)', duration: 0.9, ease: 'expo.inOut' });
        G.fromTo(links, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'expo.out', stagger: 0.05, delay: 0.3 });
      } else { bg.style.clipPath = 'none'; }
      setTimeout(function () { var f = $('.menu__nav a', menu); if (f) f.focus(); }, 50);
    }
    function close() {
      btn.setAttribute('aria-expanded', 'false');
      var done = function () { menu.hidden = true; html.classList.remove('menu-open'); if (lenis) lenis.start(); };
      if (motion) { G.to(links, { autoAlpha: 0, duration: 0.25 }); G.to(bg, { clipPath: 'circle(0% at calc(100% - 46px) 38px)', duration: 0.7, ease: 'expo.inOut', onComplete: done }); }
      else done();
    }
    btn.addEventListener('click', function () { btn.getAttribute('aria-expanded') === 'true' ? close() : open(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); } });
  });

  /* ------------------------------------------------------------ cursor */
  safe('cursor', function () {
    if (!fine || reduce || !G) return;
    var c = $('.cursor'); if (!c) return;
    html.classList.add('has-cursor'); c.classList.add('is-hidden');
    var dot = $('.cursor__dot', c), ring = $('.cursor__ring', c), label = $('.cursor__label', c);
    var dx = G.quickTo(dot, 'x', { duration: 0.08 }), dy = G.quickTo(dot, 'y', { duration: 0.08 });
    var rx = G.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = G.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    window.addEventListener('pointermove', function (e) {
      if (!c._moved) { c._moved = true; G.set([dot, ring], { x: e.clientX, y: e.clientY }); }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      var t = e.target;
      var lab = t.closest && t.closest('[data-cursor]');
      var link = t.closest && t.closest('a, button, label, input, select, textarea, summary');
      c.classList.toggle('is-label', !!lab);
      label.textContent = lab ? lab.getAttribute('data-cursor') : '';
      c.classList.toggle('is-link', !lab && !!link);
      var sec = t.closest && t.closest('[data-theme]');
      var dark = sec && sec.getAttribute('data-theme') === 'dark';
      var day = t.closest && t.closest('.day');
      if (day) dark = day.classList.contains('is-night');
      c.classList.toggle('on-dark', !!dark);
      c.classList.toggle('is-hidden', !!(t.closest && t.closest('iframe, .compare, .lightbox')));
    }, { passive: true });
    document.addEventListener('pointerleave', function () { c.classList.add('is-hidden'); });
    document.addEventListener('pointerenter', function () { c.classList.remove('is-hidden'); });
  });

  /* ---------------------------------------------------------- magnetic */
  safe('magnetic', function () {
    if (!fine || reduce || !G) return;
    $$('[data-magnetic]').forEach(function (el) {
      var x = G.quickTo(el, 'x', { duration: 0.6, ease: 'power3' }), y = G.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.28); y((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', function () { G.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, .4)' }); });
    });
  });

  /* ------------------------------------------------ hero scroll depth */
  safe('heroScroll', function () {
    if (!motion || !hero) return;
    ST.create({ trigger: hero, start: 'top top', end: 'bottom top', scrub: true, onUpdate: function (s) {
      if (heroGL) heroGL.zoom(1 + s.progress * 0.12);
    } });
    G.to('.hero__content', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    G.to('.hero__img', { scale: 1.1, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  });
  safe('pageHeroScroll', function () {
    if (!motion) return;
    $$('.page-hero, .cta-band, .nf').forEach(function (sec) {
      var m = $('.page-hero__media, .cta-band__media, .nf__media', sec); if (!m) return;
      G.fromTo(m, { yPercent: sec.classList.contains('page-hero') ? 0 : -8 }, { yPercent: sec.classList.contains('page-hero') ? 18 : 8, ease: 'none', scrollTrigger: { trigger: sec, start: sec.classList.contains('page-hero') ? 'top top' : 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  /* ------------------------------------------- statement word scrubbing */
  safe('scrubWords', function () {
    $$('[data-scrub-words]').forEach(function (el) {
      if (!motion) return;
      var words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map(function (w) { return '<span class="w">' + w.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>'; }).join(' ');
      var spans = $$('.w', el), n = spans.length;
      spans.forEach(function (s) { s.style.setProperty('--o', '0.14'); });
      ST.create({ trigger: el, start: 'top 82%', end: 'bottom 45%', scrub: true, onUpdate: function (st) {
        var p = st.progress * (n + 4);
        for (var i = 0; i < n; i++) spans[i].style.setProperty('--o', String(clamp(0.14 + (p - i) * 0.3, 0.14, 1)));
      } });
    });
  });

  /* ------------------------------------------------------ small staggers */
  safe('stagger', function () {
    if (!motion) return;
    $$('[data-stagger]').forEach(function (list) {
      G.from(list.children, { y: 36, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: list, start: 'top 85%', once: true } });
    });
  });

  /* --------------------------------------------------- image clip reveal */
  safe('reveal', function () {
    if (!motion) return;
    $$('[data-reveal]').forEach(function (el) {
      var img = $('img', el);
      G.set(el, { clipPath: 'inset(100% 0% 0% 0%)' });
      var tl = G.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
      tl.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' });
      if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.1);
    });
  });

  /* ---------------------------------------------------- generic parallax */
  safe('parallax', function () {
    if (!motion) return;
    $$('[data-parallax] .pic').forEach(function (p) {
      G.fromTo(p, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: p.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('[data-parallax-y]').forEach(function (el) {
      var d = parseFloat(el.getAttribute('data-parallax-y')) || 40;
      G.fromTo(el, { y: d }, { y: -d, ease: 'none', scrollTrigger: { trigger: el.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    var rp = $('.rain__pic');
    if (rp) G.fromTo(rp, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: '.rain', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* --------------------------------------------- a day and a night */
  safe('day', function () {
    var day = $('section.day'); if (!day) return;
    var track = $('[data-day-track]', day), panels = $$('.day__panel', day), sun = $('.day__sun', day);
    var hours = panels.map(function (p) { return parseFloat(p.getAttribute('data-hour')); });
    // sky keyframes: [hour, background, ink]
    var K = [
      [14, [243, 244, 239], 0], [16.5, [246, 239, 222], 0], [18, [241, 205, 146], 0], [19.5, [61, 69, 102], 1],
      [21, [22, 37, 60], 1], [22, [12, 24, 40], 1], [30.5, [12, 24, 40], 1], [32, [238, 241, 234], 0], [35, [243, 244, 239], 0]
    ];
    function skyAt(h) {
      for (var i = 0; i < K.length - 1; i++) {
        if (h <= K[i + 1][0]) {
          var t = clamp((h - K[i][0]) / (K[i + 1][0] - K[i][0]), 0, 1), a = K[i][1], b = K[i + 1][1];
          return { c: [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)], dark: (t > 0.5 ? K[i + 1][2] : K[i][2]) };
        }
      }
      return { c: K[K.length - 1][1], dark: 0 };
    }
    function arc(h) {
      var hh = h % 24, t, night = hh >= 18.5 || hh < 6;
      t = night ? ((hh - 18 + 24) % 24) / 12 : (hh - 6) / 12;
      t = clamp(t, 0.02, 0.98);
      var x = (1 - t) * (1 - t) * 10 + 2 * (1 - t) * t * 200 + t * t * 390;
      var y = (1 - t) * (1 - t) * 110 + 2 * (1 - t) * t * -60 + t * t * 110;
      return { x: x / 400 * 100, y: y / 120 * 100, night: night };
    }
    function apply(h) {
      var s = skyAt(h);
      day.style.setProperty('--sky', 'rgb(' + s.c.map(Math.round).join(',') + ')');
      day.style.setProperty('--sky-ink', s.dark ? '#f3f4ef' : '#24272b');
      day.classList.toggle('is-night', !!s.dark);
      var a = arc(h);
      sun.style.left = a.x + '%'; sun.style.top = a.y + '%';
      day.classList.toggle('moon', a.night);
      if (window.__kalHeader) window.__kalHeader();
    }
    apply(hours[0]);
    if (!motion) return;
    day.classList.add('is-pinned');
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var tw = G.to(track, { x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: day, start: 'top top', end: function () { return '+=' + dist(); }, pin: $('.day__sticky', day), scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: function (st) {
          // hour = the panel currently nearest the viewport's left third
          var x = st.progress * dist() + window.innerWidth * 0.33, best = 0;
          for (var i = 0; i < panels.length; i++) if (panels[i].offsetLeft <= x) best = i;
          var p0 = panels[best], p1 = panels[best + 1];
          var f = p1 ? clamp((x - p0.offsetLeft) / (p1.offsetLeft - p0.offsetLeft), 0, 1) : 0;
          apply(p1 ? lerp(hours[best], hours[best + 1], f) : hours[best]);
        } } });
    // images drift inside panels
    panels.forEach(function (p) {
      var pic = $('.pic img', p); if (!pic) return;
      G.fromTo(pic, { scale: 1.18, xPercent: 6 }, { scale: 1.02, xPercent: -6, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
    });
  });

  /* ------------------------------------------------ spaces hover image */
  safe('spaces', function () {
    var list = $('[data-space-list]'); if (!list || !fine || !G) return;
    var fl = $('.space-float'), items = $$('.space-float__item', fl);
    var qx = G.quickTo(fl, 'x', { duration: 0.6, ease: 'power3' }), qy = G.quickTo(fl, 'y', { duration: 0.6, ease: 'power3' });
    var qr = G.quickTo(fl, 'rotation', { duration: 0.8, ease: 'power3' });
    var lastX = 0;
    list.addEventListener('pointermove', function (e) { qx(e.clientX); qy(e.clientY); qr(clamp((e.clientX - lastX) * 0.4, -8, 8)); lastX = e.clientX; });
    $$('.space-row', list).forEach(function (row) {
      row.addEventListener('pointerenter', function () {
        var k = row.getAttribute('data-space-img');
        items.forEach(function (it) { var on = it.getAttribute('data-space') === k; it.classList.toggle('is-on', on); it.style.zIndex = on ? 2 : 1; });
        G.to(fl, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
      });
    });
    list.addEventListener('pointerleave', function () { G.to(fl, { opacity: 0, scale: 0.9, duration: 0.4 }); items.forEach(function (it) { it.classList.remove('is-on'); }); });
    G.set(fl, { xPercent: -50, yPercent: -50, scale: 0.9, x: innerWidth / 2, y: innerHeight / 2 });
    fl.style.transform = '';
  });

  /* --------------------------------------------------------- rain */
  safe('rain', function () {
    var cv = $('[data-rain]'); if (!cv || reduce) return;
    var ctx = cv.getContext('2d'), drops = [], rings = [], w = 0, h = 0, dpr = Math.min(devicePixelRatio || 1, 2), on = false, raf = 0;
    function size() { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function drop() { return { x: Math.random() * w * 1.2 - w * 0.1, y: Math.random() * -h, v: 9 + Math.random() * 9, l: 14 + Math.random() * 22, floor: h * (0.55 + Math.random() * 0.45) }; }
    function init() { size(); drops = []; var n = Math.round(w * h / 9000); for (var i = 0; i < n; i++) { var d = drop(); d.y = Math.random() * h; drops.push(d); } }
    function frame() {
      raf = 0; if (!on) return;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(220,232,255,.32)'; ctx.lineWidth = 1; ctx.beginPath();
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i]; d.y += d.v; d.x += d.v * 0.12;
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.12, d.y - d.l);
        if (d.y > d.floor) { if (Math.random() < 0.6) rings.push({ x: d.x, y: d.y, r: 1, a: 0.5 }); drops[i] = drop(); }
      }
      ctx.stroke();
      for (var j = rings.length - 1; j >= 0; j--) {
        var r = rings[j]; r.r += 0.9; r.a -= 0.018;
        if (r.a <= 0) { rings.splice(j, 1); continue; }
        ctx.strokeStyle = 'rgba(220,232,255,' + r.a + ')'; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * 2.2, r.r * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    }
    init(); window.addEventListener('resize', init);
    new IntersectionObserver(function (en) { on = en[0].isIntersecting; if (on && !raf) raf = requestAnimationFrame(frame); }).observe(cv);
  });

  /* ---------------------------------------------------- drag scrollers */
  safe('drag', function () {
    $$('[data-drag]').forEach(function (el) {
      var down = false, sx = 0, sl = 0, v = 0, lx = 0, raf = 0, moved = false;
      el.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse') return;
        down = true; moved = false; sx = lx = e.clientX; sl = el.scrollLeft; v = 0; cancelAnimationFrame(raf); el.classList.add('is-dragging');
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true;
        el.scrollLeft = sl - dx; v = e.clientX - lx; lx = e.clientX;
      });
      window.addEventListener('pointerup', function () {
        if (!down) return; down = false; el.classList.remove('is-dragging');
        (function glide() { v *= 0.94; el.scrollLeft -= v; if (Math.abs(v) > 0.4) raf = requestAnimationFrame(glide); })();
      });
      el.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
      el.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { el.scrollBy({ left: 360, behavior: 'smooth' }); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { el.scrollBy({ left: -360, behavior: 'smooth' }); e.preventDefault(); }
      });
    });
  });

  /* ---------------------------------------------------------- marquee */
  safe('marquee', function () {
    var rows = $$('[data-marquee]'); if (!rows.length) return;
    var items = rows.map(function (m) {
      var row = $('.marquee__row', m);
      row.innerHTML += row.innerHTML; // seamless loop
      $$('img', row).forEach(function (i) { i.loading = 'lazy'; });
      return { row: row, dir: parseFloat(m.getAttribute('data-marquee')) || 1, x: 0, half: 0 };
    });
    function measure() { items.forEach(function (it) { it.half = it.row.scrollWidth / 2; }); }
    measure(); window.addEventListener('resize', measure); window.addEventListener('load', measure);
    if (reduce) return;
    var boost = 0, lastY = window.scrollY, visible = true;
    new IntersectionObserver(function (en) { visible = en.some(function (e) { return e.isIntersecting; }); }).observe(rows[0].parentNode);
    function frame() {
      var y = window.scrollY, dy = y - lastY; lastY = y;
      boost = lerp(boost, clamp(dy * 0.6, -30, 30), 0.1);
      if (visible) items.forEach(function (it) {
        it.x -= (0.5 + boost) * it.dir;
        if (it.half) { if (it.x <= -it.half) it.x += it.half; if (it.x > 0) it.x -= it.half; }
        it.row.style.transform = 'translate3d(' + it.x.toFixed(2) + 'px,0,0)';
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  /* ------------------------------------------------- compare slider */
  safe('compare', function () {
    $$('[data-compare]').forEach(function (c) {
      var r = $('.compare__range', c);
      function set(v) { c.style.setProperty('--pos', v + '%'); }
      r.addEventListener('input', function () { set(r.value); });
      if (motion) {
        var o = { v: 50 };
        ST.create({ trigger: c, start: 'top 70%', once: true, onEnter: function () {
          G.to(o, { v: 82, duration: 1.1, ease: 'power3.inOut', yoyo: true, repeat: 1, onUpdate: function () { set(o.v); r.value = o.v; }, onComplete: function () { G.to(o, { v: 50, duration: 0.8, ease: 'power3.out', onUpdate: function () { set(o.v); r.value = o.v; } }); } });
        } });
      }
    });
  });

  /* ------------------------------------------------------- lightbox */
  safe('lightbox', function () {
    var dlg = $('[data-lightbox-dialog]'); if (!dlg) return;
    var img = $('[data-lb-img]', dlg), cap = $('[data-lb-cap]', dlg), list = [], idx = 0;
    function show(i) {
      idx = (i + list.length) % list.length; var b = list[idx];
      img.src = b.getAttribute('data-full'); img.alt = b.getAttribute('data-cap') || ($('img', b) || {}).alt || '';
      cap.textContent = b.getAttribute('data-cap') || '';
      if (motion) G.fromTo(img, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-lightbox]'); if (!b) return;
      var g = b.getAttribute('data-lightbox');
      list = $$('[data-lightbox="' + g + '"]').filter(function (x) { var li = x.closest('.masonry__item'); return !li || !li.classList.contains('is-out'); });
      if (!dlg.open) { dlg.showModal(); if (lenis) lenis.stop(); }
      show(list.indexOf(b));
    });
    $('[data-lb-close]', dlg).addEventListener('click', function () { dlg.close(); });
    $('[data-lb-prev]', dlg).addEventListener('click', function () { show(idx - 1); });
    $('[data-lb-next]', dlg).addEventListener('click', function () { show(idx + 1); });
    dlg.addEventListener('close', function () { if (lenis) lenis.start(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.classList.contains('lightbox__stage')) dlg.close(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
    var sx = 0;
    dlg.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); });
  });

  /* -------------------------------------------------- gallery filter */
  safe('filters', function () {
    var box = $('[data-filters]'); if (!box) return;
    var items = $$('.masonry__item');
    if (motion) G.from(items, { y: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: { each: 0.04, from: 'start' }, delay: 0.4 });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]'); if (!b) return;
      var f = b.getAttribute('data-filter');
      $$('[data-filter]', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var show = items.filter(function (it) { return f === 'all' || it.getAttribute('data-cat') === f; });
      function swap() {
        items.forEach(function (it) { it.classList.toggle('is-out', show.indexOf(it) < 0); });
        if (motion) { G.fromTo(show, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'expo.out', stagger: 0.03 }); ST.refresh(); }
      }
      if (motion) G.to(items, { autoAlpha: 0, y: -10, duration: 0.25, ease: 'power2.in', onComplete: swap }); else swap();
    });
  });

  /* ---------------------------------------------- dates: no past days */
  safe('dates', function () {
    var d = new Date(), iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    $$('[data-min-today]').forEach(function (i) { i.min = iso; });
  });

  /* ---------------------------------------------- quick form (home) */
  safe('quick', function () {
    var f = $('[data-quick]'); if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = new URLSearchParams();
      var fd = new FormData(f);
      fd.forEach(function (v, k) { if (v) p.set(k, v); });
      var a = document.createElement('a'); a.href = 'plan.html?' + p.toString() + '#inquire';
      document.body.appendChild(a); a.click(); a.remove();
    });
  });

  /* ------------------------------------------------ inquiry builder */
  safe('inquiry', function () {
    var form = $('[data-inquiry]'); if (!form) return;
    var out = $('[data-msg]'), copyBtn = $('[data-copy]'), hint = $('[data-hint]');
    var KEY = 'kal-inquiry';
    function fmtDate(v) {
      if (!v) return '';
      var d = new Date(v + 'T12:00:00');
      try { return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return v; }
    }
    function val(n) { var el = form.elements[n]; if (!el) return ''; if (el.length !== undefined && !el.tagName) { for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value; return ''; } return (el.value || '').trim(); }
    function extras() { return $$('input[name="extras"]:checked', form).map(function (i) { return i.value.charAt(0).toLowerCase() + i.value.slice(1); }); }
    function message() {
      var L = ['Hi Kalinaw! I’d like to ask about rates and available dates.', ''];
      var o = val('occasion'), s = val('stay'), d1 = fmtDate(val('date')), d2 = fmtDate(val('date2')), g = val('guests'), nm = val('name'), nt = val('notes'), ex = extras();
      L.push('Occasion: ' + (o || 'not decided yet'));
      L.push('Stay: ' + (s || 'not sure yet'));
      L.push('Preferred date: ' + (d1 || 'flexible') + (d2 ? ' (backup: ' + d2 + ')' : ''));
      L.push('Guests: ' + (g ? g + ' pax' : 'not final yet'));
      if (ex.length) L.push('Also asking about: ' + ex.join(', '));
      if (nt) { L.push(''); L.push(nt); }
      L.push(''); L.push('Thank you!' + (nm ? '\n' + nm : ''));
      return L.join('\n');
    }
    function save() {
      var data = {}; new FormData(form).forEach(function (v, k) { if (k === 'extras') { (data.extras = data.extras || []).push(v); } else data[k] = v; });
      lstore(KEY, JSON.stringify(data));
    }
    function restore() {
      var raw = lstore(KEY), data = null; try { data = raw ? JSON.parse(raw) : null; } catch (e) {}
      var q = new URLSearchParams(location.search);
      data = data || {};
      ['occasion', 'date', 'guests'].forEach(function (k) { if (q.get(k)) data[k] = q.get(k); });
      Object.keys(data).forEach(function (k) {
        if (k === 'extras') { $$('input[name="extras"]', form).forEach(function (i) { i.checked = data.extras.indexOf(i.value) > -1; }); return; }
        var el = form.elements[k]; if (!el) return;
        if (el.length !== undefined && !el.tagName) { for (var i = 0; i < el.length; i++) el[i].checked = el[i].value === data[k]; }
        else el.value = data[k];
      });
    }
    function update() {
      var m = message(); out.textContent = m;
      var enc = encodeURIComponent(m);
      var sms = $('[data-send="sms"]'), mail = $('[data-send="email"]'), msg = $('[data-send="messenger"]');
      if (sms) sms.href = 'sms:' + (CFG.phone || '+639188008188') + '?&body=' + enc;
      if (mail) mail.href = 'mailto:' + (CFG.email || 'kalinawprivateresort@gmail.com') + '?subject=' + encodeURIComponent('Inquiry: ' + (val('occasion') || 'Kalinaw booking') + (val('date') ? ' on ' + fmtDate(val('date')) : '')) + '&body=' + enc;
      if (msg) msg.href = (CFG.messenger || 'https://m.me/kalinawprivateresort') + '?text=' + enc;
      save();
    }
    function copy(done) {
      var m = message();
      var ok = function () { copyBtn.classList.add('is-done'); $('span', copyBtn).textContent = 'Copied'; setTimeout(function () { copyBtn.classList.remove('is-done'); $('span', copyBtn).textContent = 'Copy message'; }, 2200); if (done) done(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m).then(ok, function () { fallback(); });
      else fallback();
      function fallback() { var t = document.createElement('textarea'); t.value = m; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove(); ok(); }
    }
    restore(); update();
    form.addEventListener('input', update); form.addEventListener('change', update);
    copyBtn.addEventListener('click', function () { copy(); });
    $$('[data-send="viber"], [data-send="messenger"]').forEach(function (a) {
      a.addEventListener('click', function () { copy(); if (hint && a.getAttribute('data-send') === 'messenger') hint.textContent = 'Messenger opens with your message. If it’s empty, paste it in: it’s already copied.'; });
    });
    if (motion) {
      var card = $('[data-ticket]');
      form.addEventListener('change', function () { G.fromTo(card, { y: -4 }, { y: 0, duration: 0.6, ease: 'elastic.out(1,.4)' }); });
    }
  });

  /* ------------------------------------------------------- refresh */
  safe('refresh', function () {
    if (!ST) return;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
    window.addEventListener('load', function () { ST.refresh(); });
  });
})();
