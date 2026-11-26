// The parts of a floating terminal window (see wins.js):
//   float      its title bar: drag to move, double-click to maximize, _ [] x
//   floatside  the glass at its left and right
//   floatedge  the bottom strip: drag to resize (the corner: both ways)
//   outline    the rectangle that follows the pointer while resizing

import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { props, panes, focused, run, shared, home } from "herdr";
import { C, ASSETS, unit, root, titleBar, programIcon, icon, openMenu } from "./kit.js";
import { paneTitle } from "./window.js";
import { setWin, startResize, zoom } from "./wins.js";

export class FloatTitle {
  init() {}

  render(_cx) {
    const u = unit();
    const { terminal, pane } = props() ?? {};
    const p = panes().find((x) => x.terminal === terminal) ?? panes().find((x) => x.pane === pane);
    const active = focused()?.terminal === terminal;
    const max = () => setWin(terminal, { state: "max" });
    const min = () => setWin(terminal, { state: "min" });
    const close = () => p && run("pane.close", { pane: p.pane });
    const bar = titleBar(u, {
      id: `fw-${terminal}`,
      fill: true,
      height: 28,
      round: true,
      title: paneTitle(p),
      active,
      icon: programIcon(u, p?.program, 16),
      controls: [
        ["min", min, "Minimize"],
        ["max", max, "Maximize"],
        ["close", close, "Close"],
      ],
      onClick: () => run("pane.focus", { terminal }),
      onDouble: max,
      onRight: () =>
        openMenu([
          { label: "&Restore", disabled: true },
          { label: "Mi&nimize", act: { shared: ["aero.wins", { ...(shared("aero.wins") ?? {}), [terminal]: { ...(shared("aero.wins") ?? {})[terminal], state: "min" } }] } },
          { label: "Ma&ximize", act: { shared: ["aero.wins", maxPatch(terminal)] } },
          { sep: true },
          { label: "Split &Right", shortcut: "Ctrl+Shift+O", act: { run: ["pane.split", { direction: "right", pane: p?.pane }] } },
          { label: "Split &Down", shortcut: "Ctrl+Shift+E", act: { run: ["pane.split", { direction: "down", pane: p?.pane }] } },
          { sep: true },
          { label: "&Close", bold: true, shortcut: "Alt+F4", act: { run: ["pane.close", { pane: p?.pane }] } },
        ]),
    });
    // No mouse-down stopping here: a press on the title drags the window.
    return root(u, div().size_full().flex().flex_col()).child(bar);
  }
}

function maxPatch(addr) {
  const all = { ...(shared("aero.wins") ?? {}) };
  for (const k of Object.keys(all)) if (all[k].state === "max") all[k] = { ...all[k], state: "normal" };
  all[addr] = { ...(all[addr] ?? {}), state: "max" };
  return all;
}

export class FloatSide {
  init() {}
  render() {
    // The window's own glass shows through; this only gives the edge some sheen.
    return div().size_full();
  }
}

export class FloatEdge {
  init() {}

  render(_cx) {
    const u = unit();
    const { terminal } = props() ?? {};
    const press = (mode) => (e, cx) => {
      cx.stop_propagation();
      startResize(terminal, e, mode);
    };
    return h_flex()
      .size_full()
      .child(div().id("edge-h").flex_1().h_full().on_mouse_down("left", press("h")).tooltip("Drag to resize"))
      .child(
        div()
          .id("edge-wh")
          .flex_none()
          .w(u(18))
          .h_full()
          .flex()
          .items_end()
          .justify_end()
          .on_mouse_down("left", press("wh"))
          .tooltip("Drag to resize")
          .child(svg(`${ASSETS}/icons/aero-grip.svg`).w(u(9)).h(u(9)).text_color("#2a4466")),
      );
  }
}

export class Outline {
  init() {}

  render(_cx) {
    const r = shared("aero.resize");
    const z = zoom();
    if (!r) return div().size_full();
    return div()
      .size_full()
      .relative()
      .child(
        div()
          .absolute()
          .left(r.left / z)
          .top(r.top / z)
          .w(r.w)
          .h(r.h)
          .rounded(8)
          .border(2)
          .border_color("#ffffffcc")
          .bg("#8eb4df33"),
      )
      .child(
        div()
          .absolute()
          .left(r.left / z + r.w - 110)
          .top(r.top / z + r.h + 6)
          .px(6)
          .rounded(3)
          .bg("#000000aa")
          .text_color(C.white)
          .text_size(11)
          .child(`${r.w} × ${r.h}`),
      );
  }
}
