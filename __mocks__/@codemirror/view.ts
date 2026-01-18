/**
 * Mock for @codemirror/view
 * Provides minimal implementations for testing
 */

export class EditorView {
  state: any;
  dom: HTMLElement;

  constructor(config: any) {
    this.state = config.state || { doc: { toString: () => "" } };
    this.dom = document.createElement("div");
    if (config.parent) {
      config.parent.appendChild(this.dom);
    }
  }

  dispatch(_transaction: any) {}
  destroy() {}
}

export class WidgetType {
  toDOM() {
    return document.createElement("span");
  }
}

export class Decoration {
  static mark(_spec: any) {
    return {};
  }
  static widget(_spec: any) {
    return {};
  }
  static replace(_spec: any) {
    return {};
  }
}

export type DecorationSet = any;

export class ViewPlugin {
  static fromClass(_cls: any, _spec?: any) {
    return {};
  }
}

export type ViewUpdate = any;

export const keymap = {
  of: (_bindings: any) => ({}),
};

export function placeholder(_text: string) {
  return {};
}

export const EditorView_lineWrapping = {};
Object.defineProperty(EditorView, "lineWrapping", {
  get: () => ({}),
});

Object.defineProperty(EditorView, "theme", {
  value: (_spec: any) => ({}),
});

Object.defineProperty(EditorView, "updateListener", {
  get: () => ({
    of: (_fn: any) => ({}),
  }),
});
