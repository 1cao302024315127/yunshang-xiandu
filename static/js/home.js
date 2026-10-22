/* 首页的文案与展示逻辑；景点和功能仍由 app.js 中的原有流程处理。 */
(function () {
  'use strict';
  var copy = {
    zh: {
      navExplore:'探索仙都', navCulture:'非遗拾光', navMap:'云游地图', startTour:'开启云游',
      location:'浙江 · 丽水 · 缙云', heroLine1:'一程山水，', heroLine2:'千年回响。',
      heroDescription:'循着云雾走进仙都，在山水之间，\n遇见风景，也读懂流传千年的文化。',
      chooseScene:'选择一处风景', heroFootnote:'让文化可感，让山水可及', heroCaption:'云起仙都 · 溪上人家',
      stripTour:'全景漫游', stripTourSub:'换个视角，看见仙都', stripGuide:'随行讲解', stripGuideSub:'听见每一处风景的故事',
      stripCulture:'非遗溯源', stripCultureSub:'从一个词，走近一种文化', stripLanguage:'多语同行', stripLanguageSub:'让相遇，跨越语言',
      destinationsTitle:'好风景，值得慢慢遇见', destinationsDescription:'三处风景，三种走近仙都的方式。选一站，开始你的旅程。',
      cardView:'景点一览', mapView:'地图导览', heritageTitle:'山水有形，\n文化有声。',
      heritageDescription:'不止于看见。在词语、礼乐与器物之间，拾起仙都的文化记忆。',
      lexiconFeature:'读懂非遗', lexiconDescription:'从关键词出发，探寻文化来处',
      ceremonyFeature:'走近轩辕祭典', ceremonyDescription:'循着仪式，感受传承的温度',
      artifactFeature:'细看礼乐器物', artifactDescription:'转动视角，认识编钟与鼎',
      mapHeading:'下一站，去哪里？', mapDescription:'沿着导览地图，发现山水与人文的交汇。', mapNotice:'景点位置为导览示意',
      footerText:'山水相逢，云上再会。', footerNote:'非遗数字化传承 · 云游体验',
      sceneNote:'全景漫游 · 拖动探索', guideHeading:'听见山水里的故事', enter:'进入云游', hotspots:'处文化热点', panorama:'全景探索',
      sceneDescriptions:['踏过溪上古桥，在云雾与流水之间，遇见仙都的山水日常。','把脚步放慢，在山水与书香之间，寻找一方安静的阅读空间。','走进轩辕祭典的文化现场，循着礼乐与建筑，探寻千年文脉。'],
      sceneThemes:['山水寻踪','书香入境','礼乐寻根']
    },
    en: {
      navExplore:'Explore Xiandu', navCulture:'Living heritage', navMap:'Tour map', startTour:'Begin your journey',
      location:'Jinyun · Lishui · Zhejiang', heroLine1:'A landscape.', heroLine2:'A living story.',
      heroDescription:'Follow the mist into Xiandu. Discover the scenery\nand the culture that lives within it.',
      chooseScene:'Find your first stop', heroFootnote:'Closer to nature. Closer to culture.', heroCaption:'Xiandu · Life along the stream',
      stripTour:'Panoramic tours', stripTourSub:'A new view of Xiandu', stripGuide:'Audio stories', stripGuideSub:'A companion for every stop',
      stripCulture:'Living heritage', stripCultureSub:'Discover culture, word by word', stripLanguage:'Your language', stripLanguageSub:'Share the journey',
      destinationsTitle:'Places to pause and explore', destinationsDescription:'Three places, three ways to discover Xiandu. Choose where your journey begins.',
      cardView:'All places', mapView:'Tour map', heritageTitle:'A landscape to see.\nStories to hear.',
      heritageDescription:'Discover Xiandu through its words, ceremonies and traditional objects.',
      lexiconFeature:'Discover the heritage', lexiconDescription:'Explore the stories behind cultural keywords',
      ceremonyFeature:'The Xuanyuan Ceremony', ceremonyDescription:'Follow the ceremony, step by step',
      artifactFeature:'Ritual objects in 3D', artifactDescription:'A closer look at bells and bronze vessels',
      mapHeading:'Where to next?', mapDescription:'Find the meeting points of landscape and culture.', mapNotice:'Schematic locations for exploration',
      footerText:'Until our paths meet again.', footerNote:'Cultural heritage · A digital journey',
      sceneNote:'Panoramic tour · Drag to explore', guideHeading:'The stories within the landscape', enter:'Explore this place', hotspots:'cultural hotspots', panorama:'Panoramic tour',
      sceneDescriptions:['Cross an old stone bridge and discover everyday life between the water and the mist.','Slow down in a reading space where books meet the landscape of Xiandu.','Explore the temple, its architecture and the traditions of the Xuanyuan Ceremony.'],
      sceneThemes:['By the water','A moment to read','Roots and rituals']
    },
    ja: {
      navExplore:'仙都を巡る', navCulture:'文化に出会う', navMap:'ガイドマップ', startTour:'旅を始める',
      location:'浙江 · 麗水 · 縉雲', heroLine1:'山水を巡り、', heroLine2:'千年の声を聴く。',
      heroDescription:'雲と霧に導かれて仙都へ。\n風景の中に息づく文化に出会う旅。',
      chooseScene:'訪れる場所を選ぶ', heroFootnote:'風景を身近に、文化を心に', heroCaption:'雲の仙都 · 川辺の暮らし',
      stripTour:'パノラマ散策', stripTourSub:'新しい視点で仙都を見る', stripGuide:'音声ガイド', stripGuideSub:'風景の物語を聴く',
      stripCulture:'文化を知る', stripCultureSub:'言葉から文化に触れる', stripLanguage:'多言語で巡る', stripLanguageSub:'言葉を越えて出会う',
      destinationsTitle:'ゆっくり出会いたい風景', destinationsDescription:'三つの場所から、仙都の旅を始めましょう。',
      cardView:'スポット一覧', mapView:'地図で探す', heritageTitle:'山水の姿、\n文化の声。',
      heritageDescription:'言葉、礼楽、器物を通して、仙都の文化の記憶をたどります。',
      lexiconFeature:'文化を読み解く', lexiconDescription:'キーワードから物語の源へ',
      ceremonyFeature:'軒轅祭を知る', ceremonyDescription:'儀式をたどり、伝承に触れる',
      artifactFeature:'礼楽の器物を見る', artifactDescription:'編鐘と鼎を、さまざまな角度から',
      mapHeading:'次はどこへ？', mapDescription:'山水と文化の出会う場所を探しましょう。', mapNotice:'位置は案内用の概略図です',
      footerText:'また、雲の上の仙都で。', footerNote:'文化遺産のデジタル継承 · オンライン散策',
      sceneNote:'パノラマ · ドラッグで探索', guideHeading:'風景に息づく物語', enter:'ここを訪れる', hotspots:'か所の文化スポット', panorama:'パノラマ散策',
      sceneDescriptions:['古い石橋を渡り、霧と清流の間に息づく仙都の日常に出会います。','山水と本の香りの間で、静かな読書のひとときを。','建築と礼楽を通して、黄帝祠宇と軒轅祭の文化をたどります。'],
      sceneThemes:['水辺の風景','読書のひととき','礼楽と伝承']
    },
    ko: {
      navExplore:'선도 둘러보기', navCulture:'문화유산', navMap:'여행 지도', startTour:'여행 시작',
      location:'저장 · 리수이 · 진윈', heroLine1:'산수를 거닐며,', heroLine2:'천년의 이야기를.',
      heroDescription:'구름과 안개를 따라 선도로 떠나세요.\n풍경 속에 살아 있는 문화를 만나보세요.',
      chooseScene:'첫 여행지 선택', heroFootnote:'가까워지는 풍경, 마음에 닿는 문화', heroCaption:'구름 속 선도 · 물가의 일상',
      stripTour:'파노라마 여행', stripTourSub:'새로운 시선으로 보는 선도', stripGuide:'음성 가이드', stripGuideSub:'풍경의 이야기를 들어보세요',
      stripCulture:'문화 탐구', stripCultureSub:'단어에서 시작하는 문화 여행', stripLanguage:'다국어 여행', stripLanguageSub:'언어를 넘어 만나는 풍경',
      destinationsTitle:'천천히 만나고 싶은 풍경', destinationsDescription:'세 곳의 풍경, 선도를 만나는 세 가지 방법. 여행지를 골라보세요.',
      cardView:'여행지 보기', mapView:'지도로 보기', heritageTitle:'눈에 담는 산수,\n귀에 닿는 문화.',
      heritageDescription:'단어와 의례, 유물을 통해 선도의 문화적 기억을 찾아보세요.',
      lexiconFeature:'문화유산 알아보기', lexiconDescription:'키워드로 찾아가는 문화의 뿌리',
      ceremonyFeature:'헌원 제례 만나기', ceremonyDescription:'의례를 따라 전통을 느껴보세요',
      artifactFeature:'예악 유물 살펴보기', artifactDescription:'편종과 정을 다양한 각도로 보기',
      mapHeading:'다음은 어디로?', mapDescription:'산수와 문화가 만나는 곳을 찾아보세요.', mapNotice:'위치는 안내용 개략도입니다',
      footerText:'구름 위 선도에서 다시 만나요.', footerNote:'문화유산 디지털 계승 · 온라인 여행',
      sceneNote:'파노라마 · 드래그하여 탐색', guideHeading:'풍경 속에 담긴 이야기', enter:'여행지 둘러보기', hotspots:'곳의 문화 명소', panorama:'파노라마 여행',
      sceneDescriptions:['오래된 돌다리를 건너 안개와 물결 사이 선도의 일상을 만나보세요.','산수와 책의 향기가 어우러진 공간에서 잠시 쉬어가세요.','건축과 예악을 통해 황제 사당과 헌원 제례의 전통을 살펴보세요.'],
      sceneThemes:['물가의 풍경','책과 함께','예악의 뿌리']
    }
  };
  var covers = {
    dingzi_bridge: {src:'src1.jpg', position:'center 58%', index:0},
    yantuo_bookstore: {src:'src2.jpg', position:'center 65%', index:1},
    huangdi_temple: {src:'src3.jpg', position:'center 47%', index:2}
  };
  var actions;
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function icon(name) { return '<svg class="ui-icon" aria-hidden="true"><use href="#icon-'+name+'"/></svg>'; }
  function scrollToSection(id) {
    var target = document.getElementById(id);
    if (target) target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'});
  }
  function init(callbacks) {
    actions = callbacks;
    document.querySelectorAll('[data-scroll]').forEach(function (link) {
      link.addEventListener('click',function (event) { event.preventDefault(); scrollToSection(link.dataset.scroll); });
    });
    document.querySelectorAll('[data-enter-first]').forEach(function (button) {
      button.addEventListener('click',function () { actions.enter(actions.config.scenes[0].id); });
    });
    document.querySelectorAll('[data-home-feature]').forEach(function (button) {
      button.addEventListener('click',function () { actions[button.dataset.homeFeature](); });
    });
    document.getElementById('view-cards').addEventListener('click',function () { scrollToSection('scene-cards'); });
    document.getElementById('home-lang-select').addEventListener('change',function () { actions.changeLang(this.value); });
  }
  function render(config, lang) {
    var strings = copy[lang] || copy.zh;
    document.querySelectorAll('[data-home-i18n]').forEach(function (el) { el.textContent = strings[el.dataset.homeI18n] || copy.zh[el.dataset.homeI18n]; });
    document.getElementById('home-lang-select').value = lang;
    document.documentElement.lang = {zh:'zh-CN',en:'en',ja:'ja',ko:'ko'}[lang] || 'zh-CN';
    document.getElementById('btn-expand-panel').textContent = strings.guideHeading;
    var box = document.getElementById('scene-cards');
    box.innerHTML = '';
    config.scenes.forEach(function (scene, i) {
      var cover = covers[scene.id];
      var name = scene.name[lang] || scene.name.en || scene.name.zh;
      var description = cover ? strings.sceneDescriptions[cover.index] : (scene.guide[lang] || scene.guide.zh);
      var theme = cover ? strings.sceneThemes[cover.index] : (scene.tag[lang] || scene.tag.zh);
      var src = cover ? '/static/assets/panoramas/source/'+cover.src : scene.panorama;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'scene-card';
      button.dataset.sceneId = scene.id;
      button.setAttribute('aria-label', name+' · '+strings.enter);
      button.innerHTML = '<div class="scene-card-image"><img src="'+esc(src)+'" alt="'+esc(name)+'" loading="lazy" style="object-position:'+(cover ? cover.position : 'center')+'"><span class="scene-card-tag">'+esc(theme)+'</span><span class="scene-card-number">0'+(i+1)+'</span></div>'+
        '<div class="scene-card-body"><div class="scene-card-title"><h3>'+esc(name)+'</h3>'+icon('arrow')+'</div><p>'+esc(description)+'</p><div class="scene-card-meta">'+icon('compass')+'<span>'+esc(strings.panorama)+'</span><span>'+scene.hotspots.length+' '+esc(strings.hotspots)+'</span></div></div>';
      button.addEventListener('click',function () { actions.enter(scene.id); });
      box.appendChild(button);
    });
  }
  window.XianduHome = {
    init:init, render:render,
    coverFor:function (scene) { return covers[scene.id] ? '/static/assets/panoramas/source/'+covers[scene.id].src : scene.panorama; }
  };
})();
