(function () {
  // splash screen — fades out after load, with a hard failsafe
  var splash = document.getElementById('splash');
  if (splash) {
    var killSplash = function () {
      if (splash.classList.contains('is-gone')) return;
      splash.classList.add('is-gone');
      setTimeout(function () { if (splash && splash.parentNode) splash.parentNode.removeChild(splash); }, 600);
    };
    window.addEventListener('load', function () { setTimeout(killSplash, 350); });
    setTimeout(killSplash, 2600);
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
  }

  // contact form — posts to Web3Forms once a key is set, otherwise opens the mail app
  var cform = document.getElementById('cform');
  if (cform) {
    var cstatus = document.getElementById('cformStatus');
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
    var onScroll = function () { bar.classList.toggle('is-float', window.scrollY > 14); };
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
