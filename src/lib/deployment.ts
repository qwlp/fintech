type DeploymentConfig = {
  convexUrl?: string;
  fxRatesUrl?: string;
  fxSourceUrl?: string;
  fxSourceLabel?: string;
};
declare global {
  interface Window {
    MOVEWISE_CONFIG?: DeploymentConfig;
  }
}
const runtime =
  typeof window === "undefined" ? {} : (window.MOVEWISE_CONFIG ?? {});
export const deployment = {
  convexUrl: runtime.convexUrl ?? import.meta.env.VITE_CONVEX_URL,
  fxRatesUrl:
    runtime.fxRatesUrl ??
    (import.meta.env.VITE_FX_RATES_URL ||
      "https://api.frankfurter.dev/v2/rates"),
  fxSourceUrl:
    runtime.fxSourceUrl ??
    (import.meta.env.VITE_FX_SOURCE_URL ||
      (!runtime.fxRatesUrl && !import.meta.env.VITE_FX_RATES_URL
        ? "https://frankfurter.dev/"
        : undefined)),
  fxSourceLabel:
    runtime.fxSourceLabel ??
    import.meta.env.VITE_FX_SOURCE_LABEL ??
    (!runtime.fxRatesUrl && !import.meta.env.VITE_FX_RATES_URL
      ? "Frankfurter daily reference rates"
      : "Exchange rate source"),
};
