/*
 * 轻量级 WebGL 3D 器物渲染器 (自研, 零外部依赖)
 *
 * 用程序化几何体(盒子 + 圆台)近似建模「编钟」「鼎」, 支持拖拽旋转、自动旋转、
 * 点击敲响(Web Audio 合成钟声)。几何体为近似, 后续可替换为真实 glTF 模型。
 */
(function (global) {
  'use strict';

  var VERT = [
    'attribute vec2 aPos;',
    'attribute vec3 aColor;',
    'varying vec3 vColor;',
    'void main() { gl_Position = vec4(aPos, 0.0, 1.0); vColor = aColor; }',
  ].join('\n');
  var FRAG = [
    'precision mediump float;',
    'varying vec3 vColor;',
    'void main() { gl_FragColor = vec4(vColor, 1.0); }',
  ].join('\n');

  function box(tris, cx, cy, cz, sx, sy, sz, c) {
    var x0 = cx - sx / 2, x1 = cx + sx / 2;
    var y0 = cy - sy / 2, y1 = cy + sy / 2;
    var z0 = cz - sz / 2, z1 = cz + sz / 2;
    var v = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
    ];
    var faces = [[4, 5, 6, 7], [1, 0, 3, 2], [5, 1, 2, 6], [0, 4, 7, 3], [3, 7, 6, 2], [0, 1, 5, 4]];
    faces.forEach(function (f) {
      var a = v[f[0]], b = v[f[1]], d = v[f[2]], e = v[f[3]];
      tris.push([a, b, d, c]);
      tris.push([a, d, e, c]);
    });
  }

  // 圆台(上窄下宽等), 无顶底盖
  function cone(tris, topY, topR, botY, botR, seg, c) {
    for (var i = 0; i < seg; i++) {
      var a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      var t0 = [Math.cos(a0) * topR, topY, Math.sin(a0) * topR];
      var t1 = [Math.cos(a1) * topR, topY, Math.sin(a1) * topR];
      var b0 = [Math.cos(a0) * botR, botY, Math.sin(a0) * botR];
      var b1 = [Math.cos(a1) * botR, botY, Math.sin(a1) * botR];
      tris.push([b0, b1, t0, c]);
      tris.push([t0, b1, t1, c]);
    }
  }

  function buildDing() {
    var tris = [];
    var body = [0.66, 0.50, 0.30], dark = [0.54, 0.40, 0.23];
    box(tris, 0, 0.18, 0, 1.0, 0.6, 0.82, body);          // 鼎身
    box(tris, 0, 0.5, 0, 1.18, 0.12, 0.96, dark);          // 口沿
    [90, 210, 330].forEach(function (deg) {                 // 三足
      var a = (deg * Math.PI) / 180;
      box(tris, Math.cos(a) * 0.36, -0.4, Math.sin(a) * 0.36, 0.13, 0.5, 0.13, dark);
    });
    box(tris, -0.42, 0.66, 0, 0.3, 0.18, 0.14, dark);       // 双耳
    box(tris, 0.42, 0.66, 0, 0.3, 0.18, 0.14, dark);
    return tris;
  }

  function buildBianzhong() {
    var tris = [];
    var body = [0.6, 0.48, 0.27], dark = [0.48, 0.37, 0.2];
    cone(tris, 0.55, 0.2, -0.3, 0.42, 26, body);           // 钟身(喇叭形)
    cone(tris, -0.3, 0.42, -0.48, 0.47, 26, dark);          // 底部口沿
    cone(tris, 0.82, 0.09, 0.55, 0.09, 12, dark);           // 顶部钮柱
    box(tris, 0, 0.82, 0, 0.26, 0.07, 0.1, dark);           // 顶部横梁
    return tris;
  }

  function Artifact3D(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { antialias: true }) ||
              canvas.getContext('experimental-webgl');
    if (!this.gl) throw new Error('no webgl');
    this.yaw = 0.6;
    this.pitch = 0.18;
    this.auto = true;
    this.onTap = null;
    this.tris = buildBianzhong();
    this._initGL();
    this._resize();
    var self = this;
    window.addEventListener('resize', function () { self._resize(); });
    this._bindDrag();
    this._last = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  Artifact3D.prototype._initGL = function () {
    var gl = this.gl;
    var mk = function (type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    var p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    gl.useProgram(p);
    this.prog = p;
    this.aPos = gl.getAttribLocation(p, 'aPos');
    this.aColor = gl.getAttribLocation(p, 'aColor');
    this.buf = gl.createBuffer();
    gl.clearColor(0.09, 0.11, 0.16, 1);
    gl.enable(gl.DEPTH_TEST);
  };

  Artifact3D.prototype._resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) { w = 320; h = 280; }
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this._w = w; this._h = h;
  };

  Artifact3D.prototype._bindDrag = function () {
    var self = this, c = this.canvas;
    var downX = 0, downY = 0, moved = false, t0 = 0;
    c.addEventListener('pointerdown', function (e) {
      self.auto = false;
      downX = e.clientX; downY = e.clientY; moved = false; t0 = performance.now();
      c.setPointerCapture && c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', function (e) {
      if (e.buttons !== 1 && e.pointerType !== 'touch') return;
      var dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      self.yaw += dx * 0.01;
      self.pitch = Math.max(-1.2, Math.min(1.2, self.pitch + dy * 0.01));
    });
    c.addEventListener('pointerup', function (e) {
      var dt = performance.now() - t0;
      var dx = e.clientX - downX, dy = e.clientY - downY;
      if (!moved && dt < 400 && Math.abs(dx) + Math.abs(dy) < 6) {
        if (self.onTap) self.onTap();
        self._chime();
      }
      self.auto = true;
    });
  };

  Artifact3D.prototype._chime = function () {
    try {
      var ctx = this.actx || (this.actx = new (window.AudioContext || window.webkitAudioContext)());
      var now = ctx.currentTime;
      [880, 1318, 1760].forEach(function (f, i) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * (1 + Math.random() * 0.02);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.28 / (i + 1), now + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
        o.connect(g); g.connect(ctx.destination);
        o.start(now); o.stop(now + 1.2);
      });
    } catch (e) { /* ignore */ }
  };

  Artifact3D.prototype.setType = function (type) {
    this.tris = type === 'ding' ? buildDing() : buildBianzhong();
    this.yaw = 0.6;
  };

  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function norm(a) {
    var l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  Artifact3D.prototype._loop = function (now) {
    var dt = Math.min((now - this._last) / 1000, 0.1);
    this._last = now;
    if (this.auto) this.yaw += dt * 0.5;
    this._draw();
    requestAnimationFrame(this._loop);
  };

  Artifact3D.prototype._draw = function () {
    var gl = this.gl;
    var cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    var cx = Math.cos(this.pitch), sx = Math.sin(this.pitch);
    var D = 4.2, SCALE = 1.9;
    var L = norm([0.5, 0.8, 0.6]);
    var items = [];

    this.tris.forEach(function (t) {
      var r = [];
      for (var k = 0; k < 3; k++) {
        var p = t[k];
        var x = cy * p[0] + sy * p[2];
        var z = -sy * p[0] + cy * p[2];
        var y = cx * p[1] - sx * z;
        var z2 = sx * p[1] + cx * z;
        r.push([x, y, z2]);
      }
      var n = norm(cross(sub(r[1], r[0]), sub(r[2], r[0])));
      var shade = 0.32 + 0.72 * Math.max(dot(n, L), 0);
      var col = [t[3][0] * shade, t[3][1] * shade, t[3][2] * shade];
      var depth = (r[0][2] + r[1][2] + r[2][2]) / 3;
      var sc = [];
      for (var k = 0; k < 3; k++) {
        var persp = D / (D - r[k][2]);
        sc.push([r[k][0] * persp / SCALE, r[k][1] * persp / SCALE]);
      }
      items.push({ depth: depth, s: sc, c: col });
    });

    items.sort(function (a, b) { return a.depth - b.depth; }); // 远在前

    var verts = new Float32Array(items.length * 3 * 5);
    var o = 0;
    items.forEach(function (it) {
      for (var k = 0; k < 3; k++) {
        verts[o++] = it.s[k][0];
        verts[o++] = it.s[k][1];
        verts[o++] = it.c[0];
        verts[o++] = it.c[1];
        verts[o++] = it.c[2];
      }
    });

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(this.aColor);
    gl.vertexAttribPointer(this.aColor, 3, gl.FLOAT, false, 20, 8);
    gl.drawArrays(gl.TRIANGLES, 0, items.length * 3);
  };

  global.Artifact3D = Artifact3D;
})(window);
