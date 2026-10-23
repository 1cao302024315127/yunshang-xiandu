/*
 * 轻量级 WebGL 等距柱状全景渲染引擎 (自研, 零外部依赖)
 *
 * 采用"全屏四边形 + 片元着色器按视线方向采样等距柱状贴图"的方案,
 * 等价于 Three.js 的全景球渲染, 但体积更小、离线可用。
 * 后续若替换为 Three.js / Krpano, 只需把本类的 setPano / setHotspots 接口
 * 迁移过去, 上层 app.js 无需改动。
 */
(function (global) {
  'use strict';

  var PI = Math.PI;
  var DEG = PI / 180;
  var FOV_Y = 75 * DEG;              // 垂直视场角
  var TAN_HALF_FOV = Math.tan(FOV_Y / 2);
  var AUTO_SPEED = 0.9 * DEG;        // 自动旋转角速度(弧度/秒)
  var PITCH_LIMIT = 89 * DEG;

  var VERT_SRC = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}',
  ].join('\n');

  var FRAG_SRC = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform float uYaw;',
    'uniform float uPitch;',
    'uniform float uTanFov;',
    'uniform float uAspect;',
    'const float PI = 3.141592653589793;',
    'void main() {',
    '  vec2 ndc = vUv * 2.0 - 1.0;',
    '  float cy = cos(uYaw), sy = sin(uYaw);',
    '  float cp = cos(uPitch), sp = sin(uPitch);',
    '  vec3 F = vec3(sy * cp, sp, cy * cp);',
    '  vec3 R = vec3(cy, 0.0, -sy);',
    '  vec3 U = vec3(-sy * sp, cp, -cy * sp);',
    '  vec3 dir = normalize(F + R * (ndc.x * uTanFov * uAspect) + U * (ndc.y * uTanFov));',
    '  float u = 0.5 + atan(dir.x, dir.z) / (2.0 * PI);',
    '  float v = 0.5 + asin(clamp(dir.y, -1.0, 1.0)) / PI;',
    '  gl_FragColor = texture2D(uTex, vec2(u, v));',
    '}',
  ].join('\n');

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error('shader error: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  function PanoramaViewer(canvas, hotspotLayer) {
    this.canvas = canvas;
    this.layer = hotspotLayer;
    this.gl = canvas.getContext('webgl', { antialias: true }) ||
              canvas.getContext('experimental-webgl');
    if (!this.gl) {
      throw new Error('当前浏览器不支持 WebGL, 无法渲染全景。');
    }

    this.yaw = 0;
    this.pitch = 0;
    this.hotspots = [];
    this.onHotspotClick = null;
    this.onLoadingChange = null;

    this._texture = null;
    this._image = null;
    this._ready = false;
    this._aspect = 1;
    this._targetYaw = null;

    this._initGL();
    this._initEvents();
    this._resize();
    var self = this;
    window.addEventListener('resize', function () { self._resize(); });
    this._lastTime = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  PanoramaViewer.prototype._initGL = function () {
    var gl = this.gl;
    var prog = gl.createProgram();
    var vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('program link error: ' + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
    this.prog = prog;

    // 全屏三角形
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.uYaw = gl.getUniformLocation(prog, 'uYaw');
    this.uPitch = gl.getUniformLocation(prog, 'uPitch');
    this.uTanFov = gl.getUniformLocation(prog, 'uTanFov');
    this.uAspect = gl.getUniformLocation(prog, 'uAspect');
    this.uTex = gl.getUniformLocation(prog, 'uTex');

    // 纹理
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // 1x1 白像素占位, 避免未加载时黑屏闪烁
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([20, 24, 32, 255]));
    this._texture = tex;

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.clearColor(0.06, 0.08, 0.12, 1);
  };

  PanoramaViewer.prototype._resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = this.canvas.clientWidth;
    var h = this.canvas.clientHeight;
    if (w === 0 || h === 0) { w = window.innerWidth; h = window.innerHeight; }
    if (this._drag && (w !== this._w || h !== this._h || dpr !== this._dpr)) this.resetInteraction();
    this._w = w; this._h = h; this._dpr = dpr;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this._aspect = w / h;
  };

  PanoramaViewer.prototype._initEvents = function () {
    var self = this;
    this._drag = new global.RotationDrag(this.canvas, this, {
      pitchLimit: PITCH_LIMIT,
      autoSpeed: AUTO_SPEED,
      begin: function (e) { return self._setAnchor(e); },
      move: function (e) { self._dragTo(e); },
      reset: function () { self._anchor = null; self._targetYaw = null; },
    });
  };

  PanoramaViewer.prototype.resetInteraction = function () {
    if (this._drag) this._drag.reset();
    this._targetYaw = null;
  };

  PanoramaViewer.prototype._pointerRay = function (e) {
    var r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    var x = (2 * (e.clientX - r.left) / r.width - 1) * TAN_HALF_FOV * this._aspect;
    var y = (1 - 2 * (e.clientY - r.top) / r.height) * TAN_HALF_FOV;
    var length = Math.sqrt(x * x + y * y + 1);
    return [x / length, y / length, 1 / length];
  };

  PanoramaViewer.prototype._setAnchor = function (e) {
    var ray = this._pointerRay(e);
    if (!ray) return false;
    var cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    var cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    var z = cp * ray[2] - sp * ray[1];
    this._anchor = [cy * ray[0] + sy * z, cp * ray[1] + sp * ray[2], -sy * ray[0] + cy * z];
    this._anchorYaw = this.yaw;
    this._anchorPitch = this.pitch;
    return true;
  };

  function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

  PanoramaViewer.prototype._dragTo = function (e) {
    var ray = this._pointerRay(e), anchor = this._anchor;
    if (!ray || !anchor) return;
    // Invert the exact camera basis also used by the shader and _project.
    // There are two pitch solutions near a pole; keep the closest valid pose
    // to the press pose, so splitting a move into more events changes nothing.
    var radius = Math.sqrt(ray[1] * ray[1] + ray[2] * ray[2]);
    var ratio = anchor[1] / radius;
    var angle = Math.asin(Math.max(-1, Math.min(1, ratio)));
    var offset = Math.atan2(ray[1], ray[2]);
    var candidates = [angle - offset, PI - angle - offset];
    var best = null;
    for (var i = 0; i < candidates.length; i++) {
      var raw = wrapAngle(candidates[i]);
      var pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, raw));
      var q = Math.cos(pitch) * ray[2] - Math.sin(pitch) * ray[1];
      var yaw = Math.atan2(anchor[0], anchor[2]) - Math.atan2(ray[0], q);
      yaw = this._anchorYaw + wrapAngle(yaw - this._anchorYaw);
      var projectedY = Math.cos(pitch) * ray[1] + Math.sin(pitch) * ray[2];
      var error = Math.abs(projectedY - anchor[1]);
      var score = Math.pow(pitch - this._anchorPitch, 2) + Math.pow(yaw - this._anchorYaw, 2);
      if (!best || error < best.error - 1e-10 || (Math.abs(error - best.error) < 1e-10 && score < best.score)) {
        best = { yaw: yaw, pitch: pitch, error: error, score: score, limited: Math.abs(raw - pitch) > 1e-10 };
      }
    }
    this.yaw = best.yaw;
    this.pitch = best.pitch;
    // Rebase at a pitch limit or an unreachable polar ray; reversing the
    // pointer then responds immediately instead of unwinding an overshoot.
    if (best.limited || Math.abs(ratio) > 1) this._setAnchor(e);
  };

  PanoramaViewer.prototype.setPano = function (url) {
    this.resetInteraction();
    var self = this;
    var token = this._panoToken = (this._panoToken || 0) + 1;
    if (this.onLoadingChange) this.onLoadingChange(true);
    this._ready = false;
    var img = new Image();
    img.onload = function () {
      if (token !== self._panoToken) return;
      var gl = self.gl;
      gl.bindTexture(gl.TEXTURE_2D, self._texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      self._image = img;
      self._ready = true;
      if (self.onLoadingChange) self.onLoadingChange(false);
    };
    img.onerror = function () {
      if (token !== self._panoToken) return;
      if (self.onLoadingChange) self.onLoadingChange(false);
      if (self.onError) self.onError();
    };
    img.src = url;
  };

  PanoramaViewer.prototype.setHotspots = function (hotspots) {
    this.hotspots = hotspots || [];
    this.layer.innerHTML = '';
    var self = this;
    this.hotspots.forEach(function (h) {
      var el = document.createElement('div');
      el.className = 'hotspot';
      el.innerHTML = '<span class="hotspot-dot"></span><span class="hotspot-label"></span>';
      el.querySelector('.hotspot-dot').textContent = h.icon || '';
      el.querySelector('.hotspot-label').textContent = h.label;
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        if (self.onHotspotClick) self.onHotspotClick(h);
      });
      el._hotspot = h;
      self.layer.appendChild(el);
    });
    this._pinEls = Array.prototype.slice.call(this.layer.children);
  };

  // 将热点方向(纹理空间 yaw/pitch)投影到屏幕像素坐标
  PanoramaViewer.prototype._project = function (h) {
    var y0 = h.yaw * DEG, p0 = h.pitch * DEG;
    var cx = Math.cos(y0), sx = Math.sin(y0);
    var cp = Math.cos(p0), sp = Math.sin(p0);
    // 热点方向(世界空间)
    var hx = sx * cp, hy = sp, hz = cx * cp;

    var cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    var cp2 = Math.cos(this.pitch), sp2 = Math.sin(this.pitch);
    var F = [sy * cp2, sp2, cy * cp2];
    var R = [cy, 0, -sy];
    var U = [-sy * sp2, cp2, -cy * sp2];

    var cz = hx * F[0] + hy * F[1] + hz * F[2]; // 相机前向分量
    if (cz <= 0.01) return { visible: false };
    var cx2 = hx * R[0] + hy * R[1] + hz * R[2];
    var cy2 = hx * U[0] + hy * U[1] + hz * U[2];

    var nx = (cx2 / cz) / (TAN_HALF_FOV * this._aspect);
    var ny = (cy2 / cz) / TAN_HALF_FOV;
    if (Math.abs(nx) > 1.15 || Math.abs(ny) > 1.15) return { visible: false };

    var w = this.canvas.clientWidth, hh = this.canvas.clientHeight;
    return {
      visible: true,
      x: (nx * 0.5 + 0.5) * w,
      y: (-ny * 0.5 + 0.5) * hh,
    };
  };

  PanoramaViewer.prototype._updatePins = function () {
    if (!this._pinEls) return;
    var self = this;
    this._pinEls.forEach(function (el, i) {
      var h = el._hotspot;
      if (!h) return;
      var p = self._project(h);
      if (p.visible) {
        el.style.display = 'block';
        // -50% 水平居中, -11px 上移半个光点高度, 使光点中心对准投影点
        el.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px) translate(-50%, -11px)';
      } else {
        el.style.display = 'none';
      }
    });
  };

  PanoramaViewer.prototype._draw = function () {
    var gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(this.uYaw, this.yaw);
    gl.uniform1f(this.uPitch, this.pitch);
    gl.uniform1f(this.uTanFov, TAN_HALF_FOV);
    gl.uniform1f(this.uAspect, this._aspect);
    gl.uniform1i(this.uTex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  PanoramaViewer.prototype._loop = function (now) {
    var dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;

    if (this._targetYaw !== null) {
      this._drag.lastTick = now;
      // 镜头缓动转向目标(faceYaw)
      var diff = this._targetYaw - this.yaw;
      if (Math.abs(diff) < 0.003) {
        this.yaw = this._targetYaw;
        this._targetYaw = null;
      } else {
        this.yaw += diff * Math.min(1, dt * 5);
      }
    } else this._drag.tick(now);

    this._updatePins();
    this._draw();
    requestAnimationFrame(this._loop);
  };

  // 让镜头平滑转向指定方位角(度), 用于进入场景时对准首个热点
  PanoramaViewer.prototype.faceYaw = function (yawDeg) {
    this.resetInteraction();
    var target = yawDeg * DEG;
    var d = target - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));  // 取最短路径
    this._targetYaw = this.yaw + d;
  };

  global.PanoramaViewer = PanoramaViewer;
})(window);
