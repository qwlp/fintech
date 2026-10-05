import { getAuthUserId } from "@convex-dev/auth/server";
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";

export async function requireAccount(
  ctx: GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel>,
  accountId?: Id<"accounts">,
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Sign in to continue");
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!account || (accountId && account._id !== accountId))
    throw new Error("Account access denied");
  return account;
}
