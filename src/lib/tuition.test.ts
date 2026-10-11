import { describe, expect, it } from "vitest";
import { tuitionEstimates } from "./tuition";

describe("tuition route planning", () => {
  it("includes embedded FX cost even when a platform has no upfront fee", () => {
    const platform = tuitionEstimates("China", "UK", 50000, false)[1];
    expect(platform.fee).toEqual([0, 0]);
    expect(platform.fx).toEqual([600, 1250]);
  });
  it("uses China's wire benchmark without promoting offshore local routing", () => {
    const bank = tuitionEstimates("China", "US", 50000, true)[0];
    expect(bank.fee).toEqual([30, 85]);
    expect(bank.fx).toEqual([100, 250]);
    expect(bank.subtitle).toContain("US ACH eCheck");
  });
  it("separates local conversion from domestic bank payment fees", () => {
    const bank = tuitionEstimates("US", "UK", 50000, true)[0];
    expect(bank.fee).toEqual([0, 0]);
    expect(bank.fx[0]).toBeCloseTo(165);
    expect(bank.fx[1]).toBeCloseTo(325);
  });
  it("keeps domestic conversion at zero and scales US card surcharges", () => {
    const card = tuitionEstimates("US", "US", 2000, false)[2];
    expect(card.fee).toEqual([55, 85]);
    expect(card.fx).toEqual([0, 0]);
  });
  it("distinguishes UK card conversion from Chinese international gateway fees", () => {
    expect(tuitionEstimates("US", "UK", 50000, false)[2].fee).toEqual([0, 0]);
    expect(tuitionEstimates("US", "China", 50000, false)[2].fee).toEqual([
      1000, 1500,
    ]);
  });
});
