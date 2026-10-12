/* ============================================================
   Tours de Hanoï — algorithmes et génération de pas
   - T_p(n) : nombre minimal de coups avec p piquets (Frame–Stewart)
   - Algorithme récursif (3 piquets) avec suivi de la pile d'appels
   - Algorithme itératif (3 piquets)
   - Frame–Stewart (p ≥ 4 piquets, optimal pour p = 4 — Bousch 2014)
   ============================================================ */

(function (global) {
  'use strict';

  const core = (typeof module !== 'undefined' && module.exports)
    ? require('./core.js')
    : global.HanoiCore;

  const pegName = core ? core.pegName : (i) => String.fromCharCode(65 + i);
  const TowerState = core ? core.TowerState : null;

  /* ---------------------------------------------------------
     T_p(n) : Frame–Stewart (avec mémorisation)
     --------------------------------------------------------- */
  const memoT = new Map();

  function minMoves(p, n) {
    if (n <= 0) return 0;
    if (p <= 2) return n <= 1 ? n : Infinity; // 2 piquets : impossible si n ≥ 2
    if (n === 1) return 1;
    if (p === 3) return Math.pow(2, n) - 1;   // cas classique, exact
    const key = p + ':' + n;
    if (memoT.has(key)) return memoT.get(key);
    let best = Infinity;
    for (let k = 1; k < n; k++) {
      const cost = 2 * minMoves(p, k) + minMoves(p - 1, n - k);
      if (cost < best) best = cost;
    }
    memoT.set(key, best);
    return best;
  }

  function bestSplit(p, n) {
    const rows = [];
    let bestK = 1;
    let bestCost = Infinity;
    for (let k = 1; k < n; k++) {
      const tP = minMoves(p, k);
      const tPm1 = minMoves(p - 1, n - k);
      const cost = 2 * tP + tPm1;
      rows.push({ k, tP, tPm1, cost });
      if (cost < bestCost) {
        bestCost = cost;
        bestK = k;
      }
    }
    return { k: bestK, cost: bestCost, rows, bestK };
  }

  /* ---------------------------------------------------------
     Pseudocodes affichés (HTML coloré)
     --------------------------------------------------------- */
  const PSEUDOCODE = {
    recursive: [
      { n: 1, html: '<span class="kw">procédure</span> Hanoï(n, orig, aux, dest)' },
      { n: 2, html: '  <span class="kw">si</span> n = 0 <span class="kw">alors</span> <span class="kw">retourner</span>' },
      { n: 3, html: '  Hanoï(n−1, orig, dest, aux)   <span class="cm">// étape 1 : n−1 plus petits → aux</span>' },
      { n: 4, html: '  déplacer le disque n : orig → dest' },
      { n: 5, html: '  Hanoï(n−1, aux, orig, dest)   <span class="cm">// étape 3 : n−1 plus petits → dest</span>' },
      { n: 6, html: '<span class="kw">fin procédure</span>' },
    ],
    iterative: [
      { n: 1, html: 'sens ← (n <span class="kw">impair</span>) ? A→C→B→A : A→B→C→A' },
      { n: 2, html: '<span class="kw">répéter</span>' },
      { n: 3, html: '  déplacer le disque 1 dans le sens   <span class="cm">// coup pair</span>' },
      { n: 4, html: '  effectuer l\'<span class="kw">unique</span> autre coup légal  <span class="cm">// coup impair</span>' },
      { n: 5, html: '<span class="kw">tant que</span> la tour n\'est pas sur la destination' },
    ],
    frameStewart: [
      { n: 1, html: '<span class="kw">fonction</span> Hanoï(n, orig, dest, dispo)' },
      { n: 2, html: '  <span class="kw">si</span> n = 0 <span class="kw">alors</span> <span class="kw">retourner</span>' },
      { n: 2.5, html: '  <span class="kw">si</span> n = 1 <span class="kw">alors</span> déplacer orig → dest' },
      { n: 3, html: '  k ← argmin<sub>1≤i&lt;n</sub> [ 2·T<sub>p</sub>(i) + T<sub>p−1</sub>(n−i) ]' },
      { n: 4, html: '  lib ← un piquet de dispo, distinct de orig et dest' },
      { n: 5, html: '  Hanoï(k, orig, lib, dispo)          <span class="cm">// tous les piquets</span>' },
      { n: 6, html: '  Hanoï(n−k, orig, dest, dispo\\{lib}) <span class="cm">// lib bloqué : p−1 piquets</span>' },
      { n: 7, html: '  Hanoï(k, lib, dest, dispo)' },
      { n: 8, html: '<span class="kw">fin fonction</span>' },
    ],
  };

  /* Phrases accordées en français */
  function smaller(c) {
    return c === 1 ? 'le disque le plus petit' : 'les ' + c + ' plus petits disques';
  }
  function larger(c) {
    return c === 1 ? 'le disque le plus gros' : 'les ' + c + ' plus gros disques';
  }
  function pluralDisks(c) {
    return c === 1 ? '1 disque' : c + ' disques';
  }
  function go(c) {
    return c === 1 ? 'va' : 'vont';
  }

  /* ---------------------------------------------------------
     Générateur récursif « nu » (liste de coups, 3 piquets)
     --------------------------------------------------------- */
  function hanoiMoves(n, src, aux, dst, out) {
    if (n <= 0) return out;
    hanoiMoves(n - 1, src, dst, aux, out);
    out.push({ disk: n, from: src, to: dst });
    hanoiMoves(n - 1, aux, src, dst, out);
    return out;
  }

  function movesFromSteps(steps) {
    const out = [];
    for (const s of steps) if (s.move) out.push(s.move);
    return out;
  }

  /** Séquence optimale pour p piquets (Frame–Stewart pour p ≥ 4). */
  function solveMoves(nDisks, nPegs) {
    if (nPegs === 3) return hanoiMoves(nDisks, 0, 1, 2, []);
    return movesFromSteps(frameStewartTrace(nDisks, nPegs));
  }

  /* ---------------------------------------------------------
     Traces (étapes pour la démonstration pas à pas)
     Chaque étape : { kind, line, move, explain, stack?, argmin?, subproblem? }
     --------------------------------------------------------- */

  /** Trace de l'algorithme récursif classique (3 piquets). */
  function recursiveTrace(nDisks) {
    const steps = [];
    const stack = [];
    const snap = () => stack.map((f) => ({ ...f }));

    function hanoi(n, src, aux, dst) {
      stack.push({ n, src, aux, dst, label: `Hanoï(${n}, ${pegName(src)}, ${pegName(aux)}, ${pegName(dst)})` });
      if (n === 0) {
        steps.push({
          kind: 'base',
          line: 2,
          move: null,
          explain: 'Sous-problème « 0 disque » : rien à déplacer, on revient immédiatement à l’appelant.',
          stack: snap(),
        });
        stack.pop();
        return;
      }
      steps.push({
        kind: 'call',
        line: 1,
        move: null,
        explain: `Appel de Hanoï(${n}, ${pegName(src)}, ${pegName(aux)}, ${pegName(dst)}) : transférer ${pluralDisks(n)} de ${pegName(src)} vers ${pegName(dst)}, ${pegName(aux)} servant d’appui.`,
        stack: snap(),
      });
      if (n > 1) {
        steps.push({
          kind: 'phase',
          line: 3,
          move: null,
          explain: `Étape 1 : déplacer ${smaller(n - 1)} de ${pegName(src)} vers ${pegName(aux)} (en utilisant ${pegName(dst)}).`,
          stack: snap(),
        });
        hanoi(n - 1, src, dst, aux);
      }
      steps.push({
        kind: 'move',
        line: 4,
        move: { disk: n, from: src, to: dst },
        explain: `Le disque ${n} — le plus grand de ce sous-problème — est enfin libre : ${pegName(src)} → ${pegName(dst)}. C’est le seul moment où ce disque bouge.`,
        stack: snap(),
      });
      if (n > 1) {
        steps.push({
          kind: 'phase',
          line: 5,
          move: null,
          explain: `Étape 3 : replacer ${smaller(n - 1)} de ${pegName(aux)} vers ${pegName(dst)}, par-dessus le disque ${n}.`,
          stack: snap(),
        });
        hanoi(n - 1, aux, src, dst);
      }
      stack.pop();
      steps.push({
        kind: 'ret',
        line: 6,
        move: null,
        explain: `Fin de Hanoï(${n}, …) : la tour de ${pluralDisks(n)} est bien installée sur ${pegName(dst)}.`,
        stack: snap(),
      });
    }

    hanoi(nDisks, 0, 1, 2);
    return steps;
  }

  /**
   * Trace de l'algorithme itératif (3 piquets).
   * Règle : déplacer le plus petit disque une fois sur deux, dans le sens
   * A→C→B→A si n est impair, A→B→C→A si n est pair ; sinon jouer l'unique
   * autre coup légal.
   */
  function iterativeTrace(nDisks) {
    const steps = [];
    const step = (nDisks % 2 === 1) ? 2 : 1; // 2 : A→C→B→A ; 1 : A→B→C→A
    const nextPeg = (from) => (from + step) % 3;
    const sens = step === 1 ? 'A → B → C → A' : 'A → C → B → A';

    const state = new TowerState(nDisks, 3);

    steps.push({
      kind: 'init',
      line: 1,
      move: null,
      explain: `n = ${nDisks} est ${nDisks % 2 === 1 ? 'impair' : 'pair'} : le plus petit disque sera déplacé une fois sur deux dans le sens ${sens}.`,
    });

    let counter = 0;
    while (!state.isSolved()) {
      counter += 1;
      if (counter % 2 === 1) {
        const from = state.positionOf(1);
        const to = nextPeg(from);
        state.force({ disk: 1, from, to });
        steps.push({
          kind: 'move',
          line: 3,
          move: { disk: 1, from, to },
          explain: `Coup ${counter} : le plus petit disque avance toujours dans le sens imposé — disque 1 : ${pegName(from)} → ${pegName(to)}.`,
        });
      } else {
        let found = null;
        for (let from = 0; from < 3 && !found; from++) {
          if (state.top(from) === 1) continue;
          for (let to = 0; to < 3; to++) {
            if (state.canMove(from, to)) {
              found = { from, to };
              break;
            }
          }
        }
        if (!found) break;
        const disk = state.top(found.from);
        state.force(found);
        steps.push({
          kind: 'move',
          line: 4,
          move: { disk, from: found.from, to: found.to },
          explain: `Coup ${counter} : le disque 1 ne bouge pas ; l’unique autre coup légal est disque ${disk} : ${pegName(found.from)} → ${pegName(found.to)}.`,
        });
      }
      if (counter > 2 * Math.pow(2, nDisks) + 4) break; // garde-fou
    }

    steps.push({
      kind: 'done',
      line: 5,
      move: null,
      explain: `Victoire en ${counter} coups — soit exactement 2^${nDisks} − 1 = ${Math.pow(2, nDisks) - 1}.`,
    });
    return steps;
  }

  /**
   * Trace de l'algorithme Frame–Stewart (p ≥ 4 piquets).
   * Optimal pour p = 4 (Bousch, 2014) ; conjecture ouverte pour p ≥ 5.
   */
  function frameStewartTrace(nDisks, nPegs) {
    if (nPegs < 3) throw new Error('Frame–Stewart nécessite au moins 3 piquets');
    if (nPegs === 3) return recursiveTrace(nDisks);

    const steps = [];
    const stack = [];
    const snap = () => stack.map((f) => ({ ...f }));

    function hanoi(n, src, dst, avail) {
      stack.push({ n, src, dst, p: avail.length, label: `Hanoï(${n}, ${pegName(src)}→${pegName(dst)}, ${avail.length} piquets)` });
      if (n === 0) {
        steps.push({
          kind: 'base',
          line: 2,
          move: null,
          explain: 'Sous-problème avec 0 disque : rien à faire.',
          stack: snap(),
        });
        stack.pop();
        return;
      }
      if (n === 1) {
        steps.push({
          kind: 'move',
          line: 2.5,
          move: { disk: 1, from: src, to: dst },
          explain: `Un seul disque à déplacer : ${pegName(src)} → ${pegName(dst)} (1 coup, aucun sous-problème).`,
          stack: snap(),
        });
        stack.pop();
        return;
      }

      const p = avail.length;
      const { k, cost, rows } = bestSplit(p, n);
      const others = avail.filter((x) => x !== src && x !== dst);
      const lib = others[0];

      steps.push({
        kind: 'split',
        line: 3,
        move: null,
        subproblem: { n, src, dst, p, k, cost },
        argmin: { p, n, rows, bestK: k },
        explain: `Sous-problème : transférer ${pluralDisks(n)} de ${pegName(src)} vers ${pegName(dst)} avec ${p} piquets. On choisit la coupure optimale k = ${k} : 2·T${p}(${k}) + T${p - 1}(${n - k}) = ${cost} coups.`,
        stack: snap(),
      });
      steps.push({
        kind: 'phase',
        line: 5,
        move: null,
        explain: `Phase 1 : ${smaller(k)} ${go(k)} de ${pegName(src)} vers ${pegName(lib)}, en utilisant les ${p} piquets.`,
        stack: snap(),
      });
      hanoi(k, src, lib, avail);

      const reduced = avail.filter((x) => x !== lib);
      steps.push({
        kind: 'phase',
        line: 6,
        move: null,
        explain: `Phase 2 : ${larger(n - k)} ${go(n - k)} de ${pegName(src)} vers ${pegName(dst)} avec seulement ${reduced.length} piquets, ${pegName(lib)} étant occupé par la petite tour.`,
        stack: snap(),
      });
      hanoi(n - k, src, dst, reduced);

      steps.push({
        kind: 'phase',
        line: 7,
        move: null,
        explain: `Phase 3 : la petite tour revient de ${pegName(lib)} vers ${pegName(dst)}, à nouveau avec tous les piquets.`,
        stack: snap(),
      });
      hanoi(k, lib, dst, avail);

      stack.pop();
      steps.push({
        kind: 'ret',
        line: 8,
        move: null,
        explain: `Sous-problème résolu : ${pluralDisks(n)} transféré${n > 1 ? 's' : ''} de ${pegName(src)} vers ${pegName(dst)} en ${cost} coups.`,
        stack: snap(),
      });
    }

    const all = Array.from({ length: nPegs }, (_, i) => i);
    steps.push({
      kind: 'init',
      line: 1,
      move: null,
      explain: `Frame–Stewart avec ${nPegs} piquets et ${nDisks} disques : ${minMoves(nPegs, nDisks)} coups au minimum (algorithme optimal pour 4 piquets, conjecturé optimal au-delà).`,
    });
    hanoi(nDisks, 0, nPegs - 1, all);
    return steps;
  }

  const api = {
    minMoves,
    bestSplit,
    hanoiMoves,
    solveMoves,
    movesFromSteps,
    recursiveTrace,
    iterativeTrace,
    frameStewartTrace,
    PSEUDOCODE,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.HanoiAlgorithms = api;
})(typeof window !== 'undefined' ? window : globalThis);
