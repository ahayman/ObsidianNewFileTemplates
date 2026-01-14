/**
 * Template List Component
 *
 * Displays a list of configured templates with edit/delete actions.
 */

import { useState, useCallback } from "react";
import { TitleTemplate } from "../types";
import { TemplateEditor } from "./TemplateEditor";
import { parseTitleTemplate, getTemplatesSettings } from "../utils";
import { useApp } from "./AppContext";

interface TemplateListProps {
  /** List of templates to display */
  templates: TitleTemplate[];
  /** Folder to look for file templates */
  templateFolder: string;
  /** Called when templates are updated */
  onUpdate: (templates: TitleTemplate[]) => void;
}

export function TemplateList({ templates, templateFolder, onUpdate }: TemplateListProps) {
  // Track which template is being edited (by id), or "new" for adding
  const [editingId, setEditingId] = useState<string | null>(null);

  // Handle saving a template (new or edited)
  const handleSave = useCallback(
    (template: TitleTemplate) => {
      if (editingId === "new") {
        // Adding new template
        onUpdate([...templates, template]);
      } else {
        // Editing existing template
        onUpdate(
          templates.map((t) => (t.id === template.id ? template : t))
        );
      }
      setEditingId(null);
    },
    [editingId, templates, onUpdate]
  );

  // Handle deleting a template
  const handleDelete = useCallback(
    (id: string) => {
      // Confirm deletion
      if (confirm("Are you sure you want to delete this template?")) {
        onUpdate(templates.filter((t) => t.id !== id));
      }
    },
    [templates, onUpdate]
  );

  // Handle cancel editing
  const handleCancel = useCallback(() => {
    setEditingId(null);
  }, []);

  // Get template being edited
  const editingTemplate = editingId && editingId !== "new"
    ? templates.find((t) => t.id === editingId)
    : undefined;

  return (
    <div className="file-template-list">
      {/* Editor for new/editing template */}
      {editingId && (
        <TemplateEditor
          template={editingTemplate}
          templateFolder={templateFolder}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {/* List of existing templates */}
      {!editingId && templates.length === 0 && (
        <div className="file-template-empty-list">
          <p>No templates configured yet.</p>
          <p className="file-template-empty-hint">
            Click "Add Template" to create your first template.
          </p>
        </div>
      )}

      {!editingId &&
        templates.map((template) => (
          <TemplateListItem
            key={template.id}
            template={template}
            onEdit={() => setEditingId(template.id)}
            onDelete={() => handleDelete(template.id)}
          />
        ))}

      {/* Add template button */}
      {!editingId && (
        <button
          type="button"
          className="mod-cta file-template-add-button"
          onClick={() => setEditingId("new")}
        >
          Add Template
        </button>
      )}
    </div>
  );
}

/**
 * Individual template list item
 */
interface TemplateListItemProps {
  template: TitleTemplate;
  onEdit: () => void;
  onDelete: () => void;
}

function TemplateListItem({ template, onEdit, onDelete }: TemplateListItemProps) {
  const app = useApp();
  const templatesSettings = getTemplatesSettings(app);
  const preview = parseTitleTemplate(template.titlePattern, templatesSettings);
  const folderDisplay =
    template.folder === "current" ? "Current folder" : template.folder || "/";

  return (
    <div className="file-template-list-item">
      <div className="file-template-list-item-info">
        <div className="file-template-list-item-name">{template.name}</div>
        <div className="file-template-list-item-details">
          <span className="file-template-list-item-folder">
            {folderDisplay}
          </span>
          {template.fileTemplate && (
            <span className="file-template-list-item-file-template">
              {" · "}
              {getFileName(template.fileTemplate)}
            </span>
          )}
        </div>
        <div className="file-template-list-item-preview">
          Preview: {preview}.md
        </div>
      </div>
      <div className="file-template-list-item-actions">
        <button
          type="button"
          className="clickable-icon"
          onClick={onEdit}
          aria-label="Edit template"
          title="Edit"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          type="button"
          className="clickable-icon"
          onClick={onDelete}
          aria-label="Delete template"
          title="Delete"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Extracts filename from a path
 */
function getFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1].replace(/\.md$/, "");
}
