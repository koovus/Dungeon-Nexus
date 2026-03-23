let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let ambientGain: GainNode | null = null;

let activeMusicNodes: { oscs: OscillatorNode[]; gains: GainNode[]; buffers: AudioBufferSourceNode[]; intervals: ReturnType<typeof setInterval>[] } = { oscs: [], gains: [], buffers: [], intervals: [] };

let ambientInterval: ReturnType<typeof setTimeout> | null = null;
let ambientFollowUps: ReturnType<typeof setTimeout>[] = [];
let ambientActive = false;
let currentMusicMode: 'none' | 'dungeon' | 'rift' = 'none';
let muted = false;
let initialized = false;

let watchdogInterval: ReturnType<typeof setInterval> | null = null;
let resumeAttempts = 0;
let lastResumeAttempt = 0;
let audioHealthy = true;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.3;
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

function ensureRunning(): void {
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    audioHealthy = false;
    const now = Date.now();
    if (now - lastResumeAttempt > 200) {
      lastResumeAttempt = now;
      resumeAttempts++;
      ctx.resume().then(() => {
        audioHealthy = true;
      }).catch(() => {});
    }
  } else if (ctx.state === 'running') {
    audioHealthy = true;
  }
}

function startWatchdog(): void {
  if (watchdogInterval) return;
  watchdogInterval = setInterval(() => {
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      audioHealthy = false;
      ctx.resume().then(() => {
        audioHealthy = true;
      }).catch(() => {});
    } else if (ctx.state === 'running') {
      audioHealthy = true;
    } else if (ctx.state === 'closed') {
      audioHealthy = false;
      ctx = null;
      masterGain = null;
      musicGain = null;
      sfxGain = null;
      ambientGain = null;
    }
  }, 2000);
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
  document.addEventListener('pointerdown', resumeCtx);
  startWatchdog();
}

function resumeCtx(): void {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      audioHealthy = true;
    }).catch(() => {});
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

export function getAudioDiagnostics(): {
  state: string;
  healthy: boolean;
  resumeAttempts: number;
  initialized: boolean;
} {
  return {
    state: ctx ? ctx.state : 'not-created',
    healthy: audioHealthy,
    resumeAttempts,
    initialized,
  };
}

function clearMusicNodes(fadeTime = 0): void {
  const c = getCtx();
  const now = c.currentTime;

  for (const g of activeMusicNodes.gains) {
    try {
      g.gain.cancelScheduledValues(now);
      if (fadeTime > 0) {
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0, now + fadeTime);
      } else {
        g.gain.setValueAtTime(0, now);
      }
    } catch {}
  }

  const stopTime = now + fadeTime + 0.1;
  for (const o of activeMusicNodes.oscs) {
    try { o.stop(stopTime); } catch {}
  }
  for (const b of activeMusicNodes.buffers) {
    try { b.stop(stopTime); } catch {}
  }
  for (const iv of activeMusicNodes.intervals) {
    clearInterval(iv);
  }

  activeMusicNodes = { oscs: [], gains: [], buffers: [], intervals: [] };
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

const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function getScaleNote(root: number, degree: number): number {
  const octave = Math.floor(degree / MINOR_SCALE.length);
  const idx = ((degree % MINOR_SCALE.length) + MINOR_SCALE.length) % MINOR_SCALE.length;
  return root + MINOR_SCALE[idx] + octave * 12;
}

