/* Foreground feature dwell, split into lossless delivery intervals. No timers of its own. */
(() => {
  'use strict';
  class FeatureAttention {
    constructor(emit) {
      this.emit = emit;
      this.views = new Map();
    }
    set(key, view) {
      const signature = view ? JSON.stringify(view) : '',
        previous = this.views.get(key);
      if (previous?.signature === signature) return;
      if (previous) {
        this.deliver(previous);
        this.views.delete(key);
      }
      if (view) this.views.set(key, { signature, view, seconds: 0 });
    }
    tick(seconds) {
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      for (const item of this.views.values()) item.seconds += seconds;
    }
    deliver(item) {
      const seconds = Math.floor(item.seconds);
      if (seconds < 1) return;
      item.seconds -= seconds;
      this.emit(
        item.view.kind,
        item.view.entity || '',
        { ...item.view.details, action: 'attention' },
        seconds,
      );
    }
    flush() {
      for (const item of this.views.values()) this.deliver(item);
    }
    clear() {
      this.flush();
      this.views.clear();
    }
  }
  window.DKLAFeatureAttention = FeatureAttention;
})();
