/**
 * Mock implementation of the Obsidian API for testing
 */

export class App {
  vault = new Vault();
  workspace = new Workspace();
  plugins = {
    getPlugin: jest.fn(),
  };
  // Mock internal plugins API for Templates plugin access
  internalPlugins = {
    getPluginById: jest.fn(() => ({
      enabled: true,
      instance: {
        options: {
          folder: "Templates",
          dateFormat: "YYYY-MM-DD",
          timeFormat: "HH:mm",
        },
      },
    })),
    getEnabledPluginById: jest.fn(() => null),
  };
}

export class Vault {
  getAbstractFileByPath = jest.fn();
  create = jest.fn();
  read = jest.fn();
  modify = jest.fn();
  delete = jest.fn();
  rename = jest.fn();
  getMarkdownFiles = jest.fn(() => []);
  getAllLoadedFiles = jest.fn(() => []);
}

export class Workspace {
  getLeaf = jest.fn(() => new WorkspaceLeaf());
  getActiveFile = jest.fn();
  on = jest.fn();
}

export class WorkspaceLeaf {
  openFile = jest.fn();
}

export class Plugin {
  app: App;
  manifest: PluginManifest;

  constructor(app: App, manifest: PluginManifest) {
    this.app = app;
    this.manifest = manifest;
  }

  addCommand = jest.fn();
  addSettingTab = jest.fn();
  registerEvent = jest.fn();
  loadData = jest.fn(() => Promise.resolve(null));
  saveData = jest.fn(() => Promise.resolve());
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  author: string;
  authorUrl?: string;
  isDesktopOnly?: boolean;
}

export class PluginSettingTab {
  app: App;
  containerEl: HTMLElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.containerEl = document.createElement("div");
  }

  display(): void {}
  hide(): void {}
}

export class Modal {
  app: App;
  contentEl: HTMLElement;
  modalEl: HTMLElement;

  constructor(app: App) {
    this.app = app;
    this.contentEl = document.createElement("div");
    this.modalEl = document.createElement("div");
  }

  open(): void {}
  close(): void {}
  onOpen(): void {}
  onClose(): void {}
}

export class FuzzySuggestModal<T> extends Modal {
  constructor(app: App) {
    super(app);
  }

  getItems(): T[] {
    return [];
  }

  getItemText(item: T): string {
    return "";
  }

  onChooseItem(item: T, evt: MouseEvent | KeyboardEvent): void {}

  renderSuggestion(item: { item: T; match: { score: number } }, el: HTMLElement): void {}
}

export class SuggestModal<T> extends Modal {
  constructor(app: App) {
    super(app);
  }

  getSuggestions(query: string): T[] {
    return [];
  }

  renderSuggestion(item: T, el: HTMLElement): void {}

  onChooseSuggestion(item: T, evt: MouseEvent | KeyboardEvent): void {}
}

export class Setting {
  settingEl: HTMLElement;
  infoEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  controlEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement("div");
    this.infoEl = document.createElement("div");
    this.nameEl = document.createElement("div");
    this.descEl = document.createElement("div");
    this.controlEl = document.createElement("div");
    containerEl.appendChild(this.settingEl);
  }

  setName(name: string): this {
    return this;
  }

  setDesc(desc: string): this {
    return this;
  }

  addText(cb: (text: TextComponent) => void): this {
    cb(new TextComponent(this.controlEl));
    return this;
  }

  addToggle(cb: (toggle: ToggleComponent) => void): this {
    cb(new ToggleComponent(this.controlEl));
    return this;
  }

  addDropdown(cb: (dropdown: DropdownComponent) => void): this {
    cb(new DropdownComponent(this.controlEl));
    return this;
  }

  addButton(cb: (button: ButtonComponent) => void): this {
    cb(new ButtonComponent(this.controlEl));
    return this;
  }
}

export class TextComponent {
  inputEl: HTMLInputElement;

  constructor(containerEl: HTMLElement) {
    this.inputEl = document.createElement("input");
    containerEl.appendChild(this.inputEl);
  }

  setValue(value: string): this {
    this.inputEl.value = value;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.inputEl.placeholder = placeholder;
    return this;
  }

  onChange(callback: (value: string) => void): this {
    return this;
  }
}

export class ToggleComponent {
  toggleEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.toggleEl = document.createElement("div");
    containerEl.appendChild(this.toggleEl);
  }

  setValue(value: boolean): this {
    return this;
  }

  onChange(callback: (value: boolean) => void): this {
    return this;
  }
}

export class DropdownComponent {
  selectEl: HTMLSelectElement;

  constructor(containerEl: HTMLElement) {
    this.selectEl = document.createElement("select");
    containerEl.appendChild(this.selectEl);
  }

  addOption(value: string, display: string): this {
    return this;
  }

  setValue(value: string): this {
    return this;
  }

  onChange(callback: (value: string) => void): this {
    return this;
  }
}

export class ButtonComponent {
  buttonEl: HTMLButtonElement;

  constructor(containerEl: HTMLElement) {
    this.buttonEl = document.createElement("button");
    containerEl.appendChild(this.buttonEl);
  }

  setButtonText(text: string): this {
    this.buttonEl.textContent = text;
    return this;
  }

  setIcon(icon: string): this {
    return this;
  }

  setCta(): this {
    return this;
  }

  onClick(callback: () => void): this {
    return this;
  }
}

export class TFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  parent: TFolder | null;

  constructor(path: string = "") {
    this.path = path;
    this.name = path.split("/").pop() || "";
    this.basename = this.name.replace(/\.[^/.]+$/, "");
    this.extension = this.name.split(".").pop() || "";
    this.parent = null;
  }
}

export class TFolder {
  path: string;
  name: string;
  parent: TFolder | null;
  children: (TFile | TFolder)[];

