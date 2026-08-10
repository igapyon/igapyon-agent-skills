const FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function pad(value) {
  return String(value).padStart(2, "0");
}

export function jstDateParts(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("A valid Date is required for JST timestamp formatting");
  }
  const values = Object.fromEntries(
    FORMATTER.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

export function jstTimestamp(date = new Date()) {
  const parts = jstDateParts(date);
  return `${parts.year}${pad(parts.month)}${pad(parts.day)}${pad(parts.hour)}${pad(parts.minute)}`;
}

export function jstDashedTimestamp(date = new Date()) {
  const parts = jstDateParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}-${pad(parts.hour)}${pad(parts.minute)}`;
}

export function dateFromJstParts({ year, month, day, hour, minute }) {
  if (![year, month, day, hour, minute].every(Number.isSafeInteger)) return null;
  const date = new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
  const actual = jstDateParts(date);
  if (actual.year !== year || actual.month !== month || actual.day !== day
    || actual.hour !== hour || actual.minute !== minute) return null;
  return date;
}
