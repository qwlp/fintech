import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  accounts: defineTable({
    email: v.string(),
    name: v.string(),
    initials: v.string(),
    role: v.string(),
    planName: v.string(),
    countryFrom: v.string(),
    countryTo: v.string(),
    university: v.string(),
    course: v.string(),
    paymentStatus: v.union(
      v.literal("not_started"),
      v.literal("prepared"),
      v.literal("approved"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    selectedRoute: v.string(),
    sponsorRequestSent: v.boolean(),
    ownerAccountId: v.optional(v.id("accounts")),
    moveType: v.optional(
      v.union(
        v.literal("study"),
        v.literal("work"),
        v.literal("relocation"),
        v.literal("travel"),
      ),
    ),
  })
    .index("by_email", ["email"])
    .index("by_owner_accountId", ["ownerAccountId"]),
  costs: defineTable({
    accountId: v.id("accounts"),
    key: v.string(),
    name: v.string(),
    category: v.string(),
    amount: v.number(),
    due: v.string(),
    paid: v.optional(v.boolean()),
  }).index("by_account", ["accountId"]),
  funding: defineTable({
    accountId: v.id("accounts"),
    key: v.string(),
    name: v.string(),
    type: v.string(),
    amount: v.number(),
    status: v.string(),
    available: v.string(),
  }).index("by_account", ["accountId"]),
  sponsorLinks: defineTable({
    accountId: v.id("accounts"),
    name: v.string(),
    email: v.string(),
    relationship: v.string(),
    commitment: v.number(),
    nextDate: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
    notificationId: v.id("notifications"),
  })
    .index("by_account_status", ["accountId", "status"])
    .index("by_account_email", ["accountId", "email"]),
  sponsors: defineTable({
    accountId: v.id("accounts"),
    key: v.string(),
    name: v.string(),
    relationship: v.string(),
    commitment: v.number(),
    nextDate: v.string(),
    permissions: v.array(v.string()),
  }).index("by_account", ["accountId"]),
  wallets: defineTable({
    accountId: v.id("accounts"),
    currency: v.string(),
    symbol: v.string(),
    amount: v.number(),
    gbpValue: v.number(),
    label: v.string(),
  }).index("by_account", ["accountId"]),
  paymentRoutes: defineTable({
    accountId: v.id("accounts"),
    key: v.string(),
    provider: v.string(),
    sourceAmount: v.number(),
    fee: v.number(),
    fxRate: v.number(),
    delivery: v.string(),
    recommended: v.optional(v.boolean()),
  }).index("by_account", ["accountId"]),
  auditEvents: defineTable({
    accountId: v.id("accounts"),
    type: v.string(),
    detail: v.string(),
    timestamp: v.number(),
    actor: v.string(),
  }).index("by_account", ["accountId"]),
  messages: defineTable({
    accountId: v.id("accounts"),
    from: v.union(v.literal("agent"), v.literal("user")),
    text: v.string(),
    timestamp: v.number(),
  }).index("by_account", ["accountId"]),
  notifications: defineTable({
    accountId: v.id("accounts"),
    title: v.string(),
    detail: v.string(),
    read: v.boolean(),
    timestamp: v.number(),
  }).index("by_account", ["accountId"]),
  checklist: defineTable({
    accountId: v.id("accounts"),
    key: v.string(),
    label: v.string(),
    detail: v.string(),
    done: v.boolean(),
    position: v.number(),
  }).index("by_account", ["accountId"]),
  appConfig: defineTable({
    accountId: v.id("accounts"),
    key: v.string(),
    value: v.any(),
  })
    .index("by_account", ["accountId"])
    .index("by_account_and_key", ["accountId", "key"]),
  sponsorRequests: defineTable({
    accountId: v.id("accounts"),
    sponsorKey: v.string(),
    amount: v.number(),
    purpose: v.string(),
    neededBy: v.string(),
    status: v.union(v.literal("sent"), v.literal("fulfilled")),
    createdAt: v.number(),
  }).index("by_account", ["accountId"]),
  rateAlerts: defineTable({
    accountId: v.id("accounts"),
    pair: v.string(),
    targetRate: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_account", ["accountId"]),
});
