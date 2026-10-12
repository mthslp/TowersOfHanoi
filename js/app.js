/* ============================================================
   Tours de Hanoï — initialisation de l'application (onglets)
   ============================================================ */

(function () {
  'use strict';

  function initTabs() {
    const tabs = document.querySelectorAll('.tabs .tab');
    const panels = document.querySelectorAll('.tab-panel');

    function activate(id) {
      let found = false;
      tabs.forEach((b) => {
        const on = b.getAttribute('data-tab') === id;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) found = true;
      });
      if (!found) return false;
      panels.forEach((p) => p.classList.toggle('active', p.id === 'tab-' + id));
      return true;
    }

    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        activate(btn.getAttribute('data-tab'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    // Liens profonds : index.html#demo, #maths, #sources, #jeu
    const fromHash = () => (window.location.hash || '').replace(/^#/, '');
    if (fromHash()) activate(fromHash());
    window.addEventListener('hashchange', () => {
      if (fromHash()) activate(fromHash());
    });
  }

  function boot() {
    initTabs();
    if (window.HanoiGame) window.HanoiGame.initGame();
    if (window.HanoiDemo) window.HanoiDemo.initDemo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
