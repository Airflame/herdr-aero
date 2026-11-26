// Floating terminal windows. Every terminal of the shown space is a window:
//   normal  a floating overlay window (drag by its title, resize by its bottom
//           edge or corner), holding the live terminal
//   min     only its taskbar button
//   max     the layout's full view (the "main" block: the tab, that pane zoomed)
// State lives in shared("aero.wins"): { [terminal]: { state, w, h } }. The
// taskbar (always shown) keeps the overlays and the main block in step with it.

import { shared, setShared, openOverlay, closeOverlay, run, panes, spaces, focused, layout, settings } from "herdr";

export const MIN_W = 360;
export const MIN_H = 200;
const DEF_W = 780;
const DEF_H = 470;
export const EDGE = 6; // glass at the sides, px
export const BOTTOM = 9; // the resize strip, px
export const TITLE = 28;

export function zoom() {
  return Number(settings()?.zoom) || 1;
}

export function wins() {
  return shared("aero.wins") ?? {};
}

export function winOf(addr) {
  return wins()[addr] ?? { state: "normal" };
}

/** Changes one window's state; maximizing one restores any other maximized one. */
export function setWin(addr, patch) {
  const all = { ...wins() };
  all[addr] = { state: "normal", ...(all[addr] ?? {}), ...patch };
  if (patch.state === "max")
    for (const k of Object.keys(all)) if (k !== addr && all[k].state === "max") all[k] = { ...all[k], state: "normal" };
  setShared("aero.wins", all);
}

/** The shown space's terminal panes, in tab order. */
export function windowPanes() {
  const sp = spaces().find((s) => s.active);
  if (!sp) return [];
  const order = new Map(sp.tabs.map((t, i) => [t.id, i]));
  return panes()
    .filter((p) => p.terminal && order.has(p.tab))
    .sort((a, b) => order.get(a.tab) - order.get(b.tab));
}

function key(addr) {
  return `aero-win-${String(addr).replace(/[^\w-]/g, "_")}`;
}

function spec(p, w, h, at) {
  const block = (role, px) => ({ type: "block", size: { px }, content: { mod: "herdr-aero", props: { role, terminal: p.terminal, pane: p.pane } } });
  return {
    kind: "window",
    frame: "none",
    key: key(p.terminal),
    width: w,
    height: h,
    ...(at ? { at } : {}),
    layout: {
      type: "row",
      background: "#8eb4dfd9",
      radius: 8,
      border: { width: 1, color: "#00000077" },
      children: [
        block("floatside", EDGE),
        {
          type: "column",
          children: [
            block("float", TITLE),
            { type: "block", border: { width: 1, color: "#3f5e86aa" }, content: { terminal: p.terminal } },
            block("floatedge", BOTTOM),
          ],
        },
        block("floatside", EDGE),
      ],
    },
  };
}

/**
 * Keeps the overlays and the main block in step with the state. `self` is the
 * taskbar's instance (it remembers what it opened). Safe to call on every render.
 */
