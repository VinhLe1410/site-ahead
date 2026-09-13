## ADDED Requirements

### Requirement: On-demand checklist notes

Checklist items SHALL appear as compact rows with their existing completion checkbox, title, kind, and a speech-bubble note button. The row and note presentation are explicit user requirements to reduce clutter while keeping saved observations visible. The note button SHALL have an accessible name distinguishing adding from editing a note. Activating it SHALL open an inline editor for that item's existing note. Saving or clearing a note SHALL persist independently of completion; cancelling SHALL discard the edit without changing saved data. Saved notes SHALL show a short preview beneath their item. Opening the editor SHALL expose the full note. Items without notes SHALL show no empty note message or editor until requested.

#### Scenario: Add a note

- **WHEN** a member opens an empty item's note editor, enters a note, and saves
- **THEN** the editor closes and the saved note appears beneath that item without changing completion or job status

#### Scenario: Edit or clear a saved note

- **WHEN** a member opens an existing note, edits or clears it, and saves
- **THEN** the saved content appears after reopening the job and an empty saved note removes the preview

#### Scenario: Cancel an edit

- **WHEN** a member changes a note and cancels
- **THEN** the editor closes and the original saved note remains visible and is restored when editing resumes

#### Scenario: Retry a failed save

- **WHEN** saving a note fails
- **THEN** the editor retains the draft, displays an error, and allows another save
