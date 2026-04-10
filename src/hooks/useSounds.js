/**
 * useSounds — Web Audio API v12
 * Typing: som de telégrafo real (MP3 embutido como base64)
 * Click: clique seco
 * Tab: tick nítido
 */

import { TELEGRAPH_MP3 } from '../assets/telegraph.js'

let audioCtx = null
let telegraphBuffer = null   // AudioBuffer decodado do MP3
let telegraphLoading = false

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function getVolume() {
  const v = parseFloat(localStorage.getItem('atelier_sound_volume'))
  return isNaN(v) ? 0.5 : Math.max(0, Math.min(1, v))
}

// Decodifica o MP3 do telégrafo uma única vez e cacheia
async function loadTelegraphBuffer() {
  if (telegraphBuffer) return telegraphBuffer
  if (telegraphLoading) return null
  telegraphLoading = true
  try {
    const ac = getCtx()
    // Converter base64 data URL para ArrayBuffer
    const base64 = TELEGRAPH_MP3.split(',')[1]
    const binary  = atob(base64)
    const bytes   = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    telegraphBuffer = await ac.decodeAudioData(bytes.buffer)
    return telegraphBuffer
  } catch(e) {
    telegraphLoading = false
    return null
  }
}

// Toca um trecho aleatório do buffer do telégrafo (simula clique individual)
function playTelegraphClick(volume = 1) {
  const ac  = getCtx()
  const buf = telegraphBuffer
  if (!buf) return
  const master = getVolume()

  const src  = ac.createBufferSource()
  src.buffer = buf

  // Recorta um clique aleatório: offset entre 0s e (duração - 0.08s)
  // cada clique individual dura ~60-80ms no telégrafo
  const clipDuration = 0.07
  const maxOffset    = Math.max(0, buf.duration - clipDuration - 0.1)
  const offset       = Math.random() * maxOffset

  const gain = ac.createGain()
  const now  = ac.currentTime
  gain.gain.setValueAtTime(volume * master * 1.2, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + clipDuration)

  src.connect(gain)
  gain.connect(ac.destination)
  src.start(now, offset, clipDuration)
}

function playTone({ freq = 440, type = 'sine', duration = 0.12, volume = 0.18, attack = 0.005, decay = 0.05, sustain = 0.6, release = 0.1 } = {}) {
  try {
    const ac = getCtx()
    const master = getVolume()
    const now = ac.currentTime
    const osc = ac.createOscillator()
    const env = ac.createGain()
    const vol = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    env.gain.setValueAtTime(0, now)
    env.gain.linearRampToValueAtTime(1, now + attack)
    env.gain.linearRampToValueAtTime(sustain, now + attack + decay)
    env.gain.setValueAtTime(sustain, now + duration - release)
    env.gain.linearRampToValueAtTime(0, now + duration)
    vol.gain.setValueAtTime(volume * master, now)
    osc.connect(env); env.connect(vol); vol.connect(ac.destination)
    osc.start(now); osc.stop(now + duration + 0.02)
  } catch {}
}

