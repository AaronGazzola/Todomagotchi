@CLAUDE.md @docs/util.md  
Review this repo using a wide general search and a deep specific search to understand how the UX is implemented and understand the intention behind the documentation.
Refer to the @docs/Plan*Prompt*... documents and add an aditional prompt plan that will describe the process of taking the existing app and implementing the functionality below:

The auth popover should display the signed in user's email, and should enable sign out via the sign out button. The auth popover should contain a select element that enables the user to switch between their organisations. Each org is related to one task list and one tamagochi (the plan should cover any db and/or seed script changes). The user can switch between the orgs using the org select element in the auth popover. Each tamagochi has a unique color value, the plan should instruct to add a color swatch to the auth popover menu, the color swatch should open a react-colorful color picker to set the color for the tamagochi. The plan should describe how to apply the tamagochi color in the db to the color of the tamagochi in the component.

---

Update the plan to also describe the improved tamagochi logic below:
The db should track the age and the species of the tamagochi. Assign each egg pattern to a different species at 0 age, and assign a unique pixel sprite (from the existing sprites in the tamagochi component) to ages 1,2 and 3 for each species.
The tamagochi species column should default to a random species, the age should default to 0, hunger should default to 7.
Extend the hunger logic to increment the tamagochi age after the tamagochi has been fed 10 times. After being fed 100 times it should return to age 0.

---

The plan should reset the database rather than migrating the existing data. Include a description of how the seed script will be updated

---

Update the plan to describe the steps to implement the following functionality:

There are 10 species. Each species is assigned a different sprite to display at each of the 4 ages (0=egg, 1=baby, 2=child, 3=adult; defaults to 0). The age increments after being fed 10 times and resets after being fed 50 times

---

@CLAUDE.md @docs/util.md
Update this plan to also mention that the org select element in the auth popover menu should include a "add new" button as the last element in the options list, which should open a dialog with an input to set the org name.
