//src/utils/time.ts
export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}`;
}

export function generateTimeSlots(step = 15) {
  const slots: string[] = [];

  for (let i = 0; i < 24 * 60; i += step) {
    const h = Math.floor(i / 60);
    const m = i % 60;

    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");

    slots.push(`${hh}:${mm}`);
  }

  return slots;
}