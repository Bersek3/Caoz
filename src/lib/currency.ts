/** Formats a plain Chilean-peso amount while leaving descriptive prizes intact. */
export function formatChileanPesos(value: string): string {
  const amount = parseChileanPesos(value);
  return amount === null ? value.trim() : `$${new Intl.NumberFormat('es-CL').format(amount)}`;
}

export function parseChileanPesos(value: string): number | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^\$?\s*([\d.]+)(?:\s*CLP)?$/i);
  if (!match) return null;
  const amount = Number(match[1].replace(/\./g, ''));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function splitChileanPesos(value: string, shares: number): string | null {
  const amount = parseChileanPesos(value);
  if (amount === null || !Number.isInteger(shares) || shares < 1 || amount % shares !== 0) return null;
  return formatChileanPesos(String(amount / shares));
}
