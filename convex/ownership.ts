import { getAuthUserId } from "@convex-dev/auth/server";
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";

export async function requireAccount(
  ctx: GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel>,
  accountId?: Id<"accounts">,
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Sign in to continue");
  if (accountId) {
    const account = await ctx.db.get(accountId);
    if (!account || account.userId !== userId)
      throw new Error("Account access denied");
    return account;
  }
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (!account)
    throw new Error("Account access denied");
  if (account.activeCountryAccountId) {
    const active = await ctx.db.get(account.activeCountryAccountId);
    if (active?.userId === userId) return active;
  }
  return account;
}
