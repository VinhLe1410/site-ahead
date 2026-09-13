## Purpose

Let organization members share reusable guidance and blank forms, preserve file versions used by jobs, and download documents while their membership permits access.

## ADDED Requirements

### Requirement: Shared document management

Every active organization member SHALL be able to list, create, read, and update library documents in their organization, regardless of uploader. Each document SHALL have a nonblank title, a description that may be empty, and a current file version. Members SHALL be able to identify the current version, filename, format, size, uploader, and upload date. Saved documents SHALL remain available after reload. Empty, loading, missing-document, and failed-request states SHALL be distinguishable, and failed requests SHALL be retryable.

#### Scenario: Staff upload a reusable form

- **WHEN** staff upload a valid blank form with a title
- **THEN** the document appears in their organization's library and other members can open its details

#### Scenario: Edit another member's document details

- **WHEN** a member changes the title or description of an active document uploaded by another member
- **THEN** the updated details remain visible to the organization after reload and the saved file contents remain unchanged

#### Scenario: Start an empty library

- **WHEN** a member opens a library with no documents
- **THEN** they see an empty state and can upload the first document

### Requirement: Accepted file uploads

The library SHALL accept PDF and Word files with `.pdf`, `.doc`, or `.docx` filenames, up to 10 MB per file. Empty files, unsupported file types, oversized files, and blank titles SHALL be rejected with an actionable error. A document or replacement SHALL become available only after both its file and details have been saved successfully. A failed upload SHALL preserve any previous version and allow the member to retry.

#### Scenario: Upload supported files

- **WHEN** a member uploads a nonempty PDF, DOC, or DOCX file within the size limit with a valid title
- **THEN** its original contents are saved and available for download

#### Scenario: Reject an unsupported or oversized file

- **WHEN** a member selects an image, an empty file, or a file larger than 10 MB
- **THEN** the upload is rejected with the reason and no usable library entry or replacement is published

#### Scenario: Replacement fails

- **WHEN** an upload fails while replacing an existing document
- **THEN** the previous version remains current and the member can retry the replacement

### Requirement: Preserve document versions

Replacing an active library document SHALL create a new file version under the same document. References in checklist templates SHALL continue to use that document. Jobs created afterward SHALL receive its current version. Existing jobs SHALL retain their assigned file versions and SHALL NOT switch versions after a replacement. Each assigned version SHALL remain identifiable and downloadable. Editing a document's title or description SHALL NOT replace its file contents.

#### Scenario: Jobs use different versions of one form

- **WHEN** Job A is created using version 1 of a form, a member replaces the form, and Job B is created from the same template
- **THEN** Job A downloads version 1 and Job B downloads version 2
- **AND** the template continues to reference the same document

#### Scenario: Update a document description

- **WHEN** a member edits a document description without uploading a replacement
- **THEN** the current file version and existing job attachments remain unchanged

### Requirement: Search document titles and descriptions

Members SHALL be able to browse active library documents and search their titles and descriptions. Search SHALL include only active documents from the member's organization and SHALL distinguish no matches from a failed request. Clearing the search SHALL restore the active library listing. File contents SHALL NOT be extracted, indexed, or searched in this version.

#### Scenario: Find a form by its description

- **WHEN** a member searches for words present in an active document's description
- **THEN** that document can appear among the matching results even if its title does not contain those words

#### Scenario: Search has no results

- **WHEN** no active organization document matches the search
- **THEN** the member sees a no-results state and can change or clear the search

#### Scenario: Keep file contents outside search

- **WHEN** a word appears only inside a file and not in its title or description
- **THEN** that word alone does not make the document match the search

### Requirement: Membership-protected downloads

Members SHALL download the current file from an active library document and the assigned file version from a job checklist item. The system SHALL check current membership and the document's organization on every download request. Signed-out callers, removed members, and members of another organization SHALL receive no document contents or file bytes. Knowing a document or version reference SHALL NOT grant access. The app SHALL provide downloads without an embedded preview or editor. Removing a member SHALL preserve the organization's documents and versions. Previously downloaded copies cannot be retracted.

#### Scenario: Download a checklist document

- **WHEN** a member downloads a file from a job's checklist item
- **THEN** they receive the original file contents and filename for the version assigned to that item
- **AND** the download does not change checklist or job status

#### Scenario: Reuse a download request after removal

- **WHEN** removed staff repeat a previously successful document download request while still signed into Google
- **THEN** the request is rejected without returning file bytes

#### Scenario: Attempt access from another organization

- **WHEN** a caller from another organization lists, searches, reads, edits, replaces, archives, or downloads a library document by reference
- **THEN** no private contents are returned and the document remains unchanged

#### Scenario: Download fails

- **WHEN** a requested file cannot be downloaded
- **THEN** the member sees a useful error and can retry without changing the document or checklist item

### Requirement: Archive documents without losing job references

Any organization member SHALL be able to archive an active document after confirmation. Archiving SHALL remove it from the active library listing, search results, and new document selections. Existing template references SHALL remain visible as archived until a member removes or replaces them. Existing jobs SHALL retain their assigned versions and download access while organization membership permits it. Archiving SHALL NOT delete stored versions or change job or checklist progress. Archived documents SHALL remain readable through existing references and SHALL accept no file replacements or metadata edits in this version.

#### Scenario: Archive a document already used by a job

- **WHEN** a member confirms archiving a document referenced by Job A
- **THEN** new selections and active search results exclude the document
- **AND** Job A can still download its assigned version

#### Scenario: Cancel archiving

- **WHEN** a member cancels the archive confirmation
- **THEN** the document remains active and all references remain unchanged

#### Scenario: Template retains an archived reference

- **WHEN** a member opens a category template after one of its referenced documents is archived
- **THEN** the affected checklist item identifies the archived document and allows its reference to be removed or replaced

#### Scenario: Preserve documents after deleting a job

- **WHEN** a member deletes a job that references library document versions
- **THEN** the library documents and versions remain available to other authorized references
