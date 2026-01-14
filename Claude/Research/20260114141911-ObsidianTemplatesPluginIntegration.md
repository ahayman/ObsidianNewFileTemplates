# Obsidian Templates Plugin Integration Research

## Executive Summary

This research explores how to integrate with Obsidian's core Templates plugin programmatically. The key findings are:

1. **Yes**, we can access the Templates plugin's internal API via `app.internalPlugins.getPluginById('templates')`
2. **Yes**, we can retrieve user-configured date/time formats from the plugin settings
3. **Yes**, we can replicate variable processing behavior using moment.js (bundled with Obsidian)

**Important Caveat**: The `app.internalPlugins` API is **not part of the public API** and may change between Obsidian versions without notice.

---

## 1. Accessing Internal Plugins API

### The `app.internalPlugins` Object

Obsidian provides access to core (internal) plugins through an undocumented API:

```typescript
// Access via the app object (this.app in a plugin context)
const { internalPlugins } = (window as any).app;

// Get a specific internal plugin by ID
const templatesPlugin = internalPlugins.getPluginById('templates');

// Check if plugin is enabled
const dailyNotesPlugin = internalPlugins.getEnabledPluginById('daily-notes');
```

### Available Methods on `internalPlugins`

Based on community usage patterns:

```typescript
interface InternalPlugins {
  getPluginById(id: string): InternalPlugin | undefined;
  getEnabledPluginById(id: string): InternalPlugin | undefined;
  plugins: Record<string, InternalPlugin>;
}

interface InternalPlugin {
  enabled: boolean;
  instance: {
    options: Record<string, any>;
    // Additional methods vary by plugin
  };
  enable(): void;
  disable(): void;
}
```

### Core Plugin IDs

Common internal plugin IDs include:
- `templates` - Core Templates plugin
- `daily-notes` - Daily Notes plugin
- `sync` - Obsidian Sync
- `command-palette` - Command Palette
- `file-explorer` - File Explorer

---

## 2. Templates Plugin Settings Structure

### Accessing Templates Settings

```typescript
// Get the Templates plugin instance
const templatesPlugin = this.app.internalPlugins.getPluginById('templates');

if (templatesPlugin?.enabled) {
  const options = templatesPlugin.instance.options;

  // Available settings:
  const templateFolder = options.folder;      // Template folder location
  const dateFormat = options.dateFormat;      // User's date format (e.g., "YYYY-MM-DD")
  const timeFormat = options.timeFormat;      // User's time format (e.g., "HH:mm")
}
```

### Settings Interface (Inferred)

```typescript
interface TemplatesPluginOptions {
  folder: string;           // Path to templates folder
  dateFormat: string;       // moment.js format string for dates
  timeFormat: string;       // moment.js format string for times
}
```

### Default Values

If the user hasn't changed the settings, values may be `undefined`. Obsidian uses these defaults:
- **dateFormat**: `"YYYY-MM-DD"`
- **timeFormat**: `"HH:mm"`
- **folder**: `""` (empty/root)

### Safe Access Pattern

```typescript
function getTemplatesSettings(app: App): TemplatesPluginOptions {
  const templatesPlugin = (app as any).internalPlugins?.getPluginById('templates');

  const options = templatesPlugin?.instance?.options || {};

  return {
    folder: options.folder?.trim() || '',
    dateFormat: options.dateFormat || 'YYYY-MM-DD',
    timeFormat: options.timeFormat || 'HH:mm',
  };
}
```

---

## 3. Template Variable Processing

### Core Template Variables

The core Templates plugin supports only three variables:

| Variable | Description | Example Output |
|----------|-------------|----------------|
| `{{title}}` | Current note's filename (without extension) | `My Note` |
| `{{date}}` | Current date in configured format | `2026-01-14` |
| `{{time}}` | Current time in configured format | `14:30` |

### Variable Syntax with Custom Format

You can override the default format inline:

```
{{date:YYYY-MM-DD}}           // Date with custom format
{{time:HH:mm:ss}}             // Time with custom format
{{date:YYYY-MM-DDTHH:mm}}     // Combined date and time
```

### Replicating Variable Processing

```typescript
import { moment } from 'obsidian';

interface TemplateContext {
  title: string;
  dateFormat: string;
  timeFormat: string;
}

function processTemplateVariables(
  content: string,
  context: TemplateContext
): string {
  const now = moment();

  // Process {{title}}
  content = content.replace(/\{\{title\}\}/g, context.title);

  // Process {{date}} and {{date:FORMAT}}
  content = content.replace(/\{\{date(?::([^}]+))?\}\}/g, (match, customFormat) => {
    const format = customFormat || context.dateFormat;
    return now.format(format);
  });

  // Process {{time}} and {{time:FORMAT}}
  content = content.replace(/\{\{time(?::([^}]+))?\}\}/g, (match, customFormat) => {
    const format = customFormat || context.timeFormat;
    return now.format(format);
  });

  return content;
}

// Usage example
const processedContent = processTemplateVariables(templateContent, {
  title: 'My New Note',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm',
});
```

### Advanced: Using a Different Date for Processing

