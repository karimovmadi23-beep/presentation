(function () {
  'use strict';

  var sections = Array.prototype.slice.call(document.querySelectorAll('.s'));
  var reveals  = Array.prototype.slice.call(document.querySelectorAll('.r'));
  var fill     = document.querySelector('.progress__fill');
  var counter  = document.querySelector('.counter__cur');

  /* --- задержка появления: data-d="2" → 2 шага по 90 мс --- */
  reveals.forEach(function (el) {
    var step = parseFloat(el.getAttribute('data-d')) || 0;
    if (step) el.style.transitionDelay = (step * 90) + 'ms';
  });

  /* --- презентация всегда открывается с обложки --- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

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

    /* --- номер текущей секции --- */
    var currentObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          counter.textContent = entry.target.getAttribute('data-index');
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(function (s) { currentObserver.observe(s); });
  } else {
    reveals.forEach(function (el) { reveal(el, true); });
  }

  /* --- страховка: то, что уже пролистали (быстрый скролл, End, перезагрузка),
         показываем без задержки — текст не должен остаться невидимым --- */
  function sweepPassed() {
    for (var i = pending.length - 1; i >= 0; i--) {
      if (pending[i].getBoundingClientRect().bottom <= 0) reveal(pending[i], true);
    }
  }

  /* --- индикатор прогресса --- */
  var ticking = false;

  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.pageYOffset / max)) : 0;
    fill.style.height = (ratio * 100) + '%';
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
})();
