/* ============================================================
   Tours de Hanoï — onglet « Jeu »
   Partie interactive avec n piquets (3 à 6) au choix.
   ============================================================ */

(function (global) {
  'use strict';

  const core = global.HanoiCore;
  const algo = global.HanoiAlgorithms;

  const MAX_PEGS = 6;
  const MAX_DISKS = 10;

  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n >= 1e15) return n.toExponential(3).replace('+', '');
    return Number(n).toLocaleString('fr-FR');
  }

  function initGame() {
    const el = {
      pegs: document.getElementById('game-pegs'),
      disks: document.getElementById('game-disks'),
      reset: document.getElementById('game-reset'),
      undo: document.getElementById('game-undo'),
      solve: document.getElementById('game-solve'),
      stop: document.getElementById('game-stop'),
      speed: document.getElementById('game-speed'),
      moves: document.getElementById('game-moves'),
      min: document.getElementById('game-min'),
      msg: document.getElementById('game-msg'),
      board: document.getElementById('game-board'),
    };
    if (!el.board) return null;

    const board = new core.Board(el.board);
    let state = null;
    let nDisks = 4;
    let nPegs = 3;
    let selected = null;
    let player = null;
    let msgTimer = null;

    function setMsg(text, kind) {
      if (msgTimer) { clearTimeout(msgTimer); msgTimer = null; }
      el.msg.textContent = text || '';
      el.msg.className = 'msg' + (kind ? ' ' + kind : '');
      if (text && kind === 'info') {
        msgTimer = setTimeout(() => {
          if (el.msg.textContent === text) setMsg('');
        }, 4500);
      }
    }

    function intervalFromSlider() {
      const v = Number(el.speed.value);
      return Math.round(650 - v * 6); // 650 ms → 50 ms
    }

    // La durée de l'animation de déplacement suit la vitesse de lecture.
    function applySpeed() {
      const interval = intervalFromSlider();
      board.setAnimDuration(Math.round(Math.min(320, Math.max(90, interval * 0.55))));
      return interval;
    }

    function stopPlayback(silent) {
      if (player) {
        player.pause();
        player = null;
      }
      el.stop.disabled = true;
      if (!silent) setMsg('');
    }

    function updateStats() {
      el.moves.innerHTML = 'Coups : <span class="value">' + state.history.length + '</span>';
      const expected = algo.minMoves(nPegs, nDisks);
      el.min.innerHTML = 'Minimum : <span class="value">' + fmt(expected) + '</span> coups';
    }

    function render(movedDisk) {
      board.render(state, {
        selected,
        moved: movedDisk == null ? null : movedDisk,
      });
      updateStats();
      el.undo.disabled = state.history.length === 0 || !!player;
      el.solve.disabled = !!player;
      el.stop.disabled = !player;
    }

    function setup() {
      stopPlayback(true);
      nDisks = Number(el.disks.value);
      nPegs = Number(el.pegs.value);
      state = new core.TowerState(nDisks, nPegs);
      selected = null;
      board.setup(nDisks, nPegs);
      board.onPegClick = onPegClick;
      board.onDiskClick = onDiskClick;
      render(null);
      setMsg(
        'Cliquez sur le sommet d’un piquet pour saisir un disque, puis sur le piquet de destination.',
        'info'
      );
    }

    function checkWin() {
      if (state.isSolved()) {
        const expected = algo.minMoves(nPegs, nDisks);
        const n = state.history.length;
        const suffix = n === expected
          ? ' — solution optimale !'
          : ' (minimum : ' + fmt(expected) + ' coups).';
        setMsg('Bravo, la tour est transférée en ' + fmt(n) + ' coups' + suffix, 'ok');
        return true;
      }
      return false;
    }

    function tryMove(from, to) {
      const disk = state.top(from);
      if (disk == null) return false;
      if (!state.canMove(from, to)) {
        setMsg('Coup interdit : on ne place jamais un disque sur un disque plus petit.', 'warn');
        return false;
      }
      state.force({ disk, from, to });
      selected = null;
      render(disk);
      checkWin();
      return true;
    }

    function onPegClick(peg) {
      if (player) return;
      if (selected === null) {
        if (state.top(peg) == null) {
          setMsg('Ce piquet est vide.', 'warn');
          return;
        }
        selected = peg;
        setMsg('Disque ' + state.top(peg) + ' saisi — choisissez un piquet de destination.', 'info');
        render(null);
        return;
      }
      if (selected === peg) {
        selected = null;
        setMsg('');
        render(null);
        return;
      }
      if (!tryMove(selected, peg)) {
        if (state.top(peg) != null) {
          selected = peg;
          setMsg('Disque ' + state.top(peg) + ' saisi — choisissez un piquet de destination.', 'info');
          render(null);
        } else {
          selected = null;
          render(null);
        }
      }
    }

    function onDiskClick(disk) {
      if (player) return;
      const peg = state.positionOf(disk);
      if (selected !== null && state.canMove(selected, peg)) {
        tryMove(selected, peg);
        return;
      }
      if (state.top(peg) !== disk) {
        setMsg('Seul le disque du sommet d’un piquet peut être déplacé.', 'warn');
        return;
      }
      onPegClick(peg);
    }

    function solve() {
      stopPlayback(true);
      if (state.history.length > 0) {
        setup();
        setMsg('Le jeu a été réinitialisé pour calculer une solution optimale depuis le début…', 'info');
      }
      const moves = algo.solveMoves(nDisks, nPegs);
      if (nPegs >= 4) {
        setMsg(
          'Lecture automatique (Frame–Stewart, ' + fmt(moves.length) + ' coups) — optimal pour 4 piquets (Bousch, 2014) ; conjecture ouverte au-delà.',
          'info'
        );
      } else {
        setMsg('Lecture automatique de la solution optimale (' + fmt(moves.length) + ' coups).', 'info');
      }
      player = new core.MovePlayer(
        moves,
        (move) => {
          state.force(move);
          render(move.disk);
        },
        () => {
          player = null;
          el.stop.disabled = true;
          el.undo.disabled = state.history.length === 0;
          el.solve.disabled = false;
          checkWin();
        }
      );
      player.setInterval(applySpeed());
      player.play();
      render(null);
    }

    function stop() {
      stopPlayback();
      setMsg('Lecture interrompue à ' + (player ? player.index : 0) + ' coups.', 'warn');
      render(null);
    }

    // Remplissage des listes déroulantes
    function fillSelects() {
      el.pegs.innerHTML = '';
      for (let p = 3; p <= MAX_PEGS; p++) {
        const opt = document.createElement('option');
        opt.value = String(p);
        opt.textContent = p + (p === 3 ? ' piquets (classique)' : ' piquets');
        if (p === 3) opt.selected = true;
        el.pegs.appendChild(opt);
      }
      el.disks.innerHTML = '';
      for (let d = 1; d <= MAX_DISKS; d++) {
        const opt = document.createElement('option');
        opt.value = String(d);
        opt.textContent = String(d);
        if (d === 4) opt.selected = true;
        el.disks.appendChild(opt);
      }
    }

    fillSelects();
    el.pegs.addEventListener('change', setup);
    el.disks.addEventListener('change', setup);
    el.reset.addEventListener('click', () => {
      setup();
    });
    el.undo.addEventListener('click', () => {
      if (player) return;
      const last = state.undo();
      if (last) {
        selected = null;
        setMsg('Coup annulé : disque ' + last.disk + ' revenu sur ' + core.pegName(last.from) + '.', 'info');
        render(null);
      }
    });
    el.solve.addEventListener('click', solve);
    el.stop.addEventListener('click', stop);
    el.speed.addEventListener('input', () => {
      const interval = applySpeed();
      if (player) player.setInterval(interval);
    });
    applySpeed();

    setup();
    return { setup };
  }

  global.HanoiGame = { initGame };
})(window);
