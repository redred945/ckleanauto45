(function () {
  // splash screen — first visit of the session only, fades out after load
  var splash = document.getElementById('splash');
  if (splash) {
    var splashSeen = false;
    try { splashSeen = sessionStorage.getItem('ck_splash') === '1'; } catch (e) {}
    var dropSplash = function () { if (splash && splash.parentNode) splash.parentNode.removeChild(splash); };
    if (splashSeen) {
      dropSplash();
    } else {
      try { sessionStorage.setItem('ck_splash', '1'); } catch (e) {}
      var killSplash = function () {
        if (splash.classList.contains('is-gone')) return;
        splash.classList.add('is-gone');
        setTimeout(dropSplash, 600);
      };
      window.addEventListener('load', function () { setTimeout(killSplash, 350); });
      setTimeout(killSplash, 2600);
    }
  }

  // smooth page-to-page transitions — fade content out on leave, in on arrive
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      if (a.protocol !== 'http:' && a.protocol !== 'https:') return;
      if (a.origin !== location.origin) return;
      // pure in-page anchor (same path) — let the browser scroll
      if (a.pathname === location.pathname && a.search === location.search && a.hash) return;
      if (a.href === location.href) return;
      e.preventDefault();
      var url = a.href;
      document.documentElement.classList.add('is-leaving');
      setTimeout(function () { window.location.href = url; }, 210);
    });
    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) document.documentElement.classList.remove('is-leaving');
    });
  }

  // price simulator (home)
  var estim = document.getElementById('estim');
  if (estim) {
    var out = document.getElementById('estimPrice');
    var calc = function () {
      var f = estim.querySelector('input[name="formule"]:checked');
      var v = estim.querySelector('input[name="vehicule"]:checked');
      var total = (f && f.value === 'shampoing') ? 70 : 50;
      total += v ? Number(v.value) : 0;
      Array.prototype.forEach.call(estim.querySelectorAll('input[name="opt"]:checked'), function (c) { total += Number(c.value); });
      if (out) out.textContent = total;
    };
    estim.addEventListener('change', calc);
    calc();

    // accordion steps: pick an option → collapse this step, open the next one;
    // click a past (collapsed) step to reopen it and change your mind
    var estimGroups = Array.prototype.slice.call(estim.querySelectorAll('.estim__group'));
    if (estimGroups.length) {
      var summarizeGroup = function (group) {
        var out2 = group.querySelector('.estim__gsummary');
        if (!out2) return;
        var checked = Array.prototype.slice.call(group.querySelectorAll('input:checked'));
        if (!checked.length) { out2.textContent = ''; return; }
        var labels = checked.map(function (c) {
          var wrap = c.closest('.opt');
          var span = wrap && wrap.querySelector('span');
          return span ? span.textContent.trim() : '';
        });
        out2.textContent = labels.length > 2 ? (labels.slice(0, 2).join(', ') + '…') : labels.join(', ');
      };
      var openGroup = function (target) {
        estimGroups.forEach(function (g) {
          var open = g === target;
          g.classList.toggle('is-open', open);
          var head = g.querySelector('.estim__ghead');
          if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      };
      estimGroups.forEach(function (g, i) {
        summarizeGroup(g);
        var head = g.querySelector('.estim__ghead');
        if (head) {
          var toggle = function () { if (!g.classList.contains('is-open')) openGroup(g); };
          head.addEventListener('click', toggle);
          head.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
          });
        }
        g.addEventListener('change', function (e) {
          summarizeGroup(g);
          if (e.target.type === 'radio' && g.classList.contains('is-open')) {
            var next = estimGroups[i + 1];
            if (next) openGroup(next);
          }
        });
      });
    }

    // "Demander ce devis" — carry the configuration to the contact form
    var estimCta = document.getElementById('estimCta');
    if (estimCta) {
      var optLabel = function (input) {
        var wrap = input && input.closest('.opt');
        var span = wrap && wrap.querySelector('span');
        return span ? span.textContent.trim() : '';
      };
      estimCta.addEventListener('click', function () {
        var f = estim.querySelector('input[name="formule"]:checked');
        var v = estim.querySelector('input[name="vehicule"]:checked');
        var opts = Array.prototype.map.call(estim.querySelectorAll('input[name="opt"]:checked'), optLabel).filter(Boolean);
        var shampoing = f && f.value === 'shampoing';
        var prestation = shampoing ? 'Nettoyage intérieur + shampoing vapeur' : 'Nettoyage intérieur';
        var vehLabel = optLabel(v);
        var lines = [
          'Bonjour,',
          '',
          'Je souhaite un devis à partir de l’estimation en ligne :',
          '• Formule : ' + optLabel(f),
          '• Véhicule : ' + vehLabel
        ];
        if (opts.length) lines.push('• Options : ' + opts.join(', '));
        lines.push('• Estimation affichée : ' + (out ? out.textContent : '') + ' €');
        lines.push('', 'Merci de me recontacter pour convenir d’un créneau.');
        try {
          sessionStorage.setItem('ck_devis', JSON.stringify({
            prestation: prestation, vehicule: vehLabel, message: lines.join('\n')
          }));
        } catch (e) {}
      });
    }
  }

  // contact form — posts to Web3Forms once a key is set, otherwise opens the mail app
  var cform = document.getElementById('cform');
  if (cform) {
    var cstatus = document.getElementById('cformStatus');

    // pre-fill from the home price simulator, if the visitor came from "Demander ce devis"
    try {
      var devis = sessionStorage.getItem('ck_devis');
      if (devis) {
        sessionStorage.removeItem('ck_devis');
        var d = JSON.parse(devis);
        var sel = cform.elements['prestation'];
        if (sel && d.prestation) {
          for (var oi = 0; oi < sel.options.length; oi++) {
            if (sel.options[oi].text === d.prestation) { sel.selectedIndex = oi; break; }
          }
        }
        if (cform.elements['vehicule'] && d.vehicule) cform.elements['vehicule'].value = d.vehicule;
        if (cform.elements['message'] && d.message) cform.elements['message'].value = d.message;
        if (cstatus) { cstatus.className = 'cform__status is-info'; cstatus.textContent = 'Demande pré-remplie d’après votre estimation — ajoutez votre nom et votre téléphone.'; }
      }
    } catch (e) {}

    var val = function (name) { var el = cform.elements[name]; return el ? String(el.value || '').trim() : ''; };
    var mailtoFallback = function () {
      var body = 'Nom : ' + val('nom') +
        '\nTéléphone : ' + val('telephone') +
        '\nE-mail : ' + val('email') +
        '\nVéhicule : ' + val('vehicule') +
        '\nPrestation : ' + val('prestation') +
        '\n\n' + val('message');
      window.location.href = 'mailto:contact@ckleanauto45.fr?subject=' +
        encodeURIComponent('Demande de devis — ckleanauto45.fr') +
        '&body=' + encodeURIComponent(body);
    };
    cform.addEventListener('submit', function (e) {
      e.preventDefault();
      if (typeof cform.reportValidity === 'function' && !cform.reportValidity()) return;
      var key = val('access_key');
      if (!key || key.indexOf('VOTRE_CLE') !== -1) { mailtoFallback(); return; }
      if (cstatus) { cstatus.className = 'cform__status'; cstatus.textContent = 'Envoi en cours…'; }
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(cform)
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.success) throw new Error('fail');
        cform.reset();
        if (cstatus) { cstatus.className = 'cform__status is-ok'; cstatus.textContent = 'Merci, votre demande est bien partie. On vous recontacte très vite.'; }
      }).catch(function () {
        if (cstatus) { cstatus.className = 'cform__status is-err'; cstatus.textContent = 'L’envoi automatique a échoué — on ouvre votre messagerie pour envoyer la demande.'; }
        setTimeout(mailtoFallback, 1200);
      });
    });
  }

  var bar = document.querySelector('header.bar');
  if (bar) {
    var onScroll = function () { bar.classList.toggle('is-float', window.scrollY > 60); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var b = document.getElementById('burger'), n = document.getElementById('nav');
  if (b && n) {
    b.addEventListener('click', function () {
      var open = n.classList.toggle('is-open');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    n.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { n.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); }
    });
  }

  // hide the "Appeler" bubble once the footer (which already shows the number) is on screen
  var fab = document.querySelector('.call-fab');
  var footerEl = document.querySelector('footer');
  if (fab && footerEl && 'IntersectionObserver' in window) {
    var fabIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { fab.classList.toggle('is-hidden', en.isIntersecting); });
    }, { rootMargin: '0px', threshold: 0 });
    fabIo.observe(footerEl);
  }

  // stats strip on mobile: auto-advances on its own, pauses briefly if the visitor swipes it
  var statsGrid = document.querySelector('.stats__grid');
  if (statsGrid) {
    var statsReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var statsIsMobile = function () { return window.matchMedia('(max-width: 640px)').matches; };
    var statsTimer = null;
    var stopStatsAuto = function () { if (statsTimer) { clearInterval(statsTimer); statsTimer = null; } };
    var startStatsAuto = function () {
      if (statsTimer || statsReduced || !statsIsMobile()) return;
      statsTimer = setInterval(function () {
        var tiles = statsGrid.querySelectorAll('.stat');
        var w = statsGrid.clientWidth;
        if (!tiles.length || !w) return;
        var idx = Math.round(statsGrid.scrollLeft / w);
        var nextIdx = (idx + 1) % tiles.length;
        statsGrid.scrollTo({ left: nextIdx * w, behavior: 'smooth' });
      }, 2800);
    };
    startStatsAuto();
    var statsResumeTimeout;
    var pauseStatsAuto = function () {
      stopStatsAuto();
      clearTimeout(statsResumeTimeout);
      statsResumeTimeout = setTimeout(startStatsAuto, 4000);
    };
    statsGrid.addEventListener('pointerdown', pauseStatsAuto);
    statsGrid.addEventListener('touchstart', pauseStatsAuto, { passive: true });
    window.addEventListener('resize', function () { stopStatsAuto(); startStatsAuto(); });
  }

  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var showAll = function () { items.forEach(function (el) { el.classList.add('in'); }); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !('IntersectionObserver' in window) || !items.length) { showAll(); return; }

  document.documentElement.classList.add('reveal-on');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
  items.forEach(function (el) {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) { el.classList.add('in'); }
    else { io.observe(el); }
  });
  // hard failsafe: nothing stays hidden more than ~1.4s after load
  window.addEventListener('load', function () { setTimeout(showAll, 1400); });
})();
