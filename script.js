(function () {
  'use strict';

  var sections = Array.prototype.slice.call(document.querySelectorAll('.s'));
  var reveals  = Array.prototype.slice.call(document.querySelectorAll('.r'));
  var ringFill = document.querySelector('.ring-fill');
  var pctEl    = document.querySelector('.progress-pct');
  var counter  = document.querySelector('.counter__cur');
  var dots     = Array.prototype.slice.call(document.querySelectorAll('.dots__i'));
  var menuLinks= Array.prototype.slice.call(document.querySelectorAll('.menu-panel__list a'));
  var RING_CIRCUMFERENCE = 91.1;
  var currentIndex = 0;

  /* --- презентация всегда открывается с обложки --- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* --- задержка появления: data-d="2" → 2 шага по 90 мс --- */
  reveals.forEach(function (el) {
    var step = parseFloat(el.getAttribute('data-d')) || 0;
    if (step) el.style.transitionDelay = (step * 90) + 'ms';
  });

  /* --- появление текста при скролле --- */
  var pending = reveals.slice();

  function reveal(el, instant) {
    if (instant) el.style.transitionDelay = '0ms';
    el.classList.add('in');
    var i = pending.indexOf(el);
    if (i > -1) pending.splice(i, 1);
  }

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    reveals.forEach(function (el) { revealObserver.observe(el); });

    /* --- текущая секция: счётчик, точки пагинации, подсветка в меню --- */
    var currentObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        /* --- ролики крутим только на видимом экране --- */
        var vids = entry.target.querySelectorAll('video');
        for (var v = 0; v < vids.length; v++) {
          if (entry.isIntersecting) { var pr = vids[v].play(); if (pr && pr.catch) pr.catch(function () {}); }
          else vids[v].pause();
        }
        if (entry.isIntersecting) {
          entry.target.classList.add('is-live');
          var idx = entry.target.getAttribute('data-index');
          currentIndex = sections.indexOf(entry.target);
          counter.textContent = idx;
          dots.forEach(function (d, i) { d.classList.toggle('is-active', i === currentIndex); });
          menuLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-i') === idx); });
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(function (s) { currentObserver.observe(s); });
  } else {
    reveals.forEach(function (el) { reveal(el, true); });
    sections.forEach(function (s) { s.classList.add('is-live'); });
  }

  /* --- страховка: то, что уже пролистали (быстрый скролл, End, восстановление
         позиции), показываем без задержки — текст не должен остаться невидимым --- */
  function sweepPassed() {
    for (var i = pending.length - 1; i >= 0; i--) {
      if (pending[i].getBoundingClientRect().bottom <= 0) reveal(pending[i], true);
    }
  }

  /* --- прогресс-кольцо --- */
  var ticking = false;

  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.pageYOffset / max)) : 0;
    if (ringFill) ringFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - ratio));
    if (pctEl) pctEl.textContent = String(Math.round(ratio * 100));
    if (pending.length) sweepPassed();
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateProgress);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateProgress();

  /* --- кнопка «Далее»: переход к следующему экрану, с последнего — на обложку --- */
  var nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      var next = sections[(currentIndex + 1) % sections.length];
      next.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* --- выпадающее меню секций --- */
  var menuBtn = document.getElementById('menuBtn');
  var menuPanel = document.getElementById('menuPanel');

  function closeMenu() {
    if (!menuBtn) return;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuPanel.classList.remove('is-open');
    menuPanel.setAttribute('aria-hidden', 'true');
  }

  function openMenu() {
    menuBtn.setAttribute('aria-expanded', 'true');
    menuPanel.classList.add('is-open');
    menuPanel.setAttribute('aria-hidden', 'false');
  }

  if (menuBtn && menuPanel) {
    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = menuPanel.classList.contains('is-open');
      if (isOpen) closeMenu(); else openMenu();
    });

    menuPanel.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('a') : null;
      if (!link) return;
      e.preventDefault();
      var target = document.getElementById(link.getAttribute('href').slice(1));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeMenu();
    });

    document.addEventListener('click', function (e) {
      if (!menuPanel.classList.contains('is-open')) return;
      if (menuPanel.contains(e.target) || menuBtn.contains(e.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }
})();
