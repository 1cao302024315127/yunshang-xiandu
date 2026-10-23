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
      mapHeading:'导览地图', mapDescription:'查看景区游览图，可放大查看路线；点击下方景点名称进入云游。',
      mapImageTitle:'仙都景区全景图', mapControls:'地图缩放', mapZoomIn:'放大地图', mapZoomOut:'缩小地图',
      mapReset:'全图', mapOriginal:'查看原图', mapSource:'图源：相约久久 · 仙都旅游攻略',
      mapNote:'游览路线与开放情况以景区现场公告为准。', mapViewport:'仙都景区游览图，可放大后拖动或滚动查看',
      mapImageAlt:'仙都景区全景图，包含景点、游览道路、溪流和服务设施图例',
      mapImageError:'游览图暂时无法显示，可查看下方图源或选择景点继续云游。',
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
      mapHeading:'Visitor map', mapDescription:'Explore the scenic area map and zoom in for routes. Select a site below to start a virtual visit.',
      mapImageTitle:'Xiandu Scenic Area Map', mapControls:'Map zoom', mapZoomIn:'Zoom in', mapZoomOut:'Zoom out',
      mapReset:'Fit map', mapOriginal:'Open image', mapSource:'Source: Meet99 · Xiandu travel guide',
      mapNote:'Follow on-site notices for current routes and access.', mapViewport:'Xiandu visitor map; zoom in, then drag or scroll to explore',
      mapImageAlt:'Xiandu scenic area map with attractions, visitor routes, streams and a facilities legend',
      mapImageError:'The map could not be displayed. Open the source below or select a site to continue your virtual visit.',
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
      mapHeading:'案内図', mapDescription:'景区の案内図を拡大してルートを確認できます。下のスポット名を選ぶとオンライン見学に進みます。',
      mapImageTitle:'仙都景区全景図', mapControls:'地図の拡大・縮小', mapZoomIn:'拡大', mapZoomOut:'縮小',
      mapReset:'全体表示', mapOriginal:'原図を開く', mapSource:'出典：相約久久 · 仙都観光ガイド',
      mapNote:'最新のルートと開放状況は現地の案内をご確認ください。', mapViewport:'仙都案内図。拡大後にドラッグまたはスクロールで移動できます',
      mapImageAlt:'観光スポット、散策路、渓流、施設の凡例を掲載した仙都景区全景図',
      mapImageError:'地図を表示できません。下の出典を開くか、スポットを選んで見学を続けてください。',
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
      mapHeading:'안내 지도', mapDescription:'관광지 안내 지도를 확대하여 경로를 확인하세요. 아래 관광지 이름을 선택하면 온라인 관람을 시작합니다.',
      mapImageTitle:'선도 관광지 전경 지도', mapControls:'지도 확대 및 축소', mapZoomIn:'지도 확대', mapZoomOut:'지도 축소',
      mapReset:'전체 보기', mapOriginal:'원본 보기', mapSource:'출처: Meet99 · 선도 여행 안내',
      mapNote:'최신 경로와 개방 상황은 현장 안내를 확인하세요.', mapViewport:'선도 안내 지도. 확대한 뒤 드래그하거나 스크롤하여 살펴보세요',
      mapImageAlt:'관광지, 탐방로, 하천 및 편의시설 범례가 표시된 선도 관광지 전경 지도',
      mapImageError:'지도를 표시할 수 없습니다. 아래 출처를 열거나 관광지를 선택하여 온라인 관람을 계속하세요.',
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
  function initMap() {
    var viewport = document.getElementById('map-viewport');
    var canvas = document.getElementById('map-canvas');
    var image = document.getElementById('visitor-map-image');
    var zoomIn = document.getElementById('map-zoom-in');
    var zoomOut = document.getElementById('map-zoom-out');
    var zoom = 1;
    var drag = null;
    function layout(nextZoom) {
      if (!viewport.clientWidth || !viewport.clientHeight) return;
      var previous = zoom;
      zoom = Math.max(1, Math.min(3, nextZoom));
      var ratio = (image.naturalWidth || 700) / (image.naturalHeight || 733);
      var fit = Math.min(viewport.clientWidth, viewport.clientHeight * ratio);
      var width = Math.round(fit * zoom);
      var height = Math.round(width / ratio);
      var left = (viewport.scrollLeft + viewport.clientWidth / 2) * zoom / previous;
      var top = (viewport.scrollTop + viewport.clientHeight / 2) * zoom / previous;
      canvas.style.width = Math.max(width, viewport.clientWidth) + 'px';
      canvas.style.height = Math.max(height, viewport.clientHeight) + 'px';
      image.style.width = width + 'px';
      viewport.scrollLeft = zoom === 1 ? 0 : left - viewport.clientWidth / 2;
      viewport.scrollTop = zoom === 1 ? 0 : top - viewport.clientHeight / 2;
      viewport.classList.toggle('can-pan', zoom > 1);
      document.getElementById('map-zoom').textContent = Math.round(zoom * 100) + '%';
      zoomIn.disabled = zoom >= 3;
      zoomOut.disabled = zoom <= 1;
    }
    zoomIn.addEventListener('click', function () { layout(zoom + .5); });
    zoomOut.addEventListener('click', function () { layout(zoom - .5); });
    document.getElementById('map-reset').addEventListener('click', function () { layout(1); });
    viewport.addEventListener('keydown', function (event) {
      if (event.key === '+' || event.key === '=') { event.preventDefault(); layout(zoom + .5); }
      if (event.key === '-') { event.preventDefault(); layout(zoom - .5); }
      if (event.key === '0') { event.preventDefault(); layout(1); }
    });
    // Touch keeps native two-axis scrolling and browser pinch zoom.
    viewport.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'mouse' || event.button !== 0 || zoom === 1) return;
      drag = {id:event.pointerId, x:event.clientX, y:event.clientY, left:viewport.scrollLeft, top:viewport.scrollTop};
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
      event.preventDefault();
    });
    viewport.addEventListener('pointermove', function (event) {
      if (!drag || event.pointerId !== drag.id) return;
      viewport.scrollLeft = drag.left + drag.x - event.clientX;
      viewport.scrollTop = drag.top + drag.y - event.clientY;
    });
    function stopDrag(event) {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      viewport.classList.remove('is-dragging');
    }
    ['pointerup','pointercancel','lostpointercapture'].forEach(function (name) { viewport.addEventListener(name, stopDrag); });
    image.addEventListener('error', function () {
      document.getElementById('map-image-error').classList.remove('hidden');
      viewport.classList.add('hidden');
      zoomIn.disabled = zoomOut.disabled = true;
    });
    image.addEventListener('load', function () {
      document.getElementById('map-image-error').classList.add('hidden');
      viewport.classList.remove('hidden');
      layout(zoom);
    });
    if (window.ResizeObserver) new ResizeObserver(function () { layout(zoom); }).observe(viewport);
    else window.addEventListener('resize', function () { layout(zoom); });
    if (image.complete && image.naturalWidth === 0) image.dispatchEvent(new Event('error'));
    else layout(zoom);
  }
  function init(callbacks) {
    actions = callbacks;
    initMap();
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
    document.querySelectorAll('[data-home-label]').forEach(function (el) { el.setAttribute('aria-label', strings[el.dataset.homeLabel] || copy.zh[el.dataset.homeLabel]); });
    document.querySelectorAll('[data-home-alt]').forEach(function (el) { el.alt = strings[el.dataset.homeAlt] || copy.zh[el.dataset.homeAlt]; });
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
