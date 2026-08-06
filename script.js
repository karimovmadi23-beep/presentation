/* ---------------------------------------------------------
   Движение презентации на Framer Motion (vanilla DOM API).
   Бандл собран из framer-motion/dom → assets/vendor/.
   --------------------------------------------------------- */

import {
  animate, scroll, inView, stagger, hover, press, spring
} from './assets/vendor/framer-motion.dom.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = [...document.querySelectorAll('.s')];
const dots     = [...document.querySelectorAll('.dots__i')];
const menuLinks= [...document.querySelectorAll('.menu-panel__list a')];
const counter  = document.querySelector('.counter__cur');
const ringFill = document.querySelector('.ring-fill');
const pctEl    = document.querySelector('.progress-pct');
const RING = 91.1;

let currentIndex = 0;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/* --- если движение выключено в системе, просто всё показываем --- */
if (reduced) document.documentElement.classList.add('js-off');

/* =========================================================
   1. Заголовки — посимвольный выход словами
   ========================================================= */

function splitHeading(el) {
  if (el.dataset.splitDone) return [];
  const html = el.innerHTML;
  // <br> сохраняем как разрыв строки между группами слов
  const lines = html.split(/<br\s*\/?>/i);
  el.innerHTML = '';
  const words = [];

  const decoder = document.createElement('div');

  lines.forEach((line, li) => {
    // через textContent, иначе &nbsp; и прочие сущности попадут в текст буквально
    decoder.innerHTML = line;
    const plain = decoder.textContent;
    // неразрывный пробел не должен рвать строку — считаем его частью слова
    plain.split(/([ \t\n]+)/).forEach(chunk => {
      if (!chunk.trim()) { el.appendChild(document.createTextNode(' ')); return; }
      const outer = document.createElement('span');
      outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top';
      const inner = document.createElement('span');
      inner.style.cssText = 'display:inline-block;will-change:transform,opacity';
      inner.textContent = chunk;
      outer.appendChild(inner);
      el.appendChild(outer);
      words.push(inner);
    });
    if (li < lines.length - 1) el.appendChild(document.createElement('br'));
  });

  el.dataset.splitDone = '1';
  return words;
}

/* =========================================================
   2. Появление секции: заголовок + содержимое
   ========================================================= */

const REVEAL = [
  '.eyebrow', '.lead', '.m', '.note', '.list li', '.col', '.row',
  '.step', '.term p', '.work__i', '.thumb', '.stat', '.btn-solid',
  '.place', '.cover__meta', '.ch', '.pills', '.pill'
].join(',');

function enter(section) {
  const heading = section.querySelector('[data-split]');
  if (heading) {
    const words = splitHeading(heading);
    if (words.length) {
      animate(
        words,
        { y: ['110%', '0%'], opacity: [0, 1] },
        { delay: stagger(0.035), duration: 0.85, ease: [0.16, 1, 0.3, 1] }
      );
    }
  }

  const items = [...section.querySelectorAll(REVEAL)]
    .filter(el => !el.closest('[data-split]'));

  if (items.length) {
    animate(
      items,
      { y: [18, 0], opacity: [0, 1] },
      { delay: stagger(0.05, { startDelay: heading ? 0.18 : 0 }), duration: 0.7, ease: [0.16, 1, 0.3, 1] }
    );
  }
}

function leave(section) {
  const items = [...section.querySelectorAll('.r')];
  if (items.length) animate(items, { opacity: 0.001 }, { duration: 0.3 });
}

sections.forEach(section => {
  inView(section, () => {
    enter(section);
    return () => leave(section);
  }, { amount: 0.25 });
});

