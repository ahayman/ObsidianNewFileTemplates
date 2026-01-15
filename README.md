# New File Templates for Obsidian

Create new notes with templated titles and optional file content templates. Quickly generate consistently named files from the command palette, context menu, or ribbon icon.

## Features

- **Title Templates**: Define patterns for generating filenames with date/time variables
- **File Templates**: Optionally apply content templates to new files (with variable substitution)
- **Templater Integration**: Automatically process Templater syntax in your file templates
- **Obsidian Integration**: Uses your configured date/time formats from Obsidian's core Templates plugin
- **Template Reordering**: Drag and drop or use arrow buttons to arrange templates in your preferred order
- **Multiple Access Methods**:
  - Command palette: "Create New Templated File"
  - Per-template commands: "Create a new {Template Name} File"
  - Right-click folder context menu
  - Ribbon icon (sidebar)
- **Flexible Folder Targeting**: Set a default folder or use the current folder
- **Searchable Selection**: Search through folders and template files in settings
- **Smart Filename Sanitization**: Automatically handles invalid filename characters
- **Mobile Support**: Fully optimized for iOS and Android

## Installation

### From Obsidian Community Plugins (Recommended)
1. Open Settings → Community Plugins
2. Search for "New File Templates"
3. Click Install, then Enable

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create folder: `<vault>/.obsidian/plugins/new-file-templates/`
3. Copy the files into this folder
4. Reload Obsidian and enable the plugin in Settings → Community Plugins

## Usage

### Creating Templates

1. Open Settings → New File Templates
2. Click "Add Template"
3. Configure your template:
   - **Name**: Display name (e.g., "Daily Note")
   - **Title Pattern**: Filename pattern with variables (e.g., `{{date}}-daily`)
   - **Target Folder**: Where to create files (or "Current Folder")
   - **File Template**: Optional content template file

### Reordering Templates

Templates appear in the order you arrange them, both in settings and when selecting a template:

- **Drag and Drop**: Use the grip handle on the left to drag templates to a new position
- **Arrow Buttons**: Use the up/down arrows to move templates one position at a time
- On mobile, the arrow buttons are always visible for easy reordering

### Title Pattern Variables

The plugin integrates with Obsidian's core Templates plugin. If you have date/time formats configured there, they will be used automatically.

| Variable | Description | Default Format |
|----------|-------------|----------------|
| `{{date}}` | Current date | YYYY-MM-DD |
| `{{date:FORMAT}}` | Date with custom format | Any moment.js format |
| `{{time}}` | Current time (file-safe) | HH-mm-ss |
| `{{time:FORMAT}}` | Time with custom format | Any moment.js format |
| `{{datetime}}` | Combined date and time | YYYY-MM-DD_HH-mm-ss |
| `{{timestamp}}` | Unix milliseconds | 1710513045000 |
| `{{year}}` | Current year | YYYY |
| `{{month}}` | Current month (zero-padded) | MM |
| `{{day}}` | Current day (zero-padded) | DD |
| `{{counter}}` | Auto-incrementing number | Scans folder for max value |

**Custom Format Examples:**
- `{{date:MMMM D, YYYY}}` → "March 15, 2024"
- `{{date:dddd}}` → "Friday"
- `{{time:h-mm A}}` → "2-30 PM"

**Auto-Incrementing Counter:**

The `{{counter}}` variable automatically increments based on existing files in the target folder. When you create a new file:

1. The plugin scans the target folder for files matching your template pattern
2. Extracts the counter values from matching filenames
3. Uses the next value (max + 1)

When you add `{{counter}}` to your pattern, a "Counter Starts At" field appears in the template editor. This sets the initial value when no matching files exist (default: 1).

**Counter Examples:**
- Pattern: `Chapter {{counter}}` with existing files `Chapter 1.md`, `Chapter 2.md` → Creates `Chapter 3.md`
- Pattern: `{{counter}} - {{date}} Meeting` → Creates `1 - 2024-03-15 Meeting.md`, `2 - 2024-03-15 Meeting.md`, etc.
- Pattern: `Note {{counter}}` with "Starts At: 100" and no existing files → Creates `Note 100.md`

Note: `{{counter}}` can only be used once per template pattern.

### File Template Variables

