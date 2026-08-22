export interface User {
  id: string;
  name: string;
  email: string | null;
  avatar: string;
  createdAt: string;
}

export interface Forum {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  threadCount: number;
  postCount: number;
}

export interface Thread {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; avatar: string };
  forum: { id: string; slug: string; name: string };
  replyCount: number;
  viewCount: number;
  lastReplyAt: string | null;
  lastReplyAuthor: string | null;
  /** Colored status indicator (posts.rating on the root post). Absent = Posted. */
  statusRating?: number;
}

// ── Thread status vocabulary (assembly.posts.rating) ────────────────
// Canonical mapping shared with assembly-srv routes/forums.js and the
// backfill script — keep all three in sync.
export type ThreadStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ThreadStatusMeta {
  value: ThreadStatus;
  label: string;
  /** Tailwind background class for bar / LED indicators. */
  color: string;
}

export const THREAD_STATUSES: Record<ThreadStatus, ThreadStatusMeta> = {
  0: { value: 0, label: 'Posted', color: 'bg-slate-300' },
  1: { value: 1, label: 'Specified', color: 'bg-blue-500' },
  2: { value: 2, label: 'Planned', color: 'bg-yellow-400' },
  3: { value: 3, label: 'Implemented', color: 'bg-orange-500' },
  4: { value: 4, label: 'Accepted', color: 'bg-green-500' },
  5: { value: 5, label: 'Rejected', color: 'bg-red-500' },
  6: { value: 6, label: 'Reopened', color: 'bg-purple-500' },
  7: { value: 7, label: 'Closed', color: 'bg-gray-500' },
};

export const THREAD_STATUS_LIST: ThreadStatusMeta[] = Object.values(THREAD_STATUSES);

export function statusMeta(value?: number | null): ThreadStatusMeta {
  return THREAD_STATUSES[(value ?? 0) as ThreadStatus] ?? THREAD_STATUSES[0];
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  threadId: string;
  author: { id: string; name: string; avatar: string };
}

export interface FeedPost {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  comments: number;
  author: { id: string; name: string; avatar: string };
  forum: { id: string; slug: string; name: string } | null;
}

export interface WorkRequest {
  id: string;
  title: string;
  description: string | null;
  sourceSpecificationId: string | null;
  sourceRequirementId: string | null;
  status: string;
  intent: string | null;
  context: Record<string, unknown> | null;
  constraints: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementQuestionCounts {
  total: number;
  openCount: number;
  blockingCount: number;
}

export interface Requirement {
  id: string;
  systemId: string | null;
  subsystemId: string | null;
  featureId: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  priority: string | null;
  reqType: string | null;
  acceptanceCriteria: Record<string, unknown> | null;
  parentId: string | null;
  candidateId: string | null;
  conduitPlanId: string | null;
  startDate: string | null;
  completionDate: string | null;
  createdAt: string;
  questionCounts: RequirementQuestionCounts;
}

export interface Agenda {
  id: string;
  title: string;
  scope: string | null;
  status: string;
  cohesionScore: number | null;
  sourceCount: number | null;
  plannerAnalysis: string | null;
  plannerConflicts: Record<string, unknown> | null;
  plannerGaps: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  harvestId: string;
  title: string;
  intentDescription: string | null;
  implementationNotes: Record<string, unknown>;
  codeSnippets: Record<string, unknown>;
  openQuestions: Record<string, unknown>;
  tags: string[];
  status: string | null;
  systemId: string | null;
  subsystemId: string | null;
  featureId: string | null;
  workRequestId: string | null;
  completed: boolean;
  compilationReadiness: number | null;
  createdAt: string;
  updatedAt: string;
  harvestSourceFilename: string | null;
}

export interface Harvest {
  id: string;
  sourcePath: string | null;
  sourceFilename: string | null;
  model: string | null;
  totalCandidates: number | null;
  candidates: Record<string, unknown> | null;
  sourceText: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  level: number | null;
  visibilityScope: string | null;
  docklang: Record<string, unknown> | null;
  sourceHash: string | null;
  fileSize: number | null;
  version: number | null;
  runMetadata: Record<string, unknown> | null;
}

export interface OpenQuestionAnswer {
  id: string;
  questionId: string;
  role: string;
  answer: string;
  confidence: string;
  reasoning: string | null;
  answeredAt: string;
}

export interface OpenQuestion {
  id: string;
  requirementId: string | null;
  candidateId: string | null;
  title: string;
  description: string | null;
  category: string;
  status: string;
  blocking: boolean;
  createdBy: string | null;
  createdAt: string;
  entityType?: string | null;
  entityId?: string | null;
  entityTitle?: string | null;
  answerCount?: number;
  roleCount?: number;
  answeredBy?: string | null;
  answeredAt?: string | null;
}

export interface TimelineEvent {
  type: 'created' | 'resolved' | 'status_change' | 'note';
  label: string;
  description: string | null;
  timestamp: string;
  actor: string | null;
  icon: 'Circle' | 'CheckCircle2' | 'RefreshCw' | 'FileText';
}


export interface Assessment {
  id: string;
  observationId: string;
  outcome: string;
  confidence: number | null;
  impactScope: Record<string, unknown> | null;
  openQuestions: Record<string, unknown> | null;
  agendaId: string | null;
  autoResolvePlanId: string | null;
  forumPostId: string | null;
  analysisDetail: string | null;
  createdAt: string;
}

export interface Observation {
  id: string;
  triggerType: string;
  sourceArtifactType: string | null;
  sourceArtifactId: string | null;
  payload: Record<string, unknown> | null;
  assessed: boolean;
  createdAt: string;
}

export interface AgentRecord {
  id: string;
  recordType: string | null;
  role: string | null;
  title: string | null;
  content: string | null;
  sourcePath: string | null;
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  systemId: string | null;
  subsystemId: string | null;
  featureId: string | null;
  planRef: string | null;
  level: number | null;
  visibilityScope: string | null;
  createdAt: string;
}

export interface Specification {
  id: string;
  agendaId: string;
  revisionNumber: number;
  revisionType: string;
  supersededBy: string | null;
  derivedFrom: string[] | null;
  itemSnapshot: Record<string, unknown> | null;
  changeSummary: string | null;
  validFrom: string;
  validUntil: string;
  createdAt: string;
}

export interface Plan {
  id: string;
  fileName: string;
  title: string;
  project: string;
  goal: string;
  content: string;
  filesAffected: string;
  acceptanceCriteria: string;
  dependencies: string;
  promptRef: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpecItem {
  id: string;
  agendaId: string;
  sourceType: string | null;
  sourceId: string | null;
  title: string;
  body: string | null;
  decisions: Record<string, unknown> | null;
  openQuestions: Record<string, unknown> | null;
  supportingRefs: Record<string, unknown> | null;
  included: boolean | null;
  plannerNote: string | null;
  agendaTitle: string | null;
  agendaStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Counts {
  forums: number;
  posts: number;
  threads: number;
  toDoThreads: number;
  comments: number;
  workRequests: number;
  requirements: number;
  agendas: number;
  candidates: number;
  harvests: number;
  openQuestions: number;
  assessments: number;
  observations: number;
  agentRecords: number;
  specifications: number;
  plans: number;
}

export interface SearchResult {
  type: string;
  id: string;
  title: string | null;
  description: string;
  href: string;
  status?: string | null;
  role?: string | null;
  recordType?: string | null;
}
