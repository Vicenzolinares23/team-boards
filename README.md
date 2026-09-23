# Team Break Boards

A local, Whatnot-style tap-to-cross-off team board for live sports card breaks.
Three standalone boards — NBA (30 teams), NFL (32 teams) and MLB (30 teams) —
plus a small landing page that links to all of them.

No build step, no server, no internet connection, no dependencies. Each board
is a single HTML file with its CSS and JS inline.

## Opening it locally

Double-click **`index.html`** and it opens in your default browser. From there
tap **NBA**, **NFL** or **MLB**. You can also double-click `nba.html`, `nfl.html`
or `mlb.html` directly to skip the landing page.

That's it — the pages run straight off the `file://` protocol, so there's
nothing to install or start.

### Viewing it on your phone

Since the pages read logos from the local `assets/` folders, the simplest phone
setup is to copy the whole `team-boards` folder onto the phone (iCloud Drive,
Google Drive, AirDrop, etc.) and open `index.html` from the Files app. If you'd
rather serve it from your computer over Wi-Fi, any static server works, for
example from inside the `team-boards` folder:

```
python3 -m http.server 8000
```

then visit `http://<your-computer-ip>:8000` on the phone.

## How the board works

**Tap to cross off.** Every team is a cell in the grid: its logo on the team's
color. Tapping a cell crosses it off — the cell dims, goes grayscale, and gets a
red X drawn over it.

**Tapping again un-crosses it.** Handy when you mis-tap mid-break — no need to
reset the whole board.

**Fills the screen.** The grid stretches edge to edge across the full viewport in
a wide, landscape arrangement — NBA and MLB 10 columns × 3 rows, NFL 8 columns × 4 rows —
so the entire board is visible at once with no scrolling. Cells scale with the
window, so it works on a phone held sideways and on a desktop monitor alike. Turn
the phone upright and the grid switches to a portrait arrangement (NBA and MLB
5 × 6, NFL 4 × 8) that still fits the screen without scrolling.

**Running count.** The top bar shows how many teams are left, e.g. `18 of 30
left`, and switches to *"Board complete — all 30 teams taken"* once the last one
is crossed off.

**Reset.** Clears every crossed-off team, putting all teams back in play.

**Refresh-safe.** Crossed-off teams are saved in the browser's `localStorage`
per board, so an accidental refresh or a phone locking mid-break won't lose your
progress. Reset clears the saved state too. Each board is stored
separately, so an NBA break and an NFL break don't interfere with each other.

## What's in the assets folders

```
assets/
  nba/    30 team tiles + the original poster screenshot
  nfl/    32 team tiles + the original poster screenshot
  mlb/    30 team patch cutouts + the original patch photo
```

The logos came from two poster screenshots — a 5×6 grid of the NBA logos and a
4×8 grid of the NFL logos, each team on its own colored tile. Those posters were
sliced into one image per team, so the board can show, dim, and cross off each
team independently.

Each board looks for one image per team, named with the team's **lowercase
abbreviation**, read relative to the HTML file:

- `nba.html` → `assets/nba/lal.png`, `assets/nba/bos.png`, …
- `nfl.html` → `assets/nfl/kc.png`, `assets/nfl/sf.png`, …
- `mlb.html` → `assets/mlb/nyy.png`, `assets/mlb/lad.png`, …

`.png` is tried first, then `.svg`, `.webp`, `.jpg`, `.jpeg` — so you can swap in
better artwork later just by dropping a file with the same base name into the
folder. Each tile is scaled to fit its cell without cropping, and the cell's
background is set to the tile's own color, so images that already include the
team's background color (like these) blend in seamlessly; a transparent logo
would simply show the cell color behind it.

If a logo file is missing, that cell falls back to showing the team's
abbreviation in large text on the team's color, and tap-to-cross-off keeps
working as normal.

The MLB logos came from a photo of 30 embroidered team patches laid out on a
countertop. Each patch was cut out along its edge into a transparent PNG, so the
cell's team color shows around it instead of the countertop.

The original screenshots and photo (`Screenshot *.png`) are still in the
folders as the source artwork. Nothing references them at runtime, so you can
delete them if you want to slim the folder down.

### Expected filenames

**`assets/nba/`** (30)

```
atl  bos  bkn  cha  chi  cle  dal  den  det  gsw
hou  ind  lac  lal  mem  mia  mil  min  nop  nyk
okc  orl  phi  phx  por  sac  sas  tor  uta  was
```

**`assets/nfl/`** (32)

```
ari  atl  bal  buf  car  chi  cin  cle  dal  den
det  gb   hou  ind  jax  kc   lv   lac  lar  mia
min  ne   no   nyg  nyj  phi  pit  sf   sea  tb
ten  was
```

**`assets/mlb/`** (30)

```
ari  ath  atl  bal  bos  chc  cin  cle  col  cws
det  hou  kc   laa  lad  mia  mil  min  nym  nyy
phi  pit  sd   sea  sf   stl  tb   tex  tor  wsh
```

### Changing a team's color, name, or order

Team data lives in one array near the top of the `<script>` block in each file,
as `[abbreviation, full name, background color]`:

```js
var TEAMS = [
    ["BOS", "Boston Celtics", "#2B863E"],
    ...
];
```

Teams are listed in division order — Atlantic, Central, Southeast, … for the
NBA; AFC East through NFC West for the NFL; AL East through NL West for the MLB,
two divisions per row, except that the Pirates, Dodgers, Cardinals and Royals
are swapped into the center of the MLB board. Reorder that array to rearrange
the board.

The NBA and NFL colors were sampled from each poster tile so the cell blends
with its artwork; the MLB colors are team colors picked to contrast with each
patch. The logo filename is derived from the abbreviation, and text
automatically switches between white and near-black depending on how bright the
color is.

### Changing the grid shape

The column and row counts are set in the CSS at the top of each file — `#grid`
for the wide landscape layout, and the `@media (orientation: portrait)` block
just below it for the upright one:

```css
#grid {
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(3, 1fr);
}
```

Any pair whose product is at least the team count works; the cells resize
themselves to fill the screen.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Landing page linking to every board |
| `nba.html` | NBA board — standalone, 30 teams, 10 × 3 landscape |
| `nfl.html` | NFL board — standalone, 32 teams, 8 × 4 landscape |
| `mlb.html` | MLB board — standalone, 30 teams, 10 × 3 landscape |
| `assets/nba/`, `assets/nfl/`, `assets/mlb/` | Team logo images |

Every board fills the whole screen with the Reset button in reach — no scrolling
mid-break.
