// Run: node --unhandled-rejections=strict tests/frontend_regression.js
// Execute the actual application scripts with deterministic DOM, audio and timer doubles.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const path = require('path');
const root = path.resolve(__dirname, '..');
const load = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
const config = {
  scenes: load('scenes.json').scenes,
  keywords: load('keywords.json').keywords,
  ages: load('guides.json').ages,
  ceremony: load('ceremony.json').ceremony,
  bridge: load('bridge.json'),
};
const response = data => ({ok: true, json: async () => data});
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
function createRuntime() {
  const elements = new Map(), timers = [], requests = [], utterances = [], revoked = [];
  class Element {
    constructor(id = '') {
      this.id = id; this.children = []; this.handlers = {}; this.style = {}; this.dataset = {};
      this.textContent = ''; this.value = ''; this.disabled = false;
      const classes = new Set();
      this.classList = {
        add: (...cs) => cs.forEach(c => classes.add(c)),
        remove: (...cs) => cs.forEach(c => classes.delete(c)),
        contains: c => classes.has(c),
        toggle: (c, force) => {
          const on = force === undefined ? !classes.has(c) : force;
          if (on) classes.add(c); else classes.delete(c);
          return on;
        },
      };
    }
    set innerHTML(value) { this._innerHTML = value; this.children = []; }
    get innerHTML() { return this._innerHTML || ''; }
    appendChild(el) { this.children.push(el); }
    addEventListener(name, fn) { (this.handlers[name] ||= []).push(fn); }
    setAttribute(name, value) { this[name] = value; }
    getAttribute(name) { return this[name] || null; }
  }
  function get(id) {
    if (!elements.has(id)) elements.set(id, new Element(id));
    return elements.get(id);
  }
  ['explain-box', 'quiz-modal', 'ceremony-modal', 'bridge-modal', 'btn-stop'].forEach(id => get(id).classList.add('hidden'));
  const context = {
    console, Uint8Array, ArrayBuffer, DataView, Blob,
    navigator: {}, location: {href: 'http://localhost/', host: 'localhost'},
    document: {
      readyState: 'loading', getElementById: get, createElement: () => new Element(),
      createElementNS: () => new Element(), querySelectorAll: () => [], addEventListener() {},
    },
    window: {speechSynthesis: {cancel() {}, getVoices() { return []; }, speak(u) { utterances.push(u); }}},
    SpeechSynthesisUtterance: function(text) { this.text = text; },
    setTimeout(fn, ms) { const timer = {fn, ms, active: true}; timers.push(timer); return timer; },
    clearTimeout(timer) { if (timer) timer.active = false; },
    fetch: async (url, options) => {
      requests.push({url, body: options ? JSON.parse(options.body) : null});
      return response(url === '/api/guide' ? {text: 'NEW GUIDE', mode: 'local'} : {mode: 'browser'});
    },
    URL: {createObjectURL: () => 'blob:test', revokeObjectURL(url) { revoked.push(url); }},
    atob: value => Buffer.from(value, 'base64').toString('binary'),
  };
  // Expose entry points inside the IIFE only in this isolated test runtime.
  let source = fs.readFileSync(path.join(root, 'static/js/app.js'), 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, `globalThis.testApp = {
    state, explainKeyword, enterScene, showMap, bindControls, startQuiz, answerQuiz,
    refreshOpenContent, closeModal, speakText, stopSpeak, loadGuide,
    setViewer(v) { viewer = v; }, getQuiz() { return quizState; },
    setArtifactViewer(v) { artifactViewer = v; }
  };\n})();`);
  vm.createContext(context);
  vm.runInContext(source, context);
  const api = context.testApp;
  api.state.config = config;
  api.state.sceneId = config.scenes[0].id;
  api.setViewer({setPano() {}, setHotspots() {}, faceYaw() {}, resetInteraction() {}});
  return {api, context, get, timers, requests, utterances, revoked};
}

