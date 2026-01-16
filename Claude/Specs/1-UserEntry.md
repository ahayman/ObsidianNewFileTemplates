# User Entry Prompts

This feature adds user prompts into the template. These are prompts the user has to fill in before the title is created each time they create a new file. The user can set these propmts in the Title Template, and then when the create a new file using the plugin, it will pull up a modal allowing them to easily fill in the required values. Those values will be inserted into the template, replacing the prompts, to fill in the title.

# Specs
- A user prompt will use a different syntax than other variables: {% Prompt Name %}
- The Settings screen should have an easy way to entering prompts besides manually typing out the syntax. Basic idea is they tap on "Add User Prompt", enter the name of the prompt (ex: "Enter Name"), the value type (numeric/text, default: text) and the syntax will be inserted: {% Prompt Name %}.
- The user should be able to restrict prompts to numeric values only.
- When the user selects a template for file creation and that template includes use prompts, then the modal will display a view allowing the user to easily enter prompt values one-by-one. Once finished, those values will be inserted into the final title along with any other variables.
- When entering prompt values, the plugin should disallow characters that are invalid for file names and Obsidian titles.

# User Entry View
This view allows the user to enter prompt value quickly and easily.
- There should be a preview of the title along with the entered values so-far.
- The preview should turn green when all values are filled out.
- The user should be able to quickly move between the files whether on desktop or mobile. Hitting Enter or Return should move to the next field, if any, or the submit button.
- If a prompt requires numbers, then mobile devices should show a number keyboard.

