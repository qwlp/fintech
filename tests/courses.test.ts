import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import {
  courseTuition,
  coursesForUniversity,
  getCourse,
  universityCourses,
} from "../shared/courses";
import {
  defaultMoveSettings,
  validateMoveSettings,
} from "../shared/move-planner";
import { universities } from "../shared/study";
const modules = import.meta.glob("../convex/**/*.ts");
const directory = Object.entries(universities).flatMap(([country, names]) =>
  names.map((university) => ({ country, university })),
);

it.each(directory)(
  "offers both degree levels at $university",
  ({ university }) => {
    expect(
      coursesForUniversity(university, "undergraduate").length,
    ).toBeGreaterThan(0);
    expect(
      coursesForUniversity(university, "postgraduate").length,
    ).toBeGreaterThan(0);
  },
);
it("converts tuition without treating a full-program fee as a one-year fee", () => {
  expect(
    courseTuition(getCourse("Peking University", "Global MBA")!, "CNY"),
  ).toBe(94000);
  expect(
    courseTuition(
      getCourse("Tsinghua University", "Master of Architecture · English")!,
      "CNY",
    ),
  ).toBe(80000);
  expect(
    courseTuition(
      getCourse("University of Manchester", "Computer Science BSc")!,
      "GBP",
    ),
  ).toBe(37800);
  expect(courseTuition(getCourse("Tsinghua University", "Law")!, "GBP")).toBe(
    2826.09,
  );
  expect(new Set(universityCourses.map((course) => course.id)).size).toBe(
    universityCourses.length,
  );
});
it("rejects a course belonging to another university", () => {
  const course = getCourse("Tsinghua University", "Law")!;
  expect(() =>
    validateMoveSettings({
      ...defaultMoveSettings,
      university: 1,
      courseId: course.id,
    }),
  ).toThrow("selected university");
});

async function student(country: string, university: string) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "course@example.com",
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      email: "course@example.com",
      name: "Student",
      initials: "S",
      role: "Student",
      planName: "Study",
      countryFrom: "China",
      countryTo: country,
      university,
      course: "",
      setupComplete: false,
      paymentStatus: "not_started",
      selectedRoute: "",
      sponsorRequestSent: false,
    });
    return { userId, accountId };
  });
  return {
    t,
    ...ids,
    owner: t.withIdentity({ subject: `${ids.userId}|session` }),
  };
}
const selections = directory
  .flatMap(({ country, university }) =>
    ["undergraduate", "postgraduate"].map((level) => ({
      country,
      university,
      course: coursesForUniversity(university).find(
        (course) => course.level === level && course.annualTuition !== null,
      ),
      level,
    })),
  )
  .filter((row) => row.course);
it.each(selections)(
  "fills and persists $level tuition for $university",
  async ({ country, university, course }) => {
    const { owner } = await student(country, university);
    await owner.mutation(api.accounts.completeSetup, {
      name: "Student",
      countryFrom: "China",
      countryTo: country,
      university,
      course: course!.name,
      courseStart: "2026-09-01",
      fundingAmount: 0,
      sponsorSupport: "Not sure yet",
    });
    const state = await owner.query(api.accounts.bootstrap, {});
    expect(state.costs.find((cost) => cost.key === "tuition")?.amount).toBe(
      course!.annualTuition,
    );
    expect(state.account.course).toBe(course!.name);
  },
);
it("keeps unverified fees manual and refuses anonymous profile changes", async () => {
  const { t, owner } = await student("United Kingdom", "King's College London");
  const args = {
    name: "Student",
    countryFrom: "China",
    countryTo: "United Kingdom",
    university: "King's College London",
    course: "Computer Science BSc",
    courseStart: "",
    fundingAmount: 0,
    sponsorSupport: "",
  };
  await owner.mutation(api.accounts.completeSetup, args);
  expect((await owner.query(api.accounts.bootstrap, {})).costs).toHaveLength(0);
  await expect(t.mutation(api.accounts.completeSetup, args)).rejects.toThrow();
});
it("updates the saved move budget once, preserves custom tuition, and retains the course", async () => {
  const { owner, accountId } = await student(
    "United Kingdom",
    "University of Manchester",
  );
  const course = getCourse("University of Manchester", "Computer Science BSc")!;
  await owner.mutation(api.accounts.saveMovePlan, {
    accountId,
    months: 9,
    selectedRoute: 0,
    arrivalDate: "",
    excludedCosts: ["tuition"],
    budgetAmounts: { tuition: 0, rent: 500 },
    plannerSettings: { ...defaultMoveSettings, university: 4 },
  });
  const args = {
    accountId,
    name: "Student",
    countryFrom: "China",
    countryTo: "United Kingdom",
    university: course.university,
    course: course.name,
    courseStart: "",
    financialStatus: "",
    sponsorSupport: "",
    fundingAmount: 0,
  };
  await owner.mutation(api.accounts.updateProfile, args);
  let state = await owner.query(api.accounts.bootstrap, {});
  expect(state.config.move.budgetAmounts.tuition).toBe(37800);
  expect(state.config.move.excludedCosts).not.toContain("tuition");
  expect(state.config.move.plannerSettings.courseId).toBe(course.id);
  expect(state.costs.reduce((sum, cost) => sum + cost.amount, 0)).toBeCloseTo(
    (37800 + 500 * 10) * 1.1,
  );
  await owner.mutation(api.accounts.saveMovePlan, {
    accountId,
    months: 9,
    selectedRoute: 0,
    arrivalDate: "",
    excludedCosts: [],
    budgetAmounts: { tuition: 35000, rent: 500 },
    plannerSettings: {
      ...defaultMoveSettings,
      university: 4,
      courseId: course.id,
    },
  });
  await owner.mutation(api.accounts.updateProfile, args);
  state = await owner.query(api.accounts.bootstrap, {});
  expect(state.costs.filter((cost) => cost.key === "tuition")).toHaveLength(1);
  expect(state.costs.find((cost) => cost.key === "tuition")?.amount).toBe(
    35000,
  );
  expect(state.config.move.budgetAmounts.tuition).toBe(35000);
  await expect(
    owner.mutation(api.accounts.saveMovePlan, {
      accountId,
      months: 9,
      selectedRoute: 0,
      arrivalDate: "",
      excludedCosts: [],
      budgetAmounts: { tuition: 35000 },
      plannerSettings: {
        ...defaultMoveSettings,
        university: 0,
        courseId: course.id,
      },
    }),
  ).rejects.toThrow("selected university");
});
