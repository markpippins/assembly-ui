/**
 * ID formatting utilities for assembly-ui.
 *
 * Raw UUIDs are verbose and unreadable. These helpers produce short,
 * human-friendly labels while preserving the full ID in the link href.
 *
 * - `shortId` — first 8 chars + ellipsis for display badges
 * - `idBadge` — `#xxxxxxxx…` format for list rows
 * - `entityLabel` — looks up a human-readable title/name for a cross-ref ID
 */

import { dataService } from '../services/dataService';

/** Truncate a UUID to the first 8 chars with an ellipsis. */
export function shortId(id: string | null | undefined): string {
  if (!id) return '—';
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

/** Format an ID as a `#xxxxxxxx…` badge label. */
export function idBadge(id: string | null | undefined): string {
  if (!id) return '—';
  return `#${shortId(id)}`;
}

/**
 * Look up a human-readable label for a cross-referenced entity ID.
 * Returns the entity's title/name if found, otherwise falls back to shortId.
 */
export function entityLabel(
  id: string | null | undefined,
  type?: string
): string {
  if (!id) return '—';

  // Try lookup by type first, then try all common types
  if (type) {
    const label = lookupByType(id, type);
    if (label) return label;
  }

  // Fallback: try all entity types (expensive but the dataService is cached)
  const label = tryAllLookups(id);
  if (label) return label;

  return shortId(id);
}

function lookupByType(id: string, type: string): string | null {
  const t = type.toLowerCase().replace(/-/g, '_');
  switch (t) {
    case 'work_request':
    case 'workrequest':
      return dataService.getWorkRequest(id)?.title ?? null;
    case 'requirement':
      return dataService.getRequirement(id)?.title ?? null;
    case 'agenda':
      return dataService.getAgenda(id)?.title ?? null;
    case 'candidate':
      return dataService.getCandidate(id)?.title ?? null;
    case 'harvest':
      return dataService.getHarvest(id)?.sourceFilename ?? null;
    case 'assessment':
      return dataService.getAssessment(id)?.id ? `Assessment ${shortId(id)}` : null;
    case 'observation':
      return dataService.getObservation(id)?.triggerType
        ? `Observation: ${dataService.getObservation(id)!.triggerType}`
        : null;
    case 'agent_record':
    case 'agent':
      return dataService.getAgentRecord(id)?.title ?? null;
    case 'specification':
      return dataService.getSpecification(id)
        ? `Specification r${dataService.getSpecification(id)!.revisionNumber}`
        : null;
    case 'plan':
      return dataService.getPlan(id)?.title ?? null;
    case 'open_question':
    case 'openquestion':
      return dataService.getOpenQuestion(id)?.title ?? null;
    case 'spec':
    case 'spec_item':
      return dataService.getSpecItem(id)?.title ?? null;
    case 'user':
      return dataService.getUser(id)?.name ?? null;
    case 'forum':
    case 'thread':
      return null; // forums use slugs, not ID lookups
    default:
      return null;
  }
}

function tryAllLookups(id: string): string | null {
  // Try the most common types
  return (
    dataService.getWorkRequest(id)?.title ??
    dataService.getRequirement(id)?.title ??
    dataService.getAgenda(id)?.title ??
    dataService.getCandidate(id)?.title ??
    dataService.getAgentRecord(id)?.title ??
    dataService.getPlan(id)?.title ??
    dataService.getOpenQuestion(id)?.title ??
    dataService.getSpecItem(id)?.title ??
    null
  );
}
