import confetti from 'canvas-confetti';

export function fireConfetti(durationMs = 3500) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    return;
  }
  const end = Date.now() + durationMs;
  const colors = ['#fbbf24', '#f43f5e', '#3b82f6', '#22c55e', '#a855f7'];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 }, colors });
}