If you want to process templates with a date other than today (e.g., for creating backdated notes):

```typescript
function processTemplateVariablesWithDate(
  content: string,
  context: TemplateContext,
  date: moment.Moment
): string {
  // Process {{title}}
  content = content.replace(/\{\{title\}\}/g, context.title);

  // Process {{date}} and {{date:FORMAT}}
  content = content.replace(/\{\{date(?::([^}]+))?\}\}/g, (match, customFormat) => {
    const format = customFormat || context.dateFormat;
    return date.format(format);
  });

  // Process {{time}} and {{time:FORMAT}}
  content = content.replace(/\{\{time(?::([^}]+))?\}\}/g, (match, customFormat) => {
    const format = customFormat || context.timeFormat;
    return date.format(format);
  });

  return content;
}
```

---

## 4. Programmatically Inserting Templates

### Using Commands API

Obsidian exposes plugin commands that can be executed programmatically:

```typescript
// Execute a command by ID
this.app.commands.executeCommandById('templates:insert-template');

// Get list of all available commands (for debugging)
console.log(this.app.commands.commands);
```

### Direct Template Insertion

To insert a template without using the command modal:

```typescript
async function insertTemplate(
  app: App,
  templatePath: string,
  targetFile: TFile
): Promise<void> {
  // Read template content
  const templateFile = app.vault.getAbstractFileByPath(templatePath);
  if (!(templateFile instanceof TFile)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const templateContent = await app.vault.read(templateFile);

  // Get current settings
  const settings = getTemplatesSettings(app);

  // Process variables
  const processedContent = processTemplateVariables(templateContent, {
    title: targetFile.basename,
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
  });

  // Insert into target file
  await app.vault.modify(targetFile, processedContent);
}
```

### Inserting at Cursor Position

If you need to insert content at the current cursor position in an active editor:

```typescript
function insertAtCursor(app: App, content: string): void {
  const editor = app.workspace.activeEditor?.editor;
  if (!editor) return;

  const cursor = editor.getCursor();
  editor.replaceRange(content, cursor);
}
```

---

## 5. Reference Implementation: obsidian-daily-notes-interface

The `obsidian-daily-notes-interface` npm package by Liam Cain demonstrates the best practices for accessing internal plugin settings:

### Installation

```bash
npm install obsidian-daily-notes-interface
```

### Key Functions

```typescript
import {
  getDailyNoteSettings,
  createDailyNote,
  getAllDailyNotes,
  getDailyNote,
  appHasDailyNotesPluginLoaded
} from 'obsidian-daily-notes-interface';

// Get Daily Notes settings (format, folder, template)
const settings = getDailyNoteSettings();

// Check if Daily Notes plugin is enabled
if (appHasDailyNotesPluginLoaded()) {
  // Create a daily note for a specific date
  const date = moment('2026-01-14');
  const dailyNote = await createDailyNote(date);
}
```

### Source Code Pattern

From the library's source code (`settings.ts`):

```typescript
export function getDailyNoteSettings(): IDailyNoteSettings {
  const { internalPlugins, plugins } = <any>window.app;

  // Check for Periodic Notes plugin first (community plugin)
  const periodicNotesSettings = plugins.getPlugin("periodic-notes")?.settings?.daily;

  // Fall back to core Daily Notes plugin
  const dailyNotesSettings = internalPlugins.getPluginById("daily-notes")?.instance?.options;

  const settings = periodicNotesSettings || dailyNotesSettings || {};

  return {
    format: settings.format?.trim() || DEFAULT_DATE_FORMAT,
    folder: settings.folder?.trim() || "",
    template: settings.template?.trim() || "",
  };
}
```

---

## 6. Moment.js Date Formatting Reference

Obsidian bundles moment.js and makes it available globally. Common format tokens:

### Date Tokens

| Token | Output | Example |
|-------|--------|---------|
| `YYYY` | 4-digit year | `2026` |
| `YY` | 2-digit year | `26` |
| `MM` | Month (01-12) | `01` |
| `M` | Month (1-12) | `1` |
| `MMMM` | Full month name | `January` |
| `MMM` | Short month name | `Jan` |
| `DD` | Day of month (01-31) | `14` |
| `D` | Day of month (1-31) | `14` |
| `dddd` | Full weekday | `Tuesday` |
| `ddd` | Short weekday | `Tue` |

### Time Tokens

| Token | Output | Example |
|-------|--------|---------|
| `HH` | Hours 24h (00-23) | `14` |
| `hh` | Hours 12h (01-12) | `02` |
| `mm` | Minutes (00-59) | `30` |
| `ss` | Seconds (00-59) | `45` |
| `A` | AM/PM | `PM` |
| `a` | am/pm | `pm` |

### Common Formats

```javascript
moment().format('YYYY-MM-DD')           // 2026-01-14
moment().format('MMMM Do, YYYY')        // January 14th, 2026
moment().format('dddd, MMMM D, YYYY')   // Tuesday, January 14, 2026
moment().format('HH:mm')                // 14:30
moment().format('h:mm A')               // 2:30 PM
moment().format('YYYY-MM-DDTHH:mm:ss')  // 2026-01-14T14:30:45
```

