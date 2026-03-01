let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let ambientGain: GainNode | null = null;

let dungeonOscillators: OscillatorNode[] = [];
let dungeonGains: GainNode[] = [];
let riftOscillators: OscillatorNode[] = [];
let riftGains: GainNode[] = [];
let riftBufferSources: AudioBufferSourceNode[] = [];

let ambientInterval: ReturnType<typeof setTimeout> | null = null;
let ambientFollowUps: ReturnType<typeof setTimeout>[] = [];
let ambientActive = false;
let currentMusicMode: 'none' | 'dungeon' | 'rift' = 'none';
let muted = false;
let initialized = false;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.25;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.4;
    sfxGain.connect(masterGain);

    ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.15;
    ambientGain.connect(masterGain);
  }
  return ctx;
}

export function initAudio(): void {
  if (initialized) return;
  const c = getCtx();
  if (c.state === 'suspended') {
    c.resume();
  }
  initialized = true;
  if (muted && masterGain) {
    masterGain.gain.value = 0;
  }

  document.addEventListener('click', resumeCtx);
  document.addEventListener('keydown', resumeCtx);
}

function resumeCtx(): void {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

export function setMuted(m: boolean): void {
  muted = m;
  if (masterGain) {
    const c = getCtx();
    masterGain.gain.cancelScheduledValues(c.currentTime);
    masterGain.gain.setValueAtTime(m ? 0 : 1, c.currentTime);
  }
}

export function isMuted(): boolean {
  return muted;
}

function stopOscillatorGroup(oscs: OscillatorNode[], gains: GainNode[], fadeTime = 0): void {
  const c = getCtx();
  const now = c.currentTime;
  for (const g of gains) {
    g.gain.cancelScheduledValues(now);
    if (fadeTime > 0) {
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + fadeTime);
    } else {
      g.gain.setValueAtTime(0, now);
    }
  }
  const stopTime = now + fadeTime + 0.05;
  for (const o of oscs) {
    try { o.stop(stopTime); } catch {}
  }
}

function stopBufferSources(sources: AudioBufferSourceNode[], fadeTime = 0): void {
  const c = getCtx();
  const now = c.currentTime;
  const stopTime = now + fadeTime + 0.05;
  for (const s of sources) {
    try { s.stop(stopTime); } catch {}
  }
}

function createNoiseBuffer(duration: number): AudioBuffer {
  const c = getCtx();
  const sampleRate = c.sampleRate;
  const length = sampleRate * duration;
  const buffer = c.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function playDungeonMusic(): void {
  if (currentMusicMode === 'dungeon') return;
  if (!initialized) return;

  stopAllMusic(0);

  const c = getCtx();
  const now = c.currentTime;
  currentMusicMode = 'dungeon';

  dungeonOscillators = [];
  dungeonGains = [];

  const drone1 = c.createOscillator();
  drone1.type = 'sawtooth';
  drone1.frequency.value = 55;
  const g1 = c.createGain();
  g1.gain.setValueAtTime(0, now);
  g1.gain.linearRampToValueAtTime(0.12, now + 3);
  const f1 = c.createBiquadFilter();
  f1.type = 'lowpass';
  f1.frequency.value = 200;
  f1.Q.value = 2;
  drone1.connect(f1);
  f1.connect(g1);
  g1.connect(musicGain!);
  drone1.start(now);
  dungeonOscillators.push(drone1);
  dungeonGains.push(g1);

  const drone2 = c.createOscillator();
  drone2.type = 'sine';
  drone2.frequency.value = 82.41;
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0, now);
  g2.gain.linearRampToValueAtTime(0.08, now + 4);
  drone2.connect(g2);
  g2.connect(musicGain!);
  drone2.start(now);
  dungeonOscillators.push(drone2);
  dungeonGains.push(g2);

  const sub = c.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 36.71;
  const gSub = c.createGain();
  gSub.gain.setValueAtTime(0, now);
  gSub.gain.linearRampToValueAtTime(0.1, now + 5);
  sub.connect(gSub);
  gSub.connect(musicGain!);
  sub.start(now);
  dungeonOscillators.push(sub);
  dungeonGains.push(gSub);

  const lfo = c.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 15;
  lfo.connect(lfoGain);
  lfoGain.connect(f1.frequency);
  lfo.start(now);
  dungeonOscillators.push(lfo);
  dungeonGains.push(lfoGain);

  const lfo2 = c.createOscillator();
  lfo2.type = 'triangle';
  lfo2.frequency.value = 0.03;
  const lfo2Gain = c.createGain();
  lfo2Gain.gain.value = 0.04;
  lfo2.connect(lfo2Gain);
  lfo2Gain.connect(g1.gain);
  lfo2.start(now);
  dungeonOscillators.push(lfo2);
  dungeonGains.push(lfo2Gain);
}

