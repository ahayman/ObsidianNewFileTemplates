/**
 * Mock for @codemirror/state
 */

export class EditorState {
  doc: any;

  static create(config: any) {
    const state = new EditorState();
    state.doc = {
      toString: () => config.doc || "",
      length: (config.doc || "").length,
    };
    return state;
  }
}

export class Compartment {
  of(_extension: any) {
    return {};
  }
  reconfigure(_extension: any) {
    return {};
  }
}

export class RangeSetBuilder {
  add(_from: number, _to: number, _value: any) {}
  finish() {
    return {};
  }
}

export type Extension = any;
