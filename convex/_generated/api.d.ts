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
import type * as agents_checklist_categoryDb from "../agents/checklist/categoryDb.js";
import type * as agents_checklist_classifier from "../agents/checklist/classifier.js";
import type * as agents_shared__observabilitySmokeTest from "../agents/shared/_observabilitySmokeTest.js";
import type * as agents_shared_observability from "../agents/shared/observability.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as checklistItems from "../checklistItems.js";
import type * as contracts from "../contracts.js";
import type * as documentData from "../documentData.js";
import type * as documentFiles from "../documentFiles.js";
import type * as documents from "../documents.js";
import type * as http from "../http.js";
import type * as intake from "../intake.js";
import type * as invitationActions from "../invitationActions.js";
import type * as invitations from "../invitations.js";
import type * as jobs from "../jobs.js";
import type * as organizations from "../organizations.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  "agents/checklist/categoryDb": typeof agents_checklist_categoryDb;
  "agents/checklist/classifier": typeof agents_checklist_classifier;
  "agents/shared/_observabilitySmokeTest": typeof agents_shared__observabilitySmokeTest;
  "agents/shared/observability": typeof agents_shared_observability;
  auth: typeof auth;
  categories: typeof categories;
  checklistItems: typeof checklistItems;
  contracts: typeof contracts;
  documentData: typeof documentData;
  documentFiles: typeof documentFiles;
  documents: typeof documents;
  http: typeof http;
  intake: typeof intake;
  invitationActions: typeof invitationActions;
  invitations: typeof invitations;
  jobs: typeof jobs;
  organizations: typeof organizations;
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
