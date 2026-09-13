# Job Checklist Research & Intake Schema

This document summarizes the core checklist research for Victorian residential trade verticals (Electrical, Excavation & Trenching) and codifies the ultra-lean intake schema.

## Minimal Intake Schema

Per team requirements, the intake extraction schema is strictly focused on the three fundamental attributes needed to create and configure a job:

| Field | Type | Description | Target Model Mapping |
| --- | --- | --- | --- |
| `jobType` | `"carpentry" \| "electrical" \| "other"` | Primary trade classification | `categories` / `jobs.categoryId` |
| `location` | `string` | Single cleaned site address | `inputs.addressText` / `jobs.addressText` |
| `description` | `string` | Clear description of work to be performed | `inputs.processedText` |

## Alignment with Core Mechanism

Site Ahead's core mechanism requires only:

1. **An address / location** (to run automated checks like BYDA and council permits)
2. **A job type / category** (to instantiate the job-specific checklist template)
3. **A description** (to record the client scope of work on the job)

Any prose or greetings can be dynamically formatted in the UI or client message composer using these three fields, without storing or querying redundant text payloads in the backend schema.
