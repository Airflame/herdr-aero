// The taskbar: Start, Quick Launch, the shown space's tabs as windows (the
// shown one pressed in; click it to minimize = settle), open games, and the
// tray: agents, the speaker, the clock. It also owns the layout's key
// commands ("aero.<command>" in keys.json) and plays the startup sound.

import { div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, panes, agents, run, shared, setShared, nextCommand, exec, layouts, home, settings, openOverlay, closeOverlay, focused } from "herdr";
import { syncWindows, windowPanes, winOf, setWin, raise, moveResize, endResize, wins } from "./wins.js";
import { paneTitle } from "./window.js";
import {
  C, ASSETS, unit, root, bevel, button, etch, grip, icon, programIcon, sfx, apps, setApp, label, own,
  fitLayout, openMenu, openDialog, dither, perform, gradient, roundFill, TITLE_FONT,
} from "./kit.js";

// Aero superbar glass.
const TB = { base: "#16283fd0", top: "#5878a0b8", bottom: "#14243ae0" };

// Agents the Start menu offers when installed: [command, name, icon].
const AGENTS = [
  ["claude", "Claude Code", "icons/claude.svg"],
  ["codex", "Codex", "icons/codex.svg"],
  ["pi", "Pi", "icons/pi.svg"],
  ["opencode", "OpenCode", "icons/opencode.svg"],
  ["amp", "Amp", "icons/amp.svg"],
  ["gemini", "Gemini", "icons/gemini.svg"],
  ["agent", "Cursor", "icons/cursor.svg"],
  ["copilot", "Copilot", "icons/copilot.svg"],
  ["grok", "Grok", "icons/grok.svg"],
  ["kimi", "Kimi", "icons/kimi.svg"],
  ["crush", "Crush", "icons/crush.svg"],
];

const GAMES = { mines: ["Mines", "mines"], sol: ["Solitaire", "sol"] };

function lead(all, tab) {
  const mine = all.filter((p) => p.tab === tab);
  return mine.find((p) => p.focused) ?? mine.find((p) => p.program?.agent) ?? mine[0];
}

function clock(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const pm = h >= 12;
  h = h % 12 || 12;
  return `${h}:${m} ${pm ? "PM" : "AM"}`;
}

