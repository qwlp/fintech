export function formatMoneyInput(value: string): string {
  const [whole, fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}
export function parseMoneyInput(value: string): string | null {
  const raw = value.replace(/[,\s$£€¥]/g, "");
  if (!/^\d*(\.\d{0,2})?$/.test(raw)) return null;
  return raw.startsWith(".") ? `0${raw}` : raw;
}
export function changeMoneyAmount(
  amount: number,
  direction: number,
  min = 0,
  max = Infinity,
): number {
  return Math.min(
    max,
    Math.max(min, Math.round((amount + direction) * 100) / 100),
  );
}
