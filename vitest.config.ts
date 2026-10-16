import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Submission archives contain copies of tests; run only the working project.
    exclude: [...configDefaults.exclude, "submission/**"],
  },
});
