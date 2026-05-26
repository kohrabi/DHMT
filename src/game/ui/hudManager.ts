import { eventBus } from "@/engine/eventBus";

export class HudManager {
  private container: HTMLDivElement;
  private coinDisplay: HTMLSpanElement;
  private scoreDisplay: HTMLSpanElement;
  private comboDisplay: HTMLDivElement;

  private coins = 0;
  private score = 0;

  constructor() {
    this.container = document.createElement("div");
    this.container.id = "hud";
    this.container.innerHTML = `
      <style>
        #hud {
          position: fixed; top: 16px; left: 50%;
          transform: translateX(-50%);
          display: flex; gap: 32px;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.7rem; color: #fff;
          text-shadow: 2px 2px 0 #000;
          z-index: 100; pointer-events: none;
          align-items: center;
        }
        .hud-item { display: flex; align-items: center; gap: 8px; }
        .hud-coin { color: #ffd700; font-size: 1.1rem; }
        .hud-score { color: #ffffff; }
        #hud-combo {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%) scale(0);
          font-family: 'Press Start 2P', monospace;
          font-size: 1.2rem; color: #ff4444;
          text-shadow: 3px 3px 0 #000;
          transition: transform 0.1s ease-in-out;
          z-index: 101; pointer-events: none;
        }
        #hud-combo.active { transform: translate(-50%, -50%) scale(1.3); }
      </style>
      <div class="hud-item">
        <span class="hud-coin">🪙</span>
        <span id="hud-coins" class="hud-score">x 0</span>
      </div>
      <div class="hud-item">
        <span>⭐</span>
        <span id="hud-score" class="hud-score">000000</span>
      </div>
    `;
    document.body.appendChild(this.container);

    this.comboDisplay = document.createElement("div");
    this.comboDisplay.id = "hud-combo";
    document.body.appendChild(this.comboDisplay);

    this.coinDisplay = this.container.querySelector("#hud-coins") as HTMLSpanElement;
    this.scoreDisplay = this.container.querySelector("#hud-score") as HTMLSpanElement;
  }

  addCoin(amount = 1): void {
    this.coins += amount;
    this.coinDisplay.textContent = `x ${this.coins}`;
    this.addScore(100 * amount);
    eventBus.emit("hud:coinAdded", this.coins);
  }

  addScore(points: number): void {
    this.score += points;
    this.scoreDisplay.textContent = String(this.score).padStart(6, "0");
  }

  showCombo(count: number): void {
    this.comboDisplay.textContent = `${count}x COMBO!`;
    this.comboDisplay.classList.add("active");
    setTimeout(() => this.comboDisplay.classList.remove("active"), 800);
  }

  showMessage(text: string, duration = 2000): void {
    const msg = document.createElement("div");
    msg.style.cssText = `
      position: fixed; top: 40%; left: 50%;
      transform: translate(-50%, -50%) scale(0);
      font-family: 'Press Start 2P', monospace;
      font-size: 2rem; color: #fff;
      text-shadow: 4px 4px 0 #000;
      z-index: 200; pointer-events: none;
      transition: transform 0.3s ease;
    `;
    msg.textContent = text;
    document.body.appendChild(msg);
    requestAnimationFrame(() => {
      msg.style.transform = "translate(-50%, -50%) scale(1)";
    });
    setTimeout(() => msg.remove(), duration);
  }

  dispose(): void {
    this.container.remove();
    this.comboDisplay.remove();
  }
}