export function playRiftMusic(): void {
  if (currentMusicMode === 'rift') return;
  if (!initialized) return;

  stopOscillatorGroup(dungeonOscillators, dungeonGains, 0);
  dungeonOscillators = [];
  dungeonGains = [];

  const c = getCtx();
  const now = c.currentTime;
  currentMusicMode = 'rift';

  riftOscillators = [];
  riftGains = [];
  riftBufferSources = [];

  const pad1 = c.createOscillator();
  pad1.type = 'sine';
  pad1.frequency.value = 110;
  pad1.detune.value = -12;
  const gP1 = c.createGain();
  gP1.gain.setValueAtTime(0, now);
  gP1.gain.linearRampToValueAtTime(0.07, now + 2);
  pad1.connect(gP1);
  gP1.connect(musicGain!);
  pad1.start(now);
  riftOscillators.push(pad1);
  riftGains.push(gP1);

  const pad2 = c.createOscillator();
  pad2.type = 'sine';
  pad2.frequency.value = 113;
  pad2.detune.value = 8;
  const gP2 = c.createGain();
  gP2.gain.setValueAtTime(0, now);
  gP2.gain.linearRampToValueAtTime(0.07, now + 2);
  pad2.connect(gP2);
  gP2.connect(musicGain!);
  pad2.start(now);
  riftOscillators.push(pad2);
  riftGains.push(gP2);

  const sweep = c.createOscillator();
  sweep.type = 'sawtooth';
  sweep.frequency.value = 60;
  const sweepFilter = c.createBiquadFilter();
  sweepFilter.type = 'bandpass';
  sweepFilter.frequency.value = 300;
  sweepFilter.Q.value = 8;
  const gSweep = c.createGain();
  gSweep.gain.setValueAtTime(0, now);
  gSweep.gain.linearRampToValueAtTime(0.04, now + 3);
  sweep.connect(sweepFilter);
  sweepFilter.connect(gSweep);
  gSweep.connect(musicGain!);
  sweep.start(now);
  riftOscillators.push(sweep);
  riftGains.push(gSweep);

  const sweepLfo = c.createOscillator();
  sweepLfo.type = 'sine';
  sweepLfo.frequency.value = 0.05;
  const sweepLfoGain = c.createGain();
  sweepLfoGain.gain.value = 200;
  sweepLfo.connect(sweepLfoGain);
  sweepLfoGain.connect(sweepFilter.frequency);
  sweepLfo.start(now);
  riftOscillators.push(sweepLfo);
  riftGains.push(sweepLfoGain);

  const highTone = c.createOscillator();
  highTone.type = 'sine';
  highTone.frequency.value = 880;
  const highGain = c.createGain();
  highGain.gain.setValueAtTime(0, now);
  highGain.gain.linearRampToValueAtTime(0.015, now + 4);
  highTone.connect(highGain);
  highGain.connect(musicGain!);
  highTone.start(now);
  riftOscillators.push(highTone);
  riftGains.push(highGain);

  const highLfo = c.createOscillator();
  highLfo.type = 'sine';
  highLfo.frequency.value = 0.15;
  const highLfoGain = c.createGain();
  highLfoGain.gain.value = 0.01;
  highLfo.connect(highLfoGain);
  highLfoGain.connect(highGain.gain);
  highLfo.start(now);
  riftOscillators.push(highLfo);
  riftGains.push(highLfoGain);

  const noiseBuffer = createNoiseBuffer(2);
  const noiseSrc = c.createBufferSource();
  noiseSrc.buffer = noiseBuffer;
  noiseSrc.loop = true;
  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 500;
  noiseFilter.Q.value = 1;
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.03, now + 3);
  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(musicGain!);
  noiseSrc.start(now);
  riftBufferSources.push(noiseSrc);
  riftGains.push(noiseGain);
}

function stopAllMusic(fadeTime: number): void {
  stopOscillatorGroup(dungeonOscillators, dungeonGains, fadeTime);
  stopOscillatorGroup(riftOscillators, riftGains, fadeTime);
  stopBufferSources(riftBufferSources, fadeTime);
  dungeonOscillators = [];
  dungeonGains = [];
  riftOscillators = [];
  riftGains = [];
  riftBufferSources = [];
  currentMusicMode = 'none';
}

export function stopMusic(): void {
  stopAllMusic(0.5);
}

