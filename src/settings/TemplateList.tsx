/**
 * Template List Component
 *
 * Displays a list of configured templates with edit/delete actions.
 * Supports drag and drop reordering.
 */

import { useState, useCallback, useRef } from "react";
import { TitleTemplate } from "../types";
import { TemplateEditor } from "./TemplateEditor";
import { parseTitleTemplateToFilename, getTemplatesSettings } from "../utils";
import { useApp } from "./AppContext";

interface TemplateListProps {
  /** List of templates to display */
  templates: TitleTemplate[];
  /** Folder to look for file templates */
  templateFolder: string;
  /** Called when templates are updated */
  onUpdate: (templates: TitleTemplate[]) => void;
  /** Whether to enable bracket auto-closure (default: true) */
  autoBracketClosure?: boolean;
}

/**
 * Reorders an array by moving an item from one index to another
 */
function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

export function TemplateList({ templates, templateFolder, onUpdate, autoBracketClosure = true }: TemplateListProps) {
  // Track which template is being edited (by id), or "new" for adding
  const [editingId, setEditingId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"above" | "below" | null>(null);

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

  // Move a template up in the list
  const handleMoveUp = useCallback(
    (id: string) => {
      const index = templates.findIndex((t) => t.id === id);
      if (index > 0) {
        onUpdate(reorderArray(templates, index, index - 1));
      }
    },
    [templates, onUpdate]
  );

  // Move a template down in the list
  const handleMoveDown = useCallback(
    (id: string) => {
      const index = templates.findIndex((t) => t.id === id);
      if (index < templates.length - 1) {
        onUpdate(reorderArray(templates, index, index + 1));
      }
    },
    [templates, onUpdate]
  );

  // Drag start handler
  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  // Drag over handler - determines drop position
  const handleDragOver = useCallback(
    (id: string, event: React.DragEvent) => {
      event.preventDefault();
      if (draggedId === id) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const position = event.clientY < midpoint ? "above" : "below";

      setDragOverId(id);
      setDragOverPosition(position);
    },
    [draggedId]
  );

  // Drag leave handler
  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
    setDragOverPosition(null);
  }, []);

  // Drop handler - reorders templates
  const handleDrop = useCallback(
    (targetId: string) => {
      if (!draggedId || draggedId === targetId) {
        setDraggedId(null);
        setDragOverId(null);
        setDragOverPosition(null);
        return;
      }

      const fromIndex = templates.findIndex((t) => t.id === draggedId);
      let toIndex = templates.findIndex((t) => t.id === targetId);

      if (fromIndex === -1 || toIndex === -1) return;

      // Adjust target index based on drop position
      if (dragOverPosition === "below") {
        toIndex = toIndex + 1;
      }

      // Adjust for the removal of the dragged item
      if (fromIndex < toIndex) {
        toIndex = toIndex - 1;
      }

      onUpdate(reorderArray(templates, fromIndex, toIndex));

      setDraggedId(null);
      setDragOverId(null);
      setDragOverPosition(null);
    },
    [draggedId, dragOverPosition, templates, onUpdate]
  );

  // Drag end handler - cleanup
  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
    setDragOverPosition(null);
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
          autoBracketClosure={autoBracketClosure}
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
        templates.map((template, index) => (
          <TemplateListItem
            key={template.id}
            template={template}
            isFirst={index === 0}
            isLast={index === templates.length - 1}
            isDragging={draggedId === template.id}
            dragOverPosition={dragOverId === template.id ? dragOverPosition : null}
            onEdit={() => setEditingId(template.id)}
            onDelete={() => handleDelete(template.id)}
            onMoveUp={() => handleMoveUp(template.id)}
            onMoveDown={() => handleMoveDown(template.id)}
            onDragStart={() => handleDragStart(template.id)}
            onDragOver={(e) => handleDragOver(template.id, e)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(template.id)}
            onDragEnd={handleDragEnd}
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
 * Individual template list item with drag and drop support
 */
interface TemplateListItemProps {
  template: TitleTemplate;
  isFirst: boolean;
  isLast: boolean;
  isDragging: boolean;
  dragOverPosition: "above" | "below" | null;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function TemplateListItem({
  template,
  isFirst,
  isLast,
  isDragging,
  dragOverPosition,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: TemplateListItemProps) {
  const app = useApp();
  const templatesSettings = getTemplatesSettings(app);
  const preview = parseTitleTemplateToFilename(template.titlePattern, templatesSettings);
  const folderDisplay =
    template.folder === "current" ? "Current folder" : template.folder || "/";

  // Build class name based on drag state
  const classNames = ["file-template-list-item"];
  if (isDragging) classNames.push("is-dragging");
  if (dragOverPosition === "above") classNames.push("drag-over-above");
  if (dragOverPosition === "below") classNames.push("drag-over-below");

  return (
    <div
      className={classNames.join(" ")}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Drag handle */}
      <div
        className="file-template-drag-handle"
        title="Drag to reorder"
        aria-label="Drag to reorder"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="9" cy="5" r="2" />
          <circle cx="9" cy="12" r="2" />
          <circle cx="9" cy="19" r="2" />
          <circle cx="15" cy="5" r="2" />
          <circle cx="15" cy="12" r="2" />
          <circle cx="15" cy="19" r="2" />
        </svg>
      </div>

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

      {/* Move up/down buttons */}
      <div className="file-template-move-buttons">
        <button
          type="button"
          className="clickable-icon"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label="Move up"
          title="Move up"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <button
          type="button"
          className="clickable-icon"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label="Move down"
          title="Move down"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
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
