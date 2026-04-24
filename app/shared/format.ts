import type { SalaryCurrency } from "@/shared/enums";

const COMPACT_THRESHOLDS: { divisor: number; suffix: string }[] = [
  { divisor: 10_000_000, suffix: "Cr" },
  { divisor: 100_000, suffix: "L" },
  { divisor: 1_000, suffix: "k" },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
  INR: "₹",
};

const compactNumber = (n: number, currency: string): string => {
  const isINR = currency === "INR";
  const thresholds = isINR
    ? COMPACT_THRESHOLDS
    : COMPACT_THRESHOLDS.filter((t) => t.suffix === "k");

  for (const { divisor, suffix } of thresholds) {
    if (n >= divisor) {
      const value = n / divisor;
      const formatted = value % 1 === 0 ? String(value) : value.toFixed(1);
      return `${formatted}${suffix}`;
    }
  }
  return String(n);
};

export const formatSalary = (
  min: number | null,
  max: number | null,
  currency: string,
): string | null => {
  if (!min && !max) return null;
  const sym = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const fmt = (n: number) => `${sym}${compactNumber(n, currency)}`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
};

export const formatSalaryFull = (
  min: number | null,
  max: number | null,
  currency: string,
): string | null => {
  if (!min && !max) return null;
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
};

export const SALARY_BRACKETS: Record<SalaryCurrency, { value: string; label: string }[]> = {
  USD: [
    { value: "0", label: "Any salary" },
    { value: "50000", label: "$50k+" },
    { value: "100000", label: "$100k+" },
    { value: "150000", label: "$150k+" },
    { value: "200000", label: "$200k+" },
  ],
  EUR: [
    { value: "0", label: "Any salary" },
    { value: "40000", label: "€40k+" },
    { value: "80000", label: "€80k+" },
    { value: "120000", label: "€120k+" },
    { value: "160000", label: "€160k+" },
  ],
  GBP: [
    { value: "0", label: "Any salary" },
    { value: "35000", label: "£35k+" },
    { value: "70000", label: "£70k+" },
    { value: "100000", label: "£100k+" },
    { value: "150000", label: "£150k+" },
  ],
  CAD: [
    { value: "0", label: "Any salary" },
    { value: "60000", label: "C$60k+" },
    { value: "100000", label: "C$100k+" },
    { value: "150000", label: "C$150k+" },
    { value: "200000", label: "C$200k+" },
  ],
  AUD: [
    { value: "0", label: "Any salary" },
    { value: "60000", label: "A$60k+" },
    { value: "100000", label: "A$100k+" },
    { value: "150000", label: "A$150k+" },
    { value: "200000", label: "A$200k+" },
  ],
  INR: [
    { value: "0", label: "Any salary" },
    { value: "500000", label: "₹5L+" },
    { value: "1000000", label: "₹10L+" },
    { value: "2500000", label: "₹25L+" },
    { value: "5000000", label: "₹50L+" },
  ],
};
