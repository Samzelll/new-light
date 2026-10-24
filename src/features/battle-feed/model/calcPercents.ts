// src/features/battle-feed/model/calcPercents.ts
export function calcPercents(red: number, green: number) {
  const safeRed = Math.max(0, Number(red) || 0);
  const safeGreen = Math.max(0, Number(green) || 0);
  const total = safeRed + safeGreen;
  if (total <= 0) return { red: 50, green: 50 };
  const r = Math.round((safeRed / total) * 100);
  const clamped = Math.max(1, Math.min(99, r));
  return { red: clamped, green: 100 - clamped };
}