  constructor(path: string = "") {
    this.path = path;
    this.name = path.split("/").pop() || "";
    this.parent = null;
    this.children = [];
  }
}

export type TAbstractFile = TFile | TFolder;

export class Menu {
  addItem(cb: (item: MenuItem) => void): this {
    cb(new MenuItem());
    return this;
  }

  addSeparator(): this {
    return this;
  }
}

export class MenuItem {
  setTitle(title: string): this {
    return this;
  }

  setIcon(icon: string): this {
    return this;
  }

  onClick(callback: () => void): this {
    return this;
  }
}

export class Notice {
  constructor(message: string, timeout?: number) {}
}

/**
 * Editor position interface
 */
export interface EditorPosition {
  line: number;
  ch: number;
}

/**
 * Mock Editor class for testing
 */
export class Editor {
  private content: string;
  private cursor: EditorPosition;

  constructor(content: string = "", cursor?: EditorPosition) {
    this.content = content;
    this.cursor = cursor || { line: 0, ch: 0 };
  }

  getValue(): string {
    return this.content;
  }

  setValue(content: string): void {
    this.content = content;
  }

  getLine(line: number): string {
    const lines = this.content.split("\n");
    return lines[line] || "";
  }

  getCursor(): EditorPosition {
    return this.cursor;
  }

  setCursor(pos: EditorPosition): void {
    this.cursor = pos;
  }

  posToOffset(pos: EditorPosition): number {
    const lines = this.content.split("\n");
    let offset = 0;
    for (let i = 0; i < pos.line; i++) {
      offset += (lines[i]?.length || 0) + 1; // +1 for newline
    }
    return offset + pos.ch;
  }

  replaceRange(text: string, from: EditorPosition, to: EditorPosition): void {
    const lines = this.content.split("\n");
    const beforeFrom = lines.slice(0, from.line).join("\n") +
      (from.line > 0 ? "\n" : "") +
      lines[from.line].slice(0, from.ch);
    const afterTo = lines[to.line].slice(to.ch) +
      (to.line < lines.length - 1 ? "\n" : "") +
      lines.slice(to.line + 1).join("\n");
    this.content = beforeFrom + text + afterTo;
  }
}

/**
 * EditorSuggestTriggerInfo interface
 */
export interface EditorSuggestTriggerInfo {
  start: EditorPosition;
  end: EditorPosition;
  query: string;
}

/**
 * EditorSuggestContext interface
 */
export interface EditorSuggestContext {
  start: EditorPosition;
  end: EditorPosition;
  query: string;
  editor: Editor;
  file: TFile | null;
}

/**
 * Mock EditorSuggest base class for testing
 */
export abstract class EditorSuggest<T> {
  app: App;
  context: EditorSuggestContext | null = null;

  constructor(app: App) {
    this.app = app;
  }

  abstract onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    file: TFile | null
  ): EditorSuggestTriggerInfo | null;

  abstract getSuggestions(context: EditorSuggestContext): T[];

  abstract renderSuggestion(suggestion: T, el: HTMLElement): void;

  abstract selectSuggestion(
    suggestion: T,
    evt: MouseEvent | KeyboardEvent
  ): void;

  /**
   * Helper method for testing - sets context and calls getSuggestions
   */
  testGetSuggestions(query: string, editor: Editor): T[] {
    this.context = {
      start: { line: 0, ch: 0 },
      end: { line: 0, ch: 0 },
      query,
      editor,
      file: null,
    };
    return this.getSuggestions(this.context);
  }

  /**
   * Helper method for testing - sets context for selectSuggestion
   */
  setTestContext(context: EditorSuggestContext): void {
    this.context = context;
  }
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export const Platform = {
  isMobile: false,
  isDesktop: true,
  isMacOS: false,
  isWin: false,
  isLinux: false,
  isIosApp: false,
  isAndroidApp: false,
};

/**
 * Mock moment.js implementation
 * Creates a moment-like object with format() method
 */
interface MockMoment {
  format: (formatStr: string) => string;
}

function createMockMoment(date?: Date | string): MockMoment {
  const d = date ? new Date(date) : new Date();

  return {
    format: (formatStr: string): string => {
      // Basic format implementation for common tokens
      const pad = (n: number, len = 2) => String(n).padStart(len, "0");

      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const seconds = d.getSeconds();

      let result = formatStr;

      // Year
      result = result.replace(/YYYY/g, String(year));
      result = result.replace(/YY/g, String(year).slice(-2));

      // Month
      result = result.replace(/MM/g, pad(month));
      result = result.replace(/M(?![oMa])/g, String(month));

      // Day
      result = result.replace(/DD/g, pad(day));
      result = result.replace(/D(?![oa])/g, String(day));

      // Hours (24h)
      result = result.replace(/HH/g, pad(hours));
      result = result.replace(/H(?!H)/g, String(hours));

      // Hours (12h)
      const hours12 = hours % 12 || 12;
      result = result.replace(/hh/g, pad(hours12));
      result = result.replace(/h(?!h)/g, String(hours12));

      // Minutes
      result = result.replace(/mm/g, pad(minutes));
      result = result.replace(/m(?!m)/g, String(minutes));

      // Seconds
      result = result.replace(/ss/g, pad(seconds));
      result = result.replace(/s(?!s)/g, String(seconds));

      // AM/PM
      const ampm = hours >= 12 ? "PM" : "AM";
      result = result.replace(/A/g, ampm);
      result = result.replace(/a/g, ampm.toLowerCase());

      return result;
    },
  };
}

export function moment(date?: Date | string): MockMoment {
  return createMockMoment(date);
}

// Also export moment as a namespace for types
export namespace moment {
  export type Moment = MockMoment;
}