---

## 7. Complete Integration Example

Here is a complete example of a utility class that integrates with Obsidian's Templates plugin:

```typescript
import { App, TFile, moment } from 'obsidian';

interface TemplatesSettings {
  folder: string;
  dateFormat: string;
  timeFormat: string;
}

export class TemplatesIntegration {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Check if the core Templates plugin is enabled
   */
  isTemplatesPluginEnabled(): boolean {
    const plugin = (this.app as any).internalPlugins?.getPluginById('templates');
    return plugin?.enabled === true;
  }

  /**
   * Get the Templates plugin settings
   */
  getSettings(): TemplatesSettings {
    const plugin = (this.app as any).internalPlugins?.getPluginById('templates');
    const options = plugin?.instance?.options || {};

    return {
      folder: options.folder?.trim() || '',
      dateFormat: options.dateFormat || 'YYYY-MM-DD',
      timeFormat: options.timeFormat || 'HH:mm',
    };
  }

  /**
   * Get all template files from the configured templates folder
   */
  getTemplateFiles(): TFile[] {
    const settings = this.getSettings();
    if (!settings.folder) return [];

    const folder = this.app.vault.getAbstractFileByPath(settings.folder);
    if (!folder) return [];

    const files: TFile[] = [];
    this.app.vault.recurseChildren(folder, (file) => {
      if (file instanceof TFile && file.extension === 'md') {
        files.push(file);
      }
    });

    return files;
  }

  /**
   * Process template variables in content
   */
  processVariables(
    content: string,
    title: string,
    date?: moment.Moment
  ): string {
    const settings = this.getSettings();
    const targetDate = date || moment();

    // Process {{title}}
    content = content.replace(/\{\{title\}\}/g, title);

    // Process {{date}} and {{date:FORMAT}}
    content = content.replace(
      /\{\{date(?::([^}]+))?\}\}/g,
      (_, customFormat) => {
        const format = customFormat || settings.dateFormat;
        return targetDate.format(format);
      }
    );

    // Process {{time}} and {{time:FORMAT}}
    content = content.replace(
      /\{\{time(?::([^}]+))?\}\}/g,
      (_, customFormat) => {
        const format = customFormat || settings.timeFormat;
        return targetDate.format(format);
      }
    );

    return content;
  }

  /**
   * Read and process a template file
   */
  async processTemplate(
    templatePath: string,
    title: string,
    date?: moment.Moment
  ): Promise<string> {
    const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
    if (!(templateFile instanceof TFile)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    const content = await this.app.vault.read(templateFile);
    return this.processVariables(content, title, date);
  }

  /**
   * Create a new note with template content
   */
  async createNoteFromTemplate(
    notePath: string,
    templatePath: string,
    customTitle?: string
  ): Promise<TFile> {
    const title = customTitle || notePath.split('/').pop()?.replace('.md', '') || '';
    const content = await this.processTemplate(templatePath, title);

    const file = await this.app.vault.create(notePath, content);
    return file;
  }
}
```

---

## 8. Warnings and Best Practices

### API Stability Warning

> **Warning**: The `app.internalPlugins` API is **not part of Obsidian's public API**. It may change or break in future Obsidian versions without notice. Always implement graceful fallbacks.

### Recommended Practices

1. **Graceful Degradation**: Always check if the plugin exists and is enabled before accessing its properties:

```typescript
const plugin = (app as any).internalPlugins?.getPluginById('templates');
if (!plugin?.enabled) {
  // Fall back to default behavior
}
```

2. **Default Values**: Always provide sensible defaults when settings are undefined:

```typescript
const dateFormat = options.dateFormat || 'YYYY-MM-DD';
```

3. **Type Safety**: Since this API is undocumented, use defensive typing:

```typescript
// Extend the App type in your plugin
declare module 'obsidian' {
  interface App {
    internalPlugins: {
      getPluginById(id: string): InternalPlugin | undefined;
      getEnabledPluginById(id: string): InternalPlugin | undefined;
    };
  }
}
```

4. **Version Checking**: Consider checking the Obsidian version if you rely on specific internal APIs:

```typescript
const obsidianVersion = this.app.vault.adapter.getBasePath?.()
  ? this.app.version
  : undefined;
```

---

## Sources

- [Obsidian Developer Documentation](https://docs.obsidian.md/Home)
- [Obsidian API GitHub Repository](https://github.com/obsidianmd/obsidian-api)
- [How do I access other plugins' settings? - Obsidian Forum](https://forum.obsidian.md/t/how-do-i-access-other-plugins-settings/99194)
- [obsidian-daily-notes-interface - GitHub](https://github.com/liamcain/obsidian-daily-notes-interface)
- [Templates - Obsidian Help](https://help.obsidian.md/plugins/templates)
- [Templater Plugin - GitHub](https://github.com/SilentVoid13/Templater)
- [Templater Documentation - Date Module](https://silentvoid13.github.io/Templater/internal-functions/internal-modules/date-module.html)
- [Moment.js Documentation](https://momentjs.com/docs/#/displaying/format/)
- [Templater Snippets](https://zachyoung.dev/posts/templater-snippets/)
