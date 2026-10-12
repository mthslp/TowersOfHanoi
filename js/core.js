/* ============================================================
   Tours de Hanoï — noyau commun
   Modèle d'état, validation des coups, rendu SVG et lecteur de
   séquence de coups.
   ============================================================ */

(function (global) {
  'use strict';

  const PEG_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  /* Couleurs des disques (échantillonnage de teintes) */
  const DISK_COLORS = [
    '#e5484d', '#f76808', '#ffb224', '#99d52a', '#2bc48a',
    '#12a594', '#0091ff', '#3e63dd', '#8e4ec6', '#d6409f',
    '#8d8d96', '#6e6e78',
  ];

  function pegName(i) {
    return PEG_NAMES[i] != null ? PEG_NAMES[i] : String.fromCharCode(65 + i);
  }

  function diskColor(disk) {
    return DISK_COLORS[(disk - 1) % DISK_COLORS.length];
  }

  /* ---------------------------------------------------------
     État du jeu : pegs[i] = pile du piquet i, du bas (index 0)
     vers le haut. Les tailles de disques vont de 1 (plus petit)
     à n (plus grand).
     --------------------------------------------------------- */
  class TowerState {
    constructor(nDisks, nPegs) {
      this.reset(nDisks, nPegs);
    }

    reset(nDisks, nPegs) {
      this.nDisks = nDisks;
      this.nPegs = nPegs;
      this.pegs = Array.from({ length: nPegs }, () => []);
      for (let d = nDisks; d >= 1; d--) this.pegs[0].push(d);
      this.history = [];
      return this;
    }

    top(peg) {
      const p = this.pegs[peg];
      return p.length ? p[p.length - 1] : null;
    }

    positionOf(disk) {
      for (let i = 0; i < this.nPegs; i++) {
        const idx = this.pegs[i].indexOf(disk);
        if (idx !== -1) return i;
      }
      return -1;
    }

    canMove(from, to) {
      if (from === to) return false;
      if (from < 0 || to < 0 || from >= this.nPegs || to >= this.nPegs) return false;
      const t = this.top(from);
      if (t === null) return false;
      const d = this.top(to);
      return d === null || d > t;
    }

    legalTargets(from) {
      const out = [];
      if (this.top(from) === null) return out;
      for (let to = 0; to < this.nPegs; to++) {
        if (this.canMove(from, to)) out.push(to);
      }
      return out;
    }

    apply(move) {
      if (!this.canMove(move.from, move.to)) return false;
      const disk = this.pegs[move.from].pop();
      this.pegs[move.to].push(disk);
      this.history.push({ disk, from: move.from, to: move.to });
      return true;
    }

    /** Applique un coup sans vérification (séquences d'algorithmes valides). */
    force(move) {
      const disk = this.pegs[move.from].pop();
      this.pegs[move.to].push(disk);
      this.history.push({ disk, from: move.from, to: move.to });
      return this;
    }

    undo() {
      const last = this.history.pop();
      if (!last) return null;
      this.pegs[last.from].push(this.pegs[last.to].pop());
      return last;
    }

    /** Résolu : tous les disques sur le piquet de destination (le dernier). */
    isSolved() {
      const dest = this.nPegs - 1;
      return (
        this.pegs[dest].length === this.nDisks &&
        this.pegs[dest].every((d, i) => d === this.nDisks - i)
      );
    }

    clone() {
      const s = new TowerState(this.nDisks, this.nPegs);
      s.pegs = this.pegs.map((p) => p.slice());
      s.history = this.history.map((m) => ({ ...m }));
      return s;
    }

    /** Signature compacte de l'état (pour comparaisons). */
    signature() {
      return this.pegs.map((p) => p.join(',')).join('|');
    }
  }

  /* ---------------------------------------------------------
     Rendu SVG animé
     --------------------------------------------------------- */
  class Board {
    constructor(svg) {
      this.svg = svg;
      this.diskEls = new Map(); // disque -> <g>
      this.pegEls = [];
      this.nDisks = 0;
      this.nPegs = 0;
      this.selected = null; // piquet sélectionné (ou null)
      this.highlightTargets = [];
      this.movedDisks = new Set();
      this.onPegClick = null;
    }

    geometry() {
      const nPegs = this.nPegs;
      const marginX = 26;
      const pegGap = Math.max(78, Math.min(120, 720 / Math.max(nPegs, 1)));
      const width = marginX * 2 + pegGap * (nPegs - 1);
      const baseY = 232;
      const rodH = 170;
      const diskH = Math.max(12, Math.min(20, 150 / Math.max(this.nDisks, 1)));
      return { width, height: 275, baseY, rodH, diskH, pegGap, marginX };
    }

    pegX(i) {
      const g = this.geometry();
      return g.marginX + g.pegGap * i;
    }

    diskWidth(disk) {
      const g = this.geometry();
      const minW = 34;
      const maxW = Math.min(g.pegGap - 8, 110);
      const t = (disk - 1) / Math.max(this.nDisks - 1, 1);
      return minW + (maxW - minW) * t;
    }

    diskY(pegIndex, stackIndex) {
      const g = this.geometry();
      return g.baseY - 6 - g.diskH * (stackIndex + 1);
    }

    setup(nDisks, nPegs) {
      this.nDisks = nDisks;
      this.nPegs = nPegs;
      this.selected = null;
      this.highlightTargets = [];
      this.movedDisks.clear();
      const g = this.geometry();
      const ns = 'http://www.w3.org/2000/svg';
      this.svg.setAttribute('viewBox', `0 0 ${g.width} ${g.height}`);
      while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
      this.diskEls.clear();
      this.pegEls = [];

      const self = this;

      for (let i = 0; i < nPegs; i++) {
        const x = this.pegX(i);
        const group = document.createElementNS(ns, 'g');
        group.setAttribute('class', 'peg');

        const base = document.createElementNS(ns, 'rect');
        base.setAttribute('class', 'peg-base');
        base.setAttribute('x', x - g.pegGap / 2 + 6);
        base.setAttribute('y', g.baseY);
        base.setAttribute('width', g.pegGap - 12);
        base.setAttribute('height', 10);
        base.setAttribute('rx', 4);

        const rod = document.createElementNS(ns, 'rect');
        rod.setAttribute('class', 'peg-rod');
        rod.setAttribute('x', x - 5);
        rod.setAttribute('y', g.baseY - g.rodH);
        rod.setAttribute('width', 10);
        rod.setAttribute('height', g.rodH);
        rod.setAttribute('rx', 4);

        const label = document.createElementNS(ns, 'text');
        label.setAttribute('class', 'peg-label');
        label.setAttribute('x', x);
        label.setAttribute('y', g.baseY + 26);
        label.textContent = pegName(i);

        const hit = document.createElementNS(ns, 'rect');
        hit.setAttribute('class', 'peg-hit');
        hit.setAttribute('x', x - g.pegGap / 2);
        hit.setAttribute('y', 0);
        hit.setAttribute('width', g.pegGap);
        hit.setAttribute('height', g.baseY + 32);
        hit.addEventListener('click', () => {
          if (self.onPegClick) self.onPegClick(i);
        });

        group.appendChild(base);
        group.appendChild(rod);
        group.appendChild(label);
        group.appendChild(hit);
        this.svg.appendChild(group);
        this.pegEls.push({ group, base, rod, label, hit });
      }

      // Crée les éléments de disques
      for (let disk = 1; disk <= nDisks; disk++) {
        const gEl = document.createElementNS(ns, 'g');
        gEl.setAttribute('class', 'disk');
        gEl.setAttribute('data-disk', String(disk));

        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('class', 'body');
        rect.setAttribute('rx', 5);

        const txt = document.createElementNS(ns, 'text');
        txt.setAttribute('class', 'label');
        txt.textContent = String(disk);

        gEl.appendChild(rect);
        gEl.appendChild(txt);
        gEl.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (self.onDiskClick) self.onDiskClick(disk);
        });
        this.svg.appendChild(gEl);
        this.diskEls.set(disk, { g: gEl, rect, txt, w: this.diskWidth(disk) });
      }
    }

    positionDisks(state, animate) {
      const g = this.geometry();
      const moved = this.movedDisks;

      // Enregistre les positions courantes avant déplacement (pour l'anim,
      // les transforms CSS sont déjà appliqués).
      for (let peg = 0; peg < state.nPegs; peg++) {
        const pile = state.pegs[peg];
        for (let k = 0; k < pile.length; k++) {
          const disk = pile[k];
          const el = this.diskEls.get(disk);
          if (!el) continue;
          const x = this.pegX(peg) - el.w / 2;
          const y = this.diskY(peg, k);
          el.g.style.transform = `translate(${x}px, ${y}px)`;
          el.rect.setAttribute('width', String(el.w));
          el.rect.setAttribute('height', String(g.diskH));
          el.rect.setAttribute('fill', diskColor(disk));
          el.txt.setAttribute('x', String(el.w / 2));
          el.txt.setAttribute('y', String(g.diskH / 2 + 1));
          el.txt.style.display = this.nDisks > 9 ? 'none' : '';
          el.g.classList.toggle('selected', this.selected === peg && k === pile.length - 1);
          el.g.classList.toggle('moved', moved.has(disk));
        }
      }

      if (!animate) {
        // Force un reflow pour éviter une animation parasite au premier rendu.
        void this.svg.getBoundingClientRect();
      }
    }

    setSelected(peg) {
      this.selected = peg;
      this.highlightTargets = peg === null || peg === undefined
        ? []
        : this.legalTargetsFor(peg);
      this.refreshHighlights();
    }

    legalTargetsFor(peg) {
      if (!this.lastState) return [];
      const targets = [];
      for (let to = 0; to < this.nPegs; to++) {
        if (this.lastState.canMove(peg, to)) targets.push(to);
      }
      return targets;
    }

    markMoved(disk) {
      this.movedDisks = new Set(disk === null ? [] : [disk]);
    }

    refreshHighlights() {
      for (let i = 0; i < this.nPegs; i++) {
        const { group } = this.pegEls[i];
        group.classList.toggle('peg-target', this.highlightTargets.includes(i));
        group.classList.toggle('peg-source', this.selected === i);
      }
    }

    render(state, opts) {
      const options = opts || {};
      this.lastState = state;
      if (options.selected !== undefined) this.selected = options.selected;
      if (options.moved !== undefined) this.markMoved(options.moved);
      if (this.selected === null || this.selected === undefined) {
        this.highlightTargets = [];
      } else {
        this.highlightTargets = state.legalTargets(this.selected);
      }
      this.refreshHighlights();
      this.positionDisks(state, options.animate !== false);
    }
  }

  /* ---------------------------------------------------------
     Lecteur de séquence de coups (animation)
     --------------------------------------------------------- */
  class MovePlayer {
    /**
     * @param {Array<{disk:number,from:number,to:number}>} moves
     * @param {(move:object, index:number)=>void} onMove
     * @param {()=>void} onDone
     */
    constructor(moves, onMove, onDone) {
      this.moves = moves;
      this.onMove = onMove;
      this.onDone = onDone;
      this.index = 0;
      this.timer = null;
      this.interval = 320;
      this.playing = false;
    }

    get total() { return this.moves.length; }
    get finished() { return this.index >= this.moves.length; }

    setInterval(ms) {
      this.interval = Math.max(40, ms);
      if (this.playing) {
        this.pause();
        this.play();
      }
    }

    play() {
      if (this.playing || this.finished) return;
      this.playing = true;
      const tick = () => {
        if (!this.playing) return;
        if (this.finished) {
          this.pause();
          if (this.onDone) this.onDone();
          return;
        }
        const move = this.moves[this.index];
        this.onMove(move, this.index);
        this.index += 1;
        this.timer = setTimeout(tick, this.interval);
      };
      tick();
    }

    pause() {
      this.playing = false;
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    }

    stop() {
      this.pause();
      this.index = 0;
    }
  }

  const api = { TowerState, Board, MovePlayer, pegName, diskColor, PEG_NAMES, DISK_COLORS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.HanoiCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
