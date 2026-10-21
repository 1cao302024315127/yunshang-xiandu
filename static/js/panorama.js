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
  var RESUME_DELAY = 4000;           // 交互后自动旋转恢复延迟(毫秒)

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
    this._dragging = false;
    this._resumeAt = 0;
    this._lastX = 0;
    this._lastY = 0;
    this._aspect = 1;
    this.vx = 0;
    this.vy = 0;
    this._lastMoveTime = 0;
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
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this._aspect = w / h;
  };

  PanoramaViewer.prototype._initEvents = function () {
    var self = this;
    var c = this.canvas;

    function pos(e) {
      var r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    c.addEventListener('pointerdown', function (e) {
      self._dragging = true;
      self._resumeAt = Infinity;
      self._targetYaw = null;
      self.vx = 0; self.vy = 0;
      var p = pos(e);
      self._lastX = p.x; self._lastY = p.y;
      self._lastMoveTime = performance.now();
      c.setPointerCapture && c.setPointerCapture(e.pointerId);
    });

    c.addEventListener('pointermove', function (e) {
      if (!self._dragging) return;
      var p = pos(e);
      var dx = p.x - self._lastX;
      var dy = p.y - self._lastY;
      self._lastX = p.x; self._lastY = p.y;
      var now = performance.now();
      var dt = Math.max((now - self._lastMoveTime) / 1000, 0.001);
      self._lastMoveTime = now;
      self.yaw += dx * 0.005;
      self.pitch += dy * 0.005;
      if (self.pitch > 89 * DEG) self.pitch = 89 * DEG;
      if (self.pitch < -89 * DEG) self.pitch = -89 * DEG;
      self.vx = (dx * 0.005) / dt;   // 记录角速度, 松手后惯性滑行
      self.vy = (dy * 0.005) / dt;
    });

    function end() {
      self._dragging = false;
      self._resumeAt = performance.now() + RESUME_DELAY;
    }
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', end);
  };

  PanoramaViewer.prototype.setPano = function (url) {
    var self = this;
    if (this.onLoadingChange) this.onLoadingChange(true);
    this._ready = false;
    var img = new Image();
    img.onload = function () {
      var gl = self.gl;
      gl.bindTexture(gl.TEXTURE_2D, self._texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      self._image = img;
      self._ready = true;
      if (self.onLoadingChange) self.onLoadingChange(false);
    };
    img.onerror = function () {
      if (self.onLoadingChange) self.onLoadingChange(false);
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
      // 镜头缓动转向目标(faceYaw)
      var diff = this._targetYaw - this.yaw;
      if (Math.abs(diff) < 0.003) {
        this.yaw = this._targetYaw;
        this._targetYaw = null;
      } else {
        this.yaw += diff * Math.min(1, dt * 5);
      }
    } else if (!this._dragging) {
      // 惯性滑行
      if (Math.abs(this.vx) > 0.02 || Math.abs(this.vy) > 0.02) {
        this.yaw += this.vx * dt;
        this.pitch += this.vy * dt;
        if (this.pitch > 89 * DEG) this.pitch = 89 * DEG;
        if (this.pitch < -89 * DEG) this.pitch = -89 * DEG;
        var f = Math.pow(0.05, dt);
        this.vx *= f; this.vy *= f;
        this._resumeAt = now + RESUME_DELAY;
      } else if (now >= this._resumeAt) {
        this.yaw += AUTO_SPEED * dt;
      }
    }

    this._updatePins();
    this._draw();
    requestAnimationFrame(this._loop);
  };

  // 让镜头平滑转向指定方位角(度), 用于进入场景时对准首个热点
  PanoramaViewer.prototype.faceYaw = function (yawDeg) {
    var target = yawDeg * DEG;
    var d = target - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));  // 取最短路径
    this._targetYaw = this.yaw + d;
  };

  global.PanoramaViewer = PanoramaViewer;
})(window);
