# List Picker Features

Develop a List Picker for User Prompts. There will be two variants:
 - **Simple List Picker**: Allows the user to pick a single option from a list.
 - **Multi List Picker**: Allows the user to pick multiple items from a list.

These pickers are formatted using the same syntax style as other input fields and will be displayed in the prompt entry modal screen.

## Simple List Picker
 - Displays a drop down list for the user to pick from. Whatever value the user selects will be used as the prompt value.
 - When the user selects a value, the list is automatically closed.
 - Automatically open the dropdown list when the field receives focus.
 - Include a clear button to remove selected option.
 - Include a builder in the Settings screen (like we do for dates)
 - Syntax format example: `{% Field Name:list:Value 1,Value 2,Value 3 %}`
     - The field type is `list`
     - Values are comma separated and may include spaces.
     - Values cannot include commas.

## Multi list Picker
 - Displays a drop down list that allows the user to select multiple items.
 - When the user selects an item, clearly highlight that item as selected. Use a checkmark and alternate backgroud color.
 - If the user selects an item that's already selected, deselect that item.
 - The dropdown list does **not** close automatically when an item is selected, allowing the user to easily select multiple items.
 - Include a clear button to remove all selected options.
 - Include a builder in the Settings screen (like we do for dates)
 - Syntax format example: `{% Field Name:multilist:Value 1, Value 2, Value 3 %}`
     - The field type is `multilist`
     - Values are comma separated and may include spaces.
     - Values cannot include commas.
 - When inserting selected values, separate each value by a comma and a space. For example, if a user selects: ['Value 1', 'Value 3'], then insert those as: `Value 1, Value 3`. Only place a comma+space between items. Do not include a trailing comma or space.
