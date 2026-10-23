/* 首页的文案与展示逻辑；景点和功能仍由 app.js 中的原有流程处理。 */
(function () {
  'use strict';
  var copy = {
    zh: {
      brandName:'云上仙都', pageTitle:'云上仙都 · 景点与文化导览',
      navExplore:'景点介绍', navCulture:'非遗文化', navMap:'导览地图', startTour:'开始游览',
      location:'浙江 · 丽水 · 缙云', heroLine1:'一程山水，', heroLine2:'千年回响。',
      heroDescription:'在线浏览仙都景点，查看景点讲解与非遗文化内容。', chooseScene:'选择景点',
      destinationsTitle:'景点介绍', destinationsDescription:'选择景点，查看场景与讲解。',
      mapView:'查看地图', heritageTitle:'非遗文化', heritageDescription:'查阅文化词条，了解轩辕祭典与礼乐器物。',
      lexiconFeature:'非遗词库', lexiconDescription:'文化词条与释义',
      ceremonyFeature:'轩辕祭典', ceremonyDescription:'祭典流程与仪式说明',
      artifactFeature:'3D 器物', artifactDescription:'编钟与鼎的三维示意',
      mapHeading:'导览地图', mapDescription:'点击标记或下方景点名称进入浏览。位置仅供示意。',
      footerNote:'景点与文化导览', guideHeading:'景点讲解', expandGuide:'打开讲解', enter:'查看景点',
      sceneDescriptions:['横跨溪流的石桥，连接景区山水与街巷。','结合山水文化与文创展示的阅读空间。','祭祀轩辕黄帝的祠宇，缙云轩辕祭典的主要场所。']
    },
    en: {
      brandName:'Xiandu', pageTitle:'Xiandu · Visitor Guide',
      navExplore:'Attractions', navCulture:'Cultural heritage', navMap:'Visitor map', startTour:'Start tour',
      location:'Jinyun · Lishui · Zhejiang', heroLine1:'A landscape.', heroLine2:'A living story.',
      heroDescription:'Browse Xiandu attractions online, with visitor guides and cultural information.', chooseScene:'Choose a site',
      destinationsTitle:'Attractions', destinationsDescription:'Select a site to view its scene and guide.',
      mapView:'View map', heritageTitle:'Cultural heritage', heritageDescription:'Read cultural terms and learn about the Xuanyuan Ceremony and ritual objects.',
      lexiconFeature:'Heritage glossary', lexiconDescription:'Cultural terms and definitions',
      ceremonyFeature:'Xuanyuan Ceremony', ceremonyDescription:'Ceremony stages and explanations',
      artifactFeature:'3D objects', artifactDescription:'Illustrative models of bells and a ding vessel',
      mapHeading:'Visitor map', mapDescription:'Select a marker or a site name below to visit. Locations are schematic.',
      footerNote:'Attractions and cultural information', guideHeading:'Site guide', expandGuide:'Open guide', enter:'View site',
      sceneDescriptions:['A stone bridge spanning a stream and connecting the scenery with local lanes.','A reading space with local landscape culture and creative displays.','A temple dedicated to the Yellow Emperor and a main venue for the Jinyun Xuanyuan Ceremony.']
    },
    ja: {
      brandName:'雲上の仙都', pageTitle:'仙都 · 観光・文化ガイド',
      navExplore:'観光スポット', navCulture:'文化遺産', navMap:'案内図', startTour:'見学を始める',
      location:'浙江 · 麗水 · 縉雲', heroLine1:'山水を巡り、', heroLine2:'千年の声を聴く。',
      heroDescription:'仙都の景観をオンラインで見学し、各スポットの解説と文化情報を確認できます。', chooseScene:'見学先を選ぶ',
      destinationsTitle:'観光スポット', destinationsDescription:'スポットを選ぶと、景観と解説を表示します。',
      mapView:'地図を見る', heritageTitle:'文化遺産', heritageDescription:'文化用語、軒轅祭の流れ、礼楽の器物を紹介します。',
      lexiconFeature:'文化用語集', lexiconDescription:'文化用語と解説',
      ceremonyFeature:'軒轅祭', ceremonyDescription:'祭典の流れと儀式の説明',
      artifactFeature:'3D器物', artifactDescription:'編鐘と鼎の模式モデル',
      mapHeading:'案内図', mapDescription:'マーカーまたは下のスポット名を選択してください。位置は概略です。',
      footerNote:'観光・文化ガイド', guideHeading:'スポット解説', expandGuide:'解説を開く', enter:'詳細を見る',
      sceneDescriptions:['渓流に架かり、景区の山水と街路を結ぶ石橋です。','山水文化や文化創作の展示を取り入れた読書空間です。','軒轅黄帝を祀る祠宇で、縉雲軒轅祭の主な会場です。']
    },
    ko: {
      brandName:'구름 위 선도', pageTitle:'선도 · 관광 및 문화 안내',
      navExplore:'관광지 소개', navCulture:'문화유산', navMap:'안내 지도', startTour:'관람 시작',
      location:'저장 · 리수이 · 진윈', heroLine1:'산수를 거닐며,', heroLine2:'천년의 이야기를.',
      heroDescription:'선도 관광지를 온라인으로 둘러보고 관광 해설과 문화 정보를 확인할 수 있습니다.', chooseScene:'관광지 선택',
      destinationsTitle:'관광지 소개', destinationsDescription:'관광지를 선택하면 현장 모습과 해설을 볼 수 있습니다.',
      mapView:'지도 보기', heritageTitle:'문화유산', heritageDescription:'문화 용어, 헌원 제례 절차와 예악 유물을 소개합니다.',
      lexiconFeature:'문화 용어사전', lexiconDescription:'문화 용어와 해설',
      ceremonyFeature:'헌원 제례', ceremonyDescription:'제례 절차와 의식 설명',
      artifactFeature:'3D 유물', artifactDescription:'편종과 정의 모형',
      mapHeading:'안내 지도', mapDescription:'마커 또는 아래 관광지 이름을 선택하세요. 위치는 개략도입니다.',
      footerNote:'관광 및 문화 안내', guideHeading:'관광지 해설', expandGuide:'해설 열기', enter:'상세 보기',
      sceneDescriptions:['시내를 가로질러 관광지의 산수와 골목을 잇는 돌다리입니다.','산수 문화와 문화 창작 전시를 접할 수 있는 독서 공간입니다.','헌원 황제를 모시는 사당으로 진윈 헌원 제례의 주요 장소입니다.']
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
    document.getElementById('home-lang-select').addEventListener('change',function () { actions.changeLang(this.value); });
  }
  function render(config, lang) {
    var strings = copy[lang] || copy.zh;
    document.querySelectorAll('[data-home-i18n]').forEach(function (el) { el.textContent = strings[el.dataset.homeI18n] || copy.zh[el.dataset.homeI18n]; });
    document.getElementById('home-lang-select').value = lang;
    document.title = strings.pageTitle;
    document.documentElement.lang = {zh:'zh-CN',en:'en',ja:'ja',ko:'ko'}[lang] || 'zh-CN';
    document.getElementById('btn-expand-panel').textContent = strings.expandGuide;
    var box = document.getElementById('scene-cards');
    var mapLinks = document.getElementById('map-scene-links');
    box.innerHTML = '';
    mapLinks.innerHTML = '';
    config.scenes.forEach(function (scene, i) {
      var cover = covers[scene.id];
      var name = scene.name[lang] || scene.name.en || scene.name.zh;
      var description = cover ? strings.sceneDescriptions[cover.index] : (scene.guide[lang] || scene.guide.zh);
      var src = cover ? '/static/assets/panoramas/source/'+cover.src : scene.panorama;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'scene-card';
      button.dataset.sceneId = scene.id;
      button.setAttribute('aria-label', name+' · '+strings.enter);
      button.innerHTML = '<div class="scene-card-image"><img src="'+esc(src)+'" alt="'+esc(name)+'" loading="lazy" style="object-position:'+(cover ? cover.position : 'center')+'"></div>'+
        '<div class="scene-card-body"><h3>'+esc(name)+'</h3><p>'+esc(description)+'</p><span class="scene-card-action">'+esc(strings.enter)+icon('arrow')+'</span></div>';
      button.addEventListener('click',function () { actions.enter(scene.id); });
      box.appendChild(button);
      var mapButton = document.createElement('button');
      mapButton.type = 'button';
      mapButton.innerHTML = '<span class="map-index" aria-hidden="true">'+(i+1)+'</span><span>'+esc(name)+'</span>'+icon('arrow');
      mapButton.addEventListener('click',function () { actions.enter(scene.id); });
      mapLinks.appendChild(mapButton);
    });
  }
  window.XianduHome = {
    init:init, render:render,
    coverFor:function (scene) { return covers[scene.id] ? '/static/assets/panoramas/source/'+covers[scene.id].src : scene.panorama; }
  };
})();
