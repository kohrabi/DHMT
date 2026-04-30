function clampf(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function moveTowards(value: number, end: number, delta: number): number {
  if (value > end)
    return Math.max(value - Math.abs(delta), end); // value <= end
  else return Math.min(value + Math.abs(delta), end);
}

export { clampf, moveTowards };
