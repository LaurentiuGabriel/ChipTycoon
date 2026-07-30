/* render.js: paints the park.
   Ground first as flat fills, then every solid through a painter's algorithm
   keyed on the front corner of its footprint. */
(function (global) {
  'use strict';

  var Iso = global.Iso, Park = global.Park, Tour = global.Tour;
  var C = Park.C;

  var showLabels = true;

  /* ---- scenery scattered once at load ------------------------------------ */

  var props = null;

  /* Sample every route so props can be kept clear of the roads. */
  function routeSamples() {
    var pts = [];
    Object.keys(Park.routes).forEach(function (k) {
      var r = Park.routes[k];
      for (var d = 0; d <= r.total; d += 1.2) {
        var p = r.at(d);
        pts.push(p);
      }
    });
    return pts;
  }

  function buildProps() {
    var road = routeSamples();
    var out = [];
    var B = Park.BOUNDS;

    function clearOfRoad(x, y, m) {
      for (var i = 0; i < road.length; i++) {
        if (Math.abs(road[i].x - x) < m && Math.abs(road[i].y - y) < m) {
          if (Math.hypot(road[i].x - x, road[i].y - y) < m) return false;
        }
      }
      return true;
    }
    function clearOfLots(x, y, m) {
      for (var i = 0; i < Park.LOTS.length; i++) {
        var L = Park.LOTS[i];
        if (x > L.x - m && x < L.x + L.w + m && y > L.y - m && y < L.y + L.d + m) return false;
      }
      return true;
    }

    /* Sparse planting only: enough to read as parkland without hiding the
       buildings, which are the whole point of the tour. */
    var n = 0;
    for (var gx = B.x0 + 1; gx < B.x1 - 1; gx += 2.2) {
      for (var gy = B.y0 + 1; gy < B.y1 - 1; gy += 2.2) {
        var h = Iso.hash2(Math.round(gx * 3), Math.round(gy * 3), 17);
        if (h > 0.19) continue;
        var x = gx + (Iso.hash2(gx | 0, gy | 0, 5) - 0.5) * 1.4;
        var y = gy + (Iso.hash2(gx | 0, gy | 0, 9) - 0.5) * 1.4;
        if (!clearOfLots(x, y, 1.1) || !clearOfRoad(x, y, 2.4)) continue;
        n++;
        out.push({ kind: h < 0.12 ? 'tree' : 'bush', x: x, y: y, s: 0.8 + Iso.hash2(n, 2, 3) * 0.35 });
      }
    }

    /* Lamp posts follow the roads at a steady spacing, the way park lighting
       actually does, rather than being scattered across open grass. */
    Object.keys(Park.routes).forEach(function (k) {
      var r = Park.routes[k];
      for (var d = 4; d < r.total - 3; d += 11) {
        var p = r.at(d);
        var lx = p.x - p.dy * 1.9, ly = p.y + p.dx * 1.9;
        if (!clearOfLots(lx, ly, 0.5)) continue;
        out.push({ kind: 'lamp', x: lx, y: ly, s: 1 });
      }
    });

    /* benches and lamps facing the plaza in the middle of the ring */
    for (var i = 0; i < 6; i++) {
      out.push({ kind: 'bench', x: 22 + i * 3.4, y: 26.2, s: 1 });
      out.push({ kind: 'bench', x: 22 + i * 3.4, y: 30.2, s: 1 });
    }
    [[20.5, 25.4], [43, 25.4], [20.5, 31], [43, 31]].forEach(function (p) {
      out.push({ kind: 'lamp', x: p[0], y: p[1], s: 1 });
    });
    return out;
  }

  /* ---- ground ------------------------------------------------------------ */

  function drawGround(ctx, cam) {
    var B = Park.GROUND;

    ctx.fillStyle = C.grass;
    Iso.quad(ctx, B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0, 0);

    /* The checker is clipped to what the camera can actually see. Without that
       a ground plate big enough to fill the screen at minimum zoom would cost
       tens of thousands of quads every frame. */
    var vw = ctx.canvas.width / cam.dpr, vh = ctx.canvas.height / cam.dpr;
    var lo = { x: 1e9, y: 1e9 }, hi = { x: -1e9, y: -1e9 };
    [[0, 0], [vw, 0], [0, vh], [vw, vh]].forEach(function (c) {
      var g = Iso.unproject((c[0] - cam.ox) / cam.scale, (c[1] - cam.oy) / cam.scale);
      lo.x = Math.min(lo.x, g.x); hi.x = Math.max(hi.x, g.x);
      lo.y = Math.min(lo.y, g.y); hi.y = Math.max(hi.y, g.y);
    });
    var x0 = Math.max(B.x0, Math.floor((lo.x - 6) / 4) * 4);
    var x1 = Math.min(B.x1, hi.x + 6);
    var y0 = Math.max(B.y0, Math.floor((lo.y - 6) / 4) * 4);
    var y1 = Math.min(B.y1, hi.y + 6);

    ctx.fillStyle = C.grassAlt;
    for (var x = x0; x < x1; x += 4) {
      for (var y = y0; y < y1; y += 4) {
        if ((Math.round(x / 4 + y / 4) & 1)) continue;
        Iso.quad(ctx, x, y, 4, 4, 0);
      }
    }

    /* paved lots */
    for (var i = 0; i < Park.LOTS.length; i++) {
      var L = Park.LOTS[i];
      ctx.fillStyle = Iso.shade(L.c, 0.86);
      Iso.quad(ctx, L.x - 0.18, L.y - 0.18, L.w + 0.36, L.d + 0.36, 0.001);
      ctx.fillStyle = L.c;
      Iso.quad(ctx, L.x, L.y, L.w, L.d, 0.002);
    }

    /* the roads the cart drives */
    Object.keys(Park.routes).forEach(function (k) {
      var r = Park.routes[k];
      ctx.fillStyle = C.pathEdge;
      for (var s = 0; s < r.segs.length; s++) {
        var g = r.segs[s];
        Iso.ribbon(ctx, g.a.x, g.a.y, g.b.x, g.b.y, 2.5, 0.004);
      }
      ctx.fillStyle = C.path;
      for (var s2 = 0; s2 < r.segs.length; s2++) {
        var g2 = r.segs[s2];
        Iso.ribbon(ctx, g2.a.x, g2.a.y, g2.b.x, g2.b.y, 2.1, 0.005);
      }
      /* round off the corners so the joins do not show as notches */
      ctx.fillStyle = C.path;
      for (var p = 1; p < r.pts.length - 1; p++) Iso.disc(ctx, r.pts[p].x, r.pts[p].y, 0.006, 1.05);
    });
  }

  /* A pulsing ring under whichever stop is being explained. */
  function drawFocusRing(ctx, stop, clock, strength) {
    var k = 0.5 + 0.5 * Math.sin(clock * 3);
    ctx.strokeStyle = 'rgba(242,193,78,' + (0.45 + 0.4 * k) * strength + ')';
    ctx.lineWidth = 3 + k * 2;
    Iso.discEdge(ctx, stop.x, stop.y, 0.02, 2.6 + k * 0.3);
    ctx.fillStyle = 'rgba(242,193,78,' + 0.10 * strength + ')';
    Iso.disc(ctx, stop.x, stop.y, 0.015, 2.6);
  }

  /* ---- the cart and its cargo -------------------------------------------- */

  function drawCargo(ctx, x, y, z, kind, t, lap) {
    var i;
    switch (kind) {
      case 'sand':
        ctx.fillStyle = '#d9c084'; Iso.disc(ctx, x, y, z, 0.62);
        Iso.cone(ctx, x, y, z, 0.6, 0.5, '#e5d09a');
        break;
      case 'lump':
        for (i = 0; i < 4; i++) {
          var a = i * 1.7;
          Iso.box(ctx, { x: x - 0.4 + Math.cos(a) * 0.22, y: y - 0.3 + Math.sin(a) * 0.2,
                         z: z, w: 0.38, d: 0.34, h: 0.26, color: '#4a4a4a' });
        }
        break;
      case 'poly':
        for (i = 0; i < 4; i++) {
          var a2 = i * 1.7;
          Iso.box(ctx, { x: x - 0.4 + Math.cos(a2) * 0.22, y: y - 0.3 + Math.sin(a2) * 0.2,
                         z: z, w: 0.36, d: 0.32, h: 0.3, color: '#d7dde3' });
        }
        break;
      case 'ingot':
        Iso.orientedBox(ctx, { x: x, y: y, hx: 1, hy: 0, len: 1.9, wid: 0.62, z: z, h: 0.62, color: '#aab7c6' });
        break;
      case 'wafers':
        for (i = 0; i < 4; i++) Park.draw.waferDisc(ctx, x, y, z + i * 0.09, 0.62, '#a8bbcd');
        break;
      case 'mirror':
        Park.draw.waferDisc(ctx, x, y, z + 0.05, 0.72, '#e6eef5');
        break;
      case 'coated':
        Park.draw.waferDisc(ctx, x, y, z + 0.05, 0.72, '#8fd0e8');
        break;
      case 'resist':
        Park.draw.waferDisc(ctx, x, y, z + 0.05, 0.72, '#3fb5a0');
        break;
      case 'exposed':
        Park.draw.waferDisc(ctx, x, y, z + 0.05, 0.72, '#3fb5a0');
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 6);
        ctx.fillStyle = '#ffffff'; Iso.disc(ctx, x, y, z + 0.06, 0.72);
        ctx.globalAlpha = 1;
        break;
      case 'etched':
        Park.draw.waferDisc(ctx, x, y, z + 0.05, 0.72, '#6f8497');
        Park.draw.dieGrid(ctx, x, y, z + 0.07, 5, false);
        break;
      case 'doped':
        Park.draw.waferDisc(ctx, x, y, z + 0.05, 0.72, '#8f6fc0');
        Park.draw.dieGrid(ctx, x, y, z + 0.07, 5, false);
        break;
      case 'wired':
        Park.draw.waferDisc(ctx, x, y, z + 0.05, 0.72, '#c9793f');
        Park.draw.dieGrid(ctx, x, y, z + 0.07, 5, false);
        break;
      case 'stack':
        /* one visible plate per completed layer */
        for (i = 0; i < Math.min(6, lap); i++) {
          Park.draw.waferDisc(ctx, x, y, z + 0.05 + i * 0.10, 0.72,
            i % 2 ? '#8fd0e8' : '#c9793f');
        }
        break;
      case 'tested':
        Park.draw.waferDisc(ctx, x, y, z + 0.05, 0.78, '#7f93a8');
        Park.draw.dieGrid(ctx, x, y, z + 0.07, 7, true);
        break;
      case 'chips':
        Park.draw.chipTray(ctx, x, y, z + 0.05);
        break;
      case 'packaged':
        for (i = 0; i < 4; i++) {
          Iso.box(ctx, { x: x - 0.5 + (i % 2) * 0.55, y: y - 0.4 + ((i / 2) | 0) * 0.5,
                         z: z, w: 0.45, d: 0.4, h: 0.16, color: '#2f3945', top: '#3fb5a0' });
        }
        break;
      case 'boxed':
        Iso.box(ctx, { x: x - 0.55, y: y - 0.45, z: z, w: 1.1, d: 0.9, h: 0.5, color: '#c8a06a' });
        Iso.box(ctx, { x: x - 0.4, y: y - 0.3, z: z + 0.5, w: 0.8, d: 0.6, h: 0.35, color: '#d2ac76' });
        break;
    }
  }

  function drawCart(ctx, p, s, t) {
    Iso.shadow(ctx, p.x, p.y, 1.0);
    var hx = p.dx || 1, hy = p.dy || 0;
    /* chassis and a bright tycoon-yellow body */
    Iso.orientedBox(ctx, { x: p.x, y: p.y, hx: hx, hy: hy, len: 2.5, wid: 1.5, z: p.z, h: 0.18, color: '#2b3038' });
    Iso.orientedBox(ctx, { x: p.x, y: p.y, hx: hx, hy: hy, len: 2.2, wid: 1.3, z: p.z + 0.18, h: 0.32, color: '#e8b23c' });
    /* a driver up front */
    Park.draw.guest(ctx, p.x + hx * 0.75, p.y + hy * 0.75, p.z + 0.5, '#3f7fd4', '#ffffff', t * 6);
    drawCargo(ctx, p.x - hx * 0.35, p.y - hy * 0.35, p.z + 0.5, s.cargo, t, s.lap);
  }

  /* ---- frame ------------------------------------------------------------- */

  function draw(canvas, cam, clock, activeId, hoverId) {
    var ctx = canvas.getContext('2d');
    var s = Tour.state;
    if (!props) props = buildProps();

    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    ctx.fillStyle = '#3f6b2c';
    ctx.fillRect(0, 0, canvas.width / cam.dpr, canvas.height / cam.dpr);

    ctx.save();
    ctx.translate(cam.ox, cam.oy);
    ctx.scale(cam.scale, cam.scale);

    drawGround(ctx, cam);

    /* highlight the stop being explained, and anything the pointer is over */
    var act = Park.stopById[activeId];
    if (act) drawFocusRing(ctx, act, clock, 1);
    if (hoverId && hoverId !== activeId) {
      var hv = Park.stopById[hoverId];
      if (hv) drawFocusRing(ctx, hv, clock, 0.45);
    }

    /* --- build the depth sorted list --- */
    var items = [];

    for (var i = 0; i < Park.buildings.length; i++) {
      var b = Park.buildings[i];
      items.push({ k: (b.x + b.w) + (b.y + b.d), b: b, kind: 'building' });
    }
    for (var j = 0; j < props.length; j++) {
      var pr = props[j];
      items.push({ k: pr.x + pr.y + 0.4, p: pr, kind: 'prop' });
    }
    for (var g = 0; g < Park.guests.length; g++) {
      var G = Park.guests[g];
      var d = (G.offset + clock * G.speed) % G.route.total;
      var raw = G.route.at(d);
      /* walk the shoulder, not the middle of the road */
      var gp = { x: raw.x - raw.dy * G.side, y: raw.y + raw.dx * G.side };
      items.push({ k: gp.x + gp.y + 0.5, kind: 'guest', gp: gp, G: G, ph: clock * 5 + g });
    }
    var cp = Tour.cartPosition();
    items.push({ k: cp.x + cp.y + 0.6, kind: 'cart', cp: cp });

    items.sort(function (a, b2) { return a.k - b2.k; });

    for (var n = 0; n < items.length; n++) {
      var it = items[n];
      if (it.kind === 'building') it.b.draw(ctx, it.b, clock, s);
      else if (it.kind === 'prop') {
        if (it.p.kind === 'tree') Park.draw.tree(ctx, it.p.x, it.p.y, it.p.s);
        else if (it.p.kind === 'bush') Park.draw.bush(ctx, it.p.x, it.p.y);
        else if (it.p.kind === 'bench') Park.draw.bench(ctx, it.p.x, it.p.y);
        else Park.draw.lamp(ctx, it.p.x, it.p.y);
      } else if (it.kind === 'guest') {
        Park.draw.guest(ctx, it.gp.x, it.gp.y, 0, it.G.shirt, it.G.hat, it.ph);
      } else {
        drawCart(ctx, it.cp, s, clock);
      }
    }

    ctx.restore();

    if (showLabels) drawLabels(ctx, cam, activeId);
  }

  /* Signs are drawn in screen space so they stay upright and readable at any
     zoom, the way park signage reads on a map. */
  function drawLabels(ctx, cam, activeId) {
    if (cam.scale < 0.45) return;
    ctx.save();
    ctx.font = 'bold 12px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    /* Signs are placed greedily and any that would collide with one already
       placed is dropped, so a zoomed-out park does not turn into a wall of
       overlapping plates. The active stop is placed first so it always wins. */
    var order = Park.stops.map(function (s, i) { return { s: s, i: i }; });
    order.sort(function (a, b) {
      return (b.s.id === activeId ? 1 : 0) - (a.s.id === activeId ? 1 : 0);
    });
    var placed = [];

    for (var oi = 0; oi < order.length; oi++) {
      var st = order[oi].s, i = order[oi].i;
      var w = Iso.project(st.x, st.y, 0);
      var sx = w.x * cam.scale + cam.ox;
      var sy = w.y * cam.scale + cam.oy - 46 * Math.min(1, cam.scale);
      if (sx < -120 || sy < -40 || sx > ctx.canvas.width / cam.dpr + 120 ||
          sy > ctx.canvas.height / cam.dpr + 40) continue;

      var on = st.id === activeId;
      var text = (i + 1) + '. ' + st.name;
      var tw = ctx.measureText(text).width + 16;

      var clash = false;
      for (var pj = 0; pj < placed.length; pj++) {
        var q = placed[pj];
        if (Math.abs(q.x - sx) < (q.w + tw) / 2 + 6 && Math.abs(q.y - sy) < 24) { clash = true; break; }
      }
      if (clash) continue;
      placed.push({ x: sx, y: sy, w: tw });

      ctx.fillStyle = on ? '#f2c14e' : 'rgba(239,224,189,0.94)';
      ctx.strokeStyle = '#4a3520';
      ctx.lineWidth = 2;
      roundRect(ctx, sx - tw / 2, sy - 10, tw, 20, 4);
      ctx.fill();
      ctx.stroke();
      /* post down to the ground */
      ctx.strokeStyle = 'rgba(74,53,32,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy + 10);
      ctx.lineTo(sx, sy + 10 + 14 * Math.min(1, cam.scale));
      ctx.stroke();

      ctx.fillStyle = '#2f2113';
      ctx.fillText(text, sx, sy + 1);
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  global.Renderer = {
    draw: draw,
    setLabels: function (v) { showLabels = v; },
    labels: function () { return showLabels; }
  };
})(window);
