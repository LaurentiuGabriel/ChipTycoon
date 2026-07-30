/* ChipTycoon - a very small idle factory game.
   Buy buildings in order, watch wafers turn into money. */

(function () {
  'use strict';

  var SAVE_KEY = 'chiptycoon.save.v1';

  var BUILDINGS = [
    { id: 'pit',     name: 'Sand Pit',        desc: 'Digs quartz sand',              base: 15,      rate: 0.1 },
    { id: 'furnace', name: 'Furnace',         desc: 'Cooks sand into silicon',       base: 100,     rate: 0.6 },
    { id: 'purify',  name: 'Purifier',        desc: 'Cleans it to nine nines',       base: 700,     rate: 3.5 },
    { id: 'puller',  name: 'Crystal Puller',  desc: 'Grows one giant crystal',       base: 4500,    rate: 20 },
    { id: 'saw',     name: 'Wire Saw',        desc: 'Slices ingots into wafers',     base: 26000,   rate: 110 },
    { id: 'polish',  name: 'Polisher',        desc: 'Makes wafers mirror flat',      base: 150000,  rate: 620 },
    { id: 'litho',   name: 'Lithography Bay', desc: 'Prints the pattern with light', base: 900000,  rate: 3600 },
    { id: 'etch',    name: 'Etch Bay',        desc: 'Carves along the picture',      base: 5200000, rate: 21000 },
    { id: 'pack',    name: 'Packaging Line',  desc: 'Puts chips in their cases',     base: 31000000, rate: 125000 },
    { id: 'ship',    name: 'Shipping Gate',   desc: 'Sends chips to customers',      base: 190000000, rate: 750000 }
  ];

  var state = { money: 0, clicks: 0, owned: {}, since: Date.now() };

  var moneyEl, rateEl, clickEl, shopEl, logEl;

  /* ---------- helpers ---------- */

  function fmt(n) {
    if (n < 1000) return n.toFixed(n < 10 && n % 1 !== 0 ? 1 : 0);
    var units = ['k', 'M', 'B', 'T', 'Qa'];
    var i = -1;
    while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
    return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + units[i];
  }

  function count(id) { return state.owned[id] || 0; }

  function cost(b) { return Math.ceil(b.base * Math.pow(1.15, count(b.id))); }

  function income() {
    var total = 0;
    BUILDINGS.forEach(function (b) { total += count(b.id) * b.rate; });
    return total;
  }

  function clickValue() {
    return 1 + Math.floor(income() * 0.05);
  }

  function log(msg) {
    if (!logEl) return;
    var d = document.createElement('div');
    d.textContent = '> ' + msg;
    logEl.insertBefore(d, logEl.firstChild);
    while (logEl.childNodes.length > 40) logEl.removeChild(logEl.lastChild);
  }

  /* ---------- rendering ---------- */

  function buildShop() {
    shopEl.innerHTML = '';
    BUILDINGS.forEach(function (b, idx) {
      var btn = document.createElement('button');
      btn.className = 'buy';
      btn.type = 'button';
      btn.dataset.id = b.id;
      btn.addEventListener('click', function () { buy(b); });
      shopEl.appendChild(btn);
      b._el = btn;
      b._idx = idx;
    });
    refreshShop();
  }

  function unlocked(b) {
    if (b._idx === 0) return true;
    var prev = BUILDINGS[b._idx - 1];
    return count(prev.id) > 0 || state.money >= cost(b) * 0.35;
  }

  function refreshShop() {
    BUILDINGS.forEach(function (b) {
      var el = b._el;
      if (!el) return;
      if (!unlocked(b)) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      var c = cost(b);
      var n = count(b.id);
      el.disabled = state.money < c;
      el.innerHTML =
        '<span class="price">' + fmt(c) + ' cr</span>' +
        '<b>' + b.name + (n ? ' <span style="color:#2f6b2a">x' + n + '</span>' : '') + '</b>' +
        '<small>' + b.desc + ' &middot; +' + fmt(b.rate) + ' per second</small>';
    });
  }

  function refreshStats() {
    moneyEl.textContent = fmt(state.money);
    rateEl.textContent = fmt(income());
    clickEl.textContent = fmt(clickValue());
  }

  /* ---------- actions ---------- */

  function buy(b) {
    var c = cost(b);
    if (state.money < c) return;
    state.money -= c;
    state.owned[b.id] = count(b.id) + 1;
    log('Built ' + b.name + ' number ' + count(b.id) + ' for ' + fmt(c) + ' credits.');
    if (count(b.id) === 1) {
      var next = BUILDINGS[b._idx + 1];
      if (next) log('New building available: ' + next.name + '.');
    }
    refreshStats();
    refreshShop();
    save();
  }

  function dig() {
    state.clicks++;
    state.money += clickValue();
    refreshStats();
    refreshShop();
    if (state.clicks === 1) log('You dug your first bucket of sand. Everything starts here.');
    if (state.clicks === 25) log('25 buckets. Consider buying a Sand Pit so the machines do it for you.');
  }

  /* ---------- save and load ---------- */

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      var s = JSON.parse(raw);
      if (s && typeof s.money === 'number') {
        state.money = s.money;
        state.clicks = s.clicks || 0;
        state.owned = s.owned || {};
        return true;
      }
    } catch (e) { /* corrupt save, start fresh */ }
    return false;
  }

  function reset() {
    if (!window.confirm('Bulldoze the whole park and start again from an empty field?')) return;
    state = { money: 0, clicks: 0, owned: {}, since: Date.now() };
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    logEl.innerHTML = '';
    log('Park bulldozed. Back to plain sand.');
    refreshStats();
    refreshShop();
  }

  /* ---------- boot ---------- */

  function start() {
    moneyEl = document.getElementById('money');
    rateEl = document.getElementById('rate');
    clickEl = document.getElementById('perclick');
    shopEl = document.getElementById('shop');
    logEl = document.getElementById('log');

    document.getElementById('dig').addEventListener('click', dig);
    document.getElementById('reset').addEventListener('click', reset);

    var restored = load();
    buildShop();
    refreshStats();
    log(restored ? 'Welcome back, boss. Your park is where you left it.'
                 : 'Welcome to your empty field. Click the big button to dig some sand.');

    var last = Date.now();
    setInterval(function () {
      var now = Date.now();
      var dt = Math.min(2, (now - last) / 1000);
      last = now;
      if (income() > 0) {
        state.money += income() * dt;
        refreshStats();
        refreshShop();
      }
    }, 200);

    setInterval(save, 5000);
    window.addEventListener('beforeunload', save);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