async function explanations() {
  for (const action of ['close', 'scene', 'map']) {
    const r = createRuntime(), pending = deferred();
    r.api.bindControls();
    const originalFetch = r.context.fetch;
    r.context.fetch = (url, options) => url === '/api/explain' ? pending.promise : originalFetch(url, options);
    const task = r.api.explainKeyword('huangdi');
    if (action === 'close') r.get('btn-close-explain').handlers.click[0]();
    else if (action === 'scene') r.api.enterScene(config.scenes[1].id);
    else r.api.showMap();
    pending.resolve(response({text: 'STALE EXPLANATION'}));
    await task;
    assert.equal(r.get('explain-box').classList.contains('hidden'), true, action);
    assert.equal(r.api.state.activeKeyword, null, action);
    assert.notEqual(r.get('explain-text').textContent, 'STALE EXPLANATION', action);
    assert.equal(r.requests.some(x => x.url === '/api/tts'), false, action);
  }
  const r = createRuntime(), first = deferred(), second = deferred();
  r.context.fetch = (url, options) => {
    if (url === '/api/explain') return JSON.parse(options.body).keyword === 'huangdi' ? first.promise : second.promise;
    return Promise.resolve(response({mode: 'browser'}));
  };
  const oldTask = r.api.explainKeyword('huangdi');
  const newTask = r.api.explainKeyword('bianzhong');
  second.resolve(response({text: 'CURRENT'})); await newTask;
  first.resolve(response({text: 'OLD'})); await oldTask;
  assert.equal(r.get('explain-text').textContent, 'CURRENT');
  assert.equal(r.utterances.length, 1);
  assert.equal(r.utterances[0].text, 'CURRENT');
}

async function guides() {
  const r = createRuntime(), pending = deferred();
  r.api.state.guideText = 'PREVIOUS SCENE';
  r.context.fetch = () => pending.promise;
  const task = r.api.loadGuide();
  assert.equal(r.api.state.guideText, '');
  r.api.showMap();
  pending.resolve(response({text: 'STALE GUIDE', mode: 'local'}));
  await task;
  assert.equal(r.api.state.guideText, '');
  assert.notEqual(r.get('guide-text').textContent, 'STALE GUIDE');
}

function panoramas() {
  const images = [], uploads = [], loading = [], errors = [];
  const context = {window: {}, Image: function() { images.push(this); }, console};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'static/js/panorama.js'), 'utf8'), context);
  const viewer = Object.create(context.window.PanoramaViewer.prototype);
  viewer.gl = {bindTexture() {}, texImage2D(...args) { uploads.push(args.at(-1).src); }};
  viewer.onLoadingChange = value => loading.push(value);
  viewer.onError = () => errors.push(true);
  viewer.setPano('A.jpg'); viewer.setPano('B.jpg');
  images[1].onload(); images[0].onload(); images[0].onerror();
  assert.equal(viewer._image.src, 'B.jpg');
  assert.deepEqual(uploads, ['B.jpg']);
  assert.deepEqual(loading, [true, true, false]);
  assert.equal(errors.length, 0);
  viewer.setPano('missing.jpg'); images[2].onerror();
  assert.equal(errors.length, 1);
  assert.equal(loading.at(-1), false);
}

function quizzes() {
  const r = createRuntime();
  r.api.startQuiz(); r.api.answerQuiz(r.api.getQuiz().qs[0].correct);
  const oldTimer = r.timers.find(t => t.ms === 750 && t.active);
  r.api.closeModal('quiz-modal');
  assert.equal(oldTimer.active, false);
  assert.equal(r.api.getQuiz(), null);
  r.api.startQuiz(); oldTimer.fn();
  assert.equal(r.api.getQuiz().idx, 0);
  assert.equal(r.get('quiz-progress').textContent, '1 / 5');
  for (let index = 0; index < 5; index++) {
    const correct = r.api.getQuiz().qs[index].correct;
    r.api.answerQuiz(correct);
    r.api.state.lang = index % 2 ? 'ja' : 'en';
    r.api.refreshOpenContent();
    assert.equal(r.get('quiz-options').children.every(b => b.disabled), true);
    r.api.answerQuiz(correct);
    assert.equal(r.api.getQuiz().score, index + 1);
    const timers = r.timers.filter(t => t.ms === 750 && t.active);
    assert.equal(timers.length, 1);
    timers[0].active = false; timers[0].fn();
  }
  assert.equal(r.api.getQuiz().idx, 5);
  assert.equal(r.api.getQuiz().score, 5);
  assert.equal(r.get('quiz-options').children[0].innerHTML.includes('5 / 5'), true);
}

