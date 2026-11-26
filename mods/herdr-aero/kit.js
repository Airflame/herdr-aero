// Herdr Aero's drawing kit: Aero glass colors, glass frames, glossy
// buttons, title bars, menus' bits and sounds, shared by every role of the
// herdr-aero mod.
//
// Pixels: drawn in whole device pixels. `unit()` gives u(n): n px in layout
// px, so a 1 px line stays one crisp pixel at any zoom (scale 2 doubles
// every pixel, "Large Fonts").
//
// Glass: GPUI has no backdrop blur, so Aero glass is a translucent sky-blue
// tint with a white sheen, over the wallpaper (pane frames) or the terminal.

import { div, svg, image, PathBuilder, Background } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { settings, shared, setShared, playSound, run, layout, openOverlay, closeOverlay, exec, window as appWindow } from "herdr";

export const C = {
  face: "#f0f0f0",
  light: "#f7f7f7",
  hi: "#ffffff",
  shadow: "#a0a0a0",
  dark: "#696969",
  text: "#000000",
  gray: "#808080",
  white: "#ffffff",
  navy: "#1e395b",
  blue: "#3399ff",
  title: "#000000",
  inactive: "#d7e4f2",
  inactive2: "#e4edf7",
  inactiveText: "#4d4d4d",
  desktop: "#1d5a95",
  tip: "#ffffff",
  select: "#3399ff",
  selectText: "#ffffff",
  disabled: "#8d8d8d",
  // Aero
  frame: "#8eb4dfd9",
  frameInactive: "#c9d8eacc",
  glassTop: "#c6ddf5e6",
  glassBottom: "#93b8e2d9",
  glassInTop: "#e6eef8d9",
  glassInBottom: "#cddbebcc",
  glassEdge: "#00000066",
  btnBorder: "#707070",
  fieldBorder: "#abadb3",
  menuBorder: "#979797",
  hover: "#3c7fb1",
  link: "#0066cc",
  green: "#3cb43c",
  menuHot: "#dcebfc",
  menuHotBorder: "#a8cbf1",
};

export const FONT = "Segoe UI";
export const TITLE_FONT = "Segoe UI";
export const DOS = "Consolas";
export const ASSETS = "mods/herdr-aero";

// ---- pixels

export function scale() {
  const k = shared("aero.scale");
  return k === 2 ? 2 : 1;
}

export function unit() {
  const z = Number(settings()?.zoom) || 1;
  const k = scale() / z;
  const u = (n) => n * k;
  u.k = k;
  return u;
}

// ---- text

/** A label in the classic font. `&File` underlines the F (its access key). */
export function label(text, o = {}) {
  const s = String(text ?? "");
  const amp = o.noAccess ? -1 : s.indexOf("&");
  let el;
  if (amp >= 0 && amp < s.length - 1) {
    el = h_flex().flex_none();
    if (amp > 0) el = el.child(div().child(s.slice(0, amp)));
    el = el.child(div().underline().child(s[amp + 1]));
    if (amp + 2 < s.length) el = el.child(div().child(s.slice(amp + 2)));
  } else {
    el = div().child(s);
  }
  if (o.bold) el = el.font_weight(700);
  if (o.color) el = el.text_color(o.color);
  return el;
}

export function plain(text) {
  return String(text ?? "").replace(/&(.)/, "$1");
}

/** The root of every role: classic font, size and text color. */
export function root(u, el) {
  return el.font_family(FONT).text_size(u(12)).line_height(`${u(15)}px`).text_color(C.text);
}

// ---- boxes (the classic bevels, redrawn as soft rounded Aero boxes)

// kind: [border, background, radius]; "flat" draws nothing around.
const BOX = {
  raised: ["#9fb3c8", "#f4f8fc", 3],
  pressed: ["#7f97b2", "#dce8f4", 3],
  window: ["#7f97b2", null, 4],
  field: ["#abadb3", "#ffffff", 2],
  well: ["#b9c9da", null, 3],
  bump: ["#c5d3e2", null, 2],
  dent: ["#c5d3e2", null, 2],
  thin: ["#c5d3e2", null, 2],
  flat: ["#00000000", null, 3],
};

