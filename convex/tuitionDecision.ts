// Shared by the server, UI and evaluations. All inputs are sandbox observations.
export type DecisionRoute = {
  key: string;
  provider: string;
  fxRate: number;
  fee: number;
  delivery: string;
  maxBusinessDays?: number;
  quotedAt?: number;
  quoteExpiresAt?: number;
};
export type DecisionInput = {
  amountGBP: number;
  reserveGBP: number;
  wallets: { currency: string; amount: number; gbpValue: number }[];
  routes: DecisionRoute[];
  deadline?: string;
  bufferBusinessDays?: number;
  now: number;
};
export function parseDeadline(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Use a valid YYYY-MM-DD deadline");
  const date = Date.parse(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(date) ||
    new Date(date).toISOString().slice(0, 10) !== value
  )
    throw new Error("Use a valid YYYY-MM-DD deadline");
  return date;
}
export function addBusinessDays(timestamp: number, days: number): number {
  if (!Number.isInteger(days) || days < 0 || days > 60)
    throw new Error("Invalid delivery window");
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  for (let remaining = days; remaining > 0;) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) remaining--;
  }
  return date.getTime();
}
export function quoteFingerprint(
  amountGBP: number,
  recipient: string,
  last4: string,
  route: DecisionRoute,
) {
  return JSON.stringify([
    Math.round(amountGBP * 100),
    recipient,
    last4,
    route.key,
    route.fxRate,
    Math.round(route.fee * 100),
    route.delivery,
    route.quoteExpiresAt,
  ]);
}
export function tuitionQuote(
  amountGBP: number,
  route: Pick<DecisionRoute, "fxRate" | "fee">,
) {
  const amountMinor = Math.round(amountGBP * 100);
  const feeMinor = Math.round(route.fee * 100);
  const sourceMinor = Math.ceil(amountMinor / route.fxRate);
  const totalMinor = sourceMinor + feeMinor;
  if (
    ![amountGBP, route.fxRate, route.fee].every(Number.isFinite) ||
    amountMinor <= 0 ||
    route.fxRate <= 0 ||
    route.fee < 0 ||
    ![amountMinor, feeMinor, sourceMinor, totalMinor].every(
      Number.isSafeInteger,
    )
  )
    throw new Error("Invalid payment quote");
  return { amountMinor, sourceMinor, feeMinor, totalMinor };
}
const minor = (amount: number) => Math.round(amount * 100);
export function assessTuition(input: DecisionInput) {
  const { amountGBP, reserveGBP, wallets, routes, now } = input;
  const buffer = input.bufferBusinessDays ?? 1;
  if (
    ![amountGBP, reserveGBP, now].every(Number.isFinite) ||
    amountGBP <= 0 ||
    reserveGBP < 0 ||
    !Number.isSafeInteger(minor(amountGBP)) ||
    minor(amountGBP) <= 0 ||
    !Number.isSafeInteger(minor(reserveGBP)) ||
    !Number.isInteger(buffer) ||
    buffer < 0 ||
    buffer > 5
  )
    throw new Error("Invalid tuition planning inputs");
  if (
    wallets.some(
      (w) =>
        !Number.isFinite(w.amount) ||
        w.amount < 0 ||
        !Number.isFinite(w.gbpValue) ||
        w.gbpValue < 0 ||
        !Number.isSafeInteger(minor(w.amount)) ||
        (w.amount === 0 && w.gbpValue !== 0),
    )
  )
    throw new Error("Wallet valuations unavailable");
  const deadline = input.deadline ? parseDeadline(input.deadline) : null;
  const usd = wallets.find((w) => w.currency === "USD");
  const availableMinor = minor(usd?.amount ?? 0);
  const valuation = usd && usd.amount > 0 ? usd.gbpValue / usd.amount : null;
  const liquidGBP = wallets.reduce((sum, w) => sum + w.gbpValue, 0);
  if (!Number.isSafeInteger(minor(liquidGBP)))
    throw new Error("Wallet valuations unavailable");
  const assessments = routes
    .map((route) => {
      const valid =
        Number.isFinite(route.fxRate) &&
        route.fxRate > 0 &&
        Number.isFinite(route.fee) &&
        route.fee >= 0;
      let totalMinor: number | null = null;
      if (valid) {
        try {
          totalMinor = tuitionQuote(amountGBP, route).totalMinor;
        } catch {}
      }
      const totalValid =
        totalMinor !== null && Number.isSafeInteger(totalMinor);
      const arrivalKnown =
        Number.isInteger(route.maxBusinessDays) &&
        route.maxBusinessDays! >= 0 &&
        route.maxBusinessDays! <= 30;
      const arrivalAt = arrivalKnown
        ? addBusinessDays(now, route.maxBusinessDays! + buffer)
        : null;
      const fresh =
        Number.isFinite(route.quotedAt) &&
        route.quotedAt! <= now &&
        Number.isFinite(route.quoteExpiresAt) &&
        route.quoteExpiresAt! > now;
      const remainingGBPMinor =
        totalValid && valuation !== null
          ? minor(liquidGBP - (totalMinor! / 100) * valuation)
          : null;
      const affordable = totalValid && availableMinor >= totalMinor!;
      const preservesReserve =
        remainingGBPMinor !== null && remainingGBPMinor >= minor(reserveGBP);
      const meetsDeadline =
        deadline !== null && arrivalAt !== null ? arrivalAt <= deadline : null;
      const blockers: string[] = [];
      if (!totalValid) blockers.push("Invalid quote");
      if (!fresh) blockers.push("Refresh expired or undated quote");
      if (!affordable) blockers.push("Insufficient available USD");
      if (!preservesReserve)
        blockers.push(
          "Living-cost reserve would be breached or cannot be valued",
        );
      if (deadline === null) blockers.push("Set a tuition deadline");
      else if (meetsDeadline === null)
        blockers.push("Delivery window unavailable");
      else if (!meetsDeadline)
        blockers.push("Estimated arrival misses the deadline and buffer");
      const fundingGapMinor = totalValid
        ? Math.max(0, totalMinor! - availableMinor)
        : null;
      const reserveGapMinor =
        remainingGBPMinor !== null
          ? Math.max(0, minor(reserveGBP) - remainingGBPMinor)
          : null;
      // An illustrative top-up using the wallet's existing USD valuation, never a promise of funding.
      const minimumTopUpUSD =
        fundingGapMinor !== null &&
        reserveGapMinor !== null &&
        valuation !== null &&
        valuation > 0
          ? Math.max(fundingGapMinor, Math.ceil(reserveGapMinor / valuation)) /
            100
          : null;
      return {
        routeKey: route.key,
        provider: route.provider,
        totalUSD: totalValid ? totalMinor! / 100 : null,
        feeUSD: route.fee,
        rateGBPPerUSD: route.fxRate,
        delivery: route.delivery,
        quotedAt: route.quotedAt ?? null,
        quoteExpiresAt: route.quoteExpiresAt ?? null,
        estimatedArrival:
          arrivalAt === null
            ? null
            : new Date(arrivalAt).toISOString().slice(0, 10),
        affordable,
        preservesReserve,
        meetsDeadline,
        fresh,
        eligible: blockers.length === 0,
        blockers,
        remainingUSD: totalValid ? (availableMinor - totalMinor!) / 100 : null,
        remainingGBP:
          remainingGBPMinor === null ? null : remainingGBPMinor / 100,
        protectedReserveGBP: reserveGBP,
        minimumTopUpUSD,
      };
    })
    .sort(
      (a, b) =>
        (a.totalUSD ?? Infinity) - (b.totalUSD ?? Infinity) ||
        a.routeKey.localeCompare(b.routeKey),
    );
  const recommended = assessments.find((route) => route.eligible);
  return {
    sandbox: true as const,
    assessedAt: now,
    recipientAmountGBP: amountGBP,
    deadline: input.deadline ?? null,
    bufferBusinessDays: buffer,
    source:
      "Illustrative sandbox quotes and wallet valuations; no live provider data",
    routes: assessments,
    recommendedRouteKey: recommended?.routeKey ?? null,
    explanation: recommended
      ? `${recommended.provider} is the lowest-cost eligible route: sufficient USD, protected living funds and estimated arrival by the deadline with the selected buffer.`
      : "No route currently satisfies all checks. Resolve the listed blockers before preparing a payment.",
    assumptions:
      "Delivery uses UTC dates and Monday–Friday business days plus a safety buffer. Bank holidays, cutoff times and university processing are excluded; arrival is an estimate. Pending sponsor commitments are not available cash. Top-ups use the current sandbox wallet valuation and require actual receipt of funds.",
  };
}

export function hasPreparationIntent(text: string): boolean {
  // Conservative: quoted, negative, hypothetical and instruction-discussion requests require UI preparation.
  if (
    /["“”`]/.test(text) ||
    /\b(not|never|don[’']?t|do\s+not|avoid|without|if|example|pretend|ignore|instruction|quoted)\b/i.test(
      text,
    )
  )
    return false;
  return /(?:^|[.!?]\s+|\bthen\s+)(?:(?:please|can you|could you|would you)\s+)*(?:prepare|draft)\s+(?:my|the|a)\s+(?:tuition\s+)?payment\b/i.test(
    text.trim(),
  );
}
