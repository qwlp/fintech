import { universities } from "./study";
import { convertMoney } from "./currency";

export type DegreeLevel = "undergraduate" | "postgraduate";
export type UniversityCourse = {
  id: string;
  university: string;
  name: string;
  level: DegreeLevel;
  currency: "CNY" | "GBP" | "USD";
  annualTuition: number | null;
  feeYear: string;
  source: string;
  note?: string;
};

// International, full-time fees. Sources and years belong to each fee, so a
// rolling university prospectus cannot silently relabel an older estimate.
const catalog: UniversityCourse[] = [];
function add(
  university: string,
  level: DegreeLevel,
  currency: UniversityCourse["currency"],
  feeYear: string,
  source: string,
  rows: [string, number | null, string?][],
) {
  for (const [name, annualTuition, note] of rows) {
    catalog.push({
      id: `${university}:${level}:${name}`,
      university,
      name,
      level,
      currency,
      annualTuition,
      feeYear,
      source,
      ...(note ? { note } : {}),
    });
  }
}
add(
  "Tsinghua University",
  "undergraduate",
  "CNY",
  "2026/27",
  "https://international.join-tsinghua.edu.cn/Admission1/Fees.htm",
  [
    ["Computer Science", 30000, "Chinese-English taught"],
    ["Architecture", 30000, "Chinese-English taught"],
    ["Electronic Information", 30000, "Chinese-English taught"],
    ["Automation", 30000, "Chinese-English taught"],
    ["Economics, Finance and Management", 26000, "Chinese-English taught"],
    ["Law", 26000, "Chinese-English taught"],
    ["Arts", 40000],
    [
      "Global Talents in Science and Engineering",
      100000,
      "English taught · Zijing College",
    ],
  ],
);
add(
  "Tsinghua University",
  "postgraduate",
  "CNY",
  "2026/27",
  "https://yzbm.tsinghua.edu.cn/publish/s05/s0501/detail/dae20f4e-6f7a-42ee-9dad-24597411b6a4",
  [
    ["Advanced Computing (Master’s)", 39000, "English taught"],
    ["Electronic Information (Master of Engineering)", 39000, "English taught"],
    [
      "Master of Finance · SEM",
      99000,
      "Published annual fee · CNY 198,000 over two years",
    ],
    [
      "Master of Finance · PBC School of Finance",
      64000,
      "Published annual fee · CNY 128,000 over two years",
    ],
    [
      "Master of Architecture · English",
      80000,
      "First year · second year CNY 40,000",
    ],
  ],
);
add(
  "Peking University",
  "undergraduate",
  "CNY",
  "2025/26",
  "https://www.isd.pku.edu.cn/en/detail.php?id=502",
  [
    [
      "Computer Science and Technology",
      30000,
      "Science fee band · Chinese taught",
    ],
    ["Mathematics", 30000, "Science fee band · Chinese taught"],
    ["Physics", 30000, "Science fee band · Chinese taught"],
    [
      "Economics",
      26000,
      "Humanities/social sciences fee band · Chinese taught",
    ],
    ["Law", 26000, "Humanities/social sciences fee band · Chinese taught"],
  ],
);
add(
  "Peking University",
  "postgraduate",
  "CNY",
  "2026/27",
  "https://isd.pku.edu.cn/userfiles/editor/202511100936379905.pdf",
  [
    [
      "Computer Science (Master’s) · English",
      50000,
      "Annual planning estimate: CNY 150,000 / three years",
    ],
    [
      "Master of Finance · Guanghua",
      64000,
      "Annual planning estimate: CNY 128,000 / two years · Chinese taught",
    ],
    [
      "Global MBA",
      94000,
      "Annual planning estimate: CNY 188,000 / two years · English taught",
    ],
    [
      "Civil and Commercial Law (LLM)",
      80000,
      "Annual planning estimate: CNY 160,000 / two years · English taught",
    ],
    [
      "Master of International Relations",
      75000,
      "Annual planning estimate: CNY 150,000 / two years · English taught",
    ],
  ],
);
add(
  "Zhejiang University",
  "undergraduate",
  "CNY",
  "2026/27",
  "https://iczu.zju.edu.cn/_upload/article/files/e7/8c/1be7b2df433fb9427df707571d84/3300a725-ca29-443b-845f-8c1a3c15c929.pdf",
  [
    ["Computer Science and Technology", 24800, "Chinese taught"],
    ["Software Engineering", 24800, "Chinese taught"],
    ["Economics", 24800, "Chinese taught"],
    ["Finance", 24800, "Chinese taught"],
    ["Business Administration", 24800, "Chinese taught"],
    ["Law", 24800, "Chinese taught"],
    ["Mechanical Engineering", 24800, "Chinese taught"],
    ["Philosophy", 19800, "Chinese taught"],
    ["Clinical Medicine", 29800, "Chinese taught"],
  ],
);
add(
  "Zhejiang University",
  "undergraduate",
  "CNY",
  "2026/27",
  "https://iczu.zju.edu.cn/_upload/article/files/e7/8c/1be7b2df433fb9427df707571d84/f8f1cb33-05a5-4fec-a602-3eac6caf8e14.pdf",
  [["Clinical Medicine (MBBS) · English", 42800, "English taught"]],
);
add(
  "Zhejiang University",
  "postgraduate",
  "CNY",
  "2026/27",
  "https://iczu.zju.edu.cn/_upload/article/files/32/c1/d48dfe1349279755c872b98ce7e1/aae5a919-1f07-4115-bb1c-db41ea36e1b0.pdf",
  [
    ["Computer Science and Technology (Master’s)", 36800, "English taught"],
    ["Software Engineering (Master’s)", 36800, "English taught"],
    ["Cyberspace Security (Master’s)", 36800, "English taught"],
    ["Data Science (iMDS)", 50000, "English taught"],
    ["China Studies (MCS)", 66000, "English taught"],
    [
      "Finance (iMF)",
      90000,
      "Annual planning estimate: CNY 180,000 / two years",
    ],
    [
      "Business Administration (iMBA)",
      109000,
      "Annual planning estimate: CNY 218,000 / two years",
    ],
  ],
);
add(
  "King's College London",
  "undergraduate",
  "GBP",
  "Check offer",
  "https://www.kcl.ac.uk/study/undergraduate/fees-and-funding/tuition-fees",
  [
    ["Computer Science BSc", null],
    ["Business Management BSc", null],
    ["International Relations BA", null],
  ],
);
for (const [name, fee, slug] of [
  ["Economics & Finance MSc", 42800, "economics-finance-msc"],
  ["International Management MSc", 40450, "international-management-msc"],
  ["Global Health MSc", 38300, "global-health-msc"],
] as const) {
  add(
    "King's College London",
    "postgraduate",
    "GBP",
    "2026/27",
    `https://www.kcl.ac.uk/study/postgraduate-taught/courses/${slug}/fees`,
    [[name, fee]],
  );
}
add(
  "University of Manchester",
  "undergraduate",
  "GBP",
  "2026/27",
  "https://www.manchester.ac.uk/study/undergraduate/courses/2026/00560/bsc-computer-science/",
  [["Computer Science BSc", 37800]],
);
add(
  "University of Manchester",
  "postgraduate",
  "GBP",
  "2027/28",
  "https://www.manchester.ac.uk/study/masters/courses/list/01383/msc-finance/",
  [["Finance MSc", 39700]],
);
add(
  "University of Edinburgh",
  "undergraduate",
  "GBP",
  "2026/27",
  "https://study.ed.ac.uk/programmes/undergraduate-fees?programme_code=UTAICSC&year=2026",
  [["Artificial Intelligence and Computer Science BSc (Hons)", 38900]],
);
add(
  "University of Edinburgh",
  "postgraduate",
  "GBP",
  "2026/27",
  "https://registryservices.ed.ac.uk/tuition-fees/find/postgraduate-taught/2026-2027/taught-masters",
  [
    ["Computer Science MSc", 45410],
    ["Accounting and Financial Management MSc", 36310],
    ["Statistics and Operational Research MSc", 33200],
  ],
);
add(
  "Columbia University",
  "undergraduate",
  "USD",
  "2026/27",
  "https://bulletin.columbia.edu/columbia-college/fees-expenses-financial-aid/",
  [
    [
      "Computer Science BA",
      72800,
      "Columbia College flat tuition · excludes mandatory fees",
    ],
    [
      "Economics BA",
      72800,
      "Columbia College flat tuition · excludes mandatory fees",
    ],
    [
      "Mathematics BA",
      72800,
      "Columbia College flat tuition · excludes mandatory fees",
    ],
    [
      "Political Science BA",
      72800,
      "Columbia College flat tuition · excludes mandatory fees",
    ],
    [
      "Psychology BA",
      72800,
      "Columbia College flat tuition · excludes mandatory fees",
    ],
  ],
);
add(
  "Columbia University",
  "postgraduate",
  "USD",
  "2026/27",
  "https://journalism.columbia.edu/cost-attendance/detailed",
  [
    ["Journalism MS", 85576, "Full-time · 9.5 months · tuition only"],
    ["Data Journalism MS", 128364, "Full-time · 12 months · tuition only"],
    ["Journalism MA", 77888, "Full-time · 9 months · tuition only"],
  ],
);
add(
  "University of Southern California",
  "undergraduate",
  "USD",
  "2026/27",
  "https://admission.usc.edu/cost-and-financial-aid/financial-aid-and-scholarships/",
  [
    [
      "Computer Science BS",
      75384,
      "Full-time · 12–18 units per semester · tuition only",
    ],
    [
      "Business Administration BS",
      75384,
      "Full-time · 12–18 units per semester · tuition only",
    ],
    [
      "Economics BA",
      75384,
      "Full-time · 12–18 units per semester · tuition only",
    ],
    [
      "Mechanical Engineering BS",
      75384,
      "Full-time · 12–18 units per semester · tuition only",
    ],
    [
      "Psychology BA",
      75384,
      "Full-time · 12–18 units per semester · tuition only",
    ],
  ],
);
add(
  "University of Southern California",
  "postgraduate",
  "USD",
  "2026/27",
  "https://viterbigradadmission.usc.edu/programs/masters/tuition-funding/tuition-funding-masters/",
  [
    [
      "Computer Science MS",
      49356,
      "Annual planning estimate: 18 units × USD 2,742 · adjust for your course load",
    ],
    [
      "Electrical Engineering MS",
      49356,
      "Annual planning estimate: 18 units × USD 2,742 · adjust for your course load",
    ],
    [
      "Mechanical Engineering MS",
      49356,
      "Annual planning estimate: 18 units × USD 2,742 · adjust for your course load",
    ],
  ],
);
add(
  "UCLA",
  "undergraduate",
  "USD",
  "2026/27",
  "https://admission.ucla.edu/tuition-aid/tuition-fees",
  [
    [
      "Computer Science BS",
      55700,
      "Nonresident tuition and university fees · excludes health insurance",
    ],
    [
      "Economics BA",
      55700,
      "Nonresident tuition and university fees · excludes health insurance",
    ],
    [
      "Business Economics BA",
      55700,
      "Nonresident tuition and university fees · excludes health insurance",
    ],
    [
      "Mechanical Engineering BS",
      55700,
      "Nonresident tuition and university fees · excludes health insurance",
    ],
    [
      "Psychology BA",
      55700,
      "Nonresident tuition and university fees · excludes health insurance",
    ],
  ],
);
add(
  "UCLA",
  "postgraduate",
  "USD",
  "2026/27",
  "https://financialaid.ucla.edu/graduate-aid/cost-of-attendance",
  [
    [
      "Computer Science MS",
      30710,
      "Standard graduate nonresident tuition and fees · excludes health insurance",
    ],
    [
      "Electrical and Computer Engineering MS",
      30710,
      "Standard graduate nonresident tuition and fees · excludes health insurance",
    ],
    [
      "Mechanical Engineering MS",
      30710,
      "Standard graduate nonresident tuition and fees · excludes health insurance",
    ],
  ],
);
add(
  "University of Manchester",
  "undergraduate",
  "GBP",
  "2026/27",
  "https://www.manchester.ac.uk/study/undergraduate/courses/2026/03519/bsc-management/",
  [["Management BSc", 33100]],
);
add(
  "University of Manchester",
  "undergraduate",
  "GBP",
  "2026/27",
  "https://www.manchester.ac.uk/study/undergraduate/courses/2026/18515/bsc-international-management/",
  [["International Management BSc", 33100]],
);
export const universityCourses: readonly UniversityCourse[] = catalog;
export function coursesForUniversity(university: string, level?: DegreeLevel) {
  return universityCourses.filter(
    (course) =>
      course.university === university && (!level || course.level === level),
  );
}
export function getCourse(university: string, value: string) {
  return coursesForUniversity(university).find(
    (course) => course.id === value || course.name === value,
  );
}
export function courseTuition(course: UniversityCourse, currency: string) {
  return course.annualTuition === null
    ? null
    : convertMoney(course.annualTuition, course.currency, currency);
}
export function validateCourseSelection(university: string, courseId: string) {
  if (!getCourse(university, courseId))
    throw new Error("Choose a course at the selected university");
}
export const courseUniversities = Object.values(universities).flat();
