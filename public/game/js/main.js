import { RaceRenderer } from './renderer.js';
import { Race } from './race.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { Trails } from './effects.js';
import { AudioEngine } from './audio.js';
import { registerRaceTools } from './webmcp.js';

const $ = (id) => document.getElementById(id);
try {
  const view = new RaceRenderer($('viewport'));
  const race = new Race(view.track),
    hud = new HUD(view.track),
    trails = new Trails(view.scene),
    audio = new AudioEngine();
  const start = () => {
    input.clear();
    trails.clear();
    race.start();
    view.raceCamera(race, 1, true);
    hud.update(race);
  };
  const resume = () => {
    input.clear();
    race.resume();
    document.activeElement?.blur();
  };
  const menu = () => {
    input.clear();
    trails.clear();
    race.menu();
    hud.update(race);
  };
  const toggleAudio = async () => {
    const enabled = await audio.toggle();
    $('audio-toggle').setAttribute(
      'aria-label',
      enabled ? 'Mute sound' : 'Enable sound',
    );
    $('audio-toggle').setAttribute('aria-pressed', String(enabled));
    $('audio-toggle').innerHTML = enabled
      ? '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Zm4 3c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/></svg>';
  };
  const input = new Input((code) => {
    if (code === 'Enter' && (race.mode === 'menu' || race.mode === 'finished'))
      start();
    if (code === 'Escape') {
      if (race.mode === 'paused') resume();
      else race.pause();
    }
    if (code === 'KeyR' && race.mode !== 'menu') start();
    if (code === 'KeyM') void toggleAudio();
    if (code === 'Blur') race.pause();
  });
  for (const id of ['start', 'race-again', 'restart-pause'])
    $(id).addEventListener('click', start);
  $('resume').addEventListener('click', resume);
  for (const id of ['menu-pause', 'menu-finish'])
    $(id).addEventListener('click', menu);
  $('pause-button').addEventListener('click', () => race.pause());
  $('audio-toggle').addEventListener('click', toggleAudio);
  $('fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      hud.message('FULLSCREEN UNAVAILABLE');
    }
  });
  document.addEventListener('fullscreenchange', () =>
    $('fullscreen').setAttribute(
      'aria-label',
      document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen',
    ),
  );
  const unregister = registerRaceTools(race, () => {
    input.clear();
    trails.clear();
    if (race.mode === 'countdown') view.raceCamera(race, 1, true);
    hud.update(race);
  });
  let previous = performance.now(),
    accumulator = 0,
    raf;
  function frame(now) {
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    accumulator += dt;
    while (accumulator >= 1 / 120) {
      race.step(1 / 120, input.read());
      accumulator -= 1 / 120;
    }
    for (const event of race.drainEvents()) {
      if (
        ['message', 'checkpoint', 'lap', 'pad', 'collision'].includes(
          event.type,
        )
      )
        hud.message(
          event.value,
          event.type === 'collision' ? '#ff658c' : '#8df5ff',
        );
      if (
        ['checkpoint', 'lap', 'pad', 'collision', 'count'].includes(event.type)
      )
        audio.tone(event.type);
    }
    hud.update(race);
    audio.update(race);
    // Freeze the world and particle lifetimes during pause, including countdown pause.
    if (race.mode !== 'paused') {
      trails.update(dt, view.player, race);
      view.update(dt, race);
    }
    raf = requestAnimationFrame(frame);
  }
  hud.update(race);
  raf = requestAnimationFrame(frame);
  $('viewport').addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    race.pause();
    $('error-text').textContent =
      'The graphics connection was interrupted. Reload to return to the hangar.';
    $('error').hidden = false;
  });
  window.addEventListener(
    'pagehide',
    () => {
      cancelAnimationFrame(raf);
      unregister();
      input.dispose();
      view.dispose();
      void audio.ctx?.close();
    },
    { once: true },
  );
} catch (error) {
  console.error('Flight systems failed to initialize:', error);
  $('error').hidden = false;
}