export function playMetalClang(): void {
  if (!initialized) return;
  const c = getCtx();
  const now = c.currentTime;

  const noiseBuffer = createNoiseBuffer(0.15);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;

  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 15;

  const g = c.createGain();
  g.gain.setValueAtTime(0.5, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  src.connect(filter);
  filter.connect(g);
  g.connect(sfxGain!);
  src.start(now);
  src.stop(now + 0.35);

  const ring = c.createOscillator();
  ring.type = 'sine';
  ring.frequency.value = 2200;
  const ringG = c.createGain();
  ringG.gain.setValueAtTime(0.15, now);
  ringG.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  ring.connect(ringG);
  ringG.connect(sfxGain!);
  ring.start(now);
  ring.stop(now + 0.55);
}

export function playItemPickup(): void {
  if (!initialized) return;
  const c = getCtx();
  const now = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);

  const g = c.createGain();
  g.gain.setValueAtTime(0.2, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(g);
  g.connect(sfxGain!);
  osc.start(now);
  osc.stop(now + 0.2);
}

export function playMonsterGrowl(): void {
  if (!initialized) return;
  const c = getCtx();
  const now = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(70 + Math.random() * 30, now);
  osc.frequency.linearRampToValueAtTime(50 + Math.random() * 20, now + 0.4);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 250;
  filter.Q.value = 3;

  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.3, now + 0.05);
  g.gain.setValueAtTime(0.3, now + 0.15);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc.connect(filter);
  filter.connect(g);
  g.connect(sfxGain!);
  osc.start(now);
  osc.stop(now + 0.5);
}

function playFootstep(): void {
  if (!initialized || !ambientActive) return;
  const c = getCtx();
  const now = c.currentTime;

  const noiseBuffer = createNoiseBuffer(0.08);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600 + Math.random() * 400;
  filter.Q.value = 1;

  const g = c.createGain();
  g.gain.setValueAtTime(0.25 + Math.random() * 0.15, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  src.connect(filter);
  filter.connect(g);
  g.connect(ambientGain!);
  src.start(now);
  src.stop(now + 0.15);
}

function playDragFoot(): void {
  if (!initialized || !ambientActive) return;
  const c = getCtx();
  const now = c.currentTime;

  const noiseBuffer = createNoiseBuffer(0.4);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.linearRampToValueAtTime(200, now + 0.35);
  filter.Q.value = 0.5;

  const g = c.createGain();
  g.gain.setValueAtTime(0.1, now);
  g.gain.linearRampToValueAtTime(0.2, now + 0.1);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  src.connect(filter);
  filter.connect(g);
  g.connect(ambientGain!);
  src.start(now);
  src.stop(now + 0.45);
}

function playDistantGrowl(): void {
  if (!initialized || !ambientActive) return;
  const c = getCtx();
  const now = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(40 + Math.random() * 25, now);
  osc.frequency.linearRampToValueAtTime(30 + Math.random() * 15, now + 0.8);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 150;
  filter.Q.value = 2;

  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.15, now + 0.2);
  g.gain.setValueAtTime(0.15, now + 0.4);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

  osc.connect(filter);
  filter.connect(g);
  g.connect(ambientGain!);
  osc.start(now);
  osc.stop(now + 1.0);
}

function trackFollowUp(fn: () => void, delay: number): void {
  const id = setTimeout(() => {
    ambientFollowUps = ambientFollowUps.filter(t => t !== id);
    fn();
  }, delay);
  ambientFollowUps.push(id);
}

function scheduleAmbientSound(): void {
  if (!initialized || !ambientActive) return;

  const delay = 4000 + Math.random() * 10000;

  ambientInterval = setTimeout(() => {
    if (!ambientActive) return;

    const roll = Math.random();
    if (roll < 0.3) {
      playFootstep();
      trackFollowUp(() => playFootstep(), 200 + Math.random() * 300);
    } else if (roll < 0.55) {
      playDragFoot();
      if (Math.random() < 0.4) {
        trackFollowUp(() => playDistantGrowl(), 500 + Math.random() * 800);
      }
    } else if (roll < 0.75) {
      playDistantGrowl();
    }

    scheduleAmbientSound();
  }, delay);
}

export function startAmbientSounds(): void {
  if (ambientActive) return;
  ambientActive = true;
  scheduleAmbientSound();
}

export function stopAmbientSounds(): void {
  ambientActive = false;
  if (ambientInterval) {
    clearTimeout(ambientInterval);
    ambientInterval = null;
  }
  for (const id of ambientFollowUps) {
    clearTimeout(id);
  }
  ambientFollowUps = [];
}

export function stopAll(): void {
  stopAmbientSounds();
  stopAllMusic(0.3);
}

export function getCurrentMusicMode(): 'none' | 'dungeon' | 'rift' {
  return currentMusicMode;
}
