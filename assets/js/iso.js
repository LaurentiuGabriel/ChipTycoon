/* ChipTycoon - tiny isometric art engine.
   Draws flat-shaded isometric scenes as inline SVG, in the style of
   classic park and zoo tycoon games. No images, no dependencies. */

(function (global) {
  'use strict';

  var TW = 64;   // tile width in pixels
  var TH = 32;   // tile height in pixels
  var ZH = 18;   // pixels per unit of height

  /* ---------- math + colour helpers ---------- */

  function proj(x, y, z) {
    return [(x - y) * (TW / 2), (x + y) * (TH / 2) - (z || 0) * ZH];
  }

  function parseHex(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

  /* amt > 0 lightens, amt < 0 darkens */
  function shade(hex, amt) {
    var c = parseHex(hex);
    var t = amt < 0 ? 0 : 255;
    var p = Math.abs(amt);
    return '#' + c.map(function (v) {
      return clamp((t - v) * p + v).toString(16).padStart(2, '0');
    }).join('');
  }

  function pts(list) {
    return list.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
  }

  /* Depth key for the painter's algorithm.
     Height wins over ground position, so anything resting on a table or a
     roof is always drawn after the thing holding it up. Within one height,
     we sort by the front bottom corner of the footprint. */
  function depth(o, frontX, frontY) {
    if (o.k != null) return o.k;
    return (o.z || 0) * 100 + frontX + frontY;
  }

  function attrs(o) {
    if (!o) return '';
    var s = '';
    if (o.cls) s += ' class="' + o.cls + '"';
    if (o.op != null) s += ' opacity="' + o.op + '"';
    if (o.style) s += ' style="' + o.style + '"';
    return s;
  }

  function poly(points, fill, o) {
    return '<polygon points="' + pts(points) + '" fill="' + fill + '"' + attrs(o) + '/>';
  }

  /* ---------- primitives ----------
     Every primitive returns { k: depthKey, s: svgMarkup }. */

  function tile(o) {
    var x = o.x, y = o.y, c = o.c, z = o.z || 0;
    var p = [proj(x, y, z), proj(x + 1, y, z), proj(x + 1, y + 1, z), proj(x, y + 1, z)];
    return {
      k: -1e6 + x + y,
      s: '<polygon points="' + pts(p) + '" fill="' + c + '" stroke="' + shade(c, -0.10) +
         '" stroke-width="1"' + attrs(o) + '/>'
    };
  }

  function box(o) {
    var x = o.x, y = o.y, z = o.z || 0;
    var sx = o.sx == null ? 1 : o.sx;
    var sy = o.sy == null ? 1 : o.sy;
    var h = o.h == null ? 1 : o.h;
    var c = o.c || '#b9c0c8';
    var top = [proj(x, y, z + h), proj(x + sx, y, z + h), proj(x + sx, y + sy, z + h), proj(x, y + sy, z + h)];
    var lf  = [proj(x + sx, y, z), proj(x + sx, y + sy, z), proj(x + sx, y + sy, z + h), proj(x + sx, y, z + h)];
    var rf  = [proj(x, y + sy, z), proj(x + sx, y + sy, z), proj(x + sx, y + sy, z + h), proj(x, y + sy, z + h)];
    var s = poly(lf, shade(c, -0.30)) + poly(rf, shade(c, -0.14)) + poly(top, shade(c, o.flat ? 0 : 0.16));
    return { k: depth(o, x + sx, y + sy), s: '<g' + attrs(o) + '>' + s + '</g>' };
  }

  /* pitched roof sitting on top of a footprint */
  function roof(o) {
    var x = o.x, y = o.y, z = o.z || 0;
    var sx = o.sx == null ? 1 : o.sx;
    var sy = o.sy == null ? 1 : o.sy;
    var h = o.h == null ? 0.7 : o.h;
    var c = o.c || '#a33b2f';
    var midY = y + sy / 2;
    var a = proj(x, y, z), b = proj(x + sx, y, z);
    var cc = proj(x + sx, y + sy, z), d = proj(x, y + sy, z);
    var r1 = proj(x, midY, z + h), r2 = proj(x + sx, midY, z + h);
    var s = poly([a, b, r2, r1], shade(c, 0.14)) +          // back slope
            poly([d, cc, r2, r1], shade(c, -0.16)) +        // front slope
            poly([b, cc, r2], shade(c, -0.32));             // gable end
    return { k: depth(o, x + sx, y + sy) + 0.005, s: '<g' + attrs(o) + '>' + s + '</g>' };
  }

  function cyl(o) {
    var x = o.x, y = o.y, z = o.z || 0;
    var r = o.r == null ? 0.4 : o.r;
    var h = o.h == null ? 1 : o.h;
    var c = o.c || '#c3ccd6';
    var rx = r * (TW / 2) * Math.SQRT2;
    var ry = r * (TH / 2) * Math.SQRT2;
    var b = proj(x, y, z), t = proj(x, y, z + h);
    var s =
      '<ellipse cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) + '" rx="' + rx.toFixed(1) +
        '" ry="' + ry.toFixed(1) + '" fill="' + shade(c, -0.30) + '"/>' +
      '<rect x="' + (t[0] - rx).toFixed(1) + '" y="' + t[1].toFixed(1) + '" width="' + (rx * 2).toFixed(1) +
        '" height="' + Math.max(0.1, b[1] - t[1]).toFixed(1) + '" fill="' + shade(c, -0.18) + '"/>' +
      '<rect x="' + (t[0] - rx).toFixed(1) + '" y="' + t[1].toFixed(1) + '" width="' + (rx * 0.55).toFixed(1) +
        '" height="' + Math.max(0.1, b[1] - t[1]).toFixed(1) + '" fill="' + shade(c, -0.06) + '"/>' +
      '<ellipse cx="' + t[0].toFixed(1) + '" cy="' + t[1].toFixed(1) + '" rx="' + rx.toFixed(1) +
        '" ry="' + ry.toFixed(1) + '" fill="' + shade(c, o.flat ? 0.02 : 0.18) + '"/>';
    return { k: depth(o, x + r, y + r), s: '<g' + attrs(o) + '>' + s + '</g>' };
  }

  /* a flat disc lying in the ground plane, used for wafers and pools */
  function disc(o) {
    var x = o.x, y = o.y, z = o.z || 0;
    var r = o.r == null ? 0.4 : o.r;
    var c = o.c || '#9fb6c8';
    var rx = r * (TW / 2) * Math.SQRT2;
    var ry = r * (TH / 2) * Math.SQRT2;
    var p = proj(x, y, z);
    var s = '<ellipse cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" rx="' + rx.toFixed(1) +
            '" ry="' + ry.toFixed(1) + '" fill="' + c + '"/>';
    if (o.rim) {
      s += '<ellipse cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" rx="' + rx.toFixed(1) +
           '" ry="' + ry.toFixed(1) + '" fill="none" stroke="' + shade(c, -0.35) + '" stroke-width="1.5"/>';
    }
    if (o.shine) {
      s += '<ellipse cx="' + (p[0] - rx * 0.30).toFixed(1) + '" cy="' + (p[1] - ry * 0.30).toFixed(1) +
           '" rx="' + (rx * 0.42).toFixed(1) + '" ry="' + (ry * 0.40).toFixed(1) +
           '" fill="#ffffff" opacity="0.35"/>';
    }
    return { k: depth(o, x + r, y + r), s: '<g' + attrs(o) + '>' + s + '</g>' };
  }

  /* Free shape anchored to a grid point, drawn in screen space.
     The animation class goes on an inner group on purpose. A CSS transform
     beats the SVG transform attribute, so an animated class on the outer
     group would drag the prop back to the origin. */
  function at(o) {
    var p = proj(o.x, o.y, o.z || 0);
    var inner = o.cls ? '<g' + attrs(o) + '>' + o.s + '</g>' : o.s;
    var outer = o.cls ? '' : attrs(o);
    return {
      k: depth(o, o.x, o.y),
      s: '<g transform="translate(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')"' + outer + '>' + inner + '</g>'
    };
  }

  /* ---------- little park props ---------- */

  function person(o) {
    var shirt = o.c || '#d94f3d';
    var skin = o.skin || '#f0c49b';
    var legs = o.legs || '#33415c';
    /* outlines keep the little figures readable against pale factory floors */
    var line = shade(shirt, -0.45);
    var s =
      '<ellipse cx="0" cy="1" rx="6" ry="3" fill="#000" opacity="0.22"/>' +
      '<rect x="-2" y="-9" width="4" height="6" fill="' + legs + '" stroke="' + shade(legs, -0.4) + '" stroke-width="0.8"/>' +
      '<rect x="-4" y="-17" width="8" height="9" rx="2" fill="' + shirt + '" stroke="' + line + '" stroke-width="1"/>' +
      '<circle cx="0" cy="-20" r="4" fill="' + skin + '" stroke="' + shade(skin, -0.35) + '" stroke-width="0.8"/>' +
      '<path d="M-4.5,-21.5 a4.5,4.5 0 0 1 9,0 z" fill="' + (o.hat || '#f5f7fa') +
      '" stroke="' + shade(o.hat || '#f5f7fa', -0.4) + '" stroke-width="0.8"/>';
    /* visitors always walk in the open, so draw them over the machinery */
    return at({ x: o.x, y: o.y, z: o.z || 0, s: s, cls: o.cls || 'bob',
                k: o.k != null ? o.k : 500 + o.x + o.y });
  }

  function tree(o) {
    var c = o.c || '#2f7a34';
    var s =
      '<ellipse cx="0" cy="2" rx="12" ry="6" fill="#000" opacity="0.20"/>' +
      '<rect x="-3" y="-16" width="6" height="18" fill="#6b4a2b"/>' +
      '<ellipse cx="0" cy="-24" rx="16" ry="14" fill="' + shade(c, -0.15) + '"/>' +
      '<ellipse cx="-4" cy="-28" rx="11" ry="9" fill="' + c + '"/>' +
      '<ellipse cx="-6" cy="-31" rx="6" ry="5" fill="' + shade(c, 0.20) + '"/>';
    return at({ x: o.x, y: o.y, s: s, k: o.k });
  }

  function bush(o) {
    var c = o.c || '#3d8b3d';
    return at({
      x: o.x, y: o.y, k: o.k,
      s: '<ellipse cx="0" cy="1" rx="9" ry="4" fill="#000" opacity="0.18"/>' +
         '<ellipse cx="0" cy="-6" rx="11" ry="8" fill="' + c + '"/>' +
         '<ellipse cx="-3" cy="-9" rx="6" ry="4" fill="' + shade(c, 0.22) + '"/>'
    });
  }

  function lamp(o) {
    return at({
      x: o.x, y: o.y, k: o.k,
      s: '<rect x="-1.5" y="-34" width="3" height="34" fill="#4a5568"/>' +
         '<circle cx="0" cy="-37" r="5" fill="#ffe9a8" class="glow"/>'
    });
  }

  function sign(o) {
    var text = o.text || '';
    var w = Math.max(52, text.length * 8.4 + 16);
    /* labels are signage, so they sit on top of everything */
    return at({
      x: o.x, y: o.y, k: o.k != null ? o.k : 900 + o.x + o.y,
      s: '<rect x="-2" y="-18" width="4" height="18" fill="#6b4a2b"/>' +
         '<rect x="' + (-w / 2) + '" y="-34" width="' + w + '" height="17" rx="2" fill="#efe0bd" stroke="#4a3520" stroke-width="2"/>' +
         '<text x="0" y="-22" text-anchor="middle" font-size="10" font-family="Verdana,sans-serif" font-weight="bold" fill="#3b2a17">' +
         text + '</text>'
    });
  }

  /* a soft cloud, drawn in raw screen coordinates behind everything */
  function cloud(x, y, s, k) {
    return {
      k: k,
      s: '<g transform="translate(' + x.toFixed(0) + ',' + y.toFixed(0) + ') scale(' + s + ')" ' +
         'fill="#ffffff" opacity="0.72">' +
         '<ellipse cx="-22" cy="4" rx="24" ry="11"/>' +
         '<ellipse cx="10" cy="6" rx="28" ry="13"/>' +
         '<ellipse cx="-6" cy="-8" rx="21" ry="15"/>' +
         '<ellipse cx="20" cy="-3" rx="16" ry="11"/></g>'
    };
  }

  /* ---------- scene renderer ---------- */

  function build(items) {
    return items
      .filter(Boolean)
      .map(function (it, i) { it._i = i; return it; })
      .sort(function (a, b) { return (a.k - b.k) || (a._i - b._i); })
      .map(function (it) { return it.s; })
      .join('');
  }

  /* spec = { ground: ['ggg','ggg'], legend: {g:'#5a9e3a'}, maxz: 6, items: [...] } */
  function scene(spec) {
    var items = [];
    var rows = spec.ground || [];
    var H = rows.length;
    var W = H ? rows[0].length : 0;
    var legend = spec.legend || {};

    for (var y = 0; y < H; y++) {
      for (var x = 0; x < rows[y].length; x++) {
        var ch = rows[y][x];
        if (ch === ' ' || ch === '.') continue;
        items.push(tile({ x: x, y: y, c: legend[ch] || '#5a9e3a' }));
      }
    }
    items = items.concat(spec.items || []);

    var maxz = spec.maxz == null ? 6 : spec.maxz;
    var pad = 20;
    var minX = -H * (TW / 2) - pad;
    var maxX = W * (TW / 2) + pad;
    var minY = -maxz * ZH - pad;
    var maxY = (W + H) * (TH / 2) + pad;

    /* a couple of clouds so the sky above the plot looks like park sky */
    if (spec.clouds !== false) {
      var vw = maxX - minX, vh = maxY - minY;
      items.push(cloud(minX + vw * 0.17, minY + vh * 0.20, 1.0, -2e6));
      items.push(cloud(minX + vw * 0.76, minY + vh * 0.11, 0.72, -2e6 + 1));
    }

    return '<svg class="iso" viewBox="' + minX.toFixed(0) + ' ' + minY.toFixed(0) + ' ' +
           (maxX - minX).toFixed(0) + ' ' + (maxY - minY).toFixed(0) +
           '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' +
           (spec.alt || 'Isometric factory scene') + '">' + build(items) + '</svg>';
  }

  global.ISO = {
    TW: TW, TH: TH, ZH: ZH,
    proj: proj, shade: shade, at: at,
    tile: tile, box: box, roof: roof, cyl: cyl, disc: disc,
    person: person, tree: tree, bush: bush, lamp: lamp, sign: sign,
    scene: scene
  };
})(window);
