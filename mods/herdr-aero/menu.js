// A popup menu: props { items, parents, start }. Hover opens
// submenus to the right; a choice closes the whole chain and acts.
// The Start menu (start: true) has big rows and the Herdr banner.

import { div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay, setShared, shared } from "herdr";
import { C, ASSETS, MENU, TITLE_FONT, unit, root, bevel, label, icon, perform, openMenu, etch, scale, gradient, roundFill } from "./kit.js";
import { userName } from "./taskbar.js";

function openMenus() {
  return shared("aero.menus") ?? [];
}

/** Closes a submenu and every submenu opened from it. */
function closeTree(id) {
  const all = openMenus();
  const doomed = all.filter((m) => m.id === id || m.parents.includes(id)).map((m) => m.id);
  if (!doomed.includes(id)) doomed.push(id);
  for (const d of doomed.reverse()) closeOverlay(d);
  setShared("aero.menus", all.filter((m) => !doomed.includes(m.id)));
}

export default class Menu {
  init(_p, cx) {
    this.at = -1;
    this.sub = null; // { id, index }
    this.focus = cx.focus_handle();
    this.focus.focus();
    // A menu bar keeps its label pressed while its menu is open.
    this.owner = props()?.owner ?? null;
    if (this.owner) setShared("aero.menu.owner", this.owner);
    // Every open submenu and its parents, so closing one closes what hangs off it.
    const p = props() ?? {};
    // A top menu starts the list over (menus closed by a click outside leave stale ids).
    setShared("aero.menus", (p.parents ?? []).length ? [...openMenus(), { id: p.overlay, parents: p.parents }] : []);
    // Escape is the app's (it closes the overlay before our key handler
    // sees it): a binding of our own, deeper in, comes first.
    try {
      cx.bind_keys([{ keystroke: "escape", action: "aero_menu_escape", context: "AeroMenu" }]);
    } catch {}
  }

  escape() {
    if (this.sub) closeTree(this.sub.id);
    this.sub = null;
    closeOverlay(props().overlay);
    if (shared("aero.start") && !(props().parents ?? []).length) setShared("aero.start", null);
    this.release();
  }

  release() {
    if (this.owner && shared("aero.menu.owner") === this.owner) setShared("aero.menu.owner", null);
  }

  items() {
    const all = props()?.items ?? [];
    return props()?.start ? all.filter((it) => !it.footer) : all;
  }

  footer() {
    return props()?.start ? (props()?.items ?? []).filter((it) => it.footer) : [];
  }

  closeAll() {
    const p = props() ?? {};
    if (this.sub) closeTree(this.sub.id);
    closeOverlay(p.overlay);
    for (const id of [...(p.parents ?? [])].reverse()) closeOverlay(id);
    if (shared("aero.start")) setShared("aero.start", null);
    this.release();
  }

  choose(it) {
    if (!it || it.disabled || it.sep) return;
    if (it.sub) return;
    this.closeAll();
    perform(it.act);
  }

  openSub(i, bounds) {
    const it = this.items()[i];
    if (this.sub && this.sub.index === i) return;
    if (this.sub) {
      closeTree(this.sub.id);
      this.sub = null;
    }
    if (!it?.sub || it.disabled) return;
    const k = scale();
    const p = props() ?? {};
    const at = bounds ? { x: bounds.x + bounds.width + 2 * k, y: bounds.y - MENU.frame * k } : undefined;
    const id = openMenu(it.sub, at, { parents: [...(p.parents ?? []), p.overlay] });
    this.sub = { id, index: i };
  }

  move(d) {
    const items = this.items();
    if (!items.length) return;
    let i = this.at;
    for (let n = 0; n < items.length; n++) {
      i = (i + d + items.length) % items.length;
      if (!items[i].sep) break;
    }
    this.at = i;
  }

  key(e, cx) {
    const items = this.items();
    switch (e.key) {
      case "down":
        this.move(1);
        break;
      case "up":
        this.move(-1);
        break;
      case "right":
        if (items[this.at]?.sub) this.openSub(this.at, null);
        break;
      case "left":
      case "escape":
        this.escape();
        break;
      case "enter":
      case "space":
        if (items[this.at]?.sub) this.openSub(this.at, null);
        else this.choose(items[this.at]);
        break;
      default: {
        // An access key picks its item.
        const ch = (e.key_char ?? e.key ?? "").toLowerCase();
        const i = items.findIndex((it) => !it.sep && (it.label ?? "").toLowerCase().includes("&" + ch));
        if (i < 0) return;
        this.at = i;
        if (items[i].sub) this.openSub(i, null);
        else this.choose(items[i]);
      }
    }
    cx.stop_propagation();
    cx.notify();
  }

