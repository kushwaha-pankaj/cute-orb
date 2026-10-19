/*!
 * Visage embed loader: put a Visage mascot on any web page.
 *
 *   <div data-visage="mallow" style="width:320px;height:400px"></div>
 *   <script src="https://YOUR-VISAGE-HOST/visage.js"></script>   (no defer, so later scripts can use Visage)
 *
 *   const mascot = Visage.get('mallow');      // or Visage.mount(element, {mascot: 'mallow', config})
 *   mascot.setState('thinking');              // idle · listening · thinking · speaking …
 *   mascot.setExpression('happy');
 *   mascot.setAudioLevel(0.6);                // 0..1, e.g. from your text-to-speech audio
 *   mascot.set({follow: false});              // change any setting live
 *   mascot.on('ready', info => console.log(info.states, info.expressions));
 *   mascot.destroy();
 *
 * Attributes: data-visage (mascot id), data-config (settings code from the studio),
 * data-background="transparent" (blend into your page), data-follow-page="false" (only follow
 * the cursor while it is over the mascot).
 */
(function () {
  'use strict';
  if (window.Visage) return;

  var script = document.currentScript;
  var HOST = (script && script.src ? script.src : location.href).replace(/\/visage\.js(\?.*)?$/, '');
  var ORIGIN = new URL(HOST, location.href).origin;
  var instances = [];
  var callId = 0;

  function frameUrl(mascot, config, background) {
    var query = [];
    if (config) query.push('c=' + encodeURIComponent(config));
    if (background) query.push('bg=' + encodeURIComponent(background));
    return HOST + '/#embed/' + encodeURIComponent(mascot) + (query.length ? '?' + query.join('&') : '');
  }

  function Mascot(element, options) {
    var self = this;
    this.id = options.mascot;
    this.element = element;
    this.info = null;
    this._queue = [];
    this._listeners = {};
    this._followPage = options.followPage !== false;

    var frame = document.createElement('iframe');
    frame.src = frameUrl(options.mascot, options.config, options.background);
    frame.title = options.title || 'Animated mascot';
    frame.setAttribute('allow', 'autoplay');
    frame.setAttribute('loading', 'lazy');
    frame.style.cssText = 'display:block;width:100%;height:100%;border:0;background:transparent;color-scheme:normal';
    if (!element.style.position) element.style.position = 'relative';
    element.innerHTML = '';
    element.appendChild(frame);
    this.frame = frame;

    this._onMessage = function (event) {
      if (event.source !== frame.contentWindow || event.origin !== ORIGIN) return;
      var data = event.data;
      if (!data || data.visage !== 1) return;
      if (data.event === 'ready') {
        self.info = data.info;
        var queued = self._queue;
        self._queue = [];
        queued.forEach(function (message) { self._post(message); });
        self._emit('ready', data.info);
      } else if (data.event === 'result' && !data.ok) {
        console.warn('[visage] ' + data.error);
        self._emit('error', data.error);
      }
    };
    window.addEventListener('message', this._onMessage);

    // Forward the page cursor so the mascot looks at it even outside its frame.
    this._onPointer = function (event) {
      if (!self.info || !self._followPage) return;
      var r = frame.getBoundingClientRect();
      if (!r.width) return;
      var x = (event.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var y = -(event.clientY - (r.top + r.height * 0.42)) / (r.height / 2);
      self._post({method: 'pointer', args: [Math.max(-1, Math.min(1, x / 3)), Math.max(-1, Math.min(1, y / 3))]});
    };
    window.addEventListener('pointermove', this._onPointer, {passive: true});
  }

  Mascot.prototype._post = function (message) {
    message.visage = 1;
    if (!this.info) return this._queue.push(message);
    this.frame.contentWindow.postMessage(message, ORIGIN);
  };
  Mascot.prototype._send = function (method, args) {
    this._post({method: method, args: args, id: ++callId});
    return this;
  };
  Mascot.prototype._emit = function (name, value) {
    (this._listeners[name] || []).forEach(function (fn) {
      try { fn(value); } catch (error) { console.error(error); }
    });
  };
  Mascot.prototype.on = function (name, fn) {
    (this._listeners[name] = this._listeners[name] || []).push(fn);
    if (name === 'ready' && this.info) fn(this.info);
    return this;
  };
  Mascot.prototype.setState = function (name) { return this._send('setState', [name]); };
  Mascot.prototype.setExpression = function (name, intensity) { return this._send('setExpression', [name, intensity]); };
  Mascot.prototype.setAudioLevel = function (level) { return this._send('setAudioLevel', [level]); };
  Mascot.prototype.set = function (values) { return this._send('set', [values]); };
  Mascot.prototype.reset = function () { return this._send('reset', []); };
  Mascot.prototype.call = function (method) { return this._send('call', Array.prototype.slice.call(arguments)); };
  Mascot.prototype.destroy = function () {
    window.removeEventListener('message', this._onMessage);
    window.removeEventListener('pointermove', this._onPointer);
    this.frame.remove();
    var index = instances.indexOf(this);
    if (index >= 0) instances.splice(index, 1);
  };

  function mount(element, options) {
    if (typeof element === 'string') element = document.querySelector(element);
    if (!element) throw new Error('Visage.mount: element not found');
    options = options || {};
    if (!options.mascot) throw new Error('Visage.mount: options.mascot is required, e.g. "mallow"');
    if (element.__visage) element.__visage.destroy();
    var mascot = new Mascot(element, options);
    element.__visage = mascot;
    instances.push(mascot);
    return mascot;
  }

  function scan(root) {
    (root || document).querySelectorAll('[data-visage]').forEach(function (el) {
      if (el.__visage) return;
      mount(el, {
        mascot: el.getAttribute('data-visage'),
        config: el.getAttribute('data-config') || '',
        background: el.getAttribute('data-background') || '',
        followPage: el.getAttribute('data-follow-page') !== 'false',
        title: el.getAttribute('data-title') || '',
      });
    });
  }

  /** Visage.get('mallow') returns that mascot, waiting for it if the page hasn't mounted it yet. */
  function get(target) {
    if (target && target.nodeType === 1) return target.__visage || null;
    for (var i = 0; i < instances.length; i++) if (instances[i].id === target) return instances[i];
    scan();
    for (var j = 0; j < instances.length; j++) if (instances[j].id === target) return instances[j];
    return null;
  }

  window.Visage = {mount: mount, get: get, scan: scan, host: HOST, version: '1'};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(); });
  else scan();
})();
