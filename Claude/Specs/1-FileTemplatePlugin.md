# Initial Specs for the File Template Plugin

## Settings
 - Allows the user to create Title Templates. These templates are used to generate the title of a new note.
 - Allows the user to specify file templates to apply to the file after it has been created. These will be the same existing templates used by Obsidian's core Template plugin. If that plugin isn't available, this feature will be disabled. This setting is optional. If no template is specified, the new file will be empty.
 - For each template, allow the user to specify the folder the new file should be created in. This can be a specific folder or "Current Folder" (the folder of the currently viewed file).

## Usage
 - The user can right-click on a folder and select "New Templated File" to open a modal screen that let's them choose the template they want to use from the options they've created in the plugin's settings screen. If they do this, then the plugin will ignore the folder setting and use the folder the user clicked on.
 - The user can open the Command Pallete and select "Create New Templated File". This will pull up a modal screen listing all the templates they defined in the plugin's Settings scree. When they select a template, a new file will be created in the folder specified by settings using a name/title defined by the template. If there is a file template, it will be applied after the file has been created and named.
- The user can open the Command Pallete and directly search for or select a template without pulling up the modal. So if the user created a template called "Thoughts", the command pallete will show "Create a new Thoughts File".
 
## Hotkeys
- The user can set a hotkey to pull up the New File Templates Modal.
- The user can set hotkey for each template they create in settings.

## Mobile Considerations
- The user should be able to easily create new template files on a mobile device.
