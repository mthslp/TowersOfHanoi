/* ============================================================
   Tours de Hanoï — onglet « Démonstration »
   Pas à pas, algorithme affiché à côté du plateau :
   - 3 piquets : récursif OU itératif
   - 4 piquets (et plus) : Frame–Stewart
   ============================================================ */

(function (global) {
  'use strict';

  const core = global.HanoiCore;
  const algo = global.HanoiAlgorithms;

  const KIND_LABELS = {
    init: 'Initialisation',
    call: 'Appel',
    base: 'Cas de base',
    phase: 'Étape de la stratégie',
    move: 'Déplacement',
    ret: 'Retour',
    done: 'Terminé',
    split: 'Choix de la coupure',
  };

  function fmt(n) {
    if (!isFinite(n)) return '∞';
    return Number(n).toLocaleString('fr-FR');
  }

  function initDemo() {
    const el = {
      pegs: document.getElementById('demo-pegs'),
      disks: document.getElementById('demo-disks'),
      algoTabs: document.getElementById('demo-algo-tabs'),
      restart: document.getElementById('demo-restart'),
      prev: document.getElementById('demo-prev'),
      play: document.getElementById('demo-play'),
      next: document.getElementById('demo-next'),
      speed: document.getElementById('demo-speed'),
      progress: document.getElementById('demo-progress'),
      progressBar: document.getElementById('demo-progress-bar'),
      title: document.getElementById('demo-algo-title'),
      note: document.getElementById('demo-note'),
      code: document.getElementById('demo-pseudocode'),
      explain: document.getElementById('demo-explain'),
      stack: document.getElementById('demo-stack'),
      argmin: document.getElementById('demo-argmin'),
      board: document.getElementById('demo-board'),
      movesInfo: document.getElementById('demo-moves-info'),
    };
    if (!el.board) return null;

    const board = new core.Board(el.board);
    let nPegs = 3;
    let nDisks = 3;
    let algoName = 'recursive';
    let steps = [];
    let idx = 0;
    let timer = null;
    let playing = false;

    function intervalFromSlider() {
      const v = Number(el.speed.value);
      return Math.round(700 - v * 6.5); // 700 ms → 50 ms
    }

    function lineKey(line) {
      return String(line);
    }

    function fillDisks() {
      const max = nPegs === 3 ? 8 : 12;
      const prev = nDisks;
      el.disks.innerHTML = '';
      for (let d = 1; d <= max; d++) {
        const opt = document.createElement('option');
        opt.value = String(d);
        opt.textContent = String(d);
        el.disks.appendChild(opt);
      }
      nDisks = Math.min(prev, max);
      if (nPegs === 3 && nDisks < 3) nDisks = 3;
      if (nPegs >= 4 && nDisks < 5) nDisks = 5;
      el.disks.value = String(nDisks);
    }

    function renderPseudocode() {
      const lines = nPegs === 3 ? algo.PSEUDOCODE[algoName] : algo.PSEUDOCODE.frameStewart;
      el.code.innerHTML = lines
        .map((l) => {
          const ln = Number.isInteger(l.n) ? String(l.n) : '';
          return '<span class="code-line" data-line="' + lineKey(l.n) + '">' +
            '<span class="ln">' + ln + '</span>' + l.html + '</span>';
        })
        .join('');
    }

    function stateAt(stepIndex) {
      const s = new core.TowerState(nDisks, nPegs);
      for (let j = 0; j <= stepIndex; j++) {
        if (steps[j].move) s.force(steps[j].move);
      }
      return s;
    }

    function movesDoneAt(stepIndex) {
      let c = 0;
      for (let j = 0; j <= stepIndex; j++) if (steps[j].move) c++;
      return c;
    }

    function renderStack(step) {
      if (!step.stack || step.stack.length === 0) {
        el.stack.innerHTML = '';
        el.stack.style.display = 'none';
        return;
      }
      el.stack.style.display = '';
      const frames = step.stack
        .slice()
        .reverse()
        .map((f, i) => {
          const cls = i === 0 ? 'frame current' : 'frame';
          return '<div class="' + cls + '"><span>' + escapeHtml(f.label) +
            '</span><span class="depth">n = ' + f.n + '</span></div>';
        })
        .join('');
      el.stack.innerHTML =
        '<h4>Pile d’appels (' + step.stack.length + ')' +
        (nPegs >= 4 ? ' — sous-problèmes actifs' : '') + '</h4>' +
        '<div class="frame-list">' + frames + '</div>';
    }

    function renderArgmin(step) {
      if (!step.argmin) {
        el.argmin.innerHTML = '';
        el.argmin.style.display = 'none';
        return;
      }
      el.argmin.style.display = '';
      const { p, n, rows, bestK } = step.argmin;
      const body = rows
        .map((r) => {
          const cls = r.k === bestK ? ' class="best"' : '';
          return '<tr' + cls + '><td>' + r.k + '</td><td>' + fmt(r.tP) +
            '</td><td>' + fmt(r.tPm1) + '</td><td>' + fmt(r.cost) + '</td></tr>';
        })
        .join('');
      el.argmin.innerHTML =
        '<h4>Calcul de k pour T<sub>' + p + '</sub>(' + n + ')</h4>' +
        '<table class="argmin"><thead><tr><th>k</th><th>T<sub>' + p + '</sub>(k)</th>' +
        '<th>T<sub>' + (p - 1) + '</sub>(' + n + '−k)</th><th>2·a + b</th></tr></thead>' +
        '<tbody>' + body + '</tbody></table>';
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function render() {
      const step = steps[idx];
      if (!step) return;

      // Surlignage de la ligne courante
      const key = lineKey(step.line);
      el.code.querySelectorAll('.code-line').forEach((lineEl) => {
        lineEl.classList.toggle('active', lineEl.getAttribute('data-line') === key);
      });

      // Explication
      const kindLabel = KIND_LABELS[step.kind] || '';
      el.explain.innerHTML =
        '<span class="step-kind">' + kindLabel + '</span><br>' + escapeHtml(step.explain);

      renderStack(step);
      renderArgmin(step);

      // Plateau
      const state = stateAt(idx);
      board.render(state, {
        selected: null,
        moved: step.move ? step.move.disk : null,
      });

      // Progression
      const done = movesDoneAt(idx);
      const totalMoves = steps.filter((s) => s.move).length;
      el.progress.textContent = 'Étape ' + (idx + 1) + ' / ' + steps.length;
      const pct = totalMoves ? Math.round((100 * done) / totalMoves) : (idx + 1 === steps.length ? 100 : 0);
      el.progressBar.style.width = pct + '%';
      el.movesInfo.innerHTML = 'Coups joués : <span class="value">' + done + ' / ' + totalMoves + '</span>';

      // Boutons
      el.prev.disabled = idx === 0;
      el.restart.disabled = idx === 0;
      el.next.disabled = idx >= steps.length - 1;
      el.play.textContent = playing ? '⏸' : '▶';
    }

    function buildSteps() {
      pause();
      board.setup(nDisks, nPegs);
      if (nPegs === 3) {
        steps = algoName === 'recursive' ? algo.recursiveTrace(nDisks) : algo.iterativeTrace(nDisks);
      } else {
        steps = algo.frameStewartTrace(nDisks, nPegs);
      }
      idx = 0;
      renderPseudocode();
      updateTitles();
      render();
    }

    function updateTitles() {
      if (nPegs === 3) {
        el.title.textContent = algoName === 'recursive'
          ? 'Algorithme récursif (3 piquets)'
          : 'Algorithme itératif (3 piquets)';
        el.note.textContent = algoName === 'recursive'
          ? 'Stratégie « diviser pour régner » : on transfère d’abord les n−1 plus petits disques, puis le plus grand, puis on replace les n−1 plus petits. Cette méthode est optimale et sa séquence de coups est unique.'
          : 'Sans pile d’appels : le plus petit disque bouge une fois sur deux dans un sens fixe (A→C→B→A si n est impair, A→B→C→A si n est pair) ; sinon on joue l’unique autre coup légal. On obtient exactement les mêmes coups que la version récursive.';
        el.algoTabs.style.display = '';
      } else {
        el.title.textContent = 'Frame–Stewart (' + nPegs + ' piquets)';
        el.note.textContent = 'Avec ' + nPegs + ' piquets, on choisit une coupure k : les k plus petits disques sont déplacés avec tous les piquets, les n−k plus gros avec un piquet de moins (celui qui reçoit la petite tour est bloqué), puis la petite tour revient. Optimal pour 4 piquets (preuve de Bousch, 2014) ; pour ' + nPegs + ' ≥ 5 piquets c’est une conjecture ouverte depuis 1941.';
        el.algoTabs.style.display = 'none';
      }
      const total = algo.minMoves(nPegs, nDisks);
      el.title.textContent += ' — ' + fmt(total) + ' coups';
    }

    function next() {
      if (idx < steps.length - 1) {
        idx += 1;
        render();
      } else {
        pause();
      }
    }

    function prev() {
      pause();
      if (idx > 0) {
        idx -= 1;
        render();
      }
    }

    function restart() {
      pause();
      idx = 0;
      render();
    }

    function play() {
      if (playing) return;
      if (idx >= steps.length - 1) idx = 0;
      playing = true;
      el.play.textContent = '⏸';
      const tick = () => {
        if (!playing) return;
        if (idx >= steps.length - 1) {
          pause();
          render();
          return;
        }
        next();
        timer = setTimeout(tick, intervalFromSlider());
      };
      tick();
    }

    function pause() {
      playing = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      el.play.textContent = '▶';
    }

    function togglePlay() {
      if (playing) pause();
      else play();
    }

    // Événements
    el.pegs.addEventListener('change', () => {
      nPegs = Number(el.pegs.value);
      fillDisks();
      buildSteps();
    });
    el.disks.addEventListener('change', () => {
      nDisks = Number(el.disks.value);
      buildSteps();
    });
    el.algoTabs.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        algoName = btn.getAttribute('data-algo');
        el.algoTabs.querySelectorAll('button').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        buildSteps();
      });
    });
    el.next.addEventListener('click', () => { pause(); next(); });
    el.prev.addEventListener('click', prev);
    el.restart.addEventListener('click', restart);
    el.play.addEventListener('click', togglePlay);

    document.addEventListener('keydown', (ev) => {
      const panel = document.getElementById('tab-demo');
      if (!panel || !panel.classList.contains('active')) return;
      if (ev.target && /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return;
      if (ev.key === 'ArrowRight') { pause(); next(); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft') { prev(); ev.preventDefault(); }
      else if (ev.key === ' ') { togglePlay(); ev.preventDefault(); }
    });

    fillDisks();
    buildSteps();

    return { buildSteps };
  }

  global.HanoiDemo = { initDemo };
})(window);