/**
 * Wraps `content` in a soft box (the old bevel kinds keep their names). o: { id,
 * press: kind shown while held (needs id), bg, pad: n | [y, x], center }.
 * Chain size and flex on the result.
 */
export function bevel(u, kind, content, o = {}) {
  const [line, fill, r] = BOX[kind] ?? BOX.flat;
  const held = o.press ? BOX[o.press] : null;
  const pad = Array.isArray(o.pad) ? o.pad : [o.pad ?? 0, o.pad ?? 0];
  let inner = div().flex().flex_col().flex_1().min_w(0).min_h(0).pt(u(pad[0])).pb(u(pad[0])).pl(u(pad[1])).pr(u(pad[1]));
  if (o.center) inner = inner.items_center().justify_center();
  inner = inner.child(content);
  let el = (o.id ? div().id(`${o.id}~box`) : div())
    .flex()
    .flex_col()
    .min_w(0)
    .min_h(0)
    .rounded(u(r))
    .border(u(1))
    .border_color(line);
  const bg = o.bg ?? fill;
  if (bg) el = el.bg(bg);
  if (o.id && held) el = el.active((st) => st.border_color(held[0]).bg(held[1] ?? "#dce8f4"));
  return el.child(inner);
}

/** A press of a control in a window_drag bar, or a float, is the control's. */
export function own(el) {
  return el.on_mouse_down("left", (_e, cx) => cx.stop_propagation());
}

/**
 * A push button. o: { w, h, default (the thick outline), toggled (stays in),
 * disabled, bold, pad: [y, x], onDown(e, cx) }.
 */
export function button(u, id, content, onClick, o = {}) {
  const text = typeof content === "string" ? label(content, { bold: o.bold, color: o.disabled ? C.disabled : undefined }) : content;
  const pad = o.pad ?? [0, 4];
  const face = h_flex()
    .relative()
    .flex_1()
    .min_w(0)
    .items_center()
    .justify_center()
    .gap(u(4))
    .pt(u(pad[0]))
    .pb(u(pad[0]))
    .pl(u(pad[1]))
    .pr(u(pad[1]))
    .child(text);
  // Aero's push button: a gray rounded outline over a two-tone gloss (light
  // top half, darker bottom half); a translucent overlay turns it sky blue on
  // hover and deeper blue on press (the gloss layers can't change by themselves).
  const halves = o.toggled
    ? [["#e5f4fc", "#c4e5f6"], ["#98d1ef", "#68b3db"]]
    : [["#f2f2f2", "#ebebeb"], ["#dddddd", "#cfcfcf"]];
  const gloss = v_flex()
    .absolute()
    .top(0)
    .left(0)
    .size_full()
    .child(div().relative().flex_1().w_full().child(gradient(halves[0][0], halves[0][1], 180)))
    .child(div().relative().flex_1().w_full().child(gradient(halves[1][0], halves[1][1], 180)));
  let glow = div().id(`${id}~glow`).absolute().top(0).left(0).size_full().rounded(u(2));
  if (!o.disabled && !o.toggled) glow = glow.hover((s) => s.bg("#bfe6fdaa")).active((s) => s.bg("#7fc4ecaa"));
  const inner = div()
    .relative()
    .flex()
    .flex_col()
    .flex_1()
    .min_w(0)
    .min_h(0)
    .rounded(u(2))
    .border(u(1))
    .border_color(o.default ? "#48d6fb" : "#fcfcfcaa")
    .bg(o.bg && o.bg !== C.face ? o.bg : "#e5e5e5")
    .child(o.bg && o.bg !== C.face ? div() : gloss)
    .child(glow)
    .child(face);
  let b = div()
    .flex()
    .flex_col()
    .rounded(u(3))
    .border(u(1))
    .border_color(o.disabled ? "#adb2b5" : o.default ? "#3c7fb1" : C.btnBorder)
    .bg(C.face)
    .child(inner);
  if (!o.disabled && !o.toggled) b = b.hover((s) => s.border_color(C.hover));
  b = b.id(`${id}~btn`);
  if (o.w) b = b.w(u(o.w));
  if (o.minW) b = b.min_w(u(o.minW));
  if (o.h) b = b.h(u(o.h));
  if (o.tooltip) b = b.tooltip(o.tooltip);
  b = b.on_mouse_down("left", (e, cx) => {
    cx.stop_propagation();
    o.onDown?.(e, cx);
  });
  if (o.onRight) b = b.on_mouse_down("right", (e, cx) => {
    cx.stop_propagation();
    o.onRight(e, cx);
  });
  if (!o.disabled && onClick) b = b.on_click((e, cx) => onClick(e, cx));
  return b;
}

