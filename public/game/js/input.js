const GAME_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'Escape',
  'Enter',
  'KeyR',
  'KeyM',
]);
export class Input {
  constructor(onAction) {
    this.keys = new Set();
    this.onAction = onAction;
    this.keydown = (e) => {
      if (!GAME_KEYS.has(e.code)) return;
      // Focused menu buttons retain their normal Enter / Space activation.
      if (
        e.target instanceof HTMLButtonElement &&
        (e.code === 'Enter' || e.code === 'Space')
      )
        return;
      e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) onAction(e.code);
    };
    this.keyup = (e) => this.keys.delete(e.code);
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);
    this.blur = () => {
      this.clear();
      onAction('Blur');
    };
    window.addEventListener('blur', this.blur);
    this.visibility = () => {
      if (document.hidden) this.blur();
    };
    document.addEventListener('visibilitychange', this.visibility);
    document.querySelectorAll('[data-key]').forEach((button) => {
      button.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        this.keys.add(button.dataset.key);
      });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
        button.addEventListener(event, () =>
          this.keys.delete(button.dataset.key),
        );
    });
  }
  clear() {
    this.keys.clear();
  }
  read() {
    return {
      throttle: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      brake: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      left: this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
      right: this.keys.has('KeyD') || this.keys.has('ArrowRight'),
      boost: this.keys.has('Space'),
    };
  }
  dispose() {
    window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('keyup', this.keyup);
    window.removeEventListener('blur', this.blur);
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
