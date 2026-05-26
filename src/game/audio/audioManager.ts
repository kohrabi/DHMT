export class AudioManager {
  private static instance: AudioManager;
  private audioContext?: AudioContext;
  private enabled = false;

  static getInstance(): AudioManager {
    if (!this.instance) this.instance = new AudioManager();
    return this.instance;
  }

  init(): void {
    try { this.audioContext = new AudioContext(); this.enabled = true; } catch {}
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = "square", volume = 0.1): void {
    if (!this.enabled || !this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    osc.connect(gain).connect(this.audioContext.destination);
    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  playJump(): void { this.playTone(400, 0.15, "square", 0.08); }
  playCoin(): void { this.playTone(988, 0.05, "square", 0.08); setTimeout(() => this.playTone(1319, 0.15, "square", 0.08), 60); }
  playEnemyKill(): void { this.playTone(200, 0.2, "sawtooth", 0.1); }
  playPowerUp(): void { for (let i = 0; i < 5; i++) setTimeout(() => this.playTone(262 + i * 131, 0.1, "square", 0.08), i * 80); }
  playDeath(): void { this.playTone(400, 0.15, "square", 0.1); setTimeout(() => this.playTone(350, 0.15, "square", 0.1), 150); setTimeout(() => this.playTone(300, 0.15, "square", 0.1), 300); setTimeout(() => this.playTone(250, 0.3, "square", 0.1), 450); }
  playBump(): void { this.playTone(150, 0.1, "triangle", 0.06); }

  dispose(): void {
    this.audioContext?.close();
    this.enabled = false;
  }
}