function longDate(d) {
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

/** Seconds since the Herdr app started (exec's parent), or null where ps can't say. */
async function appAge() {
  try {
    const r = await exec("sh", ["-c", 'ps -o etime= -p "$PPID"']);
    const m = r.stdout.trim().match(/^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/);
    if (!m) return null;
    const [, d, h, mi, s] = m.map((x) => Number(x) || 0);
    return ((d * 24 + h) * 60 + mi) * 60 + s;
  } catch {
    return null;
  }
}

export function userName() {
  const h = home() ?? "";
  const n = h.split(/[\\/]/).filter(Boolean).pop() ?? "User";
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export default class Taskbar {
  init(_p, cx) {
    this.now = new Date();
    this.installed = [];
    this.zoom = null;
    this.scale = null;
    const tick = (cx) => {
      this.now = new Date();
      cx.notify();
    };
    cx.timer.after(60000 - (Date.now() % 60000) + 50, (cx) => {
      tick(cx);
      cx.timer.every(60000, tick);
    });
    cx.spawn(async (cx) => {
      try {
        const names = AGENTS.map((a) => a[0]).join(" ");
        try {
          const r = await exec("sh", ["-c", `for c in ${names}; do command -v "$c" >/dev/null 2>&1 && echo "$c"; done`]);
          this.installed = r.stdout.split("\n").filter(Boolean);
        } catch {
          // No sh here: where.exe prints the path of each one it finds.
          const r = await exec("where.exe", AGENTS.map((a) => a[0])).catch((e) => e);
          const found = String(r?.stdout ?? "").toLowerCase().split(/\r?\n/).map((l) => l.trim().split(/[\\/]/).pop().replace(/\.(exe|cmd|bat|ps1)$/, ""));
          this.installed = AGENTS.map((a) => a[0]).filter((c) => found.includes(c));
        }
      } catch {}
      cx.notify();
    });
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        try {
          this.command(c);
        } catch (e) {
          console.log(`herdr-aero taskbar: ${c} failed: ${e}`);
        }
        cx.notify();
      }
    });
    if (shared("aero.start")) setShared("aero.start", null);
    // Herdr just started with this layout on: always boot. Else (a switch to
    // it, a reload of the mod) the half-hour rule below.
    cx.spawn(async () => {
      const age = await appAge();
      this.boot(age !== null && age < 45);
    });
  }

  // Coming into Herdr Aero: the boot screen and the welcome (at most every half
  // hour unless forced), else just the chime (not on every reload of the mod).
  boot(force = false) {
    const now = Date.now();
    const last = force ? 0 : Number(shared("aero.boot")) || 0;
    const seen = Number(shared("aero.init")) || 0;
    setShared("aero.init", now);
    if (now - last > 30 * 60 * 1000) {
      setShared("aero.boot", now);
      openOverlay({ mod: "herdr-aero", kind: "dialog", frame: "none", modal: true, width: 1, height: 1, props: { role: "dialog", kind: "screen", mode: "boot" } });
    } else if (now - seen > 20 * 1000) sfx("startup");
  }

  space() {
    return spaces().find((s) => s.active);
  }

  command(c) {
    const s = this.space();
    const tab = s?.tabs.find((t) => t.active);
    switch (c) {
      case "start":
        return this.toggleStart(this.startBounds ?? (this.screen ? { x: this.screen.x, y: this.screen.y } : null));
      case "new_tab":
        return openDialog("prompt", { title: "New Tab", text: "Type a name for the new tab:", icon: "dos", command: { name: "tab.new", args: {} } });
      case "new_space":
        return openDialog("prompt", { title: "New Space", text: "Type a name for the new space:", icon: "folder", machines: true, command: { name: "space.new", args: {} } });
      case "rename_tab":
        if (tab) openDialog("prompt", { title: "Rename", text: "Type a new name for this tab:", icon: "rename", value: tab.name, command: { name: "tab.rename", args: { id: tab.id } } });
        return;
      case "rename_space":
        if (s) openDialog("prompt", { title: "Rename", text: "Type a new name for this space:", icon: "folder", value: s.name, command: { name: "space.rename", args: { id: s.id } } });
        return;
      case "close_tab":
        if (tab) openDialog("confirm", closeTabAsk(s, tab));
        return;
      case "close_space":
        if (s) openDialog("confirm", closeSpaceAsk(s));
        return;
      case "taskman":
        return openDialog("taskman", {});
      case "run":
        return openDialog("run", {});
      case "shutdown":
        return openDialog("shutdown", {});
      case "about":
        return openDialog("about", {});
      case "display":
        return openDialog("display", {});
      case "welcome":
        return openDialog("welcome", {});
      case "boot":
        return this.boot(true);
      case "small_fonts":
        return setShared("aero.scale", 1);
      case "large_fonts":
        return setShared("aero.scale", 2);
      case "mines":
      case "sol":
        return setApp(c, "open");
      case "mycomputer":
      case "network":
      case "bin":
      case "datetime":
      case "logoff":
        return openDialog(c, {});
    }
  }

  // ---- the games' windows: one per open (or minimized) game, by key, so each
  // comes back where it was dragged last; a minimized game draws nothing.

  syncGames() {
    this.wins ??= {};
    const open = apps();
    for (const k of Object.keys(GAMES)) {
      if (open[k] && !this.wins[k]) {
        const id = openOverlay({ mod: "herdr-aero", kind: "window", frame: "none", key: k, props: { role: k } });
        this.wins[k] = id;
      } else if (!open[k] && this.wins[k]) {
        closeOverlay(this.wins[k]);
        delete this.wins[k];
      }
    }
  }

  // ---- the Start menu

  startItems() {
    const installed = AGENTS.filter((a) => this.installed.includes(a[0]));
    const agentItems = installed.map(([cmd, name, ico]) => ({
      label: name,
      img: ico,
      act: { run: ["tab.new", { name, argv: [cmd] }] },
    }));
    const spaceItems = spaces().map((p, i) => ({
      label: `${i < 9 ? `&${i + 1} ` : ""}${p.name}`,
      icon: p.active ? "folder-open" : "folder",
      act: { run: ["space.select", { id: p.id }] },
    }));
    const layoutItems = layouts().map((name) => ({
      label: name === "herdr-aero" ? "Herdr Aero" : name,
      radio: name === "herdr-aero",
      act: { run: ["layout.switch", { name }] },
    }));
    const allPrograms = [
      {
        label: "Accessories",
        icon: "programs",
        sub: [
          { label: "Command Prompt", icon: "dos", act: { run: ["tab.new", { name: "Command Prompt" }] } },
          { label: "Run...", icon: "run", act: { dialog: { kind: "run" } } },
          { label: "Command Palette", icon: "find", act: { run: ["app.palette", {}] } },
          { label: "Welcome Center", icon: "start", act: { dialog: { kind: "welcome" } } },
        ],
      },
      { label: "Agents", icon: "programs", sub: agentItems.length ? agentItems : [{ label: "(Empty)", disabled: true }] },
      { label: "Games", icon: "programs", sub: [
        { label: "Mines", icon: "mines", act: { app: "mines" } },
        { label: "Solitaire", icon: "sol", act: { app: "sol" } },
      ] },
      { label: "Herdr Update", icon: "update", act: { run: ["app.settings", { section: "updates" }] } },
    ];
    return [
      // Left, on white: pinned programs, then All Programs.
      { label: "Command Prompt", icon: "dos", act: { run: ["tab.new", { name: "Command Prompt" }] } },
      ...agentItems.slice(0, 4),
      { label: "Mines", icon: "mines", act: { app: "mines" } },
      { label: "Solitaire", icon: "sol", act: { app: "sol" } },
      { sep: true },
      { label: "All Programs", icon: "programs", sub: allPrograms },
      // Right, on glass: places.
      { label: userName(), side: true, bold: true, sub: spaceItems.length ? spaceItems : [{ label: "(Empty)", disabled: true }] },
      { label: "Spaces", side: true, sub: spaceItems.length ? spaceItems : [{ label: "(Empty)", disabled: true }] },
      { label: "New Space...", side: true, act: { dialog: { kind: "prompt", title: "New Space", text: "Type a name for the new space:", icon: "folder", machines: true, command: { name: "space.new", args: {} } } } },
      { label: "Computer", side: true, act: { dialog: { kind: "mycomputer" } } },
      { label: "Network", side: true, act: { dialog: { kind: "network" } } },
      { sep: true, side: true },
      { label: "Control Panel", side: true, act: { run: ["app.settings", {}] } },
      { label: "Personalization", side: true, sub: [{ label: "&Display...", icon: "display", act: { dialog: { kind: "display" } } }, { label: "&Layouts", icon: "programs", sub: layoutItems }] },
      { label: "Help and Support", side: true, act: { run: ["app.help", {}] } },
      { label: "Run...", side: true, act: { dialog: { kind: "run" } } },
      // Below: Shut down, and the arrow's choices.
      { label: "Shut down", footer: true, act: { dialog: { kind: "shutdown" } } },
      { label: "&Log off", icon: "logoff", footer: true, act: { dialog: { kind: "logoff" } } },
      { label: "&Restart", icon: "shutdown", footer: true, act: { dialog: { kind: "shutdown" } } },
    ];
  }

  toggleStart(bounds) {
    if (shared("aero.start")) {
      setShared("aero.start", null);
      return;
    }
    sfx("start");
    const id = openMenu(this.startItems(), bounds ? { above: bounds } : undefined, { start: true });
    setShared("aero.start", id);
  }

  // ---- render

  /** One floating window (a terminal of the shown space). */
  windowButton(u, p, list) {
    const addr = p.terminal;
    const st = winOf(addr).state ?? "normal";
    const isFocused = focused()?.terminal === addr;
    const on = st !== "min" && isFocused;
    const tab = this.space()?.tabs.find((t) => t.id === p.tab);
    const siblings = list.filter((x) => x.tab === p.tab);
    const name = siblings.length > 1 ? `${tab?.name ?? ""} · ${siblings.indexOf(p) + 1}` : (tab?.name ?? p.program?.name ?? addr);
    const badge = p.status === "done" ? "check-badge" : null;
    const face = h_flex()
      .relative()
      .flex_1()
      .min_w(0)
      .h_full()
      .items_center()
      .gap(u(6))
      .child(
        div()
          .relative()
          .flex_none()
          .child(programIcon(u, p.program, 24))
          .when(Boolean(badge), (el) => el.child(div().absolute().right(u(-3)).bottom(u(-3)).child(icon(u, badge, 9)))),
      )
      .child(div().relative().flex_1().min_w(0).truncate().text_color(C.white).when(st === "min", (el) => el.opacity(0.75)).child(name));
    const click = () => {
      if (st === "min") {
        setWin(addr, { state: "normal" });
        run("pane.focus", { terminal: addr });
      } else if (isFocused) setWin(addr, { state: "min" });
      else if (st === "max") run("pane.focus", { terminal: addr });
      else raise(this, addr);
    };
    return w7Task(u, `tw-${addr}`, face, click, {
      on,
      running: true,
      flash: p.status === "blocked",
      progress: p.status === "working",
      tooltip: `${paneTitle(p)}${p.status ? ` (${p.status})` : ""}`,
      onRight: () =>
        openMenu([
          { label: "&Restore", act: { shared: ["aero.wins", { ...wins(), [addr]: { ...winOf(addr), state: "normal" } }] }, disabled: st === "normal" },
          { label: "Mi&nimize", act: { shared: ["aero.wins", { ...wins(), [addr]: { ...winOf(addr), state: "min" } }] }, disabled: st === "min" },
          { label: "Ma&ximize", act: { shared: ["aero.wins", Object.fromEntries([...Object.entries(wins()).map(([k, v]) => [k, v.state === "max" ? { ...v, state: "normal" } : v]), [addr, { ...winOf(addr), state: "max" }]])] }, disabled: st === "max" },
          { sep: true },
          { label: "Re&name tab...", act: { dialog: { kind: "prompt", title: "Rename", text: "Type a new name for this tab:", icon: "rename", value: tab?.name ?? "", command: { name: "tab.rename", args: { id: p.tab } } } } },
          { sep: true },
          { label: "&Close window", bold: true, shortcut: "Alt+F4", act: { run: ["pane.close", { pane: p.pane }] } },
        ]),
    })
      .flex_1()
      .min_w(u(48))
      .max_w(u(190));
  }

  tabButton(u, t, all) {
    const p = lead(all, t.id);
    const pressed = t.active && !t.settled;
    const badge = t.status === "done" ? "check-badge" : null;
    const face = h_flex()
      .relative()
      .flex_1()
      .min_w(0)
      .h_full()
      .items_center()
      .gap(u(6))
      .child(
        div()
          .relative()
          .flex_none()
          .child(programIcon(u, p?.program, 24))
          .when(Boolean(badge), (el) => el.child(div().absolute().right(u(-3)).bottom(u(-3)).child(icon(u, badge, 9)))),
      )
      .child(div().relative().flex_1().min_w(0).truncate().text_color(C.white).child(t.name));
    return w7Task(
      u,
      `tb-${t.id}`,
      face,
      () => {
        if (pressed) run("tab.settle", { id: t.id });
        else run("tab.select", { id: t.id });
      },
      {
        on: pressed,
        running: true,
        flash: t.status === "blocked",
        progress: t.status === "working",
        tooltip: `${t.name}${p?.program ? ` - ${p.program.name}` : ""}${t.status ? ` (${t.status})` : ""}`,
        onRight: () =>
          openMenu([
            { label: "&Restore", act: { run: ["tab.select", { id: t.id }] }, disabled: pressed },
            { label: "Mi&nimize", act: { run: ["tab.settle", { id: t.id }] }, disabled: t.settled },
            { label: "Ma&ximize", act: { run: ["pane.zoom", {}] }, disabled: !t.active },
            { sep: true },
            { label: "Re&name...", act: { dialog: { kind: "prompt", title: "Rename", text: "Type a new name for this tab:", icon: "rename", value: t.name, command: { name: "tab.rename", args: { id: t.id } } } } },
            { sep: true },
            { label: "&Close window", bold: true, shortcut: "Alt+F4", act: { run: ["tab.close", { id: t.id }] } },
          ]),
      },
    )
      .flex_1()
      .min_w(u(48))
      .max_w(u(170));
  }

  gameButton(u, key, state) {
    const [name, ico] = GAMES[key];
    const open = state === "open";
    const face = h_flex()
      .relative()
      .flex_1()
      .min_w(0)
      .h_full()
      .items_center()
      .gap(u(6))
      .child(div().relative().child(icon(u, ico, 24)))
      .child(div().relative().flex_1().min_w(0).truncate().text_color(C.white).child(name));
    return w7Task(u, `tg-${key}`, face, () => setApp(key, open ? "min" : "open"), {
      on: open,
      running: true,
      onRight: () =>
        openMenu([
          { label: "&Restore", act: { app: key }, disabled: open },
          { label: "Mi&nimize", act: { shared: ["aero.apps", { ...apps(), [key]: "min" }] }, disabled: !open },
          { sep: true },
          { label: "&Close window", bold: true, act: { shared: ["aero.apps", Object.fromEntries(Object.entries(apps()).filter(([k]) => k !== key))] } },
        ]),
    })
      .flex_1()
      .min_w(u(48))
      .max_w(u(170));
  }

  /** A pinned program: an icon-only superbar button. */
  quick(u, id, ico, tip, act) {
    const face = div().relative().flex().items_center().justify_center().w_full().child(typeof ico === "string" ? icon(u, ico, 24) : ico);
    return w7Task(u, `ql-${id}`, face, () => perform(act), { tooltip: tip }).flex_none().w(u(52));
  }

  tray(u) {
    const list = agents().slice(0, 10);
    const mute = shared("aero.mute") === true;
    const icons = list.map((a) => {
      const badge = a.status === "working" ? "hourglass" : a.status === "blocked" ? "warn-badge" : a.status === "done" ? "check-badge" : null;
      return own(
        div()
          .id(`tray-${a.address}`)
          .relative()
          .flex_none()
          .tooltip(`${a.program?.name ?? a.app ?? "Agent"}: ${a.status} - ${a.space_name} \\ ${a.tab_name}`)
          .on_click(() => run("agent.focus", { terminal: a.address }))
          .child(programIcon(u, a.program, 16))
          .when(Boolean(badge), (el) =>
            el.child(
              div()
                .absolute()
                .right(u(-2))
                .bottom(u(-2))
                .child(icon(u, badge, 9))
                .when(a.status === "blocked", (b) => b.loop("opacity", { from: 0, to: 1, period: 900 })),
            ),
          ),
      );
    });
    const d = this.now;
    const date = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    return h_flex()
      .flex_none()
      .h_full()
      .items_center()
      .gap(u(8))
      .pl(u(8))
      .text_color(C.white)
      .children(icons)
      .child(
        own(div().id("tray-speaker").flex_none().tooltip(mute ? "Sounds: off" : "Volume").on_click((_e, cx) => {
          setShared("aero.mute", !mute);
          cx.notify();
        })).child(icon(u, mute ? "speaker-mute" : "speaker", 16)),
      )
      .child(
        own(
          v_flex()
            .id("tray-clock")
            .flex_none()
            .h_full()
            .justify_center()
            .items_center()
            .px(u(6))
            .rounded(u(3))
            .hover((s) => s.bg("#ffffff22"))
            .tooltip(longDate(d))
            .on_click(() => openDialog("datetime", {}))
            .child(div().line_height(`${u(15)}px`).child(clock(d)))
            .child(div().line_height(`${u(15)}px`).child(date)),
        ),
      )
      .child(
        // Show desktop: the glass strip at the far right. Here: minimize the shown tab.
        own(
          div()
            .id("show-desktop")
            .flex_none()
            .w(u(15))
            .h_full()
            .border_l(u(1))
            .border_color("#ffffff40")
            .hover((s) => s.bg("#ffffff35"))
            .tooltip("Show desktop (again: bring the windows back)")
            .on_click(() => {
              // Show desktop: minimize every window; again: bring them back.
              const list = windowPanes();
              const all = { ...wins() };
              const up = list.filter((p) => (all[p.terminal]?.state ?? "normal") !== "min");
              if (up.length) {
                this.peeked = up.map((p) => [p.terminal, all[p.terminal]?.state ?? "normal"]);
                up.forEach((p) => (all[p.terminal] = { ...(all[p.terminal] ?? {}), state: "min" }));
              } else {
                (this.peeked ?? list.map((p) => [p.terminal, "normal"])).forEach(([k, v]) => (all[k] = { ...(all[k] ?? {}), state: v }));
                this.peeked = null;
              }
              setShared("aero.wins", all);
            }),
        ),
      );
  }

  render(cx) {
    const u = unit();
    // Keep the bars whole pixels when the zoom or the scale changes.
    const z = settings()?.zoom;
    const sc = shared("aero.scale");
    if (z !== this.zoom || sc !== this.scale) {
      this.zoom = z;
      this.scale = sc;
      cx.spawn(async () => fitLayout());
    }
    this.syncGames();
    syncWindows(this);
    const s = this.space();
    const all = panes();
    const startOpen = Boolean(shared("aero.start"));
    const winList = windowPanes();
    const tabs = winList.map((p) => this.windowButton(u, p, winList));
    const games = Object.entries(apps())
      .filter(([k]) => GAMES[k])
      .map(([k, v]) => this.gameButton(u, k, v));

    // The Start orb: a glossy sphere; it glows on hover and while the menu is open.
    const start = div()
      .id("start")
      .relative()
      .flex_none()
      .w(u(54))
      .h_full()
      .flex()
      .items_center()
      .justify_center()
      .tooltip("Start")
      .child(
        div()
          .id("start-glow")
          .absolute()
          .top(u(1))
          .left(u(6))
          .w(u(38))
          .h(u(38))
          .rounded(u(19))
          .when(startOpen, (el) => el.bg("#9be0ff70"))
          .hover((s) => s.bg("#9be0ff55")),
      )
      .child(image(`${ASSETS}/icons/aero-orb.svg`).relative().w(u(36)).h(u(36)))
      .on_mouse_down("left", (e, cx) => {
        cx.stop_propagation();
        this.startBounds = e.bounds;
        this.toggleStart(e.bounds);
      });

    const ql = [
      this.quick(u, "dos", "dos", "Command Prompt", { run: ["tab.new", { name: "Command Prompt" }] }),
      ...AGENTS.filter((a) => this.installed.includes(a[0]))
        .slice(0, 2)
        .map(([cmd, name, ico]) => this.quick(u, cmd, programIcon(u, { icon: ico, tint: false }, 24), name, { run: ["tab.new", { name, argv: [cmd] }] })),
    ];

    return root(
      u,
      div()
        .id("taskbar")
        .relative()
        .size_full()
        .bg(TB.base)
        // Resizing a window: follow the pointer anywhere in the app until release.
        .on_window_mouse_move((e) => moveResize(e))
        .on_window_mouse_up("left", () => endResize())
        .on_mouse_move((e) => {
          if (e.bounds) this.screen = e.bounds;
        }),
    )
      .child(
        // Aero glass: a dark edge, a bright line, then a sheen fading down.
        v_flex()
          .absolute()
          .top(0)
          .left(0)
          .size_full()
          .child(div().flex_none().h(u(1)).w_full().bg("#000000a0"))
          .child(div().flex_none().h(u(1)).w_full().bg("#ffffff60"))
          .child(div().relative().flex_1().w_full().child(gradient(TB.top, TB.bottom, 180))),
      )
      .child(
        h_flex()
          .relative()
          .size_full()
          .pt(u(2))
          .items_center()
          .gap(u(2))
          .child(start)
          .children(ql)
          .child(h_flex().flex_1().min_w(0).h_full().gap(u(2)).items_center().children([...tabs, ...games]))
          .child(this.tray(u)),
      );
  }
}

