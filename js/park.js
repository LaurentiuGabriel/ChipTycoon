/* park.js: the layout of the fab park.
   Routes the wafer cart drives, the stops it halts at, the buildings, and the
   scenery. Everything here is static data plus one painter per building. */
(function (global) {
  'use strict';

  var Iso = global.Iso;

  /* ---- routes ------------------------------------------------------------ */

  function makeRoute(raw) {
    var pts = raw.map(function (p) { return { x: p[0], y: p[1], z: p[2] || 0 }; });
    var segs = [], total = 0, cum = [0];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      var len = Math.hypot(b.x - a.x, b.y - a.y) || 0.001;
      segs.push({ a: a, b: b, len: len, cum: total });
      total += len;
      cum.push(total);
    }
    return {
      pts: pts, segs: segs, total: total, cum: cum,
      at: function (d) {
        var s;
        if (d <= 0) {
          s = segs[0];
          return { x: s.a.x, y: s.a.y, z: s.a.z, dx: (s.b.x - s.a.x) / s.len, dy: (s.b.y - s.a.y) / s.len };
        }
        if (d >= total) {
          s = segs[segs.length - 1];
          return { x: s.b.x, y: s.b.y, z: s.b.z, dx: (s.b.x - s.a.x) / s.len, dy: (s.b.y - s.a.y) / s.len };
        }
        for (var i = 0; i < segs.length; i++) {
          s = segs[i];
          if (d <= s.cum + s.len) {
            var t = (d - s.cum) / s.len;
            return {
              x: s.a.x + (s.b.x - s.a.x) * t,
              y: s.a.y + (s.b.y - s.a.y) * t,
              z: s.a.z + (s.b.z - s.a.z) * t,
              dx: (s.b.x - s.a.x) / s.len, dy: (s.b.y - s.a.y) / s.len
            };
          }
        }
      }
    };
  }

  /* Act 1 along the top, then Act 2 back along the second row. */
  var INTAKE = makeRoute([
    [-1, 10],      //  0 the park gate
    [ 6, 10],      //  1 sand pit
    [15, 10],      //  2 furnace
    [24, 10],      //  3 purifier
    [33, 10],      //  4 crystal puller
    [42, 10],      //  5 wire saw
    [51, 10],      //  6 polisher
    [57, 10],      //  7 corner
    [57, 15],      //  8
    [53, 17.5],    //  9
    [46, 17.5],    // 10 design lab
    [36, 17.5],    // 11 mask shop
    [26, 17.5],    // 12 cleanroom gate
    [20, 17.5],    // 13
    [16, 21]       // 14 into the loop
  ]);

  /* The photolithography ring. Every lap is one more layer on the wafer. */
  var LOOP = makeRoute([
    [16, 21],      //  0 entry
    [23, 22.5],    //  1 layer tube
    [31, 22.5],    //  2 spin coater
    [39, 22.5],    //  3 the printer
    [45, 23],      //  4
    [48, 26],      //  5
    [47, 30],      //  6
    [43, 33],      //  7
    [36, 33],      //  8 etch bay
    [28, 33],      //  9 ion gun
    [21, 33],      // 10 wire floor
    [16, 32],      // 11
    [13, 29],      // 12
    [13, 25],      // 13 the loop counter
    [16, 21]       // 14 back to the entry
  ]);

  var EXIT = makeRoute([
    [13, 25],      //  0 off the counter
    [ 9, 29],
    [ 9, 35],
    [13, 39],
    [22, 39],      //  4 test bay
    [31, 39],      //  5 dicing saw
    [40, 39],      //  6 packaging
    [49, 39],      //  7 shipping gate
    [56, 39]       //  8 loading dock
  ]);

  /* The delivery run. The chips leave the fab on a lorry and are driven to the
     data centre off the east side of the park, which is where they go to work. */
  var DELIVER = makeRoute([
    [56, 39],      //  0 out of the loading dock
    [62, 38.5],
    [66, 35.5],
    [66.5, 31],
    [64.5, 28.5],
    [59.2, 27.6]   //  5 the data centre bay
  ]);

  /* The empty lorry drives back round the outside of the park for the next batch. */
  var RETURN = makeRoute([
    [59.2, 27.6], [64.5, 28.5], [66.5, 31], [66, 35.5], [64, 42], [59, 47],
    [6, 47], [1, 42], [1, 14], [-1, 11.5], [-1, 10]
  ]);

  var ROUTES = { intake: INTAKE, loop: LOOP, exit: EXIT, deliver: DELIVER, ret: RETURN };

  /* `dwell` is the pause once you have already read a stop. The much longer
     first visit is derived from how much there is to read; see readSeconds. */
  function station(route, idx, id, dwell) {
    return { dist: route.cum[idx], id: id, dwell: dwell == null ? 0.9 : dwell };
  }

  var STATIONS = {
    intake: [
      station(INTAKE, 1, 'sand', 1.5), station(INTAKE, 2, 'furnace', 1.5),
      station(INTAKE, 3, 'purify', 1.5), station(INTAKE, 4, 'crystal', 2.2),
      station(INTAKE, 5, 'saw', 1.5), station(INTAKE, 6, 'polish', 1.5),
      station(INTAKE, 10, 'design', 1.3), station(INTAKE, 11, 'mask', 1.3),
      station(INTAKE, 12, 'cleanroom', 1.3)
    ],
    loop: [
      station(LOOP, 1, 'layer', 1.1), station(LOOP, 2, 'resist', 1.1),
      station(LOOP, 3, 'litho', 2.6), station(LOOP, 8, 'etch', 1.2),
      station(LOOP, 9, 'dope', 1.2), station(LOOP, 10, 'wiring', 1.2),
      station(LOOP, 13, 'loopct', 1.4)
    ],
    exit: [
      station(EXIT, 4, 'test', 1.6), station(EXIT, 5, 'dice', 1.5),
      station(EXIT, 6, 'pack', 1.5), station(EXIT, 7, 'ship', 2.0),
      station(EXIT, 8, 'dock', 1.8)
    ],
    deliver: [ station(DELIVER, 5, 'datacenter', 2.6) ],
    ret: [ station(RETURN, 7, 'newbatch', 1.0) ]
  };

  /* ---- palette ----------------------------------------------------------- */

  var C = {
    grass:    '#5d9c3f',
    grassAlt: '#569439',
    path:     '#cbb68e',
    pathEdge: '#b09a72',
    slab:     '#9aa4ae',
    floor:    '#d8e2ea',
    sand:     '#dcc487',
    steel:    '#b9c3cd',
    steelDk:  '#7f8b98',
    dark:     '#5b6470',
    white:    '#eef3f7',
    teal:     '#3fb5a0',
    copper:   '#c9793f',
    gold:     '#f2c14e',
    red:      '#c8453a',
    blue:     '#3f7fd4',
    violet:   '#9a5fd0',
    brick:    '#a2402f',
    wood:     '#6b4a2b',
    hot:      '#ff9a3c'
  };

  /* ---- the twenty two stops -------------------------------------------------- */

  var STOPS = [
    { id: 'sand', name: 'Sand Pit', act: 1, tag: 'Raw material', x: 6, y: 10, r: 5,
      short: 'A chip starts life as ordinary sand.',
      body: 'Not beach sand. Factories want quartz sand, which is very high in a mineral called silica, and silica is silicon glued to oxygen. About a quarter of the Earth\'s crust is silicon, so we will never run out. The best quartz comes from a handful of mines and is already white and glassy before we touch it.',
      tip: 'Sand is the cheapest thing in this entire park. Almost none of a chip\'s price is the raw material. You are paying for the next nineteen buildings.' },

    { id: 'furnace', name: 'Furnace', act: 1, tag: 'Raw material', x: 15, y: 10, r: 5,
      short: 'Heat sand with carbon and you are left with rough silicon.',
      body: 'Quartz sand and carbon go into a giant electric furnace at about 2000 degrees Celsius. The carbon is greedy for oxygen: it strips the oxygen out of the sand and leaves as gas. What pours out of the bottom is molten silicon, roughly 99 percent pure.',
      tip: '99 percent sounds excellent until you learn the target is 99.9999999 percent. That leftover 1 percent is the next building\'s whole job.' },

    { id: 'purify', name: 'Purifier', act: 1, tag: 'Raw material', x: 24, y: 10, r: 5,
      short: 'Turn the silicon into a gas, clean the gas, turn it back into a solid.',
      body: 'Solids are hard to clean and gases are easy, so the rough silicon is reacted into a silicon gas and boiled over and over until the dirt is gone. The clean gas is then fed onto hot rods where silicon settles out as a solid crust. The result is called polysilicon, and it is nine nines pure: one wrong grain in a swimming pool of sugar.',
      tip: 'Why so fussy? A single stray atom of the wrong kind, sitting in the wrong place, can stop a switch from switching. There are billions of switches.' },

    { id: 'crystal', name: 'Crystal Puller', act: 1, tag: 'Raw material', x: 33, y: 10, r: 5,
      short: 'Melt the polysilicon and slowly pull one perfect crystal out of it.',
      body: 'Polysilicon is a jumble of small crystals pointing every which way, but a chip needs every atom lined up in one repeating grid. So it is melted in a pot, a small seed crystal is dipped in, and the seed is pulled upward while spinning. Silicon freezes onto it and copies its exact alignment. Over a day or two you pull out a silver cylinder up to two metres long, weighing a couple of hundred kilos, that is a single crystal end to end.',
      tip: 'This is the most satisfying ride in the park. Pull too fast and the crystal goes lumpy. Patience is literally the process.' },

    { id: 'saw', name: 'Wire Saw', act: 1, tag: 'Raw material', x: 42, y: 10, r: 5,
      short: 'The crystal is sliced like a salami into thin round plates.',
      body: 'A saw made of long thin wire coated in diamond grit cuts hundreds of slices at once. Each slice is a wafer, under a millimetre thick, and it looks like a dull grey plate. It is thicker than it needs to be on purpose, because the extra silicon stops it snapping while robots move it around.',
      tip: 'Notice the flat edge or notch cut into every wafer. That is not decoration. It tells the machines which way round the crystal grid is pointing.' },

    { id: 'polish', name: 'Polisher', act: 1, tag: 'Raw material', x: 51, y: 10, r: 5,
      short: 'The wafer is polished flatter than almost anything else humans make.',
      body: 'Spinning pads and a milky liquid grind the surface smooth, first roughly and then very gently. The finished wafer is a mirror. Blown up to the size of a football pitch, its tallest bump would be about the height of a coin. It has to be this flat because we are about to print onto it with light, and light will not stay in focus over a bumpy surface.',
      tip: 'Your park now sells blank wafers. Plenty of real companies do exactly this and nothing else.' },

    { id: 'design', name: 'Design Lab', act: 2, tag: 'Planning', x: 46, y: 17.5, r: 5,
      short: 'Before anything is built, the circuit is drawn on a computer.',
      body: 'A chip is a road map of billions of tiny switches called transistors, plus the wiring joining them up. Nobody draws them one at a time: engineers describe what the chip should do in a special language and software works out the layout. The finished drawing is then sliced into layers, like the floors of a building, and each layer becomes one printing job later on.',
      tip: 'Designing a big modern chip takes hundreds of people a few years and can cost more than the building you are standing in.' },

    { id: 'mask', name: 'Mask Shop', act: 2, tag: 'Planning', x: 36, y: 17.5, r: 5,
      short: 'Each layer of the drawing becomes a glass stencil called a mask.',
      body: 'A mask is a flat plate of very pure glass with one layer\'s pattern written on it in a thin metal film. Light passes through the clear parts and is blocked by the metal parts, exactly like a stencil and a spray can. One chip design needs a full set, often sixty masks or more, and a single set can cost several million.',
      tip: 'The mask holds the pattern about four times larger than the finished chip. The printer shrinks it down. Drawing big and printing small is far easier than drawing small.' },

    { id: 'cleanroom', name: 'Cleanroom Gate', act: 2, tag: 'Planning', x: 26, y: 17.5, r: 5,
      short: 'From here on, everything happens in air cleaner than an operating theatre.',
      body: 'The features being printed are far smaller than a speck of dust, so one dust grain landing on a wafer ruins the chip underneath it. Air is pushed down from the ceiling through fine filters and pulled out through the floor, so dust never gets a chance to settle. People wear full white suits, not to protect the human but to protect the wafer from the human, because we shed skin and hair constantly.',
      tip: 'The best cleanrooms have fewer than ten dust particles per cubic metre of air. Your living room has tens of millions.' },

    { id: 'layer', name: 'Layer Tube', act: 3, tag: 'The loop', x: 23, y: 22.5, r: 4.5,
      short: 'Coat the whole wafer with a thin film of something useful.',
      body: 'Sometimes the layer is grown: heat the wafer with oxygen and the top of the silicon turns into glass, which is an excellent insulator. Sometimes it is deposited: blow in a gas that sticks to the surface and builds up a metal or an insulator atom by atom. These films are staggeringly thin, some only a handful of atoms deep. Right now the layer covers everything evenly, which is not yet what we want.',
      tip: 'Think of it as painting a whole wall one colour. The next few stops are about scraping the paint off everywhere except where you actually wanted it.' },

    { id: 'resist', name: 'Spin Coater', act: 3, tag: 'The loop', x: 31, y: 22.5, r: 4.5,
      short: 'The wafer gets a coat of photoresist, a liquid that changes in light.',
      body: 'A few drops land in the middle while the wafer spins fast, and the spin flings the liquid out into a perfectly even coat. Photoresist behaves like the film in an old camera: wherever light lands, it changes. Because of that, the whole area is lit in yellow light only, which is why photographs of a fab always look like the inside of a submarine.',
      tip: 'The coat is about a thousandth of the thickness of a human hair, and it has to be that thick everywhere on a plate 30 cm across. Spinning is a beautifully cheap way to get that.' },

    { id: 'litho', name: 'The Printer', act: 3, tag: 'The loop', x: 39, y: 22.5, r: 5.5,
      short: 'The heart of the factory: the pattern is photographed onto the wafer.',
      body: 'Light shines through the mask, down through a stack of lenses that shrink the image, and onto the coated wafer. The lit parts of the photoresist change and the shadowed parts do not. Only a small patch is printed at a time, then the wafer steps sideways and prints again, over and over, until the whole plate is covered in copies of the same chip. The finest patterns use EUV, a light so fussy it is absorbed by ordinary glass and even by air, so the machine works in a vacuum using mirrors instead of lenses.',
      tip: 'One EUV machine costs a few hundred million, weighs as much as two buses, ships in dozens of crates, and only one company in the world makes them.' },

    { id: 'etch', name: 'Etch Bay', act: 3, tag: 'The loop', x: 36, y: 33, r: 4.5,
      short: 'Wash away the changed goo, then carve the layer underneath.',
      body: 'First comes develop: a liquid washes off the parts of the photoresist the light hit, leaving a stencil made of the goo itself. Then comes etch: a glowing cloud of reactive gas chews away the layer wherever it is now uncovered, but cannot touch what is still hidden. Finally the leftover resist is stripped off, and the pattern is left cut into a real solid layer.',
      tip: 'Etching has to cut straight down, never sideways. Sideways nibbling would make every line fatter than designed and short things together. Perfectly vertical walls are an art form.' },

    { id: 'dope', name: 'Ion Gun', act: 3, tag: 'The loop', x: 28, y: 33, r: 4.5,
      short: 'Fire foreign atoms into chosen spots to change how the silicon conducts.',
      body: 'Pure silicon is a poor conductor. Mixing in a trace of another element, such as boron or phosphorus, makes it conduct in a controllable way. An ion implanter accelerates those atoms to enormous speed and fires them at the wafer like a paint gun, burying them just under the surface. Only the areas left open get hit; everywhere else is shielded.',
      tip: 'A transistor is just a doped patch, another doped patch beside it, and a little gate above the gap. Voltage on the gate lets current flow, no voltage stops it. That is your one and your zero.' },

    { id: 'wiring', name: 'Wire Floor', act: 3, tag: 'The loop', x: 21, y: 33, r: 4.5,
      short: 'Billions of switches are useless until they are wired together.',
      body: 'Trenches are etched into an insulating layer, the whole surface is flooded with copper so the trenches fill up, and the excess copper is polished away. What remains is copper sitting neatly inside the trenches, and those are the wires. Then another insulating layer goes on top and it happens again. A modern chip has more than a dozen storeys of wiring stacked above the transistors.',
      tip: 'Stretch out all the wiring inside one big processor and it would run for tens of kilometres, inside something the size of a stamp.' },

    { id: 'loopct', name: 'The Loop Counter', act: 3, tag: 'The loop', x: 13, y: 25, r: 4.5,
      short: 'That was one layer. A real chip needs about sixty of them.',
      body: 'The last six stops are not a one off, they are a loop that runs for months. Add a layer, coat it, print it, carve it, dope or fill it, polish flat, then start again for the next layer up. Every lap uses a different mask, so every lap draws a different floor of the building, and each new layer has to line up with the one below to within a few nanometres.',
      tip: 'This is why a chip takes about three months to make, and why a wafer travels many kilometres around the fab before it is finished. It is not waiting. It is going round and round.' },

    { id: 'test', name: 'Test Bay', act: 4, tag: 'Finishing', x: 22, y: 39, r: 5,
      short: 'Every chip on the wafer gets a quick exam.',
      body: 'Fine needles press onto tiny metal pads on each chip, send in test signals and check the answers. Failures are marked. On a healthy line most chips pass, but never all of them, and the share that passes is called the yield. Yield is the number that decides whether your park makes money or loses it.',
      tip: 'A chip with one broken core is often not thrown away. That core is switched off and it sells as a cheaper model. Half the range in a shop is the same chip, sorted by how well it turned out.' },

    { id: 'dice', name: 'Dicing Saw', act: 4, tag: 'Finishing', x: 31, y: 39, r: 5,
      short: 'The round plate is cut into hundreds of little squares.',
      body: 'A diamond blade or a laser cuts along narrow empty lanes the designers left between the chips on purpose. Each freed square is called a die, and it is thinner than a fingernail. The good dies are picked up and sent on; the ones marked as failures are dropped.',
      tip: 'The wafer is round but chips are square, so the edge of every wafer is wasted. Bigger wafers waste proportionally less, which is exactly why the industry keeps moving to bigger wafers.' },

    { id: 'pack', name: 'Packaging', act: 4, tag: 'Finishing', x: 40, y: 39, r: 5,
      short: 'A bare die is far too fragile to use, so it gets a case.',
      body: 'The die is glued onto a small base board, then joined to the base\'s metal contacts with hair thin wires or tiny solder balls, and a lid or a hard plastic shell goes over the top. That black rectangle you see on a circuit board is the packaging, not the chip. The package also spreads the connections out far enough for human made circuit boards to reach them, and helps carry heat away.',
      tip: 'Packaging used to be the boring part. Now it is a race of its own, because stacking several dies into one package is often easier than making a single giant one.' },

    { id: 'ship', name: 'Shipping Gate', act: 4, tag: 'Finishing', x: 49, y: 39, r: 5,
      short: 'Final exam, sorted by grade, then out of the gate.',
      body: 'This time each chip is tested hot, cold and at full speed, because a chip that works on a calm bench may fail in a warm laptop. The results decide the grade: the fastest and most reliable are sold at the top price and the rest fill the cheaper models. Then they are counted into trays and reels, sealed up, and wheeled out to the loading dock next door.',
      tip: 'Sand went in at stop one and a working chip comes out of the gate here, about three months and several hundred careful steps later. Two stops to go: watch where it actually ends up.' },

    { id: 'dock', name: 'Loading Dock', act: 5, tag: 'Delivery', x: 56.6, y: 42.2, r: 5,
      short: 'The finished chips are stacked onto a lorry.',
      body: 'The sealed trays go into moisture proof bags, the bags into boxes, the boxes onto a pallet, and the pallet is strapped down and driven onto a lorry. Every box carries a code that leads back to the wafer it was cut from, so if a fault turns up months later the whole batch can be traced. Most loads do not go straight to a shop. They go to a board factory, where the chips are soldered onto circuit boards, and those boards are bolted into servers.',
      tip: 'Chips are small and expensive, so one lorry can be carrying more value than every building in this park put together.' },

    { id: 'datacenter', name: 'Data Centre', act: 5, tag: 'Delivery', x: 56, y: 24, r: 6,
      short: 'The chips are racked up, powered on, and put to work.',
      body: 'The servers slide into racks, the racks fill halls like this one, and the doors close. Power comes in at one end and heat is pulled out at the other, because a full rack throws out as much heat as a row of electric heaters. From here the chip you followed spends the next few years answering searches, streaming video, training models and serving the pages you read. Every lap the cart drove round that ring is one layer of what is now switching billions of times a second in here.',
      tip: 'That is the whole ride. A scoop of quartz sand at stop one, a hall full of thinking machines at stop twenty two, and then the lorry drives back to the fab and the next wafer starts.' }
  ];

  var STOP_BY_ID = {};
  STOPS.forEach(function (s) { STOP_BY_ID[s.id] = s; });

  /* Reading stops are scaled to how much there is to read. */
  function readSeconds(id) {
    var s = STOP_BY_ID[id];
    if (!s) return 8;
    var words = (s.short + ' ' + s.body + ' ' + s.tip).split(/\s+/).length;
    return Math.min(22, Math.max(10, words / 4.4 + 3));
  }
  Object.keys(STATIONS).forEach(function (r) {
    STATIONS[r].forEach(function (st) { st.read = readSeconds(st.id); });
  });

  /* ---- ground ------------------------------------------------------------ */

  /* BOUNDS is what the camera frames. GROUND is drawn much larger so grass
     always fills the viewport instead of the park floating on a backdrop. */
  var BOUNDS = { x0: -4, y0: 2, x1: 69, y1: 49 };
  var GROUND = { x0: -420, y0: -400, x1: 470, y1: 460 };

  /* Paved lots under each cluster of buildings. */
  var LOTS = [
    { x: 2, y: 3.4, w: 8, d: 6.2, c: C.sand },
    { x: 11, y: 3.4, w: 8, d: 6.2, c: C.slab },
    { x: 20, y: 3.4, w: 8, d: 6.2, c: C.slab },
    { x: 29, y: 3.4, w: 8, d: 6.2, c: C.floor },
    { x: 38, y: 3.4, w: 8, d: 6.2, c: C.floor },
    { x: 47, y: 3.4, w: 8, d: 6.2, c: C.floor },
    { x: 41.5, y: 11.6, w: 9, d: 5.1, c: C.floor },
    { x: 31.5, y: 11.6, w: 9, d: 5.1, c: C.floor },
    { x: 21.5, y: 11.6, w: 9, d: 5.1, c: C.floor },
    { x: 18.6, y: 17.8, w: 8.4, d: 3.9, c: C.floor },
    { x: 27.4, y: 17.8, w: 7.6, d: 3.9, c: C.floor },
    { x: 35.4, y: 17.0, w: 9.0, d: 4.7, c: C.floor },
    { x: 31.6, y: 34.2, w: 8.6, d: 4.2, c: C.floor },
    { x: 23.6, y: 34.2, w: 7.6, d: 4.2, c: C.floor },
    { x: 15.6, y: 34.2, w: 7.6, d: 4.2, c: C.floor },
    { x: 6.4, y: 22.0, w: 6.2, d: 6.0, c: C.slab },
    { x: 17.6, y: 40.4, w: 8.6, d: 4.4, c: C.floor },
    { x: 26.6, y: 40.4, w: 8.6, d: 4.4, c: C.floor },
    { x: 35.6, y: 40.4, w: 8.6, d: 4.4, c: C.floor },
    { x: 44.6, y: 40.4, w: 9.0, d: 4.4, c: C.slab },
    { x: 53.6, y: 40.4, w: 5.8, d: 4.4, c: C.slab },
    /* the data centre off the east side, and the yard its lorries park in */
    { x: 50.2, y: 18.2, w: 10.4, d: 7.4, c: C.floor },
    { x: 50.6, y: 25.6, w: 11.4, d: 4.4, c: C.slab },
    /* the plaza inside the loop */
    { x: 20, y: 25, w: 24, d: 6.4, c: C.path }
  ];

  /* ---- building painters -------------------------------------------------- */

  var B = [];

  function add(o) { B.push(o); return o; }

  /* shared bits ---------------------------------------------------------- */

  function hall(ctx, x, y, w, d, h, body, roofC) {
    Iso.box(ctx, { x: x, y: y, w: w, d: d, h: h, color: body });
    Iso.gable(ctx, { x: x, y: y, z: h, w: w, d: d, h: Math.min(1.6, d * 0.34), color: roofC });
  }

  function machine(ctx, x, y, w, d, h, c, t, blinkSeed) {
    Iso.box(ctx, { x: x, y: y, w: w, d: d, h: 0.22, color: C.dark });
    Iso.box(ctx, { x: x + 0.1, y: y + 0.1, z: 0.22, w: w - 0.2, d: d - 0.2, h: h, color: c });
    var p = Iso.project(x + w * 0.5, y + d, 0.22 + h * 0.6);
    ctx.fillStyle = '#22303f';
    ctx.fillRect(p.x - 9, p.y - 8, 18, 12);
    ctx.fillStyle = '#4fd0c0';
    ctx.fillRect(p.x - 7, p.y - 6, 8, 8);
    ctx.fillStyle = (Math.sin(t * 4 + (blinkSeed || 0)) > 0) ? '#ff5f4d' : '#5c2b26';
    ctx.beginPath(); ctx.arc(p.x + 5, p.y - 2, 2.4, 0, 6.2832); ctx.fill();
  }

  function glow(ctx, x, y, z, r, t, c1, c2) {
    var k = 0.82 + 0.18 * Math.sin(t * 2.4);
    ctx.globalAlpha = k;
    ctx.fillStyle = c1 || C.hot;
    Iso.disc(ctx, x, y, z, r);
    ctx.fillStyle = c2 || '#fff0b8';
    Iso.disc(ctx, x, y, z + 0.01, r * 0.5);
    ctx.globalAlpha = 1;
  }

  function smoke(ctx, x, y, z, t) {
    for (var i = 0; i < 3; i++) {
      var k = ((t * 0.34) + i / 3) % 1;
      var p = Iso.project(x, y, z + k * 3.4);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - k)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.x + Math.sin(k * 4 + i) * 7, p.y, 5 + k * 11, 0, 6.2832);
      ctx.fill();
    }
  }

  function pipes(ctx, x, y, n, z, c) {
    for (var i = 0; i < n; i++) {
      Iso.box(ctx, { x: x + i, y: y, z: z, w: 1, d: 0.3, h: 0.3, color: c || '#8ea0b3' });
    }
  }

  /* wafer disc drawn flat, used all over the park */
  function waferDisc(ctx, x, y, z, r, c) {
    ctx.fillStyle = c;
    Iso.disc(ctx, x, y, z, r);
    ctx.strokeStyle = Iso.shade(c, 0.6);
    ctx.lineWidth = 1.2;
    Iso.discEdge(ctx, x, y, z, r);
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    Iso.disc(ctx, x - r * 0.28, y - r * 0.28, z + 0.005, r * 0.4);
  }

  /* --- act 1 ------------------------------------------------------------- */

  add({ id: 'sand', x: 3, y: 4, w: 6.6, d: 5, draw: function (ctx, b, t) {
    Iso.box(ctx, { x: 3.2, y: 4.2, w: 6, d: 4.4, h: 0.4, color: '#bfa268' });
    Iso.box(ctx, { x: 4.0, y: 4.8, w: 4.2, d: 3.2, h: 0.4, z: 0.4, color: '#d0b478' });
    Iso.box(ctx, { x: 4.9, y: 5.4, w: 2.4, d: 2.0, h: 0.4, z: 0.8, color: '#e5d09a' });
    /* digger, arm swinging slowly */
    var sw = Math.sin(t * 0.7) * 0.5;
    Iso.box(ctx, { x: 5.0, y: 5.6, z: 1.2, w: 1.5, d: 1.1, h: 0.3, color: '#3a4450' });
    Iso.box(ctx, { x: 5.2, y: 5.75, z: 1.5, w: 1.0, d: 0.85, h: 0.7, color: '#f0b33c' });
    var a = Iso.project(6.2, 6.2, 2.1), c2 = Iso.project(7.6 + sw, 6.2, 2.9 + sw * 0.4);
    ctx.strokeStyle = '#d79a2e'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c2.x, c2.y); ctx.stroke();
    ctx.fillStyle = '#8d99a6';
    ctx.beginPath(); ctx.arc(c2.x, c2.y, 6, 0, 6.2832); ctx.fill();
    ctx.lineCap = 'butt';
  }});

  add({ id: 'furnace', x: 11.4, y: 3.8, w: 7.2, d: 5.4, draw: function (ctx, b, t) {
    hall(ctx, 11.6, 4.2, 3.4, 3.6, 1.9, C.steel, C.brick);
    Iso.cylinder(ctx, { x: 16.8, y: 6.0, r: 1.15, h: 3.4, color: '#7d6a58' });
    glow(ctx, 16.8, 6.0, 3.4, 1.05, t);
    smoke(ctx, 16.8, 6.0, 3.6, t);
    Iso.box(ctx, { x: 12.2, y: 8.0, w: 4.6, d: 1.0, h: 0.7, color: C.dark });
    glow(ctx, 14.5, 8.5, 0.72, 1.1, t + 1);
  }});

  add({ id: 'purify', x: 20.2, y: 3.8, w: 7.6, d: 5.4, draw: function (ctx, b, t) {
    Iso.cylinder(ctx, { x: 21.6, y: 5.2, r: 0.8, h: 4.4, color: '#cfd6dd' });
    Iso.cylinder(ctx, { x: 23.4, y: 5.2, r: 0.8, h: 3.4, color: '#cfd6dd' });
    Iso.cylinder(ctx, { x: 25.2, y: 5.2, r: 0.8, h: 4.9, color: '#cfd6dd' });
    pipes(ctx, 21.4, 4.2, 4, 2.8);
    machine(ctx, 21.0, 7.2, 2.2, 1.6, 1.2, '#7fb3d4', t, 1);
    Iso.cylinder(ctx, { x: 25.6, y: 7.8, r: 1.0, h: 1.3, color: '#9fd8e8' });
    waferDisc(ctx, 25.6, 7.8, 1.32, 1.0, '#d7f3fb');
  }});

  add({ id: 'crystal', x: 29.2, y: 3.8, w: 7.6, d: 5.6, draw: function (ctx, b, t) {
    Iso.box(ctx, { x: 30.2, y: 4.2, w: 0.8, d: 0.8, h: 5.4, color: C.steelDk });
    Iso.box(ctx, { x: 30.2, y: 4.4, w: 3.6, d: 0.5, h: 0.4, z: 5.4, color: C.steelDk });
    Iso.box(ctx, { x: 31.6, y: 5.6, w: 3.2, d: 3.0, h: 0.6, color: C.dark });
    Iso.cylinder(ctx, { x: 33.2, y: 7.1, r: 1.1, h: 1.1, z: 0.6, color: '#9aa4ae' });
    glow(ctx, 33.2, 7.1, 1.72, 1.05, t);
    /* the ingot climbs out of the melt and sinks back */
    var lift = 1.9 + (Math.sin(t * 0.42) * 0.5 + 0.5) * 1.7;
    var tp = Iso.project(33.2, 7.1, lift + 2.2), bp = Iso.project(33.2, 7.1, lift);
    ctx.strokeStyle = '#7b8794'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y - 26); ctx.lineTo(tp.x, tp.y); ctx.stroke();
    Iso.cylinder(ctx, { x: 33.2, y: 7.1, r: 0.52, h: 2.2, z: lift, color: '#aab7c6' });
    ctx.fillStyle = '#8b98a8';
    ctx.beginPath();
    ctx.moveTo(bp.x - 20, bp.y - 2); ctx.quadraticCurveTo(bp.x, bp.y + 12, bp.x + 20, bp.y - 2);
    ctx.closePath(); ctx.fill();
    machine(ctx, 35.0, 4.4, 1.6, 1.6, 1.2, '#7fb3d4', t, 2);
  }});

  add({ id: 'saw', x: 38.2, y: 3.8, w: 7.6, d: 5.4, draw: function (ctx, b, t) {
    Iso.box(ctx, { x: 38.6, y: 5.0, w: 5.2, d: 2.4, h: 0.8, color: C.dark });
    Iso.cylinder(ctx, { x: 40.0, y: 6.2, r: 0.62, h: 3.0, z: 0.8, color: '#aab7c6' });
    /* frame with wires sawing back and forth */
    var sx = Math.sin(t * 6) * 3;
    var f1 = Iso.project(39.4, 5.2, 0.8), f2 = Iso.project(43.4, 5.2, 0.8);
    ctx.strokeStyle = '#5f6b78'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(f1.x, f1.y); ctx.lineTo(f1.x, f1.y - 52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(f2.x, f2.y); ctx.lineTo(f2.x, f2.y - 52); ctx.stroke();
    ctx.strokeStyle = '#8d99a6'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(f1.x, f1.y - 52); ctx.lineTo(f2.x, f2.y - 52); ctx.stroke();
    ctx.strokeStyle = '#eef3f7'; ctx.lineWidth = 1.4;
    for (var i = 0; i < 4; i++) {
      var yy = f1.y - 40 + i * 7;
      ctx.beginPath(); ctx.moveTo(f1.x + 6 + sx, yy); ctx.lineTo(f2.x - 6 + sx, yy + 18); ctx.stroke();
    }
    for (var j = 0; j < 3; j++) waferDisc(ctx, 41.4 + j * 1.1, 8.2, 0.02, 0.62, '#a8bbcd');
  }});

  add({ id: 'polish', x: 47.2, y: 3.8, w: 7.6, d: 5.4, draw: function (ctx, b, t) {
    Iso.box(ctx, { x: 47.6, y: 4.8, w: 5.6, d: 2.2, h: 0.7, color: C.dark });
    for (var i = 0; i < 3; i++) {
      var cx = 48.6 + i * 1.8;
      waferDisc(ctx, cx, 5.9, 0.72, 0.78, '#c9d3dd');
      ctx.save();
      var p = Iso.project(cx, 5.9, 0.76);
      ctx.translate(p.x, p.y);
      ctx.scale(Math.abs(Math.cos(t * 3 + i)) * 0.8 + 0.2, 1);
      ctx.fillStyle = 'rgba(143,208,232,0.9)';
      ctx.beginPath(); ctx.ellipse(0, 0, 26, 13, 0, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
    waferDisc(ctx, 50.4, 8.2, 0.02, 1.0, '#eaf2f8');
  }});

  /* --- act 2 ------------------------------------------------------------- */

  add({ id: 'design', x: 41.8, y: 11.8, w: 8.4, d: 4.8, draw: function (ctx, b, t) {
    hall(ctx, 42.0, 12.0, 8.0, 4.2, 2.0, '#e5eaf0', '#4d7fb5');
    /* two screens on the front wall, patterns crawling */
    for (var i = 0; i < 2; i++) {
      var p = Iso.project(43.6 + i * 3.4, 16.2, 1.5);
      ctx.fillStyle = '#16324a';
      ctx.fillRect(p.x - 26, p.y - 30, 52, 34);
      ctx.strokeStyle = i ? '#ffcf5c' : '#4fd0c0';
      ctx.lineWidth = 1.6;
      for (var k = 0; k < 5; k++) {
        var off = ((t * 8 + k * 9 + i * 13) % 44) - 22;
        ctx.beginPath();
        ctx.moveTo(p.x - 22, p.y - 26 + k * 6);
        ctx.lineTo(p.x - 22 + off + 22, p.y - 26 + k * 6);
        ctx.stroke();
      }
    }
  }});

  add({ id: 'mask', x: 31.8, y: 11.8, w: 8.4, d: 4.8, draw: function (ctx, b, t) {
    hall(ctx, 32.0, 12.0, 8.0, 4.2, 2.0, '#dfe7ee', '#7a6ba8');
    /* a glass mask plate stood on a plinth outside */
    Iso.box(ctx, { x: 33.0, y: 16.4, w: 1.8, d: 0.9, h: 0.5, color: C.dark });
    var p = Iso.project(33.9, 16.85, 0.5);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#a9e4f2';
    ctx.fillRect(p.x - 22, p.y - 34, 44, 34);
    ctx.strokeStyle = '#12293b'; ctx.lineWidth = 1.5;
    for (var i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(p.x - 22 + i * 8.8, p.y - 34); ctx.lineTo(p.x - 22 + i * 8.8, p.y); ctx.stroke();
    }
    ctx.strokeStyle = '#5f9fb5'; ctx.lineWidth = 2.5;
    ctx.strokeRect(p.x - 22, p.y - 34, 44, 34);
    ctx.globalAlpha = 1;
  }});

  add({ id: 'cleanroom', x: 21.8, y: 11.8, w: 8.4, d: 4.8, draw: function (ctx, b, t) {
    Iso.box(ctx, { x: 22.0, y: 12.0, w: 8.0, d: 4.2, h: 2.6, color: '#eef4f9' });
    Iso.box(ctx, { x: 22.0, y: 12.0, w: 8.0, d: 4.2, h: 0.24, z: 2.6, color: '#c6d3de' });
    /* the airlock door, flush on the front wall */
    Iso.box(ctx, { x: 25.2, y: 16.1, w: 1.8, d: 0.12, h: 1.9, color: '#8fd4ea' });
    /* air raining down inside the doorway */
    ctx.strokeStyle = 'rgba(63,168,204,0.85)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      var k = ((t * 0.9) + i / 3) % 1;
      var p = Iso.project(25.5 + i * 0.5, 16.0, 1.85 - k * 1.5);
      ctx.globalAlpha = 0.35 + 0.65 * Math.sin(k * Math.PI);
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 8); ctx.lineTo(p.x, p.y + 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  }});

  /* --- act 3, the loop --------------------------------------------------- */

  add({ id: 'layer', x: 18.8, y: 17.9, w: 8.0, d: 3.7, draw: function (ctx, b, t) {
    Iso.box(ctx, { x: 19.2, y: 18.4, w: 6.6, d: 1.9, h: 0.7, color: C.dark });
    Iso.orientedBox(ctx, { x: 22.5, y: 19.35, hx: 1, hy: 0, len: 6.4, wid: 1.5, z: 0.7, h: 1.4, color: '#c9d3dd' });
    /* heater bands pulsing along the tube */
    for (var i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t * 2.4 + i);
      Iso.box(ctx, { x: 20.4 + i * 1.9, y: 18.6, z: 0.7, w: 0.45, d: 1.5, h: 1.4, color: C.hot, edge: false });
    }
    ctx.globalAlpha = 1;
    Iso.cylinder(ctx, { x: 19.8, y: 20.9, r: 0.4, h: 1.2, color: '#7fb3d4' });
    Iso.cylinder(ctx, { x: 20.8, y: 20.9, r: 0.4, h: 1.2, color: '#e0a94f' });
  }});

  add({ id: 'resist', x: 27.6, y: 17.9, w: 7.2, d: 3.7, draw: function (ctx, b, t) {
    Iso.box(ctx, { x: 28.6, y: 18.4, w: 3.4, d: 2.6, h: 0.7, color: C.dark });
    Iso.cylinder(ctx, { x: 30.3, y: 19.7, r: 1.2, h: 0.4, z: 0.7, color: '#8d99a6' });
    /* the wafer spinning under the nozzle */
    waferDisc(ctx, 30.3, 19.7, 1.12, 1.0, '#3fb5a0');
    ctx.save();
    var p = Iso.project(30.3, 19.7, 1.14);
    ctx.translate(p.x, p.y);
    ctx.scale(Math.abs(Math.cos(t * 5)) * 0.85 + 0.15, 1);
    ctx.fillStyle = 'rgba(79,208,192,0.55)';
    ctx.beginPath(); ctx.ellipse(0, 0, 34, 17, 0, 0, 6.2832); ctx.fill();
    ctx.restore();
    Iso.box(ctx, { x: 28.7, y: 18.1, w: 0.5, d: 0.5, h: 3.0, color: C.steelDk });
    Iso.box(ctx, { x: 28.7, y: 18.2, w: 2.0, d: 0.3, h: 0.3, z: 2.7, color: C.steelDk });
    /* a drop falling onto the middle of the wafer */
    var k = (t * 0.9) % 1;
    var dp = Iso.project(30.3, 19.4, 2.7 - k * 1.5);
    ctx.fillStyle = '#3fb5a0'; ctx.globalAlpha = 1 - k * 0.5;
    ctx.beginPath(); ctx.arc(dp.x, dp.y, 4, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 1;
    Iso.cylinder(ctx, { x: 33.4, y: 19.0, r: 0.42, h: 1.3, color: '#3fb5a0' });
    Iso.cylinder(ctx, { x: 33.4, y: 20.2, r: 0.42, h: 1.3, color: '#3fb5a0' });
  }});

  add({ id: 'litho', x: 35.4, y: 17.0, w: 9.0, d: 4.6, draw: function (ctx, b, t) {
    Iso.box(ctx, { x: 35.8, y: 17.4, w: 8.0, d: 4.0, h: 0.5, color: '#5b6470' });
    /* light source tower */
    Iso.box(ctx, { x: 36.2, y: 17.8, w: 2.0, d: 2.0, h: 4.2, z: 0.5, color: '#dfe7ee' });
    glow(ctx, 37.2, 18.8, 4.75, 1.6, t, '#ffe9a8', '#ffffff');
    /* the beam falling onto the wafer stage */
    var beam = 0.5 + 0.4 * Math.abs(Math.sin(t * 1.4));
    var tp = Iso.project(40.4, 19.8, 4.4), bp = Iso.project(40.4, 19.8, 0.9);
    ctx.globalAlpha = beam;
    var g = ctx.createLinearGradient(tp.x, tp.y, bp.x, bp.y);
    g.addColorStop(0, 'rgba(190,238,255,0.9)');
    g.addColorStop(1, 'rgba(120,210,255,0.15)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(tp.x - 26, tp.y); ctx.lineTo(tp.x + 26, tp.y);
    ctx.lineTo(bp.x + 13, bp.y); ctx.lineTo(bp.x - 13, bp.y);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    /* the mask held in the beam, then the lens stack shrinking it */
    var mp = Iso.project(40.4, 19.8, 3.5);
    ctx.fillStyle = '#a9e4f2'; ctx.fillRect(mp.x - 30, mp.y - 9, 60, 18);
    ctx.strokeStyle = '#12293b'; ctx.lineWidth = 1.4;
    for (var i = 1; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(mp.x - 30 + i * 10, mp.y - 9); ctx.lineTo(mp.x - 30 + i * 10, mp.y + 9); ctx.stroke();
    }
    ctx.strokeStyle = '#5f9fb5'; ctx.lineWidth = 2.5; ctx.strokeRect(mp.x - 30, mp.y - 9, 60, 18);
    ctx.fillStyle = 'rgba(207,232,245,0.95)';
    ctx.strokeStyle = '#7f96a8'; ctx.lineWidth = 2;
    for (var L = 0; L < 3; L++) {
      var lp = Iso.project(40.4, 19.8, 2.5 - L * 0.42);
      ctx.beginPath(); ctx.ellipse(lp.x, lp.y, 26 - L * 6, 9 - L * 2, 0, 0, 6.2832);
      ctx.fill(); ctx.stroke();
    }
    /* the stage, stepping the wafer sideways between exposures */
    var step = Math.round(Math.sin(t * 0.8) * 2) * 0.34;
    Iso.box(ctx, { x: 39.5, y: 19.0, w: 1.9, d: 1.7, h: 0.4, z: 0.5, color: '#8d99a6' });
    waferDisc(ctx, 40.4 + step, 19.8, 0.92, 0.8, '#3fb5a0');
    Iso.box(ctx, { x: 42.6, y: 17.8, w: 1.2, d: 3.2, h: 2.2, z: 0.5, color: '#c4ccd4' });
  }});

  add({ id: 'etch', x: 31.6, y: 34.0, w: 8.6, d: 4.2, draw: function (ctx, b, t) {
    for (var i = 0; i < 2; i++) {
      var x = 32.2 + i * 3.6;
      Iso.box(ctx, { x: x, y: 34.4, w: 3.0, d: 2.6, h: 1.7, color: '#a8b4c0' });
      var p = Iso.project(x + 1.5, 37.0, 1.0);
      ctx.fillStyle = '#22303f';
      ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + i * 2);
      ctx.fillStyle = '#b06cf0';
      ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 1;
    }
    pipes(ctx, 32.2, 33.9, 6, 1.9);
  }});

  add({ id: 'dope', x: 23.6, y: 34.0, w: 7.6, d: 4.2, draw: function (ctx, b, t) {
    Iso.box(ctx, { x: 24.0, y: 34.4, w: 2.0, d: 2.2, h: 1.9, color: '#b7c0c9' });
    Iso.box(ctx, { x: 28.4, y: 34.4, w: 2.0, d: 2.2, h: 1.9, color: '#b7c0c9' });
    Iso.box(ctx, { x: 26.0, y: 35.1, w: 2.4, d: 0.8, h: 0.5, z: 1.0, color: C.steelDk });
    /* the ion beam, with atoms streaming down it */
    var a = Iso.project(26.0, 35.5, 1.62), c2 = Iso.project(28.4, 35.5, 1.62);
    ctx.strokeStyle = 'rgba(192,92,240,0.9)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c2.x, c2.y); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < 3; i++) {
      var k = ((t * 1.6) + i / 3) % 1;
      ctx.beginPath();
      ctx.arc(a.x + (c2.x - a.x) * k, a.y + (c2.y - a.y) * k, 3, 0, 6.2832);
      ctx.fill();
    }
    waferDisc(ctx, 29.4, 35.5, 1.9, 0.62, '#4a9de0');
  }});

  add({ id: 'wiring', x: 15.6, y: 34.0, w: 7.6, d: 4.2, draw: function (ctx, b, t) {
    Iso.box(ctx, { x: 16.0, y: 34.4, w: 3.0, d: 2.4, h: 1.3, color: '#c08a55' });
    ctx.fillStyle = '#2a4a63'; Iso.disc(ctx, 17.5, 35.6, 1.32, 1.1);
    ctx.fillStyle = '#4f9fd4'; Iso.disc(ctx, 17.5, 35.6, 1.34, 0.75);
    /* the polish head that flattens the copper back down */
    Iso.cylinder(ctx, { x: 21.0, y: 35.6, r: 1.1, h: 1.0, color: '#8d99a6' });
    ctx.save();
    var p = Iso.project(21.0, 35.6, 1.04);
    ctx.translate(p.x, p.y);
    ctx.scale(Math.abs(Math.cos(t * 3.4)) * 0.8 + 0.2, 1);
    ctx.fillStyle = '#d8dee5';
    ctx.beginPath(); ctx.ellipse(0, 0, 32, 16, 0, 0, 6.2832); ctx.fill();
    ctx.restore();
    Iso.cylinder(ctx, { x: 16.6, y: 37.4, r: 0.42, h: 1.1, color: C.copper });
    Iso.cylinder(ctx, { x: 17.8, y: 37.4, r: 0.42, h: 1.1, color: C.copper });
  }});

  /* --- the loop counter, the arch the cart drives under ------------------- */

  add({ id: 'loopct', x: 6.4, y: 21.8, w: 6.4, d: 6.4, draw: function (ctx, b, t, W) {
    Iso.box(ctx, { x: 7.0, y: 22.4, w: 3.4, d: 3.0, h: 2.0, color: '#c4ccd4' });
    Iso.gable(ctx, { x: 7.0, y: 22.4, z: 2.0, w: 3.4, d: 3.0, h: 1.1, color: C.gold });
    /* the lap board, showing which layer the wafer is on */
    var p = Iso.project(8.7, 25.4, 2.2);
    ctx.fillStyle = '#2a1e12';
    ctx.fillRect(p.x - 30, p.y - 26, 60, 26);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 30, p.y - 26, 60, 26);
    ctx.fillStyle = C.gold;
    ctx.font = 'bold 15px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('LAYER ' + ((W && W.lap) || 1), p.x, p.y - 13);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }});

  /* --- act 4 ------------------------------------------------------------- */

  add({ id: 'test', x: 17.6, y: 40.2, w: 8.6, d: 4.4, draw: function (ctx, b, t) {
    Iso.box(ctx, { x: 18.4, y: 40.6, w: 4.6, d: 3.0, h: 0.8, color: C.dark });
    waferDisc(ctx, 20.7, 42.1, 0.82, 1.5, '#7f93a8');
    dieGrid(ctx, 20.7, 42.1, 0.84, 9, true);
    /* the prober tapping each chip in turn */
    var dip = Math.abs(Math.sin(t * 2.2)) * 0.35;
    var p = Iso.project(20.7, 41.6, 2.5 - dip);
    ctx.fillStyle = '#8d99a6'; ctx.fillRect(p.x - 16, p.y - 22, 32, 22);
    ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + 14); ctx.stroke();
    Iso.box(ctx, { x: 23.8, y: 40.6, w: 1.6, d: 2.6, h: 2.0, color: '#c4ccd4' });
  }});

  add({ id: 'dice', x: 26.6, y: 40.2, w: 8.6, d: 4.4, draw: function (ctx, b, t) {
    Iso.box(ctx, { x: 27.2, y: 40.6, w: 4.4, d: 2.8, h: 0.7, color: C.dark });
    waferDisc(ctx, 29.4, 42.0, 0.72, 1.4, '#7f93a8');
    dieGrid(ctx, 29.4, 42.0, 0.74, 9, false);
    /* the blade tracking across the wafer */
    var sx = Math.sin(t * 0.9) * 34;
    var p = Iso.project(29.4, 41.5, 1.5);
    ctx.strokeStyle = '#5f6b78'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(p.x + sx, p.y - 24); ctx.lineTo(p.x + sx, p.y - 6); ctx.stroke();
    ctx.fillStyle = '#eef3f7'; ctx.strokeStyle = '#8d99a6'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(p.x + sx, p.y - 5, 15, 5, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    Iso.box(ctx, { x: 32.4, y: 41.4, w: 2.0, d: 2.0, h: 0.3, color: C.dark });
    chipTray(ctx, 33.4, 42.4, 0.32);
  }});

  add({ id: 'pack', x: 35.6, y: 40.2, w: 8.6, d: 4.4, draw: function (ctx, b, t) {
    machine(ctx, 36.2, 40.6, 1.9, 1.9, 1.2, '#7fb3d4', t, 0);
    machine(ctx, 38.4, 40.6, 1.9, 1.9, 1.2, '#e0a94f', t, 1);
    machine(ctx, 40.6, 40.6, 1.9, 1.9, 1.2, '#4fd0c0', t, 2);
    /* belt with packaged chips riding along it */
    Iso.box(ctx, { x: 36.2, y: 43.0, w: 6.3, d: 0.9, h: 0.42, color: '#5f6b78' });
    for (var i = 0; i < 5; i++) {
      var k = ((t * 0.5) + i / 5) % 1;
      Iso.box(ctx, { x: 36.3 + k * 6.0, y: 43.2, z: 0.42, w: 0.6, d: 0.5, h: 0.22, color: '#2f3945' });
    }
  }});

  add({ id: 'ship', x: 44.6, y: 40.2, w: 9.0, d: 4.4, draw: function (ctx, b, t) {
    hall(ctx, 45.0, 40.6, 3.6, 3.2, 1.7, '#e8eef4', C.blue);
    Iso.box(ctx, { x: 49.4, y: 41.0, w: 1.5, d: 1.5, h: 0.7, color: '#c8a06a' });
    Iso.box(ctx, { x: 49.4, y: 41.0, w: 1.5, d: 1.5, h: 0.7, z: 0.7, color: '#d2ac76' });
    Iso.box(ctx, { x: 51.2, y: 41.4, w: 1.5, d: 1.5, h: 0.7, color: '#c8a06a' });
    truck(ctx, 49.2, 43.0, C.blue);
  }});

  /* --- act 5: out of the fab and into service ----------------------------- */

  add({ id: 'dock', x: 53.6, y: 40.0, w: 5.8, d: 4.8, draw: function (ctx, b, t) {
    hall(ctx, 53.9, 40.4, 2.4, 2.2, 1.4, '#e8eef4', C.brick);
    /* pallets waiting their turn, and the lorry that takes them */
    palletStack(ctx, 58.3, 40.9, 0, 3);
    palletStack(ctx, 58.6, 42.3, 0, 2);
    truck(ctx, 54.1, 43.3, C.red);
    /* a forklift walking one pallet out to the loading line and back */
    var k = Math.sin(t * 0.55) * 0.5 + 0.5;
    var fx = 57.4 - k * 1.5, fy = 41.7;
    Iso.box(ctx, { x: fx - 0.62, y: fy + 0.05, w: 0.12, d: 0.6, h: 1.2, color: '#5f6b78' });
    if (k > 0.06) palletStack(ctx, fx - 1.15, fy + 0.02, 0.3, 1);
    Iso.box(ctx, { x: fx, y: fy, w: 0.85, d: 0.7, h: 0.5, color: '#e0a94f' });
    Iso.box(ctx, { x: fx + 0.16, y: fy + 0.08, z: 0.5, w: 0.46, d: 0.5, h: 0.46, color: '#3a4450' });
  }});

  add({ id: 'datacenter', x: 50.6, y: 18.6, w: 9.6, d: 6.6, draw: function (ctx, b, t, W) {
    var X = 51, Y = 19, Wd = 8.8, D = 5.6, H = 3.4;
    var face = Y + D;                       // the wall the lorry unloads into
    var racks = (W && W.racks) || 0;
    var full = Math.min(6, racks * 2);      // rack halls lit, two per delivery
    var arriving = W && W.stage === 'datacenter';

    Iso.box(ctx, { x: X, y: Y, w: Wd, d: D, h: H, color: '#dfe6ec', top: '#c3ccd6' });
    /* parapet and the chillers that carry the heat away */
    Iso.box(ctx, { x: X, y: Y, z: H, w: Wd, d: D, h: 0.22, color: '#aeb8c2' });
    for (var f = 0; f < 3; f++) fan(ctx, X + 1.6 + f * 2.6, Y + 2.0, H + 0.24, t * (2.2 + f * 0.4));
    Iso.box(ctx, { x: X + 0.5, y: Y + 4.2, z: H + 0.22, w: 1.4, d: 0.9, h: 0.7, color: '#9fb0c0' });

    /* the rack halls, seen through the long window on the front wall */
    for (var i = 0; i < 6; i++) {
      var x0 = X + 0.55 + i * 1.0, x1 = x0 + 0.78;
      ctx.fillStyle = '#1b2733';
      faceRect(ctx, face, x0, 0.7, x1, 2.5);
      var on = i < full;
      if (on && arriving && i >= full - 2) on = W.stageT > 0.9 + (i - (full - 2)) * 0.9;
      for (var r = 0; r < 5; r++) {
        var z0 = 0.82 + r * 0.34;
        ctx.fillStyle = on ? (Math.sin(t * 6 + i * 2 + r) > -0.3 ? '#4fe0b8' : '#1f7f6a') : '#2b3a48';
        faceRect(ctx, face, x0 + 0.08, z0, x1 - 0.08, z0 + 0.16);
      }
    }
    ctx.strokeStyle = 'rgba(30,42,54,0.5)'; ctx.lineWidth = 1;
    Iso.stroke(ctx, [Iso.project(X + 0.5, face, 2.6), Iso.project(X + 6.4, face, 2.6),
                     Iso.project(X + 6.4, face, 0.6), Iso.project(X + 0.5, face, 0.6)], true);

    /* the goods bay the pallets go through */
    ctx.fillStyle = '#2f3945';
    faceRect(ctx, face, X + 7.0, 0, X + 8.4, 2.2);
    ctx.fillStyle = '#7f8b98';
    faceRect(ctx, face, X + 7.0, 1.7, X + 8.4, 2.2);
    ctx.fillStyle = '#f2c14e';
    faceRect(ctx, face, X + 7.0, 0, X + 8.4, 0.08);

    /* the standby generators and transformers that keep the halls fed */
    for (var g = 0; g < 3; g++) {
      Iso.box(ctx, { x: 51.2 + g * 1.5, y: 26.6, w: 1.1, d: 1.3, h: 0.9, color: '#8e9aa8' });
      Iso.box(ctx, { x: 51.3 + g * 1.5, y: 26.7, z: 0.9, w: 0.9, d: 1.1, h: 0.16, color: '#6b7784' });
      Iso.cylinder(ctx, { x: 51.45 + g * 1.5, y: 26.5, r: 0.13, h: 1.5, color: '#5f6b78', edge: false });
    }

    /* the pallets coming off the lorry while it is docked */
    if (arriving) {
      for (var c = 0; c < 3; c++) {
        var k = (W.stageT * 0.55 - c * 0.3) % 1.6;
        if (k < 0 || k > 1) continue;
        palletStack(ctx, 59.0 - k * 0.5, 27.3 - k * 2.5, 0.32, 2);
      }
    }

    /* Kept to one short word: the board is drawn at a fixed size in screen space,
       so a long one would swamp the wall once the camera pulls back. */
    sign(ctx, X + 7.7, face, H - 0.1, full > 0 ? 'ONLINE' : 'IDLE',
         full > 0 ? '#4fe0b8' : '#6b7784');
  }});

  /* --- shared small painters --------------------------------------------- */

  /* A rectangle painted on the wall that faces the camera at y = yFace. */
  function faceRect(ctx, yFace, x0, z0, x1, z1) {
    Iso.poly(ctx, [Iso.project(x0, yFace, z1), Iso.project(x1, yFace, z1),
                   Iso.project(x1, yFace, z0), Iso.project(x0, yFace, z0)]);
  }

  function fan(ctx, x, y, z, a) {
    Iso.box(ctx, { x: x - 0.7, y: y - 0.7, z: z, w: 1.4, d: 1.4, h: 0.34, color: '#8e9aa8' });
    var p = Iso.project(x, y, z + 0.34);
    ctx.fillStyle = '#2f3945';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 17, 9, 0, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#cfd7de'; ctx.lineWidth = 2.4;
    for (var i = 0; i < 3; i++) {
      var th = a + i * 2.094;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(th) * 15, p.y + Math.sin(th) * 8);
      ctx.stroke();
    }
  }

  function sign(ctx, x, yFace, z, text, colour) {
    var p = Iso.project(x, yFace, z);
    ctx.font = 'bold 13px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var w = ctx.measureText(text).width + 16;
    ctx.fillStyle = '#22303f';
    ctx.fillRect(p.x - w / 2, p.y - 11, w, 22);
    ctx.strokeStyle = colour; ctx.lineWidth = 2;
    ctx.strokeRect(p.x - w / 2, p.y - 11, w, 22);
    ctx.fillStyle = colour;
    ctx.fillText(text, p.x, p.y + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  /* Boxed chips on a wooden pallet, the unit everything ships in. */
  function palletStack(ctx, x, y, z, rows) {
    z = z || 0;
    Iso.box(ctx, { x: x - 0.5, y: y - 0.42, z: z, w: 1.0, d: 0.84, h: 0.14, color: C.wood });
    for (var r = 0; r < rows; r++) {
      for (var i = 0; i < 2; i++) {
        Iso.box(ctx, { x: x - 0.46 + i * 0.46, y: y - 0.38, z: z + 0.14 + r * 0.34,
                       w: 0.44, d: 0.76, h: 0.34, color: r % 2 ? '#d2ac76' : '#c8a06a' });
      }
    }
  }

  function dieGrid(ctx, cx, cy, z, n, marked) {
    var cell = 0.30, half = n / 2;
    for (var gy = 0; gy < n; gy++) {
      for (var gx = 0; gx < n; gx++) {
        var dx = gx - half + 0.5, dy = gy - half + 0.5;
        if (dx * dx + dy * dy > half * half * 0.82) continue;
        var bad = marked && ((gx * 7 + gy * 5) % 17) === 0;
        var x = cx + dx * cell, y = cy + dy * cell;
        var a = Iso.project(x - cell * 0.42, y - cell * 0.42, z);
        var b2 = Iso.project(x + cell * 0.42, y - cell * 0.42, z);
        var c2 = Iso.project(x + cell * 0.42, y + cell * 0.42, z);
        var d2 = Iso.project(x - cell * 0.42, y + cell * 0.42, z);
        ctx.fillStyle = bad ? '#d94f3d' : '#3fb5a0';
        Iso.poly(ctx, [a, b2, c2, d2]);
      }
    }
  }

  function chipTray(ctx, cx, cy, z) {
    for (var r = 0; r < 3; r++) {
      for (var c2 = 0; c2 < 3; c2++) {
        var x = cx + (c2 - 1) * 0.55, y = cy + (r - 1) * 0.55;
        Iso.box(ctx, { x: x - 0.2, y: y - 0.2, z: z, w: 0.4, d: 0.4, h: 0.12, color: '#2f3945', top: '#3fb5a0' });
      }
    }
  }

  function truck(ctx, x, y, c) {
    Iso.box(ctx, { x: x, y: y, w: 3.4, d: 1.5, h: 0.2, color: '#2b3038' });
    Iso.box(ctx, { x: x + 0.1, y: y + 0.2, z: 0.2, w: 2.2, d: 1.1, h: 0.85, color: c });
    Iso.box(ctx, { x: x + 2.35, y: y + 0.2, z: 0.2, w: 1.0, d: 1.1, h: 1.15, color: Iso.mix(c, '#ffffff', 0.18) });
  }

  /* The delivery lorry, turned to face wherever it is driving. Same build as the
     cart, a chassis with a body on it, so whatever it hauls stays visible on top.
     LORRY_BED is where that load sits. */
  var LORRY_BED = 0.66;     // top of the load bed, where the pallet sits
  var LORRY_LOAD = 0.62;    // how far behind centre that bed is

  function lorry(ctx, x, y, z, hx, hy, c) {
    var bx = x - hx * LORRY_LOAD, by = y - hy * LORRY_LOAD;
    Iso.orientedBox(ctx, { x: x, y: y, hx: hx, hy: hy, len: 3.8, wid: 1.6,
                           z: z, h: 0.2, color: '#2b3038' });
    Iso.orientedBox(ctx, { x: bx, y: by, hx: hx, hy: hy, len: 2.3, wid: 1.42,
                           z: z + 0.2, h: 0.46, color: '#9fb0c0' });
    /* headboard, so the load reads as being carried rather than balanced */
    Iso.orientedBox(ctx, { x: x + hx * 0.62, y: y + hy * 0.62, hx: hx, hy: hy,
                           len: 0.16, wid: 1.42, z: z + LORRY_BED, h: 0.6, color: '#7f8b98' });
    /* cab last: it is the tallest part and belongs on top of the joins */
    Iso.orientedBox(ctx, { x: x + hx * 1.25, y: y + hy * 1.25, hx: hx, hy: hy,
                           len: 1.15, wid: 1.45, z: z + 0.2, h: 1.15, color: c });
    Iso.orientedBox(ctx, { x: x + hx * 1.25, y: y + hy * 1.25, hx: hx, hy: hy,
                           len: 1.18, wid: 1.48, z: z + 1.05, h: 0.3,
                           color: Iso.mix(c, '#ffffff', 0.55) });
  }

  /* ---- scenery ----------------------------------------------------------- */

  function tree(ctx, x, y, s) {
    s = s || 1;
    Iso.shadow(ctx, x, y, 0.7 * s);
    Iso.cylinder(ctx, { x: x, y: y, r: 0.16 * s, h: 1.0 * s, color: '#6b4a2b', edge: false });
    var p = Iso.project(x, y, 1.0 * s);
    ctx.fillStyle = '#2f7a34';
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 10 * s, 20 * s, 16 * s, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#43a04a';
    ctx.beginPath(); ctx.ellipse(p.x - 5 * s, p.y - 15 * s, 13 * s, 10 * s, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#5fbf62';
    ctx.beginPath(); ctx.ellipse(p.x - 8 * s, p.y - 19 * s, 7 * s, 5 * s, 0, 0, 6.2832); ctx.fill();
  }

  function bush(ctx, x, y) {
    Iso.shadow(ctx, x, y, 0.45);
    var p = Iso.project(x, y, 0);
    ctx.fillStyle = '#3d8b3d';
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 7, 13, 9, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#54a852';
    ctx.beginPath(); ctx.ellipse(p.x - 4, p.y - 11, 7, 5, 0, 0, 6.2832); ctx.fill();
  }

  function lamp(ctx, x, y) {
    Iso.cylinder(ctx, { x: x, y: y, r: 0.1, h: 2.4, color: '#4a5568', edge: false });
    var p = Iso.project(x, y, 2.4);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(p.x, p.y - 3, 5, 0, 6.2832); ctx.fill();
  }

  function bench(ctx, x, y) {
    Iso.box(ctx, { x: x, y: y, w: 1.4, d: 0.5, h: 0.28, color: '#a8763f' });
    Iso.box(ctx, { x: x, y: y, w: 1.4, d: 0.14, h: 0.5, z: 0.28, color: '#b9854a' });
  }

  /* Park guests. Their whole animation is a position along a loop, so they need
     no state of their own and survive a reset for free. They walk the same roads
     the cart drives, pushed onto the shoulder so the cart still has the middle. */
  var PLAZA = makeRoute([[22, 26.6], [42, 26.6], [42, 30.2], [22, 30.2], [22, 26.6]]);
  var STROLLS = [INTAKE, LOOP, EXIT, PLAZA, PLAZA];
  var SHIRTS = ['#d94f3d', '#3f7fd4', '#8a5fd4', '#2f7a34', '#e0a94f', '#c8453a', '#3fb5a0'];
  var GUESTS = [];
  for (var gi = 0; gi < 24; gi++) {
    var rt = STROLLS[gi % STROLLS.length];
    var side = Iso.hash2(gi, 11, 4) > 0.5 ? 1 : -1;
    GUESTS.push({
      route: rt,
      speed: 0.8 + Iso.hash2(gi, 3, 11) * 0.9,
      offset: Iso.hash2(gi, 7, 5) * rt.total,
      side: side * (0.75 + Iso.hash2(gi, 13, 6) * 0.5),
      shirt: SHIRTS[gi % SHIRTS.length],
      hat: Iso.hash2(gi, 9, 2) > 0.6 ? '#f5c542' : '#ffffff'
    });
  }

  function guest(ctx, x, y, z, shirt, hat, bob) {
    var p = Iso.project(x, y, z || 0);
    ctx.fillStyle = 'rgba(30,50,20,0.22)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 3, 0, 0, 6.2832); ctx.fill();
    var yo = p.y - (bob ? Math.abs(Math.sin(bob)) * 2 : 0);
    ctx.fillStyle = '#33415c'; ctx.fillRect(p.x - 2.5, yo - 9, 5, 7);
    ctx.fillStyle = shirt;
    ctx.strokeStyle = 'rgba(20,14,8,0.5)'; ctx.lineWidth = 1;
    ctx.fillRect(p.x - 4.5, yo - 18, 9, 10);
    ctx.strokeRect(p.x - 4.5, yo - 18, 9, 10);
    ctx.fillStyle = '#f0c49b';
    ctx.beginPath(); ctx.arc(p.x, yo - 21, 4.2, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hat;
    ctx.beginPath(); ctx.arc(p.x, yo - 22.5, 4.4, Math.PI, 0); ctx.fill();
  }

  /* ---- exports ----------------------------------------------------------- */

  /* What the cart is carrying, named on a tag above it so the change at each
     stop is legible without reading the panel. */
  var CARGO_LABELS = {
    empty:     'empty cart',
    sand:      'quartz sand',
    lump:      'rough silicon, 99%',
    poly:      'polysilicon, 9 nines pure',
    ingot:     'one single crystal',
    wafers:    'sliced wafers',
    mirror:    'polished mirror wafer',
    blueprint: 'wafer + the chip design',
    withmask:  'wafer + the mask set',
    pod:       'sealed for the cleanroom',
    coated:    'fresh layer added',
    resist:    'photoresist coat',
    exposed:   'pattern exposed',
    etched:    'pattern etched in',
    doped:     'atoms implanted',
    wired:     'copper wiring filled',
    stack:     'one more layer done',
    tested:    'tested, failures marked',
    dies:      'cut into dies',
    packaged:  'packaged chips',
    boxed:     'boxed for shipping',
    pallet:    'palletised, on the lorry',
    delivered: 'chips delivered'
  };

  /* Cargo kinds that live inside the lithography ring, so the tag can add the
     layer count to them and only them. */
  var LOOP_CARGO = {
    coated: 1, resist: 1, exposed: 1, etched: 1, doped: 1, wired: 1, stack: 1
  };

  global.Park = {
    C: C, BOUNDS: BOUNDS, GROUND: GROUND, LOTS: LOTS,
    cargoLabels: CARGO_LABELS, loopCargo: LOOP_CARGO,
    routes: ROUTES, stations: STATIONS,
    stops: STOPS, stopById: STOP_BY_ID,
    buildings: B,
    guests: GUESTS,
    lorryBed: LORRY_BED, lorryLoad: LORRY_LOAD,
    draw: { tree: tree, bush: bush, lamp: lamp, bench: bench, guest: guest,
            truck: truck, lorry: lorry, waferDisc: waferDisc, dieGrid: dieGrid,
            chipTray: chipTray, palletStack: palletStack }
  };
})(window);