export function playDungeonMusic(): void {
  if (currentMusicMode === 'dungeon') return;
  if (!initialized) return;
  ensureRunning();

  clearMusicNodes(0);

  const c = getCtx();
  const now = c.currentTime;
  currentMusicMode = 'dungeon';

  const root = 38;

  const sub = c.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = midiToFreq(root - 12);
  const subGain = c.createGain();
  subGain.gain.setValueAtTime(0, now);
  subGain.gain.linearRampToValueAtTime(0.12, now + 4);
  sub.connect(subGain);
  subGain.connect(musicGain!);
  sub.start(now);
  activeMusicNodes.oscs.push(sub);
  activeMusicNodes.gains.push(subGain);

  const drone = c.createOscillator();
  drone.type = 'sawtooth';
  drone.frequency.value = midiToFreq(root);
  const droneFilter = c.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 180;
  droneFilter.Q.value = 3;
  const droneGain = c.createGain();
  droneGain.gain.setValueAtTime(0, now);
  droneGain.gain.linearRampToValueAtTime(0.08, now + 3);
  drone.connect(droneFilter);
  droneFilter.connect(droneGain);
  droneGain.connect(musicGain!);
  drone.start(now);
  activeMusicNodes.oscs.push(drone);
  activeMusicNodes.gains.push(droneGain);

  const filterLfo = c.createOscillator();
  filterLfo.type = 'sine';
  filterLfo.frequency.value = 0.06;
  const filterLfoGain = c.createGain();
  filterLfoGain.gain.value = 60;
  filterLfo.connect(filterLfoGain);
  filterLfoGain.connect(droneFilter.frequency);
  filterLfo.start(now);
  activeMusicNodes.oscs.push(filterLfo);

  const fifth = c.createOscillator();
  fifth.type = 'triangle';
  fifth.frequency.value = midiToFreq(root + 7);
  const fifthGain = c.createGain();
  fifthGain.gain.setValueAtTime(0, now);
  fifthGain.gain.linearRampToValueAtTime(0.04, now + 6);
  fifth.connect(fifthGain);
  fifthGain.connect(musicGain!);
  fifth.start(now);
  activeMusicNodes.oscs.push(fifth);
  activeMusicNodes.gains.push(fifthGain);

  const fifthLfo = c.createOscillator();
  fifthLfo.type = 'sine';
  fifthLfo.frequency.value = 0.04;
  const fifthLfoGain = c.createGain();
  fifthLfoGain.gain.value = 0.03;
  fifthLfo.connect(fifthLfoGain);
  fifthLfoGain.connect(fifthGain.gain);
  fifthLfo.start(now);
  activeMusicNodes.oscs.push(fifthLfo);

  const melodyOsc = c.createOscillator();
  melodyOsc.type = 'sine';
  melodyOsc.frequency.value = midiToFreq(root + 12);
  const melodyFilter = c.createBiquadFilter();
  melodyFilter.type = 'lowpass';
  melodyFilter.frequency.value = 800;
  melodyFilter.Q.value = 1;
  const melodyGain = c.createGain();
  melodyGain.gain.setValueAtTime(0, now);
  melodyGain.gain.linearRampToValueAtTime(0.06, now + 5);
  melodyOsc.connect(melodyFilter);
  melodyFilter.connect(melodyGain);
  melodyGain.connect(musicGain!);
  melodyOsc.start(now);
  activeMusicNodes.oscs.push(melodyOsc);
  activeMusicNodes.gains.push(melodyGain);

  const patterns = [
    [0, 4, 7, 4, 3, 7, 5, 3],
    [0, 3, 5, 7, 10, 7, 5, 3],
    [0, 7, 5, 3, 0, -2, 0, 3],
    [5, 3, 0, 3, 5, 7, 10, 7],
  ];
  let patIdx = 0;
  let noteIdx = 0;
  const noteInterval = 2800;

  const melodyIv = setInterval(() => {
    if (currentMusicMode !== 'dungeon') return;
    const pattern = patterns[patIdx];
    const degree = pattern[noteIdx];
    const midi = getScaleNote(root + 12, degree);
    const freq = midiToFreq(midi);

    const t = c.currentTime;
    melodyOsc.frequency.setValueAtTime(melodyOsc.frequency.value, t);
    melodyOsc.frequency.exponentialRampToValueAtTime(freq, t + 0.3);

    melodyGain.gain.cancelScheduledValues(t);
    melodyGain.gain.setValueAtTime(0.06, t);
    melodyGain.gain.linearRampToValueAtTime(0.03, t + 2.2);

    noteIdx++;
    if (noteIdx >= pattern.length) {
      noteIdx = 0;
      patIdx = (patIdx + 1) % patterns.length;
    }
  }, noteInterval);
  activeMusicNodes.intervals.push(melodyIv);

  const chordNotes = [
    [root, root + 3, root + 7],
    [root - 2, root + 2, root + 5],
    [root + 3, root + 7, root + 10],
    [root + 5, root + 8, root + 12],
  ];
  let chordIdx = 0;

  const chordOscs: OscillatorNode[] = [];
  const chordGains: GainNode[] = [];
  for (let i = 0; i < 3; i++) {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = midiToFreq(chordNotes[0][i]);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.025, now + 8);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    o.connect(f);
    f.connect(g);
    g.connect(musicGain!);
    o.start(now);
    chordOscs.push(o);
    chordGains.push(g);
    activeMusicNodes.oscs.push(o);
    activeMusicNodes.gains.push(g);
  }

  const chordIv = setInterval(() => {
    if (currentMusicMode !== 'dungeon') return;
    chordIdx = (chordIdx + 1) % chordNotes.length;
    const t = c.currentTime;
    for (let i = 0; i < 3; i++) {
      const freq = midiToFreq(chordNotes[chordIdx][i]);
      chordOscs[i].frequency.setValueAtTime(chordOscs[i].frequency.value, t);
      chordOscs[i].frequency.exponentialRampToValueAtTime(freq, t + 1.5);
    }
  }, noteInterval * 4);
  activeMusicNodes.intervals.push(chordIv);

  const breathLfo = c.createOscillator();
  breathLfo.type = 'sine';
  breathLfo.frequency.value = 0.025;
  const breathGain = c.createGain();
  breathGain.gain.value = 0.08;
  breathLfo.connect(breathGain);
  breathGain.connect(musicGain!.gain);
  breathLfo.start(now);
  activeMusicNodes.oscs.push(breathLfo);
}