/**
 * A superbar button: clear until hovered; running ones get a glass frame,
 * the shown one a brighter one. o: { on, running, flash (orange, pulsing),
 * progress (a green fill sweeping across), tooltip, onRight }.
 */
function w7Task(u, id, face, onClick, o = {}) {
  const frame = o.on || o.running;
  let b = div()
    .id(`${id}~task`)
    .relative()
    .flex()
    .items_center()
    .h(u(36))
    .px(u(8))
    .rounded(u(3))
    .overflow_hidden()
    .border(u(1))
    .border_color(frame ? (o.on ? "#ffffff90" : "#ffffff45") : "#00000000")
    .bg(o.flash ? "#ff9a2e90" : o.on ? "#ffffff38" : frame ? "#ffffff12" : "#00000000")
    .when(frame, (el) => el.child(roundFill(u, 34, 2, [[0, "#ffffff40"], [0.5, "#ffffff10"], [0.52, "#ffffff00"], [1, "#ffffff18"]], { tl: true, tr: true, bl: true, br: true })))
    .when(Boolean(o.progress), (el) =>
      el.child(div().absolute().top(0).left(0).h_full().rounded(u(2)).bg("#3cd04a66").loop("width", { from: u(0), to: u(168), period: 2400 })),
    )
    .when(Boolean(o.flash), (el) => el.loop("opacity", { from: 0.55, to: 1, period: 900 }))
    .hover((s) => s.bg("#ffffff2e").border_color("#ffffffa0"))
    .child(face)
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation());
  if (o.tooltip) b = b.tooltip(o.tooltip);
  if (o.onRight)
    b = b.on_mouse_down("right", (e, cx) => {
      cx.stop_propagation();
      o.onRight(e, cx);
    });
  if (onClick) b = b.on_click((e, cx) => onClick(e, cx));
  return b;
}

export function closeTabAsk(s, tab) {
  return {
    title: "Close Tab",
    icon: "warning",
    text: `Are you sure you want to close '${tab.name}'?\nIts programs will be ended.`,
    buttons: [
      { label: "&Yes", default: true, act: { run: ["tab.close", { id: tab.id }] } },
      { label: "&No" },
    ],
  };
}

export function closeSpaceAsk(s) {
  return {
    title: "Confirm Folder Delete",
    icon: "warning",
    text: `Are you sure you want to close the space '${s.name}' and all its tabs?\nEvery program in it will be ended.`,
    buttons: [
      { label: "&Yes", default: true, act: { run: ["space.close", { id: s.id, confirmed: true }] } },
      { label: "&No" },
    ],
  };
}
