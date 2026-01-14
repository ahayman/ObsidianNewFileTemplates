/**
 * Mock implementation of the Obsidian API for testing
 */

export class App {
  vault = new Vault();
  workspace = new Workspace();
  plugins = {
    getPlugin: jest.fn(),
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
