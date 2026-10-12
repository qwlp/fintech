import { defineApp } from "convex/server";
import { v } from "convex/values";
export default defineApp({
  env: {
    AI_PROVIDER: v.optional(v.string()),
    AI_BASE_URL: v.optional(v.string()),
    AI_MODEL: v.optional(v.string()),
    AI_API_KEY: v.optional(v.string()),
    AI_ALLOW_NO_KEY: v.optional(v.string()),
    AI_TIMEOUT_MS: v.optional(v.string()),
    OPENROUTER_KEY: v.optional(v.string()),
    OPENROUTER_API_KEY: v.optional(v.string()),
    OPENROUTER_MODEL: v.optional(v.string()),
  },
});
