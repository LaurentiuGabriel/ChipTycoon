/* main.js: canvas sizing, the camera, input, and the frame loop. */
(function (global) {
  'use strict';

  var Iso = global.Iso, Park = global.Park, Tour = global.Tour,
      Renderer = global.Renderer, UI = global.UI;

  var canvas = document.getElementById('stage');
  var tooltip = document.getElementById('tooltip');

  var cam = { x: 0, y: 0, scale: 1, ox: 0, oy: 0, dpr: 1 };
  var follow = true;
  var hover = null;
  var pointer = { down: false, x: 0, y: 0, moved: 0 };
  var pinch = null;
  var viewW = 0, viewH = 0;

  global.I18n.init(Park);
  UI.init();
  global.I18n.onChange(function () { hideTip(); });

  /* ---- layout ------------------------------------------------------------ */

  /* Chrome heights measured from the DOM, so the camera aims at the strip of
     screen the park is actually visible in rather than the whole window. */
  var layout = { top: 64, dock: 120, panel: 0, sheet: 0 };
  var elDock = document.getElementById('dock');
  var elPanel = document.getElementById('guide');
  var elHud = document.getElementById('hud');
  var elTop = document.querySelector('.topbar');

  /* Avoid a ResizeObserver feedback loop: writing a variable that is already
     set would resize the chrome again and re-fire the observer forever. */
  var lastVars = {};
  function setVar(name, value) {
    if (lastVars[name] === value) return;
    lastVars[name] = value;
    document.documentElement.style.setProperty(name, value);
  }

  function measure() {
    var top = elTop ? elTop.getBoundingClientRect().height : 52;
    var hud = elHud ? elHud.getBoundingClientRect() : null;
    layout.top = hud ? Math.max(top + 4, hud.bottom + 8) : top + 8;

    var dockH = elDock ? elDock.getBoundingClientRect().height : 96;
    layout.dock = dockH + 16;

    /* CSS pins the sheet and the zoom buttons to these measured heights, so the
       layout survives the controls wrapping onto a second row. */
    setVar('--hud-top', Math.round(top + 4) + 'px');
    setVar('--hud-h', Math.round(layout.top) + 'px');
    setVar('--dock-h', Math.round(dockH + 18) + 'px');

    if (!elPanel || elPanel.classList.contains('hidden')) {
      layout.panel = 0; layout.sheet = 0;
      return;
    }
    /* Read which arrangement CSS actually chose rather than guessing from the
       viewport width: a panel spanning the full width is a bottom sheet and
       costs height, anything narrower is a side column and costs width. */
    var r = elPanel.getBoundingClientRect();
    if (r.width > viewW * 0.8) {
      layout.sheet = r.height + 12; layout.panel = 0;
    } else {
      layout.panel = r.width + 26; layout.sheet = 0;
    }
  }

  function availableRect() {
    return {
      x: 0, w: Math.max(220, viewW - layout.panel),
      y: layout.top,
      h: Math.max(180, viewH - layout.top - layout.dock - layout.sheet)
    };
  }

  function focusPoint() {
    var r = availableRect();
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  function resize() {
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    viewW = global.innerWidth;
    viewH = global.innerHeight;
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    canvas.style.width = viewW + 'px';
    canvas.style.height = viewH + 'px';
    cam.dpr = dpr;
  }

  function syncOffsets() {
    var f = focusPoint();
    cam.ox = f.x - cam.x * cam.scale;
    cam.oy = f.y - cam.y * cam.scale;
  }

  function screenToWorld(sx, sy) {
    return Iso.unproject((sx - cam.ox) / cam.scale, (sy - cam.oy) / cam.scale);
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function defaultScale() { return viewW <= 900 ? 0.62 : 0.85; }

  function fitPark() {
    var B = Park.BOUNDS;
    var w = (B.x1 - B.x0 + B.y1 - B.y0) * Iso.TW;
    var h = (B.x1 - B.x0 + B.y1 - B.y0) * Iso.TH + 70;
    var r = availableRect();
    cam.scale = clamp(Math.min((r.w - 30) / w, (r.h - 30) / h), 0.1, 1.4);
    var c = Iso.project((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, 0);
    cam.x = c.x; cam.y = c.y;
  }

  /* Aim a little ahead of the cart, so you see where the wafer is going. */
  var LOOKAHEAD = 2.5;
  function cartTarget() {
    var p = Tour.cartPosition();
    return Iso.project(p.x + (p.dx || 0) * LOOKAHEAD, p.y + (p.dy || 0) * LOOKAHEAD, p.z);
  }

  /* ---- picking ----------------------------------------------------------- */

  function pick(sx, sy) {
    var w = screenToWorld(sx, sy);
    var best = null, bestD = 1e9;
    for (var i = 0; i < Park.stops.length; i++) {
      var s = Park.stops[i];
      var d = Math.hypot(w.x - s.x, w.y - s.y);
      if (d < s.r && d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  /* ---- input ------------------------------------------------------------- */

  canvas.addEventListener('pointerdown', function (e) {
    canvas.setPointerCapture(e.pointerId);
    pointer.down = true; pointer.x = e.clientX; pointer.y = e.clientY; pointer.moved = 0;
    flyTarget = null;
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('pointermove', function (e) {
    if (pointer.down) {
      var dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
      pointer.moved += Math.abs(dx) + Math.abs(dy);
      cam.x -= dx / cam.scale; cam.y -= dy / cam.scale;
      pointer.x = e.clientX; pointer.y = e.clientY;
      if (pointer.moved > 6) setFollow(false);
      hideTip();
      return;
    }
    var s = pick(e.clientX, e.clientY);
    hover = s ? s.id : null;
    if (s) showTip(e.clientX, e.clientY, s); else hideTip();
    canvas.style.cursor = s ? 'pointer' : 'grab';
  });

  canvas.addEventListener('pointerup', function (e) {
    if (!pointer.down) return;
    pointer.down = false;
    canvas.classList.remove('dragging');
    if (pointer.moved < 6) {
      var s = pick(e.clientX, e.clientY);
      if (s) UI.showStop(s, true); else UI.unpin();
    }
  });
  canvas.addEventListener('pointercancel', function () {
    pointer.down = false; canvas.classList.remove('dragging');
  });
  canvas.addEventListener('pointerleave', hideTip);

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    flyTarget = null;
    zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0016));
  }, { passive: false });

  canvas.addEventListener('dblclick', function () { flyTarget = null; setFollow(false); fitPark(); });

  function zoomAt(mx, my, factor) {
    var px = (mx - cam.ox) / cam.scale, py = (my - cam.oy) / cam.scale;
    cam.scale = clamp(cam.scale * factor, 0.1, 2.6);
    var f = focusPoint();
    cam.x = px + (f.x - mx) / cam.scale;
    cam.y = py + (f.y - my) / cam.scale;
  }
  function zoomStep(f) {
    var r = availableRect();
    zoomAt(r.x + r.w / 2, r.y + r.h / 2, f);
  }

  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) {
      pinch = { d: touchDist(e.touches),
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    if (e.touches.length === 2 && pinch) {
      var d = touchDist(e.touches);
      zoomAt(pinch.x, pinch.y, d / pinch.d);
      pinch.d = d;
      setFollow(false);
    }
  }, { passive: true });
  canvas.addEventListener('touchend', function () { pinch = null; }, { passive: true });
  function touchDist(t) {
    return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  }

  function showTip(x, y, s) {
    tooltip.hidden = false;
    tooltip.innerHTML = '';
    var name = document.createElement('b');
    name.textContent = s.name;
    tooltip.appendChild(name);
    tooltip.appendChild(document.createTextNode(s.short));
    var r = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.min(x + 14, viewW - r.width - 12) + 'px';
    tooltip.style.top = Math.min(y + 14, viewH - r.height - 12) + 'px';
  }
  function hideTip() { tooltip.hidden = true; }

  document.getElementById('zoom-in').addEventListener('click', function () { zoomStep(1.35); });
  document.getElementById('zoom-out').addEventListener('click', function () { zoomStep(1 / 1.35); });
  document.getElementById('zoom-fit').addEventListener('click', function () {
    flyTarget = null; setFollow(false); fitPark();
  });

  var followBox = document.getElementById('follow');
  followBox.addEventListener('change', function () { follow = followBox.checked; });
  function setFollow(v) { follow = v; followBox.checked = v; }

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    switch (e.key.toLowerCase()) {
      case ' ': e.preventDefault(); Tour.toggle(); UI.paint(true); break;
      case 's': Tour.step(); break;
      case 'r': UI.resetAll(); break;
      case 'f': setFollow(!follow); break;
      case 'l':
        var lb = document.getElementById('labels');
        lb.checked = !lb.checked;
        Renderer.setLabels(lb.checked);
        break;
      case 'escape': document.getElementById('about').hidden = true; break;
    }
  });

  global.addEventListener('resize', function () { resize(); measure(); });
  global.addEventListener('orientationchange', function () { resize(); measure(); syncOffsets(); });
  if (global.ResizeObserver) {
    var ro = new global.ResizeObserver(function () { measure(); });
    [elDock, elPanel, elHud, elTop].forEach(function (n) { if (n) ro.observe(n); });
  }

  /* ---- loop -------------------------------------------------------------- */

  var last = performance.now();
  var clock = 0;
  var flyTarget = null;

  function frame(now) {
    /* schedule first, so one bad frame cannot freeze the whole park */
    requestAnimationFrame(frame);
    /* Clamped at both ends. The first callback can carry a timestamp from
       before boot, and a negative dt would wind the animation clock backwards
       and take every time driven painter with it. */
    var dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    clock += dt;

    Tour.update(dt);

    var target = UI.takeFlyTo();
    if (target) { flyTarget = Iso.project(target.x, target.y, 0); setFollow(false); }

    if (flyTarget) {
      /* Ease over several frames and hold the target until we arrive. Applying
         it for one frame only would leave the camera halfway there. */
      var k2 = 1 - Math.pow(0.0006, dt);
      cam.x += (flyTarget.x - cam.x) * k2;
      cam.y += (flyTarget.y - cam.y) * k2;
      cam.scale += (1.15 - cam.scale) * k2;
      if (Math.hypot(flyTarget.x - cam.x, flyTarget.y - cam.y) < 1.5) flyTarget = null;
    } else if (follow) {
      var lp = cartTarget();
      var k = 1 - Math.pow(0.05, dt);      // ~0.3s time constant, eases along
      cam.x += (lp.x - cam.x) * k;
      cam.y += (lp.y - cam.y) * k;
    }

    syncOffsets();
    Renderer.draw(canvas, cam, clock, UI.activeStop(), hover);
    UI.paint(false);
  }

  /* ---- boot -------------------------------------------------------------- */

  resize();
  measure();
  UI.boot();
  cam.scale = defaultScale();
  var c0 = cartTarget();
  cam.x = c0.x; cam.y = c0.y;
  syncOffsets();
  requestAnimationFrame(frame);
})(window);
