# New File Templates for Obsidian

Create new notes with templated titles and optional file content templates. Quickly generate consistently named files from the command palette, context menu, or ribbon icon.

## Features

- **Title Templates**: Define patterns for generating filenames with date/time variables
- **File Templates**: Optionally apply content templates to new files
- **Multiple Access Methods**:
  - Command palette: "Create New Templated File"
  - Per-template commands: "Create a new {Template Name} File"
  - Right-click folder context menu
  - Ribbon icon (sidebar)
- **Flexible Folder Targeting**: Set a default folder or use the current folder
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

### Title Pattern Variables

| Variable | Output | Example |
|----------|--------|---------|
| `{{date}}` | YYYY-MM-DD | 2024-03-15 |
| `{{time}}` | HH-mm-ss | 14-30-45 |
| `{{datetime}}` | YYYY-MM-DD_HH-mm-ss | 2024-03-15_14-30-45 |
| `{{timestamp}}` | Unix milliseconds | 1710513045000 |
| `{{year}}` | YYYY | 2024 |
| `{{month}}` | MM | 03 |
| `{{day}}` | DD | 15 |

### File Template Variables

Content templates support these additional variables:

| Variable | Description |
|----------|-------------|
| `{{title}}` | The generated filename (without extension) |
| `{{date}}` | Current date |
| `{{time}}` | Current time |
| All title variables | Same as title pattern variables |

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

**Quick Thought:**
- Name: `Quick Thought`
- Pattern: `{{timestamp}}`
- Folder: `Current Folder`
- Result: `1710513045000.md` (in current folder)

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
├── services/         # File operations service
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
