/* iso.js: the isometric canvas engine.
   Grid space: x runs toward the lower right, y toward the lower left, z up.
   Shading is deliberately high contrast so solids read as chunky painted
   models rather than a soft render. */
(function (global) {
  'use strict';

  var TW = 28;   // px per grid unit on screen x
  var TH = 14;   // px per grid unit on screen y
  var TZ = 18;   // px per grid unit of height

  function project(x, y, z) {
    return { x: (x - y) * TW, y: (x + y) * TH - (z || 0) * TZ };
  }

  /* Inverse projection onto the z = 0 ground plane. */
  function unproject(sx, sy) {
    var a = sx / TW, b = sy / TH;
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }

  /* ---- colour ------------------------------------------------------------ */

  var shadeCache = Object.create(null);

  function parseHex(hex) {
    var h = ('' + hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return [255, 0, 255];        // loud magenta beats silent black
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /* Quantised before caching: animated tints feed this a continuously varying
     factor, which would otherwise miss every lookup and grow the cache forever. */
  function shade(hex, f) {
    f = Math.round(f * 64) / 64;
    var key = hex + '|' + f;
    var hit = shadeCache[key];
    if (hit) return hit;
    var c = parseHex(hex);
    var out = 'rgb(' + Math.min(255, Math.round(c[0] * f)) + ',' +
                       Math.min(255, Math.round(c[1] * f)) + ',' +
                       Math.min(255, Math.round(c[2] * f)) + ')';
    shadeCache[key] = out;
    return out;
  }

  function rgba(hex, a) {
    var c = parseHex(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  /* Returns hex, because results are routinely fed back into shade(). */
  function mix(a, b, t) {
    var A = parseHex(a), B = parseHex(b), out = '#';
    for (var i = 0; i < 3; i++) {
      var v = Math.max(0, Math.min(255, Math.round(A[i] + (B[i] - A[i]) * t)));
      out += (v < 16 ? '0' : '') + v.toString(16);
    }
    return out;
  }

  function hash2(x, y, s) {
    var h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^
             Math.imul(s | 0, 2246822519)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /* ---- drawing ----------------------------------------------------------- */

  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
  }

  function stroke(ctx, pts, close) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (close) ctx.closePath();
    ctx.stroke();
  }

  /* Face factors. The wide gap between them is what gives solids their chunky
     toy look; softer values read as a render instead of a painted model. */
  var TOP = 1.06, RIGHT = 0.84, LEFT = 0.62;
  var EDGE = 'rgba(38,26,14,0.34)';

  /* Axis aligned box. o = {x,y,z,w,d,h,color,top,edge,alpha} */
  function box(ctx, o) {
    var x = o.x, y = o.y, z = o.z || 0, w = o.w, d = o.d, h = o.h, c = o.color;
    var t = z + h;
    if (o.alpha != null) { ctx.save(); ctx.globalAlpha *= o.alpha; }

    var A = project(x, y, t), B = project(x + w, y, t),
        C = project(x + w, y + d, t), D = project(x, y + d, t);
    var Bb = project(x + w, y, z), Cb = project(x + w, y + d, z), Db = project(x, y + d, z);

    ctx.fillStyle = shade(c, LEFT);  poly(ctx, [B, C, Cb, Bb]);
    ctx.fillStyle = shade(c, RIGHT); poly(ctx, [D, C, Cb, Db]);
    ctx.fillStyle = shade(o.top || c, TOP); poly(ctx, [A, B, C, D]);

    if (o.edge !== false) {
      ctx.strokeStyle = o.edge || EDGE;
      ctx.lineWidth = 1;
      ctx.lineJoin = 'round';
      stroke(ctx, [A, B, C, D], true);
      stroke(ctx, [B, Bb]); stroke(ctx, [C, Cb]); stroke(ctx, [D, Db]);
    }
    if (o.alpha != null) ctx.restore();
  }

  /* Extrude any ground polygon. Side faces are shaded from their own normals
     and painted back to front, so the footprint can sit at any angle. */
  function prism(ctx, base, z, h, color, edge) {
    var i, n = base.length, top = [], bot = [];
    for (i = 0; i < n; i++) {
      top.push(project(base[i].x, base[i].y, z + h));
      bot.push(project(base[i].x, base[i].y, z));
    }
    var faces = [];
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n;
      var ex = base[j].x - base[i].x, ey = base[j].y - base[i].y;
      var el = Math.hypot(ex, ey) || 1;
      var nx = -ey / el, ny = ex / el;
      if (nx + ny <= 0) continue;                 // facing away from the camera
      faces.push({
        depth: base[i].x + base[i].y + base[j].x + base[j].y,
        f: 0.72 + 0.14 * nx - 0.08 * ny,
        quad: [top[i], top[j], bot[j], bot[i]]
      });
    }
    faces.sort(function (a, b) { return a.depth - b.depth; });
    for (i = 0; i < faces.length; i++) {
      ctx.fillStyle = shade(color, faces[i].f);
      poly(ctx, faces[i].quad);
    }
    ctx.fillStyle = shade(color, TOP);
    poly(ctx, top);
    if (edge !== false) {
      ctx.strokeStyle = edge || EDGE;
      ctx.lineWidth = 1;
      ctx.lineJoin = 'round';
      stroke(ctx, top, true);
    }
  }

  /* A box turned to face (hx,hy). `len` runs along the heading, `wid` across. */
  function orientedBox(ctx, o) {
    var m = Math.hypot(o.hx, o.hy) || 1;
    var hx = o.hx / m, hy = o.hy / m, px = -hy, py = hx;
    var L = o.len / 2, W = o.wid / 2;
    prism(ctx, [
      { x: o.x + hx * L + px * W, y: o.y + hy * L + py * W },
      { x: o.x + hx * L - px * W, y: o.y + hy * L - py * W },
      { x: o.x - hx * L - px * W, y: o.y - hy * L - py * W },
      { x: o.x - hx * L + px * W, y: o.y - hy * L + py * W }
    ], o.z || 0, o.h, o.color, o.edge);
  }

  /* Pitched roof on a box footprint, ridge running along +x. */
  function gable(ctx, o) {
    var x = o.x, y = o.y, z = o.z, w = o.w, d = o.d, h = o.h, c = o.color;
    var my = y + d / 2, tz = z + h;
    var A = project(x, y, z), B = project(x + w, y, z);
    var C = project(x + w, y + d, z), D = project(x, y + d, z);
    var R1 = project(x, my, tz), R2 = project(x + w, my, tz);

    ctx.fillStyle = shade(c, 1.10); poly(ctx, [A, B, R2, R1]);
    ctx.fillStyle = shade(c, 0.60); poly(ctx, [B, R2, C]);
    ctx.fillStyle = shade(c, 0.86); poly(ctx, [D, C, R2, R1]);
    if (o.edge !== false) {
      ctx.strokeStyle = EDGE; ctx.lineWidth = 1; ctx.lineJoin = 'round';
      stroke(ctx, [A, B, R2, R1], true);
      stroke(ctx, [D, C, R2, R1], true);
    }
  }

  /* Vertical cylinder centred on (x,y). */
  function cylinder(ctx, o) {
    var r = o.r, z = o.z || 0, h = o.h, c = o.color;
    var a = r * TW * 1.41421, b = r * TH * 1.41421;
    var top = project(o.x, o.y, z + h), bot = project(o.x, o.y, z);

    ctx.fillStyle = shade(c, LEFT);
    ctx.beginPath();
    ctx.ellipse(bot.x, bot.y, a, b, 0, 0, Math.PI);
    ctx.lineTo(top.x - a, top.y);
    ctx.lineTo(bot.x - a, bot.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = shade(c, 0.90);
    ctx.fillRect(top.x - a, top.y, a * 2, Math.max(0, bot.y - top.y));
    ctx.fillStyle = shade(c, 1.0);                      // lit strip down the left
    ctx.fillRect(top.x - a, top.y, a * 0.5, Math.max(0, bot.y - top.y));

    ctx.fillStyle = shade(o.top || c, o.topShade != null ? o.topShade : TOP);
    ctx.beginPath();
    ctx.ellipse(top.x, top.y, a, b, 0, 0, Math.PI * 2);
    ctx.fill();

    if (o.edge !== false) {
      ctx.strokeStyle = EDGE; ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(top.x - a, top.y); ctx.lineTo(bot.x - a, bot.y);
      ctx.moveTo(top.x + a, top.y); ctx.lineTo(bot.x + a, bot.y);
      ctx.stroke();
    }
  }

  /* Cone, used for silo lids and tree crowns. */
  function cone(ctx, x, y, z, r, h, color) {
    var a = r * TW * 1.41421, b = r * TH * 1.41421;
    var base = project(x, y, z), tip = project(x, y, z + h);
    ctx.fillStyle = shade(color, 0.72);
    ctx.beginPath();
    ctx.moveTo(base.x - a, base.y);
    ctx.ellipse(base.x, base.y, a, b, 0, Math.PI, 0, true);
    ctx.lineTo(tip.x, tip.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(color, 1.05);
    ctx.beginPath();
    ctx.moveTo(base.x - a, base.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(base.x, base.y + b * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  function disc(ctx, x, y, z, r) {
    var p = project(x, y, z || 0);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * TW * 1.41421, r * TH * 1.41421, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function discEdge(ctx, x, y, z, r) {
    var p = project(x, y, z || 0);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * TW * 1.41421, r * TH * 1.41421, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* Flat quad on the ground between two grid points. */
  function ribbon(ctx, ax, ay, bx, by, width, z) {
    var dx = bx - ax, dy = by - ay;
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len * width / 2, ny = dx / len * width / 2;
    poly(ctx, [
      project(ax + nx, ay + ny, z || 0), project(bx + nx, by + ny, z || 0),
      project(bx - nx, by - ny, z || 0), project(ax - nx, ay - ny, z || 0)
    ]);
  }

  function quad(ctx, x, y, w, d, z) {
    poly(ctx, [
      project(x, y, z || 0), project(x + w, y, z || 0),
      project(x + w, y + d, z || 0), project(x, y + d, z || 0)
    ]);
  }

  /* Soft contact shadow under a solid. */
  function shadow(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(30,50,20,0.20)';
    disc(ctx, x, y, 0.01, r);
  }

  global.Iso = {
    TW: TW, TH: TH, TZ: TZ,
    project: project, unproject: unproject,
    shade: shade, rgba: rgba, mix: mix, hash2: hash2,
    poly: poly, stroke: stroke, box: box, prism: prism, orientedBox: orientedBox,
    gable: gable, cylinder: cylinder, cone: cone, disc: disc, discEdge: discEdge,
    ribbon: ribbon, quad: quad, shadow: shadow,
    TOP: TOP, RIGHT: RIGHT, LEFT: LEFT, EDGE: EDGE
  };
})(window);
