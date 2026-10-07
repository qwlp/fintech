/** Shared by setup, profile editing and server validation. */
export const countries = [
  { name: "United Kingdom", code: "UK", flag: "🇬🇧", currency: "GBP" },
  { name: "United States", code: "US", flag: "🇺🇸", currency: "USD" },
  { name: "Australia", code: "AU", flag: "🇦🇺", currency: "AUD" },
  { name: "Canada", code: "CA", flag: "🇨🇦", currency: "CAD" },
  { name: "Germany", code: "DE", flag: "🇩🇪", currency: "EUR" },
  { name: "China", code: "CN", flag: "🇨🇳", currency: "CNY" },
  { name: "Cambodia", code: "KH", flag: "🇰🇭", currency: "KHR" },
] as const;
export const getCountry = (name: string) =>
  countries.find(
    (country) =>
      country.name.toLowerCase() === name.trim().toLowerCase() ||
      country.code.toLowerCase() === name.trim().toLowerCase(),
  );

// A starter directory; students can add an institution that is not listed.
export const universities: Record<string, string[]> = {
  "United Kingdom": [
    "University of Oxford",
    "University of Cambridge",
    "Imperial College London",
    "University College London",
    "University of Edinburgh",
    "University of Manchester",
    "King's College London",
    "University of Bristol",
    "University of Leeds",
    "University of Birmingham",
  ],
  "United States": [
    "Harvard University",
    "Stanford University",
    "Massachusetts Institute of Technology",
    "University of California, Berkeley",
    "University of California, Los Angeles",
    "Columbia University",
    "University of Southern California",
    "New York University",
    "University of Michigan",
    "Yale University",
    "Princeton University",
  ],
  Australia: [
    "University of Melbourne",
    "University of Sydney",
    "UNSW Sydney",
    "Australian National University",
    "Monash University",
    "University of Queensland",
    "University of Adelaide",
    "University of Western Australia",
    "University of Technology Sydney",
  ],
  Canada: [
    "University of Toronto",
    "University of British Columbia",
    "McGill University",
    "University of Alberta",
    "University of Waterloo",
    "McMaster University",
    "University of Ottawa",
    "University of Calgary",
  ],
  Germany: [
    "Technical University of Munich",
    "Ludwig Maximilian University of Munich",
    "Heidelberg University",
    "Humboldt University of Berlin",
    "RWTH Aachen University",
    "University of Bonn",
    "University of Hamburg",
    "Free University of Berlin",
  ],
  China: [
    "Tsinghua University",
    "Peking University",
    "Fudan University",
    "Shanghai Jiao Tong University",
    "Zhejiang University",
    "Nanjing University",
    "University of Science and Technology of China",
    "Wuhan University",
  ],
  Cambodia: [
    "Royal University of Phnom Penh",
    "Royal University of Law and Economics",
    "Institute of Technology of Cambodia",
    "University of Cambodia",
    "Paññāsāstra University of Cambodia",
    "National University of Management",
  ],
};
export function validateStudySelection(
  home: string,
  study: string,
  university: string,
  student = true,
) {
  if (!getCountry(home)) throw new Error("Choose a supported home country");
  if (student && !getCountry(study))
    throw new Error("Choose a supported study country");
  if (university.trim().length > 100)
    throw new Error("University name must be at most 100 characters");
  const knownCountry = Object.entries(universities).find(([, names]) =>
    names.some(
      (name) => name.toLowerCase() === university.trim().toLowerCase(),
    ),
  )?.[0];
  if (student && knownCountry && knownCountry !== getCountry(study)?.name)
    throw new Error("Choose a university in your study country");
}
