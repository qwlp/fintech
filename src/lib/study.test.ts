import { describe, expect, it } from "vitest";
import {
  countries,
  getCountry,
  universities,
  validateStudySelection,
} from "../../shared/study";

describe("study selection", () => {
  it("maps every supported destination to a valid currency and university directory", () => {
    expect(
      Object.fromEntries(countries.map((c) => [c.name, c.currency])),
    ).toEqual({
      "United Kingdom": "GBP",
      "United States": "USD",
      Australia: "AUD",
      Canada: "CAD",
      Germany: "EUR",
      China: "CNY",
      Cambodia: "KHR",
    });
    for (const country of countries)
      expect(universities[country.name].length).toBeGreaterThan(0);
    expect(getCountry("Unknown")).toBeUndefined();
  });
  it("rejects unsupported countries and a university belonging to another destination", () => {
    expect(() => validateStudySelection("Unknown", "Canada", "")).toThrow(
      "home country",
    );
    expect(() => validateStudySelection("Cambodia", "Unknown", "")).toThrow(
      "study country",
    );
    expect(() =>
      validateStudySelection("Cambodia", "Canada", "University of Oxford"),
    ).toThrow("study country");
  });
  it("allows optional and custom institutions and sponsors without a destination", () => {
    expect(() =>
      validateStudySelection("Cambodia", "Canada", ""),
    ).not.toThrow();
    expect(() =>
      validateStudySelection("Cambodia", "Canada", "My university"),
    ).not.toThrow();
    expect(() =>
      validateStudySelection("Cambodia", "", "", false),
    ).not.toThrow();
  });
});
