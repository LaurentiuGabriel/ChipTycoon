/* ui.js: the guide panel, the HUD and the transport controls. */
(function (global) {
  'use strict';

  var Park = global.Park, Tour = global.Tour, Renderer = global.Renderer,
      I18n = global.I18n;

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

    /* The phone sheet: collapsed shows just the stop head, expanded shows the
       full explanation and the route list. */
    var sheet = $('sheet-handle');
    sheet.addEventListener('click', function () {
      var g = $('guide');
      var open = !g.classList.contains('open');
      g.classList.toggle('open', open);
      sheet.setAttribute('aria-expanded', String(open));
      sheet.querySelector('.sheet-label').textContent = I18n.t(open ? 'actions.showLess' : 'actions.readMore');
      if (open) g.scrollTop = 0;
    });

    var pbtn = $('btn-panel');
    pbtn.addEventListener('click', function () {
      var p = $('guide');
      var hide = !p.classList.contains('hidden');
      p.classList.toggle('hidden', hide);
      pbtn.textContent = I18n.t(hide ? 'actions.showGuide' : 'actions.hideGuide');
      pbtn.setAttribute('aria-expanded', String(!hide));
    });

    Tour.on(function (name, id) {
      if (name === 'stage' && !pinned) showStop(Park.stopById[id], false);
      if (name === 'reset') { pinned = null; lastPainted = null; }
    });

    I18n.onChange(function () {
      Tour.refreshReadingTime();
      buildStopList();
      var visible = pinned || Park.stopById[Tour.state.stage] || Park.stopById[lastPainted] || Park.stops[0];
      lastPainted = null;
      render(visible);
      el.pinNote.hidden = !pinned;
      syncChromeLabels();
      paint(true);
    });
  }

  function buildStopList() {
    var host = el.stopList;
    host.innerHTML = '';
    Park.stops.forEach(function (s, i) {
      var b = document.createElement('button');
      b.className = 'stop-chip act' + s.act;
      b.dataset.id = s.id;
      var number = document.createElement('i');
      number.textContent = i + 1;
      b.appendChild(number);
      b.appendChild(document.createTextNode(s.name));
      b.addEventListener('click', function () {
        pinned = null;
        Tour.jumpTo(s.id);
        flyTo = { x: s.x, y: s.y };
        collapseSheet();   /* on a phone, get out of the way of the ride */
      });
      host.appendChild(b);
    });
  }

  /* No-op unless the sheet layout is active, since the handle is display:none
     on wider screens where nothing is collapsed in the first place. */
  function collapseSheet() {
    var g = $('guide'), h = $('sheet-handle');
    if (!g || !h || !h.offsetParent) return;
    g.classList.remove('open');
    h.setAttribute('aria-expanded', 'false');
    h.querySelector('.sheet-label').textContent = I18n.t('actions.readMore');
  }

  function syncChromeLabels() {
    var guide = $('guide');
    var sheet = $('sheet-handle');
    var panelButton = $('btn-panel');
    sheet.querySelector('.sheet-label').textContent = I18n.t(
      guide.classList.contains('open') ? 'actions.showLess' : 'actions.readMore'
    );
    panelButton.textContent = I18n.t(
      guide.classList.contains('hidden') ? 'actions.showGuide' : 'actions.hideGuide'
    );
  }

  function showStop(stop, isPin) {
    if (!stop) return;
    pinned = isPin ? stop : pinned;
    render(stop);
    el.pinNote.hidden = !isPin;
  }

  function render(stop) {
    if (lastPainted === stop.id && !pinned) return;
    lastPainted = stop.id;
    var n = Park.stops.indexOf(stop) + 1;
    el.chip.textContent = I18n.t('guide.stopCounter', { current: n, total: Park.stops.length });
    el.chip.className = 'chip act' + stop.act;
    el.name.textContent = stop.name;
    el.short.textContent = stop.short;
    el.body.textContent = stop.body;
    el.tip.innerHTML = '';
    var tipLabel = document.createElement('b');
    tipLabel.textContent = I18n.t('guide.tipLabel');
    el.tip.appendChild(tipLabel);
    el.tip.appendChild(document.createTextNode(stop.tip));
    el.hudNote.textContent = I18n.t('act.' + stop.act);

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
      ? I18n.t('guide.reading')
      : I18n.t('guide.movingOn');

    el.hudStop.textContent = s.seenCount + ' / ' + Park.stops.length;
    el.hudLayer.textContent = I18n.t('status.layer', { current: s.lap, total: s.laps });
    el.hudBatch.textContent = '#' + s.batch;
    el.progressBar.style.width = (Tour.progress() * 100).toFixed(1) + '%';

    if (s.tourDone && !s.reading) {
      el.hudNote.textContent = I18n.t('status.complete');
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