/** An etched line: vertical (in bars) or horizontal (menus, dialogs). */
export function etch(u, vertical = false) {
  // A soft divider: a pale blue-gray line with a white line beside it.
  return vertical
    ? h_flex().flex_none().h_full().child(div().w(u(1)).h_full().bg("#c5d3e2")).child(div().w(u(1)).h_full().bg(C.hi))
    : v_flex().flex_none().w_full().child(div().h(u(1)).w_full().bg("#c5d3e2")).child(div().h(u(1)).w_full().bg(C.hi));
}

/** The raised grip at the start of a toolbar band. */
export function grip(u) {
  // Three soft dots, as on Aero toolbars.
  return v_flex().flex_none().h(u(20)).justify_center().gap(u(3)).children([0, 1, 2].map(() => div().w(u(3)).h(u(3)).rounded(u(2)).bg("#8aa6c4")));
}

// ---- gradients

const RECT = () => PathBuilder.fill().move_to("0%", "0%").line_to("100%", "0%").line_to("100%", "100%").line_to("0%", "100%").close().build();

/** A layer that fills its parent (relative) with a left-to-right gradient. */
export function gradient(from, to, angle = 90) {
  return window.paint_path(RECT(), Background.linear_gradient(angle, from, to)).absolute().top(0).left(0).size_full();
}

// GPUI clips to rectangles, so a gradient can't just be masked by rounded
// corners. roundFill() builds the shape from a grid of cells instead: corner
// cells are quarter-round paths, and every cell gets the exact slice of the
// vertical gradient it covers.

function hex(c) {
  const h = c.replace("#", "");
  return [0, 2, 4, 6].map((i) => (i < h.length ? parseInt(h.slice(i, i + 2), 16) : 255));
}

