export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

export function toPercent(value: number): number {
  return Math.round(clampConfidence(value) * 100);
}
