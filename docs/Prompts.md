# Prompt commands:

The commands and numbers below are shorthand references to the corresponding prompts.

2. `_add_logs`: "Add logging using the `conditionalLog` function from `lib/log.util.ts` as described in `CLAUDE.md`"

3. `_build_plan`: "run `npm run build`, then create a plan to fix the build errors"

4. `_build_fix`: "run `npm run build` and fix the build errors, then run `num run build` again and repeat"

5. `_test_results`: "Don't run any tests. Find the directory in @/test-results/\* that contains the name of the specified test, and the latest timestamp - read the README.md file inside. Concisely list each fail case. Under each fail case list item, list the context, expectations, observations and screenshot."

6. `_test_fix`: "run `npm run test` and fix the fail cases, then run the tests again and repeat until they are all passing. Do not change the test to be less scrupulous. Don't break or remove functionality. If you are stuck then stop and ask."

7. `_test_fix_test`: "run `npm run test` and fix the fail cases. Assume that the app is working correctly, update the tests to align with the expected behaviour of the app"

8. `_test_fix_app`: "run `npm run test` and fix the fail cases. Assume that the tests are working correctly, update the app to implement the required functionality"

9. `_test_focus_plan`: "run `npm run test` and make a plan to add unit test(s) to isolate the failing functinonality into more specific test(s)"

10. `_test_focus_fix`: "run `npm run test` and then add and run unit test(s) to isolate the failing functinonality into more specific test(s)"

11. `_test_doc`: "compare `docs/Test.md` with all tests in the repo and update the Test document to align with the actual tests. Document the tests following the approach outlined in @CLAUDE.md - ensure that ALL tests are documented"

12. `_test_doc_fix`: "compare `docs/Test.md` with all tests in the repo and update the tests to align with the `docs/Test.md` document"

13. `_roadmap_create`: "Write a prompt to `docs/${featureName}_prompt.md`. Your task is not to implement any of the described features. Your task is to create a comprehensive prompt that describes all of the steps required for an AI to implement the required functionality.
    The prompt should explain that every step should be 100% completed. The prompt should instruct the AI to review the generated code to ensure that the programming patterns in @CLAUDE.md and @docs/util.md were followed."

14. `_roadmap_continue`: "continue to follow the roadmap"

15. `_roadmap_commit`: "Update the roadmap to document the completed and remaining tasks, and push a commit"

16. `_roadmap_phase`: "Continue to follow the roadmap. After completing a phase, update the roadmap to document the completed and remaining tasks and push a commit"

17. `_roadmap_review`: "Review this repo and the latest roadmap ("docs/roadmap[date].md"). If the app and the roadmap deviate, then make a plan to make the app more aligned with the roadmap"