function mix(a, b, t) {
  const x = hex(a);
  const y = hex(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function colorAt(stops, t) {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [p, c] = stops[i];
    if (t <= p) {
      const [q, d] = stops[i - 1];
      return mix(d, c, p === q ? 1 : (t - q) / (p - q));
    }
  }
  return stops[stops.length - 1][1];
}

const CORNER = {
  tl: () => PathBuilder.fill().move_to(0, "100%").arc_to("100%", "100%", 0, false, true, "100%", 0).line_to("100%", "100%").close().build(),
  tr: () => PathBuilder.fill().move_to(0, 0).arc_to("100%", "100%", 0, false, true, "100%", "100%").line_to(0, "100%").close().build(),
  br: () => PathBuilder.fill().move_to("100%", 0).arc_to("100%", "100%", 0, false, true, 0, "100%").line_to(0, 0).close().build(),
  bl: () => PathBuilder.fill().move_to("100%", "100%").arc_to("100%", "100%", 0, false, true, 0, 0).line_to("100%", 0).close().build(),
};

/**
 * A layer that fills its parent (relative) with a vertical gradient in a
 * rounded rectangle. h: the parent's height and r: the radius, in px;
 * stops: [[0..1, color], ...]; corners: { tl, tr, br, bl } (true = round).
 */
export function roundFill(u, h, r, stops, corners = {}) {
  const top = corners.tl || corners.tr ? r : 0;
  const bottom = corners.bl || corners.br ? r : 0;
  const left = corners.tl || corners.bl ? r : 0;
  const right = corners.tr || corners.br ? r : 0;
  // Row edges: the corner rows, then every stop in between (so each row is linear).
  const ys = new Set([0, top, h - bottom, h]);
  for (const [p] of stops) if (p * h > top && p * h < h - bottom) ys.add(p * h);
  const edges = [...ys].sort((a, b) => a - b).filter((y, i, a) => i === 0 || y > a[i - 1]);
  const col = v_flex().absolute().top(0).left(0).size_full();
  for (let i = 0; i < edges.length - 1; i++) {
    const y0 = edges[i];
    const y1 = edges[i + 1];
    const bg = Background.linear_gradient(180, colorAt(stops, y0 / h), colorAt(stops, y1 / h));
    const isTop = top && y1 <= top;
    const isBottom = bottom && y0 >= h - bottom;
    const cell = (kind, w) => {
      const path = kind ? CORNER[kind]() : RECT();
      let c = div().relative().h_full().child(window.paint_path(path, bg).absolute().top(0).left(0).size_full());
      return w ? c.flex_none().w(u(w)) : c.flex_1();
    };
    const row = h_flex().flex_none().w_full().h(u(y1 - y0));
    if (left) row.child(cell(isTop && corners.tl ? "tl" : isBottom && corners.bl ? "bl" : null, left));
    row.child(cell(null));
    if (right) row.child(cell(isTop && corners.tr ? "tr" : isBottom && corners.br ? "br" : null, right));
    col.child(row);
  }
  return col;
}

/** A layer that fills its parent with a 1 px dither (the classic checked buttons). */
export function dither(u, color = C.hi) {
  return window.paint_path(RECT(), Background.checkerboard(color, Math.max(1, u(1) * (Number(settings()?.zoom) || 1)))).absolute().top(0).left(0).size_full();
}

// ---- icons

/** A pixel-art icon: 32 px art (name.svg) for big sizes, 16 px (name-sm.svg), 9 px badges (name-xs.svg). */
export function icon(u, name, size = 16) {
  const file = size >= 24 ? name : size >= 12 ? `${name}-sm` : `${name}-xs`;
  return image(`${ASSETS}/icons/${file}.svg`).flex_none().w(u(size)).h(u(size));
}

/** A program's icon (the app's table), small: shells are MS-DOS. */
export function programIcon(u, program, size = 16) {
  if (!program || program.shell || program.key === "shell" || !program.icon) return icon(u, "dos", size);
  if (program.tint) {
    return div()
      .flex_none()
      .w(u(size))
      .h(u(size))
      .bg(program.tile ?? C.navy)
      .flex()
      .items_center()
      .justify_center()
      .child(svg(program.icon).w(u(size - 4)).h(u(size - 4)).text_color(program.color ?? C.white));
  }
  return image(program.icon).flex_none().w(u(size)).h(u(size));
}

// ---- title bars

const GLYPH = { min: "aero-min", max: "aero-max", restore: "aero-restore", close: "aero-close", help: "aero-help" };
const CAPTION_W = { min: 26, max: 25, restore: 25, help: 26, close: 43 };
const CAPTION_H = 19;

/**
 * One caption button. Aero groups them in a strip hanging from the top edge:
 * pos is "first" | "last" | "only" | "mid", which rounds its bottom corners.
 */
export function control(u, id, kind, onClick, tooltip, active = true, pos = "only") {
  const red = kind === "close" && active;
  const stops = red
    ? [[0, "#e8a493"], [0.45, "#d27560"], [0.5, "#c3442b"], [1, "#d98a72"]]
    : active
      ? [[0, "#ffffff70"], [0.45, "#ffffff38"], [0.5, "#ffffff10"], [1, "#ffffff50"]]
      : [[0, "#ffffff60"], [0.5, "#ffffff28"], [1, "#ffffff40"]];
  const bl = pos === "first" || pos === "only";
  const br = pos === "last" || pos === "only";
  const w = CAPTION_W[kind] ?? 26;
  let glow = div().id(`${id}~glow`).absolute().top(0).left(0).size_full();
  if (bl) glow = glow.rounded_bl(u(4));
  if (br) glow = glow.rounded_br(u(4));
  glow = glow.hover((s) => s.bg(red ? "#ff7a5a88" : "#6ccfff77")).active((s) => s.bg(red ? "#a0200888" : "#1c78c088"));
  let b = div()
    .id(`${id}~ctl`)
    .relative()
    .flex_none()
    .w(u(w))
    .h(u(CAPTION_H))
    .flex()
    .items_center()
    .justify_center()
    .child(roundFill(u, CAPTION_H, 4, stops, { bl, br }))
    .child(glow)
    .child(image(`${ASSETS}/icons/${GLYPH[kind]}.svg`).relative().w(u(14)).h(u(12)))
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation());
  if (tooltip) b = b.tooltip(tooltip);
  if (onClick) b = b.on_click((e, cx) => onClick(e, cx));
  return b;
}

