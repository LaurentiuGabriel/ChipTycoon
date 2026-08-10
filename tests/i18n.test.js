/* Dependency-free checks for locale coverage, switching and park data safety. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const stored = new Map();

function fakeNode(attributes) {
  return {
    attributes: attributes || {},
    handlers: {},
    textContent: '',
    innerHTML: '',
    value: '',
    getAttribute(name) { return this.attributes[name]; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.handlers[name] = handler; }
  };
}

const meta = fakeNode();
const select = fakeNode();
const textNode = fakeNode({ 'data-i18n': 'actions.about' });
const htmlNode = fakeNode({ 'data-i18n-html': 'about.controlsKeyboard' });
const titleNode = fakeNode({ 'data-i18n-title': 'zoom.in' });
const ariaNode = fakeNode({ 'data-i18n-aria-label': 'actions.close' });

const document = {
  documentElement: { lang: 'en' },
  title: '',
  querySelector(selector) { return selector === 'meta[name="description"]' ? meta : null; },
  querySelectorAll(selector) {
    return {
      '[data-i18n]': [textNode],
      '[data-i18n-html]': [htmlNode],
      '[data-i18n-title]': [titleNode],
      '[data-i18n-aria-label]': [ariaNode]
    }[selector] || [];
  },
  getElementById(id) { return id === 'language-select' ? select : null; }
};

const context = vm.createContext({
  console,
  document,
  navigator: { languages: ['en-US'], language: 'en-US' },
  localStorage: {
    getItem(key) { return stored.has(key) ? stored.get(key) : null; },
    setItem(key, value) { stored.set(key, value); }
  }
});
context.window = context;
context.globalThis = context;

function load(relativePath) {
  const filename = path.join(root, relativePath);
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
}

load('js/i18n.js');
load('js/locales/zh-CN.js');
load('js/iso.js');
load('js/park.js');
load('js/tour.js');

const { I18n, Park, Tour } = context;
I18n.init(Park);

const englishKeys = I18n.catalogKeys('en', 'strings').sort();
const chineseKeys = I18n.catalogKeys('zh-CN', 'strings').sort();
assert.equal(englishKeys.length, 56);
assert.deepEqual(chineseKeys, englishKeys);

function placeholders(value) {
  return Array.from(String(value).matchAll(/\{([^}]+)\}/g), match => match[1]).sort();
}

const englishPlaceholders = {};
englishKeys.forEach(key => { englishPlaceholders[key] = placeholders(I18n.t(key)); });
I18n.setLocale('zh-CN');
englishKeys.forEach(key => {
  assert.deepEqual(placeholders(I18n.t(key)), englishPlaceholders[key], `${key} placeholders differ`);
});
I18n.setLocale('en');

const englishTitle = I18n.t('meta.title');
I18n.register('fr', { strings: { 'meta.title': 'Visite de la fabrique' } });
I18n.setLocale('fr');
assert.equal(I18n.t('meta.title'), 'Visite de la fabrique');
I18n.setLocale('en');
assert.equal(I18n.t('meta.title'), englishTitle);

assert.equal(Park.stops.length, 22);
assert.equal(Object.keys(Park.cargoLabels).length, 23);
assert.equal(document.documentElement.lang, 'en');
assert.equal(textNode.textContent, 'About');
assert.equal(titleNode.attributes.title, 'Zoom in');
assert.equal(ariaNode.attributes['aria-label'], 'Close');

const stopReferences = Park.stops.slice();
const cargoReference = Park.cargoLabels;
const englishStops = Park.stops.map(stop => ({
  id: stop.id,
  name: stop.name,
  tag: stop.tag,
  short: stop.short,
  body: stop.body,
  tip: stop.tip
}));
const englishCargo = { ...Park.cargoLabels };

I18n.setLocale('zh-CN');

assert.equal(document.documentElement.lang, 'zh-CN');
assert.equal(select.value, 'zh-CN');
assert.equal(textNode.textContent, '关于');
assert.equal(titleNode.attributes.title, '放大');
assert.equal(ariaNode.attributes['aria-label'], '关闭');
assert.match(htmlNode.innerHTML, /空格键/);
assert.equal(stored.get('chiptycoon-language'), 'zh-CN');
assert.equal(I18n.t('guide.stopCounter', { current: 2, total: 22 }), '第 2 站，共 22 站');

Park.stops.forEach((stop, index) => {
  assert.equal(stop, stopReferences[index], `${stop.id} object reference changed`);
  ['name', 'tag', 'short', 'body', 'tip'].forEach(field => {
    assert.notEqual(stop[field], englishStops[index][field], `${stop.id}.${field} was not translated`);
  });
});
assert.equal(Park.cargoLabels, cargoReference);
Object.keys(englishCargo).forEach(key => {
  assert.notEqual(Park.cargoLabels[key], englishCargo[key], `cargo.${key} was not translated`);
});

const translatedDurations = Object.values(Park.stations)
  .flat()
  .filter(station => Park.stopById[station.id])
  .map(station => station.read);
assert.ok(translatedDurations.every(seconds => seconds >= 10 && seconds <= 22));
assert.ok(translatedDurations.some(seconds => seconds > 10));

I18n.setLocale('en');
Park.stops.forEach((stop, index) => {
  ['name', 'tag', 'short', 'body', 'tip'].forEach(field => {
    assert.equal(stop[field], englishStops[index][field], `${stop.id}.${field} did not restore`);
  });
});
assert.deepEqual({ ...Park.cargoLabels }, englishCargo);

select.value = 'zh-CN';
select.handlers.change();
assert.equal(I18n.getLocale(), 'zh-CN');

Tour.jumpTo('sand');
assert.ok(Tour.cart.dwell > 0);
Tour.step();
I18n.setLocale('en');
Tour.refreshReadingTime();
assert.equal(Tour.cart.dwell, 0);
assert.equal(Tour.state.reading, false);
assert.equal(Tour.state.dwellLeft, 0);
assert.equal(Tour.state.dwellTotal, 0);

console.log('i18n tests passed');