When you specify a file template, its content is processed with variable substitution (matching Obsidian's Templates plugin behavior):

| Variable | Description |
|----------|-------------|
| `{{title}}` | The generated filename (without extension) |
| `{{date}}` | Current date in your configured format |
| `{{date:FORMAT}}` | Date with custom moment.js format |
| `{{time}}` | Current time in your configured format |
| `{{time:FORMAT}}` | Time with custom moment.js format |

### Templater Integration

If you use the [Templater](https://github.com/SilentVoid13/Templater) plugin, this plugin can automatically process Templater syntax (`<% ... %>`) in your file templates when creating new notes.

**How it works:**

When you select a file template in the template editor, the plugin checks if it contains Templater syntax. Based on what it finds, you'll see one of:

| Scenario | What You'll See |
|----------|-----------------|
| Templater syntax detected, Templater installed | Toggle to enable/disable Templater processing |
| Templater syntax detected, Templater auto-processes on file creation | Info message: "Automatically processed by Templater" |
| Templater syntax detected, Templater NOT installed | Warning that Templater plugin is not installed |
| No Templater syntax | Nothing (no Templater options shown) |

**Setting Templater's auto-process option:**

Templater has a setting called "Trigger Templater on new file creation". If this is enabled, Templater will automatically process any new file, so this plugin won't need to trigger processing manually. If it's disabled, you can use the toggle in the template editor to control whether this plugin should process Templater syntax.

**Example file template with Templater:**

```markdown
---
created: <% tp.date.now("YYYY-MM-DD HH:mm") %>
tags: []
---

# {{title}}

<% tp.file.cursor() %>
```

When you create a new file with this template:
1. `{{title}}` is replaced with the generated filename (by this plugin)
2. `<% tp.date.now() %>` and `<% tp.file.cursor() %>` are processed by Templater

### Filename Sanitization

The plugin automatically handles characters that aren't allowed in filenames:

| Character | Replacement |
|-----------|-------------|
| `:` | `⦂` (two dot punctuation) |
| `\|` | `∣` (divides symbol) |
| `* " \ / < > ?` | Removed |

This allows you to use time formats like `{{time:HH:mm}}` in your patterns - the colons will be automatically converted to safe characters.

### Creating Files

**From Command Palette:**
- `Ctrl/Cmd + P` → "Create New Templated File" → Select template
- Or directly search for "Create a new {Template Name} File"

**From Folder Context Menu:**
- Right-click (or long-press on mobile) a folder
- Select "New Templated File"
- Choose your template

**From Ribbon:**
- Click the file-plus icon in the left sidebar

### Example Templates

**Daily Note:**
- Name: `Daily Note`
- Pattern: `{{date}}-daily`
- Folder: `Daily Notes`
- Result: `2024-03-15-daily.md`

**Meeting Notes:**
- Name: `Meeting Notes`
- Pattern: `{{date}}_{{time}}-meeting`
- Folder: `Meetings`
- Result: `2024-03-15_14-30-45-meeting.md`

**Timestamped Note with Custom Format:**
- Name: `Quick Note`
- Pattern: `{{date:YYYYMMDD}}-{{time:HHmmss}}`
- Folder: `Current Folder`
- Result: `20240315-143045.md`

**Weekly Review:**
- Name: `Weekly Review`
- Pattern: `{{date:YYYY}}-W{{date:ww}}-review`
- Folder: `Reviews`
- Result: `2024-W11-review.md`

**Book Chapter:**
- Name: `Book Chapter`
- Pattern: `Chapter {{counter}} - {{date}}`
- Folder: `Book`
- Counter Starts At: `1`
- Result: `Chapter 1 - 2024-03-15.md`, `Chapter 2 - 2024-03-15.md`, etc.

## Development

### Prerequisites
- Node.js 18+
- Yarn

### Setup
```bash
git clone <repo-url>
cd ObsidianNewNoteTemplate
yarn install
```

### Commands
```bash
yarn build      # Production build
yarn dev        # Development with watch mode
yarn test       # Run tests
yarn test:watch # Run tests in watch mode
```

### Project Structure
```
src/
├── main.ts           # Plugin entry point
├── types.ts          # TypeScript interfaces
├── utils/            # Template parsing utilities
├── services/
│   ├── FileService.ts      # File operations
│   ├── TemplaterService.ts # Templater plugin integration
│   └── CounterService.ts   # Auto-increment counter logic
├── modals/           # Template selection modal
└── settings/         # React-based settings UI
```

### Testing in Obsidian
1. Create a test vault (don't use your main vault!)
2. Create symlink or copy build output:
   ```bash
   # macOS/Linux
   ln -s /path/to/project /path/to/vault/.obsidian/plugins/new-file-templates

   # Or copy files
   cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/new-file-templates/
   ```
3. Reload Obsidian (`Ctrl/Cmd + R`)

## License

MIT License - See [LICENSE](LICENSE) for details.

## Support

- [Report Issues](https://github.com/your-repo/issues)
- [Feature Requests](https://github.com/your-repo/issues)