/** The caption strip: buttons side by side, a dark glass edge, round bottom corners. */
export function captions(u, id, controls, active = true) {
  const n = controls.length;
  const row = h_flex().flex_none().items_start();
  controls.forEach(([kind, fn, tip], i) => {
    const pos = n === 1 ? "only" : i === 0 ? "first" : i === n - 1 ? "last" : "mid";
    if (i > 0) row.child(div().flex_none().w(u(1)).h(u(CAPTION_H)).bg("#00000044"));
    row.child(control(u, `${id}-${kind}`, kind, fn, tip, active, pos));
  });
  return div()
    .flex_none()
    .border_l(u(1))
    .border_r(u(1))
    .border_b(u(1))
    .border_color(active ? "#0000006e" : "#00000040")
    .rounded_bl(u(5))
    .rounded_br(u(5))
    .child(row);
}

/**
 * A window's title bar: the caption on glass (the frame or the pane header
 * paints the glass under it). o: { id, title, icon (element), active,
 * controls: [[kind, onClick, tooltip]], onDouble, onRight, height, round }.
 */
export function titleBar(u, o) {
  const active = o.active !== false;
  const controls = o.controls ?? [];
  const H = o.height ?? 28;
  // A white sheen down the top of the glass.
  const sheen = roundFill(u, H, 6, [[0, active ? "#ffffff70" : "#ffffff50"], [0.55, "#ffffff10"], [1, "#ffffff00"]], o.round === false ? {} : { tl: true, tr: true });
  let bar = h_flex()
    .id(`${o.id}-title`)
    .relative()
    .flex_none()
    .w_full()
    .map((el) => (o.fill ? el.flex_1() : el.h(u(H))))
    .items_center()
    .pl(u(7))
    .pr(u(5))
    .gap(u(5))
    .child(sheen)
    .when(Boolean(o.icon), (el) => el.child(div().relative().flex_none().child(o.icon)))
    .child(
      div()
        .relative()
        .flex_1()
        .min_w(0)
        .flex()
        .child(
          // The caption sits plainly on the glass.
          div()
            .min_w(0)
            .truncate()
            .font_family(TITLE_FONT)
            .text_size(u(12))
            .line_height(`${u(17)}px`)
            .text_color(active ? C.title : C.inactiveText)
            .child(o.title ?? ""),
        ),
    )
    .when(controls.length > 0, (el) => el.child(div().relative().h_full().flex().items_start().child(captions(u, o.id, controls, active))));
  if (o.onDouble || o.onClick)
    bar = bar.on_click((e, cx) => {
      if (e.click_count >= 2) o.onDouble?.(e, cx);
      else o.onClick?.(e, cx);
    });
  if (o.onRight)
    bar = bar.on_mouse_down("right", (e, cx) => {
      cx.stop_propagation();
      o.onRight(e, cx);
    });
  return bar;
}

/**
 * A whole Aero window: a glass frame (translucent sky blue, rounded), the
 * caption, optional menu bar, the body on a light face with a thin inner edge.
 * o: { id, title, icon, active, controls, menu (element), body, status (element), w, h }
 */
