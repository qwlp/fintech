import { describe, expect, it } from "vitest";
import {
  formatMoneyInput,
  parseMoneyInput,
  changeMoneyAmount,
} from "../src/lib/money-input";
describe("money fields", () => {
  it("groups thousands while preserving cents and unfinished decimals", () => {
    expect(formatMoneyInput("1000000.50")).toBe("1,000,000.50");
    expect(formatMoneyInput("1000.")).toBe("1,000.");
    expect(formatMoneyInput("")).toBe("");
  });
  it("accepts pasted formatted amounts and rejects invalid precision", () => {
    expect(parseMoneyInput("$1,234.50")).toBe("1234.50");
    expect(parseMoneyInput(".50")).toBe("0.50");
    expect(parseMoneyInput("12.345")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
  });
  it("changes by whole units without losing cents and respects limits", () => {
    expect(changeMoneyAmount(999.99, 1)).toBe(1000.99);
    expect(changeMoneyAmount(0, -1)).toBe(0);
    expect(changeMoneyAmount(1000, 1, 0, 1000)).toBe(1000);
    expect(changeMoneyAmount(1, -1, 0.01)).toBe(0.01);
  });
});
