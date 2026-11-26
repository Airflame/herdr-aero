"""Herdr Aero's icon set, drawn in a glossy "Frutiger Aero" style.

Run:  python art/aero_icons.py      (from mods/herdr-aero)

Writes icons/<name>.svg (32 px art) and the same art as <name>-sm.svg
(16 px use) and <name>-xs.svg (badges), replacing the pixel-art set this
mod inherited. Every icon shares one light: a soft top-left sky, a white
gloss over the top half, a darker rim and a soft shadow underneath.
"""

import os

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
_n = 0


def uid(p="g"):
    global _n
    _n += 1
    return f"{p}{_n}"


def lin(stops, x1=0, y1=0, x2=0, y2=1):
    i = uid("l")
    s = "".join(f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{a}"' if a is not None else "") + "/>" for o, c, a in [(x[0], x[1], x[2] if len(x) > 2 else None) for x in stops])
    return i, f'<linearGradient id="{i}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{s}</linearGradient>'


def rad(stops, cx=0.5, cy=0.5, r=0.5, fx=None, fy=None):
    i = uid("r")
    s = "".join(f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{a}"' if a is not None else "") + "/>" for o, c, a in [(x[0], x[1], x[2] if len(x) > 2 else None) for x in stops])
    f = (f' fx="{fx}"' if fx is not None else "") + (f' fy="{fy}"' if fy is not None else "")
    return i, f'<radialGradient id="{i}" cx="{cx}" cy="{cy}" r="{r}"{f}>{s}</radialGradient>'


class Icon:
    def __init__(self):
        self.defs = []
        self.body = []

    def lin(self, *a, **k):
        i, d = lin(*a, **k)
        self.defs.append(d)
        return f"url(#{i})"

    def rad(self, *a, **k):
        i, d = rad(*a, **k)
        self.defs.append(d)
        return f"url(#{i})"

    def add(self, s):
        self.body.append(s)
        return self

    def shadow(self, cx=16, cy=29.5, rx=11, ry=2.2, a=0.35):
        f = self.rad([(0, "#0a2a4a", a), (1, "#0a2a4a", 0)])
        return self.add(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{f}"/>')

    def gloss_ellipse(self, cx, cy, rx, ry, a=0.85):
        f = self.lin([(0, "#ffffff", a), (1, "#ffffff", 0.05)])
        return self.add(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{f}"/>')

    def orb(self, cx, cy, r, light, mid, dark, rim=None):
        """A glossy sphere: lit from below-centre (Aero's inner glow), a gloss cap on top."""
        f = self.rad([(0, light), (0.55, mid), (1, dark)], cx=0.5, cy=0.72, r=0.62)
        self.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{f}" stroke="{rim or dark}" stroke-width="0.9"/>')
        self.gloss_ellipse(cx, cy - r * 0.46, r * 0.74, r * 0.46)
        return self

    def svg(self, size=32):
        return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 32 32"><defs>{"".join(self.defs)}</defs>{"".join(self.body)}</svg>'


# ---- building blocks ----------------------------------------------------

def screen_scene(ic, x, y, w, h):
    """A tiny Aero wallpaper: sky, a light swoosh, a green hill."""
    sky = ic.lin([(0, "#2a7fe0"), (1, "#9fe0ff")])
    hill = ic.lin([(0, "#8fe04a"), (1, "#2f9a2a")])
    ic.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{sky}"/>')
    ic.add(f'<path d="M{x} {y + h * 0.62} Q{x + w * 0.45} {y + h * 0.35} {x + w} {y + h * 0.55}" stroke="#ffffff" stroke-opacity=".7" stroke-width=".9" fill="none"/>')
    ic.add(f'<path d="M{x} {y + h * 0.82} Q{x + w * 0.4} {y + h * 0.58} {x + w} {y + h * 0.78} V{y + h} H{x}Z" fill="{hill}"/>')


def monitor(ic, scene=True, wide=False):
    ic.shadow(16, 29.6, 10, 1.8)
    frame = ic.lin([(0, "#4a5a6c"), (0.5, "#1b2633"), (1, "#0b121b")])
    x, w = (2.5, 27) if wide else (4, 24)
    ic.add(f'<rect x="{x}" y="4" width="{w}" height="18.5" rx="2.2" fill="{frame}" stroke="#0a0f16" stroke-width=".8"/>')
    if scene:
        screen_scene(ic, x + 1.6, 5.6, w - 3.2, 14.6)
    # the glass gloss across the bezel
    g = ic.lin([(0, "#ffffff", 0.55), (1, "#ffffff", 0)])
    ic.add(f'<path d="M{x + 0.8} 4.8 H{x + w - 0.8} V11 Q16 9 {x + 0.8} 13 Z" fill="{g}"/>')
    stand = ic.lin([(0, "#e9eef4"), (1, "#8d9aa8")])
    ic.add(f'<path d="M13 22.5 H19 L20.5 27 H11.5 Z" fill="{stand}" stroke="#6b7988" stroke-width=".6"/>')
    ic.add(f'<ellipse cx="16" cy="27.3" rx="7" ry="1.4" fill="{stand}" stroke="#6b7988" stroke-width=".6"/>')


def folder(ic, open_=False):
    ic.shadow(16, 28.8, 12, 1.8)
    back = ic.lin([(0, "#f7d27a"), (1, "#d9982c")])
    ic.add(f'<path d="M3 8.5 Q3 7 4.5 7 H11.5 L13.5 9 H27.5 Q29 9 29 10.5 V26 Q29 27.5 27.5 27.5 H4.5 Q3 27.5 3 26 Z" fill="{back}" stroke="#b07a1e" stroke-width=".8"/>')
    # papers peeking out
    ic.add('<rect x="6" y="10.5" width="20" height="10" rx=".8" fill="#ffffff" stroke="#c9d4df" stroke-width=".5"/>')
    ic.add('<rect x="7.5" y="9.5" width="17" height="9" rx=".8" fill="#f4f9ff" stroke="#c9d4df" stroke-width=".5"/>')
    front = ic.lin([(0, "#ffe9a6"), (0.45, "#f8cf62"), (1, "#e0a033")])
    if open_:
        ic.add(f'<path d="M5.2 14 H30.2 Q31 14 30.7 15 L28.6 26.4 Q28.3 27.5 27 27.5 H4.5 Q3.2 27.5 3.4 26.2 L4.2 15 Q4.3 14 5.2 14 Z" fill="{front}" stroke="#b07a1e" stroke-width=".8"/>')
        ic.gloss_ellipse(17, 16.8, 12, 2.6, 0.75)
    else:
        ic.add(f'<path d="M3 13.5 Q3 12 4.5 12 H27.5 Q29 12 29 13.5 V26 Q29 27.5 27.5 27.5 H4.5 Q3 27.5 3 26 Z" fill="{front}" stroke="#b07a1e" stroke-width=".8"/>')
        ic.gloss_ellipse(16, 15.2, 12.5, 2.8, 0.8)


def globe_badge(ic, cx=24, cy=24, r=6.5):
    ic.orb(cx, cy, r, "#8fe3ff", "#1f8be0", "#0b4c9c")
    land = ic.lin([(0, "#a6f06a"), (1, "#3b9b2a")])
    ic.add(f'<path d="M{cx - r * .55} {cy - r * .1} q{r * .3} {-r * .5} {r * .7} {-r * .2} q{r * .1} {r * .45} {-r * .2} {r * .6} q{-r * .3} {r * .1} {-r * .5} {-r * .4}z M{cx + r * .15} {cy + r * .25} q{r * .45} {-r * .15} {r * .55} {r * .2} q{-r * .15} {r * .4} {-r * .45} {r * .35}z" fill="{land}"/>')
    ic.gloss_ellipse(cx, cy - r * .45, r * .7, r * .42, 0.8)


def page(ic, x, y, w, h, lines=True):
    p = ic.lin([(0, "#ffffff"), (1, "#e3edf7")])
    ic.add(f'<path d="M{x} {y} H{x + w - 4} L{x + w} {y + 4} V{y + h} H{x} Z" fill="{p}" stroke="#8aa1b8" stroke-width=".7"/>')
    ic.add(f'<path d="M{x + w - 4} {y} V{y + 4} H{x + w}" fill="#dbe7f3" stroke="#8aa1b8" stroke-width=".6"/>')
    if lines:
        for k in range(4):
            yy = y + 7 + k * 3.2
            if yy < y + h - 2:
                ic.add(f'<rect x="{x + 2.5}" y="{yy}" width="{w - 6 - (k % 2) * 3}" height="1" rx=".5" fill="#7fb2e5"/>')


def glyph_text(ic, cx, cy, t, size=15, color="#ffffff"):
    ic.add(f'<text x="{cx}" y="{cy}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="{size}" fill="{color}" stroke="#00000033" stroke-width=".4">{t}</text>')


# ---- the icons ---------------------------------------------------------------

def computer():
    ic = Icon(); monitor(ic); return ic


def display():
    ic = Icon(); monitor(ic, wide=True)
    # colour swatches: what Display sets
    for i, c in enumerate(["#3fb6ff", "#7ed957", "#ffb02e", "#ff5d73"]):
        ic.orb(9 + i * 4.6, 18.4, 1.8, "#ffffff", c, c)
    return ic


def taskman():
    ic = Icon(); monitor(ic, scene=False)
    ic.add('<rect x="5.6" y="5.6" width="20.8" height="15.3" fill="#04121e"/>')
    for k in range(1, 4):
        ic.add(f'<path d="M5.6 {5.6 + k * 3.8} H26.4" stroke="#0f3b2a" stroke-width=".5"/>')
    ic.add('<path d="M6 18 L9 15 L11.5 16.5 L14.5 10 L17.5 13.5 L20 8.5 L23 12 L26 9" stroke="#5dff8f" stroke-width="1.3" fill="none" stroke-linejoin="round"/>')
    g = ic.lin([(0, "#ffffff", 0.35), (1, "#ffffff", 0)])
    ic.add(f'<path d="M5 5 H27 V10 Q16 8.5 5 12 Z" fill="{g}"/>')
    return ic


def taskbar():
    ic = Icon(); screen_scene(ic, 0, 0, 0, 0)
    ic.defs.clear(); ic.body.clear()
    ic.shadow(16, 29, 13, 1.6)
    sky = ic.lin([(0, "#3a8fe8"), (1, "#bfeaff")])
    ic.add(f'<rect x="2" y="5" width="28" height="22" rx="2.5" fill="{sky}" stroke="#2a5f9a" stroke-width=".8"/>')
    bar = ic.lin([(0, "#5a7aa0"), (1, "#15263c")])
    ic.add(f'<rect x="2.4" y="21.5" width="27.2" height="5.1" rx="1" fill="{bar}"/>')
    ic.orb(5.6, 24, 2, "#8fe3ff", "#1f7fd6", "#0b2f66")
    ic.add('<rect x="9" y="22.6" width="6" height="2.9" rx=".7" fill="#ffffff" fill-opacity=".35" stroke="#ffffff" stroke-opacity=".6" stroke-width=".4"/>')
    ic.gloss_ellipse(16, 8.5, 12.5, 3.2, 0.6)
    return ic


def bin_():
    ic = Icon(); ic.shadow(16, 29.4, 9, 1.8)
    glass = ic.lin([(0, "#d9f4ff", 0.85), (0.5, "#8fd3f4", 0.75), (1, "#5fb3e0", 0.85)], 0, 0, 1, 0)
    ic.add(f'<path d="M7 8 H25 L23 27.5 Q22.8 28.6 21.6 28.6 H10.4 Q9.2 28.6 9 27.5 Z" fill="{glass}" stroke="#3d86b8" stroke-width=".8"/>')
    for x in (11.5, 16, 20.5):
        ic.add(f'<path d="M{x} 11 V26" stroke="#ffffff" stroke-opacity=".55" stroke-width="1"/>')
    rim = ic.lin([(0, "#f2fbff"), (1, "#7fbfe6")])
    ic.add(f'<ellipse cx="16" cy="8" rx="9.6" ry="2.4" fill="{rim}" stroke="#3d86b8" stroke-width=".8"/>')
    # the green recycling loop
    ic.add('<path d="M12.5 19.5 A4 4 0 0 1 19.2 16.4" stroke="#2fb34a" stroke-width="1.8" fill="none"/><path d="M18.4 14.6 L21 16.6 L18 17.8 Z" fill="#2fb34a"/>')
    ic.add('<path d="M19.6 18.5 A4 4 0 0 1 13 21.8" stroke="#2fb34a" stroke-width="1.8" fill="none"/><path d="M13.7 23.6 L11 21.6 L14.1 20.4 Z" fill="#2fb34a"/>')
    ic.gloss_ellipse(13, 13, 4, 6, 0.5)
    return ic


def folder_icon():
    ic = Icon(); folder(ic); return ic


def folder_open():
    ic = Icon(); folder(ic, True); return ic


def netfolder():
    ic = Icon(); folder(ic); globe_badge(ic, 24.5, 23.5, 6); return ic


def network():
    ic = Icon(); ic.shadow(16, 29.5, 11, 2)
    ic.orb(16, 15, 12, "#a6ecff", "#1f8be0", "#0a4a98")
    land = ic.lin([(0, "#b4f27a"), (1, "#2f8f22")])
    ic.add(f'<path d="M7 11 q3 -4 7 -2 q2 3 -1 5 q-2 2 -1 5 q-3 0 -5 -3 q-1 -3 0 -5z M17 16 q4 -2 7 1 q1 4 -2 6 q-3 1 -5 -1 q-1 -3 0 -6z M18 7 q3 -1 5 1 q-1 2 -4 1z" fill="{land}" stroke="#2a7a1e" stroke-width=".4"/>')
    ic.add('<ellipse cx="16" cy="15" rx="12" ry="4.2" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width=".7"/><ellipse cx="16" cy="15" rx="5" ry="12" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width=".7"/>')
    ic.gloss_ellipse(16, 9.2, 9, 5.2, 0.85)
    return ic


def drive(net=False):
    ic = Icon(); ic.shadow(16, 27.5, 13, 1.8)
    body = ic.lin([(0, "#fbfdff"), (0.5, "#c9d5e1"), (1, "#8796a6")])
    ic.add(f'<rect x="3" y="12" width="26" height="13" rx="2.5" fill="{body}" stroke="#66778a" stroke-width=".8"/>')
    ic.add('<rect x="6" y="20" width="12" height="1.6" rx=".8" fill="#8798ab"/>')
    ic.orb(25, 20.8, 1.6, "#d6ffd2", "#3ddc4a", "#1a8a24")
    ic.gloss_ellipse(16, 14.6, 12, 2.4, 0.9)
    if net:
        ic.add('<path d="M16 25 V29 M9 29 H23" stroke="#3d86b8" stroke-width="1.4"/>')
        globe_badge(ic, 25, 8, 5.5)
    return ic


def printer():
    ic = Icon(); ic.shadow(16, 29, 13, 1.8)
    page(ic, 9, 3, 14, 12, lines=True)
    body = ic.lin([(0, "#ffffff"), (0.55, "#d8e2ec"), (1, "#97a7b8")])
    ic.add(f'<path d="M4 13.5 Q4 11.5 6 11.5 H26 Q28 11.5 28 13.5 V23 Q28 25 26 25 H6 Q4 25 4 23 Z" fill="{body}" stroke="#6d7f93" stroke-width=".8"/>')
    ic.add('<rect x="8" y="21" width="16" height="6.5" rx=".6" fill="#ffffff" stroke="#8aa1b8" stroke-width=".6"/>')
    ic.orb(24.5, 16, 1.3, "#d6ffd2", "#3ddc4a", "#1a8a24")
    ic.gloss_ellipse(16, 13.4, 11, 1.8, 0.9)
    return ic


def documents():
    ic = Icon(); ic.shadow(16, 29.5, 10, 1.6)
    page(ic, 9, 3, 17, 22, lines=False)
    page(ic, 6, 6, 17, 22)
    return ic


def programs():
    """An app window: glass title bar, a glossy content area."""
    ic = Icon(); ic.shadow(16, 29, 13, 1.6)
    glass = ic.lin([(0, "#cfe6ff"), (1, "#7fb2e5")])
    ic.add(f'<rect x="3" y="5" width="26" height="22" rx="3" fill="{glass}" stroke="#3c6ea5" stroke-width=".8"/>')
    ic.add('<rect x="5" y="10" width="22" height="15" rx="1" fill="#ffffff" stroke="#7f9db9" stroke-width=".5"/>')
    ic.add('<circle cx="22" cy="7.5" r="1.1" fill="#ffffff" fill-opacity=".8"/><circle cx="25.3" cy="7.5" r="1.1" fill="#e0614a"/>')
    for i, c in enumerate(["#3fb6ff", "#7ed957", "#ffb02e"]):
        ic.add(f'<rect x="{7 + i * 6.6}" y="12.5" width="5" height="5" rx="1.3" fill="{c}"/>')
    ic.add('<rect x="7" y="20" width="18" height="1.3" rx=".6" fill="#b9cde2"/><rect x="7" y="22.5" width="12" height="1.3" rx=".6" fill="#b9cde2"/>')
    ic.gloss_ellipse(16, 7, 12, 2.2, 0.75)
    return ic


def dos():
    """A terminal: dark glass with a green prompt."""
    ic = Icon(); ic.shadow(16, 29, 13, 1.6)
    frame = ic.lin([(0, "#6f8db0"), (1, "#2c4566")])
    ic.add(f'<rect x="3" y="5" width="26" height="22" rx="3" fill="{frame}" stroke="#1d3350" stroke-width=".8"/>')
    scr = ic.lin([(0, "#14283c"), (1, "#020810")])
    ic.add(f'<rect x="4.6" y="9" width="22.8" height="16.4" rx="1" fill="{scr}"/>')
    ic.add('<path d="M8 13.5 L11.5 16.5 L8 19.5" stroke="#6dff9a" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="13.5" y="18.4" width="6" height="1.7" rx=".5" fill="#6dff9a"/>')
    ic.gloss_ellipse(16, 7.4, 12, 2.4, 0.7)
    g = ic.lin([(0, "#ffffff", 0.22), (1, "#ffffff", 0)])
    ic.add(f'<path d="M4.6 9 H27.4 V13 Q16 11.5 4.6 15 Z" fill="{g}"/>')
    return ic


def orb_icon(light, mid, dark, inner):
    ic = Icon(); ic.shadow(16, 29.6, 10, 1.8)
    ic.orb(16, 15.5, 12.5, light, mid, dark)
    ic.add(inner)
    ic.gloss_ellipse(16, 9.6, 9.2, 5.4, 0.55)
    return ic


BLUE = ("#a6ecff", "#1f8be0", "#0a4a98")
GREEN = ("#d4ffb0", "#43c23a", "#17701c")
RED = ("#ffc2b0", "#e5452c", "#8e140a")
ORANGE = ("#ffe2a8", "#f59a1e", "#a5520a")


def help_():
    return orb_icon(*BLUE, '<text x="16" y="21.5" text-anchor="middle" font-family="Segoe UI, Arial" font-weight="700" font-size="17" fill="#ffffff">?</text>')


def info():
    return orb_icon(*BLUE, '<text x="16" y="21.8" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="17" fill="#ffffff">i</text>')


def error():
    return orb_icon(*RED, '<path d="M11 10.5 L21 20.5 M21 10.5 L11 20.5" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>')


def shutdown():
    return orb_icon(*RED, '<path d="M12 11.6 A6 6 0 1 0 20 11.6" stroke="#ffffff" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M16 8.5 V15" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>')


def logoff():
    return orb_icon(*ORANGE, '<path d="M14 10 H11 Q10 10 10 11 V20 Q10 21 11 21 H14" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14 15.5 H22 M19 12.5 L22 15.5 L19 18.5" stroke="#ffffff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')


def run():
    return orb_icon(*GREEN, '<path d="M13 9.5 L22 15.5 L13 21.5 Z" fill="#ffffff" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>')


def update():
    return orb_icon(*GREEN, '<path d="M10.5 15 A5.6 5.6 0 0 1 20.4 11.4" stroke="#ffffff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M19 8.6 L22 11.6 L18.2 12.8 Z" fill="#ffffff"/><path d="M21.5 16.2 A5.6 5.6 0 0 1 11.6 19.8" stroke="#ffffff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M13 22.6 L10 19.6 L13.8 18.4 Z" fill="#ffffff"/>')


def warning():
    ic = Icon(); ic.shadow(16, 29.3, 12, 1.8)
    f = ic.lin([(0, "#fff1b8"), (0.5, "#ffc62e"), (1, "#e08a00")])
    ic.add(f'<path d="M16 3.2 Q17.2 3.2 17.9 4.4 L29.4 25 Q30.1 26.4 28.6 27 H3.4 Q1.9 26.4 2.6 25 L14.1 4.4 Q14.8 3.2 16 3.2 Z" fill="{f}" stroke="#b36b00" stroke-width=".9"/>')
    ic.add('<path d="M16 10 V18.5" stroke="#3b2a00" stroke-width="2.8" stroke-linecap="round"/><circle cx="16" cy="22.6" r="1.7" fill="#3b2a00"/>')
    g = ic.lin([(0, "#ffffff", 0.8), (1, "#ffffff", 0.05)])
    ic.add(f'<path d="M16 4.6 L22.2 15.6 Q16 13.4 9.8 15.6 Z" fill="{g}"/>')
    return ic


def find():
    ic = Icon(); ic.shadow(15, 29.2, 11, 1.7)
    handle = ic.lin([(0, "#7a8796"), (0.5, "#e7edf3"), (1, "#5b6876")], 0, 0, 1, 1)
    ic.add(f'<path d="M19.5 19 L27.5 27 Q28.6 28.1 27.4 29.2 Q26.3 30.2 25.2 29.1 L17.3 21.2 Z" fill="{handle}" stroke="#4a5664" stroke-width=".7"/>')
    lens = ic.rad([(0, "#ffffff", 0.95), (0.6, "#bfe9ff", 0.75), (1, "#4fb2ea", 0.85)], cy=0.65)
    ic.add(f'<circle cx="13" cy="13" r="9" fill="{lens}" stroke="#9fb0c2" stroke-width="2.4"/>')
    ic.add('<circle cx="13" cy="13" r="9" fill="none" stroke="#5f7184" stroke-width=".6"/>')
    ic.gloss_ellipse(12, 9.4, 5.8, 3.4, 0.9)
    return ic


def gear(ic, cx, cy, r, teeth=10):
    import math
    pts = []
    for k in range(teeth * 2):
        a = math.pi * 2 * k / (teeth * 2)
        rr = r if k % 2 == 0 else r * 0.78
        a2 = a + math.pi / (teeth * 2) * 0.6
        pts.append((cx + rr * math.cos(a - math.pi / (teeth * 4)), cy + rr * math.sin(a - math.pi / (teeth * 4))))
        pts.append((cx + rr * math.cos(a2), cy + rr * math.sin(a2)))
    d = "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in pts) + "Z"
    metal = ic.lin([(0, "#ffffff"), (0.5, "#c2ccd6"), (1, "#7b8794")])
    ic.add(f'<path d="{d}" fill="{metal}" stroke="#5f6b78" stroke-width=".7" stroke-linejoin="round"/>')


def settings():
    ic = Icon(); ic.shadow(16, 29.5, 10, 1.7)
    gear(ic, 16, 15.5, 12.5)
    ic.orb(16, 15.5, 5, "#a6ecff", "#1f8be0", "#0a4a98")
    return ic


def control():
    ic = Icon(); ic.shadow(16, 29, 13, 1.6)
    panel = ic.lin([(0, "#ffffff"), (1, "#c8d8e8")])
    ic.add(f'<rect x="3" y="4" width="26" height="23" rx="3" fill="{panel}" stroke="#6a8aa8" stroke-width=".8"/>')
    for i, (y, x, c) in enumerate([(9.5, 19, "#1f8be0"), (15.5, 11, "#43c23a"), (21.5, 22, "#f59a1e")]):
        ic.add(f'<rect x="7" y="{y - .9}" width="18" height="1.8" rx=".9" fill="#9fb4c9"/>')
        ic.orb(x, y, 2.6, "#ffffff", c, c)
    ic.gloss_ellipse(16, 6.5, 12, 2.2, 0.8)
    return ic


def rename():
    ic = Icon(); page(ic, 5, 4, 18, 23)
    wood = ic.lin([(0, "#ffe38a"), (1, "#e3a21a")], 0, 0, 1, 1)
    ic.add(f'<path d="M14 25.5 L26.2 9.5 L29.4 12 L17.2 28 L13.4 29.2 Z" fill="{wood}" stroke="#a06a10" stroke-width=".7" stroke-linejoin="round"/>')
    ic.add('<path d="M26.2 9.5 L27.6 7.7 Q28.4 6.8 29.3 7.5 L30.6 8.5 Q31.4 9.2 30.7 10.2 L29.4 12 Z" fill="#ff8fa3" stroke="#b5485c" stroke-width=".6"/>')
    ic.add('<path d="M13.4 29.2 L14 25.5 L17.2 28 Z" fill="#3b3b3b"/>')
    return ic


def clock():
    ic = Icon(); ic.shadow(16, 29.6, 10, 1.7)
    rim = ic.lin([(0, "#e8fbff"), (1, "#3d9be0")])
    ic.add(f'<circle cx="16" cy="15.5" r="12.6" fill="{rim}" stroke="#1d6aa8" stroke-width=".8"/>')
    face = ic.rad([(0, "#ffffff"), (1, "#dff1ff")], cy=0.4)
    ic.add(f'<circle cx="16" cy="15.5" r="10.2" fill="{face}" stroke="#8fb8d9" stroke-width=".5"/>')
    import math
    for k in range(12):
        a = math.pi * 2 * k / 12
        r0 = 8.4 if k % 3 else 7.6
        ic.add(f'<path d="M{16 + r0 * math.sin(a):.2f} {15.5 - r0 * math.cos(a):.2f} L{16 + 9.4 * math.sin(a):.2f} {15.5 - 9.4 * math.cos(a):.2f}" stroke="#2c5f8f" stroke-width="{1.2 if k % 3 == 0 else .6}" stroke-linecap="round"/>')
    ic.add('<path d="M16 15.5 L16 9.2 M16 15.5 L20.4 17.6" stroke="#1c3550" stroke-width="1.5" stroke-linecap="round"/><circle cx="16" cy="15.5" r="1.1" fill="#e5452c"/>')
    ic.gloss_ellipse(16, 9.4, 9.4, 5.4, 0.7)
    return ic


def speaker(mute=False):
    ic = Icon(); ic.shadow(14, 29, 9, 1.6)
    body = ic.lin([(0, "#ffffff"), (0.5, "#c9d5e1"), (1, "#7f8e9e")])
    ic.add(f'<path d="M4 12 H9 L16 6 V26 L9 20 H4 Q3 20 3 19 V13 Q3 12 4 12 Z" fill="{body}" stroke="#5f6f80" stroke-width=".8" stroke-linejoin="round"/>')
    if mute:
        ic.add('<circle cx="23.5" cy="16" r="6" fill="none" stroke="#e5452c" stroke-width="2.2"/><path d="M19.3 20.2 L27.7 11.8" stroke="#e5452c" stroke-width="2.2"/>')
    else:
        ic.add('<path d="M19.5 11.5 Q22 16 19.5 20.5" stroke="#1f8be0" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M23 8.5 Q27.5 16 23 23.5" stroke="#47b4f5" stroke-width="2" fill="none" stroke-linecap="round"/>')
    ic.gloss_ellipse(9.5, 10.5, 5, 2.6, 0.7)
    return ic


def hourglass():
    ic = Icon(); ic.shadow(16, 29.6, 8, 1.5)
    wood = ic.lin([(0, "#e8c48a"), (1, "#a8742a")])
    ic.add(f'<rect x="7" y="3" width="18" height="3" rx="1.2" fill="{wood}" stroke="#7a521a" stroke-width=".6"/><rect x="7" y="26" width="18" height="3" rx="1.2" fill="{wood}" stroke="#7a521a" stroke-width=".6"/>')
    glass = ic.lin([(0, "#e9fbff", 0.9), (1, "#9fdaf5", 0.8)], 0, 0, 1, 0)
    ic.add(f'<path d="M9 6 H23 Q23 12 17.5 16 Q23 20 23 26 H9 Q9 20 14.5 16 Q9 12 9 6 Z" fill="{glass}" stroke="#3d86b8" stroke-width=".8"/>')
    ic.add('<path d="M11.5 9 H20.5 Q19.5 12 16 14.5 Q12.5 12 11.5 9 Z" fill="#2aa7e0"/><path d="M11 25 Q12 20.5 16 19.5 Q20 20.5 21 25 Z" fill="#2aa7e0"/><path d="M16 14.5 V19.5" stroke="#2aa7e0" stroke-width=".8"/>')
    ic.gloss_ellipse(13, 10, 2, 3, 0.7)
    return ic


def badge(kind):
    ic = Icon()
    if kind == "check":
        ic.orb(16, 16, 14, *GREEN)
        ic.add('<path d="M9 16.5 L14 21.5 L23.5 11" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    else:
        ic.orb(16, 16, 14, *ORANGE)
        ic.add('<path d="M16 8 V18" stroke="#ffffff" stroke-width="4.2" stroke-linecap="round"/><circle cx="16" cy="23.5" r="2.4" fill="#ffffff"/>')
    return ic


def mine(ic, cx=16, cy=16.5, r=8.5):
    import math
    for k in range(8):
        a = math.pi * k / 4
        ic.add(f'<path d="M{cx + (r - 1) * math.cos(a):.2f} {cy + (r - 1) * math.sin(a):.2f} L{cx + (r + 4) * math.cos(a):.2f} {cy + (r + 4) * math.sin(a):.2f}" stroke="#2b3644" stroke-width="2.4" stroke-linecap="round"/>')
    ic.orb(cx, cy, r, "#7d8fa6", "#26313f", "#05080c")


def mines():
    ic = Icon(); ic.shadow(16, 29.6, 9, 1.6)
    mine(ic)
    ic.add('<circle cx="22.5" cy="9.5" r="2" fill="#ffd24a"/><circle cx="22.5" cy="9.5" r="3.6" fill="#ffd24a" fill-opacity=".35"/>')
    return ic


def sol():
    ic = Icon(); ic.shadow(16, 29.5, 12, 1.6)
    card = ic.lin([(0, "#ffffff"), (1, "#e4eef8")])
    ic.add(f'<g transform="rotate(-12 12 18)"><rect x="4" y="6" width="15" height="21" rx="2" fill="{card}" stroke="#7f97b0" stroke-width=".7"/><path d="M11.5 12.5 C11.5 11 9 11 9 13 C9 15 11.5 16.5 11.5 18 C11.5 16.5 14 15 14 13 C14 11 11.5 11 11.5 12.5Z" fill="#1c2a3a"/></g>')
    ic.add(f'<g transform="rotate(10 20 18)"><rect x="13" y="5" width="15" height="21" rx="2" fill="{card}" stroke="#7f97b0" stroke-width=".7"/><path d="M20.5 18.5 C20.5 17 18 14.5 18 13 C18 11 20.5 11 20.5 12.5 C20.5 11 23 11 23 13 C23 14.5 20.5 17 20.5 18.5Z" fill="#e5452c"/></g>')
    ic.gloss_ellipse(18, 9, 8, 2.4, 0.55)
    return ic


def clippy():
    ic = Icon(); ic.shadow(16, 29.6, 7, 1.4)
    wire = ic.lin([(0, "#f2f6fa"), (0.5, "#9aa8b6"), (1, "#5f6c7a")], 0, 0, 1, 0)
    ic.add(f'<path d="M12 9 V22 Q12 27 16.5 27 Q21 27 21 22 V7 Q21 3.5 17.5 3.5 Q14 3.5 14 7 V21 Q14 23.5 16.5 23.5 Q19 23.5 19 21 V9" stroke="{wire}" stroke-width="2.2" fill="none" stroke-linecap="round"/>')
    ic.add('<circle cx="15" cy="12" r="2.2" fill="#ffffff" stroke="#3b4652" stroke-width=".5"/><circle cx="20.5" cy="12" r="2.2" fill="#ffffff" stroke="#3b4652" stroke-width=".5"/><circle cx="15.5" cy="12.4" r="1" fill="#1c2a3a"/><circle cx="21" cy="12.4" r="1" fill="#1c2a3a"/>')
    return ic


# ---- Mines' own art (16 px cells) ---------------------------------------------

def face(kind):
    ic = Icon()
    ic.orb(16, 16, 14, "#fff8c4", "#ffd43a", "#d18a00")
    if kind == "cool":
        ic.add('<rect x="7" y="11" width="18" height="5" rx="2.4" fill="#10202e"/><path d="M8 12 H24" stroke="#5fc9ff" stroke-width=".8"/>')
    elif kind == "dead":
        ic.add('<path d="M8.5 10 L12.5 14 M12.5 10 L8.5 14 M19.5 10 L23.5 14 M23.5 10 L19.5 14" stroke="#3b2400" stroke-width="2" stroke-linecap="round"/>')
    else:
        ic.add('<ellipse cx="11" cy="12.5" rx="1.9" ry="2.5" fill="#3b2400"/><ellipse cx="21" cy="12.5" rx="1.9" ry="2.5" fill="#3b2400"/>')
    if kind == "ooh":
        ic.add('<ellipse cx="16" cy="21.5" rx="3" ry="3.6" fill="#3b2400"/>')
    elif kind == "dead":
        ic.add('<path d="M10.5 23 Q16 18.5 21.5 23" stroke="#3b2400" stroke-width="2" fill="none" stroke-linecap="round"/>')
    else:
        ic.add('<path d="M9.5 19 Q16 25.5 22.5 19" stroke="#3b2400" stroke-width="2" fill="none" stroke-linecap="round"/>')
    return ic


def mines_flag():
    ic = Icon()
    pole = ic.lin([(0, "#ffffff"), (1, "#7f8e9e")], 0, 0, 1, 0)
    ic.add(f'<rect x="14" y="4" width="3" height="22" rx="1.2" fill="{pole}" stroke="#55626f" stroke-width=".5"/>')
    flag = ic.lin([(0, "#ff9f8a"), (1, "#d4220e")])
    ic.add(f'<path d="M17 4.5 Q22 3 27 6.5 Q22 10 17 15 Z" fill="{flag}" stroke="#8e140a" stroke-width=".6" stroke-linejoin="round"/>')
    ic.add('<ellipse cx="15.5" cy="27" rx="8" ry="2.2" fill="#5d6c7c"/>')
    return ic


def mines_mine():
    ic = Icon(); mine(ic, 16, 16, 9); return ic


def mines_wrong():
    ic = Icon(); mine(ic, 16, 16, 9)
    ic.add('<path d="M5 5 L27 27 M27 5 L5 27" stroke="#e5452c" stroke-width="3" stroke-linecap="round"/>')
    return ic


# ---- write --------------------------------------------------------------------

ICONS = {
    "computer": computer, "display": display, "taskman": taskman, "taskbar": taskbar,
    "bin": bin_, "folder": folder_icon, "folder-open": folder_open, "netfolder": netfolder,
    "network": network, "drive": lambda: drive(False), "netdrive": lambda: drive(True),
    "printer": printer, "documents": documents, "programs": programs, "dos": dos,
    "help": help_, "question": help_, "info": info, "error": error, "warning": warning,
    "shutdown": shutdown, "logoff": logoff, "run": run, "update": update, "find": find,
    "settings": settings, "control": control, "rename": rename, "clock": clock,
    "speaker": lambda: speaker(False), "speaker-mute": lambda: speaker(True),
    "hourglass": hourglass, "check-badge": lambda: badge("check"), "warn-badge": lambda: badge("warn"),
    "mines": mines, "sol": sol, "clippy": clippy,
}

GAME = {
    "mines-face-smile": lambda: face("smile"), "mines-face-ooh": lambda: face("ooh"),
    "mines-face-dead": lambda: face("dead"), "mines-face-cool": lambda: face("cool"),
    "mines-flag": mines_flag, "mines-mine": mines_mine, "mines-wrong": mines_wrong,
}

if __name__ == "__main__":
    n = 0
    for name, fn in ICONS.items():
        for suffix in ("", "-sm", "-xs"):
            path = os.path.join(OUT, f"{name}{suffix}.svg")
            # Only write the sizes the old set had (or that the kit asks for).
            if suffix and not os.path.exists(path) and suffix == "-xs":
                continue
            open(path, "w", encoding="utf-8").write(fn().svg(32 if not suffix else 16 if suffix == "-sm" else 9))
            n += 1
    for name, fn in GAME.items():
        open(os.path.join(OUT, f"{name}.svg"), "w", encoding="utf-8").write(fn().svg(16))
        n += 1
    print(f"wrote {n} icons")
