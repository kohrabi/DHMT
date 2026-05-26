import * as Global from "@/global";
import { GameplayScene } from "../gameplayScene";
import { AudioManager } from "@/game/audio/audioManager";

function showSettingsMessage(): void {
  const msg = document.createElement("div");
  msg.style.cssText = `
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Press Start 2P', monospace;
    font-size: 1rem; color: #fff;
    text-shadow: 2px 2px 0 #000;
    z-index: 300; pointer-events: none;
    background: rgba(0,0,0,0.8);
    padding: 16px 24px;
    border-radius: 8px;
  `;
  msg.textContent = "Coming soon!";
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 2000);
}

export function showMenuUI(): void {
  const cssLink = document.createElement("link");
  cssLink.rel = "stylesheet";
  cssLink.href = "/style/main-menu.css";
  cssLink.id = "main-menu-style";
  document.head.appendChild(cssLink);

  const menuContainer = document.createElement("div");
  menuContainer.id = "main-menu-ui";
  menuContainer.innerHTML = `
    <div class="menu-card">
      <button id="start-btn" class="menu-btn">▶ START GAME</button>
      <button id="settings-btn" class="menu-btn">⚙ SETTINGS</button>
    </div>
  `;
  document.body.appendChild(menuContainer);

  const startBtn = document.getElementById("start-btn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      const audioCtx = (AudioManager.getInstance() as any).audioContext as AudioContext | undefined;
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      cleanupUI();
      Global.sceneManager.setScene(new GameplayScene());
    });
  }

  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      showSettingsMessage();
    });
  }
}

export function cleanupUI(): void {
  const ui = document.getElementById("main-menu-ui");
  if (ui) ui.remove();
  const style = document.getElementById("main-menu-style");
  if (style) style.remove();
}
