// Timeline engine for the brand-engine animation. Every element gets an initial state plus a list
// of tweens ("tracks"); render(t) folds the tracks up to time t and writes transform/opacity.
// The whole cycle loops, pauses while off screen, and shows a single still frame for reduced motion.

type Ease = 'io' | 'out' | 'back' | 'lin';
/** abs: positioned by centre on the stage; rel: offset from its CSS position; group: engine group; op: opacity only */
type Mode = 'abs' | 'rel' | 'group' | 'op';

/** h: explicit height in px (0 = leave the CSS height alone) */
interface State { x: number; y: number; s: number; r: number; o: number; f: number; dx: number; dy: number; h: number }
interface Track { to: Partial<State>; start: number; dur: number; ease: Ease }
interface Item { el: HTMLElement; mode: Mode; tracks: Track[]; phase: number; init: State }

declare global {
  interface Window { __beSeek?: (t: number) => void; __beTotal?: number }
}

const EASE: Record<Ease, (p: number) => number> = {
  io: (p) => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  out: (p) => 1 - Math.pow(1 - p, 3),
  back: (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  lin: (p) => p,
};

// ---------- Layout constants (stage is 720 x 900)
const STAGE_W = 720;
// The platform panel (engine + docked prompt), in engine-group coordinates. The group scales
// around (360, 450). The panel is 680 wide with its top edge fixed at y 275: it starts 322 tall
// (just the Look/Message zones) and grows to 418 once the pieces are in, revealing the prompt.
const PANEL = { top: 275, short: 322, tall: 418, promptY: 635 };
const ENG = { cx: 360, cy: 162, s: .8 };         // engine group after it moves to the top
const engPos = (x: number, y: number): [number, number] => [ENG.cx + (x - 360) * ENG.s, ENG.cy + (y - 450) * ENG.s];
const PROMPT = { x: 360, y: engPos(360, PANEL.promptY)[1] };  // the prompt on stage, once docked at the top
const OUT_Y = 658;                               // centre of the output area

// ---------- Brand pieces: [id, scatterX, scatterY, rot, engineX, engineY, engineScale, dotColour]
type Piece = [string, number, number, number, number, number, number, string];
const P: Piece[] = [
  // Look zone (x 38–352): 3 x 3 grid on columns 93 / 195 / 297. Message zone (x 368–682): chips
  // stacked on x 525, scaled so they span the zone with a 14px inset (348 * .82 ≈ 286).
  ['pc-ink', 110, 120, -6, 93, 370, .85, 'var(--dot-ink)'], ['pc-coral', 600, 110, 8, 195, 370, .85, 'var(--coral)'], ['pc-teal', 590, 790, -4, 297, 370, .85, 'var(--teal)'],
  ['pc-sand', 120, 800, 5, 93, 448, .85, '#D9C9AC'], ['pc-serif', 330, 90, -8, 195, 450, .7, 'var(--dot-ink)'], ['pc-sans', 630, 440, 6, 297, 450, .85, 'var(--dot-ink)'],
  ['pc-quarter', 90, 480, -12, 93, 526, .85, 'var(--coral)'], ['pc-square', 470, 190, 14, 195, 526, 1, 'var(--teal)'], ['pc-grid', 360, 830, -6, 297, 526, .85, 'var(--dot-ink)'],
  ['pc-pos', 190, 250, -4, 525, 353, .82, 'var(--coral)'], ['pc-one', 520, 330, 5, 525, 401, .82, 'var(--coral)'], ['pc-voice', 200, 690, 3, 525, 449, .82, 'var(--teal)'],
  ['pc-proof', 520, 610, -3, 525, 497, .82, 'var(--coral)'], ['pc-aud', 380, 460, 2, 525, 545, .82, 'var(--dot-ink)'],
];
const FLY_ORDER = [0, 9, 1, 4, 10, 2, 6, 11, 3, 5, 12, 7, 13, 8];

// ---------- The cycle of things to make: [element id, prompt text, scale]
const OUTPUTS: [string, string, number][] = [
  ['o-site', 'Website', 1],
  ['o-deck', 'Pitch deck', 1],
  ['o-ad', 'LinkedIn ad', .95],
  ['o-report', 'Annual report', 1],
  ['o-tee', 'T-shirt', 1],
  ['o-stat', 'Business card and letterhead', 1],
  ['o-social', 'Social posts', 1],
  ['o-motion', 'Company explainer', 1],
];
const START = 8.4, HOLD = 1.5;

export function initBrandEngine(root: HTMLElement): void {
  const $ = (id: string) => root.querySelector<HTMLElement>('#' + id)!;
  const stage = $('be-stage');
  const items: Item[] = [];
  const byEl = new Map<HTMLElement, Item>();

  function add(el: HTMLElement, init: Partial<State> = {}, mode: Mode = 'abs'): HTMLElement {
    const it: Item = {
      el, mode, tracks: [], phase: items.length * 1.7,
      init: { x: 0, y: 0, s: 1, r: 0, o: 1, f: 0, dx: 0, dy: 0, h: 0, ...init },
    };
    items.push(it); byEl.set(el, it); return el;
  }
  function tw(el: HTMLElement, to: Partial<State>, start: number, dur: number, ease: Ease = 'io') {
    byEl.get(el)!.tracks.push({ to, start, dur: Math.max(dur, .001), ease });
  }

  // ---------- Brand pieces float in, then fly into the engine
  P.forEach((d, i) => {
    const el = add($(d[0]), { x: d[1], y: d[2], r: d[3], s: .6, o: 0, f: 1 });
    tw(el, { o: 1, s: 1 }, .1 + i * .06, .6, 'back');
  });
  FLY_ORDER.forEach((idx, k) => {
    const d = P[idx];
    tw($(d[0]), { x: d[4], y: d[5], s: d[6], r: 0, f: 0 }, 3.7 + k * .07, .9, 'io');
  });

  // ---------- Engine
  const group = add($('be-group'), {}, 'group');
  // abs items are centred on y, so the panel's centre moves with its height to keep the top edge put
  const engine = add($('engine'), { x: 360, y: PANEL.top + PANEL.short / 2, h: PANEL.short, s: .94, o: 0 });
  tw(engine, { o: 1, s: 1 }, 3.3, .6, 'out');
  const ring = add($('ring'), { x: 360, y: PANEL.top + PANEL.short / 2, o: 0 });
  tw(ring, { o: .8 }, 5.85, .15, 'lin');
  tw(ring, { o: 0, s: 1.08 }, 6.0, .7, 'out');
  tw(group, { dy: ENG.cy - 450, s: ENG.s }, 6.6, .9, 'io');

  // ---------- Prompt: once the pieces are in and the panel is up top, the panel grows and the prompt slides in
  tw(engine, { h: PANEL.tall, y: PANEL.top + PANEL.tall / 2 }, 7.35, .55, 'io');
  const prompt = add($('prompt'), { x: 360, y: PANEL.promptY + 14, s: .97, o: 0 });
  tw(prompt, { o: 1, y: PANEL.promptY, s: 1 }, 7.6, .5, 'out');
  const pglow = add($('pglow'), { x: 360, y: PANEL.promptY, o: 0 });
  const send = add($('send'), {}, 'rel');
  const ptext = $('ptext');
  const typing: { start: number; dur: number; str: string; del?: boolean }[] = [];
  let lastText: string | null = null;

  // ---------- Outputs
  const dotsHost = $('dots');
  let base = START, prevStr: string | null = null, lastBuilt = 0, stillT = 0;

  OUTPUTS.forEach(([id, str, sc], i) => {
    const typeDur = Math.max(.7, str.length * .065);
    if (prevStr) typing.push({ start: base - .55, dur: .4, str: prevStr, del: true });
    typing.push({ start: base, dur: typeDur, str });
    prevStr = str;
    const go = base + typeDur + .25;               // "send"
    tw(send, { s: .84 }, go, .1, 'out'); tw(send, { s: 1 }, go + .1, .25, 'out');

    // output grows out from behind the prompt
    const el = $(id), emerge = go + .75;
    const w = el.offsetWidth, h = el.offsetHeight;
    const cy = OUT_Y + (h > 450 ? 5 : 0);
    add(el, { x: 360, y: PROMPT.y, s: .2 * sc, o: 0 });
    tw(el, { o: 1 }, emerge, .25, 'lin');
    tw(el, { y: cy, s: sc }, emerge, .8, 'out');

    const parts = el.querySelectorAll<HTMLElement>('.p');
    parts.forEach((p, k) => {
      const ps = emerge + .3 + k * .2;
      add(p, { o: 0, y: 10 }, 'rel');
      tw(p, { o: 1, y: 0 }, ps, .45, 'out');
      // where this part ends up on stage
      const tx = 360 - w * sc / 2 + (p.offsetLeft + p.offsetWidth / 2) * sc;
      const ty = cy - h * sc / 2 + (p.offsetTop + p.offsetHeight / 2) * sc;
      // two dots per part: engine -> behind the prompt -> onto the part as it appears
      for (let j = 0; j < 2; j++) {
        const src = P[(i * 5 + k * 3 + j * 7) % P.length], sp = engPos(src[4], src[5]);
        const d = document.createElement('div');
        d.className = 'a dotf'; d.style.background = src[7];
        dotsHost.appendChild(d);
        add(d, { x: sp[0], y: sp[1], o: 0 });
        const ds = ps - .95 + j * .08;
        tw(d, { o: 1 }, ds, .1, 'lin');
        tw(d, { x: PROMPT.x - 60 + ((k * 2 + j) % 5) * 30, y: PROMPT.y }, ds, .45, 'io');
        tw(d, { x: tx + (j ? 12 : -12), y: ty + (j ? 5 : -5), s: .8 }, ds + .45, .5, 'io');
        tw(d, { o: 0, s: 1.8 }, ds + .95, .25, 'out');
      }
    });

    const built = emerge + .3 + (parts.length - 1) * .2 + .45;
    tw(pglow, { o: 1 }, go, .2, 'out'); tw(pglow, { o: 0 }, built - .3, .5, 'io');
    if (i === 0) stillT = built + .3;

    const hold = built + HOLD;
    if (i < OUTPUTS.length - 1) tw(el, { o: 0, y: cy + 24, s: sc * .97 }, hold, .4, 'io');
    base = hold + .6;
    lastBuilt = built;
  });
  const TOTAL = lastBuilt + 3.0;

  const all = add($('be-all'), {}, 'op');
  tw(all, { o: 0 }, TOTAL - .7, .6, 'io');

  items.forEach((it) => it.tracks.sort((a, b) => a.start - b.start));

  // ---------- Render
  function render(t: number) {
    for (const it of items) {
      const s: State = { ...it.init };
      for (const tr of it.tracks) {
        if (t <= tr.start) break;
        const e = EASE[tr.ease](Math.min(1, (t - tr.start) / tr.dur));
        for (const k in tr.to) {
          const key = k as keyof State;
          s[key] = s[key] + (tr.to[key]! - s[key]) * e;
        }
      }
      const st = it.el.style;
      let y = s.y, r = s.r;
      if (s.f > 0) { y += Math.sin(t * 1.4 + it.phase) * 7 * s.f; r += Math.sin(t * 1.1 + it.phase) * 2.5 * s.f; }
      if (it.mode === 'abs') st.transform = `translate(${s.x}px,${y}px) translate(-50%,-50%) rotate(${r}deg) scale(${s.s})`;
      else if (it.mode === 'rel') st.transform = `translate(${s.x}px,${y}px) rotate(${r}deg) scale(${s.s})`;
      else if (it.mode === 'group') st.transform = `translate(${s.dx}px,${s.dy}px) scale(${s.s})`;
      if (s.h > 0) st.height = `${s.h}px`;
      const o = Math.max(0, Math.min(1, s.o));
      st.opacity = String(o);
      st.visibility = o < .005 ? 'hidden' : 'visible';
    }
    let shown = '';
    for (const ev of typing) {
      if (t < ev.start) break;
      const p = Math.min(1, (t - ev.start) / ev.dur), len = ev.str.length;
      shown = ev.del ? ev.str.slice(0, Math.round(len * (1 - p))) : ev.str.slice(0, Math.ceil(len * p));
    }
    if (shown !== lastText) {
      lastText = shown;
      ptext.innerHTML = shown
        ? shown.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '<span class="caret"></span>'
        : '<span class="caret"></span><span class="ph">What do you want to create?</span>';
    }
  }

  // ---------- Scale to container
  const fit = () => { stage.style.transform = `scale(${root.clientWidth / STAGE_W})`; };
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(root); else window.addEventListener('resize', fit);

  // ---------- Clock (pauses off screen; reduced motion gets a still frame)
  let t = 0, last: number | null = null, visible = true, frozen = false;
  window.__beSeek = (v) => { frozen = true; t = v; render(t); };
  window.__beTotal = TOTAL;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { render(stillT); return; }
  if (window.IntersectionObserver) new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(root);
  function frame(now: number) {
    if (!frozen) {
      if (last !== null && visible) t = (t + Math.min(.05, (now - last) / 1000)) % TOTAL;
      render(t);
    }
    last = now;
    requestAnimationFrame(frame);
  }
  render(0);
  requestAnimationFrame(frame);
}