  row(u, it, i, start) {
    const side = start && it.side;
    if (it.sep)
      return div()
        .h(u(MENU.sep))
        .flex()
        .items_center()
        .pl(u(start ? 8 : 30))
        .pr(u(start ? 8 : 2))
        .child(div().h(u(1)).w_full().bg(side ? "#ffffff30" : "#e0e0e0"));
    const on = i === this.at && !it.disabled;
    const h = side ? MENU.sideRow : start ? MENU.startRow : MENU.row;
    const fg = it.disabled ? C.disabled : side ? C.white : C.text;
    const big = start && !side;
    const lead = side
      ? div().w(u(8)).flex_none()
      : div()
          .w(u(big ? 42 : 28))
          .flex_none()
          .flex()
          .items_center()
          .justify_center()
          .when(Boolean(it.checked), (el) => el.child(svg(`${ASSETS}/icons/check.svg`).w(u(7)).h(u(7)).text_color(fg)))
          .when(Boolean(it.radio), (el) => el.child(div().w(u(6)).h(u(6)).rounded(u(3)).bg(fg)))
          .when(Boolean(it.icon) && !it.checked && !it.radio, (el) => el.child(icon(u, it.icon, big ? 32 : 16)))
          .when(Boolean(it.img) && !it.icon, (el) => el.child(image(it.img).w(u(big ? 32 : 16)).h(u(big ? 32 : 16))));
    // Aero's hot item: a rounded light-blue box (on the glass side: a white haze).
    const hot = (el) => (side ? el.bg("#ffffff2a").border_color("#ffffff66") : el.bg(C.menuHot).border_color(C.menuHotBorder));
    return h_flex()
      .id(`mi-${i}`)
      .h(u(h))
      .w_full()
      .items_center()
      .rounded(u(3))
      .border(u(1))
      .border_color("#00000000")
      .text_color(fg)
      .when(on, hot)
      .on_mouse_move((e, cx) => {
        if (this.at === i && (this.sub?.index === i || !it.sub)) return;
        this.at = i;
        this.openSub(i, e.bounds);
        cx.notify();
      })
      .on_click((_e, cx) => {
        if (it.sub) {
          this.openSub(i, null);
          cx.notify();
        } else this.choose(it);
      })
      .child(lead)
      .child(div().flex_1().min_w(0).truncate().child(label(it.label, { bold: it.bold })))
      .when(Boolean(it.shortcut), (el) => el.child(div().flex_none().pl(u(16)).child(it.shortcut)))
      .child(
        div()
          .w(u(18))
          .flex_none()
          .flex()
          .items_center()
          .justify_center()
          .when(Boolean(it.sub), (el) => el.child(svg(`${ASSETS}/icons/arrow-right.svg`).w(u(4)).h(u(7)).text_color(fg))),
      );
  }

  glassButton(u, id, child, onClick) {
    return h_flex()
      .id(id)
      .relative()
      .h_full()
      .items_center()
      .justify_center()
      .child(roundFill(u, 22, 0, [[0, "#ffffff40"], [0.5, "#ffffff18"], [0.52, "#00000020"], [1, "#ffffff20"]]))
      .child(div().id(`${id}~glow`).absolute().top(0).left(0).size_full().hover((s) => s.bg("#6ccfff55")).active((s) => s.bg("#1c78c088")))
      .on_click(onClick)
      .child(div().relative().flex().items_center().child(child));
  }