export function playRiftMusic(): void {
  if (currentMusicMode === 'rift') return;
  if (!initialized) return;
  ensureRunning();

  clearMusicNodes(0.1);

  const c = getCtx();
  const now = c.currentTime;
  currentMusicMode = 'rift';

  const pad1 = c.createOscillator();
  pad1.type = 'sine';
  pad1.frequency.value = 110;
  pad1.detune.value = -15;
  const gP1 = c.createGain();
  gP1.gain.setValueAtTime(0, now);
  gP1.gain.linearRampToValueAtTime(0.06, now + 2);
  pad1.connect(gP1);
  gP1.connect(musicGain!);
  pad1.start(now);
  activeMusicNodes.oscs.push(pad1);
  activeMusicNodes.gains.push(gP1);

  const pad2 = c.createOscillator();
  pad2.type = 'sine';
  pad2.frequency.value = 113.5;
  pad2.detune.value = 10;
  const gP2 = c.createGain();
  gP2.gain.setValueAtTime(0, now);
  gP2.gain.linearRampToValueAtTime(0.06, now + 2);
  pad2.connect(gP2);
  gP2.connect(musicGain!);
  pad2.start(now);
  activeMusicNodes.oscs.push(pad2);
  activeMusicNodes.gains.push(gP2);

  const pad3 = c.createOscillator();
  pad3.type = 'sine';
  pad3.frequency.value = 164.81;
  pad3.detune.value = -8;
  const gP3 = c.createGain();
  gP3.gain.setValueAtTime(0, now);
  gP3.gain.linearRampToValueAtTime(0.03, now + 4);
  pad3.connect(gP3);
  gP3.connect(musicGain!);
  pad3.start(now);
  activeMusicNodes.oscs.push(pad3);
  activeMusicNodes.gains.push(gP3);

  const sweep = c.createOscillator();
  sweep.type = 'sawtooth';
  sweep.frequency.value = 55;
  const sweepFilter = c.createBiquadFilter();
  sweepFilter.type = 'bandpass';
  sweepFilter.frequency.value = 300;
  sweepFilter.Q.value = 10;
  const gSweep = c.createGain();
  gSweep.gain.setValueAtTime(0, now);
  gSweep.gain.linearRampToValueAtTime(0.035, now + 3);
  sweep.connect(sweepFilter);
  sweepFilter.connect(gSweep);
  gSweep.connect(musicGain!);
  sweep.start(now);
  activeMusicNodes.oscs.push(sweep);
  activeMusicNodes.gains.push(gSweep);

  const sweepLfo = c.createOscillator();
  sweepLfo.type = 'sine';
  sweepLfo.frequency.value = 0.04;
  const sweepLfoGain = c.createGain();
  sweepLfoGain.gain.value = 250;
  sweepLfo.connect(sweepLfoGain);
  sweepLfoGain.connect(sweepFilter.frequency);
  sweepLfo.start(now);
  activeMusicNodes.oscs.push(sweepLfo);

  const highTone = c.createOscillator();
  highTone.type = 'sine';
  highTone.frequency.value = 880;
  const highGain = c.createGain();
  highGain.gain.setValueAtTime(0, now);
  highGain.gain.linearRampToValueAtTime(0.012, now + 5);
  highTone.connect(highGain);
  highGain.connect(musicGain!);
  highTone.start(now);
  activeMusicNodes.oscs.push(highTone);
  activeMusicNodes.gains.push(highGain);

  const highLfo = c.createOscillator();
  highLfo.type = 'sine';
  highLfo.frequency.value = 0.12;
  const highLfoGain = c.createGain();
  highLfoGain.gain.value = 0.008;
  highLfo.connect(highLfoGain);
  highLfoGain.connect(highGain.gain);
  highLfo.start(now);
  activeMusicNodes.oscs.push(highLfo);

  const noiseBuffer = createNoiseBuffer(2);
  const noiseSrc = c.createBufferSource();
  noiseSrc.buffer = noiseBuffer;
  noiseSrc.loop = true;
  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 400;
  noiseFilter.Q.value = 0.8;
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.04, now + 3);
  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(musicGain!);
  noiseSrc.start(now);
  activeMusicNodes.buffers.push(noiseSrc);
  activeMusicNodes.gains.push(noiseGain);

  const pulseOsc = c.createOscillator();
  pulseOsc.type = 'sine';
  pulseOsc.frequency.value = 40;
  const pulseGain = c.createGain();
  pulseGain.gain.value = 0;
  pulseOsc.connect(pulseGain);
  pulseGain.connect(musicGain!);
  pulseOsc.start(now);
  activeMusicNodes.oscs.push(pulseOsc);
  activeMusicNodes.gains.push(pulseGain);

  const pulseIv = setInterval(() => {
    if (currentMusicMode !== 'rift') return;
    const t = c.currentTime;
    pulseGain.gain.cancelScheduledValues(t);
    pulseGain.gain.setValueAtTime(0, t);
    pulseGain.gain.linearRampToValueAtTime(0.06, t + 0.1);
    pulseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
  }, 3000 + Math.random() * 2000);
  activeMusicNodes.intervals.push(pulseIv);
}

