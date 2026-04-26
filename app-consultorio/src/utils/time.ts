//src/utils/time.ts

function formatLocalDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")

  return `${y}-${m}-${d}`
}

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

export function getNextDateForDay(dayOfWeek: number) {
  const today = new Date()
  const result = new Date(today)

  const diff =
    (dayOfWeek + 7 - today.getDay()) % 7

  result.setDate(today.getDate() + diff)

  return result
}

export function generateNextDays(count = 7) {
  const days = []

  for (let i = 0; i < count; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)

    days.push({
      date: formatLocalDate(d),
      label: d.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "short"
      })
    })
  }

  return days
}