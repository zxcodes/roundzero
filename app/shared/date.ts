import { differenceInDays, differenceInMinutes, format, isValid, parseISO } from "date-fns";

export function formatDate(date: Date | string | null): string {
  if (!date) return "";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateShort(date: Date | string | null): string {
  if (!date) return "";
  return format(new Date(date), "MMM d");
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "";
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function formatDateTimeUtc(date: Date | string | null): string {
  if (!date) return "Pending";
  const value = typeof date === "string" ? new Date(date) : date;
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][value.getUTCMonth()];
  const day = value.getUTCDate();
  const year = value.getUTCFullYear();
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  return `${month} ${day}, ${year} · ${hours}:${minutes} UTC`;
}

export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "";
  const diffInMinutes = Math.round((Date.now() - new Date(date).getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.round(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export function formatTimeLeft(date: Date | string | null): string | null {
  if (!date) return null;
  const end = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(end)) return null;

  const minutesLeft = differenceInMinutes(end, new Date());
  if (minutesLeft <= 0) return "Expired";

  const hoursLeft = Math.ceil(minutesLeft / 60);
  if (hoursLeft < 1) return "<1h left";

  return `${hoursLeft}h left`;
}

export function formatDaysLeft(date: Date | string | null): string | null {
  if (!date) return null;
  const end = typeof date === "string" ? new Date(date) : date;
  if (!isValid(end)) return null;

  const days = differenceInDays(end, new Date());
  if (days < 0) return "Expired";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 30) return `Closes in ${days} days`;
  return `Closes ${format(end, "MMM d, yyyy")}`;
}

export function formatDeadlineLabel(value: string | null): string | null {
  if (!value) return null;
  const date = parseISO(value);
  if (!isValid(date)) return null;
  return format(date, "MMM d, yyyy h:mm a");
}
