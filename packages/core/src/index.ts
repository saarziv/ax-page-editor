export const CORE_VERSION = '0.0.0';
export { clean } from './clean/index.js';
export { markModificationsInTree, type Marked } from './markModificationsInTree.js';
export { renderMarkdown } from './renderMarkdown.js';
export { matchesTarget, resolve, targetFor, targetSnippet } from './target.js';
export { findNodePath, isContainerKind, nodeText } from './tree.js';
export { InvalidUrlError, normalizeUrl } from './url.js';
export { CONTEXT_NOTE_MAX_LENGTH, configSchema, fetchErrorCodeSchema, modificationSchema, modificationStatusSchema, nodeKindSchema, pageNodeSchema, pageTreeSchema, saveConfigRequestSchema, savedPageSummarySchema, targetSchema } from './schemas.js';
export type { Config, FetchErrorCode, Modification, ModificationStatus, PageNode, PageTree, SaveConfigRequest, SavedPageSummary, Target } from './schemas.js';
