// Deterministic pointer/clock tests against the actual renderers and geometry.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const DEG = Math.PI / 180;
const close = (actual, expected, label = '') =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${label}: ${actual} != ${expected}`);

function eventTarget() {
  const handlers = {};
  return {
    addEventListener(name, fn) { (handlers[name] ||= []).push(fn); },
    emit(name, event = {}) { (handlers[name] || []).forEach(fn => fn(event)); },
  };
}

function createViewer(kind, {width = 1280, height = 720, dpr = 1} = {}) {
  let now = 0;
  const window = Object.assign(eventTarget(), {devicePixelRatio: dpr, innerWidth: width, innerHeight: height});
  const document = Object.assign(eventTarget(), {hidden: false});
  const captures = new Set(), frames = [], uploads = [];
  const gl = {
    getShaderParameter: () => true, getProgramParameter: () => true,
    getAttribLocation: () => 0, getUniformLocation: () => ({}),
    createProgram: () => ({}), createShader: () => ({}),
    createBuffer: () => ({}), createTexture: () => ({}),
    bufferData(target, data) { uploads.push(Array.from(data)); },
  };
  ['shaderSource', 'compileShader', 'attachShader', 'linkProgram', 'useProgram',
    'bindBuffer', 'enableVertexAttribArray', 'vertexAttribPointer', 'bindTexture',
    'texParameteri', 'texImage2D', 'pixelStorei', 'clearColor', 'viewport', 'enable',
    'clear', 'uniform1f', 'uniform1i', 'drawArrays'].forEach(name => { gl[name] = () => {}; });
  const canvas = Object.assign(eventTarget(), {
    clientWidth: width, clientHeight: height, getContext: () => gl,
    getBoundingClientRect() { return {left: 35, top: 60, width: this.clientWidth, height: this.clientHeight}; },
    setPointerCapture(id) { captures.add(id); },
    hasPointerCapture: id => captures.has(id),
    releasePointerCapture(id) {
      captures.delete(id);
      canvas.emit('lostpointercapture', {pointerId: id});
    },
  });
  const context = {window, document, performance: {now: () => now},
    requestAnimationFrame: fn => frames.push(fn), Image: function () {}, console};
  vm.createContext(context);
  for (const name of ['rotation-drag', 'panorama', 'artifact3d']) {
    vm.runInContext(fs.readFileSync(path.join(root, `static/js/${name}.js`), 'utf8'), context);
  }
  const viewer = kind === 'pano' ? new window.PanoramaViewer(canvas, {}) : new window.Artifact3D(canvas);
  const r = {
    viewer, window, document, canvas, captures, uploads,
    at(value) { now = value; },
    pointer(name, x, y, time, extra = {}, target = canvas) {
      now = time;
      const e = Object.assign({clientX: x + 35, clientY: y + 60, pointerId: 1,
        button: 0, buttons: name === 'pointerup' ? 0 : 1,
        pointerType: 'mouse', isPrimary: true, preventDefault() {}}, extra);
      target.emit(name, e);
    },
    tick(time) { now = time; viewer._loop(time); },
    resize(w, h, ratio = dpr) {
      canvas.clientWidth = w; canvas.clientHeight = h;
      window.devicePixelRatio = ratio; window.innerWidth = w; window.innerHeight = h;
      window.emit('resize');
    },
  };
  return r;
}

function panoramaGrabProjection() {
  for (const [width, height] of [[1280, 720], [1920, 1080], [390, 844]]) {
    for (const dpr of [1, 2]) for (const pitch of [-0.6, 0, 0.6]) {
      for (const [dx, dy] of [[80, 30], [-80, -30], [60, -40], [-40, 50]]) {
        const r = createViewer('pano', {width, height, dpr}), v = r.viewer;
        v.yaw = 6.2; v.pitch = pitch;
        const point = {yaw: (v.yaw / DEG) + 7, pitch: (pitch / DEG) + 4};
        const start = v._project(point);
        assert.equal(start.visible, true);
        r.pointer('pointerdown', start.x, start.y, 0);
        r.pointer('pointermove', start.x + dx, start.y + dy, 100);
        r.tick(100);
        const result = v._project(point);
        assert.equal(result.visible, true);
        assert.ok(Math.hypot(result.x - start.x - dx, result.y - start.y - dy) < 1,
          `grab drift at ${width}x${height}, DPR ${dpr}, pitch ${pitch}`);
      }
    }
  }
  for (const [dx, dy] of [[80, 0], [-80, 0], [0, 40], [0, -40]]) {
    const r = createViewer('pano');
    r.pointer('pointerdown', 640, 360, 0);
    r.pointer('pointermove', 640 + dx, 360 + dy, 100);
    if (dx) assert.equal(Math.sign(r.viewer.yaw), -Math.sign(dx));
    if (dy) assert.equal(Math.sign(r.viewer.pitch), Math.sign(dy));
  }
}

function dragEventRateAndDistance() {
  for (const kind of ['pano', 'artifact']) {
    let expected;
    for (const events of [1, 10, 100]) for (const duration of [100, 1000]) {
      const r = createViewer(kind, {width: 900, height: 600});
      const initial = {yaw: r.viewer.yaw, pitch: r.viewer.pitch};
      r.pointer('pointerdown', 450, 300, 0);
      for (let i = 1; i <= events; i++) r.pointer('pointermove', 450 + 60 * i / events, 300 + 20 * i / events, duration * i / events);
      if (!expected) expected = {yaw: r.viewer.yaw, pitch: r.viewer.pitch};
      close(r.viewer.yaw, expected.yaw, `${kind} event-rate yaw`);
      close(r.viewer.pitch, expected.pitch, `${kind} event-rate pitch`);
      // Holding a stationary pointer must not rotate, even after four seconds.
      r.tick(duration + 5000);
      close(r.viewer.yaw, expected.yaw);
      close(r.viewer.pitch, expected.pitch);
      r.pointer('pointermove', 450, 300, duration + 5010);
      close(r.viewer.yaw, initial.yaw, `${kind} return to start`);
      close(r.viewer.pitch, initial.pitch);
    }
  }
}

function artifactProjectionScaling() {
  for (const type of ['bianzhong', 'ding']) for (const [width, height] of [[620, 300], [320, 300]]) {
    for (const dpr of [1, 2]) for (const [dx, dy] of [[30, 0], [-30, 0], [0, 20], [0, -20], [30, 20]]) {
      const r = createViewer('artifact', {width, height, dpr}), v = r.viewer;
      v.setType(type); v._draw();
      // Measure the actual rendered vertex stream, including perspective.
      const data = r.uploads.at(-1), xs = [], ys = [];
      for (let i = 0; i < data.length; i += 5) { xs.push(data[i]); ys.push(data[i + 1]); }
      assert.equal(data.every(Number.isFinite), true);
      const modelWidth = (Math.max(...xs) - Math.min(...xs)) * width / 2;
      const modelHeight = (Math.max(...ys) - Math.min(...ys)) * height / 2;
      const initial = {yaw: v.yaw, pitch: v.pitch};
      r.pointer('pointerdown', width / 2, height / 2, 0);
      r.pointer('pointermove', width / 2 + dx, height / 2 + dy, 100);
      assert.ok(Math.abs(v.yaw - initial.yaw + 2 * dx / modelWidth) < 1e-6);
      assert.ok(Math.abs(v.pitch - initial.pitch + 2 * dy / modelHeight) < 1e-6);
      r.pointer('pointermove', width / 2 + 2 * dx, height / 2 + 2 * dy, 200);
      assert.ok(Math.abs(v.yaw - initial.yaw + 4 * dx / modelWidth) < 1e-6);
      assert.ok(Math.abs(v.pitch - initial.pitch + 4 * dy / modelHeight) < 1e-6);
    }
  }
}

function pointerLifecycleAndCancellation() {
  for (const kind of ['pano', 'artifact']) {
    const r = createViewer(kind), v = r.viewer;
    const initial = v.yaw;
    r.pointer('pointermove', 650, 360, 0); // A pressed mouse entering the canvas is not a drag.
    r.pointer('pointerdown', 640, 360, 0, {button: 2, buttons: 2});
    r.pointer('pointerdown', 640, 360, 0, {pointerId: 2, isPrimary: false, pointerType: 'touch'});
    assert.equal(v._drag.dragging, false);
    close(v.yaw, initial);
    r.pointer('pointerdown', 640, 360, 0);
    r.pointer('pointerdown', 650, 360, 0, {pointerId: 2});
    r.pointer('pointermove', 750, 360, 10, {pointerId: 2});
    r.pointer('pointerup', 750, 360, 10, {pointerId: 2});
    assert.equal(v._drag.pointerId, 1);
    close(v.yaw, initial);
    r.canvas.emit('pointerleave', {pointerId: 1});
    assert.equal(v._drag.dragging, true);
    r.pointer('pointermove', 1400, 360, 50);
    r.pointer('pointerup', 1420, 360, 60, {}, r.window);
    assert.equal(v._drag.dragging, false);
    assert.equal(r.captures.size, 0);
    assert.notEqual(v.yaw, initial);

    for (const cancel of ['pointercancel', 'lostpointercapture', 'blur', 'hidden', 'resize', 'replace', 'reset', 'buttons']) {
      for (const released of [false, true]) {
        const r = createViewer(kind), v = r.viewer;
        let taps = 0; v.onTap = () => { taps++; }; v._chime = () => {};
        r.pointer('pointerdown', 640, 360, 0);
        r.pointer('pointermove', 680, 370, 100);
        if (released) r.pointer('pointerup', 680, 370, 100);
        r.at(110);
        if (cancel === 'blur') r.window.emit('blur');
        else if (cancel === 'hidden') { r.document.hidden = true; r.document.emit('visibilitychange'); }
        else if (cancel === 'resize') r.resize(900, 600, 2);
        else if (cancel === 'replace') kind === 'pano' ? v.setPano('next.jpg') : v.setType('ding');
        else if (cancel === 'reset') v.resetInteraction();
        else if (cancel === 'buttons' && !released) r.pointer('pointermove', 680, 370, 110, {buttons: 0});
        else if (!released) r.canvas.emit(cancel, {pointerId: 1});
        else continue; // Pointer cancellation is only relevant to an active pointer.
        const pose = {yaw: v.yaw, pitch: v.pitch};
        assert.equal(v._drag.dragging, false, `${kind} ${cancel}`);
        assert.equal(v._drag.inertia, null, `${kind} ${cancel}`);
        assert.equal(r.captures.size, 0);
        r.tick(500);
        close(v.yaw, pose.yaw, `${kind} cancelled yaw`);
        close(v.pitch, pose.pitch);
        assert.equal(taps, 0);
      }
    }
    // Single-finger touch and pen input use the same active-pointer path.
    for (const pointerType of ['touch', 'pen']) {
      const r = createViewer(kind);
      r.pointer('pointerdown', 640, 360, 0, {pointerType});
      r.pointer('pointermove', 670, 370, 80, {pointerType});
      r.pointer('pointerup', 670, 370, 80, {pointerType});
      assert.equal(r.viewer._drag.dragging, false);
      assert.ok(r.viewer._drag.inertia);
    }
  }
}

function pitchLimitsAndTap() {
  for (const kind of ['pano', 'artifact']) for (const direction of [-1, 1]) {
    const r = createViewer(kind), v = r.viewer;
    const limit = kind === 'pano' ? 89 * DEG : 1.2;
    v.pitch = direction * (limit - 0.01);
    const pointerDirection = kind === 'pano' ? direction : -direction;
    r.pointer('pointerdown', 640, 360, 0);
    r.pointer('pointermove', 640, 360 + pointerDirection * 1000, 100);
    close(v.pitch, direction * limit, `${kind} pitch limit`);
    r.pointer('pointermove', 640, 360 + pointerDirection * 999, 110);
    assert.ok(direction * v.pitch < limit, `${kind} reverse must respond immediately`);
  }
  for (const mode of ['click', 'small', 'long', 'out-and-back', 'release-move', 'cancel']) {
    const r = createViewer('artifact');
    let taps = 0, chimes = 0;
    r.viewer.onTap = () => { taps++; }; r.viewer._chime = () => { chimes++; };
    r.pointer('pointerdown', 640, 360, 0);
    if (mode === 'small') r.pointer('pointermove', 643, 360, 50);
    if (mode === 'out-and-back') r.pointer('pointermove', 670, 360, 50);
    if (mode === 'cancel') r.canvas.emit('pointercancel', {pointerId: 1});
    r.pointer('pointerup', mode === 'release-move' ? 670 : 640, 360, mode === 'long' ? 400 : 100);
    const expected = ['click', 'small'].includes(mode) ? 1 : 0;
    assert.equal(taps, expected, mode); assert.equal(chimes, expected, mode);
  }
}

function release(r, duration = 100) {
  r.pointer('pointerdown', 640, 360, 0);
  for (let i = 1; i <= 10; i++) r.pointer('pointermove', 640 + 30 * i / 10, 360 + 10 * i / 10, duration * i / 10);
  r.pointer('pointerup', 670, 370, duration);
  assert.ok(r.viewer._drag.inertia, 'normal capture release preserves inertia');
}

function inertiaTimingAndFrameRates() {
  for (const kind of ['pano', 'artifact']) {
    let expected;
    for (const fps of [30, 60, 120]) {
      const r = createViewer(kind), v = r.viewer;
      release(r);
      assert.ok(Math.hypot(v.vx, v.vy) <= 4 + 1e-9);
      const end = v._drag.inertia.end;
      assert.ok(end <= 700);
      for (let t = 100 + 1000 / fps; t < 800; t += 1000 / fps) r.tick(t);
      r.tick(800);
      const actual = {yaw: v.yaw, pitch: v.pitch, resume: v._drag.resumeAt};
      if (!expected) expected = actual;
      close(actual.yaw, expected.yaw, `${kind} ${fps} FPS inertia yaw`);
      close(actual.pitch, expected.pitch);
      close(actual.resume, expected.resume);
      close(v._drag.resumeAt, end + 4000);
      assert.equal(v._drag.inertia, null);
      r.tick(end + 3999); close(v.yaw, actual.yaw);
      r.tick(end + 4000); close(v.yaw, actual.yaw);
      r.tick(end + 4100);
      close(v.yaw, actual.yaw + (kind === 'pano' ? 0.9 * DEG : 0.5) * 0.1);
    }
    for (const hold of [80, 200]) {
      const r = createViewer(kind);
      r.pointer('pointerdown', 640, 360, 0);
      r.pointer('pointermove', 670, 370, 100);
      r.pointer('pointerup', 670, 370, 100 + hold);
      assert.equal(r.viewer._drag.inertia, null, `${kind} stationary release`);
    }
    const fast = createViewer(kind), slow = createViewer(kind);
    release(fast, 100); release(slow, 1000);
    assert.ok(Math.hypot(fast.viewer.vx, fast.viewer.vy) > Math.hypot(slow.viewer.vx, slow.viewer.vy));
    const r = createViewer(kind);
    release(r); r.tick(150);
    const yaw = r.viewer.yaw, pitch = r.viewer.pitch;
    r.pointer('pointerdown', 670, 370, 150);
    r.tick(300);
    close(r.viewer.yaw, yaw); close(r.viewer.pitch, pitch);
    assert.equal(r.viewer._drag.inertia, null);
  }
}

module.exports = [panoramaGrabProjection, dragEventRateAndDistance, artifactProjectionScaling,
  pointerLifecycleAndCancellation, pitchLimitsAndTap, inertiaTimingAndFrameRates];
if (require.main === module) {
  for (const test of module.exports) { test(); console.log('PASS ' + test.name); }
}