async function audioFailures() {
  const r = createRuntime();
  r.context.Audio = function() {
    this.pause = () => {};
    this.play = () => Promise.reject(Object.assign(new Error('blocked'), {name: 'NotAllowedError'}));
  };
  r.context.fetch = async () => response({mode: 'audio', mime: 'audio/L16;rate=16000', audio: 'AAAAAA=='});
  await r.api.speakText('TEST', 'zh'); await flush();
  assert.equal(r.utterances.length, 1, 'rejected audio falls back to browser speech');
  assert.equal(r.revoked.length, 1);
  r.utterances[0].onerror({error: 'voice-unavailable'});
  assert.equal(r.get('btn-stop').classList.contains('hidden'), true);
  assert.equal(r.get('btn-speak').classList.contains('hidden'), false);
  assert.equal(r.get('mascot').classList.contains('speaking'), false);
  assert.equal(r.get('toast').textContent.includes('语音播放失败'), true);
  for (const language of ['zh', 'en', 'ja', 'ko']) {
    const noSpeech = createRuntime();
    delete noSpeech.context.window.speechSynthesis;
    noSpeech.api.state.lang = language;
    await noSpeech.api.speakText('TEST', language);
    assert.equal(noSpeech.get('btn-stop').classList.contains('hidden'), true);
    assert.equal(typeof noSpeech.get('toast').textContent, 'string');
    assert.ok(noSpeech.get('toast').textContent.length > 0);
  }
}

async function audioCancellationAndCompletion() {
  const r = createRuntime(), playing = deferred();
  r.context.Audio = function() { this.pause = () => {}; this.play = () => playing.promise; };
  r.context.fetch = async () => response({mode: 'audio', audio: 'AAAAAA=='});
  await r.api.speakText('TEST', 'zh');
  r.api.stopSpeak(); playing.reject(new Error('late failure')); await flush();
  assert.equal(r.utterances.length, 0, 'cancelled playback must not start a fallback');
  assert.equal(r.revoked.length, 1);
  assert.equal(r.get('btn-stop').classList.contains('hidden'), true);

  const completed = createRuntime(); let audio;
  completed.context.Audio = function() { audio = this; this.pause = () => {}; this.play = () => Promise.resolve(); };
  completed.context.fetch = async () => response({mode: 'audio', audio: 'AAAAAA=='});
  await completed.api.speakText('TEST', 'zh');
  audio.onended(); completed.api.stopSpeak();
  assert.equal(completed.revoked.length, 1, 'audio URL is released exactly once');
  assert.equal(completed.get('btn-stop').classList.contains('hidden'), true);

  const pending = createRuntime(), request = deferred();
  pending.context.fetch = () => request.promise;
  const task = pending.api.speakText('LATE', 'zh'); pending.api.stopSpeak();
  request.resolve(response({mode: 'browser'})); await task;
  assert.equal(pending.utterances.length, 0);

  const browser = createRuntime();
  await browser.api.speakText('OLD', 'zh');
  const oldSpeech = browser.utterances[0];
  await browser.api.speakText('NEW', 'zh');
  oldSpeech.onerror({error: 'cancelled'});
  assert.equal(browser.get('btn-stop').classList.contains('hidden'), false);
  browser.utterances[1].onend();
  assert.equal(browser.get('btn-stop').classList.contains('hidden'), true);
}

function viewerLifecycle() {
  const r = createRuntime();
  let panoResets = 0, artifactResets = 0;
  r.api.setViewer({resetInteraction() { panoResets++; }});
  r.api.setArtifactViewer({resetInteraction() { artifactResets++; }});
  r.api.showMap();
  assert.equal(panoResets, 1);
  r.api.closeModal('artifact-modal');
  assert.equal(artifactResets, 1);
  r.api.closeModal('bridge-modal');
  assert.equal(artifactResets, 1);
}

(async () => {
  for (const test of [explanations, guides, panoramas, quizzes, audioFailures, audioCancellationAndCompletion,
    viewerLifecycle, ...require('./drag_regression')]) {
    await test(); console.log('PASS ' + test.name);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
