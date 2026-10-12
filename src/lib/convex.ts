import { deployment } from "./deployment";
import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

export const demoEmail = "dara@financialpassport.demo";
export const convexUrl = deployment.convexUrl as string | undefined;
export const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

export const convexApi = api.accounts;
