# Templater Plugin Integration Research

## Overview

This document describes how to integrate with the [Templater plugin](https://github.com/SilentVoid13/Templater) for Obsidian to process templates that contain Templater syntax.

## Key Findings

### Accessing the Templater Plugin

The Templater plugin can be accessed through Obsidian's plugin registry:

```typescript
// Method 1: Using getPlugin (preferred)
const templaterPlugin = app.plugins.getPlugin("templater-obsidian");

// Method 2: Direct access
const templaterPlugin = app.plugins.plugins["templater-obsidian"];

// Get the templater instance
const templater = templaterPlugin?.templater;
```

### Checking if Templater is Installed

```typescript
export function isTemplaterInstalled(app: App): boolean {
    const templaterPlugin = app.plugins.getPlugin("templater-obsidian");
    return templaterPlugin !== undefined && templaterPlugin !== null;
}

export function getTemplater(app: App) {
    // @ts-ignore - Templater types are not available
    return app.plugins.plugins["templater-obsidian"];
}
```

### RunMode Enum

Templater uses a `RunMode` enum to specify how the template is being processed:

| Value | Name | Description |
|-------|------|-------------|
| 0 | `CreateNewFromTemplate` | Generating a new note from a template |
| 1 | `AppendActiveFile` | Adding template content to the active editor |
| 2 | `OverwriteFile` | Replacing file content with parsed template |
| 3 | `OverwriteActiveFile` | Modifying the currently open file |
| 4 | `DynamicProcessor` | Processing inline template commands during markdown rendering |
| 5 | `StartupTemplate` | Executing templates when the plugin initializes |

### Key Methods for Integration

#### 1. `overwrite_file_commands(file: TFile)`

Processes Templater commands in a file and replaces them with evaluated content. This is the most relevant method for our use case.

```typescript
export async function processTemplaterInFile(app: App, file: TFile): Promise<void> {
    const templater = getTemplater(app);
    if (templater) {
        await templater.templater.overwrite_file_commands(file);
    }
}
```

#### 2. `parse_template(config: RunningConfig, templateContent: string): Promise<string>`

Parses template content and returns the processed string. Useful when you have template content in memory.

```typescript
export async function parseTemplateContent(
    app: App,
    templateContent: string,
    targetFile: TFile
): Promise<string> {
    const templater = getTemplater(app);
    if (!templater) return templateContent;

    return await templater.templater.parse_template(
        { target_file: targetFile, run_mode: 4 },  // DynamicProcessor mode
        templateContent
    );
}
```

#### 3. `create_running_config(template_file: TFile | undefined, target_file: TFile, run_mode: RunMode): RunningConfig`

Creates a configuration object for template processing.

```typescript
const config = templater.create_running_config(
    templateFile,  // The template file (can be undefined)
    targetFile,    // The target file where content will be written
    2              // RunMode.OverwriteFile
);
```

#### 4. `append_template_to_active_file(template_file: TFile)`

Appends a template's processed content to the currently active file.

```typescript
export async function appendTemplateToActive(app: App, templatePath: string): Promise<void> {
    const templater = getTemplater(app);
    if (!templater) return;

    const templateFile = app.vault.getAbstractFileByPath(templatePath);
    if (templateFile instanceof TFile) {
        await templater.templater.append_template_to_active_file(templateFile);
    }
}
```

### Recommended Integration Pattern

For our plugin's use case (processing a template after inserting it into a new file), the recommended approach is:

```typescript
import { App, TFile } from "obsidian";

interface TemplaterPlugin {
    templater: {
        overwrite_file_commands(file: TFile): Promise<void>;
        parse_template(config: { target_file: TFile; run_mode: number }, content: string): Promise<string>;
        current_functions_object: any;
    };
    settings: {
        trigger_on_file_creation: boolean;
    };
}

export function getTemplaterPlugin(app: App): TemplaterPlugin | null {
    // @ts-ignore - Templater types are not available in Obsidian's type definitions
    const plugin = app.plugins.plugins["templater-obsidian"];
    return plugin || null;
}

export function isTemplaterEnabled(app: App): boolean {
    const plugin = getTemplaterPlugin(app);
    return plugin !== null;
}

export function hasTemplaterSyntax(content: string): boolean {
    // Check for Templater's syntax: <% ... %>
    return /<%[\s\S]*?%>/.test(content);
}

/**
 * Process Templater syntax in a newly created file.
 *
 * @param app - The Obsidian App instance
 * @param file - The file to process
 * @param force - If true, process even if Templater's "trigger on file creation" is enabled
 */
export async function processTemplaterInFile(
    app: App,
    file: TFile,
    force: boolean = false
): Promise<void> {
    const templater = getTemplaterPlugin(app);

    if (!templater) {
        // Templater not installed, nothing to do
        return;
    }

    // Check if Templater will automatically process the file
    // If trigger_on_file_creation is enabled and we're not forcing, let Templater handle it
    if (!force && templater.settings?.trigger_on_file_creation) {
        return;
    }

    // Process the file with Templater
    await templater.templater.overwrite_file_commands(file);
}

/**
 * Parse template content without writing to a file.
 * Useful for previewing or when you need the processed content in memory.
 */
export async function parseTemplateContent(
    app: App,
    content: string,
    targetFile: TFile
): Promise<string> {
    const templater = getTemplaterPlugin(app);

    if (!templater || !hasTemplaterSyntax(content)) {
        return content;
    }

    return await templater.templater.parse_template(
        { target_file: targetFile, run_mode: 4 },
        content
    );
}
```

### Integration Flow for New Note Creation

1. **Create the new file** with the template content (including any Templater syntax)
2. **Check if Templater is installed** using `getTemplaterPlugin(app)`
3. **Check Templater's settings** to see if `trigger_on_file_creation` is enabled
4. **If Templater won't auto-process**, call `overwrite_file_commands(file)` to process the template

```typescript
async function createNoteFromTemplate(
    app: App,
    templateContent: string,
    fileName: string,
    folderPath: string
): Promise<TFile> {
    // Create the file with template content
    const filePath = `${folderPath}/${fileName}.md`;
    const file = await app.vault.create(filePath, templateContent);

    // Process Templater syntax if Templater is installed
    await processTemplaterInFile(app, file);

    return file;
}
```

### Important Considerations

1. **Initialization Timing**: The `current_functions_object` may not be available until Templater has run at least once since Obsidian started. If you need to access it, ensure a startup template is configured or handle the undefined case.

2. **Settings Awareness**: Check `templater.settings.trigger_on_file_creation` before processing to avoid double-processing files.

3. **TypeScript Types**: Templater doesn't expose TypeScript types, so you'll need to use `@ts-ignore` or create your own interface definitions.

4. **Error Handling**: Wrap Templater calls in try-catch blocks as template syntax errors can throw exceptions.

5. **User Feedback**: Consider notifying users if Templater syntax is detected but Templater isn't installed.

### Detecting Templater Syntax

Templater uses `<% ... %>` syntax for its template commands. Common patterns include:

- `<% tp.date.now() %>` - Current date
- `<% tp.file.title %>` - File title
- `<% tp.file.creation_date() %>` - Creation date
- `<%* ... %>` - JavaScript execution block
- `<% tp.system.prompt("Question") %>` - User prompts

Regex to detect Templater syntax:
```typescript
const TEMPLATER_PATTERN = /<%[\s\S]*?%>/;
const hasTemplater = TEMPLATER_PATTERN.test(content);
```

## Sources

- [Templater GitHub Repository](https://github.com/SilentVoid13/Templater)
- [Templater Documentation](https://silentvoid13.github.io/Templater/introduction.html)
- [Obsidian Forum - Use Templater API](https://forum.obsidian.md/t/use-templater-api/75001)
- [Obsidian Forum - Templater API](https://forum.obsidian.md/t/templater-api/59117)
- [Note Toolbar Wiki - Templater Integration](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Templater)
- [Obsidian Projects Issue #42](https://github.com/marcusolsson/obsidian-projects/issues/42) - Contains TypeScript integration examples
- [RunJS Plugin - Templater Integration](https://github.com/eoureo/obsidian-runjs/discussions/19)
- [tp.config Module Documentation](https://silentvoid13.github.io/Templater/internal-functions/internal-modules/config-module.html)
