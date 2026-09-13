## Why

Organization members need one place for reusable guidance and blank forms. Attaching these documents to checklist template items will give each new job the relevant files without members finding and copying them again.

## What Changes

- Add a shared Library where every organization member can upload, describe, download, replace, and archive PDF and Word documents.
- Search document titles and descriptions. Open files through downloads.
- Attach library documents to individual checklist template items. New jobs inherit the current file versions; existing jobs retain the versions assigned at creation.
- Preserve archived documents on existing jobs. Hide them from new selections and block job creation until members remove or replace archived template references.
- Apply current organization membership checks to library records and every download.
- Exclude completed job forms and evidence, previews, in-app editing or form filling, document text extraction, and AI retrieval.

Proposed defaults: accept `.pdf`, `.doc`, and `.docx`; limit each file to 10 MB and each template item to 10 distinct documents; require a title and allow an optional description. These limits keep the first implementation bounded.

## Capabilities

### New Capabilities

- `document-library`: Organization documents, file versions, title and description search, protected downloads, and archiving.

### Modified Capabilities

- `category-management`: Document references on individual template items and preservation of existing jobs when references change.
- `job-management`: Resolve current document versions at creation, reject archived references, and download the versions assigned to each item.
- `app-access`: Shared Library navigation and membership-protected library screens.

## Impact

Changes affect the Convex schema, contracts, HTTP routes, membership helpers, category and job operations, React routes, navigation, and related pages. Use the existing Convex storage and authentication packages. No AI dependency or separate storage service is needed.

The organization tenancy change is merged and archived. This proposal extends its shared access rules and the current manual checklist flow. The demonstrable outcome is uploading a form, attaching it to a template item, creating jobs before and after replacement, and downloading the correct version from each job.