export function syncWindows(self) {
  self.open ??= {}; // terminal -> { id, w, h, p }
  const list = windowPanes();
  let st = shared("aero.wins");
  // First time: the focused terminal stays full screen, as before.
  if (st == null) {
    const f = focused()?.terminal;
    st = f ? { [f]: { state: "max" } } : {};
    setShared("aero.wins", st);
  }
  const f = focused();

  // Going to a tab elsewhere (a click on an agent, a key) while one is maximized:
  // the maximized one floats again, and the one gone to comes up as a window.
  const max = list.find((p) => st[p.terminal]?.state === "max");
  if (max && f?.tab && f.tab !== max.tab && self.lastTab && f.tab !== self.lastTab) {
    const all = { ...st, [max.terminal]: { ...st[max.terminal], state: "normal" } };
    const to = list.find((p) => p.tab === f.tab && p.focused) ?? list.find((p) => p.tab === f.tab);
    if (to && all[to.terminal]?.state === "min") all[to.terminal] = { ...all[to.terminal], state: "normal" };
    setShared("aero.wins", all);
    st = all;
  }
  self.lastTab = f?.tab ?? self.lastTab;

  // Windows that should float.
  const want = new Map();
  list.forEach((p) => {
    if ((st[p.terminal]?.state ?? "normal") === "normal") want.set(p.terminal, p);
  });
  for (const addr of Object.keys(self.open)) {
    if (!want.has(addr)) {
      closeOverlay(self.open[addr].id);
      delete self.open[addr];
    }
  }
  let fresh = 0;
  const firsts = {};
  for (const [addr, p] of want) {
    const s = st[addr] ?? {};
    const w = Math.max(MIN_W, s.w ?? DEF_W);
    const h = Math.max(MIN_H, s.h ?? DEF_H);
    const o = self.open[addr];
    if (o && o.w === w && o.h === h) continue;
    // A brand-new window cascades; any other opens where it was left.
    let at;
    if (s.w == null) {
      const n = Object.keys(self.open).length + fresh++;
      at = { x: (110 + 32 * (n % 8)) * zoom(), y: (24 + 32 * (n % 8)) * zoom() };
      firsts[addr] = { ...s, state: s.state ?? "normal", w, h };
    }
    self.open[addr] = { id: openOverlay(spec(p, w, h, at)), w, h };
  }
  if (Object.keys(firsts).length) setShared("aero.wins", { ...wins(), ...firsts });

  // The main block shows only a maximized window.
  const nowMax = list.find((p) => (st[p.terminal]?.state ?? "normal") === "max");
  if (nowMax) {
    if (self.maxShown !== nowMax.terminal) {
      self.maxShown = nowMax.terminal;
      run("tab.select", { id: nowMax.tab });
      const sameTab = list.filter((p) => p.tab === nowMax.tab).length;
      if (sameTab > 1 && !nowMax.zoomed) run("pane.zoom", { pane: nowMax.pane });
      run("pane.focus", { pane: nowMax.pane });
    }
    setMain(self, true);
  } else {
    self.maxShown = null;
    setMain(self, false);
  }
}

function mainHidden() {
  let hidden = null;
  const visit = (n) => {
    if (!n || typeof n !== "object" || hidden !== null) return;
    if (n.id === "main") hidden = Boolean(n.hidden);
    (n.children ?? []).forEach(visit);
  };
  visit(layout());
  return hidden;
}

function setMain(self, show) {
  const hidden = mainHidden();
  if (hidden === null) return;
  if (show && hidden) run("layout.show", { id: "main" });
  if (!show && !hidden) run("layout.hide", { id: "main" });
}

/** Brings a floating window to the front (reopening it by key keeps its place). */
export function raise(self, addr) {
  const p = windowPanes().find((x) => x.terminal === addr);
  const o = self.open?.[addr];
  if (!p || !o) return;
  o.id = openOverlay(spec(p, o.w, o.h));
  run("pane.focus", { terminal: addr });
}

// ---- resizing: the edge strip starts it, the taskbar follows the pointer
// across the whole window, an outline shows the new size, release applies it.

export function startResize(addr, e, mode) {
  const z = zoom();
  const s = winOf(addr);
  const w0 = Math.max(MIN_W, s.w ?? DEF_W);
  const h0 = Math.max(MIN_H, s.h ?? DEF_H);
  const b = e.bounds;
  if (!b) return;
  // The strip runs along the bottom, inside the side glass.
  const left = b.x - EDGE * z;
  const top = b.y + b.height - h0 * z;
  const outline = openOverlay({ kind: "window", frame: "none", width: 1, height: 1, mod: "herdr-aero", props: { role: "outline" } });
  setShared("aero.resize", { addr, mode, x0: e.position.x, y0: e.position.y, w0, h0, w: w0, h: h0, left, top, outline });
}

export function moveResize(e) {
  const r = shared("aero.resize");
  if (!r) return;
  if (e.pressed_button !== "left") return endResize();
  const z = zoom();
  const w = r.mode === "h" ? r.w0 : Math.max(MIN_W, Math.round(r.w0 + (e.position.x - r.x0) / z));
  const h = Math.max(MIN_H, Math.round(r.h0 + (e.position.y - r.y0) / z));
  if (w !== r.w || h !== r.h) setShared("aero.resize", { ...r, w, h });
}

export function endResize() {
  const r = shared("aero.resize");
  if (!r) return;
  setShared("aero.resize", null);
  closeOverlay(r.outline);
  if (r.w !== r.w0 || r.h !== r.h0) setWin(r.addr, { w: r.w, h: r.h });
}
