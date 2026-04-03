interface StoryboardEditorHeaderProps {
  title: string;
  updatedAt: string;
  disabled: boolean;
  canDelete: boolean;
  formatTimestamp: (iso: string) => string;
  onBack: () => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
  onTitleChange: (value: string) => void;
}

export default function StoryboardEditorHeader({
  title,
  updatedAt,
  disabled,
  canDelete,
  formatTimestamp,
  onBack,
  onDuplicate,
  onRequestDelete,
  onTitleChange,
}: StoryboardEditorHeaderProps) {
  return (
    <div className="storyboardEditorCardHeader" aria-label="Storyboard manager">
      <div className="storyboardEditorHeaderTop">
        <button
          type="button"
          className="btnGhost storyboardBackButton"
          onClick={onBack}
          disabled={disabled}
        >
          ← Storyboards
        </button>
        <div className="badge" title="Saved locally in this browser">
          <span>Saved locally</span>
          <code>{formatTimestamp(updatedAt)}</code>
        </div>
      </div>

      <div className="storyboardEditorHeaderMain">
        <div className="storyboardEditorHeaderName">
          <div className="sectionTitle" style={{ margin: "0 0 6px" }}>Storyboard name</div>
          <input
            className="control"
            value={title}
            onChange={(e) => onTitleChange(e.target.value.trim())}
            disabled={disabled}
          />
        </div>
        <div className="storyboardEditorHeaderActions">
          <button type="button" className="btnSecondary" onClick={onDuplicate} disabled={disabled}>
            Duplicate
          </button>
          <button
            type="button"
            className="btnDanger"
            onClick={onRequestDelete}
            disabled={disabled || !canDelete}
          >
            Delete
          </button>
        </div>
      </div>

      {!canDelete && (
        <div className="muted" style={{ marginTop: -2 }}>Keep at least one storyboard.</div>
      )}
    </div>
  );
}
