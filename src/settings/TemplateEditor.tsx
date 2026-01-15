/**
 * Template Editor Component
 *
 * Form for creating or editing a title template.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { TitleTemplate } from "../types";
import {
  parseTitleTemplateToFilename,
  getTemplatesSettings,
  SUPPORTED_VARIABLES,
  hasCounterVariable,
  validateTemplatePattern,
} from "../utils";
import { useApp } from "./AppContext";
import { TFolder, TFile } from "obsidian";
import { SearchableSelect, SelectOption } from "./SearchableSelect";
import {
  getTemplaterStatus,
  TemplaterStatus,
} from "../services/TemplaterService";

interface TemplateEditorProps {
  /** Template to edit, or undefined for creating new */
  template?: TitleTemplate;
  /** Folder to look for file templates */
  templateFolder: string;
  /** Called when save is clicked */
  onSave: (template: TitleTemplate) => void;
  /** Called when cancel is clicked */
  onCancel: () => void;
}

/**
 * Generates a unique ID for new templates
 */
function generateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function TemplateEditor({ template, templateFolder, onSave, onCancel }: TemplateEditorProps) {
  const app = useApp();

  // Form state
  const [name, setName] = useState(template?.name ?? "");
  const [titlePattern, setTitlePattern] = useState(template?.titlePattern ?? "{{date}}-");
  const [folder, setFolder] = useState(template?.folder ?? "current");
  const [fileTemplate, setFileTemplate] = useState(template?.fileTemplate ?? "");
  const [useTemplater, setUseTemplater] = useState(template?.useTemplater ?? true);
  const [counterStartsAt, setCounterStartsAt] = useState(template?.counterStartsAt ?? 1);

  // Check if pattern has counter variable
  const patternHasCounter = useMemo(() => hasCounterVariable(titlePattern), [titlePattern]);

  // Templater status state
  const [templaterStatus, setTemplaterStatus] = useState<TemplaterStatus>({
    hasTemplaterSyntax: false,
    templaterAvailable: false,
    templaterAutoProcesses: false,
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Available folders and templates
  const [folders, setFolders] = useState<string[]>([]);
  const [templateFiles, setTemplateFiles] = useState<string[]>([]);

  // Load folders and template files
  useEffect(() => {
    const allFiles = app.vault.getAllLoadedFiles();

    // Get all folders
    const folderList = allFiles
      .filter((f): f is TFolder => f instanceof TFolder)
      .map((f) => f.path)
      .sort();
    setFolders(["", ...folderList]);

    // Get markdown files (potential templates)
    // Filter to templateFolder if set, otherwise show all
    const mdFiles = allFiles
      .filter((f): f is TFile => f instanceof TFile && f.extension === "md")
      .filter((f) => {
        if (!templateFolder || templateFolder.trim() === "") {
          // No template folder set, show all files
          return true;
        }
        // Only show files within the template folder
        return f.path.startsWith(templateFolder + "/") || f.path.startsWith(templateFolder);
      })
      .map((f) => f.path)
      .sort();
    setTemplateFiles(["", ...mdFiles]);
  }, [app, templateFolder]);

  // Check Templater status when file template changes
  useEffect(() => {
    const checkTemplater = async () => {
      const status = await getTemplaterStatus(app, fileTemplate || undefined);
      setTemplaterStatus(status);

      // If file template has Templater syntax and Templater is available but doesn't auto-process,
      // default useTemplater to true for new templates or when file template changes
      if (status.hasTemplaterSyntax && status.templaterAvailable && !status.templaterAutoProcesses) {
        // Only set default if this is not initial load of an existing template
        if (!template?.fileTemplate || template.fileTemplate !== fileTemplate) {
          setUseTemplater(true);
        }
      }
    };

    checkTemplater();
  }, [app, fileTemplate, template?.fileTemplate]);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!titlePattern.trim()) {
      newErrors.titlePattern = "Title pattern is required";
    } else {
      // Validate template pattern (checks for unrecognized variables and duplicate counter)
      const validation = validateTemplatePattern(titlePattern);
      if (!validation.valid && validation.error) {
        newErrors.titlePattern = validation.error;
      }
    }

    if (!folder.trim() && folder !== "current") {
      newErrors.folder = "Folder is required";
    }

    // Validate counter starts at value
    if (patternHasCounter && (counterStartsAt < 0 || !Number.isInteger(counterStartsAt))) {
      newErrors.counterStartsAt = "Counter must be a non-negative integer";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, titlePattern, folder, patternHasCounter, counterStartsAt]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!validate()) {
      return;
    }

    // Determine if we should save useTemplater setting
    // Only save it if:
    // 1. File template is set AND
    // 2. File template has Templater syntax AND
    // 3. Templater is available AND doesn't auto-process
    const shouldSaveUseTemplater =
      fileTemplate.trim() &&
      templaterStatus.hasTemplaterSyntax &&
      templaterStatus.templaterAvailable &&
      !templaterStatus.templaterAutoProcesses;

    const savedTemplate: TitleTemplate = {
      id: template?.id ?? generateId(),
      name: name.trim(),
      titlePattern: titlePattern.trim(),
      folder: folder.trim() || "current",
      fileTemplate: fileTemplate.trim() || undefined,
      useTemplater: shouldSaveUseTemplater ? useTemplater : undefined,
      counterStartsAt: patternHasCounter ? counterStartsAt : undefined,
    };

    onSave(savedTemplate);
  }, [template, name, titlePattern, folder, fileTemplate, useTemplater, templaterStatus, patternHasCounter, counterStartsAt, validate, onSave]);

  // Insert variable at cursor (or append)
  const insertVariable = useCallback((variable: string) => {
    setTitlePattern((prev) => `${prev}{{${variable}}}`);
  }, []);

  // Preview the generated title using user's Templates settings (with sanitization)
  const templatesSettings = getTemplatesSettings(app);
  const titlePreview = parseTitleTemplateToFilename(titlePattern || "{{date}}", templatesSettings);

  // Convert folders to SelectOption format
  const folderOptions: SelectOption[] = useMemo(() => {
    const options: SelectOption[] = [
      { value: "current", label: "Current Folder" },
      { value: "/", label: "/ (Vault Root)" },
    ];
    folders
      .filter((f) => f !== "")
      .forEach((f) => {
        options.push({ value: f, label: f });
      });
    return options;
  }, [folders]);

  // Convert template files to SelectOption format
  const fileTemplateOptions: SelectOption[] = useMemo(() => {
    const options: SelectOption[] = [{ value: "", label: "None" }];
    templateFiles
      .filter((f) => f !== "")
      .forEach((f) => {
        options.push({ value: f, label: f });
      });
    return options;
  }, [templateFiles]);

  const isEditing = !!template;

  return (
    <div className="file-template-editor">
      {/* Name field */}
      <div className="file-template-editor-field">
        <label className="file-template-editor-label" htmlFor="template-name">
          Template Name
        </label>
        <input
          id="template-name"
          type="text"
          className="file-template-editor-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Daily Note, Meeting Notes"
        />
        {errors.name && (
          <div className="file-template-editor-error">{errors.name}</div>
        )}
        <div className="file-template-editor-hint">
          This name appears in the command palette and template selection modal.
        </div>
      </div>

      {/* Title Pattern field */}
      <div className="file-template-editor-field">
        <label className="file-template-editor-label" htmlFor="template-pattern">
          Title Pattern
        </label>
        <input
          id="template-pattern"
          type="text"
          className="file-template-editor-input"
          value={titlePattern}
          onChange={(e) => setTitlePattern(e.target.value)}
          placeholder="e.g., {{date}}-{{time}}"
        />
        {errors.titlePattern && (
          <div className="file-template-editor-error">{errors.titlePattern}</div>
        )}
        <div className="file-template-editor-hint">
          Use variables to create dynamic filenames.
        </div>

        {/* Variable hints */}
        <div className="file-template-variable-hints">
          {SUPPORTED_VARIABLES.map((variable) => (
            <button
              key={variable}
              type="button"
              className="file-template-variable-hint"
              onClick={() => insertVariable(variable)}
              title={`Insert {{${variable}}}`}
            >
              {`{{${variable}}}`}
            </button>
          ))}
        </div>

        {/* Title preview */}
        {titlePattern && (
          <div className="file-template-editor-preview">
            Preview: {titlePreview}.md
          </div>
        )}
      </div>

      {/* Counter Starts At field - only shown when {{counter}} is used */}
      {patternHasCounter && (
        <div className="file-template-editor-field">
          <label className="file-template-editor-label" htmlFor="template-counter-starts-at">
            Counter Starts At
          </label>
          <input
            id="template-counter-starts-at"
            type="number"
            min="0"
            step="1"
            className="file-template-editor-input file-template-editor-input-number"
            value={counterStartsAt}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (!isNaN(value)) {
                setCounterStartsAt(value);
              }
            }}
          />
          {errors.counterStartsAt && (
            <div className="file-template-editor-error">{errors.counterStartsAt}</div>
          )}
          <div className="file-template-editor-hint">
            Initial value when no matching files exist in the target folder.
            The counter will increment from the highest existing value.
          </div>
        </div>
      )}

      {/* Folder field */}
      <div className="file-template-editor-field">
        <label className="file-template-editor-label" htmlFor="template-folder">
          Target Folder
        </label>
        <SearchableSelect
          id="template-folder"
          value={folder}
          options={folderOptions}
          placeholder="Search folders..."
          onChange={setFolder}
        />
        {errors.folder && (
          <div className="file-template-editor-error">{errors.folder}</div>
        )}
        <div className="file-template-editor-hint">
          "Current Folder" uses the folder of the currently active file.
        </div>
      </div>

      {/* File Template field */}
      <div className="file-template-editor-field">
        <label className="file-template-editor-label" htmlFor="template-file">
          File Template (Optional)
        </label>
        <SearchableSelect
          id="template-file"
          value={fileTemplate}
          options={fileTemplateOptions}
          placeholder="Search templates..."
          onChange={setFileTemplate}
        />
        <div className="file-template-editor-hint">
          Content from this file will be inserted into the new note.
        </div>
      </div>

      {/* Templater Integration Section */}
      {fileTemplate && templaterStatus.hasTemplaterSyntax && (
        <div className="file-template-editor-field">
          {/* Scenario A: Templater available, doesn't auto-process - show toggle */}
          {templaterStatus.templaterAvailable && !templaterStatus.templaterAutoProcesses && (
            <div className="file-template-templater-toggle">
              <label className="file-template-toggle-container">
                <input
                  type="checkbox"
                  checked={useTemplater}
                  onChange={(e) => setUseTemplater(e.target.checked)}
                />
                <span className="file-template-toggle-label">
                  Process template with Templater
                </span>
              </label>
              <div className="file-template-editor-hint">
                When enabled, Templater syntax in this template will be processed when creating new files.
              </div>
            </div>
          )}

          {/* Scenario B: Templater available, auto-processes - show info message */}
          {templaterStatus.templaterAvailable && templaterStatus.templaterAutoProcesses && (
            <div className="file-template-templater-info">
              <span className="file-template-templater-info-icon">ℹ️</span>
              <span>Automatically processed by Templater</span>
            </div>
          )}

          {/* Scenario C: Templater not available - show warning */}
          {!templaterStatus.templaterAvailable && (
            <div className="file-template-templater-warning">
              <span className="file-template-templater-warning-icon">⚠️</span>
              <span>
                This template contains Templater syntax, but the Templater plugin is not installed.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="file-template-editor-actions">
        <button type="button" className="mod-muted" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="mod-cta" onClick={handleSave}>
          {isEditing ? "Save Changes" : "Add Template"}
        </button>
      </div>
    </div>
  );
}
