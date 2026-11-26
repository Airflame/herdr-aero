# Herdr Aero

A glassy Aero-style layout for the [Herdr](https://herdr.dev) app: translucent
sky-blue glass frames, a dark glass taskbar with a Start orb, a two-column
Start menu, and terminals as floating windows you can move, resize, minimize
and maximize (maximized = the full view next to the desktop icons).

## Install

Copy into your Herdr home (`~/.config/herdr-app`):

```
layouts/herdr-aero.json   -> layouts/
layouts/herdr-aero.svg    -> layouts/
themes/herdr-aero.json    -> themes/
mods/herdr-aero/          -> mods/
```

Then check the mod and switch to the layout:

```sh
herdr-app check ~/.config/herdr-app/mods/herdr-aero
herdr-app do layout.switch '{"name":"herdr-aero"}'
```

`ctrl-shift-l` cycles back to your other layouts. Details of how it's built
are in `mods/herdr-aero/README.md`.

Fonts: Segoe UI and Consolas (installed on Windows; elsewhere Herdr falls
back to its own fonts).
