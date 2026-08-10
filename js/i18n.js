/* i18n.js: dependency-free locale selection for both file:// and hosted use. */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'chiptycoon-language';
  var catalogs = Object.create(null);
  var listeners = [];
  var park = null;
  var originalStops = null;
  var originalCargo = null;

  catalogs.en = {
    strings: {
      'meta.title': 'ChipTycoon: How a Computer Chip Is Made',
      'meta.description': 'A guided isometric tour of a chip factory. A cart carries one wafer from a pile of sand to a finished chip, then a lorry delivers the chips to a data centre, stopping at all twenty two stages along the way.',
      'language.label': 'Language',
      'actions.about': 'About',
      'actions.hideGuide': 'Hide guide',
      'actions.showGuide': 'Show guide',
      'actions.readMore': 'Read more',
      'actions.showLess': 'Show less',
      'actions.close': 'Close',
      'hud.stopsSeen': 'Stops seen',
      'hud.layer': 'Layer',
      'hud.wafer': 'Wafer',
      'zoom.in': 'Zoom in',
      'zoom.out': 'Zoom out',
      'zoom.fitTitle': 'Show the whole park (or double-click)',
      'zoom.fitLabel': 'Fit the whole park',
      'guide.pinned': 'Pinned to this stop.',
      'guide.followAgain': 'Follow the cart again',
      'guide.wholeRoute': 'The whole route',
      'guide.routeHint': 'click any stop to ride there',
      'guide.watchingTitle': 'What you are watching',
      'guide.watchingBody': 'The yellow cart carries one wafer, and the tag above it names whatever it is carrying right now. The cargo changes at every single stop: sand, rough silicon, white polysilicon, a silver crystal, a stack of slices, a mirror-flat disc, then a coloured layer that is coated, printed, etched, doped and wired. Each lap of the ring adds another plate to the stack, so you can watch the chip being built up one layer at a time before the saw cuts it into separate dies. At the loading dock the cart hands the boxed chips to a lorry, which drives them out to the data centre on the east side of the park. Another hall of racks lights up with every delivery, and then the lorry drives back to the gate and the next wafer starts.',
      'guide.stopCounter': 'Stop {current} of {total}',
      'guide.tipLabel': 'Tycoon tip: ',
      'guide.reading': 'reading stop · press Space to hold it here',
      'guide.movingOn': 'moving on',
      'controls.play': 'Play or pause (Space)',
      'controls.step': 'Skip to the next stop (S)',
      'controls.restart': 'Restart the guided tour (R)',
      'controls.speed': 'Speed',
      'controls.follow': 'Follow',
      'controls.signs': 'Signs',
      'about.whatTitle': 'What this is',
      'about.whatBody': 'ChipTycoon is a working chip factory laid out as a theme park. A cart carries one silicon wafer along the roads and stops at each of the twenty buildings that turn ordinary sand into a computer chip. The cargo on the cart is the wafer itself, and it visibly changes at every stop, so you can always see what stage the material is at. Two more stops follow the chips out of the gate: they are palletised onto a lorry at the loading dock and delivered to the data centre, where they are racked up and switched on. Then the lorry drives back and the whole thing runs again.',
      'about.ringTitle': 'Why the middle is a ring',
      'about.ringBody': 'Making a chip is not carving or assembling. It is printing. A pattern is projected onto the wafer with light through a photo mask, carved into a solid layer, and then the whole thing happens again for the next layer up. A real chip is about sixty of those layers stacked on top of each other, which is why the cart drives the same six buildings round and round. The park shows four laps and then moves on, so you are not sat there for an hour.',
      'about.pacingTitle': 'Pacing',
      'about.pacingBody': 'The first time the cart reaches a stop it waits long enough for you to read that stop\'s explanation, between 10 and 22 seconds depending on how much there is to say, and a bar under the panel text shows how long is left. Once every stop has been explained there is nothing new to read, so the park speeds up to a watchable pace. The guided first pass takes about nine minutes. <b>Space</b> holds any stop for as long as you like, <b>S</b> skips to the next one, and the speed slider scales everything, reading stops included.',
      'about.controlsTitle': 'Controls',
      'about.controlsKeyboard': '<b>Space</b> play or pause · <b>S</b> next stop · <b>R</b> restart the tour · <b>F</b> follow camera · <b>L</b> signs',
      'about.controlsPointer': 'Drag to pan, scroll to zoom, double-click to see the whole park.',
      'about.controlsStops': 'Click any building for its explanation, or pick a stop from the list in the guide to ride straight there.',
      'about.accuracyTitle': 'How accurate is it',
      'about.accuracyBody': 'The order of the stages, and what each one physically does, is real: quartz sand, carbon reduction, the Siemens purification, Czochralski crystal growth, wire sawing, polishing, mask making, deposition, photoresist, exposure, develop and etch, ion implantation, copper damascene wiring, wafer probe, dicing, packaging, final sort, and the trays going out on a lorry to the machines that run on them. The numbers quoted are typical rather than exact, since they vary enormously between products. Scaled down for the sake of the ride: four laps instead of about sixty, one wafer instead of a lot moving in parallel, and a park you can walk across in a minute instead of a building the size of several football pitches.',
      'about.technical': 'No build step, no dependencies, no network calls. Every shape on screen is drawn from plain polygons in a canvas.',
      'act.1': 'Act 1 · Sand to wafer',
      'act.2': 'Act 2 · Drawing the plan',
      'act.3': 'Act 3 · Printing the chip',
      'act.4': 'Act 4 · Chips out the gate',
      'act.5': 'Act 5 · Delivered and put to work',
      'status.layer': '{current} of {total} shown',
      'status.complete': 'Every stop explained · running at watching speed',
      'canvas.layer': 'LAYER {count}',
      'canvas.online': 'ONLINE',
      'canvas.idle': 'IDLE',
      'canvas.cargoLayer': '{cargo} · layer {count}'
    }
  };

  function normalise(locale) {
    var value = String(locale || '').replace('_', '-').toLowerCase();
    if (!value || value === 'en' || value.indexOf('en-') === 0) return 'en';
    if (value === 'zh' || value.indexOf('zh-cn') === 0 || value.indexOf('zh-hans') === 0) return 'zh-CN';
    return value;
  }

  function resolve(localeCode) {
    var code = normalise(localeCode);
    if (catalogs[code]) return code;
    var primary = code.split('-')[0];
    return catalogs[primary] ? primary : 'en';
  }

  function savedLocale() {
    try { return global.localStorage && global.localStorage.getItem(STORAGE_KEY); }
    catch (e) { return null; }
  }

  function detectedLocale() {
    var saved = savedLocale();
    if (saved) return normalise(saved);
    var languages = global.navigator && global.navigator.languages;
    return normalise(languages && languages[0] || global.navigator && global.navigator.language);
  }

  var locale = detectedLocale();

  function lookup(key) {
    var active = catalogs[locale] && catalogs[locale].strings;
    var english = catalogs.en.strings;
    return active && active[key] != null ? active[key] : english[key];
  }

  function t(key, values) {
    var value = lookup(key);
    if (value == null) return key;
    if (!values) return value;
    return value.replace(/\{([^}]+)\}/g, function (_, name) {
      return values[name] == null ? '' : values[name];
    });
  }

  function register(code, catalog) {
    catalogs[normalise(code)] = catalog;
  }

  function snapshotPark(nextPark) {
    if (originalStops) return;
    originalStops = Object.create(null);
    nextPark.stops.forEach(function (stop) {
      originalStops[stop.id] = {
        name: stop.name, tag: stop.tag, short: stop.short,
        body: stop.body, tip: stop.tip
      };
    });
    originalCargo = {};
    Object.keys(nextPark.cargoLabels).forEach(function (key) {
      originalCargo[key] = nextPark.cargoLabels[key];
    });
  }

  function applyPark() {
    if (!park || !originalStops) return;
    var catalog = catalogs[locale] || catalogs.en;
    var stops = catalog.stops || {};
    var cargo = catalog.cargo || {};

    park.stops.forEach(function (stop) {
      var base = originalStops[stop.id];
      var translated = stops[stop.id] || {};
      ['name', 'tag', 'short', 'body', 'tip'].forEach(function (field) {
        stop[field] = translated[field] != null ? translated[field] : base[field];
      });
    });
    Object.keys(originalCargo).forEach(function (key) {
      park.cargoLabels[key] = cargo[key] != null ? cargo[key] : originalCargo[key];
    });
    if (park.updateReadingTimes) park.updateReadingTimes();
  }

  function applyDom() {
    document.documentElement.lang = locale;
    document.title = t('meta.title');
    var description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', t('meta.description'));

    document.querySelectorAll('[data-i18n]').forEach(function (node) {
      node.textContent = t(node.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (node) {
      node.innerHTML = t(node.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (node) {
      node.setAttribute('title', t(node.getAttribute('data-i18n-title')));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (node) {
      node.setAttribute('aria-label', t(node.getAttribute('data-i18n-aria-label')));
    });

    var select = document.getElementById('language-select');
    if (select) select.value = locale;
  }

  function setLocale(next) {
    next = resolve(next);
    if (next === locale) return;
    locale = next;
    try { if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, locale); }
    catch (e) { /* file:// and privacy modes may block storage */ }
    applyDom();
    applyPark();
    listeners.slice().forEach(function (listener) { listener(locale); });
  }

  function init(nextPark) {
    locale = resolve(locale);
    park = nextPark;
    snapshotPark(park);
    applyDom();
    applyPark();
    var select = document.getElementById('language-select');
    if (select) select.addEventListener('change', function () { setLocale(select.value); });
  }

  global.I18n = {
    register: register,
    init: init,
    t: t,
    catalogKeys: function (code, section) {
      var catalog = catalogs[normalise(code)];
      return catalog ? Object.keys(catalog[section] || {}) : [];
    },
    getLocale: function () { return locale; },
    setLocale: setLocale,
    onChange: function (listener) {
      listeners.push(listener);
      return function () {
        var index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    }
  };
})(window);
