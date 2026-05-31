export function clampConfidence(value) {
    return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}
export function toPercent(value) {
    return Math.round(clampConfidence(value) * 100);
}