export function win(u, o) {
  const active = o.active !== false;
  const inside = v_flex()
    .flex_1()
    .min_h(0)
    .bg(C.face)
    .border(u(1))
    .border_color(active ? "#3f5e86aa" : "#7b8fa8aa")
    .when(Boolean(o.menu), (el) => el.child(o.menu))
    .child(div().flex().flex_col().flex_1().min_h(0).child(o.body))
    .when(Boolean(o.status), (el) => el.child(o.status));
  let w = v_flex()
    .rounded(u(7))
    .bg(active ? C.frame : C.frameInactive)
    .border(u(1))
    .border_color(C.glassEdge)
    .child(titleBar(u, o))
    .child(v_flex().flex_1().min_h(0).px(u(7)).pb(u(7)).child(inside));
  if (o.w) w = w.w(u(o.w));
  if (o.h) w = w.h(u(o.h));
  return w;
}

/** A white field with Aero's thin gray border (text boxes, lists). */
export function field(u, content, o = {}) {
  const pad = Array.isArray(o.pad) ? o.pad : [o.pad ?? 2, o.pad ?? 3];
  return div()
    .flex()
    .flex_col()
    .border(u(1))
    .border_color(C.fieldBorder)
    .bg(o.bg ?? C.white)
    .child(div().flex().flex_col().flex_1().min_w(0).min_h(0).pt(u(pad[0])).pb(u(pad[0])).pl(u(pad[1])).pr(u(pad[1])).child(content));
}

/** A status bar panel. */
export function well(u, content, o = {}) {
  return bevel(u, "well", content, { pad: o.pad ?? [1, 3], bg: o.bg });
}

// ---- menus

// Menu metrics in classic px; the menu role draws exactly these.
// Start menu (Aero): a white program list on the left, a glass column of
// places on the right (items with side: true), search and shut down below.
export const MENU = { row: 22, startRow: 36, sep: 9, frame: 3, banner: 21, startW: 440, leftW: 250, sideRow: 31, tile: 70, bottom: 46 };

/** A menu's size in classic px. */
export function menuSize(items, start = false) {
  if (start) {
    let left = 0;
    let side = 0;
    for (const it of items) {
      if (it.footer) continue;
      if (it.side) side += it.sep ? MENU.sep : MENU.sideRow;
      else left += it.sep ? MENU.sep : MENU.startRow;
    }
    const body = Math.max(left, MENU.tile + side);
    return { w: MENU.startW, h: body + MENU.bottom + 18 };
  }
  let rows = 0;
  let seps = 0;
  let longest = 0;
  let keys = 0;
  for (const it of items) {
    if (it.sep) {
      seps++;
      continue;
    }
    rows++;
    longest = Math.max(longest, plain(it.label).length);
    keys = Math.max(keys, (it.shortcut ?? "").length);
  }
  const w = Math.max(140, 36 + longest * 7 + (keys ? keys * 7 + 24 : 0) + 20);
  const h = rows * MENU.row + seps * MENU.sep + MENU.frame * 2;
  return { w, h };
}

function zoom() {
  return Number(settings()?.zoom) || 1;
}

/**
 * Opens a classic popup menu (the menu role). items: [{ label: "&New", icon,
 * shortcut, act: { run: [command, args], dialog, app, ... }, sub: [items],
 * disabled, checked, radio, bold, sep: true }]. at: window px, or
 * { above: bounds } (the Start menu, over its button). Returns its overlay id.
 */
export function openMenu(items, at, o = {}) {
  const k = scale();
  const { w, h } = menuSize(items, o.start);
  const width = o.width ?? w;
  let where = at;
  if (at?.above) where = { x: at.above.x, y: Math.max(0, at.above.y - h * k) };
  return openOverlay({
    mod: "herdr-aero",
    kind: "popup",
    frame: "none",
    width: (width * k) / zoom(),
    height: (h * k) / zoom(),
    ...(where ? { at: where } : {}),
    props: { role: "menu", items, parents: o.parents ?? [], start: Boolean(o.start), owner: o.owner ?? null },
  });
}

const DIALOG_W = { prompt: 340, confirm: 330, run: 350, shutdown: 330, about: 380, taskman: 360, display: 400, mycomputer: 420, bin: 380, message: 330, network: 380, welcome: 560, logoff: 300, datetime: 330 };

