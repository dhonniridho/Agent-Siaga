import { useRef, useCallback } from 'react';

/**
 * Web Audio API Sound Effects System
 * All sounds are generated programmatically — no audio files needed.
 */

type SoundType =
  | 'click'
  | 'success'
  | 'error'
  | 'warning'
  | 'levelStart'
  | 'victory'
  | 'earthquake'
  | 'water'
  | 'explosion'
  | 'countdown'
  | 'itemPick'
  | 'shield'
  | 'splash'
  | 'whoosh';

export const useSoundEffects = (initialEnabled = true) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(initialEnabled);
  const bgmIntervalRef = useRef<number | null>(null);
  const bgmNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode; filter?: BiquadFilterNode }[]>([]);

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playClick = useCallback(() => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }, [getCtx]);

  const playSuccess = useCallback(() => {
    const ctx = getCtx();
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.25);
    });
  }, [getCtx]);

  const playError = useCallback(() => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }, [getCtx]);

  const playWarning = useCallback(() => {
    const ctx = getCtx();
    [0, 0.15].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.1);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.1);
    });
  }, [getCtx]);

  const playLevelStart = useCallback(() => {
    const ctx = getCtx();
    const notes = [392, 523, 659, 784]; // G4, C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  }, [getCtx]);

  const playVictory = useCallback(() => {
    const ctx = getCtx();
    // Victory fanfare: C-E-G-C(high)
    const notes = [523, 659, 784, 1047, 1047];
    const durations = [0.15, 0.15, 0.15, 0.15, 0.4];
    let time = 0;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = i === notes.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + durations[i]);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + durations[i]);
      time += durations[i];
    });
  }, [getCtx]);

  const playEarthquake = useCallback(() => {
    const ctx = getCtx();
    // Low rumble
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, ctx.currentTime);
    osc.frequency.setValueAtTime(60, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(35, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  }, [getCtx]);

  const playWater = useCallback(() => {
    const ctx = getCtx();
    // White noise burst for water/splash
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.Q.setValueAtTime(0.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + 0.3);
  }, [getCtx]);

  const playExplosion = useCallback(() => {
    const ctx = getCtx();
    // Noise burst + low thump
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + 0.2);

    // Thump
    const osc = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc.connect(g2);
    g2.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.15);
    g2.gain.setValueAtTime(0.12, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }, [getCtx]);

  const playCountdown = useCallback(() => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  }, [getCtx]);

  const playItemPick = useCallback(() => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  }, [getCtx]);

  const playShield = useCallback(() => {
    const ctx = getCtx();
    // Shield activation: rising tone with harmonics
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(300, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
    osc2.frequency.setValueAtTime(450, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);
    osc2.stop(ctx.currentTime + 0.25);
  }, [getCtx]);

  const playSplash = useCallback(() => {
    const ctx = getCtx();
    // Quick noise splash
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + 0.15);
  }, [getCtx]);

  const playWhoosh = useCallback(() => {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.15);
    filter.Q.setValueAtTime(2, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + 0.15);
  }, [getCtx]);

  const play = useCallback((type: SoundType) => {
    if (!enabledRef.current) return;
    try {
      switch (type) {
        case 'click': playClick(); break;
        case 'success': playSuccess(); break;
        case 'error': playError(); break;
        case 'warning': playWarning(); break;
        case 'levelStart': playLevelStart(); break;
        case 'victory': playVictory(); break;
        case 'earthquake': playEarthquake(); break;
        case 'water': playWater(); break;
        case 'explosion': playExplosion(); break;
        case 'countdown': playCountdown(); break;
        case 'itemPick': playItemPick(); break;
        case 'shield': playShield(); break;
        case 'splash': playSplash(); break;
        case 'whoosh': playWhoosh(); break;
      }
    } catch (e) {
      // Silently fail — sound should never break gameplay
      console.warn('Sound playback failed:', e);
    }
  }, [playClick, playSuccess, playError, playWarning, playLevelStart, playVictory, playEarthquake, playWater, playExplosion, playCountdown, playItemPick, playShield, playSplash, playWhoosh]);

  const stopBGM = useCallback(() => {
    if (bgmIntervalRef.current) {
      clearInterval(bgmIntervalRef.current);
      bgmIntervalRef.current = null;
    }
    bgmNodesRef.current.forEach(({ osc, gain, filter }) => {
      try {
        osc.stop();
        osc.disconnect();
        if (filter) filter.disconnect();
        gain.disconnect();
      } catch (e) {}
    });
    bgmNodesRef.current = [];
  }, []);

  const startBGM = useCallback(() => {
    stopBGM();
    if (!enabledRef.current) return;
    const ctx = getCtx();
    
    // Cheerful, bouncy, kids-friendly melody (130 BPM)
    const bpm = 130;
    const beatLen = 60 / bpm;
    
    // Notes mapping
    const M = {
      C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.00, A: 440.00, B: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
      C3: 130.81, F3: 174.61, G3: 196.00
    };

    // [frequency, duration in beats]
    const melody = [
      [M.E, 0.5], [M.G, 0.5], [M.C5, 1], [M.A, 0.5], [M.F, 0.5], [M.G, 1],
      [M.E, 0.5], [M.C, 0.5], [M.F, 0.5], [M.E, 0.5], [M.D, 1], [M.G, 1],
      [M.E, 0.5], [M.G, 0.5], [M.C5, 1], [M.A, 0.5], [M.C5, 0.5], [M.G, 1],
      [M.F, 0.5], [M.A, 0.5], [M.E, 0.5], [M.G, 0.5], [M.D, 0.5], [M.E, 0.5], [M.C, 2]
    ];
    
    // Simple alternating bouncy bassline
    const bassline = [
      [M.C3, 1], [M.G3, 1], [M.F3, 1], [M.C3, 1],
      [M.C3, 1], [M.G3, 1], [M.G3, 1], [M.G3, 1],
      [M.C3, 1], [M.G3, 1], [M.F3, 1], [M.C3, 1],
      [M.F3, 1], [M.C3, 1], [M.G3, 1], [M.C3, 1]
    ];

    let nextNoteTime = ctx.currentTime + 0.1; 
    let mIndex = 0;
    let bIndex = 0;
    let mTime = nextNoteTime;
    let bTime = nextNoteTime;
    
    const scheduleNotes = () => {
       if (!enabledRef.current || !bgmIntervalRef.current) return;
       const currentTime = ctx.currentTime;
       
       // Schedule melody ahead
       while (mTime < currentTime + 1.5) {
          const [freq, beats] = melody[mIndex];
          const duration = beats * beatLen;
          
          if (freq) {
             const osc = ctx.createOscillator();
             const gain = ctx.createGain();
             // Triangle wave for flute-like melody
             osc.type = 'triangle';
             osc.frequency.setValueAtTime(freq, mTime);
             
             gain.gain.setValueAtTime(0, mTime);
             gain.gain.linearRampToValueAtTime(0.08, mTime + 0.05); // slightly louder
             gain.gain.exponentialRampToValueAtTime(0.001, mTime + duration * 0.8);
             
             osc.connect(gain);
             gain.connect(ctx.destination);
             
             osc.start(mTime);
             osc.stop(mTime + duration);
             bgmNodesRef.current.push({ osc, gain });
          }
          
          mTime += duration;
          mIndex = (mIndex + 1) % melody.length;
       }

       // Schedule bass ahead
       while (bTime < currentTime + 1.5) {
          const [freq, beats] = bassline[bIndex];
          const duration = beats * beatLen;
          
          if (freq) {
             const osc = ctx.createOscillator();
             const gain = ctx.createGain();
             // Square wave for bouncy bass
             osc.type = 'square';
             osc.frequency.setValueAtTime(freq, bTime);
             
             gain.gain.setValueAtTime(0, bTime);
             gain.gain.linearRampToValueAtTime(0.03, bTime + 0.05);
             gain.gain.exponentialRampToValueAtTime(0.001, bTime + duration * 0.5); // staccato bass
             
             // lowpass filter for bass
             const filter = ctx.createBiquadFilter();
             filter.type = 'lowpass';
             filter.frequency.setValueAtTime(300, bTime);
             
             osc.connect(filter);
             filter.connect(gain);
             gain.connect(ctx.destination);
             
             osc.start(bTime);
             osc.stop(bTime + duration);
             bgmNodesRef.current.push({ osc, gain, filter });
          }
          
          bTime += duration;
          bIndex = (bIndex + 1) % bassline.length;
       }
       
       if (bgmNodesRef.current.length > 60) {
           bgmNodesRef.current = bgmNodesRef.current.slice(-60);
       }
    };

    scheduleNotes();
    bgmIntervalRef.current = window.setInterval(scheduleNotes, 500) as unknown as number;
  }, [getCtx, stopBGM]);

  const toggleSound = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    if (!enabledRef.current) {
      stopBGM();
      // Tutup context agar semua oscillator/buffer yang sudah terjadwal ikut
      // terputus. Saat suara dinyalakan lagi, context baru dibuat kembali.
      const audioContext = audioCtxRef.current;
      audioCtxRef.current = null;
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close().catch(() => {
          // Audio tidak boleh mengganggu alur permainan jika browser menolak close.
        });
      }
    } else {
      startBGM();
    }
    return enabledRef.current;
  }, [stopBGM, startBGM]);

  const isEnabled = useCallback(() => enabledRef.current, []);

  return { play, toggleSound, isEnabled, startBGM, stopBGM };
};
