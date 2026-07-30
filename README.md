# ChipTycoon

A small static website that explains how computer chips are made, starting from
ordinary sand, drawn in the style of the classic park and zoo tycoon games.

Open `index.html` in a browser. There is no build step, no server and no
dependencies. Every drawing is generated as inline SVG in the browser, so the
whole site is plain text.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | The park map, the six line summary and a directory of all twenty stops |
| `tour.html` | The main content: twenty stops from sand pit to shipping gate, each with its own diorama |
| `glossary.html` | Every technical word used on the site, explained in one plain sentence |
| `game.html` | A tiny idle game where you buy the same twenty buildings in the same order |

## How the graphics work

There are no image files. `assets/js/iso.js` is a small isometric drawing
engine and `assets/js/scenes.js` describes each scene as data.

- `iso.js` projects grid coordinates to the screen with
  `screenX = (x - y) * 32`, `screenY = (x + y) * 16 - z * 18`, and provides
  primitives: `tile`, `box`, `roof`, `cyl`, `disc`, `at`, plus park props like
  `person`, `tree`, `lamp` and `sign`.
- Every primitive returns a depth key. Sorting is height first, then the front
  bottom corner of the footprint, so anything resting on a table or a roof is
  always painted after the thing holding it up. Pass `k` to override.
- `scenes.js` lays out each stop on a 6 by 6 tile plot: a path border around a
  4 by 4 working floor. Ground is a character map plus a colour legend.
- `main.js` finds every `[data-scene]` element and fills it with the matching
  scene.

### Two things worth knowing before editing

1. **Animation classes go on an inner group.** A CSS `transform` beats the SVG
   `transform` attribute, so putting an animated class on the positioned group
   drags the prop back to the origin. `at()` handles this by nesting.
2. **Animations should never reach zero opacity** if the prop matters, because
   a screenshot or a paused tab can catch it mid cycle and the prop disappears.

## Adding a stop

Add a scene to `scenes.js`:

```js
scenes.myStop = {
  alt: 'Description read by screen readers',
  legend: G, maxz: 5,
  ground: INDOOR,
  items: [].concat(
    machine(1.5, 1.5, '#7fb3d4', 1.2),
    [person({ x: 2, y: 4.5, c: '#3f7fd4' })],
    [sign({ x: 5.4, y: 4.3, text: 'MY STOP' })]
  )
};
```

Then drop `<div class="plate" data-scene="myStop"></div>` into the page.

## House style

- No em dashes anywhere in the copy.
- Explanations assume no science background.
- Numbers are rounded and given a familiar comparison wherever possible.
