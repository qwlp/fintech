/** Approved directory from Countries and Universities.md. Shared by every selector and server validation. */
export const countries = [
  { name: "China", code: "CN", flag: "🇨🇳", currency: "CNY" },
  { name: "United Kingdom", code: "UK", flag: "🇬🇧", currency: "GBP" },
  { name: "United States", code: "US", flag: "🇺🇸", currency: "USD" },
] as const;
export const getCountry = (name: string) =>
  countries.find(
    (country) =>
      country.name.toLowerCase() === name.trim().toLowerCase() ||
      country.code.toLowerCase() === name.trim().toLowerCase(),
  );
export const universities: Record<string, string[]> = {
  China: ["Tsinghua University", "Peking University", "Zhejiang University"],
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
};
export const getUniversity = (country: string, value: string) =>
  universities[getCountry(country)?.name ?? ""]?.find(
    (name) =>
      name.toLowerCase() === value.trim().replaceAll("’", "'").toLowerCase(),
  );
export function validateStudySelection(
  home: string,
  study: string,
  university: string,
  student = true,
) {
  if (!getCountry(home)) throw new Error("Choose a supported home country");
  if (student && !getCountry(study))
    throw new Error("Choose a supported study country");
  if (university.trim() && !getUniversity(study, university))
    throw new Error("Choose a listed university in your study country");
}
export function needsStudySelectionUpdate(account: {
  countryFrom: string;
  countryTo: string;
  university: string;
  role: string;
}) {
  try {
    validateStudySelection(
      account.countryFrom,
      account.countryTo,
      account.university,
      account.role === "Student",
    );
    return false;
  } catch {
    return true;
  }
}
