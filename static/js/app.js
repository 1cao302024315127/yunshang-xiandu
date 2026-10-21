/*
 * 云上仙都 · 前端主逻辑
 * 负责: 地图选景点、场景/年龄/语言切换、AI 讲解词加载、关键词溯源、语音播报(TTS)。
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
      map: '地图',
      mapSubtitle: '点击标记，选择要参观的景点',
      mapLegend: '仙都导览图 · 共 3 处景点',
      qaTitle: '💬 向 AI 导游提问',
      qaPlaceholder: '输入问题，如：祭祀和扫墓有何不同？',
      qaSend: '发送',
      quizBtn: '🎯 小测验',
      ceremonyBtn: '📜 祭典流程',
      quizTitle: '🎯 非遗知识小测验',
      quizCategoryAsk: '属于哪一类文化要素？',
      quizScore: '答对',
      quizAgain: '再来一次',
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
      map: 'Map',
      mapSubtitle: 'Tap a marker to choose an attraction',
      mapLegend: 'Xiandu Guide Map · 3 attractions',
      qaTitle: '💬 Ask the AI Guide',
      qaPlaceholder: 'Ask, e.g. What is a sacrificial rite?',
      qaSend: 'Send',
      quizBtn: '🎯 Quiz',
      ceremonyBtn: '📜 Ceremony',
      quizTitle: '🎯 ICH Knowledge Quiz',
      quizCategoryAsk: 'belongs to which category?',
      quizScore: 'Score',
      quizAgain: 'Try again',
    },
    ja: {
      subtitle: '無形文化遺産のデジタル継承 · VRパノラマツアー',
      ageLabel: 'ガイド版',
      loadingGuide: 'ガイドを生成中…',
      guideFail: 'ガイドの読み込みに失敗しました。バックエンドを起動してください。',
      play: '🔊 ガイドを再生',
      stop: '■ 停止',
      kwTitle: 'キーワード解説 · タップして解説',
      playExplain: '🔊 音声解説',
      close: '閉じる',
      localMode: 'ローカルモード',
      llmMode: 'AIモード',
      hint: 'ドラッグ/スワイプで回転 · 光るアイコンをタップ',
      loading: 'パノラマ読み込み中…',
      map: '地図',
      mapSubtitle: 'マーカーをタップして見学先を選択',
      mapLegend: '仙都ガイドマップ · 3つのスポット',
      qaTitle: '💬 AIガイドに質問',
      qaPlaceholder: '質問を入力（例：祭祀とは？）',
      qaSend: '送信',
      quizBtn: '🎯 クイズ',
      ceremonyBtn: '📜 祭典',
      quizTitle: '🎯 無形文化遺産クイズ',
      quizCategoryAsk: 'はどの分類ですか？',
      quizScore: '正解',
      quizAgain: 'もう一度',
    },
    ko: {
      subtitle: '무형문화유산 디지털 계승 · VR 파노라마 투어',
      ageLabel: '가이드 버전',
      loadingGuide: '가이드 생성 중…',
      guideFail: '가이드 로딩에 실패했습니다. 백엔드를 먼저 실행하세요.',
      play: '🔊 가이드 재생',
      stop: '■ 정지',
      kwTitle: '키워드 해설 · 탭하여 해설',
      playExplain: '🔊 음성 해설',
      close: '닫기',
      localMode: '로컬 모드',
      llmMode: 'AI 모드',
      hint: '드래그/스와이프로 회전 · 빛나는 아이콘 탭',
      loading: '파노라마 로딩 중…',
      map: '지도',
      mapSubtitle: '마커를 탭하여 관람할 곳 선택',
      mapLegend: '셴두 가이드 맵 · 3곳',
      qaTitle: '💬 AI 가이드에게 질문',
      qaPlaceholder: '질문 입력 (예: 제사란 무엇인가요?)',
      qaSend: '전송',
      quizBtn: '🎯 퀴즈',
      ceremonyBtn: '📜 제례',
      quizTitle: '🎯 무형문화유산 퀴즈',
      quizCategoryAsk: '는 어느 분류인가요?',
      quizScore: '정답',
      quizAgain: '다시 하기',
    },
  };

  var LANGS = [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
  ];
  var LANG_MAP = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR' };
  var CATEGORY_ICONS = {
    '人物': '👤', '礼制': '🏮', '器物': '🏺', '音乐': '🎵',
    '祭品': '🍊', '建筑': '🏯', '习俗': '🎐', '文化': '📖', '地标': '⛰️',
  };
  var CATEGORY_NAMES = {
    '人物': { zh: '人物', en: 'Figure', ja: '人物', ko: '인물' },
    '礼制': { zh: '礼制', en: 'Rites', ja: '礼制', ko: '예제' },
    '器物': { zh: '器物', en: 'Artifact', ja: '器物', ko: '기물' },
    '音乐': { zh: '音乐', en: 'Music', ja: '音楽', ko: '음악' },
    '祭品': { zh: '祭品', en: 'Offering', ja: '供物', ko: '제물' },
    '建筑': { zh: '建筑', en: 'Architecture', ja: '建築', ko: '건축' },
    '习俗': { zh: '习俗', en: 'Custom', ja: '習俗', ko: '풍습' },
    '文化': { zh: '文化', en: 'Culture', ja: '文化', ko: '문화' },
    '地标': { zh: '地标', en: 'Landmark', ja: 'ランドマーク', ko: '랜드마크' },
  };
  var BRIDGE_STR = {
    zh: { btn: '🌉 文化桥对比', title: '🌉 文化桥 · 跨文化对比', ours: '中华', theirs: '外国' },
    en: { btn: '🌉 Culture Bridge', title: '🌉 Culture Bridge', ours: 'China', theirs: 'Abroad' },
    ja: { btn: '🌉 文化の架け橋', title: '🌉 文化の架け橋', ours: '中国', theirs: '海外' },
    ko: { btn: '🌉 문화 브리지', title: '🌉 문화 브리지', ours: '중국', theirs: '해외' },
  };
  var ARTI_STR = {
    zh: { btn: '🏺 3D 器物', title: '🏺 3D 器物展示', hint: '拖动旋转 · 点击器物敲响/了解' },
    en: { btn: '🏺 3D Artifacts', title: '🏺 3D Artifacts', hint: 'Drag to rotate · tap to chime & learn' },
    ja: { btn: '🏺 3D器物', title: '🏺 3D器物展示', hint: 'ドラッグで回転 · タップで音と解説' },
    ko: { btn: '🏺 3D 유물', title: '🏺 3D 유물 전시', hint: '드래그로 회전 · 탭하면 소리와 설명' },
  };
  var POSTER_STR = {
    zh: { btn: '🖼 分享海报', title: '🖼 分享海报', download: '⬇ 下载图片', share: '🔗 分享' },
    en: { btn: '🖼 Share Poster', title: '🖼 Share Poster', download: '⬇ Download', share: '🔗 Share' },
    ja: { btn: '🖼 シェアポスター', title: '🖼 シェアポスター', download: '⬇ ダウンロード', share: '🔗 シェア' },
    ko: { btn: '🖼 공유 포스터', title: '🖼 공유 포스터', download: '⬇ 다운로드', share: '🔗 공유' },
  };
  var TOAST_STR = {
    zh: { copy: '链接已复制', shareCancel: '已取消分享', shareFail: '当前浏览器不支持分享', panoFail: '全景图加载失败，请重试', download: '海报已下载', artifactFail: '当前浏览器不支持 3D 展示' },
    en: { copy: 'Link copied', shareCancel: 'Share cancelled', shareFail: 'Sharing not supported', panoFail: 'Failed to load panorama', download: 'Poster downloaded', artifactFail: '3D not supported in this browser' },
    ja: { copy: 'リンクをコピーしました', shareCancel: '共有をキャンセルしました', shareFail: '共有に対応していません', panoFail: 'パノラマの読み込みに失敗しました', download: 'ポスターを保存しました', artifactFail: 'このブラウザは3D表示に対応していません' },
    ko: { copy: '링크 복사됨', shareCancel: '공유 취소됨', shareFail: '공유를 지원하지 않습니다', panoFail: '파노라마 로딩 실패', download: '포스터 다운로드됨', artifactFail: '이 브라우저는 3D를 지원하지 않습니다' },
  };
  var LEXICON_STR = {
    zh: { btn: '📖 非遗词库', title: '📖 非遗词库' },
    en: { btn: '📖 ICH Lexicon', title: '📖 ICH Lexicon' },
    ja: { btn: '📖 詞庫', title: '📖 無形文化遺産の詞庫' },
    ko: { btn: '📖 용어사전', title: '📖 무형문화유산 용어사전' },
  };
  var MAP_TITLE = { zh: '仙都导览图', en: 'Xiandu Guide Map', ja: '仙都ガイドマップ', ko: '셴두 안내지도' };
  var FALLBACK_STR = {
    ja: '一部の内容は英語・中国語で表示されます',
    ko: '일부 내용은 영어·중국어로 표시됩니다',
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
  var currentAudio = null;
  var mascotTimer = null;
  var speakToken = 0;
  var guideToken = 0;
  var explainToken = 0;

  function $(id) { return document.getElementById(id); }
  function t(key) { return I18N[state.lang][key]; }
  function setText(id, txt) { $(id).textContent = txt; }
  function pick(d) { return d[state.lang] || d.en || d.zh; }

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

  function browserSpeak(text, lang, onend) {
    if (!('speechSynthesis' in window)) { if (onend) onend(); return false; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    var langTag = LANG_MAP[lang] || 'zh-CN';
    u.lang = langTag;
    u.rate = 0.95;
    var prefix = langTag.split('-')[0].toLowerCase();
    var v = voices.find(function (vv) {
      return vv.lang && vv.lang.toLowerCase().replace('_', '-').indexOf(prefix) === 0;
    });
    if (v) u.voice = v;
    if (onend) u.onend = onend;
    window.speechSynthesis.speak(u);
    return true;
  }

  function stopSpeak() {
    speakToken++;  // 使进行中的 speakText 结果失效
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (currentAudio) { try { currentAudio.pause(); } catch (e) {} currentAudio = null; }
    mascotHide();
  }

  /* ---------------- 吉祥物讲解形象 ---------------- */
  function setSpeaking(active) {
    $('btn-stop').classList.toggle('hidden', !active);
    $('btn-speak').classList.toggle('hidden', active);
  }

  function mascotTalk(text) {
    clearTimeout(mascotTimer);
    setSpeaking(true);
    $('mascot').classList.remove('hidden');
    $('mascot').classList.add('speaking');
    var short = (text || '').replace(/[*#\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    setText('mascot-bubble', short.length > 44 ? short.slice(0, 44) + '…' : short);
  }

  function mascotDone() {
    setSpeaking(false);
    $('mascot').classList.remove('speaking');
    clearTimeout(mascotTimer);
    mascotTimer = setTimeout(function () { $('mascot').classList.add('hidden'); }, 2600);
  }

  function mascotHide() {
    setSpeaking(false);
    clearTimeout(mascotTimer);
    $('mascot').classList.remove('speaking');
    $('mascot').classList.add('hidden');
  }

  // 将 base64 音频(若为 PCM16 则包装成 WAV)解码并播放 —— 讯飞模式使用
  function playAudioBase64(b64, mime, onend) {
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
    currentAudio = a;
    var finish = function () {
      URL.revokeObjectURL(url);
      if (currentAudio === a) currentAudio = null;
      if (onend) onend();
    };
    a.onended = finish;
    a.onerror = finish;
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
    var token = ++speakToken;
    // 开始新播报前停止旧音频
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (currentAudio) { try { currentAudio.pause(); } catch (e) {} currentAudio = null; }
    mascotTalk(text);
    var done = function () { if (token === speakToken) mascotDone(); };
    try {
      var res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, lang: lang }),
      });
      var data = await res.json();
      if (token !== speakToken) return;  // 已停止或已换新
      if (data.mode === 'audio' && data.audio) {
        playAudioBase64(data.audio, data.mime, done);
      } else {
        browserSpeak(data.text || text, lang, done);
      }
    } catch (e) {
      if (token === speakToken) browserSpeak(text, lang, done);
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

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildKeywordSpans(text) {
    var matches = [];
    Object.keys(state.config.keywords).forEach(function (id) {
      var kw = state.config.keywords[id];
      var terms = [];
      if (kw.term && kw.term.zh) terms.push(kw.term.zh);
      if (kw.term && kw.term.en) {
        terms.push(kw.term.en);
        var p = kw.term.en.indexOf('(');
        if (p > 0) terms.push(kw.term.en.slice(0, p).trim());
      }
      terms.forEach(function (t) {
        if (!t || t.length < 2) return;
        var lower = text.toLowerCase();
        var tl = t.toLowerCase();
        var from = 0, idx;
        while ((idx = lower.indexOf(tl, from)) !== -1) {
          matches.push({ start: idx, end: idx + t.length, id: id });
          from = idx + t.length;
        }
      });
    });
    matches.sort(function (a, b) {
      return (a.start - b.start) || ((b.end - b.start) - (a.end - a.start));
    });
    var filtered = [], lastEnd = 0;
    matches.forEach(function (m) {
      if (m.start >= lastEnd) { filtered.push(m); lastEnd = m.end; }
    });
    return filtered;
  }

  function renderGuideText(text) {
    var clean = (text || '').replace(/\*\*/g, '');
    var el = $('guide-text');
    var spans = buildKeywordSpans(clean);
    if (!spans.length) { el.textContent = clean; return; }
    var html = '', pos = 0;
    spans.forEach(function (s) {
      html += escapeHtml(clean.slice(pos, s.start));
      html += '<span class="kw-inline" data-kw="' + s.id + '">' + escapeHtml(clean.slice(s.start, s.end)) + '</span>';
      pos = s.end;
    });
    html += escapeHtml(clean.slice(pos));
    el.innerHTML = html;
  }

  async function loadGuide() {
    if (!state.sceneId) return;
    var scene = currentScene();
    var token = ++guideToken;
    setText('guide-text', t('loadingGuide'));
    try {
      var res = await postJSON('/api/guide', {
        scene_id: scene.id, age: state.age, lang: state.lang,
      });
      var data = await res.json();
      if (token !== guideToken) return;  // 过期响应丢弃
      state.guideText = data.text;
      state.guideMode = data.mode;
      renderGuideText(data.text);
      updateModeBadge(data.mode);
    } catch (e) {
      if (token !== guideToken) return;
      setText('guide-text', t('guideFail'));
    }
  }

  function updateModeBadge(mode) {
    var badge = $('panel-mode');
    badge.textContent = mode === 'llm' ? t('llmMode') : t('localMode');
    badge.classList.toggle('llm', mode === 'llm');
  }

  async function explainKeyword(keyword, silent) {
    var kw = state.config.keywords[keyword];
    if (!kw) return;
    var token = ++explainToken;
    state.activeKeyword = keyword;
    setText('explain-term', pick(kw.term));
    setText('explain-meta', kw.pinyin + ' · ' + catName(kw.category));
    setText('explain-text', '…');
    $('explain-box').classList.remove('hidden');
    var hasBridge = !!(state.config.bridge && state.config.bridge[keyword]);
    $('btn-bridge').classList.toggle('hidden', !hasBridge);
    highlightChip(keyword);
    try {
      var res = await postJSON('/api/explain', { keyword: keyword, lang: state.lang });
      var data = await res.json();
      if (token !== explainToken) return;  // 过期响应丢弃
      setText('explain-text', data.text);
      if (!silent) speakText(data.text, state.lang);
    } catch (e) {
      if (token !== explainToken) return;
      setText('explain-text', pick(kw.definition) + '\n\n' + pick(kw.analogy));
    }
  }

  /* ---------------- 地图 ---------------- */
  function renderMap() {
    var g = $('map-markers');
    var NS = 'http://www.w3.org/2000/svg';
    g.innerHTML = '';
    state.config.scenes.forEach(function (s) {
      var isMain = s.id === 'huangdi_temple';
      var grp = document.createElementNS(NS, 'g');
      grp.setAttribute('class', 'map-marker' + (isMain ? ' main' : ''));
      grp.setAttribute('transform', 'translate(' + s.map.x + ',' + s.map.y + ')');

      var glow = document.createElementNS(NS, 'circle');
      glow.setAttribute('r', isMain ? 62 : 46);
      glow.setAttribute('fill', 'url(#spotglow)');
      grp.appendChild(glow);

      var pulse = document.createElementNS(NS, 'circle');
      pulse.setAttribute('class', 'pulse');
      pulse.setAttribute('r', isMain ? 15 : 12);
      pulse.setAttribute('fill', 'none');
      pulse.setAttribute('stroke', '#e8b23a');
      pulse.setAttribute('stroke-width', '2');
      [['r', (isMain ? 15 : 12) + ';' + (isMain ? 34 : 27)], ['opacity', '0.7;0']].forEach(function (p) {
        var a = document.createElementNS(NS, 'animate');
        a.setAttribute('attributeName', p[0]);
        a.setAttribute('values', p[1]);
        a.setAttribute('dur', '1.7s');
        a.setAttribute('repeatCount', 'indefinite');
        pulse.appendChild(a);
      });
      grp.appendChild(pulse);

      var core = document.createElementNS(NS, 'circle');
      core.setAttribute('class', 'core');
      core.setAttribute('r', isMain ? 15 : 13);
      core.setAttribute('fill', '#e8b23a');
      grp.appendChild(core);

      var ic = document.createElementNS(NS, 'text');
      ic.setAttribute('class', 'mic');
      ic.setAttribute('y', '0');
      ic.setAttribute('dominant-baseline', 'central');
      ic.setAttribute('text-anchor', 'middle');
      ic.setAttribute('font-size', isMain ? '15' : '13');
      ic.textContent = s.icon || '';
      grp.appendChild(ic);

      var hit = document.createElementNS(NS, 'circle');
      hit.setAttribute('r', 28);
      hit.setAttribute('fill', 'transparent');
      grp.appendChild(hit);

      var name = document.createElementNS(NS, 'text');
      name.setAttribute('class', 'mname');
      name.setAttribute('y', '-26');
      name.setAttribute('text-anchor', 'middle');
      name.setAttribute('fill', '#fff');
      name.setAttribute('font-size', isMain ? '19' : '16');
      name.setAttribute('font-weight', '600');
      name.textContent = pick(s.name);
      grp.appendChild(name);

      var tag = document.createElementNS(NS, 'text');
      tag.setAttribute('class', 'mtag');
      tag.setAttribute('y', '42');
      tag.setAttribute('text-anchor', 'middle');
      tag.setAttribute('fill', '#9aa7bd');
      tag.setAttribute('font-size', '12');
      tag.textContent = pick(s.tag);
      grp.appendChild(tag);

      grp.addEventListener('click', function () { enterScene(s.id); });
      g.appendChild(grp);
    });
  }

  function showMap() {
    $('map-screen').classList.remove('hidden');
    stopSpeak();
    $('explain-box').classList.add('hidden');
    $('guide-panel').classList.remove('collapsed');
  }

  function enterScene(id) {
    state.sceneId = id;
    state.activeKeyword = null;
    $('map-screen').classList.add('hidden');
    $('explain-box').classList.add('hidden');
    highlightChip('');
    renderTabs();
    renderChips();
    var scene = currentScene();
    setText('panel-scene', pick(scene.name));
    var pp = $('pano-preview');
    pp.style.backgroundImage = "url('" + scene.panorama.replace('.jpg', '_preview.jpg') + "')";
    pp.classList.remove('hide');
    viewer.setPano(scene.panorama);
    refreshHotspots();
    if (scene.hotspots.length) viewer.faceYaw(scene.hotspots[0].yaw);
    stopSpeak();
    loadGuide();
  }

  /* ---------------- 渲染 ---------------- */
  function renderTabs() {
    var nav = $('scene-tabs');
    nav.innerHTML = '';
    state.config.scenes.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'tab' + (s.id === state.sceneId ? ' active' : '');
      b.textContent = (s.icon ? s.icon + ' ' : '') + pick(s.name);
      b.addEventListener('click', function () { enterScene(s.id); });
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
      b.textContent = pick(a.label);
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
    if (!scene) return;
    var seen = {};
    scene.hotspots.forEach(function (h) {
      if (seen[h.keyword]) return;
      seen[h.keyword] = true;
      var kw = state.config.keywords[h.keyword];
      if (!kw) return;
      var c = document.createElement('button');
      c.className = 'chip';
      c.dataset.keyword = h.keyword;
      c.textContent = pick(kw.term);
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

  function refreshHotspots() {
    if (!state.sceneId) return;
    var scene = currentScene();
    viewer.setHotspots(scene.hotspots.map(function (h) {
      var kw = state.config.keywords[h.keyword];
      return {
        id: h.id,
        keyword: h.keyword,
        label: pick(kw.term),
        icon: CATEGORY_ICONS[kw.category] || '✨',
        yaw: h.yaw,
        pitch: h.pitch,
      };
    }));
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
    setText('map-subtitle', t('mapSubtitle'));
    setText('map-legend', t('mapLegend'));
    setText('map-title', MAP_TITLE[state.lang]);
    setText('btn-lexicon', LEXICON_STR[state.lang].btn);
    setText('lexicon-title', LEXICON_STR[state.lang].title);
    var fallback = (state.lang === 'ja' || state.lang === 'ko');
    var note = $('lang-note');
    if (note) {
      note.classList.toggle('hidden', !fallback);
      if (fallback) note.textContent = FALLBACK_STR[state.lang];
    }
    setText('qa-title', t('qaTitle'));
    $('qa-input').placeholder = t('qaPlaceholder');
    setText('qa-send', t('qaSend'));
    setText('btn-quiz', t('quizBtn'));
    setText('btn-ceremony', t('ceremonyBtn'));
    setText('quiz-title', t('quizTitle'));
    setText('btn-bridge', BRIDGE_STR[state.lang].btn);
    setText('btn-artifact', ARTI_STR[state.lang].btn);
    setText('artifact-title', ARTI_STR[state.lang].title);
    setText('artifact-hint', ARTI_STR[state.lang].hint);
    setText('btn-poster', POSTER_STR[state.lang].btn);
    setText('poster-title', POSTER_STR[state.lang].title);
    setText('btn-download', POSTER_STR[state.lang].download);
    setText('btn-share', POSTER_STR[state.lang].share);
    $('btn-map').textContent = '🗺 ' + t('map');
    $('lang-select').value = state.lang;
    renderMap();
    renderTabs();
    renderAgeSelector();
    renderChips();
    refreshHotspots();
    updateModeBadge(state.guideMode);
    refreshOpenContent();
    if (state.sceneId) {
      setText('panel-scene', pick(currentScene().name));
      loadGuide();
    }
  }

  /* ---------------- 非遗小测验 ---------------- */
  var quizState = null;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function catName(cat) {
    return (CATEGORY_NAMES[cat] && CATEGORY_NAMES[cat][state.lang]) || cat;
  }

  function startQuiz() {
    var ids = shuffle(Object.keys(state.config.keywords)).slice(0, 5);
    var cats = [], seen = {};
    Object.keys(state.config.keywords).forEach(function (id) {
      var c = state.config.keywords[id].category;
      if (!seen[c]) { seen[c] = 1; cats.push(c); }
    });
    quizState = { qs: [], idx: 0, score: 0, total: ids.length };
    ids.forEach(function (id) {
      var kw = state.config.keywords[id];
      var distractors = shuffle(cats.filter(function (c) { return c !== kw.category; })).slice(0, 3);
      quizState.qs.push({ term: kw.term, correct: kw.category, options: shuffle([kw.category].concat(distractors)) });
    });
    openModal('quiz-modal');
    renderQuiz();
  }

  function renderQuiz() {
    var q = quizState.qs[quizState.idx];
    setText('quiz-progress', (quizState.idx + 1) + ' / ' + quizState.total);
    setText('quiz-question', '「' + pick(q.term) + '」' + t('quizCategoryAsk'));
    var box = $('quiz-options');
    box.innerHTML = '';
    q.options.forEach(function (opt) {
      var b = document.createElement('button');
      b.className = 'quiz-opt';
      b.textContent = catName(opt);
      b.addEventListener('click', function () { answerQuiz(opt); });
      box.appendChild(b);
    });
  }

  function answerQuiz(opt) {
    var q = quizState.qs[quizState.idx];
    if (opt === q.correct) quizState.score++;
    var opts = $('quiz-options').children;
    for (var i = 0; i < opts.length; i++) {
      opts[i].style.pointerEvents = 'none';
      if (q.options[i] === q.correct) opts[i].classList.add('correct');
      else if (q.options[i] === opt) opts[i].classList.add('wrong');
    }
    setTimeout(function () {
      if ($('quiz-modal').classList.contains('hidden')) return;  // 弹窗已关闭则不再跳题
      quizState.idx++;
      if (quizState.idx < quizState.total) renderQuiz();
      else renderQuizResult();
    }, 750);
  }

  function renderQuizResult() {
    var box = $('quiz-options');
    box.innerHTML = '';
    setText('quiz-progress', '');
    setText('quiz-question', '');
    var div = document.createElement('div');
    div.className = 'quiz-result';
    var emoji = quizState.score === quizState.total ? '🏆' : (quizState.score >= 3 ? '🎉' : '💪');
    div.innerHTML = '<div class="score">' + emoji + '</div>' +
      '<p>' + t('quizScore') + ' ' + quizState.score + ' / ' + quizState.total + '</p>' +
      '<button class="btn primary" id="quiz-again">' + t('quizAgain') + '</button>';
    box.appendChild(div);
    $('quiz-again').addEventListener('click', startQuiz);
  }

  /* ---------------- 轩辕祭典流程 ---------------- */
  function renderCeremony() {
    var c = state.config.ceremony;
    setText('ceremony-title', '📜 ' + pick(c.title));
    setText('ceremony-hint', pick(c.hint));
    var box = $('ceremony-steps');
    box.innerHTML = '';
    c.steps.forEach(function (s, i) {
      var el = document.createElement('div');
      el.className = 'tl-step';
      el.style.animationDelay = (i * 110) + 'ms';
      el.innerHTML = '<span class="tl-dot"></span>' +
        '<div class="tl-title">' + s.icon + ' ' + pick(s.title) + '</div>' +
        '<div class="tl-desc">' + pick(s.desc) + '</div>';
      el.addEventListener('click', function () {
        var wasActive = el.classList.contains('active');
        Array.prototype.forEach.call(box.children, function (x) { x.classList.remove('active'); });
        if (!wasActive) el.classList.add('active');
        speakText(s.icon + ' ' + pick(s.title) + '。' + pick(s.desc), state.lang);
      });
      box.appendChild(el);
    });
  }

  function openCeremony() {
    renderCeremony();
    openModal('ceremony-modal');
  }

  /* ---------------- 文化桥跨文化对比 ---------------- */
  function openBridge(keyword) {
    var b = state.config.bridge && state.config.bridge[keyword];
    if (!b) return;
    var s = BRIDGE_STR[state.lang];
    setText('bridge-title', s.title);
    setText('bridge-ours-tag', s.ours);
    setText('bridge-theirs-tag', s.theirs);
    setText('bridge-ours-name', pick(state.config.keywords[keyword].term));
    setText('bridge-theirs-name', pick(b.counterpart));
    var box = $('bridge-rows');
    box.innerHTML = '';
    b.rows.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'bridge-row';
      row.innerHTML = '<div class="b-dim">' + pick(r.dim) + '</div>' +
        '<div class="b-cell b-ours">' + pick(r.ours) + '</div>' +
        '<div class="b-cell b-theirs">' + pick(r.theirs) + '</div>';
      box.appendChild(row);
    });
    openModal('bridge-modal');
  }

  /* ---------------- 3D 器物展示 ---------------- */
  var artifactViewer = null;
  var artifactType = 'bianzhong';

  function setArtifactTab(type) {
    artifactType = type;
    if (artifactViewer) artifactViewer.setType(type);
    document.querySelectorAll('.artifact-tab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-type') === type);
    });
  }

  function openArtifact() {
    openModal('artifact-modal');
    if (!artifactViewer) {
      try {
        artifactViewer = new Artifact3D($('artifact-canvas'));
      } catch (e) {
        toast(TOAST_STR[state.lang].artifactFail);
        return;
      }
      artifactViewer.onTap = function () {
        var kw = state.config.keywords[artifactType];
        if (kw) speakText(pick(kw.definition) + '\n' + pick(kw.analogy), state.lang);
      };
      setTimeout(function () { artifactViewer._resize(); }, 60);
    }
    setArtifactTab(artifactType);
  }

  /* ---------------- 分享海报 ---------------- */
  function openPoster() {
    var scene = currentScene();
    if (!scene) return;
    openModal('poster-modal');
    var img = new Image();
    img.onload = function () { drawPoster(img, scene); };
    img.onerror = function () { drawPoster(null, scene); };
    img.src = scene.panorama;
  }

  function drawPoster(img, scene) {
    var c = $('poster-canvas');
    var ctx = c.getContext('2d');
    var W = 600, H = 900;
    if (img) {
      var s = Math.max(W / img.width, H / img.height);
      var dw = img.width * s, dh = img.height * s;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1a2a3d'); g.addColorStop(1, '#0b1120');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    var ov = ctx.createLinearGradient(0, 0, 0, H);
    ov.addColorStop(0, 'rgba(10,14,24,0.28)');
    ov.addColorStop(0.55, 'rgba(10,14,24,0.4)');
    ov.addColorStop(1, 'rgba(10,14,24,0.86)');
    ctx.fillStyle = ov; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(232,178,58,0.7)'; ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe08a';
    ctx.font = "bold 52px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('云上仙都', W / 2, 150);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = "22px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('非遗数字化传承 · VR全景云游览', W / 2, 192);

    ctx.fillStyle = '#ffffff';
    ctx.font = "64px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(scene.icon || '', W / 2, 430);
    ctx.font = "bold 60px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(pick(scene.name), W / 2, 520);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = "26px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText('云上仙都 · 非遗 AI 云游览', W / 2, 790);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = "20px sans-serif";
    ctx.fillText(location.host || 'yunshang-xiandu', W / 2, 830);
  }

  function downloadPoster() {
    var a = document.createElement('a');
    a.href = $('poster-canvas').toDataURL('image/png');
    a.download = '云上仙都-' + pick(currentScene().name) + '.png';
    a.click();
    toast(TOAST_STR[state.lang].download);
  }

  function sharePoster() {
    if (navigator.share) {
      navigator.share({ title: '云上仙都', text: '云上仙都 · 非遗 AI 云游览', url: location.href })
        .then(function () {})
        .catch(function (err) {
          if (err && err.name === 'AbortError') toast(TOAST_STR[state.lang].shareCancel);
          else toast(TOAST_STR[state.lang].shareFail);
        });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(location.href)
        .then(function () { toast(TOAST_STR[state.lang].copy); })
        .catch(function () { toast(TOAST_STR[state.lang].shareFail); });
    } else {
      toast(TOAST_STR[state.lang].shareFail);
    }
  }

  /* ---------------- AI 自由问答 ---------------- */
  function appendQa(who, text) {
    var log = $('qa-log');
    var el = document.createElement('div');
    el.className = 'qa-msg ' + who;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  function sendQuestion() {
    var input = $('qa-input');
    var q = input.value.trim();
    if (!q) return;
    input.value = '';
    appendQa('user', q);
    var log = $('qa-log');
    var aiEl = document.createElement('div');
    aiEl.className = 'qa-msg ai';
    aiEl.textContent = '…';
    log.appendChild(aiEl);
    log.scrollTop = log.scrollHeight;
    postJSON('/api/ask', { question: q, lang: state.lang })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        aiEl.textContent = data.answer;
        log.scrollTop = log.scrollHeight;
        speakText(data.answer, state.lang);
      })
      .catch(function () {
        aiEl.textContent = t('guideFail');
      });
  }

  /* ---------------- 弹窗与提示 ---------------- */
  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function openModal(id) { $(id).classList.remove('hidden'); }
  function closeModal(id) {
    $(id).classList.add('hidden');
    stopSpeak();  // 关闭弹窗时停止相关播报
  }

  /* ---------------- 完整词库 ---------------- */
  function openLexicon() {
    var box = $('lexicon-list');
    box.innerHTML = '';
    Object.keys(state.config.keywords).forEach(function (id) {
      var kw = state.config.keywords[id];
      var el = document.createElement('button');
      el.className = 'lexicon-item';
      el.innerHTML = '<span class="lex-icon">' + (CATEGORY_ICONS[kw.category] || '✨') + '</span>' +
        '<span class="lex-term">' + pick(kw.term) + '</span>' +
        '<span class="lex-cat">' + catName(kw.category) + '</span>';
      el.addEventListener('click', function () {
        closeModal('lexicon-modal');
        explainKeyword(id);
      });
      box.appendChild(el);
    });
    openModal('lexicon-modal');
  }

  /* ---------------- 语言切换时刷新已打开内容 ---------------- */
  function refreshOpenContent() {
    if (state.activeKeyword && $('explain-box') && !$('explain-box').classList.contains('hidden')) {
      explainKeyword(state.activeKeyword, true);
    }
    if ($('ceremony-modal') && !$('ceremony-modal').classList.contains('hidden')) {
      renderCeremony();
    }
    if ($('bridge-modal') && !$('bridge-modal').classList.contains('hidden') && state.activeKeyword) {
      openBridge(state.activeKeyword);
    }
    if (quizState && $('quiz-modal') && !$('quiz-modal').classList.contains('hidden')) {
      if (quizState.idx < quizState.total) renderQuiz();
      else renderQuizResult();
    }
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
      if (!loading) $('pano-preview').classList.add('hide');
    };
    viewer.onError = function () {
      toast(TOAST_STR[state.lang].panoFail);
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
    $('lang-select').addEventListener('change', function () {
      state.lang = this.value;
      applyLang();
    });
    $('panel-close').addEventListener('click', function () {
      var collapsed = $('guide-panel').classList.toggle('collapsed');
      $('btn-expand-panel').classList.toggle('hidden', !collapsed);
    });
    $('btn-expand-panel').addEventListener('click', function () {
      $('guide-panel').classList.remove('collapsed');
      $('btn-expand-panel').classList.add('hidden');
    });
    $('btn-map').addEventListener('click', showMap);
    $('guide-text').addEventListener('click', function (e) {
      var t = e.target;
      if (t.classList && t.classList.contains('kw-inline')) {
        explainKeyword(t.getAttribute('data-kw'));
      }
    });

    $('btn-quiz').addEventListener('click', startQuiz);
    $('btn-ceremony').addEventListener('click', openCeremony);
    $('btn-bridge').addEventListener('click', function () { openBridge(state.activeKeyword); });
    $('btn-artifact').addEventListener('click', openArtifact);
    document.querySelectorAll('.artifact-tab').forEach(function (b) {
      b.addEventListener('click', function () { setArtifactTab(b.getAttribute('data-type')); });
    });
    $('btn-poster').addEventListener('click', openPoster);
    $('btn-download').addEventListener('click', downloadPoster);
    $('btn-share').addEventListener('click', sharePoster);
    $('btn-lexicon').addEventListener('click', openLexicon);
    $('qa-send').addEventListener('click', sendQuestion);
    $('qa-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendQuestion();
    });
    document.querySelectorAll('.modal-close').forEach(function (b) {
      b.addEventListener('click', function () { closeModal(b.getAttribute('data-close')); });
    });
    document.querySelectorAll('.modal').forEach(function (m) {
      m.addEventListener('click', function (e) { if (e.target === m) closeModal(m.id); });
    });

    setTimeout(function () {
      var hint = $('hint');
      if (!hint) return;
      hint.style.opacity = '0';
      setTimeout(function () { hint.style.display = 'none'; }, 900);
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

    state.sceneId = null;
    state.age = state.config.defaults.age;
    state.lang = state.config.defaults.lang;

    var sel = $('lang-select');
    LANGS.forEach(function (l) {
      var o = document.createElement('option');
      o.value = l.code;
      o.textContent = l.label;
      sel.appendChild(o);
    });
    sel.value = state.lang;

    applyLang();  // 渲染地图/标签/年龄选择; 尚未进入场景, 不加载讲解
    showMap();    // 落地页 = 导览地图
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
