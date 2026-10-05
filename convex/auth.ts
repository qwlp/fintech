import { convexAuth } from "@convex-dev/auth/server";
import type { Value } from "convex/values";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params): { email: string; [key: string]: Value } {
        const email = String(params.email ?? "")
          .trim()
          .toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          throw new Error("Enter a valid email address");
        if (params.flow !== "signUp") return { email };
        const name = String(params.name ?? "").trim();
        const role = params.role;
        if (!name || name.length > 100) throw new Error("Enter your full name");
        if (role !== "Student" && role !== "Sponsor")
          throw new Error("Choose an account type");
        return { email, name, role };
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) return args.existingUserId;
      const { email, name, role } = args.profile;
      if (role !== "Student" && role !== "Sponsor")
        throw new Error("Invalid account type");
      const userId = await ctx.db.insert("users", { email, name });
      await ctx.db.insert("accounts", {
        userId,
        email: String(email),
        name: String(name),
        role,
        initials: String(name)
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase(),
        planName: role === "Student" ? "My Study Plan" : "Sponsorship",
        countryFrom: "",
        countryTo: "",
        university: "",
        course: "",
        paymentStatus: "not_started",
        selectedRoute: "",
        sponsorRequestSent: false,
      });
      return userId;
    },
  },
});
