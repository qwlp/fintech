import { describe, expect, it } from "vitest";
import {
  confirmedFunding,
  convertCurrency,
  fundingCoverage,
  fundingGap,
  monthlyBurn,
  routeEffectiveCost,
  runway,
  resolvePlanFunding,
  sumCosts,
} from "./finance";
import { costs, funding, routes } from "../data";

describe("financial engine", () => {
  it("calculates the demo plan deterministically", () => {
    expect(sumCosts(costs)).toBe(24600);
    expect(confirmedFunding(funding)).toBe(21900);
    expect(fundingGap(24600, 21900)).toBe(2700);
    expect(fundingCoverage(24600, 21900)).toBeCloseTo(89.024);
  });
  it("does not report negative gaps or invalid coverage", () => {
    expect(fundingGap(100, 200)).toBe(0);
    expect(fundingCoverage(0, 200)).toBe(0);
    expect(fundingCoverage(100, 200)).toBe(100);
  });
  it("calculates burn, runway, conversion and route cost", () => {
    expect(monthlyBurn(650, [250, 80, 70, 55, 120, 75])).toBe(1300);
    expect(runway(8900, 1300)).toBeCloseTo(6.846);
    expect(runway(8900, 0)).toBe(0);
    expect(convertCurrency(100, 0.8, 2)).toBe(78);
    expect(routeEffectiveCost(routes[0])).toBe(2583);
  });
});

describe("saved plan funding", () => {
  it("uses setup funding when no funding sources have been entered", () => {
    const result = resolvePlanFunding([], 19000);
    expect(result.total).toBe(19000);
    expect(result.sources).toMatchObject([
      { name: "Confirmed funding", amount: 19000, status: "confirmed" },
    ]);
    expect(fundingGap(30000, result.total)).toBe(11000);
    expect(fundingCoverage(30000, result.total)).toBeCloseTo(63.3333);
  });
  it("keeps a matching breakdown and does not count the saved total twice", () => {
    const result = resolvePlanFunding(funding, 21900);
    expect(result.total).toBe(21900);
    expect(result.sources).toEqual(funding);
  });
  it("reflects edits and an explicit zero while preserving pending sources", () => {
    for (const amount of [19000, 10000, 0]) {
      const result = resolvePlanFunding(funding, amount);
      expect(result.total).toBe(amount);
      expect(
        result.sources
          .filter((row) => row.status === "confirmed")
          .reduce((sum, row) => sum + row.amount, 0),
      ).toBe(amount);
      expect(result.sources.filter((row) => row.status === "pending")).toEqual(
        funding.filter((row) => row.status === "pending"),
      );
    }
  });
  it.each([undefined, null, "19000", NaN, Infinity, -1])(
    "falls back to recorded sources for an invalid or absent profile total (%s)",
    (amount) => {
      expect(resolvePlanFunding(funding, amount)).toEqual({
        total: 21900,
        sources: funding,
      });
    },
  );
});
