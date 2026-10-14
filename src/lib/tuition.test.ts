import { expect, it } from "vitest";
import { tuitionEstimates } from "./tuition";
it("keeps fintech fees upfront and platform spreads embedded", () => {
  const [fintech, platform, bank] = tuitionEstimates("US", "UK", 50000, true);
  expect(fintech.fee[0]).toBeCloseTo(165);
  expect(fintech.fee[1]).toBe(200);
  expect(fintech.fx).toEqual([0, 0]);
  expect(platform.fee).toEqual([0, 0]);
  expect(platform.fx[0]).toBeCloseTo(50000 / 0.985 - 50000);
  expect(bank.fee).toEqual([40, 40]);
  expect(bank.fx[0]).toBeCloseTo(50000 / 0.975 - 50000);
});
it("uses the Chinese sending bank model and no domestic FX", () => {
  const bank = tuitionEstimates("China", "US", 50000, false)[2];
  expect(bank.fee).toEqual([37, 37]);
  expect(bank.fx[0]).toBeCloseTo(50000 / 0.997 - 50000);
  for (const route of tuitionEstimates("US", "US", 2000, false)) {
    expect(route.fee).toEqual([0, 0]);
    expect(route.fx).toEqual([0, 0]);
  }
});
