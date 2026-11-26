// A pane's title bar (the layout's pane header): the focused pane's is blue,
// the others gray. _ minimizes the tab to the taskbar (settle), [] maximizes
// the pane (zoom), x closes it. Double-click maximizes; right-click is the
// window menu.

import { div } from "gpui-kit";
import { panes, props, run, home, shared } from "herdr";
import { C, unit, root, titleBar, programIcon, icon, dosPath, openMenu } from "./kit.js";
import { setWin } from "./wins.js";

export function paneTitle(p) {
  if (!p) return "";
  if (p.mod) return p.title || p.mod;
  const prog = p.program;
  if (!prog || prog.shell) return `Command Prompt - ${dosPath(p.cwd, home())}`;
  const t = (p.title ?? "").trim();
  return t && t !== prog.name ? `${prog.name} - ${t}` : `${prog.name} - ${dosPath(p.cwd, home())}`;
}

export default class PaneWindow {
  init() {}

  render(_cx) {
    const u = unit();
    const id = props()?.pane;
    const p = panes().find((x) => x.pane === id);
    const active = Boolean(p?.focused);
    const zoomed = Boolean(p?.zoomed);
    const addr = p?.terminal;
    // This is the full-screen view: Restore floats the window again, _ minimizes it.
    const restore = () => {
      if (zoomed) run("pane.zoom", { pane: id });
      if (addr) setWin(addr, { state: "normal" });
    };
    const minimize = () => {
      if (zoomed) run("pane.zoom", { pane: id });
      if (addr) setWin(addr, { state: "min" });
    };
    const menu = () =>
      openMenu([
        { label: "&Restore", act: { shared: ["aero.wins", { ...(shared("aero.wins") ?? {}), [addr]: { ...((shared("aero.wins") ?? {})[addr] ?? {}), state: "normal" } }] } },
        { label: "Mi&nimize", act: { shared: ["aero.wins", { ...(shared("aero.wins") ?? {}), [addr]: { ...((shared("aero.wins") ?? {})[addr] ?? {}), state: "min" } }] } },
        { label: "Ma&ximize", disabled: true },
        { sep: true },
        { label: "Split &Right", shortcut: "Ctrl+Shift+O", act: { run: ["pane.split", { direction: "right", pane: id }] } },
        { label: "Split &Down", shortcut: "Ctrl+Shift+E", act: { run: ["pane.split", { direction: "down", pane: id }] } },
        { sep: true },
        { label: "&Close", bold: true, shortcut: "Alt+F4", act: { run: ["pane.close", { pane: id }] } },
      ]);
    const bar = titleBar(u, {
      id: `pw-${id}`,
      fill: true,
      round: false,
      height: 28,
      title: paneTitle(p),
      active,
      icon: p?.mod ? icon(u, "programs", 16) : programIcon(u, p?.program, 16),
      controls: [
        ["min", minimize, "Minimize"],
        ["restore", restore, "Restore Down"],
        ["close", () => run("pane.close", { pane: id }), "Close"],
      ],
      onClick: () => run("pane.focus", { pane: id }),
      onDouble: restore,
      onRight: menu,
    });
    return root(u, div().size_full().flex().flex_col().bg(active ? C.frame : C.frameInactive)).child(bar);
  }
}
