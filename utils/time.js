export function nextArrivalTime(now, headwayMin = 3) {
  if (!headwayMin || headwayMin <= 0) {
    throw new Error('Invalid headway');
  }
  const mins = now.hour * 60 + now.minute;
  const delta = (headwayMin - (mins % headwayMin)) % headwayMin;
  const nextMin = mins + delta;
  const hh = String(Math.floor(nextMin / 60) % 24).padStart(2, '0');
  const mm = String(nextMin % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
