/*
 * 云上仙都 · 前端主逻辑
 * 负责: 场景/年龄/语言切换、AI 讲解词加载、关键词溯源、语音播报(TTS)。
 */
(function () {
  'use strict';

  var I18N = {
    zh: {
      subtitle: '非遗数字化传承 · VR全景云游览',
      ageLabel: '讲解版本',
      loadingGuide: '正在生成讲解词…',
      guideFail: '讲解词加载失败，请确认后端服务已启动。',
      play: '🔊 播放讲解',
      stop: '■ 停止',
      kwTitle: '关键词溯源 · 点击释义',
      playExplain: '🔊 语音释义',
      close: '关闭',
      localMode: '本地模式',
      llmMode: '大模型模式',
      hint: '拖动 / 滑动旋转视角 · 点击闪光图标探索非遗',
      loading: '全景加载中…',
    },
    en: {
      subtitle: 'ICH Digital Inheritance · VR Panoramic Tour',
      ageLabel: 'Guide Edition',
      loadingGuide: 'Generating guide…',
      guideFail: 'Failed to load guide. Please start the backend first.',
      play: '🔊 Play Guide',
      stop: '■ Stop',
      kwTitle: 'Keyword Traceability · Tap to explain',
      playExplain: '🔊 Speak',
      close: 'Close',
      localMode: 'Local Mode',
      llmMode: 'LLM Mode',
      hint: 'Drag / swipe to rotate · Tap glowing icons to explore ICH',
      loading: 'Loading panorama…',
    },
  };

  var state = {
    config: null,
    sceneId: null,
    age: 'middle',
    lang: 'zh',
    guideText: '',
    guideMode: 'local',
    activeKeyword: null,
  };

  var viewer = null;
  var voices = [];

  function $(id) { return document.getElementById(id); }
  function t(key) { return I18N[state.lang][key]; }
  function setText(id, txt) { $(id).textContent = txt; }

  function currentScene() {
    return state.config.scenes.find(function (s) { return s.id === state.sceneId; });
  }

  /* ---------------- 语音 (浏览器原生 TTS 兜底) ---------------- */
  function loadVoices() {
    if ('speechSynthesis' in window) voices = window.speechSynthesis.getVoices();
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }

  function browserSpeak(text, lang) {
    if (!('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    u.rate = 0.95;
    var target = lang === 'zh' ? 'zh' : 'en';
    var v = voices.find(function (vv) {
      return vv.lang && vv.lang.toLowerCase().indexOf(target) === 0;
    });
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
    return true;
  }

  function stopSpeak() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  // 将 base64 音频(若为 PCM16 则包装成 WAV)解码并播放 —— 讯飞模式使用
  function playAudioBase64(b64, mime) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    if (mime && mime.indexOf('L16') !== -1) {
      bytes = wrapWav(bytes, 16000);
      mime = 'audio/wav';
    }
    var blob = new Blob([bytes], { type: mime || 'audio/wav' });
    var url = URL.createObjectURL(blob);
    var a = new Audio(url);
    a.onended = function () { URL.revokeObjectURL(url); };
    a.play();
  }

  function wrapWav(pcm, sampleRate) {
    var header = new ArrayBuffer(44);
    var dv = new DataView(header);
    function wstr(off, s) { for (var i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); }
    wstr(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length, true); wstr(8, 'WAVE');
    wstr(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true); dv.setUint32(24, sampleRate, true);
    dv.setUint32(28, sampleRate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    wstr(36, 'data'); dv.setUint32(40, pcm.length, true);
    var out = new Uint8Array(44 + pcm.length);
    out.set(new Uint8Array(header), 0);
    out.set(pcm, 44);
    return out;
  }

  async function speakText(text, lang) {
    try {
      var res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, lang: lang }),
      });
      var data = await res.json();
      if (data.mode === 'audio' && data.audio) {
        playAudioBase64(data.audio, data.mime);
      } else {
        browserSpeak(data.text || text, lang);
      }
    } catch (e) {
      browserSpeak(text, lang);
    }
  }

  /* ---------------- 数据加载 ---------------- */
  function postJSON(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async function loadGuide() {
    var scene = currentScene();
    setText('guide-text', t('loadingGuide'));
    try {
      var res = await postJSON('/api/guide', {
        scene_id: scene.id, age: state.age, lang: state.lang,
      });
      var data = await res.json();
      state.guideText = data.text;
      state.guideMode = data.mode;
      setText('guide-text', data.text);
      updateModeBadge(data.mode);
    } catch (e) {
      setText('guide-text', t('guideFail'));
    }
  }

  function updateModeBadge(mode) {
    var badge = $('panel-mode');
    badge.textContent = mode === 'llm' ? t('llmMode') : t('localMode');
    badge.classList.toggle('llm', mode === 'llm');
  }

  async function explainKeyword(keyword) {
    var kw = state.config.keywords[keyword];
    if (!kw) return;
    state.activeKeyword = keyword;
    setText('explain-term', kw.term[state.lang]);
    setText('explain-meta', kw.pinyin + ' · ' + kw.category);
    setText('explain-text', '…');
    $('explain-box').classList.remove('hidden');
    highlightChip(keyword);
    try {
      var res = await postJSON('/api/explain', { keyword: keyword, lang: state.lang });
      var data = await res.json();
      setText('explain-text', data.text);
      speakText(data.text, state.lang);
    } catch (e) {
      setText('explain-text', kw.definition[state.lang] + '\n\n' + kw.analogy[state.lang]);
    }
  }

  /* ---------------- 渲染 ---------------- */
  function renderTabs() {
    var nav = $('scene-tabs');
    nav.innerHTML = '';
    state.config.scenes.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'tab' + (s.id === state.sceneId ? ' active' : '');
      b.textContent = s.name[state.lang];
      b.addEventListener('click', function () { switchScene(s.id); });
      nav.appendChild(b);
    });
  }

  function renderAgeSelector() {
    var seg = $('age-selector');
    seg.innerHTML = '';
    Object.keys(state.config.ages).forEach(function (key) {
      var a = state.config.ages[key];
      var b = document.createElement('button');
      b.className = key === state.age ? 'active' : '';
      b.textContent = a.label[state.lang];
      b.addEventListener('click', function () {
        state.age = key;
        renderAgeSelector();
        loadGuide();
      });
      seg.appendChild(b);
    });
  }

  function renderChips() {
    var box = $('keyword-chips');
    box.innerHTML = '';
    var scene = currentScene();
    var seen = {};
    scene.hotspots.forEach(function (h) {
      if (seen[h.keyword]) return;
      seen[h.keyword] = true;
      var kw = state.config.keywords[h.keyword];
      if (!kw) return;
      var c = document.createElement('button');
      c.className = 'chip';
      c.dataset.keyword = h.keyword;
      c.textContent = kw.term[state.lang];
      c.addEventListener('click', function () { explainKeyword(h.keyword); });
      box.appendChild(c);
    });
  }

  function highlightChip(keyword) {
    var chips = $('keyword-chips').children;
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('active', chips[i].dataset.keyword === keyword);
    }
  }

  function applyLang() {
    setText('app-subtitle', t('subtitle'));
    setText('age-label', t('ageLabel'));
    setText('kw-title', t('kwTitle'));
    setText('btn-speak', t('play'));
    setText('btn-stop', t('stop'));
    setText('btn-speak-explain', t('playExplain'));
    setText('btn-close-explain', t('close'));
    setText('hint', t('hint'));
    setText('loading-text', t('loading'));
    $('lang-toggle').textContent = state.lang === 'zh' ? '中 / EN' : 'EN / 中';
    renderTabs();
    renderAgeSelector();
    renderChips();
    refreshHotspots();
    updateModeBadge(state.guideMode);
    if (state.activeKeyword) {
      var kw = state.config.keywords[state.activeKeyword];
      setText('explain-term', kw.term[state.lang]);
    }
    setText('panel-scene', currentScene().name[state.lang]);
    loadGuide();
  }

  function refreshHotspots() {
    var scene = currentScene();
    viewer.setHotspots(scene.hotspots.map(function (h) {
      return {
        id: h.id,
        keyword: h.keyword,
        label: state.config.keywords[h.keyword].term[state.lang],
        yaw: h.yaw,
        pitch: h.pitch,
      };
    }));
  }

  function switchScene(id) {
    state.sceneId = id;
    state.activeKeyword = null;
    $('explain-box').classList.add('hidden');
    highlightChip('');
    renderTabs();
    renderChips();
    setText('panel-scene', currentScene().name[state.lang]);
    viewer.setPano(currentScene().panorama);
    refreshHotspots();
    stopSpeak();
    loadGuide();
  }

  /* ---------------- 初始化 ---------------- */
  function initViewer() {
    try {
      viewer = new PanoramaViewer($('pano-canvas'), $('hotspot-layer'));
    } catch (e) {
      $('webgl-fallback').classList.remove('hidden');
      return false;
    }
    viewer.onLoadingChange = function (loading) {
      $('loading').classList.toggle('hidden', !loading);
    };
    viewer.onHotspotClick = function (h) {
      explainKeyword(h.keyword);
    };
    return true;
  }

  function bindControls() {
    $('btn-speak').addEventListener('click', function () {
      if (state.guideText) speakText(state.guideText, state.lang);
    });
    $('btn-stop').addEventListener('click', stopSpeak);
    $('btn-speak-explain').addEventListener('click', function () {
      var txt = $('explain-text').textContent;
      if (txt) speakText(txt, state.lang);
    });
    $('btn-close-explain').addEventListener('click', function () {
      $('explain-box').classList.add('hidden');
      stopSpeak();
    });
    $('lang-toggle').addEventListener('click', function () {
      state.lang = state.lang === 'zh' ? 'en' : 'zh';
      applyLang();
    });
    $('panel-close').addEventListener('click', function () {
      $('guide-panel').classList.toggle('collapsed');
    });

    // 提示几秒后淡出
    setTimeout(function () {
      var hint = $('hint');
      hint.style.opacity = '0';
      setTimeout(function () { hint.remove(); }, 900);
    }, 6000);
  }

  async function main() {
    bindControls();
    if (!initViewer()) return;

    try {
      var res = await fetch('/api/config');
      state.config = await res.json();
    } catch (e) {
      setText('guide-text', '配置加载失败，请确认后端服务已启动 (python app.py)。');
      return;
    }

    state.sceneId = state.config.scenes[0].id;
    state.age = state.config.defaults.age;
    state.lang = state.config.defaults.lang;

    applyLang();
    setText('panel-scene', currentScene().name[state.lang]);
    viewer.setPano(currentScene().panorama);
    refreshHotspots();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