/* --- карточка-экран: мягкий подъём при входе --- */
sections.forEach(section => {
  const panel = section.querySelector('.panel');
  if (!panel) return;
  inView(section, () => {
    animate(panel,
      { opacity: [0.4, 1], scale: [0.985, 1] },
      { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
    );
  }, { amount: 0.2 });
});

/* =========================================================
   3. Параллакс фотоподложек — привязан к прокрутке
   ========================================================= */

document.querySelectorAll('[data-parallax] img').forEach(img => {
  img.style.willChange = 'transform';
  img.style.transform = 'scale(1.12)';
  scroll(
    animate(img, { y: ['-6%', '6%'] }, { ease: 'linear' }),
    { target: img.closest('.s'), offset: ['start end', 'end start'] }
  );
});

/* --- ленты кадров: лёгкий сдвиг по мере прохода экрана --- */
document.querySelectorAll('.s--work .work').forEach(strip => {
  scroll(
    animate(strip, { x: [24, -24] }, { ease: 'linear' }),
    { target: strip.closest('.s'), offset: ['start end', 'end start'] }
  );
});

/* =========================================================
   4. Прогресс показа — кольцо и проценты от прокрутки
   ========================================================= */

scroll(progress => {
  if (ringFill) ringFill.style.strokeDashoffset = String(RING * (1 - progress));
  if (pctEl) pctEl.textContent = String(Math.round(progress * 100));
});

/* =========================================================
   5. Текущая секция: счётчик, точки, подсветка в меню
   ========================================================= */

const currentObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    // ролики крутим только на видимом экране
    entry.target.querySelectorAll('video').forEach(v => {
      if (entry.isIntersecting) { const p = v.play(); if (p) p.catch(() => {}); }
      else v.pause();
    });

    if (!entry.isIntersecting) return;

    const idx = entry.target.dataset.index;
    currentIndex = sections.indexOf(entry.target);

    if (counter && counter.textContent !== idx) {
      animate(counter, { opacity: [0, 1], y: [6, 0] }, { duration: 0.3 });
      counter.textContent = idx;
    }

    dots.forEach((d, i) => {
      const on = i === currentIndex;
      d.classList.toggle('is-active', on);
      animate(d, { scale: on ? 2.1 : 1 }, { type: spring, stiffness: 420, damping: 26 });
    });

    menuLinks.forEach(a => a.classList.toggle('is-active', a.dataset.i === idx));
  });
}, { threshold: 0.5 });

sections.forEach(s => currentObserver.observe(s));

/* =========================================================
   6. Счётчик в блоке статистики
   ========================================================= */

document.querySelectorAll('[data-count]').forEach(el => {
  const to = Number(el.dataset.count) || 0;
  inView(el, () => {
    animate(0, to, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => { el.textContent = String(Math.round(v)); }
    });
  }, { amount: 1 });
});

/* =========================================================
   7. Микровзаимодействия: наведение и нажатие
   ========================================================= */

const springy = { type: spring, stiffness: 380, damping: 24 };

document.querySelectorAll('.chrome--menu, .chrome--cta, .btn-solid').forEach(el => {
  hover(el, () => {
    animate(el, { scale: 1.04 }, springy);
    return () => animate(el, { scale: 1 }, springy);
  });
  press(el, () => {
    animate(el, { scale: 0.96 }, springy);
    return () => animate(el, { scale: 1.04 }, springy);
  });
});

document.querySelectorAll('.thumb, .work__i').forEach(el => {
  const img = el.querySelector('img, video');
  if (!img) return;
  hover(el, () => {
    animate(img, { scale: 1.06 }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    return () => animate(img, { scale: 1 }, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
  });
});

/* =========================================================
   8. Навигация: «Далее», CTA обложки, меню
   ========================================================= */

function goTo(i) {
  const target = sections[(i + sections.length) % sections.length];
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('nextBtn')?.addEventListener('click', () => goTo(currentIndex + 1));
document.getElementById('coverCta')?.addEventListener('click', () => {
  document.getElementById('s10')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const menuBtn = document.getElementById('menuBtn');
const menuPanel = document.getElementById('menuPanel');
let menuOpen = false;

function setMenu(open) {
  if (open === menuOpen) return;
  menuOpen = open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuPanel.setAttribute('aria-hidden', String(!open));
  menuPanel.classList.toggle('is-open', open);

  animate(menuPanel,
    { opacity: open ? 1 : 0, y: open ? 0 : -10, scale: open ? 1 : 0.97 },
    open ? { type: spring, stiffness: 320, damping: 28 } : { duration: 0.18 }
  );

  if (open) {
    animate([...menuPanel.querySelectorAll('li')],
      { opacity: [0, 1], x: [-8, 0] },
      { delay: stagger(0.018), duration: 0.35, ease: [0.16, 1, 0.3, 1] }
    );
  }
}

menuBtn?.addEventListener('click', e => { e.stopPropagation(); setMenu(!menuOpen); });

menuPanel?.addEventListener('click', e => {
  const link = e.target.closest('a');
  if (!link) return;
  e.preventDefault();
  document.getElementById(link.getAttribute('href').slice(1))
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setMenu(false);
});

document.addEventListener('click', e => {
  if (menuOpen && !menuPanel.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') setMenu(false);
  if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goTo(currentIndex + 1); }
  if (e.key === 'ArrowUp'   || e.key === 'PageUp')   { e.preventDefault(); goTo(currentIndex - 1); }
});
