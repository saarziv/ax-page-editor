export const CORE_VERSION = '0.0.0';
export { clean } from './clean/index.js';
export { markModificationsInTree, type Marked } from './markModificationsInTree.js';
export { matchesTarget, resolve, targetFor, targetSnippet } from './target.js';
export { findNodePath, isContainerKind, nodeText } from './tree.js';
export { InvalidUrlError, normalizeUrl } from './url.js';
export { CONTEXT_NOTE_MAX_LENGTH, fetchErrorCodeSchema, modificationSchema, modificationStatusSchema, nodeKindSchema, pageNodeSchema, pageTreeSchema, targetSchema } from './schemas.js';
export type { FetchErrorCode, Modification, ModificationStatus, PageNode, PageTree, Target } from './schemas.js';
