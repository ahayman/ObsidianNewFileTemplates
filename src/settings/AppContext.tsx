/**
 * React Context for Obsidian App
 *
 * Provides access to the Obsidian App instance throughout React components.
 */

import { App } from "obsidian";
import { createContext, useContext } from "react";

/**
 * Context holding the Obsidian App instance
 */
export const AppContext = createContext<App | undefined>(undefined);

/**
 * Hook to access the Obsidian App instance
 * @throws Error if used outside of AppContext.Provider
 */
export function useApp(): App {
  const app = useContext(AppContext);
  if (!app) {
    throw new Error("useApp must be used within an AppContext.Provider");
  }
  return app;
}
