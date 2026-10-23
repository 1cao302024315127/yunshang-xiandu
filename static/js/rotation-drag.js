/* Shared pointer lifecycle and time-based inertia for the two WebGL viewers. */
(function (global) {
  'use strict';

  var SAMPLE_MS = 80;
  var MAX_SPEED = 4;
  var TAU = 0.120;
  var STOP_SPEED = 0.02;
  var MAX_INERTIA_MS = 600;
  var RESUME_DELAY = 4000;

  function RotationDrag(canvas, pose, options) {
    this.canvas = canvas;
    this.pose = pose;
    this.options = options;
    this.pointerId = null;
    this.dragging = false;
    this.samples = [];
    this.inertia = null;
    this.resumeAt = 0;
    this.lastTick = performance.now();
    pose.vx = pose.vy = 0;

    var self = this;
    canvas.addEventListener('pointerdown', function (e) { self._down(e); });
    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerId !== self.pointerId) return;
      if (e.pointerType !== 'touch' && !(e.buttons & 1)) { self.reset(); return; }
      self._move(e, performance.now());
    });
    function up(e) { self._up(e); }
    function cancel(e) { if (e.pointerId === self.pointerId) self.reset(); }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel);
    canvas.addEventListener('lostpointercapture', cancel);
    // Window listeners also cover browsers where pointer capture is unavailable.
    global.addEventListener('pointerup', up);
    global.addEventListener('pointercancel', cancel);
    global.addEventListener('blur', function () { self.reset(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) self.reset();
    });
  }

  RotationDrag.prototype._releaseCapture = function () {
    var id = this.pointerId;
    this.pointerId = null; // lostpointercapture must not cancel a completed fling.
    if (id === null || !this.canvas.releasePointerCapture) return;
    try {
      if (!this.canvas.hasPointerCapture || this.canvas.hasPointerCapture(id)) {
        this.canvas.releasePointerCapture(id);
      }
    } catch (e) { /* The browser may already have released the pointer. */ }
  };

  RotationDrag.prototype.reset = function () {
    this.dragging = false;
    this.inertia = null;
    this.samples = [];
    this.pose.vx = this.pose.vy = 0;
    this.lastTick = performance.now();
    this.resumeAt = this.lastTick + RESUME_DELAY;
    this._releaseCapture();
    this.options.reset();
  };

  RotationDrag.prototype._down = function (e) {
    if (this.pointerId !== null || e.isPrimary === false || e.button !== 0) return;
    this.reset();
    if (this.options.begin(e) === false) return;
    var now = performance.now();
    this.pointerId = e.pointerId;
    this.dragging = true;
    this.resumeAt = Infinity;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.downAt = this.lastMotionAt = now;
    this.moved = false;
    this._record(now);
    try {
      if (this.canvas.setPointerCapture) this.canvas.setPointerCapture(e.pointerId);
    } catch (err) { /* Window pointerup remains available as a fallback. */ }
    e.preventDefault();
  };

  RotationDrag.prototype._record = function (now) {
    this.samples.push({ t: now, yaw: this.pose.yaw, pitch: this.pose.pitch });
    // Keep one sample before the window so its start can be interpolated.
    while (this.samples.length > 2 && this.samples[1].t <= now - SAMPLE_MS) {
      this.samples.shift();
    }
  };

  RotationDrag.prototype._move = function (e, now) {
    var dx = e.clientX - this.downX, dy = e.clientY - this.downY;
    if (dx * dx + dy * dy > 25) this.moved = true;
    var yaw = this.pose.yaw, pitch = this.pose.pitch;
    if (!this.options.tap || this.moved) this.options.move(e);
    if (Math.abs(this.pose.yaw - yaw) + Math.abs(this.pose.pitch - pitch) > 1e-10) {
      this.lastMotionAt = now;
    }
    this._record(now);
    e.preventDefault();
  };

  RotationDrag.prototype._up = function (e) {
    if (e.pointerId !== this.pointerId) return;
    var now = performance.now();
    this._move(e, now); // Include a final position not delivered by pointermove.
    var tap = this.options.tap && !this.moved && now - this.downAt < 400;
    this.dragging = false;
    this._releaseCapture();
    this._startInertia(now);
    this.samples = [];
    this.options.reset();
    if (tap) this.options.tap();
  };

  function axisDuration(speed) {
    return Math.abs(speed) <= STOP_SPEED ? 0 :
      Math.min(MAX_INERTIA_MS, TAU * 1000 * Math.log(Math.abs(speed) / STOP_SPEED));
  }

  RotationDrag.prototype._startInertia = function (now) {
    this.inertia = null;
    this.pose.vx = this.pose.vy = 0;
    this.lastTick = now;
    this.resumeAt = now + RESUME_DELAY;
    if (now - this.lastMotionAt >= SAMPLE_MS || this.samples.length < 2) return;
    var first = this.samples[0], last = this.samples[this.samples.length - 1];
    var start = Math.max(first.t, now - SAMPLE_MS);
    var yaw = first.yaw, pitch = first.pitch;
    if (first.t < start) {
      var next = this.samples[1];
      var f = (start - first.t) / Math.max(next.t - first.t, 0.001);
      yaw += (next.yaw - yaw) * f;
      pitch += (next.pitch - pitch) * f;
    }
    var dt = (now - start) / 1000;
    if (dt <= 0) return;
    var vx = (last.yaw - yaw) / dt, vy = (last.pitch - pitch) / dt;
    var speed = Math.sqrt(vx * vx + vy * vy);
    var scale = speed > MAX_SPEED ? MAX_SPEED / speed : 1;
    vx *= scale; vy *= scale;
    var durationX = axisDuration(vx), durationY = axisDuration(vy);
    // Stop vertical motion exactly when the pitch limit is reached.
    if (durationY) {
      var distance = this.options.pitchLimit - (vy > 0 ? this.pose.pitch : -this.pose.pitch);
      var ratio = Math.max(0, distance) / (Math.abs(vy) * TAU);
      if (ratio < 1) durationY = Math.min(durationY, -TAU * 1000 * Math.log(1 - ratio));
    }
    if (!durationX) vx = 0;
    if (!durationY) vy = 0;
    var duration = Math.max(durationX, durationY);
    if (!duration) return;
    this.pose.vx = vx; this.pose.vy = vy;
    this.inertia = {
      start: now, end: now + duration, yaw: this.pose.yaw, pitch: this.pose.pitch,
      vx: vx, vy: vy, durationX: durationX, durationY: durationY,
    };
    this.resumeAt = Infinity;
  };

  RotationDrag.prototype.tick = function (now) {
    var previous = this.lastTick;
    this.lastTick = now;
    if (this.dragging) return;
    var motion = this.inertia;
    if (motion) {
      // Integrate from the release pose, not once per frame. Both the final
      // angle and the auto-rotation deadline are independent of frame rate.
      var elapsed = Math.max(0, now - motion.start);
      var tx = Math.min(elapsed, motion.durationX) / 1000;
      var ty = Math.min(elapsed, motion.durationY) / 1000;
      this.pose.yaw = motion.yaw + motion.vx * TAU * (1 - Math.exp(-tx / TAU));
      var pitch = motion.pitch + motion.vy * TAU * (1 - Math.exp(-ty / TAU));
      this.pose.pitch = Math.max(-this.options.pitchLimit, Math.min(this.options.pitchLimit, pitch));
      this.pose.vx = elapsed < motion.durationX ? motion.vx * Math.exp(-tx / TAU) : 0;
      this.pose.vy = elapsed < motion.durationY ? motion.vy * Math.exp(-ty / TAU) : 0;
      if (now >= motion.end) {
        this.inertia = null;
        this.resumeAt = motion.end + RESUME_DELAY;
      }
    }
    if (!this.inertia && this.pose.auto !== false && now > this.resumeAt) {
      var dt = Math.max(0, Math.min(now - Math.max(previous, this.resumeAt), 100)) / 1000;
      this.pose.yaw += this.options.autoSpeed * dt;
    }
  };

  global.RotationDrag = RotationDrag;
})(window);
