import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

export const demoEmail = "dara@financialpassport.demo";
export const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
export const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

export const convexApi = api.accounts;
