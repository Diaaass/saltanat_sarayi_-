(() => {
  'use strict';

  const body = document.body;

  const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  const getFocusable = (scope) => Array.from(scope.querySelectorAll(FOCUSABLE_SELECTOR));

  function refreshBodyLock() {
    const menuOpen = !!document.querySelector('[data-header].menu-active');
    const modalOpen = !!activeModal;
    body.classList.toggle('is-lock', menuOpen || modalOpen);
  }

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

  // --- Phone mask: +7 (___) ___ ____ -------------------------------------
  const PHONE_MATRIX = '+7 (___) ___ ____';
  const phoneDigits = (value) => String(value).replace(/\D/g, '');
  const isValidPhone = (value) => phoneDigits(value).length >= 11; // +7 и 10 цифр

  const applyPhoneMask = (event) => {
    const input = event.target;

    let digits = input.value.replace(/\D/g, '');
    if (digits[0] === '8') digits = '7' + digits.slice(1); // 8 700… → +7 700…
    if (!digits) digits = '7';                             // код страны всегда впереди
    if (digits.length > 11) digits = digits.slice(0, 11);

    let i = 0;
    input.value = PHONE_MATRIX.replace(/./g, (ch) =>
      /[_\d]/.test(ch) && i < digits.length
        ? digits.charAt(i++)
        : (i >= digits.length ? '' : ch)
    );
    if (input.value === '+7') input.value = '+7 (';

    if (input.classList.contains('is-invalid') && isValidPhone(input.value)) {
      clearFieldError(input);
    }
  };

  // на blur очищаем поле, если введён только код страны — вернётся placeholder
  const resetEmptyPhone = (event) => {
    if (phoneDigits(event.target.value).length <= 1) event.target.value = '';
  };

  document.querySelectorAll('input[type="tel"]').forEach((input) => {
    input.addEventListener('focus', applyPhoneMask);
    input.addEventListener('input', applyPhoneMask);
    input.addEventListener('blur', resetEmptyPhone);
  });

  const setFieldError = (input, message) => {
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    let err = input.nextElementSibling;
    if (!(err && err.classList && err.classList.contains('field-error'))) {
      err = document.createElement('span');
      err.className = 'field-error';
      input.insertAdjacentElement('afterend', err);
    }
    err.textContent = message;
  };
  const clearFieldError = (input) => {
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
    const err = input.nextElementSibling;
    if (err && err.classList && err.classList.contains('field-error')) err.remove();
  };

  const validateForm = (form) => {
    let ok = true;
    const name = form.querySelector('input[name="name"]');
    const phone = form.querySelector('input[name="phone"]');
    if (name) {
      if (!name.value.trim()) { setFieldError(name, 'Введите имя'); ok = false; }
      else clearFieldError(name);
      name.addEventListener('input', () => { if (name.value.trim()) clearFieldError(name); }, { once: true });
    }
    if (phone) {
      if (!isValidPhone(phone.value)) { setFieldError(phone, 'Введите номер полностью'); ok = false; }
      else clearFieldError(phone);
    }
    return ok;
  };

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-modal-form]');
    if (!form) return;
    e.preventDefault();

    if (!validateForm(form)) {
      const firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    window.location.href = 'thx.html';
  });

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle-target]');
    if (!toggle) return;
    const selector = toggle.dataset.toggleTarget;
    const cls = toggle.dataset.toggleClassname || 'is-active';
    const target = document.querySelector(selector);
    if (!target) return;

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

  const header = document.querySelector('[data-header]');
  if (header) {
    const SCROLL_THRESHOLD = 24;
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // --- Reveal: fade-up + stagger через IntersectionObserver --------------
  // (смотрит на реальную видимость, поэтому не зависит от пинов и позиций скролла)
  const revealEls = document.querySelectorAll('[data-reveal], [data-reveal-group]');
  if (!('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-revealed'));
  } else {
    const revealIO = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealEls.forEach((el) => revealIO.observe(el));
  }

  if (hasGsap) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 769px)', () => {
      const section = document.querySelector('.venues');
      const venues = gsap.utils.toArray('.venues .venue');
      const n = venues.length;
      if (!section || n === 0) return;

      section.classList.add('is-switcher');

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
        const pos = i - 1;
        tl.to(prev, { autoAlpha: 0, duration: 0.5 }, pos)
          .fromTo(cur, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, pos + 0.15)
          .fromTo(content, { x: -40 }, { x: 0, duration: 0.55, ease: 'power2.out' }, pos + 0.2)
          .fromTo(photo, { scale: 1.04 }, { scale: 1, duration: 0.6, ease: 'power2.out' }, pos + 0.15);
      }

      return () => {
        section.classList.remove('is-switcher');
        gsap.set(venues, { clearProps: 'all' });
      };
    });
  }

  document.querySelectorAll('details.venue__acc').forEach((d) => {
    const summary = d.querySelector('summary');
    const content = d.querySelector('.venue__acc-list');
    if (!summary || !content) return;

    const DUR = 380;
    let anim = null;

    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (anim) {
        anim.cancel();
        anim = null;
      }

      const isOpen = d.open;
      if (!isOpen) d.open = true;

      const fullH = content.scrollHeight;
      const fromH = isOpen ? fullH : 0;
      const toH   = isOpen ? 0 : fullH;

      content.style.overflow = 'hidden';

      anim = content.animate(
        [
          { height: fromH + 'px', opacity: isOpen ? 1 : 0 },
          { height: toH   + 'px', opacity: isOpen ? 0 : 1 },
        ],
        { duration: DUR, easing: 'cubic-bezier(.22,.61,.36,1)' }
      );

      anim.onfinish = () => {
        content.style.overflow = '';
        if (isOpen) d.open = false;
        anim = null;
      };
    });
  });

  if (typeof Swiper !== 'undefined') {
    document.querySelectorAll('.gallery__swiper, .about__swiper').forEach((el) => {
      new Swiper(el, {
        slidesPerView: 'auto',
        spaceBetween: 12,
        pagination: { el: el.querySelector('.swiper-pagination'), clickable: true },
        breakpoints: {
          769: { spaceBetween: 36 },
        },
      });
    });
  }

  if (hasGsap) {
    const mmContacts = gsap.matchMedia();
    mmContacts.add('(prefers-reduced-motion: no-preference)', () => {
      const wrap = document.querySelector('.contacts__form-wrap');
      if (!wrap) return;
      const letter = wrap.querySelector('.contacts__letter');
      const card   = wrap.querySelector('.contacts__form-card');
      if (!letter || !card) return;

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

})();
