(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Submit the filter form as soon as a sort or brand select changes.
  document.querySelectorAll('[data-autosubmit]').forEach(function (el) {
    el.addEventListener('change', function () {
      el.form.submit();
    });
  });

  /* ------------------------------------------------------------------
     Light / dark theme
     The saved choice is applied before first paint by a tiny script in
     base.html. Here we handle the toggle, and follow the system setting
     as long as the visitor has not picked a theme themselves.
     ------------------------------------------------------------------ */
  var THEME_KEY = 'technova-theme';
  var toggle = document.querySelector('[data-theme-toggle]');

  function currentTheme() {
    return root.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    if (toggle) {
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function saveTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode: ignore */ }
  }

  applyTheme(currentTheme());

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      saveTheme(next);

      if (reduceMotion) { applyTheme(next); return; }

      // Modern browsers: reveal the new theme as a circle growing from the button.
      if (document.startViewTransition) {
        var rect = toggle.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;
        var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

        root.classList.add('theme-switching');
        var transition = document.startViewTransition(function () { applyTheme(next); });
        transition.ready.then(function () {
          root.animate(
            { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
            { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }
          );
        }).catch(function () {});
        transition.finished.finally(function () { root.classList.remove('theme-switching'); });
        return;
      }

      // Everyone else: a simple colour fade.
      root.classList.add('theme-fade');
      applyTheme(next);
      setTimeout(function () { root.classList.remove('theme-fade'); }, 450);
    });
  }

  if (window.matchMedia) {
    var scheme = matchMedia('(prefers-color-scheme: dark)');
    var onSystemChange = function (e) {
      var saved = null;
      try { saved = localStorage.getItem(THEME_KEY); } catch (err) {}
      if (!saved) applyTheme(e.matches ? 'dark' : 'light');
    };
    if (scheme.addEventListener) scheme.addEventListener('change', onSystemChange);
  }

  /* ------------------------------------------------------------------
     Header: soft shadow once the page scrolls; mark the current category
     ------------------------------------------------------------------ */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  document.querySelectorAll('.cats a').forEach(function (a) {
    if (a.pathname === location.pathname) a.setAttribute('aria-current', 'page');
  });

  /* ------------------------------------------------------------------
     Home banner: headline words rise into place, one after another
     ------------------------------------------------------------------ */
  var headline = document.querySelector('.banner h1');
  if (headline) {
    if (!reduceMotion) {
      var text = headline.textContent.trim();
      var words = text.split(/\s+/);
      headline.setAttribute('aria-label', text);
      headline.textContent = '';
      words.forEach(function (word, i) {
        var mask = document.createElement('span');
        var inner = document.createElement('span');
        mask.className = 'w';
        mask.setAttribute('aria-hidden', 'true');
        inner.textContent = word;
        inner.style.setProperty('--i', i);
        mask.appendChild(inner);
        headline.appendChild(mask);
        if (i < words.length - 1) headline.appendChild(document.createTextNode(' '));
      });
    }
    headline.classList.add('split');
  }

  /* ------------------------------------------------------------------
     Product cards ease in (staggered) the first time they scroll into view
     ------------------------------------------------------------------ */
  var cards = document.querySelectorAll('.grid .card');
  if (cards.length) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      cards.forEach(function (c) { c.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        var n = 0;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.style.setProperty('--d', (n++ * 0.07) + 's');
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
      cards.forEach(function (c) { io.observe(c); });
    }
  }

  /* ------------------------------------------------------------------
     "Add to cart" buttons show a spinner while the request is in flight
     ------------------------------------------------------------------ */
  document.querySelectorAll('.card form, .buy').forEach(function (form) {
    var btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    form.addEventListener('submit', function () {
      // Wait a frame so the form data is captured before the button is disabled.
      requestAnimationFrame(function () {
        btn.dataset.label = btn.textContent;
        btn.textContent = 'Adding';
        btn.classList.add('is-loading');
        btn.disabled = true;
      });
    });
  });
  // Coming back with the browser's back button should not show a stuck spinner.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    document.querySelectorAll('.btn.is-loading').forEach(function (btn) {
      btn.classList.remove('is-loading');
      btn.disabled = false;
      if (btn.dataset.label) btn.textContent = btn.dataset.label;
    });
  });

  /* ------------------------------------------------------------------
     Flash messages: CSS fades them out; with reduced motion, hide them here
     ------------------------------------------------------------------ */
  var toasts = document.querySelectorAll('.messages .msg');
  if (toasts.length && reduceMotion) {
    setTimeout(function () { toasts.forEach(function (t) { t.hidden = true; }); }, 6000);
  }
})();
