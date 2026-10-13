# Course tuition estimates

Setup, Profile and the move planner share `shared/courses.ts`. Every university in the approved nine-university directory has undergraduate and postgraduate options. This is a curated catalog of supported courses, not a complete prospectus; Setup and Profile also allow another course name.

Selecting a priced course uses its international, full-time annual tuition estimate. Each entry keeps its published fee year, native currency, university source, and any qualification (tuition plus university fees, an assumed credit load, a full-program price divided into annual planning estimates, or a different first-year fee). The planner converts to the workspace currency using the app's existing sandbox conversion rates. A fee year may differ from the selected start date; the source year remains visible and users can enter the offer amount instead.

King's undergraduate options currently require an offer amount because an international fee could not be verified from the available university pages. No fee is inferred from postgraduate prices or home-student fees. Other courses with no listed price also use manual tuition.

Changing the course in Setup or Profile updates the tuition budget and the saved planner's contingency. It does not change payment proposals or invoices. Re-saving the same course preserves a manually adjusted budget. Changing universities in the planner clears the old course. Saving the planner persists the course and the editable tuition together; the server rejects a course from another university.

To update fees, edit the catalog with a university-published source and correct academic year. Preserve stable course IDs (derived from university, degree level, and course name) so saved plans keep their selections. Run the course and move-planner tests, then the mobile/desktop course browser checks.
