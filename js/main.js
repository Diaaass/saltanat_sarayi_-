/* =========================================================================
   Saltanat Saraiy — main.js
   Поведение навешивается через data-* атрибуты (см. бриф п.1.5).
   Шаг 2: модалка + бургер + header.is-scrolled.
   GSAP/Swiper/Lenis подключаются на шаге 3 под свои секции.
   ========================================================================= */

(() => {
  'use strict';

  const body = document.body;

  /* ---------------------------------------------------------------------
     Утилиты
  --------------------------------------------------------------------- */
  const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  const getFocusable = (scope) => Array.from(scope.querySelectorAll(FOCUSABLE_SELECTOR));

  /* Централизованный менеджер блокировки скролла. .is-lock на body снимается
     только если ничего из «лочащих» состояний не активно (модалка / меню). */
  function refreshBodyLock() {
    const menuOpen = !!document.querySelector('[data-header].menu-active');
    const modalOpen = !!activeModal;
    body.classList.toggle('is-lock', menuOpen || modalOpen);
  }

  /* ---------------------------------------------------------------------
     1. Модалка
        Открытие:  [data-modal-target="<id>"]
        Закрытие:  [data-modal-close] (крестик, клик на оверлей), Esc
        a11y:      .is-lock на body, ловушка фокуса, возврат фокуса.
  --------------------------------------------------------------------- */
  let activeModal = null;
  let lastFocus = null;

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.setAttribute('aria-hidden', 'false');
    activeModal = modal;
    refreshBodyLock();
    const focusables = getFocusable(modal);
    if (focusables.length) focusables[0].focus();
  }

  function closeModal() {
    if (!activeModal) return;
    activeModal.setAttribute('aria-hidden', 'true');
    activeModal = null;
    refreshBodyLock();
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  document.addEventListener('click', (e) => {
    const openTrigger = e.target.closest('[data-modal-target]');
    if (openTrigger) {
      e.preventDefault();
      openModal(openTrigger.dataset.modalTarget);
      return;
    }
    const closeTrigger = e.target.closest('[data-modal-close]');
    if (closeTrigger && activeModal && activeModal.contains(closeTrigger)) {
      e.preventDefault();
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!activeModal) return;
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = getFocusable(activeModal);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------------------------------------------------------------------
     2. Сабмит формы модалки → переход на thx.html
        Точка интеграции с бэком — позже (data-modal-form).
  --------------------------------------------------------------------- */
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-modal-form]');
    if (!form) return;
    e.preventDefault();
    // TODO: реальная отправка заявки на бэк (fetch / fetch+JSON).
    window.location.href = 'thx.html';
  });

  /* ---------------------------------------------------------------------
     3. Бургер / выезжающее меню
        [data-toggle-target="<selector>"] + [data-toggle-classname="<class>"]
        Тоггл добавляет/убирает <class> на цели; на body — .is-lock.
        aria-expanded синхронизируется на самом триггере.
  --------------------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle-target]');
    if (!toggle) return;
    const selector = toggle.dataset.toggleTarget;
    const cls = toggle.dataset.toggleClassname || 'is-active';
    const target = document.querySelector(selector);
    if (!target) return;

    // Бургер — toggle; всё остальное (ссылки в меню, CTA) — только close.
    const isBurger = toggle.classList.contains('burger');
    if (isBurger) {
      target.classList.toggle(cls);
    } else {
      target.classList.remove(cls);
    }
    const active = target.classList.contains(cls);
    refreshBodyLock();

    const burger = target.querySelector('.burger');
    if (burger) {
      burger.setAttribute('aria-expanded', String(active));
      burger.setAttribute('aria-label', active ? 'Закрыть меню' : 'Открыть меню');
    }
  });

  /* ---------------------------------------------------------------------
     4. Header — состояние .is-scrolled
        Прозрачный поверх hero, после небольшого скролла — кремовый фон.
        Поведение управляется CSS на data-page="home" (см. main.css).
  --------------------------------------------------------------------- */
  const header = document.querySelector('[data-header]');
  if (header) {
    const SCROLL_THRESHOLD = 24;
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------------
     5. Hero — страховка под prefers-reduced-motion
        CSS уже прячет <video> через @media; здесь дополнительно
        останавливаем autoplay и снимаем preload, чтобы видео не качалось.
  --------------------------------------------------------------------- */
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const applyReducedMotion = () => {
    if (!motionQuery.matches) return;
    document.querySelectorAll('video[autoplay]').forEach((v) => {
      v.removeAttribute('autoplay');
      v.setAttribute('preload', 'none');
      v.pause();
    });
  };
  applyReducedMotion();
  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', applyReducedMotion);
  }

  /* ---------------------------------------------------------------------
     6. Площадки — scroll-свитчер (4.4c)
        Десктоп/планшет (≥769) + no-preference → секция пинится на 100vh,
        скролл листает 5 площадок 1→5 со снапом; фон кроссфейдит,
        текст въезжает слева (-40 → 0), фото лёгкий зум (1.04 → 1).
        Мобайл (≤768.98) ИЛИ reduced-motion → обычный вертикальный стек
        (matchMedia в этот breakpoint просто не зайдёт; CSS-фоллбэк уже есть).
  --------------------------------------------------------------------- */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();
    mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
      const section = document.querySelector('.venues');
      const venues = gsap.utils.toArray('.venues .venue');
      const n = venues.length;
      if (!section || n === 0) return;

      section.classList.add('is-switcher');
      // стартовое состояние: видна только первая; z-index по порядку —
      // каждая следующая входящая всегда выше уходящей (естественный кроссфейд).
      venues.forEach((v, i) => gsap.set(v, { autoAlpha: i === 0 ? 1 : 0, zIndex: i }));

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => '+=' + ((n - 1) * window.innerHeight),
          pin: '.venues__track',
          anticipatePin: 1,
          scrub: 1,
          snap: { snapTo: 1 / (n - 1), duration: { min: 0.2, max: 0.5 }, ease: 'power1.inOut' },
          invalidateOnRefresh: true,
        },
      });

      for (let i = 1; i < n; i++) {
        const prev = venues[i - 1];
        const cur = venues[i];
        const content = cur.querySelector('.venue__content');
        const photo = cur.querySelector('.venue__photo');
        const pos = i - 1; // начало сегмента в безразмерной шкале таймлайна
        tl.to(prev, { autoAlpha: 0, duration: 0.5 }, pos)
          .fromTo(cur, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, pos + 0.15)
          .fromTo(content, { x: -40 }, { x: 0, duration: 0.55, ease: 'power2.out' }, pos + 0.2)
          .fromTo(photo, { scale: 1.04 }, { scale: 1, duration: 0.6, ease: 'power2.out' }, pos + 0.15);
      }

      // cleanup: matchMedia сам ревертит таймлайн/ScrollTrigger;
      // здесь дополнительно снимаем класс и inline-стили GSAP, чтобы
      // секция мгновенно вернулась в обычный стек.
      return () => {
        section.classList.remove('is-switcher');
        gsap.set(venues, { clearProps: 'all' });
      };
    });
  }

  /* ---------------------------------------------------------------------
     7. Контакты — появление конверта + формы (4.7)
        Конверт всплывает снизу, белая карточка-«письмо» заезжает сверху
        в конверт (лёгкий нахлёст по времени). Стартовое скрытое состояние
        задаём из JS — без JS / при reduced-motion блок виден статично.
        xPercent: -50 на карточке заменяет CSS translateX(-50%), чтобы
        GSAP не перетёр горизонтальное центрирование.
  --------------------------------------------------------------------- */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    const mmContacts = gsap.matchMedia();
    mmContacts.add('(prefers-reduced-motion: no-preference)', () => {
      const wrap = document.querySelector('.contacts__form-wrap');
      if (!wrap) return;
      const letter = wrap.querySelector('.contacts__letter');
      const card   = wrap.querySelector('.contacts__form-card');
      if (!letter || !card) return;

      // Вся обёртка (конверт целиком) появляется снизу.
      // Лист (.contacts__letter) и контент-контейнер (.contacts__form-card)
      // двигаются ВМЕСТЕ как одно письмо — стартуют утопленными за front
      // и поднимаются на одну и ту же y. Центрирование на CSS left:calc,
      // поэтому xPercent НЕ ставим — иначе GSAP сложит два translateX.
      gsap.set(wrap, { autoAlpha: 0, y: 60, willChange: 'transform,opacity' });
      gsap.set([letter, card], { autoAlpha: 0, y: 90, willChange: 'transform,opacity' });

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: { trigger: wrap, start: 'top 80%', once: true },
      });
      tl.to(wrap, { autoAlpha: 1, y: 0, duration: 0.8 })
        .to([letter, card], { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '-=0.4');

      return () => { gsap.set([wrap, letter, card], { clearProps: 'all' }); };
    });
  }

  /* ---------------------------------------------------------------------
     8. Прочее (шаг 3+):
        - Аккордеоны: нативные <details>, JS не нужен.
        - Lenis (smooth scroll): подключить при необходимости (тогда связать
          с ScrollTrigger через lenis.on('scroll', ScrollTrigger.update)).
        - Swiper (галерея/мобильные слайдеры): подключить под секцию.
  --------------------------------------------------------------------- */
  // TODO

})();
