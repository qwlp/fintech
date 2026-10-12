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
  fxRatesUrl: runtime.fxRatesUrl ?? import.meta.env.VITE_FX_RATES_URL,
  fxSourceUrl: runtime.fxSourceUrl ?? import.meta.env.VITE_FX_SOURCE_URL,
  fxSourceLabel:
    runtime.fxSourceLabel ??
    import.meta.env.VITE_FX_SOURCE_LABEL ??
    "Exchange rate source",
};
