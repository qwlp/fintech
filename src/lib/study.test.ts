import { describe, expect, it } from "vitest";
import {
  countries,
  getCountry,
  getUniversity,
  universities,
  validateStudySelection,
  needsStudySelectionUpdate,
} from "../../shared/study";
import { universities as tuitionUniversities } from "./tuition";
import profiles from "../../shared/move-planner-data.json";

describe("approved study directory", () => {
  it("only offers the three countries and nine universities in the supplied document", () => {
    expect(
      Object.fromEntries(countries.map((c) => [c.name, c.currency])),
    ).toEqual({
      China: "CNY",
      "United Kingdom": "GBP",
      "United States": "USD",
    });
    expect(universities).toEqual({
      China: [
        "Tsinghua University",
        "Peking University",
        "Zhejiang University",
      ],
      "United Kingdom": [
        "King's College London",
        "University of Manchester",
        "University of Edinburgh",
      ],
      "United States": [
        "Columbia University",
        "University of Southern California",
        "UCLA",
      ],
    });
    expect(tuitionUniversities).toEqual({
      US: universities["United States"],
      UK: universities["United Kingdom"],
      China: universities.China,
    });
    expect(profiles.map((p) => p.name).sort()).toEqual(
      Object.values(universities).flat().sort(),
    );
    for (const country of countries)
      for (const university of universities[country.name])
        expect(() =>
          validateStudySelection("China", country.name, university),
        ).not.toThrow();
  });
  it.each(["Australia", "Canada", "Germany", "Cambodia", "Unknown"])(
    "rejects removed country %s for home and study",
    (country) => {
      expect(getCountry(country)).toBeUndefined();
      expect(() => validateStudySelection(country, "China", "")).toThrow(
        "home country",
      );
      expect(() => validateStudySelection("China", country, "")).toThrow(
        "study country",
      );
    },
  );
  it.each([
    "University of Oxford",
    "University of Bristol",
    "My university",
    "Harvard University",
  ])("rejects unlisted university %s", (name) => {
    expect(() =>
      validateStudySelection("China", "United Kingdom", name),
    ).toThrow("listed university");
  });
  it("rejects a listed institution in the wrong destination, while allowing an optional empty university", () => {
    expect(() =>
      validateStudySelection("China", "US", "Peking University"),
    ).toThrow("study country");
    expect(() => validateStudySelection("China", "US", "")).not.toThrow();
    expect(() => validateStudySelection("China", "", "", false)).not.toThrow();
    expect(getUniversity("UK", "King’s College London")).toBe(
      "King's College London",
    );
  });
  it("requires old profiles to update removed selections before opening the workspace", () => {
    const account = {
      role: "Student",
      countryFrom: "China",
      countryTo: "United Kingdom",
      university: "University of Manchester",
    };
    expect(needsStudySelectionUpdate(account)).toBe(false);
    expect(
      needsStudySelectionUpdate({ ...account, countryFrom: "Cambodia" }),
    ).toBe(true);
    expect(
      needsStudySelectionUpdate({
        ...account,
        university: "University of Oxford",
      }),
    ).toBe(true);
  });
});
