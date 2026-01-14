# Research: Best Approach for File Template Plugin

## Overview

This research document explores the best approaches for implementing the File Template Plugin based on the specs in `/Claude/Specs/1-FileTemplatePlugin.md`. The plugin will allow users to create new notes with templated titles and apply Obsidian file templates.

---

## 1. React Integration in Obsidian

### Recommendation: Use React for Complex UI Components

React is well-supported in Obsidian plugins and is the recommended approach per project requirements.

### Implementation Pattern

```typescript
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import { StrictMode } from 'react';

export class MyReactView extends ItemView {
    private root: Root | null = null;

    async onOpen() {
        this.root = createRoot(this.containerEl.children[1]);
        this.root.render(
            <StrictMode>
                <AppContext.Provider value={this.app}>
                    <MyComponent />
                </AppContext.Provider>
            </StrictMode>
        );
    }

    async onClose() {
        this.root?.unmount();
    }
}
```

### Key Points
- Use `createRoot` from `react-dom/client` (React 18+)
- Create an `AppContext` to pass the Obsidian `app` instance to React components
- Mount React in `onOpen()` and unmount in `onClose()`
- React is ideal for the settings page where dynamic template management is needed

### Resources
- [Official React Guide](https://docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin)
- [obsidian-react-starter](https://github.com/obsidian-community/obsidian-react-starter)

---

## 2. Modal Implementation

### Recommendation: Use FuzzySuggestModal for Template Selection

For the template selection modal, `FuzzySuggestModal<T>` provides built-in fuzzy search functionality, which is ideal for quickly selecting from a list of templates.

### Implementation Pattern

```typescript
import { FuzzySuggestModal, App, FuzzyMatch } from 'obsidian';

interface TitleTemplate {
    id: string;
    name: string;
    titlePattern: string;
    folder: string;
    fileTemplate?: string;
}

class TemplateSelectModal extends FuzzySuggestModal<TitleTemplate> {
    private templates: TitleTemplate[];
    private onChoose: (template: TitleTemplate) => void;

    constructor(
        app: App,
        templates: TitleTemplate[],
        onChoose: (template: TitleTemplate) => void
    ) {
        super(app);
        this.templates = templates;
        this.onChoose = onChoose;
    }

    getItems(): TitleTemplate[] {
        return this.templates;
    }

    getItemText(template: TitleTemplate): string {
        return template.name;
    }

    onChooseItem(template: TitleTemplate, evt: MouseEvent | KeyboardEvent): void {
        this.onChoose(template);
    }

    // Optional: Custom rendering
    renderSuggestion(match: FuzzyMatch<TitleTemplate>, el: HTMLElement): void {
        el.createEl('div', { text: match.item.name, cls: 'template-name' });
        el.createEl('small', { text: match.item.folder, cls: 'template-folder' });
    }
}
```

### Alternative: React Modal

For more complex modals (like settings), React can be used inside a basic `Modal`:

```typescript
import { Modal, App } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';

class ReactModal extends Modal {
    private root: Root | null = null;

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        this.root = createRoot(this.contentEl);
        this.root.render(<MyReactComponent onClose={() => this.close()} />);
    }

    onClose() {
        this.root?.unmount();
    }
}
```

### Resources
- [Modals Documentation](https://docs.obsidian.md/Plugins/User+interface/Modals)
- [FuzzySuggestModal API](https://docs.obsidian.md/Reference/TypeScript+API/FuzzySuggestModal)

---

## 3. Context Menu (Folder Right-Click)

### Recommendation: Use `registerEvent` with `file-menu` Event

To add a "New Templated File" option when right-clicking on a folder:

### Implementation Pattern

```typescript
import { Plugin, TFolder, Menu, TAbstractFile } from 'obsidian';

export default class FileTemplatePlugin extends Plugin {
    onload() {
        // Register context menu for folders
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile, source: string) => {
                if (file instanceof TFolder) {
                    menu.addItem((item) => {
                        item
                            .setTitle('New Templated File')
                            .setIcon('file-plus')
                            .onClick(() => {
                                this.openTemplateModal(file);
                            });
                    });
                }
            })
        );
    }

    private openTemplateModal(targetFolder: TFolder): void {
        // Open modal with folder context
        new TemplateSelectModal(
            this.app,
            this.settings.templates,
            (template) => this.createFileFromTemplate(template, targetFolder)
        ).open();
    }
}
```

### Key Points
- Use `registerEvent` to ensure proper cleanup on plugin unload
- Check `file instanceof TFolder` to only show on folders
- The folder path is available via `file.path`
- This captures right-clicks in the file explorer

### Resources
- [Context Menus Documentation](https://docs.obsidian.md/Plugins/User+interface/Context+menus)

---

## 4. Command Registration and Hotkeys

### Recommendation: Dynamic Command Registration

The plugin needs two types of commands:
1. A single command to open the template selection modal
2. Individual commands for each user-defined template

### Implementation Pattern

```typescript
import { Plugin, Command } from 'obsidian';

export default class FileTemplatePlugin extends Plugin {
    private templateCommands: Map<string, Command> = new Map();

    onload() {
        // Main command - opens template selection modal
        this.addCommand({
            id: 'open-template-modal',
            name: 'Create New Templated File',
            callback: () => {
                this.openTemplateModal();
            }
        });

        // Register individual commands for each template
        this.registerTemplateCommands();
    }

    // Called when settings change
    private registerTemplateCommands(): void {
        // Note: Obsidian doesn't support removing commands at runtime
        // So we need to handle this carefully - commands are registered once

        for (const template of this.settings.templates) {
            const commandId = `create-${template.id}`;

            // Only register if not already registered
            if (!this.templateCommands.has(commandId)) {
                const command = this.addCommand({
                    id: commandId,
                    name: `Create a new ${template.name} File`,
                    callback: () => {
                        this.createFileFromTemplate(template);
                    }
                });
                this.templateCommands.set(commandId, command);
            }
        }
    }
}
```

### Important Considerations
- **Hotkeys are user-configurable**: Obsidian allows users to set hotkeys via Settings > Hotkeys
- **Don't set default hotkeys**: To avoid conflicts, let users configure their own hotkeys
- **Commands persist until plugin reload**: Once registered, commands can't be removed without reloading the plugin. Plan for this in your architecture.

### Resources
- [Commands Documentation](https://docs.obsidian.md/Plugins/User+interface/Commands)
- [Command API Reference](https://docs.obsidian.md/Reference/TypeScript+API/Command)

---

## 5. Template Integration

### Recommendation: Support Both Core Templates and Templater

There are two main approaches for file templates:

### Option A: Read Template File Directly (Recommended)

This approach works with any template and gives full control:

```typescript
import { TFile, TFolder, normalizePath } from 'obsidian';

async function createFileFromTemplate(
    template: TitleTemplate,
    targetFolder?: TFolder
): Promise<TFile | null> {
    const { vault } = this.app;

    // Determine target folder
    const folderPath = targetFolder?.path
        ?? template.folder
        ?? this.getCurrentFolder();

    // Generate filename from title template
    const filename = this.generateFilename(template.titlePattern);
    const filePath = normalizePath(`${folderPath}/${filename}.md`);

    // Get template content (if specified)
    let content = '';
    if (template.fileTemplate) {
        const templateFile = vault.getAbstractFileByPath(template.fileTemplate);
        if (templateFile instanceof TFile) {
            content = await vault.read(templateFile);
            // Process template variables (date, title, etc.)
            content = this.processTemplateVariables(content, filename);
        }
    }

    // Create the file
    const newFile = await vault.create(filePath, content);

    // Open the new file
    await this.app.workspace.getLeaf().openFile(newFile);

    return newFile;
}

function processTemplateVariables(content: string, filename: string): string {
    const now = new Date();
    return content
        .replace(/{{title}}/g, filename)
        .replace(/{{date}}/g, now.toISOString().split('T')[0])
        .replace(/{{time}}/g, now.toTimeString().split(' ')[0]);
}
```

### Option B: Integrate with Templater (Advanced)

For users who want Templater's advanced features:

```typescript
async function applyTemplaterTemplate(file: TFile, templatePath: string): Promise<void> {
    const templater = this.app.plugins.getPlugin('templater-obsidian');
    if (!templater) {
        new Notice('Templater plugin not found');
        return;
    }

    // Use Templater's API (if available)
    const tp = templater.templater?.current_functions_object;
    if (tp) {
        const templateFile = tp.file.find_tfile(templatePath);
        // Apply template...
    }
}
```

### Key Points
- The core Templates plugin doesn't expose a public API for programmatic use
- Reading template files directly is more reliable and universal
- Consider supporting basic template variables (`{{title}}`, `{{date}}`, etc.)
- Let users configure their template folder location in settings

### Resources
- [Vault API](https://docs.obsidian.md/Plugins/Vault)
- [Templater Plugin](https://github.com/SilentVoid13/Templater)

---

## 6. Settings Implementation

### Recommendation: React-Based Settings Tab

Given the complexity of managing multiple templates with various options, React is ideal:

### Implementation Pattern

```typescript
import { App, PluginSettingTab, Setting } from 'obsidian';

interface PluginSettings {
    templates: TitleTemplate[];
    templateFolder: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
    templates: [],
    templateFolder: 'Templates'
};

class SettingsTab extends PluginSettingTab {
    private root: Root | null = null;

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'File Template Settings' });

        // Template folder setting (simple)
        new Setting(containerEl)
            .setName('Template Folder')
            .setDesc('Folder containing your file templates')
            .addText(text => text
                .setPlaceholder('Templates')
                .setValue(this.plugin.settings.templateFolder)
                .onChange(async (value) => {
                    this.plugin.settings.templateFolder = value;
                    await this.plugin.saveSettings();
                })
            );

        // React component for template list management
        const reactContainer = containerEl.createDiv();
        this.root = createRoot(reactContainer);
        this.root.render(
            <TemplateListManager
                templates={this.plugin.settings.templates}
                onUpdate={async (templates) => {
                    this.plugin.settings.templates = templates;
                    await this.plugin.saveSettings();
                    this.plugin.registerTemplateCommands();
                }}
            />
        );
    }

    hide(): void {
        this.root?.unmount();
    }
}
```

### Template Data Structure

```typescript
interface TitleTemplate {
    id: string;                    // Unique identifier
    name: string;                  // Display name (e.g., "Daily Note")
    titlePattern: string;          // Pattern like "{{date}}-{{title}}"
    folder: string | 'current';    // Target folder or 'current' for active folder
    fileTemplate?: string;         // Path to file template (optional)
}
```

### Resources
- [Settings Documentation](https://marcusolsson.github.io/obsidian-plugin-docs/user-interface/settings)
- [PluginSettingTab API](https://docs.obsidian.md/Reference/TypeScript+API/PluginSettingTab)

---

## 7. Mobile Considerations

### Recommendation: Design Mobile-First UI

Obsidian Mobile is fully supported and community plugins work across platforms.

### Key Considerations

1. **Screen Size**: Design modals and settings to work on smaller screens
2. **Touch Targets**: Ensure buttons and interactive elements are large enough (minimum 44x44px)
3. **Command Palette**: Works identically on mobile - this is the primary interaction method
4. **Context Menu**: Long-press on folders triggers the context menu on mobile
5. **No Platform-Specific APIs**: This plugin doesn't require any desktop-only features

### Implementation Tips

```typescript
// Check if running on mobile
const isMobile = Platform.isMobile;

// Adjust UI accordingly
if (isMobile) {
    // Use larger touch targets
    // Simplify complex interactions
}
```

### Mobile-Specific Command

```typescript
this.addCommand({
    id: 'create-template-mobile',
    name: 'Create New Templated File',
    mobileOnly: false,  // Works on both, but can use mobileOnly: true if needed
    callback: () => {
        this.openTemplateModal();
    }
});
```

### Resources
- [Mobile Development Guide](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development)
- [Mobile-Compatible Plugins List](https://publish.obsidian.md/hub/02+-+Community+Expansions/02.01+Plugins+by+Category/Mobile-compatible+plugins)

---

## 8. Project Architecture Recommendation

### Recommended Folder Structure

```
src/
├── main.ts                    # Plugin entry point
├── types.ts                   # TypeScript interfaces
├── settings/
│   ├── SettingsTab.tsx        # Main settings tab (React)
│   ├── TemplateListManager.tsx # Template CRUD component
│   └── TemplateEditor.tsx     # Individual template editor
├── modals/
│   ├── TemplateSelectModal.ts # FuzzySuggestModal for selection
│   └── TitleInputModal.ts     # Optional: prompt for dynamic title parts
├── services/
│   ├── TemplateService.ts     # Template processing logic
│   └── FileService.ts         # File creation logic
└── utils/
    └── templateParser.ts      # Parse title patterns
```

### Build Configuration

Use esbuild (recommended by Obsidian) with React support:

```javascript
// esbuild.config.mjs
import esbuild from 'esbuild';

esbuild.build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    external: ['obsidian'],
    format: 'cjs',
    target: 'es2018',
    outfile: 'main.js',
    loader: {
        '.tsx': 'tsx',
        '.ts': 'ts'
    }
});
```

---

## 9. Summary of Recommendations

| Feature | Recommended Approach |
|---------|---------------------|
| **UI Framework** | React for settings/complex UI, native Obsidian for modals |
| **Template Selection** | `FuzzySuggestModal` for quick fuzzy search |
| **Context Menu** | `registerEvent` with `file-menu` event |
| **Commands** | Dynamic registration via `addCommand` |
| **Template Application** | Direct file reading via Vault API |
| **Settings** | `PluginSettingTab` with React components |
| **Mobile** | No special handling needed - works natively |

---

## 10. Sources

- [Obsidian Developer Documentation](https://docs.obsidian.md/)
- [Obsidian API Repository](https://github.com/obsidianmd/obsidian-api)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Obsidian React Starter](https://github.com/obsidian-community/obsidian-react-starter)
- [Marcus Olsson Plugin Docs](https://marcusolsson.github.io/obsidian-plugin-docs/)
- [Templater Plugin](https://github.com/SilentVoid13/Templater)
- [Obsidian Forum - Developers API](https://forum.obsidian.md/c/developers-api/14)
