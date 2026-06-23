export const CURRENCY_CODE = "GHS";

export const formatCurrency = (value: number | string | null | undefined): string => {
  const amount = typeof value === "number" ? value : parseCurrency(value);
  return `${CURRENCY_CODE} ${amount.toFixed(2)}`;
};

export const parseCurrency = (value: number | string | null | undefined): number => {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const normalized = value
    .toString()
    .replace(/GHS/gi, "")
    .replace(/[£$,]/g, "")
    .trim();

  const amount = parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
};
