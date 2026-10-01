import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// The existing app is a shared demo. Workspace selection is limited to its own move profiles.
export async function getWorkspace(
  ctx: QueryCtx | MutationCtx,
  workspaceId?: Id<"accounts">,
) {
  const owner = await ctx.db
    .query("accounts")
    .withIndex("by_email", (q) => q.eq("email", "dara@financialpassport.demo"))
    .unique();
  if (!owner) throw new Error("Account not found.");
  if (!workspaceId || workspaceId === owner._id) return owner;
  const account = await ctx.db.get("accounts", workspaceId);
  if (!account || account.ownerAccountId !== owner._id)
    throw new Error("Move profile not found.");
  return account;
}
