/* ui.js: the guide panel, the HUD and the transport controls. */
(function (global) {
  'use strict';

  var Park = global.Park, Tour = global.Tour, Renderer = global.Renderer;

  var el = {};
  var pinned = null;          // a stop the viewer clicked, held until they clear it
  var flyTo = null;
  var lastPainted = null;

  function $(id) { return document.getElementById(id); }

  function init() {
    ['chip', 'name', 'short', 'body', 'tip', 'dwell', 'dwellBar', 'dwellHint',
     'hudStop', 'hudLayer', 'hudBatch', 'hudNote', 'stopList', 'playGlyph',
     'progressBar', 'pinNote'].forEach(function (k) { el[k] = $('ui-' + k); });

    buildStopList();

    $('btn-play').addEventListener('click', function () { Tour.toggle(); paint(true); });
    $('btn-step').addEventListener('click', function () { Tour.step(); });
    $('btn-restart').addEventListener('click', function () { resetAll(); });
    $('btn-unpin').addEventListener('click', function () { unpin(); });

    var speed = $('speed');
    speed.addEventListener('input', function () {
      Tour.state.speed = parseFloat(speed.value);
      $('v-speed').textContent = Tour.state.speed.toFixed(1) + '×';
    });

    var labels = $('labels');
    labels.addEventListener('change', function () { Renderer.setLabels(labels.checked); });

    $('btn-about').addEventListener('click', function () { $('about').hidden = false; });
    $('about-close').addEventListener('click', function () { $('about').hidden = true; });
    $('about').addEventListener('click', function (e) {
      if (e.target === $('about')) $('about').hidden = true;
    });

    var pbtn = $('btn-panel');
    pbtn.addEventListener('click', function () {
      var p = $('guide');
      var hide = !p.classList.contains('hidden');
      p.classList.toggle('hidden', hide);
      pbtn.textContent = hide ? 'Show guide' : 'Hide guide';
      pbtn.setAttribute('aria-expanded', String(!hide));
    });

    Tour.on(function (name, id) {
      if (name === 'stage' && !pinned) showStop(Park.stopById[id], false);
      if (name === 'reset') { pinned = null; lastPainted = null; }
    });
  }

  function buildStopList() {
    var host = el.stopList;
    host.innerHTML = '';
    Park.stops.forEach(function (s, i) {
      var b = document.createElement('button');
      b.className = 'stop-chip act' + s.act;
      b.dataset.id = s.id;
      b.innerHTML = '<i>' + (i + 1) + '</i>' + s.name;
      b.addEventListener('click', function () {
        pinned = null;
        Tour.jumpTo(s.id);
        flyTo = { x: s.x, y: s.y };
      });
      host.appendChild(b);
    });
  }

  function showStop(stop, isPin) {
    if (!stop) return;
    pinned = isPin ? stop : pinned;
    render(stop);
    el.pinNote.hidden = !isPin;
  }

  var ACT_NAME = { 1: 'Act 1 · Sand to wafer', 2: 'Act 2 · Drawing the plan',
                   3: 'Act 3 · Printing the chip', 4: 'Act 4 · Chips out the gate' };

  function render(stop) {
    if (lastPainted === stop.id && !pinned) return;
    lastPainted = stop.id;
    var n = Park.stops.indexOf(stop) + 1;
    el.chip.textContent = 'Stop ' + n + ' of 20';
    el.chip.className = 'chip act' + stop.act;
    el.name.textContent = stop.name;
    el.short.textContent = stop.short;
    el.body.textContent = stop.body;
    el.tip.innerHTML = '<b>Tycoon tip:</b> ' + stop.tip;
    el.hudNote.textContent = ACT_NAME[stop.act] || '';

    var chips = el.stopList.children;
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('on', chips[i].dataset.id === stop.id);
      chips[i].classList.toggle('seen', Tour.seen(chips[i].dataset.id));
    }
  }

  function unpin() {
    pinned = null;
    el.pinNote.hidden = true;
    lastPainted = null;
    if (Tour.state.stage) render(Park.stopById[Tour.state.stage] || Park.stops[0]);
  }

  function resetAll() {
    Tour.reset(true);
    lastPainted = null;
    render(Park.stops[0]);
    Tour.play();
    paint(true);
  }

  /* ---- per frame --------------------------------------------------------- */

  function paint(force) {
    var s = Tour.state;

    el.playGlyph.textContent = s.paused ? '▶' : '❙❙';

    var pct = s.dwellTotal > 0 ? (1 - s.dwellLeft / s.dwellTotal) : 1;
    el.dwell.hidden = !(s.dwellTotal > 0 && s.dwellLeft > 0);
    el.dwellBar.style.width = (pct * 100).toFixed(1) + '%';
    el.dwellHint.textContent = s.reading
      ? 'reading stop · press Space to hold it here'
      : 'moving on';

    el.hudStop.textContent = s.seenCount + ' / 20';
    el.hudLayer.textContent = s.lap + ' of ' + s.laps + ' shown';
    el.hudBatch.textContent = '#' + s.batch;
    el.progressBar.style.width = (Tour.progress() * 100).toFixed(1) + '%';

    if (s.tourDone && !s.reading) {
      el.hudNote.textContent = 'Every stop explained · running at watching speed';
    }
  }

  global.UI = {
    init: init,
    paint: paint,
    showStop: showStop,
    unpin: unpin,
    resetAll: resetAll,
    activeStop: function () { return pinned ? pinned.id : Tour.state.stage; },
    isPinned: function () { return !!pinned; },
    takeFlyTo: function () { var f = flyTo; flyTo = null; return f; },
    boot: function () { render(Park.stops[0]); paint(true); }
  };
})(window);
