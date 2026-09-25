(function () {
  'use strict';

  var DEFAULT_GALLERY = 'home';

  // "panels" = every photo grid plus the About & Contact page
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-gallery]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('#siteNav a[data-target]'));
  var menuBtn = document.getElementById('menuToggle');
  var siteNav = document.getElementById('siteNav');

  // ---------- Load real images into each grid ----------
  // (tiles without data-src stay as gray placeholders)
  document.querySelectorAll('.tile').forEach(function (tile) {
    var src = tile.dataset.src;
    var img = tile.querySelector('img');
    if (src) {
      img.src = src;
      img.alt = tile.dataset.caption || '';
      img.loading = 'lazy';
      img.hidden = false;
    } else {
      img.remove();
      tile.setAttribute('aria-label', 'Open photo: ' + (tile.dataset.caption || ''));
    }
  });

  // ---------- Switching between galleries (sidebar tabs) ----------
  var currentSlug = null;
  var tiles = [];   // tiles of the gallery that is currently showing

  function showGallery(slug) {
    var found = panels.some(function (g) { return g.dataset.gallery === slug; });
    if (!found) slug = DEFAULT_GALLERY;

    panels.forEach(function (g) {
      g.hidden = g.dataset.gallery !== slug;
    });
    navLinks.forEach(function (a) {
      var on = a.dataset.target === slug;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });

    // photos of the gallery now showing (the About page has none)
    tiles = Array.prototype.slice.call(
      document.querySelector('[data-gallery="' + slug + '"]').querySelectorAll('.tile')
    );

    var changed = slug !== currentSlug;
    currentSlug = slug;
    if (changed) window.scrollTo(0, 0);
  }

  function route() {
    if (!viewer.hidden) closeViewer(true);
    showGallery(location.hash.replace('#', ''));
  }

  window.addEventListener('hashchange', route);

  // Close the mobile menu after picking a tab
  navLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      if (window.matchMedia('(max-width: 640px)').matches) {
        siteNav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // ---------- Viewer (enlarged photo + caption) ----------
  var viewer = document.getElementById('viewer');
  var media = document.getElementById('viewerMedia');
  var caption = document.getElementById('viewerCaption');
  var count = document.getElementById('viewerCount');
  var closeBtn = document.getElementById('viewerClose');
  var current = 0;
  var lastFocus = null;

  function render(n) {
    if (!tiles.length) return;
    current = (n + tiles.length) % tiles.length;
    var tile = tiles[current];
    var src = tile.dataset.src;
    var text = tile.dataset.caption || '';

    media.innerHTML = '';
    if (src) {
      var img = document.createElement('img');
      img.src = src;
      img.alt = text;
      media.appendChild(img);
    } else {
      var ph = document.createElement('div');
      ph.className = 'placeholder';
      ph.setAttribute('role', 'img');
      ph.setAttribute('aria-label', text || 'Placeholder image');
      media.appendChild(ph);
    }
    caption.textContent = text;
    count.textContent = (current + 1) + ' / ' + tiles.length;
  }

  function openViewer(n) {
    lastFocus = document.activeElement;
    render(n);
    viewer.hidden = false;
    document.body.classList.add('viewer-open');
    closeBtn.focus();
  }

  function closeViewer(skipFocus) {
    viewer.hidden = true;
    document.body.classList.remove('viewer-open');
    if (!skipFocus && lastFocus) lastFocus.focus();
  }

  // One click handler for every grid; the slideshow runs through the gallery you opened
  document.getElementById('page').addEventListener('click', function (e) {
    var tile = e.target.closest('.tile');
    if (!tile) return;
    var i = tiles.indexOf(tile);
    if (i > -1) openViewer(i);
  });

  document.getElementById('viewerNext').addEventListener('click', function () { render(current + 1); });
  document.getElementById('viewerPrev').addEventListener('click', function () { render(current - 1); });
  closeBtn.addEventListener('click', function () { closeViewer(); });

  // Click on the empty backdrop closes the viewer
  viewer.addEventListener('click', function (e) {
    if (e.target === viewer) closeViewer();
  });

  document.addEventListener('keydown', function (e) {
    if (viewer.hidden) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') render(current + 1);
    if (e.key === 'ArrowLeft') render(current - 1);
  });

  // Swipe left/right on touch screens
  var startX = null;
  viewer.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
  }, { passive: true });
  viewer.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) render(dx < 0 ? current + 1 : current - 1);
    startX = null;
  });

  // ---------- Contact form ----------
  var form = document.getElementById('contactForm');
  if (form) {
    var statusEl = document.getElementById('contactStatus');
    var submitBtn = document.getElementById('contactSubmit');
    var ajaxUrl = form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/');
    var EMAIL = 'tylerquattrin@gmail.com';

    function setStatus(kind, html) {
      statusEl.className = 'form-status' + (kind ? ' is-' + kind : '');
      statusEl.innerHTML = html;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      submitBtn.disabled = true;
      setStatus('', 'Sending…');

      fetch(ajaxUrl, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && (data.success === true || data.success === 'true')) {
            form.reset();
            setStatus('ok', 'Thanks! Your message was sent.');
          } else {
            throw new Error('not sent');
          }
        })
        .catch(function () {
          setStatus('error',
            'Sorry, that didn’t go through. Please email me directly at ' +
            '<a href="mailto:' + EMAIL + '">' + EMAIL + '</a>.');
        })
        .then(function () { submitBtn.disabled = false; });
    });
  }

  // ---------- Mobile menu ----------
  menuBtn.addEventListener('click', function () {
    var open = siteNav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  // ---------- Start ----------
  route();
})();