/** Opens a classic dialog (the dialog role) as a window you can drag by its title: kind and its props. */
export function openDialog(kind, p = {}) {
  const k = scale();
  const w = p.width ?? DIALOG_W[kind] ?? 340;
  return openOverlay({
    mod: "herdr-aero",
    kind: "window",
    frame: "none",
    width: (w * k) / zoom(),
    props: { role: "dialog", kind, ...p },
  });
}

/** Does what a menu item or icon says: { run, dialog, app, shared, url, sound }. */
export function perform(act) {
  if (!act) return;
  if (act.sound) sfx(act.sound);
  if (act.run) run(act.run[0], act.run[1] ?? {});
  if (act.dialog) openDialog(act.dialog.kind, act.dialog);
  if (act.app) setApp(act.app, "open");
  if (act.shared) setShared(act.shared[0], act.shared[1]);
  if (act.url) {
    const os = appWindow()?.platform;
    if (os === "windows") exec("cmd", ["/c", "start", "", act.url]).catch(() => {});
    else exec(os === "macos" ? "open" : "xdg-open", [act.url]).catch(() => {});
  }
}

export { closeOverlay };

// ---- sounds

/** Plays a Herdr Aero sound unless sounds are off (settings, or the speaker in the tray). */
export function sfx(name) {
  if (settings()?.sounds?.enabled === false) return;
  if (shared("aero.mute") === true) return;
  try {
    playSound(`${ASSETS}/sounds/${name}.mp3`);
  } catch {}
}

// ---- state shared by the roles

/** Which game windows are open: { mines: "open" | "min", sol: ... }. */
export function apps() {
  return shared("aero.apps") ?? {};
}

export function setApp(name, state) {
  const a = { ...apps() };
  if (state) a[name] = state;
  else delete a[name];
  setShared("aero.apps", a);
}

// ---- paths, DOS style

export function dosPath(path, home) {
  if (!path) return "C:\\";
  let p = String(path).replaceAll("\\", "/");
  const h = home ? String(home).replaceAll("\\", "/").replace(/\/$/, "") : "";
  // Paths show as they are; a Unix home becomes C:/Users/<name>.
  if (h && !/^[A-Za-z]:/.test(h) && (p === h || p.startsWith(h + "/"))) {
    const user = h.split("/").filter(Boolean).pop() ?? "User";
    p = `C:/Users/${user}` + p.slice(h.length);
  } else if (!/^[A-Za-z]:/.test(p)) p = "C:" + p;
  return p.replaceAll("/", "\\").replace(/\\$/, "") || "C:\\";
}

// ---- the layout's pixel sizes, kept whole at any zoom

const FIT = { taskbar: 40, desktop: 84 };

/** Sizes the layout's bars in classic pixels for this zoom and scale; true if it changed. */
export function fitLayout() {
  const l = layout();
  if (!l || typeof l !== "object") return false;
  const z = Number(settings()?.zoom) || 1;
  const k = scale() / z;
  const want = (n) => Math.round(n * k * 1000) / 1000;
  let changed = false;
  // Large Fonts: the MS-DOS font at a crisp 32 px too; Small: Herdr's zoom as usual.
  const font = scale() === 2 ? want(14) : 14;
  if (Math.abs((l.font_size ?? 0) - font) > 0.01) {
    l.font_size = font;
    changed = true;
  }
  const visit = (n) => {
    if (!n || typeof n !== "object") return;
    if (FIT[n.id] && Math.abs((n.size?.px ?? 0) - want(FIT[n.id])) > 0.01) {
      n.size = { px: want(FIT[n.id]) };
      run("layout.resize", { id: n.id, px: n.size.px });
      changed = true;
    }
    const pane = n.content?.pane;
    if (pane?.header && Math.abs((pane.header.height ?? 0) - want(28)) > 0.01) {
      pane.header.height = want(28);
      changed = true;
    }
    if (pane && (Math.abs((pane.border?.width ?? 0) - want(6)) > 0.01 || pane.focus?.color !== C.frame)) {
      pane.border = { width: want(6), color: C.frameInactive };
      pane.focus = { width: want(6), color: C.frame };
      changed = true;
    }
    for (const c of n.children ?? []) visit(c);
  };
  visit(l);
  if (changed) run("layout.set", { layout: l });
  return changed;
}
