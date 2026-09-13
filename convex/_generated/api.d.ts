/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as agentContracts from "../agentContracts.js";
import type * as agents_checklist_automatedChecks from "../agents/checklist/automatedChecks.js";
import type * as agents_checklist_itemClassification from "../agents/checklist/itemClassification.js";
import type * as agents_checklist_itemResolutionClassifier from "../agents/checklist/itemResolutionClassifier.js";
import type * as agents_checklist_itemWorker from "../agents/checklist/itemWorker.js";
import type * as agents_checklist_liveEvidence from "../agents/checklist/liveEvidence.js";
import type * as agents_checklist_processChecklist from "../agents/checklist/processChecklist.js";
import type * as agents_checklist_verification from "../agents/checklist/verification.js";
import type * as agents_requests_buildingPermitPdf from "../agents/requests/buildingPermitPdf.js";
import type * as agents_requests_buildingPermitSkill from "../agents/requests/buildingPermitSkill.js";
import type * as agents_requests_occupancyPermitDocx from "../agents/requests/occupancyPermitDocx.js";
import type * as agents_requests_occupancyPermitSkill from "../agents/requests/occupancyPermitSkill.js";
import type * as agents_requests_requestProfile from "../agents/requests/requestProfile.js";
import type * as agents_requests_requestSkills from "../agents/requests/requestSkills.js";
import type * as agents_requests_requestWorker from "../agents/requests/requestWorker.js";
import type * as agents_requests_verification from "../agents/requests/verification.js";
import type * as agents_shared_agentLogging from "../agents/shared/agentLogging.js";
import type * as agents_shared_observability from "../agents/shared/observability.js";
import type * as agents_shared_observabilitySmokeTest from "../agents/shared/observabilitySmokeTest.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as checklistClassification from "../checklistClassification.js";
import type * as checklistExecution from "../checklistExecution.js";
import type * as checklistItems from "../checklistItems.js";
import type * as contracts from "../contracts.js";
import type * as documentData from "../documentData.js";
import type * as documentFiles from "../documentFiles.js";
import type * as documents from "../documents.js";
import type * as evidenceContracts from "../evidenceContracts.js";
import type * as http from "../http.js";
import type * as intake from "../intake.js";
import type * as invitationActions from "../invitationActions.js";
import type * as invitations from "../invitations.js";
import type * as itemAgentData from "../itemAgentData.js";
import type * as jobAgentContext from "../jobAgentContext.js";
import type * as jobPreparation from "../jobPreparation.js";
import type * as jobPreparationContext from "../jobPreparationContext.js";
import type * as jobs from "../jobs.js";
import type * as organizations from "../organizations.js";
import type * as preparationContracts from "../preparationContracts.js";
import type * as requestDocuments from "../requestDocuments.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  agentContracts: typeof agentContracts;
  "agents/checklist/automatedChecks": typeof agents_checklist_automatedChecks;
  "agents/checklist/itemClassification": typeof agents_checklist_itemClassification;
  "agents/checklist/itemResolutionClassifier": typeof agents_checklist_itemResolutionClassifier;
  "agents/checklist/itemWorker": typeof agents_checklist_itemWorker;
  "agents/checklist/liveEvidence": typeof agents_checklist_liveEvidence;
  "agents/checklist/processChecklist": typeof agents_checklist_processChecklist;
  "agents/checklist/verification": typeof agents_checklist_verification;
  "agents/requests/buildingPermitPdf": typeof agents_requests_buildingPermitPdf;
  "agents/requests/buildingPermitSkill": typeof agents_requests_buildingPermitSkill;
  "agents/requests/occupancyPermitDocx": typeof agents_requests_occupancyPermitDocx;
  "agents/requests/occupancyPermitSkill": typeof agents_requests_occupancyPermitSkill;
  "agents/requests/requestProfile": typeof agents_requests_requestProfile;
  "agents/requests/requestSkills": typeof agents_requests_requestSkills;
  "agents/requests/requestWorker": typeof agents_requests_requestWorker;
  "agents/requests/verification": typeof agents_requests_verification;
  "agents/shared/agentLogging": typeof agents_shared_agentLogging;
  "agents/shared/observability": typeof agents_shared_observability;
  "agents/shared/observabilitySmokeTest": typeof agents_shared_observabilitySmokeTest;
  auth: typeof auth;
  categories: typeof categories;
  checklistClassification: typeof checklistClassification;
  checklistExecution: typeof checklistExecution;
  checklistItems: typeof checklistItems;
  contracts: typeof contracts;
  documentData: typeof documentData;
  documentFiles: typeof documentFiles;
  documents: typeof documents;
  evidenceContracts: typeof evidenceContracts;
  http: typeof http;
  intake: typeof intake;
  invitationActions: typeof invitationActions;
  invitations: typeof invitations;
  itemAgentData: typeof itemAgentData;
  jobAgentContext: typeof jobAgentContext;
  jobPreparation: typeof jobPreparation;
  jobPreparationContext: typeof jobPreparationContext;
  jobs: typeof jobs;
  organizations: typeof organizations;
  preparationContracts: typeof preparationContracts;
  requestDocuments: typeof requestDocuments;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
