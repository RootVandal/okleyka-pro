/* OKLEYKA.PRO · SPB — логика страницы. Контент лежит в data.js */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const IMG = (n) => `assets/img/${n}.webp`;
  const NBSP = ' ';
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) + NBSP + '₽';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- шестигранные лампы ---------- */
  function hexGrid(svg, cols, rows, R, lit) {
    const w = R * 1.5, h = Math.sqrt(3) * R;
    svg.setAttribute('viewBox', `0 0 ${(cols * w + R / 2).toFixed(0)} ${(rows * h + h / 2).toFixed(0)}`);
    let out = '';
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const cx = R + c * w, cy = h / 2 + r * h + (c % 2 ? h / 2 : 0);
        let pts = '';
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 3 * i;
          pts += (cx + R * Math.cos(a)).toFixed(1) + ',' + (cy + R * Math.sin(a)).toFixed(1) + ' ';
        }
        const on = lit ? lit(c, r) : -1;
        out += `<polygon class="hx${on >= 0 ? ' on' : ''}"${on >= 0 ? ` style="--d:${on}"` : ''} points="${pts.trim()}"/>`;
      }
    }
    svg.innerHTML = out;
  }
  const hex = $('#hex');
  if (hex) {
    // лампы висят «кассетами», как в боксе: блоки 4×2 с проходами между ними
    hexGrid(hex, 34, 12, 44, (c, r) => {
      const bc = Math.floor(c / 5), br = Math.floor(r / 3);
      if (c % 5 === 4 || r % 3 === 2) return -1;
      return ((bc * 3 + br * 5) % 7) * 130;
    });
  }
  const mapHex = $('.map__hex');
  if (mapHex) { mapHex.removeAttribute('viewBox'); hexGrid(mapHex, 14, 8, 30, null); }

  /* ---------- шапка, меню, док ---------- */
  const top = $('#top'), dock = $('.dock'), burger = $('.burger'), menu = $('#menu');
  const onScroll = () => {
    top.classList.toggle('is-stuck', scrollY > 16);
    dock.classList.toggle('is-on', scrollY > innerHeight * 0.55);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  function setMenu(open) {
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) top.classList.add('is-stuck'); else onScroll();
  }
  burger.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });

  /* ---------- видео в hero ---------- */
  const video = $('#heroVideo'), pauseBtn = $('#heroPause');
  if (video) {
    const setIcon = () => {
      const playing = !video.paused;
      pauseBtn.innerHTML = `<svg><use href="#i-${playing ? 'pause' : 'play'}"/></svg>`;
      pauseBtn.setAttribute('aria-label', playing ? 'Поставить видео на паузу' : 'Включить видео');
    };
    let userPaused = reduce;
    pauseBtn.addEventListener('click', () => {
      if (video.paused) { userPaused = false; video.play().catch(() => {}); } else { userPaused = true; video.pause(); }
    });
    video.addEventListener('play', setIcon); video.addEventListener('pause', setIcon);
    // звук включается только по кнопке: фильм начинается сначала
    const soundBtn = $('#heroSound');
    soundBtn.addEventListener('click', () => {
      const on = video.muted;
      video.muted = !on;
      soundBtn.setAttribute('aria-pressed', String(on));
      soundBtn.textContent = on ? 'Выключить звук' : 'Смотреть со звуком';
      if (on) { video.currentTime = 0; userPaused = false; video.play().catch(() => {}); }
    });
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !userPaused) video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.25 }).observe(video);
    setIcon();
  }

  /* ---------- веер плёнок ---------- */
  const fan = $('#fan'), caseEl = $('#case'), worksSec = $('#works');
  const N = WORKS.length, STEP = N <= 5 ? 15 : 10.6; // мало образцов — раскрываем веер шире
  let cur = Math.max(0, WORKS.findIndex((w) => w.id === WORKS_DEFAULT));
  let calcRef = null;

  caseEl.innerHTML = `
    <div class="case__media">
      <div class="case__photo"><img alt="" width="800" height="600"><img alt="" width="800" height="600"></div>
    </div>
    <div class="case__thumbs"></div>
    <div class="case__meta">
      <p class="case__film"><i></i><b></b><span></span></p>
      <h3></h3>
      <p class="case__text"></p>
      <ul class="tags"></ul>
      <a class="btn btn--light" href="#calc" data-like>Хочу так же <svg><use href="#i-arrow"/></svg></a>
    </div>`;
  const photoImgs = $$('.case__photo img', caseEl);
  let photoOn = 0, photoReq = 0;
  function showPhoto(src, alt) {
    const req = ++photoReq;
    const next = photoImgs[1 - photoOn], prev = photoImgs[photoOn];
    const swap = () => {
      if (req !== photoReq) return;
      next.alt = alt; prev.alt = '';
      next.classList.add('is-on'); prev.classList.remove('is-on');
      photoOn = 1 - photoOn;
    };
    next.onload = swap; next.onerror = swap;
    next.src = src;
    if (next.complete && next.naturalWidth) swap();
  }

  function selectWork(i, focus) {
    cur = (i + N) % N;
    const w = WORKS[cur];
    $$('.sw', fan).forEach((b, k) => {
      const on = k === cur;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
      b.style.zIndex = on ? 40 : k + 1;
      if (on && focus) b.focus({ preventScroll: true });
      if (on && fan.scrollWidth > fan.clientWidth + 4) {
        fan.scrollTo({ left: b.offsetLeft - fan.clientWidth / 2 + b.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
      }
    });
    worksSec.style.setProperty('--film', w.color);
    showPhoto(IMG(w.id + '-1'), `${w.car} — ${w.film}`);
    $('.case__film b', caseEl).textContent = w.film;
    $('.case__film span', caseEl).textContent = w.kind;
    $('h3', caseEl).textContent = w.car;
    $('.case__text', caseEl).textContent = w.text;
    $('.tags', caseEl).innerHTML = w.tags.map((t) => `<li>${esc(t)}</li>`).join('');
    $('.case__thumbs', caseEl).style.setProperty('--n', w.n);
    $('.case__thumbs', caseEl).innerHTML = Array.from({ length: w.n }, (_, k) =>
      `<button type="button" aria-pressed="${k === 0}" aria-label="${esc(w.car)}, фото ${k + 1} из ${w.n}" data-k="${k + 1}"><img src="${IMG(w.id + '-' + (k + 1))}" alt="" loading="lazy" width="200" height="150"></button>`).join('');
  }

  WORKS.forEach((w, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sw';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', `${w.car} — ${w.film}`);
    b.dataset.finish = w.finish;
    if (w.dark) b.dataset.dark = '';
    b.style.setProperty('--c', w.color);
    b.style.setProperty('--a', ((i - (N - 1) / 2) * STEP).toFixed(2) + 'deg');
    b.innerHTML = `<span class="sw__code">${esc(w.code)}</span><span class="sw__rivet"></span>`;
    b.addEventListener('click', () => selectWork(i, false));
    fan.append(b);
  });
  fan.addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault(); selectWork(cur + d, true);
  });
  caseEl.addEventListener('click', (e) => {
    const t = e.target.closest('.case__thumbs button');
    if (t) {
      const w = WORKS[cur];
      $$('.case__thumbs button', caseEl).forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      showPhoto(IMG(w.id + '-' + t.dataset.k), `${w.car} — ${w.film}, фото ${t.dataset.k}`);
    }
    if (e.target.closest('[data-like]')) {
      const w = WORKS[cur];
      calcRef = `${w.car}, ${w.film}`;
      updateCalc();
    }
  });
  selectWork(cur, false);

  /* ---------- лента работ ---------- */
  $('#more').innerHTML = MORE.map((m) =>
    `<figure><img src="${IMG(m.img)}" alt="${esc(m.car)}: ${esc(m.cap)}" loading="lazy" width="800" height="600"><figcaption><b>${esc(m.car)}</b>${esc(m.cap)}</figcaption></figure>`).join('');

  /* ---------- услуги ---------- */
  const svcWrap = $('#svc'), svcPhoto = $('#svcPhoto');
  let svcImg = SERVICES[0].img, svcTimer;
  function swapSvc(name) {
    if (name === svcImg) return;
    svcImg = name;
    svcPhoto.classList.add('is-swap');
    clearTimeout(svcTimer);
    svcTimer = setTimeout(() => {
      svcPhoto.onload = () => svcPhoto.classList.remove('is-swap');
      svcPhoto.src = IMG(name);
      if (svcPhoto.complete) svcPhoto.classList.remove('is-swap');
    }, reduce ? 0 : 180);
  }
  SERVICES.forEach((s, i) => {
    const d = document.createElement('details');
    d.className = 'svc'; d.open = i === 0;
    d.innerHTML = `
      <summary><span class="svc__name">${esc(s.name)}</span><span class="svc__from">${esc(s.from)}</span><span class="svc__plus" aria-hidden="true"></span></summary>
      <div class="svc__body">
        <img src="${IMG(s.img)}" alt="${esc(s.name)}" loading="lazy" width="800" height="450">
        <p class="svc__lead">${esc(s.lead)}</p>
        <ul class="svc__rows">${s.rows.map((r) => `<li><span>${esc(r[0])}</span><span>${esc(r[1])}</span></li>`).join('')}</ul>
        <p class="svc__note">${esc(s.note)}</p>
        <button class="btn btn--ghost btn--sm" type="button" data-add="${s.id}">Добавить в расчёт <svg><use href="#i-arrow"/></svg></button>
      </div>`;
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      $$('.svc', svcWrap).forEach((o) => { if (o !== d) o.open = false; });
      swapSvc(s.img);
    });
    const sum = $('summary', d);
    sum.addEventListener('mouseenter', () => swapSvc(s.img));
    sum.addEventListener('focus', () => swapSvc(s.img));
    svcWrap.append(d);
  });
  svcWrap.addEventListener('mouseleave', () => {
    const open = $$('.svc', svcWrap).findIndex((d) => d.open);
    if (open >= 0) swapSvc(SERVICES[open].img);
  });
  svcWrap.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    const s = SERVICES.find((x) => x.id === b.dataset.add);
    s.calc.forEach((id) => pick(id, true));
    updateCalc();
    $('#calc').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    toast('Добавили в заказ-наряд');
  });

  /* ---------- заказ-наряд ---------- */
  const groupsEl = $('#calcGroups'), classEl = $('#calcClass');
  const sel = new Set();
  let cls = 1;
  const fullId = (g, it) => (g.key ? g.key + ':' + it.id : it.id);
  const ITEMS = new Map();
  CALC.forEach((g) => g.items.forEach((it) => ITEMS.set(fullId(g, it), { g, it })));

  function pick(id, on) {
    const rec = ITEMS.get(id);
    if (!rec) return;
    if (on) {
      if (rec.g.type === 'radio') rec.g.items.forEach((o) => sel.delete(fullId(rec.g, o)));
      sel.add(id);
    } else sel.delete(id);
  }
  function forcedIds() {
    const f = new Set();
    CALC.forEach((g) => {
      if (g.requires && g.items.some((it) => sel.has(fullId(g, it)))) f.add(g.requires);
    });
    return f;
  }
  const priceText = (it) => {
    const p = it.p[cls];
    if (p == null) return 'по запросу';
    return (it.exact ? '' : 'от' + NBSP) + fmt(p);
  };

  classEl.innerHTML = CAR_CLASSES.map((c, i) =>
    `<label><input type="radio" name="cls" value="${i}"${i === cls ? ' checked' : ''}><span>${esc(c)}</span></label>`).join('');
  classEl.addEventListener('change', (e) => { cls = +e.target.value; updateCalc(); });

  groupsEl.innerHTML = CALC.map((g) => `
    <div class="grp">
      <p class="grp__title">${esc(g.title)}</p>
      ${g.hint ? `<p class="grp__hint">${esc(g.hint)}</p>` : ''}
      ${g.items.map((it) => `
        <label class="opt">
          <input type="checkbox" data-id="${fullId(g, it)}">
          <span class="opt__box" aria-hidden="true"></span>
          <span class="opt__name">${esc(it.name)}</span>
          <span class="opt__price"></span>
        </label>`).join('')}
    </div>`).join('');
  groupsEl.addEventListener('change', (e) => {
    const inp = e.target.closest('input[data-id]');
    if (!inp) return;
    pick(inp.dataset.id, inp.checked);
    updateCalc();
  });

  // сумма меняется плавно, а не скачком
  let totalShown = 0, totalRaf = 0;
  function setTotal(has, total) {
    const el = $('#sheetTotal');
    cancelAnimationFrame(totalRaf);
    const draw = (v) => { el.textContent = (v ? 'от' + NBSP : '') + fmt(v); };
    if (has && !total) { el.textContent = 'по запросу'; totalShown = 0; return; }
    const from = totalShown, t0 = performance.now(), dur = 480;
    if (reduce || from === total) { totalShown = total; draw(total); return; }
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      totalShown = k === 1 ? total : Math.round((from + (total - from) * e) / 500) * 500;
      draw(totalShown);
      if (k < 1) totalRaf = requestAnimationFrame(step);
    };
    totalRaf = requestAnimationFrame(step);
  }

  function updateCalc() {
    const forced = forcedIds();
    forced.forEach((id) => sel.add(id));
    $$('input[data-id]', groupsEl).forEach((inp) => {
      const id = inp.dataset.id, rec = ITEMS.get(id);
      inp.checked = sel.has(id);
      inp.disabled = forced.has(id);
      $('.opt__price', inp.closest('.opt')).textContent = priceText(rec.it);
    });
    const lines = [];
    let total = 0, ask = false;
    ITEMS.forEach((rec, id) => {
      if (!sel.has(id)) return;
      const p = rec.it.p[cls];
      if (p == null) ask = true; else total += p;
      lines.push({ title: rec.g.title, name: rec.it.name, price: priceText(rec.it), forced: forced.has(id) });
    });
    $('#sheetLines').innerHTML = lines.map((l) =>
      `<li><span>${esc(l.name)}<small>${esc(l.title)}${l.forced ? ', обязательна перед керамикой' : ''}</small></span><span>${l.price}</span></li>`).join('');
    $('#sheetEmpty').hidden = lines.length > 0;
    setTotal(lines.length > 0, total);
    $('#sheetNote').textContent = (ask && total ? 'Плюс позиции «по запросу» — посчитаем отдельно. ' : '') + 'Цены — ориентир, не публичная оферта.';
    $('#sheetClass').textContent = CAR_CLASSES[cls];
    $('#sheetRefRow').hidden = !calcRef;
    $('#sheetRef').textContent = calcRef || '';
    return { lines, total, ask };
  }
  $('#sheetDate').textContent = new Date().toLocaleDateString('ru-RU');
  updateCalc();

  function orderText() {
    const { lines, total } = updateCalc();
    const out = ['Здравствуйте! Хочу записаться в OKLEYKA.PRO в Кудрово.', 'Кузов: ' + CAR_CLASSES[cls].toLowerCase()];
    if (calcRef) out.push('Хочу как на сайте: ' + calcRef);
    lines.forEach((l) => out.push(`— ${l.title}: ${l.name} — ${l.price}`));
    if (lines.length && total) out.push('Ориентир с сайта: от ' + fmt(total));
    out.push('Марка и модель: ');
    return out.join('\n').replace(/ /g, ' ');
  }
  function copyText(text) {
    let ok = false;
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.append(ta); ta.select();
      ok = document.execCommand('copy'); ta.remove();
    } catch (_) { /* ниже запасной путь */ }
    if (!ok && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    return ok || !!navigator.clipboard;
  }
  $$('[data-send]').forEach((b) => b.addEventListener('click', () => {
    const copied = copyText(orderText());
    toast(copied ? 'Расчёт скопирован — вставьте его в чат' : 'Открываем чат');
    window.open(b.dataset.send === 'telegram' ? SITE.telegram : SITE.whatsapp, '_blank', 'noopener');
  }));

  /* ---------- шаги ---------- */
  const steps = $('#steps');
  steps.innerHTML = STEPS.map((s) => `
    <li><img src="${IMG(s.img)}" alt="" loading="lazy" width="800" height="600">
      <div class="steps__n" aria-hidden="true"></div>
      <h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></li>`).join('');
  $$('[data-track]').forEach((b) => b.addEventListener('click', () => {
    const card = steps.firstElementChild.getBoundingClientRect().width + 20;
    steps.scrollBy({ left: card * +b.dataset.track, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- ролики центра: файл грузится только по клику ---------- */
  const vids = $('#videos');
  vids.innerHTML = VIDEOS.map((v) => `
    <figure class="vid">
      <button class="vid__btn" type="button" data-src="${v.src}" aria-label="Смотреть видео: ${esc(v.t)}">
        <img src="${IMG(v.src)}" alt="" loading="lazy" width="480" height="854">
        <span class="vid__play"><svg><use href="#i-play"/></svg></span>
        <span class="vid__cap"><small>${esc(v.d)}</small>${esc(v.t)}</span>
      </button>
    </figure>`).join('');
  vids.addEventListener('click', (e) => {
    const b = e.target.closest('.vid__btn');
    if (!b) return;
    const v = document.createElement('video');
    v.src = `assets/video/${b.dataset.src}.mp4`;
    v.poster = IMG(b.dataset.src);
    v.controls = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('aria-label', b.getAttribute('aria-label').replace('Смотреть видео: ', ''));
    // играет только один ролик: остальные и фильм в шапке ставим на паузу
    v.addEventListener('play', () => $$('video').forEach((o) => { if (o !== v) o.pause(); }));
    b.replaceWith(v);
    v.play().catch(() => {});
    v.focus({ preventScroll: true });
  });

  /* ---------- вопросы ---------- */
  $('#faqList').innerHTML = FAQ.map((q) =>
    `<details class="qa"><summary>${esc(q[0])}<span class="svc__plus" aria-hidden="true"></span></summary><p>${esc(q[1])}</p></details>`).join('');

  /* ---------- карта по клику ---------- */
  const mapBtn = $('#mapLoad');
  mapBtn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = 'https://yandex.ru/map-widget/v1/?ll=30.520941%2C59.898744&z=16&pt=30.520941%2C59.898744%2Cpm2orm';
    f.title = 'Карта: OKLEYKA.PRO, Автополе Кудрово, пр. Строителей, 25, стр. 2';
    f.loading = 'lazy'; f.allowFullscreen = true;
    $('#map').append(f);
    $('.map__ph').remove();
  });

  /* ---------- тост ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 3200);
  }

  /* ---------- появление при прокрутке ---------- */
  const rv = $$('.sec-head, .works__grid, .more, .services__grid, .calc__grid, .steps, .videos, .trust__photo, .facts, .reviews, .faq__list, .contacts__title, .contacts__grid');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((ens) => ens.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rv.forEach((el) => { el.classList.add('rv'); io.observe(el); });
  }
})();
