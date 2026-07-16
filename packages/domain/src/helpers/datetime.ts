export function calendarYearsBefore(timestamp: number, years: number) {
  const date = new Date(timestamp);
  const targetYear = date.getUTCFullYear() - years;
  const lastTargetMonthDay = new Date(Date.UTC(targetYear, date.getUTCMonth() + 1, 0)).getUTCDate();
  return Date.UTC(
    targetYear,
    date.getUTCMonth(),
    Math.min(date.getUTCDate(), lastTargetMonthDay),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  );
}
