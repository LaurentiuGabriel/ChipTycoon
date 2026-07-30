/* ChipTycoon - the park scenes.
   Each stage of chip making gets one small isometric diorama.
   Scenes use a 6 by 6 tile plot: a path border with a 4 by 4 working floor. */

(function (global) {
  'use strict';

  var I = global.ISO;
  var box = I.box, cyl = I.cyl, disc = I.disc, at = I.at, roof = I.roof, shade = I.shade;
  var person = I.person, tree = I.tree, bush = I.bush, lamp = I.lamp, sign = I.sign;

  /* ---------- palette ---------- */
  var C = {
    grass: '#5d9c3f',
    grass2: '#53903a',
    path:  '#c9b48c',
    sand:  '#e0c98a',
    slab:  '#9aa4ae',
    floor: '#dfe7ee',
    steel: '#b9c3cd',
    teal:  '#3fb5a0',
    copper:'#c9793f',
    white: '#eef3f7'
  };

  var G = { g: C.grass, G: C.grass2, p: C.path, s: C.sand, c: C.slab, f: C.floor, w: '#3f86c4' };

  /* standard plots */
  var INDOOR  = ['pppppp', 'pffffp', 'pffffp', 'pffffp', 'pffffp', 'pppppp'];
  var OUTDOOR = ['gppppg', 'pccccp', 'pccccp', 'pccccp', 'pccccp', 'gppppg'];

  /* ---------- composite props ---------- */

  /* a machine tool: dark base, coloured body, blinking status screen */
  function machine(x, y, c, h, sx, sy) {
    sx = sx || 1; sy = sy || 1; h = h || 1.1;
    return [
      box({ x: x, y: y, sx: sx, sy: sy, h: 0.18, c: '#5b6470' }),
      box({ x: x + 0.06, y: y + 0.06, sx: sx - 0.12, sy: sy - 0.12, h: h, z: 0.18, c: c || C.steel }),
      at({
        x: x + sx / 2, y: y + sy, z: 0.18 + h * 0.55,
        s: '<rect x="-13" y="-11" width="26" height="17" rx="2" fill="#22303f"/>' +
           '<rect x="-10" y="-8" width="12" height="10" fill="#4fd0c0" opacity="0.9"/>' +
           '<circle cx="7" cy="-3" r="3" fill="#ff5f4d" class="blink"/>'
      })
    ];
  }

  /* pipe run along +x, sitting up in the air */
  function pipes(x, y, len, z, c) {
    var out = [];
    for (var i = 0; i < len; i++) {
      out.push(box({ x: x + i, y: y, sx: 1, sy: 0.22, h: 0.2, z: z, c: c || '#8ea0b3' }));
    }
    return out;
  }

  /* conveyor belt running along +x, carrying lumps */
  function conveyor(x, y, len, cargoC) {
    var out = [
      box({ x: x, y: y, sx: len, sy: 0.55, h: 0.34, c: '#5f6b78' }),
      box({ x: x, y: y + 0.03, sx: len, sy: 0.49, h: 0.07, z: 0.34, c: '#2f3945' })
    ];
    for (var i = 0; i < len; i++) {
      out.push(at({
        x: x + 0.35 + i, y: y + 0.28, z: 0.44, cls: 'slide',
        s: '<ellipse cx="0" cy="0" rx="9" ry="5.5" fill="' + (cargoC || '#6b5a44') + '"/>' +
           '<ellipse cx="-2" cy="-2" rx="4.5" ry="2.6" fill="' + shade(cargoC || '#6b5a44', 0.25) + '"/>'
      }));
    }
    return out;
  }

  /* storage silo with a cone lid */
  function silo(x, y, h, c) {
    return [
      cyl({ x: x, y: y, r: 0.45, h: h, c: c || '#d8dde3' }),
      at({ x: x, y: y, z: h, s: '<path d="M-20,0 L0,-17 L20,0 Z" fill="#8d99a6"/>' })
    ];
  }

  /* flatbed truck pointing along +x, cab at the +x end.
     The dark chassis is a touch wider than the body so it reads as wheels. */
  function truck(x, y, c) {
    c = c || '#c8453a';
    return [
      box({ x: x, y: y, sx: 2.6, sy: 1.05, h: 0.16, c: '#2b3038' }),
      box({ x: x + 0.05, y: y + 0.12, sx: 1.7, sy: 0.8, h: 0.72, z: 0.16, c: c }),
      box({ x: x + 1.75, y: y + 0.12, sx: 0.8, sy: 0.8, h: 1.05, z: 0.16, c: shade(c, 0.18) }),
      box({ x: x + 0.3, y: y + 0.3, sx: 1.2, sy: 0.44, h: 0.2, z: 0.88, c: '#d9c493' })
    ];
  }

  /* digger sitting on a terrace */
  function excavator(x, y, z) {
    z = z || 0;
    return [
      box({ x: x, y: y, sx: 1.2, sy: 0.85, h: 0.26, z: z, c: '#3a4450' }),
      box({ x: x + 0.12, y: y + 0.08, sx: 0.85, sy: 0.7, h: 0.62, z: z + 0.26, c: '#f0b33c' }),
      at({ x: x + 1.0, y: y + 0.45, z: z + 0.55,
           s: '<path d="M0,0 L34,-28 L41,-21 L7,5 Z" fill="#d79a2e"/>' +
              '<path d="M34,-28 l15,-3 l4,16 l-15,3 z" fill="#8d99a6"/>' })
    ];
  }

  /* the hot mouth of a furnace */
  function glowPot(x, y, z, rx, ry) {
    return at({ x: x, y: y, z: z,
      s: '<ellipse cx="0" cy="0" rx="' + rx + '" ry="' + ry + '" fill="#ff9a3c" class="glow"/>' +
         '<ellipse cx="0" cy="0" rx="' + (rx * 0.55) + '" ry="' + (ry * 0.55) + '" fill="#fff0b8"/>' });
  }

  function smoke(x, y, z) {
    return at({ x: x, y: y, z: z, k: 800 + x + y,
      s: '<circle cx="0" cy="-4" r="7" fill="#fff" opacity="0.55" class="puff1"/>' +
         '<circle cx="7" cy="-17" r="9" fill="#fff" opacity="0.40" class="puff2"/>' +
         '<circle cx="-3" cy="-32" r="11" fill="#fff" opacity="0.25" class="puff3"/>' });
  }

  /* a rack of wafers stood on edge */
  function waferRack(x, y) {
    var out = [box({ x: x, y: y, sx: 1.0, sy: 0.9, h: 0.16, c: '#5f6b78' })];
    for (var i = 0; i < 5; i++) {
      out.push(at({ x: x + 0.2 + i * 0.15, y: y + 0.45, z: 0.16,
        s: '<ellipse cx="0" cy="-15" rx="4.5" ry="15" fill="#aabdcf" stroke="#6d7f92" stroke-width="1"/>' }));
    }
    return out;
  }

  /* an explainer card that floats over the floor, like a park info board */
  function card(x, y, caption, art, w) {
    w = w || 124;
    return at({ x: x, y: y, z: 0.05, k: 700 + x + y,
      s: '<rect x="' + (-w / 2) + '" y="-56" width="' + w + '" height="72" rx="4" fill="#fff8e4" stroke="#4a3520" stroke-width="3"/>' +
         '<g transform="translate(0,-26)">' + art + '</g>' +
         '<text x="0" y="10" text-anchor="middle" font-size="11" font-family="Verdana,sans-serif" ' +
         'font-weight="bold" fill="#3b2a17">' + caption + '</text>' });
  }

  /* ---------- drawing helpers used inside cards and screens ---------- */

  function circuitArt(w, h, c) {
    var s = '<g stroke="' + c + '" stroke-width="1.8" fill="none" opacity="0.95">';
    var x0 = -w / 2, y0 = -h / 2;
    for (var i = 1; i < 5; i++) s += '<line x1="' + (x0 + w * i / 5) + '" y1="' + y0 + '" x2="' + (x0 + w * i / 5) + '" y2="' + (y0 + h) + '"/>';
    for (var j = 1; j < 3; j++) s += '<line x1="' + x0 + '" y1="' + (y0 + h * j / 3) + '" x2="' + (x0 + w) + '" y2="' + (y0 + h * j / 3) + '"/>';
    s += '<rect x="' + (x0 + w * 0.1) + '" y="' + (y0 + h * 0.18) + '" width="' + (w * 0.24) + '" height="' + (h * 0.34) + '" fill="' + c + '" stroke="none" opacity="0.6"/>';
    s += '<rect x="' + (x0 + w * 0.56) + '" y="' + (y0 + h * 0.46) + '" width="' + (w * 0.3) + '" height="' + (h * 0.32) + '" fill="' + c + '" stroke="none" opacity="0.6"/>';
    return s + '</g>';
  }

  /* a grid of little square dies laid over a wafer disc */
  function dieGrid(n, ok, bad) {
    var s = '<g>', cell = 12, half = n / 2;
    for (var gy = 0; gy < n; gy++) {
      for (var gx = 0; gx < n; gx++) {
        var dx = gx - half + 0.5, dy = gy - half + 0.5;
        if (dx * dx + dy * dy > half * half * 0.86) continue;
        var sx = (dx - dy) * cell * 0.5, sy = (dx + dy) * cell * 0.25;
        var c = ((gx * 7 + gy * 5) % 17) === 0 ? bad : ok;
        s += '<polygon points="' + sx + ',' + sy + ' ' + (sx + cell * 0.5) + ',' + (sy + cell * 0.25) +
             ' ' + sx + ',' + (sy + cell * 0.5) + ' ' + (sx - cell * 0.5) + ',' + (sy + cell * 0.25) +
             '" fill="' + c + '" stroke="#4e6274" stroke-width="0.8"/>';
      }
    }
    return s + '</g>';
  }

  function chipTray() {
    var s = '<g>';
    for (var r = 0; r < 3; r++) {
      for (var c2 = 0; c2 < 3; c2++) {
        var sx = ((c2 - 1) - (r - 1)) * 16, sy = ((c2 - 1) + (r - 1)) * 8;
        s += '<polygon points="' + sx + ',' + (sy - 13) + ' ' + (sx + 14) + ',' + (sy - 6) + ' ' +
             sx + ',' + (sy + 1) + ' ' + (sx - 14) + ',' + (sy - 6) + '" fill="#2f3945"/>' +
             '<polygon points="' + sx + ',' + (sy - 11) + ' ' + (sx + 9) + ',' + (sy - 6.5) + ' ' +
             sx + ',' + (sy - 2) + ' ' + (sx - 9) + ',' + (sy - 6.5) + '" fill="#3fb5a0"/>';
      }
    }
    return s + '</g>';
  }

  /* ---------- the twenty stops ---------- */

  var scenes = {};

  /* 1. the sand quarry */
  scenes.sand = {
    alt: 'A quarry where a digger scoops pale quartz sand and loads it onto a truck',
    legend: G, maxz: 4,
    ground: ['ggppgg', 'gssssg', 'gssssg', 'gssssg', 'gsssgg', 'gpppgg'],
    items: [].concat(
      [box({ x: 1.1, y: 1.1, sx: 3.2, sy: 3.0, h: 0.36, c: '#bfa268' })],
      [box({ x: 1.6, y: 1.5, sx: 2.2, sy: 2.1, h: 0.36, z: 0.36, c: '#d7bd80' })],
      [box({ x: 2.1, y: 1.9, sx: 1.2, sy: 1.2, h: 0.36, z: 0.72, c: '#f0dcae' })],
      excavator(1.4, 2.2, 0.72),
      /* a few boulders so the pit is not one flat wash of beige */
      [at({ x: 4.1, y: 1.4, z: 0,
        s: '<ellipse cx="0" cy="0" rx="13" ry="7" fill="#9c8f78"/>' +
           '<ellipse cx="-3" cy="-3" rx="8" ry="4" fill="#b3a68d"/>' })],
      [at({ x: 1.3, y: 3.6, z: 0,
        s: '<ellipse cx="0" cy="0" rx="10" ry="5" fill="#9c8f78"/>' +
           '<ellipse cx="-2" cy="-2" rx="6" ry="3" fill="#b3a68d"/>' })],
      [at({ x: 3.4, y: 4.0, z: 0,
        s: '<ellipse cx="0" cy="0" rx="8" ry="4" fill="#a89a83"/>' })],
      truck(1.9, 4.2, '#d8a13a'),
      [person({ x: 4.6, y: 2.0, c: '#3f7fd4', hat: '#f5c542' })],
      [person({ x: 1.2, y: 4.9, c: '#d94f3d', hat: '#f5c542' })],
      [tree({ x: 5.5, y: 0.5 }), tree({ x: 0.4, y: 0.4 }), bush({ x: 0.5, y: 5.3 })],
      [sign({ x: 5.4, y: 4.2, text: 'SAND PIT' })]
    )
  };

  /* 2. the carbon furnace */
  scenes.furnace = {
    alt: 'A tall furnace burning the oxygen out of sand, with molten silicon pouring out',
    legend: G, maxz: 6,
    ground: OUTDOOR,
    items: [].concat(
      [box({ x: 1.0, y: 1.0, sx: 1.7, sy: 1.7, h: 1.5, c: '#c4ccd4' })],
      [roof({ x: 1.0, y: 1.0, sx: 1.7, sy: 1.7, z: 1.5, h: 0.7, c: '#a2402f' })],
      [cyl({ x: 3.9, y: 1.9, r: 0.62, h: 2.9, c: '#7d6a58' })],
      [glowPot(3.9, 1.9, 2.9, 22, 11)],
      [smoke(3.9, 1.9, 3.1)],
      silo(2.9, 3.3, 1.5, '#e2d7bd'),
      [box({ x: 3.4, y: 3.4, sx: 1.5, sy: 1.0, h: 0.62, c: '#6d7885' })],
      [glowPot(4.15, 3.9, 0.62, 26, 13)],
      conveyor(1.0, 3.4, 2, '#3d3d3d'),
      [person({ x: 4.7, y: 4.8, c: '#2f7a34', hat: '#f5c542' })],
      [person({ x: 1.4, y: 4.9, c: '#d94f3d', hat: '#f5c542' })],
      [lamp({ x: 5.4, y: 0.6 }), tree({ x: 0.4, y: 0.4 }), bush({ x: 0.5, y: 5.3 })],
      [sign({ x: 5.4, y: 4.2, text: 'FURNACE' })]
    )
  };

  /* 3. the purifier */
  scenes.purify = {
    alt: 'A chemical plant of tall towers and pipes cleaning silicon to nine nines pure',
    legend: G, maxz: 7,
    ground: OUTDOOR,
    items: [].concat(
      [cyl({ x: 1.5, y: 1.4, r: 0.4, h: 3.8, c: '#cfd6dd' })],
      [cyl({ x: 2.5, y: 1.4, r: 0.4, h: 2.9, c: '#cfd6dd' })],
      [cyl({ x: 3.5, y: 1.4, r: 0.4, h: 4.2, c: '#cfd6dd' })],
      pipes(1.5, 1.0, 3, 2.4, '#8ea0b3'),
      [box({ x: 4.4, y: 1.1, sx: 1.2, sy: 1.4, h: 1.3, c: '#b7c0c9' })],
      machine(1.1, 3.1, '#7fb3d4', 1.2, 1.3, 1.2),
      [cyl({ x: 3.4, y: 3.4, r: 0.62, h: 1.3, c: '#9fd8e8' })],
      [disc({ x: 3.4, y: 3.4, z: 1.3, r: 0.62, c: '#d7f3fb', shine: true })],
      [box({ x: 4.4, y: 3.2, sx: 1.1, sy: 1.4, h: 1.0, c: '#e8e2cf' })],
      [at({ x: 4.95, y: 4.6, z: 1.0,
        s: '<rect x="-16" y="-30" width="32" height="30" rx="3" fill="#f3f6f9" stroke="#8d99a6" stroke-width="2"/>' +
           '<rect x="-11" y="-24" width="22" height="7" fill="#8e97a3"/>' +
           '<rect x="-11" y="-13" width="22" height="7" fill="#8e97a3"/>' })],
      [person({ x: 2.6, y: 4.9, c: '#3f7fd4', hat: '#ffffff' })],
      [person({ x: 1.2, y: 5.2, c: '#8a5fd4', hat: '#ffffff' })],
      [lamp({ x: 5.4, y: 0.6 }), bush({ x: 0.4, y: 5.4 })],
      [sign({ x: 5.4, y: 4.4, text: '9 NINES PURE' })]
    )
  };

  /* 4. crystal growing */
  scenes.crystal = {
    alt: 'A crystal puller lifting a shiny silicon ingot out of a pot of molten silicon',
    legend: G, maxz: 7,
    ground: INDOOR,
    items: [].concat(
      /* the gantry that does the pulling */
      [box({ x: 1.1, y: 1.1, sx: 0.5, sy: 0.5, h: 4.4, c: '#8d99a6' })],
      [box({ x: 1.1, y: 1.1, sx: 2.3, sy: 0.34, h: 0.3, z: 4.4, c: '#8d99a6' })],
      /* the melt pot */
      [box({ x: 2.2, y: 1.9, sx: 1.9, sy: 1.9, h: 0.55, c: '#6d7885' })],
      [cyl({ x: 3.15, y: 2.85, r: 0.66, h: 1.0, z: 0.55, c: '#9aa4ae' })],
      [glowPot(3.15, 2.85, 1.55, 27, 13)],
      /* the ingot climbing out on its wire */
      [at({ x: 3.15, y: 2.85, z: 1.6, cls: 'lift', k: 400,
        s: '<rect x="-1.5" y="-104" width="3" height="44" fill="#7b8794"/>' +
           '<ellipse cx="0" cy="-60" rx="12" ry="6" fill="#dbe4ec"/>' +
           '<rect x="-12" y="-60" width="24" height="44" fill="#aab7c6"/>' +
           '<rect x="-12" y="-60" width="7" height="44" fill="#c9d5e0"/>' +
           '<path d="M-12,-16 q12,11 24,0 z" fill="#8b98a8"/>' +
           '<path d="M-3,-16 q3,7 6,0 z" fill="#6f7d8d"/>' })],
      machine(4.3, 1.2, '#7fb3d4', 1.1, 1.2, 1.2),
      waferRack(4.2, 3.6),
      [person({ x: 2.0, y: 4.8, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [person({ x: 3.4, y: 5.1, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.5, y: 4.6, text: 'CRYSTAL PULLER' })]
    )
  };

  /* 5. slicing */
  scenes.slice = {
    alt: 'A wire saw slicing a silicon ingot into thin round wafers',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      [box({ x: 1.1, y: 1.6, sx: 3.0, sy: 1.5, h: 0.75, c: '#6d7885' })],
      /* the ingot lying on the bed */
      [at({ x: 1.5, y: 2.35, z: 0.75,
        s: '<rect x="-8" y="-30" width="88" height="30" fill="#9aa4ae"/>' +
           '<rect x="-8" y="-30" width="88" height="9" fill="#bcc6d0"/>' +
           '<ellipse cx="-8" cy="-15" rx="8" ry="15" fill="#7c8794"/>' +
           '<ellipse cx="80" cy="-15" rx="8" ry="15" fill="#c9d3dd"/>' })],
      /* the saw frame with its moving wires */
      [at({ x: 2.9, y: 1.75, z: 0.75, k: 300,
        s: '<rect x="-34" y="-66" width="5" height="52" fill="#5f6b78"/>' +
           '<rect x="29" y="-66" width="5" height="52" fill="#5f6b78"/>' +
           '<rect x="-34" y="-71" width="68" height="7" fill="#8d99a6"/>' +
           '<g class="saw"><rect x="-29" y="-46" width="58" height="2" fill="#eef3f7"/>' +
           '<rect x="-29" y="-39" width="58" height="2" fill="#eef3f7"/>' +
           '<rect x="-29" y="-32" width="58" height="2" fill="#eef3f7"/></g>' })],
      waferRack(4.3, 1.7),
      waferRack(4.3, 3.0),
      [disc({ x: 1.9, y: 4.3, z: 0.02, r: 0.5, c: '#a8bbcd', rim: true, shine: true })],
      [disc({ x: 3.1, y: 4.5, z: 0.02, r: 0.5, c: '#a8bbcd', rim: true, shine: true })],
      [person({ x: 4.6, y: 4.6, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.4, y: 4.3, text: 'WIRE SAW' })]
    )
  };

  /* 6. polishing */
  scenes.polish = {
    alt: 'Spinning polishing pads turning rough wafers into perfect mirrors',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      [box({ x: 1.1, y: 1.3, sx: 3.6, sy: 1.5, h: 0.7, c: '#6d7885' })],
      [disc({ x: 1.9, y: 2.05, z: 0.7, r: 0.6, c: '#c9d3dd', rim: true })],
      [disc({ x: 2.9, y: 2.05, z: 0.7, r: 0.6, c: '#c9d3dd', rim: true })],
      [disc({ x: 3.9, y: 2.05, z: 0.7, r: 0.6, c: '#c9d3dd', rim: true })],
      [at({ x: 1.9, y: 2.05, z: 0.74, cls: 'spin', s: padArt() })],
      [at({ x: 2.9, y: 2.05, z: 0.74, cls: 'spin', s: padArt() })],
      [at({ x: 3.9, y: 2.05, z: 0.74, cls: 'spin', s: padArt() })],
      [box({ x: 1.1, y: 3.4, sx: 1.1, sy: 1.0, h: 0.85, c: '#9fd8e8' })],
      waferRack(4.1, 3.4),
      /* the finished mirror wafer, front and centre */
      [disc({ x: 2.9, y: 4.2, z: 0.02, r: 0.72, c: '#e6eef5', rim: true })],
      [at({ x: 2.9, y: 4.2, z: 0.05,
        s: '<ellipse cx="-12" cy="-6" rx="14" ry="6" fill="#ffffff"/>' +
           '<ellipse cx="10" cy="4" rx="8" ry="3.5" fill="#ffffff" opacity="0.8"/>' })],
      [person({ x: 1.5, y: 5.0, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.4, y: 4.5, text: 'MIRROR SHINE' })]
    )
  };

  function padArt() {
    return '<ellipse cx="0" cy="0" rx="24" ry="12" fill="#8fd0e8" opacity="0.9"/>' +
           '<ellipse cx="-8" cy="-3" rx="9" ry="4" fill="#ffffff" opacity="0.75"/>';
  }

  /* 7. design studio */
  scenes.design = {
    alt: 'A design studio where engineers draw the chip blueprint on big screens',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      /* back wall with two big display screens hung on the front face */
      [box({ x: 1.0, y: 1.0, sx: 4.0, sy: 0.28, h: 2.5, c: '#e5eaf0' })],
      [at({ x: 2.0, y: 1.28, z: 1.15,
        s: '<rect x="-32" y="-46" width="64" height="46" rx="3" fill="#16324a" stroke="#8d99a6" stroke-width="2.5"/>' +
           '<g transform="translate(0,-23)">' + circuitArt(52, 34, '#4fd0c0') + '</g>' })],
      [at({ x: 4.0, y: 1.28, z: 1.15,
        s: '<rect x="-32" y="-46" width="64" height="46" rx="3" fill="#16324a" stroke="#8d99a6" stroke-width="2.5"/>' +
           '<g transform="translate(0,-23)">' + circuitArt(52, 34, '#ffcf5c') + '</g>' })],
      /* two desks with monitors */
      [box({ x: 1.4, y: 2.6, sx: 1.5, sy: 0.9, h: 0.6, c: '#c8a06a' })],
      [box({ x: 3.4, y: 2.6, sx: 1.5, sy: 0.9, h: 0.6, c: '#c8a06a' })],
      [at({ x: 2.15, y: 3.5, z: 0.6,
        s: '<rect x="-18" y="-26" width="36" height="24" rx="2" fill="#22303f"/>' +
           '<rect x="-15" y="-23" width="30" height="18" fill="#4fd0c0" opacity="0.85"/>' +
           '<rect x="-8" y="-2" width="16" height="4" fill="#8d99a6"/>' })],
      [at({ x: 4.15, y: 3.5, z: 0.6,
        s: '<rect x="-18" y="-26" width="36" height="24" rx="2" fill="#22303f"/>' +
           '<rect x="-15" y="-23" width="30" height="18" fill="#ffcf5c" opacity="0.85"/>' +
           '<rect x="-8" y="-2" width="16" height="4" fill="#8d99a6"/>' })],
      [person({ x: 2.15, y: 4.1, c: '#3f7fd4', hat: '#2f3945' })],
      [person({ x: 4.15, y: 4.1, c: '#d94f3d', hat: '#6b4a2b' })],
      [box({ x: 1.1, y: 4.5, sx: 0.8, sy: 0.8, h: 0.5, c: '#8a5fd4' })],
      [sign({ x: 5.4, y: 4.8, text: 'DESIGN LAB' })]
    )
  };

  /* 8. mask shop */
  scenes.mask = {
    alt: 'A mask shop writing chip patterns onto glass stencil plates',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      machine(1.1, 1.2, '#8d99a6', 1.5, 1.5, 1.4),
      machine(3.0, 1.2, '#8d99a6', 1.5, 1.5, 1.4),
      /* a finished mask stood upright on a stand */
      [box({ x: 1.4, y: 3.2, sx: 1.6, sy: 0.9, h: 0.4, c: '#5f6b78' })],
      [at({ x: 2.2, y: 3.65, z: 0.4, k: 300,
        s: '<g opacity="0.95"><rect x="-38" y="-52" width="76" height="52" rx="3" fill="#a9e4f2" stroke="#5f9fb5" stroke-width="3"/>' +
           '<g transform="translate(0,-26)">' + circuitArt(62, 38, '#12293b') + '</g></g>' })],
      /* a spare plate lying flat */
      [at({ x: 4.2, y: 3.4, z: 0.02,
        s: '<g opacity="0.9"><polygon points="0,-22 44,0 0,22 -44,0" fill="#bfeaf5" stroke="#5f9fb5" stroke-width="2"/>' +
           '<polygon points="0,-13 26,0 0,13 -26,0" fill="#7fc4d8" opacity="0.5"/></g>' })],
      [person({ x: 3.4, y: 4.6, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [person({ x: 1.2, y: 4.9, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.4, y: 4.3, text: 'MASK SHOP' })]
    )
  };

  /* 9. cleanroom entrance */
  scenes.cleanroom = {
    alt: 'Workers in white bunny suits walking through an air shower into a spotless cleanroom',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      /* one back wall with a bright doorway, kept low so the room stays visible */
      [box({ x: 1.0, y: 1.0, sx: 4.0, sy: 0.3, h: 2.0, c: '#e8eef4' })],
      [box({ x: 1.0, y: 1.3, sx: 0.3, sy: 2.4, h: 2.0, c: '#dbe4ec' })],
      /* the doorway is a thin slab on the wall plane so it sits flush in iso */
      [box({ x: 2.55, y: 1.22, sx: 1.3, sy: 0.1, h: 1.75, c: '#8fd4ea', k: 60 })],
      [at({ x: 3.2, y: 1.32, z: 0.95, k: 61,
        s: '<circle cx="-11" cy="0" r="4" fill="#2f4a5a"/><circle cx="11" cy="6" r="4" fill="#2f4a5a"/>' })],
      /* filters in the ceiling blowing clean air straight down */
      [box({ x: 2.6, y: 1.9, sx: 1.5, sy: 1.2, h: 0.2, z: 2.5, c: '#eef4f9', k: 615 })],
      [at({ x: 3.35, y: 2.5, z: 2.5, k: 620,
        s: '<g class="fall" stroke="#3fa8cc" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.9">' +
           '<path d="M-26,2 l0,20 M-26,22 l-6,-7 M-26,22 l6,-7"/>' +
           '<path d="M0,10 l0,20 M0,30 l-6,-7 M0,30 l6,-7"/>' +
           '<path d="M26,18 l0,20 M26,38 l-6,-7 M26,38 l6,-7"/></g>' })],
      [box({ x: 4.1, y: 2.6, sx: 0.8, sy: 1.6, h: 1.5, c: '#cfd8e0' })],
      [at({ x: 4.5, y: 4.2, z: 1.5,
        s: '<rect x="-18" y="-12" width="36" height="12" rx="2" fill="#9fb0c0"/>' +
           '<circle cx="0" cy="-6" r="4" fill="#4fd0c0" class="blink"/>' })],
      [person({ x: 2.5, y: 3.0, c: '#f4f9ff', legs: '#f4f9ff', hat: '#cfe3f2', skin: '#bcd8ea' })],
      [person({ x: 3.7, y: 3.8, c: '#f4f9ff', legs: '#f4f9ff', hat: '#cfe3f2', skin: '#bcd8ea' })],
      [person({ x: 2.0, y: 4.6, c: '#f4f9ff', legs: '#f4f9ff', hat: '#cfe3f2', skin: '#bcd8ea' })],
      [sign({ x: 5.4, y: 4.3, text: 'NO DUST' })]
    )
  };

  /* 10. deposition, adding a layer */
  scenes.layer = {
    alt: 'A hot tube furnace coating the wafer with a layer only a few atoms thick',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      [box({ x: 1.1, y: 1.4, sx: 3.6, sy: 1.3, h: 0.6, c: '#6d7885' })],
      [at({ x: 1.3, y: 2.05, z: 0.6, k: 200,
        s: '<rect x="0" y="-38" width="168" height="34" rx="17" fill="#c9d3dd" stroke="#8d99a6" stroke-width="2.5"/>' +
           '<rect x="12" y="-33" width="144" height="10" rx="5" fill="#e6edf3"/>' +
           '<g class="heatband">' +
           '<rect x="30" y="-38" width="14" height="34" fill="#ff8b3d" opacity="0.8"/>' +
           '<rect x="76" y="-38" width="14" height="34" fill="#ff8b3d" opacity="0.8"/>' +
           '<rect x="122" y="-38" width="14" height="34" fill="#ff8b3d" opacity="0.8"/></g>' +
           '<ellipse cx="0" cy="-21" rx="10" ry="17" fill="#ffd08a"/>' })],
      pipes(1.2, 1.0, 3, 1.7, '#8ea0b3'),
      [cyl({ x: 1.4, y: 3.4, r: 0.32, h: 1.5, c: '#7fb3d4' })],
      [cyl({ x: 2.2, y: 3.4, r: 0.32, h: 1.5, c: '#e0a94f' })],
      card(5.5, 5.5, 'a new layer on top',
        '<ellipse cx="0" cy="4" rx="44" ry="12" fill="#8e97a3"/>' +
        '<ellipse cx="0" cy="-6" rx="44" ry="12" fill="#7fd4e8" class="fadein"/>'),
      [person({ x: 1.2, y: 5.0, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.4, y: 2.1, text: 'LAYER TUBE' })]
    )
  };

  /* 11. photoresist coating */
  scenes.resist = {
    alt: 'A spin coater dropping green photoresist onto a wafer spinning at high speed',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      [box({ x: 1.5, y: 1.5, sx: 2.4, sy: 2.4, h: 0.7, c: '#6d7885' })],
      [cyl({ x: 2.7, y: 2.7, r: 0.85, h: 0.4, z: 0.7, c: '#8d99a6' })],
      [disc({ x: 2.7, y: 2.7, z: 1.12, r: 0.72, c: '#3fb5a0', rim: true })],
      [at({ x: 2.7, y: 2.7, z: 1.15, cls: 'spin',
        s: '<ellipse cx="0" cy="0" rx="30" ry="15" fill="#4fd0c0" opacity="0.65"/>' +
           '<ellipse cx="-10" cy="-5" rx="10" ry="4.5" fill="#ffffff" opacity="0.6"/>' })],
      /* nozzle arm with a falling drop */
      [box({ x: 1.2, y: 1.1, sx: 0.4, sy: 0.4, h: 2.8, c: '#8d99a6' })],
      [box({ x: 1.2, y: 1.3, sx: 1.7, sy: 0.25, h: 0.25, z: 2.55, c: '#8d99a6' })],
      [at({ x: 2.7, y: 2.1, z: 2.55, k: 400,
        s: '<rect x="-5" y="-14" width="10" height="16" fill="#8d99a6"/>' +
           '<path d="M-7,2 l14,0 l-7,11 z" fill="#5f6b78"/>' +
           '<circle cx="0" cy="24" r="4.5" fill="#3fb5a0" class="drop"/>' })],
      [cyl({ x: 4.4, y: 1.6, r: 0.34, h: 1.4, c: '#3fb5a0' })],
      [cyl({ x: 4.4, y: 2.5, r: 0.34, h: 1.4, c: '#3fb5a0' })],
      machine(3.9, 3.4, '#7fb3d4', 1.0, 1.2, 1.2),
      [person({ x: 1.5, y: 4.8, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.4, y: 4.5, text: 'SPIN COATER' })]
    )
  };

  /* 12. lithography, the star of the park */
  scenes.litho = {
    alt: 'A tall lithography machine shining light through a mask and shrinking it onto the wafer',
    legend: G, maxz: 8,
    ground: INDOOR,
    items: [].concat(
      [box({ x: 1.0, y: 1.0, sx: 3.4, sy: 2.9, h: 0.4, c: '#5b6470' })],
      /* the light source tower */
      [box({ x: 1.2, y: 1.2, sx: 1.1, sy: 1.1, h: 3.6, z: 0.4, c: '#dfe7ee' })],
      [at({ x: 1.75, y: 2.3, z: 4.0, s: '<ellipse cx="0" cy="0" rx="26" ry="13" fill="#ffe9a8" class="glow"/>' })],
      /* the beam falling from the light down to the wafer */
      [at({ x: 3.1, y: 2.6, z: 0.4, cls: 'beam', k: 250,
        s: '<path d="M-30,-112 L30,-112 L17,-8 L-17,-8 Z" fill="#6fd0f5" opacity="0.55"/>' +
           '<path d="M-19,-112 L19,-112 L11,-8 L-11,-8 Z" fill="#bff0ff" opacity="0.8"/>' +
           '<path d="M-7,-112 L7,-112 L4,-8 L-4,-8 Z" fill="#ffffff" opacity="0.9"/>' })],
      /* the mask held up in the beam */
      [at({ x: 3.1, y: 2.6, z: 2.9, k: 500,
        s: '<g opacity="0.97"><rect x="-36" y="-16" width="72" height="30" rx="2" fill="#a9e4f2" stroke="#5f9fb5" stroke-width="2.5"/>' +
           '<g transform="translate(0,-1)">' + circuitArt(58, 22, '#12293b') + '</g></g>' })],
      /* the lens stack that shrinks the picture */
      [at({ x: 3.1, y: 2.6, z: 1.7, k: 450,
        s: '<ellipse cx="0" cy="0" rx="30" ry="10" fill="#cfe8f5" stroke="#7f96a8" stroke-width="2.5"/>' +
           '<ellipse cx="0" cy="16" rx="22" ry="8" fill="#cfe8f5" stroke="#7f96a8" stroke-width="2.5"/>' +
           '<ellipse cx="0" cy="29" rx="14" ry="6" fill="#cfe8f5" stroke="#7f96a8" stroke-width="2.5"/>' })],
      /* the moving wafer stage */
      [box({ x: 2.5, y: 2.0, sx: 1.2, sy: 1.2, h: 0.3, z: 0.4, c: '#8d99a6' })],
      [disc({ x: 3.1, y: 2.6, z: 0.7, r: 0.55, c: '#3fb5a0', rim: true, shine: true })],
      [box({ x: 4.3, y: 1.2, sx: 0.9, sy: 2.6, h: 2.0, c: '#c4ccd4' })],
      [at({ x: 4.75, y: 3.8, z: 1.5,
        s: '<rect x="-16" y="-14" width="32" height="20" rx="2" fill="#22303f"/>' +
           '<circle cx="-7" cy="-4" r="3.5" fill="#4fd0c0" class="blink"/>' +
           '<circle cx="5" cy="-4" r="3.5" fill="#ffcf5c"/>' })],
      [person({ x: 1.4, y: 4.9, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [person({ x: 3.2, y: 5.1, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.5, y: 4.6, text: 'THE PRINTER' })]
    )
  };

  /* 13. develop and etch */
  scenes.etch = {
    alt: 'Etching chambers carving away every part of the layer that was left uncovered',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      [box({ x: 1.1, y: 1.2, sx: 1.6, sy: 1.6, h: 1.5, c: '#a8b4c0' })],
      [box({ x: 3.0, y: 1.2, sx: 1.6, sy: 1.6, h: 1.5, c: '#a8b4c0' })],
      [at({ x: 1.9, y: 2.8, z: 0.8,
        s: '<circle cx="0" cy="0" r="15" fill="#22303f"/><circle cx="0" cy="0" r="10" fill="#b06cf0" class="glow"/>' })],
      [at({ x: 3.8, y: 2.8, z: 0.8,
        s: '<circle cx="0" cy="0" r="15" fill="#22303f"/><circle cx="0" cy="0" r="10" fill="#b06cf0" class="glow"/>' })],
      pipes(1.3, 0.9, 3, 1.7, '#8ea0b3'),
      card(5.5, 5.5, 'the open parts get cut away',
        '<g transform="translate(-52,0)">' +
          '<rect x="-40" y="-2" width="80" height="15" fill="#8e97a3"/>' +
          '<rect x="-40" y="-15" width="80" height="13" fill="#7fd4e8"/>' +
          '<text x="0" y="26" text-anchor="middle" font-size="10" font-family="Verdana,sans-serif" fill="#5c4830">before</text>' +
        '</g>' +
        '<g transform="translate(52,0)">' +
          '<rect x="-40" y="-2" width="80" height="15" fill="#8e97a3"/>' +
          '<rect x="-40" y="-15" width="18" height="13" fill="#7fd4e8"/>' +
          '<rect x="-9" y="-15" width="18" height="13" fill="#7fd4e8"/>' +
          '<rect x="22" y="-15" width="18" height="13" fill="#7fd4e8"/>' +
          '<text x="0" y="26" text-anchor="middle" font-size="10" font-family="Verdana,sans-serif" fill="#5c4830">after</text>' +
        '</g>', 214),
      [person({ x: 1.1, y: 3.2, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.4, y: 1.9, text: 'ETCH BAY' })]
    )
  };

  /* 14. ion implant */
  scenes.dope = {
    alt: 'An ion implanter firing a purple beam of atoms into the surface of the wafer',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      [box({ x: 1.0, y: 1.2, sx: 1.4, sy: 1.4, h: 1.7, c: '#b7c0c9' })],
      [box({ x: 2.4, y: 1.6, sx: 2.2, sy: 0.55, h: 0.5, z: 0.8, c: '#8d99a6' })],
      [at({ x: 2.4, y: 1.88, z: 1.14, cls: 'beamflow', k: 300,
        s: '<rect x="0" y="-7" width="132" height="8" rx="4" fill="#c05cf0" opacity="0.9"/>' +
           '<circle cx="18" cy="-3" r="4" fill="#ffffff"/>' +
           '<circle cx="62" cy="-3" r="4" fill="#ffffff"/>' +
           '<circle cx="106" cy="-3" r="4" fill="#ffffff"/>' })],
      [box({ x: 4.0, y: 1.2, sx: 1.4, sy: 1.4, h: 1.7, c: '#b7c0c9' })],
      [disc({ x: 4.7, y: 1.9, z: 1.7, r: 0.5, c: '#4a9de0', rim: true, shine: true })],
      card(5.5, 5.5, 'atoms land here',
        '<rect x="-46" y="-4" width="92" height="18" fill="#8e97a3"/>' +
        '<rect x="-46" y="-4" width="92" height="7" fill="#c05cf0" opacity="0.8"/>' +
        '<g class="fall"><circle cx="-30" cy="-20" r="4" fill="#c05cf0"/>' +
        '<circle cx="0" cy="-26" r="4" fill="#c05cf0"/>' +
        '<circle cx="28" cy="-21" r="4" fill="#c05cf0"/></g>'),
      [person({ x: 1.1, y: 3.4, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.4, y: 2.1, text: 'ION GUN' })]
    )
  };

  /* 15. metal wiring */
  scenes.wiring = {
    alt: 'Copper wiring being filled into trenches and polished flat, layer after layer',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      [box({ x: 1.1, y: 1.2, sx: 1.8, sy: 1.6, h: 1.3, c: '#c08a55' })],
      [at({ x: 2.0, y: 2.8, z: 0.65,
        s: '<ellipse cx="0" cy="0" rx="22" ry="11" fill="#2a4a63"/>' +
           '<ellipse cx="0" cy="-2" rx="15" ry="7.5" fill="#4f9fd4" opacity="0.9"/>' })],
      [cyl({ x: 3.9, y: 1.9, r: 0.7, h: 1.0, c: '#8d99a6' })],
      [at({ x: 3.9, y: 1.9, z: 1.0, cls: 'spin',
        s: '<ellipse cx="0" cy="0" rx="30" ry="15" fill="#d8dee5"/>' +
           '<ellipse cx="-10" cy="-5" rx="10" ry="4.5" fill="#ffffff" opacity="0.75"/>' })],
      /* copper feed drums and a stack of wafers waiting their turn */
      [cyl({ x: 1.5, y: 3.4, r: 0.34, h: 1.2, c: '#c9793f' })],
      [cyl({ x: 2.3, y: 3.4, r: 0.34, h: 1.2, c: '#c9793f' })],
      waferRack(3.4, 3.3),
      card(5.5, 5.5, 'wires stacked up',
        '<g transform="translate(0,6)">' +
        '<rect x="-52" y="-4" width="104" height="10" fill="#8e97a3"/>' +
        '<rect x="-52" y="-14" width="104" height="9" fill="#cfd8e0"/>' +
        '<rect x="-44" y="-14" width="16" height="9" fill="#c9793f"/>' +
        '<rect x="-8" y="-14" width="16" height="9" fill="#c9793f"/>' +
        '<rect x="28" y="-14" width="16" height="9" fill="#c9793f"/>' +
        '<rect x="-52" y="-24" width="104" height="9" fill="#cfd8e0"/>' +
        '<rect x="-30" y="-24" width="52" height="9" fill="#c9793f"/>' +
        '<rect x="-52" y="-34" width="104" height="9" fill="#cfd8e0"/>' +
        '<rect x="-46" y="-34" width="14" height="9" fill="#c9793f"/>' +
        '<rect x="18" y="-34" width="26" height="9" fill="#c9793f"/></g>'),
      [person({ x: 1.2, y: 3.4, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.4, y: 2.1, text: 'WIRE FLOOR' })]
    )
  };

  /* 16. the loop */
  scenes.loop = {
    alt: 'A looping track showing the print, etch and wire steps repeating about sixty times',
    legend: G, maxz: 5,
    ground: ['pppppp', 'pfpppf', 'ppffpp', 'ppffpp', 'pfpppf', 'pppppp'],
    items: [].concat(
      machine(0.9, 0.9, '#7fb3d4', 1.2, 1.2, 1.2),
      machine(3.9, 0.9, '#b06cf0', 1.2, 1.2, 1.2),
      machine(3.9, 3.9, '#c9793f', 1.2, 1.2, 1.2),
      machine(0.9, 3.9, '#4fd0c0', 1.2, 1.2, 1.2),
      [at({ x: 3.0, y: 3.0, z: 0.06, k: 60,
        s: '<ellipse cx="0" cy="0" rx="72" ry="36" fill="none" stroke="#f2c14e" stroke-width="8" stroke-dasharray="13 9" class="track"/>' })],
      [at({ x: 3.0, y: 3.0, z: 1.1, k: 600,
        s: '<rect x="-56" y="-24" width="112" height="30" rx="5" fill="#2a1e12" opacity="0.85"/>' +
           '<text x="0" y="-2" text-anchor="middle" font-size="17" font-family="Verdana,sans-serif" font-weight="bold" fill="#f2c14e">x 60 TIMES</text>' })],
      [person({ x: 2.9, y: 5.2, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.4, y: 4.8, text: 'THE LOOP' })]
    )
  };

  /* 17. wafer test */
  scenes.test = {
    alt: 'A prober touching every chip on the wafer in turn to see which ones work',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      [box({ x: 1.1, y: 1.5, sx: 2.8, sy: 2.4, h: 0.8, c: '#6d7885' })],
      [disc({ x: 2.5, y: 2.7, z: 0.8, r: 1.0, c: '#7f93a8', rim: true })],
      [at({ x: 2.5, y: 2.7, z: 0.84, s: dieGrid(11, '#3fb5a0', '#d94f3d') })],
      [at({ x: 2.5, y: 2.0, z: 1.95, cls: 'probe', k: 400,
        s: '<rect x="-18" y="-44" width="36" height="28" rx="3" fill="#8d99a6"/>' +
           '<path d="M0,-16 l0,18" stroke="#4a5568" stroke-width="3.5"/>' +
           '<circle cx="0" cy="5" r="3.5" fill="#ff5f4d"/>' })],
      [box({ x: 4.2, y: 1.4, sx: 1.0, sy: 2.2, h: 2.1, c: '#c4ccd4' })],
      [at({ x: 4.7, y: 3.6, z: 1.5,
        s: '<rect x="-18" y="-18" width="36" height="25" rx="2" fill="#16324a"/>' +
           '<rect x="-14" y="-14" width="11" height="7" fill="#4fd0c0"/>' +
           '<rect x="-1" y="-14" width="11" height="7" fill="#4fd0c0"/>' +
           '<rect x="-14" y="-4" width="11" height="7" fill="#ff5f4d"/>' +
           '<rect x="-1" y="-4" width="11" height="7" fill="#4fd0c0"/>' })],
      [person({ x: 1.4, y: 4.7, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.4, y: 4.5, text: 'TEST BAY' })]
    )
  };

  /* 18. dicing */
  scenes.dice = {
    alt: 'A diamond saw cutting the round wafer into hundreds of small square chips',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      [box({ x: 1.0, y: 1.4, sx: 2.6, sy: 2.3, h: 0.7, c: '#6d7885' })],
      [disc({ x: 2.3, y: 2.55, z: 0.7, r: 0.95, c: '#7f93a8', rim: true })],
      [at({ x: 2.3, y: 2.55, z: 0.74, s: dieGrid(10, '#3fb5a0', '#3fb5a0') })],
      [at({ x: 2.3, y: 1.9, z: 1.45, cls: 'saw2', k: 400,
        s: '<rect x="-3.5" y="-38" width="7" height="26" fill="#5f6b78"/>' +
           '<ellipse cx="0" cy="-9" rx="18" ry="6" fill="#eef3f7" stroke="#8d99a6" stroke-width="1.5"/>' })],
      /* the tray of loose chips */
      [box({ x: 3.9, y: 3.2, sx: 1.5, sy: 1.5, h: 0.28, c: '#5f6b78' })],
      [at({ x: 4.65, y: 3.95, z: 0.28, s: chipTray() })],
      [person({ x: 1.2, y: 4.6, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.4, y: 4.7, text: 'DICING SAW' })]
    )
  };

  /* 19. packaging */
  scenes.pack = {
    alt: 'A packaging line gluing each chip into a case, wiring it up and fitting a lid',
    legend: G, maxz: 5,
    ground: INDOOR,
    items: [].concat(
      machine(1.0, 1.1, '#7fb3d4', 1.1, 1.2, 1.1),
      machine(2.4, 1.1, '#e0a94f', 1.1, 1.2, 1.1),
      machine(3.8, 1.1, '#4fd0c0', 1.1, 1.2, 1.1),
      conveyor(1.0, 2.6, 4, '#2f3945'),
      card(5.5, 5.5, 'chip inside its case',
        '<g transform="translate(0,8)">' +
        '<rect x="-54" y="-8" width="108" height="16" rx="3" fill="#2f3945"/>' +
        '<rect x="-28" y="-19" width="56" height="11" fill="#3fb5a0"/>' +
        '<path d="M-28,-19 l-15,11 M-15,-19 l-9,11 M15,-19 l9,11 M28,-19 l15,11" stroke="#e8b73f" stroke-width="2.5" fill="none"/>' +
        '<rect x="-54" y="8" width="10" height="7" fill="#c9c9c9"/>' +
        '<rect x="-28" y="8" width="10" height="7" fill="#c9c9c9"/>' +
        '<rect x="-3" y="8" width="10" height="7" fill="#c9c9c9"/>' +
        '<rect x="22" y="8" width="10" height="7" fill="#c9c9c9"/>' +
        '<rect x="44" y="8" width="10" height="7" fill="#c9c9c9"/></g>'),
      [person({ x: 4.9, y: 2.4, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [sign({ x: 5.4, y: 1.9, text: 'PACKAGING' })]
    )
  };

  /* 20. final test and ship */
  scenes.ship = {
    alt: 'Finished chips sorted into bins by quality and loaded onto a delivery truck',
    legend: G, maxz: 5,
    ground: ['gppppg', 'pffffp', 'pffffp', 'pccccp', 'pccccp', 'gppppg'],
    items: [].concat(
      machine(1.0, 1.0, '#4fd0c0', 1.2, 1.3, 1.2),
      machine(2.5, 1.0, '#7fb3d4', 1.2, 1.3, 1.2),
      machine(4.0, 1.0, '#d94f3d', 1.2, 1.3, 1.2),
      [box({ x: 1.0, y: 2.9, sx: 1.0, sy: 1.0, h: 0.65, c: '#c8a06a' })],
      [box({ x: 1.0, y: 2.9, sx: 1.0, sy: 1.0, h: 0.65, z: 0.65, c: '#d2ac76' })],
      [box({ x: 2.2, y: 3.1, sx: 1.0, sy: 1.0, h: 0.65, c: '#c8a06a' })],
      truck(2.3, 4.0, '#3f7fd4'),
      [person({ x: 1.3, y: 4.4, c: '#ffffff', legs: '#ffffff', hat: '#dfe7ee', skin: '#cfe3ee' })],
      [person({ x: 5.2, y: 5.0, c: '#d94f3d', hat: '#f5c542' })],
      [tree({ x: 0.4, y: 0.4 }), bush({ x: 5.5, y: 0.5 }), lamp({ x: 5.5, y: 3.4 })],
      [sign({ x: 5.4, y: 3.3, text: 'SHIPPING' })]
    )
  };

  /* ---------- the park map for the front page ---------- */
  scenes.park = {
    alt: 'A tycoon park map of the whole chip factory, from the sand pit to the shipping gate',
    legend: G, maxz: 7,
    ground: [
      'ggpppppppg',
      'gsspppcccg',
      'gsspcccccg',
      'gppcccccpg',
      'gpccffffcg',
      'gpccffffcg',
      'gpccffffcg',
      'gpcccccccg',
      'gppppppppg',
      'gggggggggg'
    ],
    items: [].concat(
      /* raw material corner */
      [box({ x: 1.1, y: 1.1, sx: 1.5, sy: 1.5, h: 0.35, c: '#d3b878' })],
      [box({ x: 1.4, y: 1.4, sx: 0.9, sy: 0.9, h: 0.35, z: 0.35, c: '#e0c98a' })],
      truck(1.1, 2.9, '#d8a13a'),
      /* the smelting and cleaning row along the back */
      [cyl({ x: 4.2, y: 1.7, r: 0.55, h: 2.6, c: '#7d6a58' })],
      [glowPot(4.2, 1.7, 2.6, 20, 10)],
      [smoke(4.2, 1.7, 2.8)],
      silo(5.5, 1.7, 2.2, '#e2d7bd'),
      [cyl({ x: 6.8, y: 1.6, r: 0.35, h: 3.2, c: '#cfd6dd' })],
      [cyl({ x: 7.6, y: 1.6, r: 0.35, h: 2.6, c: '#cfd6dd' })],
      /* the big fab hall in the middle */
      [box({ x: 3.3, y: 3.8, sx: 3.6, sy: 3.2, h: 2.0, c: '#e8eef4' })],
      [roof({ x: 3.3, y: 3.8, sx: 3.6, sy: 3.2, z: 2.0, h: 0.9, c: '#3f6fa8' })],
      [at({ x: 5.1, y: 7.0, z: 0.1, k: 950,
        s: '<rect x="-54" y="-30" width="108" height="28" rx="4" fill="#f2c14e" stroke="#4a3520" stroke-width="3"/>' +
           '<text x="0" y="-10" text-anchor="middle" font-size="15" font-family="Verdana,sans-serif" font-weight="bold" fill="#2a1e12">THE FAB</text>' })],
      /* the crystal puller standing beside the hall */
      [box({ x: 7.2, y: 3.6, sx: 1.3, sy: 1.3, h: 1.1, c: '#c4ccd4' })],
      [cyl({ x: 7.85, y: 4.25, r: 0.3, h: 2.6, z: 1.1, c: '#b8c2cc' })],
      [box({ x: 7.75, y: 4.15, sx: 0.2, sy: 0.2, h: 0.35, z: 3.7, c: '#8d99a6' })],
      /* shipping */
      truck(5.9, 7.5, '#3f7fd4'),
      [box({ x: 1.8, y: 7.5, sx: 0.9, sy: 0.9, h: 0.6, c: '#c8a06a' })],
      /* park dressing */
      [tree({ x: 0.4, y: 4.5 }), tree({ x: 0.4, y: 6.5 }), tree({ x: 9.4, y: 4.5 }),
       tree({ x: 9.4, y: 6.6 }), bush({ x: 2.5, y: 5.6 }), bush({ x: 8.5, y: 6.0 })],
      [lamp({ x: 2.2, y: 8.5 }), lamp({ x: 5.4, y: 8.5 }), lamp({ x: 8.2, y: 8.5 })],
      [person({ x: 3.2, y: 8.4, c: '#d94f3d', hat: '#f5c542' }),
       person({ x: 4.6, y: 8.6, c: '#3f7fd4', hat: '#ffffff' }),
       person({ x: 6.6, y: 8.4, c: '#8a5fd4', hat: '#ffffff' }),
       person({ x: 7.6, y: 8.6, c: '#2f7a34', hat: '#f5c542' })],
      [sign({ x: 1.4, y: 8.6, text: 'WELCOME' })]
    )
  };

  global.SCENES = scenes;
})(window);
