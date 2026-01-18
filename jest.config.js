/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^obsidian$": "<rootDir>/__mocks__/obsidian.ts",
    "^@codemirror/view$": "<rootDir>/__mocks__/@codemirror/view.ts",
    "^@codemirror/state$": "<rootDir>/__mocks__/@codemirror/state.ts",
    "^@codemirror/commands$": "<rootDir>/__mocks__/@codemirror/commands.ts",
    "^@codemirror/autocomplete$": "<rootDir>/__mocks__/@codemirror/autocomplete.ts",
    "^../components$": "<rootDir>/__mocks__/SyntaxInput.tsx",
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/main.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  clearMocks: true,
  restoreMocks: true,
};
