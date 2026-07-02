/*
 * Tiny retro sound engine built entirely from Web Audio oscillators, so there are
 * no audio files to load and nothing for the Content Security Policy to allow
 * (Web Audio is not a fetch). Short square/triangle blips in the early-arcade
 * spirit. The AudioContext is created lazily on the first sound AFTER a user
 * gesture, which respects browser autoplay rules and keeps the page quiet by
 * default. Muted unless the player turns sound on.
 */
export class ArcadeAudio {
  private ctx: AudioContext | null = null
  private enabled = false

  setEnabled(on: boolean) {
    this.enabled = on
    if (on) this.ensure()
  }

  isEnabled() {
    return this.enabled
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      try {
        this.ctx = new Ctor()
      } catch {
        return null
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    return this.ctx
  }

  private blip(freq: number, duration: number, type: OscillatorType = 'square', gain = 0.05) {
    if (!this.enabled) return
    const ctx = this.ensure()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const amp = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    amp.gain.setValueAtTime(0, t)
    amp.gain.linearRampToValueAtTime(gain, t + 0.005)
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(amp).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }

  private sweep(from: number, to: number, duration: number, type: OscillatorType = 'triangle', gain = 0.05) {
    if (!this.enabled) return
    const ctx = this.ensure()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const amp = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration)
    amp.gain.setValueAtTime(gain, t)
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(amp).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }

  shoot() {
    this.sweep(220, 520, 0.14, 'square', 0.04)
  }
  make() {
    // A quick rising two-note "swish".
    this.blip(660, 0.09, 'square', 0.05)
    window.setTimeout(() => this.blip(990, 0.13, 'square', 0.05), 70)
  }
  rim() {
    this.blip(150, 0.09, 'square', 0.05)
  }
  miss() {
    this.sweep(300, 90, 0.22, 'sawtooth', 0.04)
  }
  select() {
    this.blip(440, 0.04, 'square', 0.035)
  }
  start() {
    this.blip(523, 0.08, 'square', 0.05)
    window.setTimeout(() => this.blip(784, 0.12, 'square', 0.05), 90)
  }
  gameover() {
    this.sweep(400, 70, 0.5, 'triangle', 0.05)
  }
}
