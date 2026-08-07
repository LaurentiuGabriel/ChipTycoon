/* tour.js: the state machine that drives one wafer through the whole park.
 *
 * A "batch" is one complete run: in at the sand pit, round the lithography ring
 * once per layer, out at the shipping gate, then the empty cart drives back for
 * the next one. The cart's cargo is the wafer, and it changes at every stop. */
(function (global) {
  'use strict';

  var Park = global.Park;

  var BASE_SPEED = 5.4;          // grid units per second at 1x

  /* Which stops the viewer has already had explained. This deliberately
     survives a batch change: nobody wants to read stop 3 twice. */
  var tour = { seen: Object.create(null), done: false };

  /* What the cart is carrying after each stop fires. */
  var CARGO = {
    sand: 'sand', furnace: 'lump', purify: 'poly', crystal: 'ingot',
    saw: 'wafers', polish: 'mirror', design: 'blueprint', mask: 'withmask',
    cleanroom: 'pod', layer: 'coated', resist: 'resist', litho: 'exposed',
    etch: 'etched', dope: 'doped', wiring: 'wired', loopct: 'stack',
    test: 'tested', dice: 'dies', pack: 'packaged', ship: 'boxed',
    newbatch: 'empty'
  };

  var state = {
    running: true,
    paused: false,
    speed: 1,
    stepMode: false,

    stage: null,               // the stop currently being explained
    stageT: 0,
    cargo: 'empty',
    layers: 0,          // finished layers on the wafer, drawn as a growing stack
    lap: 1,
    laps: 4,                   // laps actually driven; a real chip runs ~60
    layersReal: 60,
    batch: 1,

    fastForward: false,
    tourDone: false,
    reading: false,
    dwellLeft: 0,
    dwellTotal: 0,
    seenCount: 0,
    flash: 0                   // brief highlight when a stop fires
  };

  var cart = { routeName: 'intake', dist: 0, dwell: 0, stationIdx: 0 };

  var listeners = [];
  function emit(name, payload) {
    for (var i = 0; i < listeners.length; i++) listeners[i](name, payload);
  }

  /* ---- lifecycle --------------------------------------------------------- */

  function startBatch() {
    cart.routeName = 'intake';
    cart.dist = 0;
    cart.stationIdx = 0;
    cart.dwell = 0;
    state.lap = 1;
    state.layers = 0;
    state.cargo = 'empty';
    state.stage = null;
  }

  function reset(replay) {
    if (replay) { tour.seen = Object.create(null); tour.done = false; }
    state.batch = 1;
    state.tourDone = tour.done;
    state.reading = false;
    state.dwellLeft = 0;
    state.dwellTotal = 0;
    state.fastForward = false;
    state.flash = 0;
    countSeen();
    startBatch();
    emit('reset');
  }

  function countSeen() {
    var n = 0;
    Park.stops.forEach(function (s) { if (tour.seen[s.id]) n++; });
    state.seenCount = n;
  }

  /* ---- what happens at each stop ----------------------------------------- */

  function fire(st) {
    state.stage = st.id;
    state.stageT = 0;
    state.flash = 1;
    if (CARGO[st.id]) state.cargo = CARGO[st.id];

    if (st.id === 'loopct') {
      /* One lap of the ring is one layer. The first lap is walked at full
         detail; the rest are the same road with a different mask, so they run
         fast, exactly as a real fab repeats the same tools. */
      state.lap++;
      state.layers = Math.min(state.laps, state.layers + 1);
      if (state.lap > state.laps) {
        cart.routeName = 'exit';
        cart.dist = 0;
        cart.stationIdx = 0;
        state.fastForward = false;
        state.lap = state.laps;
      } else {
        state.fastForward = true;
      }
    }
    if (st.id === 'ship') {
      /* one full pass has now explained every stop */
      tour.done = true;
      state.tourDone = true;
    }
    if (st.id === 'newbatch') state.batch++;
    emit('stage', st.id);
  }

  /* ---- pacing ------------------------------------------------------------ */

  /* Once every stop has been explained there is nothing new to read, so the
     park switches from a readable pace to a watchable one. */
  function travelBoost() {
    return (state.fastForward ? 3.4 : 1) * (state.tourDone ? 2.6 : 1);
  }
  function dwellBoost() {
    return (state.fastForward ? 3.4 : 1) * (state.tourDone ? 1.5 : 1);
  }

  function advanceRoute() {
    if (cart.routeName === 'intake') {
      cart.routeName = 'loop';
      cart.dist = 0;
      cart.stationIdx = 0;
    } else if (cart.routeName === 'loop') {
      cart.dist = 0;
      cart.stationIdx = 0;
    } else if (cart.routeName === 'exit') {
      cart.routeName = 'ret';
      cart.dist = 0;
      cart.stationIdx = 0;
    } else if (cart.routeName === 'ret') {
      startBatch();
    }
  }

  function update(dt) {
    state.stageT += dt;
    state.flash = Math.max(0, state.flash - dt * 1.6);
    if (!state.running || state.paused) return;

    if (cart.dwell > 0) {
      /* A stop is measured in reading seconds, so only the speed slider
         scales it. The travel boosts must never cut a first read short. */
      cart.dwell -= dt * state.speed;
      state.dwellLeft = Math.max(0, cart.dwell);
      if (cart.dwell <= 0) { state.reading = false; state.dwellTotal = 0; }
      return;
    }

    var route = Park.routes[cart.routeName];
    cart.dist += BASE_SPEED * dt * state.speed * travelBoost();

    var sts = Park.stations[cart.routeName];
    if (cart.stationIdx < sts.length) {
      var st = sts[cart.stationIdx];
      if (cart.dist >= st.dist) {
        cart.dist = st.dist;
        cart.stationIdx++;
        var firstTime = !tour.seen[st.id] && !!Park.stopById[st.id];
        fire(st);
        if (Park.stopById[st.id]) { tour.seen[st.id] = true; countSeen(); }
        cart.dwell = firstTime ? (st.read || 12) : st.dwell / dwellBoost();
        state.reading = firstTime;
        state.dwellTotal = cart.dwell;
        state.dwellLeft = cart.dwell;
        if (state.stepMode) { state.paused = true; state.stepMode = false; }
        return;
      }
    }

    if (cart.dist >= route.total) advanceRoute();
  }

  /* ---- queries used by the renderer and the camera ------------------------ */

  /* Routes are polylines with hard corners, so reading one directly snaps the
     cart to a new heading the instant it crosses a waypoint. Averaging a sample
     either side rounds the turn and swings the heading through it. */
  function smoothAt(route, d, look) {
    var a = route.at(Math.max(0, d - look));
    var m = route.at(d);
    var b = route.at(Math.min(route.total, d + look));
    var hx = b.x - a.x, hy = b.y - a.y;
    var len = Math.hypot(hx, hy) || 1;
    return {
      x: (a.x + 2 * m.x + b.x) / 4,
      y: (a.y + 2 * m.y + b.y) / 4,
      z: (a.z + 2 * m.z + b.z) / 4,
      dx: hx / len, dy: hy / len
    };
  }

  function cartPosition() {
    return smoothAt(Park.routes[cart.routeName], cart.dist, 0.9);
  }

  /* Where the cart is, as a fraction of the whole twenty stop journey. */
  function progress() {
    var order = Park.stops.map(function (s) { return s.id; });
    var i = order.indexOf(state.stage);
    return i < 0 ? 0 : (i + 1) / order.length;
  }

  function jumpTo(stopId) {
    var found = null;
    Object.keys(Park.stations).forEach(function (rname) {
      Park.stations[rname].forEach(function (st, i) {
        if (st.id === stopId && !found) found = { route: rname, idx: i, st: st };
      });
    });
    if (!found) return;
    cart.routeName = found.route;
    cart.dist = found.st.dist;
    cart.stationIdx = found.idx + 1;
    cart.dwell = 0;
    /* replaying a stop should read at full length again */
    tour.seen[stopId] = false;
    fire(found.st);
    tour.seen[stopId] = true;
    countSeen();
    cart.dwell = found.st.read || 12;
    state.reading = true;
    state.dwellTotal = cart.dwell;
    state.dwellLeft = cart.dwell;
    state.paused = false;
    state.fastForward = false;
  }

  global.Tour = {
    state: state,
    cart: cart,
    seen: function (id) { return !!tour.seen[id]; },
    update: update,
    cartPosition: cartPosition,
    progress: progress,
    jumpTo: jumpTo,
    reset: reset,
    on: function (fn) { listeners.push(fn); },
    play: function () { state.paused = false; state.running = true; },
    pause: function () { state.paused = true; },
    toggle: function () { if (state.paused) this.play(); else this.pause(); },
    step: function () {
      state.running = true;
      state.stepMode = true;
      state.paused = false;
      if (cart.dwell > 0) cart.dwell = 0;
    }
  };
})(window);
