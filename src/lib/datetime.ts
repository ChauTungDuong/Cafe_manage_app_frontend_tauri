export function parseBackendDate(value?: string | Date | null): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  let s = String(value).trim();
  if (!s) return null;

  // Normalize common non-ISO formats.
  // Example: "2026-01-10 06:36:55" -> "2026-01-10T06:36:55"
  if (s.includes(" ") && !s.includes("T")) {
    s = s.replace(" ", "T");
  }

  // Normalize timezone offsets.
  // "+0700" -> "+07:00"
  if (/[+-]\d{4}$/.test(s) && !/[+-]\d{2}:\d{2}$/.test(s)) {
    s = s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  }
  // "+07" -> "+07:00"
  if (/[+-]\d{2}$/.test(s)) {
    s = `${s}:00`;
  }

  // If backend sends a timezone-less timestamp, assume it's UTC.
  // This matches our backend DB setting (timezone: 'Z').
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  if (!hasTz) {
    s = `${s}Z`;
  }

  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function formatDateTimeUTC7(value?: string | Date | null): string {
  const d = parseBackendDate(value);
  if (!d) return "-";
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" });
}