  render(_cx) {
    const u = unit();
    const p = props() ?? {};
    const items = this.items();
    const start = Boolean(p.start);
    if (!start) {
      const list = v_flex().relative().flex_1().min_w(0).children(items.map((it, i) => this.row(u, it, i, false)));
      return this.shell(u, false).child(
        div()
          .relative()
          .size_full()
          .bg(C.face)
          .border(u(1))
          .border_color(C.menuBorder)
          .p(u(2))
          // The icon gutter's double line, Aero style.
          .child(div().absolute().top(0).left(u(30)).w(u(1)).h_full().bg("#e2e3e3"))
          .child(div().absolute().top(0).left(u(31)).w(u(1)).h_full().bg(C.white))
          .child(list),
      );
    }
    // The Aero Start menu: programs on white, places on glass, search and shut down below.
    const rows = items.map((it, i) => ({ it, i }));
    const left = v_flex()
      .flex_1()
      .min_w(0)
      .p(u(4))
      .children(rows.filter((r) => !r.it.side).map((r) => this.row(u, r.it, r.i, true)));
    const right = v_flex()
      .flex_1()
      .min_w(0)
      .px(u(4))
      .child(
        h_flex()
          .h(u(MENU.tile))
          .flex_none()
          .justify_center()
          .items_center()
          .child(
            div()
              .p(u(3))
              .rounded(u(5))
              .bg("#ffffff40")
              .border(u(1))
              .border_color("#ffffff80")
              .child(image(`${ASSETS}/icons/aero-user.svg`).w(u(48)).h(u(48))),
          ),
      )
      .children(rows.filter((r) => r.it.side).map((r) => this.row(u, r.it, r.i, true)));
    const [main, ...more] = this.footer();
    const search = h_flex()
      .id("start-search")
      .h(u(24))
      .flex_1()
      .mx(u(10))
      .px(u(8))
      .items_center()
      .rounded(u(3))
      .bg(C.white)
      .border(u(1))
      .border_color("#8ea3bd")
      .on_click(() => {
        this.closeAll();
        perform({ run: ["app.palette", {}] });
      })
      .child(div().flex_1().italic().text_color("#6d6d6d").child("Search programs and files"))
      .child(svg(`${ASSETS}/icons/aero-search.svg`).w(u(14)).h(u(14)).text_color("#5a7aa5"));
    const shutdown = main
      ? h_flex()
          .flex_none()
          .h(u(24))
          .rounded(u(3))
          .border(u(1))
          .border_color("#00000088")
          .overflow_hidden()
          .text_color(C.white)
          .child(this.glassButton(u, "start-shutdown", div().px(u(12)).child(label(main.label)), () => this.choose(main)))
          .when(more.length > 0, (el) =>
            el.child(div().w(u(1)).h_full().bg("#00000066")).child(
              this.glassButton(u, "start-more", div().w(u(20)).flex().justify_center().child(svg(`${ASSETS}/icons/arrow-right.svg`).w(u(4)).h(u(7)).text_color(C.white)), (e, cx) => {
                if (this.sub) closeTree(this.sub.id);
                const k = scale();
                const at = e.bounds ? { x: e.bounds.x + e.bounds.width, y: e.bounds.y - 4 * k } : undefined;
                this.sub = { id: openMenu(more, at, { parents: [p.overlay] }), index: -2 };
                cx.notify();
              }),
            ),
          )
      : div();
    return this.shell(u, true).child(
      v_flex()
        .relative()
        .size_full()
        .rounded(u(6))
        .bg("#1d3b60f7")
        .border(u(1))
        .border_color("#000000aa")
        .child(roundFill(u, 60, 6, [[0, "#ffffff40"], [1, "#ffffff00"]], { tl: true, tr: true }))
        .child(
          h_flex()
            .relative()
            .flex_1()
            .min_h(0)
            .pt(u(8))
            .px(u(8))
            .gap(u(4))
            .child(
              div()
                .flex_none()
                .w(u(MENU.leftW))
                .h_full()
                .flex()
                .flex_col()
                .rounded(u(4))
                .bg(C.white)
                .border(u(1))
                .border_color("#00000077")
                .child(left),
            )
            .child(right),
        )
        .child(
          h_flex()
            .relative()
            .flex_none()
            .h(u(MENU.bottom))
            .items_center()
            .pr(u(10))
            .child(div().w(u(MENU.leftW + 8)).flex_none().flex().child(search))
            .child(div().flex_1())
            .child(shutdown),
        ),
    );
  }

  shell(u, start) {
    return root(
      u,
      v_flex()
        .id("menu")
        .key_context("AeroMenu")
        .on_action("aero_menu_escape", () => this.escape())
        .track_focus(this.focus)
        .on_key_down((e, cx) => this.key(e, cx))
        .on_mouse_down_out((_e, _cx) => {
          if (start && shared("aero.start")) setShared("aero.start", null);
          this.release();
        })
        .size_full(),
    );
  }
}
