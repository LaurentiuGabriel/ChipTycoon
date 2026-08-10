# ChipTycoon

**[▶ Take the tour](https://laurentiugabriel.github.io/ChipTycoon/)**

An isometric theme park that is really a chip factory. A cart carries one silicon
wafer along the roads and stops at each of the twenty buildings that turn ordinary
sand into a computer chip. The cargo on the cart is the wafer itself, and it changes
at every stop: a heap of sand, then dark lumps of rough silicon, then white
polysilicon, a silver crystal, a stack of raw wafers, a mirror-flat disc, a green
coated disc, a patterned one, and finally a tray of finished chips.

Two more stops follow the chips out of the gate. They are palletised onto a lorry at
the loading dock and driven to the data centre on the east side of the park, where
another hall of racks lights up with every delivery. Then the lorry drives back to
the gate and the next wafer starts, so the tour runs as a loop.

Pure static site. No build step, no dependencies, no network calls.

## Run it

Open `index.html` in a browser. That is all.

Or serve it:

```
python -m http.server 8000
# → http://localhost:8000
```

## Languages

Use the selector in the top bar to switch between English and Simplified Chinese.
The choice is remembered locally. Switching languages updates the guide, controls,
canvas signs and cargo labels in place without restarting the tour.

## Controls

| | |
|---|---|
| **Space** | play / pause (holds a reading stop indefinitely) |
| **S** | skip to the next stop |
| **R** | restart the guided tour |
| **F** | toggle camera follow |
| **L** | toggle the signs |
| drag | pan · scroll: zoom · double-click: show the whole park |
| **+ − ⤢** | zoom controls on the left edge |
| click a building | pin its explanation (click empty grass to resume following) |

The view starts riding along with the cart, since that is where everything happens.
Any stop in the guide's route list is clickable and the camera flies straight there.

## Test it

```
find js -name '*.js' -exec node --check {} \;
node tests/i18n.test.js
```

## Pacing

It is built to be read, not raced. The first time the cart reaches a stop it waits
between 10 and 22 seconds, scaled to the length of that stop's explanation, and a
bar under the panel text shows how much of the stop is left. The guided first pass
therefore takes about **nine minutes**.

After every stop has been explained there is nothing new to read, so the park
switches to a watchable pace and the repeated lithography laps fast-forward, since
they are the same road with a different mask. **Reset** (⟲) replays the slow tour.

## The twenty two stops

| Act | Stops |
|---|---|
| 1 · Sand to wafer | Sand Pit · Furnace · Purifier · Crystal Puller · Wire Saw · Polisher |
| 2 · Drawing the plan | Design Lab · Mask Shop · Cleanroom Gate |
| 3 · Printing the chip | Layer Tube · Spin Coater · The Printer · Etch Bay · Ion Gun · Wire Floor · The Loop Counter |
| 4 · Chips out the gate | Test Bay · Dicing Saw · Packaging · Shipping Gate |
| 5 · Delivered and put to work | Loading Dock · Data Centre |

Act 3 is laid out as a ring, because that is what it is. Printing a chip means
driving the same six buildings once per layer, about sixty times for a real chip.
The park drives four laps and then moves on, and the Loop Counter shows which
layer you are on.

## Layout

```
.github/workflows/  GitHub Pages deployment
index.html          markup, controls, about copy
css/styles.css      the tycoon chrome: bevels, wooden borders, gold signage
js/iso.js           isometric projection + box / prism / cylinder / cone primitives
js/i18n.js          locale selection, DOM updates and English fallback copy
js/locales/         additional locale dictionaries
js/park.js          routes, stops, lots, one painter per building, scenery
js/tour.js          the state machine that walks the wafer through the park
js/render.js        canvas painter's-algorithm renderer
js/ui.js            guide panel, HUD, transport
js/main.js          camera, input, frame loop
```

`Park.routes` holds the polylines the cart drives and `Park.stations` maps distances
along them to stop IDs. `Tour` fires a stop when the cart reaches a station, which is
where the cargo changes and the narration switches. The five routes run in order:
`intake`, `loop` once per layer, `exit`, `deliver` out to the data centre, and `ret`
back to the gate for the next wafer.

## Notes for editing

- **Depth sorting** is a painter's algorithm keyed on the front corner of each
  footprint. Each building is a single drawable that paints all of its own parts in
  the right internal order, which keeps rooftop details out of the global sort.
- **The ground checker is clipped to the viewport.** The ground plate is deliberately
  enormous so grass fills the screen at any zoom; drawing every tile of it would cost
  tens of thousands of quads a frame.
- **No em dashes** anywhere in the copy.

## Credits

The idea of walking a viewer through a process as a guided isometric tour is borrowed
from a sibling project, TokenTown, which lays out a language model as a city. All
code, art and copy here are original.