export function stopMusic(): void {
  clearMusicNodes(0.8);
  currentMusicMode = 'none';
}

export function fadeOutMusic(): void {
  clearMusicNodes(2.0);
  currentMusicMode = 'none';
}

export function playMetalClang(): void {
  if (!initialized) return;
  ensureRunning();
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
  ensureRunning();
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
  ensureRunning();
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

export function playBuffActivate(): void {
  if (!initialized) return;
  ensureRunning();
  const c = getCtx();
  const now = c.currentTime;

  const osc1 = c.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(220, now);
  osc1.frequency.exponentialRampToValueAtTime(440, now + 0.15);
  osc1.frequency.exponentialRampToValueAtTime(660, now + 0.35);

  const osc2 = c.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(330, now + 0.1);
  osc2.frequency.exponentialRampToValueAtTime(550, now + 0.3);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.linearRampToValueAtTime(2000, now + 0.3);
  filter.Q.value = 2;

  const g1 = c.createGain();
  g1.gain.setValueAtTime(0, now);
  g1.gain.linearRampToValueAtTime(0.15, now + 0.05);
  g1.gain.setValueAtTime(0.15, now + 0.25);
  g1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  const g2 = c.createGain();
  g2.gain.setValueAtTime(0, now + 0.1);
  g2.gain.linearRampToValueAtTime(0.1, now + 0.15);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc1.connect(filter);
  filter.connect(g1);
  g1.connect(sfxGain!);
  osc1.start(now);
  osc1.stop(now + 0.65);

  osc2.connect(g2);
  g2.connect(sfxGain!);
  osc2.start(now + 0.1);
  osc2.stop(now + 0.55);
}

export function playBuffExpire(): void {
  if (!initialized) return;
  ensureRunning();
  const c = getCtx();
  const now = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(500, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

  const g = c.createGain();
  g.gain.setValueAtTime(0.12, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(g);
  g.connect(sfxGain!);
  osc.start(now);
  osc.stop(now + 0.4);
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
  clearMusicNodes(0.3);
  currentMusicMode = 'none';
}

export function getCurrentMusicMode(): 'none' | 'dungeon' | 'rift' {
  return currentMusicMode;
}
