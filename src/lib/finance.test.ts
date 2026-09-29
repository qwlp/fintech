import { describe, expect, it } from "vitest";
import {
  confirmedFunding,
  convertCurrency,
  fundingCoverage,
  fundingGap,
  monthlyBurn,
  routeEffectiveCost,
  runway,
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