const SOUNDS = {
  // Soft telegraph machine clicks — clique suave de telégrafo
  typing() {
    try {
      const ac = getCtx()
      const master = getVolume()
      const now = ac.currentTime
      const v = Math.random()

      // Se tiver o buffer do telégrafo real, usa ele (suave e natural)
      if (telegraphBuffer) {
        playTelegraphClick(0.65 + v * 0.2)
        return
      }

      // Síntese de telégrafo: clique eletromecânico suave
      // Componente 1: impacto mecânico — ruído de banda estreita
      const bufLen = Math.floor(ac.sampleRate * 0.008)
      const buf = ac.createBuffer(1, bufLen, ac.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.3))
      }
      const src = ac.createBufferSource()
      src.buffer = buf

      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1200 + v * 600   // telégrafo: faixa média
      bp.Q.value = 3

      const g1 = ac.createGain()
      g1.gain.setValueAtTime(0.1 * master, now)
      src.connect(bp); bp.connect(g1); g1.connect(ac.destination)
      src.start(now)

      // Componente 2: tom elétrico residual do contato — característica do telégrafo
      const osc = ac.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800 + v * 200, now)
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03)  // glide descendente
      const og = ac.createGain()
      og.gain.setValueAtTime(0.018 * master, now)
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.035)
      osc.connect(og); og.connect(ac.destination)
      osc.start(now); osc.stop(now + 0.04)

    } catch {}
    if (!telegraphBuffer && !telegraphLoading) loadTelegraphBuffer()
  },

  // Som de lápis/caneta deslizando no papel — para o drawing no Review
  drawing() {
    try {
      const ac = getCtx()
      const master = getVolume()
      const now = ac.currentTime
      const v = Math.random()
      const dur = 0.035 + v * 0.025
      const bufLen = Math.floor(ac.sampleRate * dur)
      const buf = ac.createBuffer(1, bufLen, ac.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) {
        const pos = i / bufLen
        const env = Math.sin(pos * Math.PI) * 0.7 + 0.3
        const grain = Math.random() < 0.65 ? (Math.random() * 2 - 1) : 0
        data[i] = grain * env
      }
      const src = ac.createBufferSource()
      src.buffer = buf
      const bp = ac.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 500 + v * 500
      bp.Q.value = 1.2
      const hs = ac.createBiquadFilter()
      hs.type = 'highshelf'
      hs.frequency.value = 2800
      hs.gain.value = -10
      const g = ac.createGain()
      g.gain.setValueAtTime(0.055 * master, now)
      src.connect(bp); bp.connect(hs); hs.connect(g); g.connect(ac.destination)
      src.start(now)
    } catch {}
  },

  // Clique seco — botões
  click() {
    playTone({ freq: 1800, type: 'square', duration: 0.014, volume: 0.06, attack: 0.001, decay: 0.006, sustain: 0.02, release: 0.005 })
  },

  // Tab — tick nítido para abas/filtros
  tab() {
    playTone({ freq: 2200, type: 'square', duration: 0.012, volume: 0.05, attack: 0.001, decay: 0.005, sustain: 0.01, release: 0.004 })
  },

  // Enter
  enter() {
    if (telegraphBuffer) {
      playTelegraphClick(1.0)
      setTimeout(() => playTelegraphClick(0.7), 40)
    } else {
      playTone({ freq: 900, type: 'square', duration: 0.05, volume: 0.09, attack: 0.001, decay: 0.015, sustain: 0.08, release: 0.02 })
      setTimeout(() => playTone({ freq: 1300, type: 'sine', duration: 0.06, volume: 0.06, release: 0.05 }), 50)
    }
  },

  // Sucesso
  success() {
    ;[0, 80, 160].forEach((delay, i) => {
      const freqs = [523, 659, 784]
      setTimeout(() => playTone({ freq: freqs[i], type: 'sine', duration: 0.18, volume: 0.12, attack: 0.005, release: 0.12 }), delay)
    })
  },

  // Erro
  error() {
    playTone({ freq: 280, type: 'sawtooth', duration: 0.18, volume: 0.09, attack: 0.01, release: 0.1 })
    setTimeout(() => playTone({ freq: 220, type: 'sawtooth', duration: 0.18, volume: 0.07, attack: 0.01, release: 0.1 }), 100)
  },

  // Notificação
  notify() {
    playTone({ freq: 1200, type: 'sine', duration: 0.1, volume: 0.11 })
    setTimeout(() => playTone({ freq: 1600, type: 'sine', duration: 0.12, volume: 0.09, release: 0.09 }), 90)
  },

  // Abrir
  open() {
    ;[440, 550, 660].forEach((f, i) => setTimeout(() => playTone({ freq: f, type: 'sine', duration: 0.09, volume: 0.07, attack: 0.005, release: 0.06 }), i * 35))
  },

  // Fechar
  close() {
    ;[660, 550, 400].forEach((f, i) => setTimeout(() => playTone({ freq: f, type: 'sine', duration: 0.08, volume: 0.06, attack: 0.005, release: 0.05 }), i * 30))
  },

  // Salvar
  save() {
    playTone({ freq: 880, type: 'triangle', duration: 0.08, volume: 0.1 })
    setTimeout(() => playTone({ freq: 1100, type: 'triangle', duration: 0.09, volume: 0.08, release: 0.07 }), 60)
  },

  // Excluir
  delete() {
    playTone({ freq: 400, type: 'sawtooth', duration: 0.2, volume: 0.08, attack: 0.005, release: 0.14 })
    setTimeout(() => playTone({ freq: 250, type: 'sawtooth', duration: 0.18, volume: 0.06, release: 0.12 }), 80)
  },
}

const ENABLED_KEY = 'atelier_sounds_enabled'
const VOLUME_KEY  = 'atelier_sound_volume'

export function useSounds() {
  function isEnabled() { return localStorage.getItem(ENABLED_KEY) !== 'false' }
  function getVol()    { return parseFloat(localStorage.getItem(VOLUME_KEY) ?? '0.5') }

  function play(soundId) {
    if (!isEnabled()) return
    const fn = SOUNDS[soundId]
    if (fn) try { fn() } catch {}
  }

  function toggle() {
    const next = !isEnabled()
    localStorage.setItem(ENABLED_KEY, String(next))
    if (next) try { SOUNDS.notify() } catch {}
    return next
  }

  function setVolume(v) {
    localStorage.setItem(VOLUME_KEY, String(Math.max(0, Math.min(1, v))))
  }

  // Pré-carregar o buffer do telégrafo ao inicializar
  function preload() { loadTelegraphBuffer() }

  return { play, toggle, setVolume, isEnabled, getVol, preload, sounds: SOUNDS }
}
