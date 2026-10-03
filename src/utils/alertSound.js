let ctx = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

// Browsers block audio until the user has interacted with the page.
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function playAlarm({ beeps = 3, freq = 900, beepMs = 200, gapMs = 100, volume = 1 } = {}) {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  let t = c.currentTime;
  for (let i = 0; i < beeps; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square"; // harsh, cuts through factory noise
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.setValueAtTime(0, t + beepMs / 1000);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + beepMs / 1000);
    t += (beepMs + gapMs) / 1000;
  }
}