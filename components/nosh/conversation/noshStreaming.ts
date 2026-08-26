export function getNoshRevealLength(
  currentLength: number,
  targetLength: number,
  finishing: boolean,
): number {
  if (currentLength >= targetLength) return targetLength;
  const remaining = targetLength - currentLength;
  const divisor = finishing ? 3 : 6;
  const maximumStep = finishing ? 24 : 12;
  const minimumStep = finishing ? 2 : 1;
  const step = Math.min(maximumStep, Math.max(minimumStep, Math.ceil(remaining / divisor)));
  return Math.min(targetLength, currentLength + step);
}
