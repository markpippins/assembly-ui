import {
  User, Forum, Thread, Comment, FeedPost, WorkRequest, Requirement, Agenda, Candidate,
  Harvest, ConversationSnapshot, ConversationBlock, OpenQuestion, OpenQuestionAnswer,
  TimelineEvent, IntentRecord, Assessment, Observation, AgentRecord, Specification,
  Plan, SpecItem, Counts, SearchResult
} from '../types';
import sampleHarvestData from '../data/sample-harvest.json';

const now = new Date().toISOString();

const MOCK_USERS: User[] = [
  { id: '9abe1316-312e-4a2f-96ad-88c4b86c7b1e', name: 'You (Mock)', email: 'you@mock.local', avatar: 'Y', createdAt: now },
  { id: 'mock-engineer', name: 'Engineer', email: 'engineer@mock.local', avatar: 'E', createdAt: now },
  { id: 'mock-architect', name: 'Architect', email: 'architect@mock.local', avatar: 'A', createdAt: now },
];

const INITIAL_FORUMS: Forum[] = [
  {
    id: 'mock-forum-issues',
    slug: 'issues-and-open-questions',
    name: 'Issues & Open Questions',
    description: 'Questions, blockers, and unresolved decisions for the Nexus team.',
    sortOrder: 1,
    threadCount: 3,
    postCount: 7,
  },
  {
    id: 'mock-forum-change-log',
    slug: 'change-log',
    name: 'Change Log',
    description: 'Implementation updates and operational notes from the engineering team.',
    sortOrder: 2,
    threadCount: 2,
    postCount: 4,
  },
  {
    id: 'mock-forum-architecture',
    slug: 'architecture',
    name: 'Architecture',
    description: 'Design decisions, trade-offs, and system direction.',
    sortOrder: 3,
    threadCount: 2,
    postCount: 5,
  },
];

const INITIAL_THREADS: Thread[] = [
  {
    id: 'mock-thread-bootstrap',
    title: 'How should the Assembly workspace handle offline refinement?',
    body: 'This mock workspace keeps the Assembly UI usable while backend services are unavailable. We need state persistence and rich entity inspection across all submodules.',
    createdAt: now,
    author: { id: 'mock-user-001', name: 'You (Mock)', avatar: 'Y' },
    forum: { id: 'mock-forum-issues', slug: 'issues-and-open-questions', name: 'Issues & Open Questions' },
    replyCount: 2,
    viewCount: 24,
    lastReplyAt: now,
    lastReplyAuthor: 'Architect',
  },
  {
    id: 'mock-thread-schema',
    title: 'Open question: canonical source for conversation blocks',
    body: 'The UI currently reads conversation blocks from the Nebula service boundary. Ensure schema mapping aligns cleanly in React component views.',
    createdAt: now,
    author: { id: 'mock-architect', name: 'Architect', avatar: 'A' },
    forum: { id: 'mock-forum-issues', slug: 'issues-and-open-questions', name: 'Issues & Open Questions' },
    replyCount: 1,
    viewCount: 18,
    lastReplyAt: now,
    lastReplyAuthor: 'Engineer',
  },
  {
    id: 'mock-thread-health',
    title: 'Assembly UI health check is degraded in preview',
    body: 'Preview mode should report its local mock service as healthy and display real-time interactive widgets.',
    createdAt: now,
    author: { id: 'mock-engineer', name: 'Engineer', avatar: 'E' },
    forum: { id: 'mock-forum-issues', slug: 'issues-and-open-questions', name: 'Issues & Open Questions' },
    replyCount: 0,
    viewCount: 12,
    lastReplyAt: null,
    lastReplyAuthor: null,
  },
  {
    id: 'mock-thread-release',
    title: 'Assembly mock mode is ready for UI iteration',
    body: 'The UI can now be refined without starting the Nexus backend stack. Standard client-side state keeps all components lively.',
    createdAt: now,
    author: { id: 'mock-engineer', name: 'Engineer', avatar: 'E' },
    forum: { id: 'mock-forum-change-log', slug: 'change-log', name: 'Change Log' },
    replyCount: 1,
    viewCount: 31,
    lastReplyAt: now,
    lastReplyAuthor: 'You (Mock)',
  },
  {
    id: 'mock-thread-routing',
    title: 'Keep live API routes unchanged',
    body: 'Live mode continues to proxy /api and /nebula endpoints to the existing backend services.',
    createdAt: now,
    author: { id: 'mock-architect', name: 'Architect', avatar: 'A' },
    forum: { id: 'mock-forum-change-log', slug: 'change-log', name: 'Change Log' },
    replyCount: 0,
    viewCount: 15,
    lastReplyAt: null,
    lastReplyAuthor: null,
  },
  {
    id: 'mock-thread-layout',
    title: 'Compact layout direction for Assembly',
    body: 'Favor dense information hierarchy while keeping interaction states discoverable across all entity screens.',
    createdAt: now,
    author: { id: 'mock-engineer', name: 'Engineer', avatar: 'E' },
    forum: { id: 'mock-forum-architecture', slug: 'architecture', name: 'Architecture' },
    replyCount: 3,
    viewCount: 42,
    lastReplyAt: now,
    lastReplyAuthor: 'Architect',
  },
  {
    id: 'mock-thread-boundary',
    title: 'Separate runtime mode from component views',
    body: 'The mode boundary belongs in the local service layer so UI code keeps its clean, production-ready contracts.',
    createdAt: now,
    author: { id: 'mock-architect', name: 'Architect', avatar: 'A' },
    forum: { id: 'mock-forum-architecture', slug: 'architecture', name: 'Architecture' },
    replyCount: 0,
    viewCount: 9,
    lastReplyAt: null,
    lastReplyAuthor: null,
  },
];

const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'mock-comment-1',
    threadId: 'mock-thread-bootstrap',
    body: 'Use the mock server or reactive store as the local contract, then refine the components against it.',
    createdAt: now,
    parentId: null,
    author: { id: 'mock-engineer', name: 'Engineer', avatar: 'E' },
  },
  {
    id: 'mock-comment-2',
    threadId: 'mock-thread-bootstrap',
    body: 'Agreed. The live proxy interface should remain untouched for terrain-backed development.',
    createdAt: now,
    parentId: null,
    author: { id: 'mock-architect', name: 'Architect', avatar: 'A' },
  },
  {
    id: 'mock-comment-3',
    threadId: 'mock-thread-release',
    body: 'Great progress! The React rewrite carries over all views with responsive design.',
    createdAt: now,
    parentId: null,
    author: { id: '9abe1316-312e-4a2f-96ad-88c4b86c7b1e', name: 'You (Mock)', avatar: 'Y' },
  },
];

const INITIAL_FEED: FeedPost[] = [
  {
    id: 'mock-feed-1',
    title: 'Assembly offline refinement workspace initiated',
    content: 'Provide a local interactive mode for Assembly UI development without external dependencies.',
    createdAt: now,
    comments: 2,
    author: { id: 'mock-user-001', name: 'You (Mock)', avatar: 'Y' },
    forum: { id: 'mock-forum-issues', slug: 'issues-and-open-questions', name: 'Issues & Open Questions' },
  },
  {
    id: 'mock-feed-2',
    title: 'Canonical source decision for conversation blocks',
    content: 'Verified snapshot block boundaries and API responses for Nebula integration.',
    createdAt: now,
    comments: 1,
    author: { id: 'mock-architect', name: 'Architect', avatar: 'A' },
    forum: { id: 'mock-forum-issues', slug: 'issues-and-open-questions', name: 'Issues & Open Questions' },
  },
  {
    id: 'mock-feed-3',
    title: 'Assembly mock mode deployment ready',
    content: 'Full UI specs ported to React with dark/steel themes and text-to-speech accessibility.',
    createdAt: now,
    comments: 1,
    author: { id: 'mock-engineer', name: 'Engineer', avatar: 'E' },
    forum: { id: 'mock-forum-change-log', slug: 'change-log', name: 'Change Log' },
  },
];

const INITIAL_WORK_REQUESTS: WorkRequest[] = [
  {
    id: 'mock-wr-001',
    title: 'Create an offline Assembly refinement workspace',
    description: 'Provide a local mock mode for UI development without requiring live backend services.',
    sourceSpecificationId: 'mock-spec-001',
    sourceRequirementId: 'mock-req-001',
    status: 'ACTIVE',
    intent: 'offline UI refinement',
    context: { environment: 'Cloud Run', target: 'React' },
    constraints: { maxLatencyMs: 200, strictMode: true },
    createdBy: 'Engineer',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-wr-002',
    title: 'Audit Assembly API response contracts',
    description: 'Review list and detail response shapes against assembly-srv specification.',
    sourceSpecificationId: null,
    sourceRequirementId: 'mock-req-002',
    status: 'COMPLETED',
    intent: 'contract verification',
    context: { verified: true },
    constraints: {},
    createdBy: 'Architect',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'mock-wr-003',
    title: 'Implement full React component suite',
    description: 'Port all 20+ views into standalone React TSX modular architecture.',
    sourceSpecificationId: 'mock-spec-001',
    sourceRequirementId: 'mock-req-001',
    status: 'IN_PROGRESS',
    intent: 'framework migration',
    context: { framework: 'React 19' },
    constraints: { responsive: true, accessibility: 'WCAG AA' },
    createdBy: 'You (Mock)',
    createdAt: now,
    updatedAt: now,
  },
];

const INITIAL_REQUIREMENTS: Requirement[] = [
  {
    id: 'mock-req-001',
    systemId: 'SYS-001',
    subsystemId: 'SUB-UI',
    featureId: 'FEAT-OFFLINE',
    title: 'Assembly must run without backend services',
    description: 'Mock mode serves representative data and supports local UI interactions.',
    status: 'APPROVED',
    priority: 'HIGH',
    reqType: 'FUNCTIONAL',
    acceptanceCriteria: { offline: true, responsive: true },
    parentId: null,
    candidateId: 'mock-candidate-001',
    conduitPlanId: 'mock-plan-001',
    startDate: now,
    completionDate: null,
    createdAt: now,
    questionCounts: { total: 1, openCount: 1, blockingCount: 0 },
  },
  {
    id: 'mock-req-002',
    systemId: 'SYS-001',
    subsystemId: 'SUB-API',
    featureId: 'FEAT-TERRAIN',
    title: 'Live mode must preserve terrain integration',
    description: 'Live mode stays on the terrain-designated port and proxies the current API paths.',
    status: 'ACTIVE',
    priority: 'HIGH',
    reqType: 'TECHNICAL',
    acceptanceCriteria: { live: true },
    parentId: null,
    candidateId: null,
    conduitPlanId: null,
    startDate: now,
    completionDate: null,
    createdAt: now,
    questionCounts: { total: 0, openCount: 0, blockingCount: 0 },
  },
];

const INITIAL_AGENDAS: Agenda[] = [
  {
    id: 'mock-agenda-001',
    title: 'Assembly offline workspace specification',
    scope: 'Assembly UI Architecture',
    status: 'IN_REVIEW',
    cohesionScore: 0.94,
    sourceCount: 3,
    plannerAnalysis: 'Use client-side reactive store and preserve clean API contracts across views.',
    plannerConflicts: { conflictsFound: false },
    plannerGaps: { missingEndpoints: [] },
    createdAt: now,
    updatedAt: now,
  },
];

const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'mock-candidate-001',
    harvestId: 'mock-harvest-001',
    title: 'Add environment-controlled Assembly mock mode',
    intentDescription: 'Make Assembly portable to a backend-free UI workspace.',
    implementationNotes: { pattern: 'Vite React', components: 24 },
    codeSnippets: { main: 'export default function App() { ... }' },
    openQuestions: { statePersistence: 'localStorage' },
    tags: ['ui', 'mock-mode', 'react'],
    status: 'READY',
    systemId: 'SYS-001',
    subsystemId: 'SUB-UI',
    featureId: 'FEAT-OFFLINE',
    workRequestId: 'mock-wr-001',
    completed: true,
    compilationReadiness: 0.98,
    createdAt: now,
    updatedAt: now,
    harvestSourceFilename: 'assembly-bootstrap.md',
  },
];

const INITIAL_HARVESTS: Harvest[] = [
  {
    id: 'harvest-nexus-001',
    sourcePath: sampleHarvestData.meta.provenance.source,
    sourceFilename: 'Nexus - Buzzwords by Layer.docklang.json',
    model: 'gemini-3.6-flash',
    totalCandidates: 5,
    candidates: { count: 5 },
    sourceText: 'Nexus - Buzzwords by Layer (Docklang Extraction)',
    tags: ['docklang', 'nexus', 'buzzwords', 'layers', 'harvest'],
    metadata: {
      harvester: 'Codex-Harvest-Engine',
      conversationId: sampleHarvestData.meta.provenance.conversationId,
    },
    createdAt: now,
    level: 3,
    visibilityScope: 'ORGANIZATION',
    docklang: sampleHarvestData as any,
    sourceHash: 'sha256-6a16d9b1-f698-83ea-a5a2-9919ac1a86ca',
    fileSize: 62398,
    version: 1,
    runMetadata: { durationMs: 1240, format: sampleHarvestData.meta.format },
  },
  {
    id: 'mock-harvest-001',
    sourcePath: 'mock://assembly-bootstrap',
    sourceFilename: 'assembly-bootstrap.md',
    model: 'gemini-3.6-flash',
    totalCandidates: 1,
    candidates: { count: 1 },
    sourceText: '# Assembly Bootstrap Findings\n\nAssembly requires a responsive, high-density refinement workspace supporting forums, requirements, agendas, candidates, questions, and intelligence logs.',
    tags: ['assembly', 'bootstrap', 'specification'],
    metadata: { harvester: 'AI-Studio-Agent' },
    createdAt: now,
    level: 1,
    visibilityScope: 'ORGANIZATION',
    docklang: { version: '1.0' },
    sourceHash: 'sha256-hash-001',
    fileSize: 1024,
    version: 1,
    runMetadata: { durationMs: 450 },
  },
];

const INITIAL_CONVERSATIONS: ConversationSnapshot[] = [
  {
    id: 'mock-conversation-001',
    conversationId: 'conv-snapshot-101',
    snapshotIndex: 1,
    sourceHash: 'hash-conv-001',
    captureMode: 'interactive',
    blockCount: 4,
    createdBy: 'Engineer',
    createdAt: now,
    sourceFilename: 'assembly-bootstrap.md',
  },
];

const INITIAL_CONVERSATION_BLOCKS: ConversationBlock[] = [
  {
    id: 'block-001',
    conversationId: 'conv-snapshot-101',
    snapshotId: 'mock-conversation-001',
    blockIndex: 1,
    parentTurnId: null,
    parentBlockId: null,
    blockType: 'USER_QUERY',
    contentMd: 'How should Assembly handle offline refinement and client state in React?',
    contentHash: 'hash-b1',
    role: 'user',
    domPath: 'chat > turn[1]',
    domFingerprint: 'fp-1',
    firstLineNo: 1,
    lastLineNo: 2,
    createdAt: now,
  },
  {
    id: 'block-002',
    conversationId: 'conv-snapshot-101',
    snapshotId: 'mock-conversation-001',
    blockIndex: 2,
    parentTurnId: 'turn-1',
    parentBlockId: 'block-001',
    blockType: 'ASSISTANT_RESPONSE',
    contentMd: 'We can structure an in-memory `DataService` backed by `localStorage` that exposes clean async interfaces for all 15+ submodules.',
    contentHash: 'hash-b2',
    role: 'assistant',
    domPath: 'chat > turn[2]',
    domFingerprint: 'fp-2',
    firstLineNo: 3,
    lastLineNo: 8,
    createdAt: now,
  },
  {
    id: 'block-003',
    conversationId: 'conv-snapshot-101',
    snapshotId: 'mock-conversation-001',
    blockIndex: 3,
    parentTurnId: 'turn-2',
    parentBlockId: 'block-002',
    blockType: 'CODE_PROPOSAL',
    contentMd: '```tsx\nexport interface State {\n  forums: Forum[];\n  threads: Thread[];\n}\n```',
    contentHash: 'hash-b3',
    role: 'assistant',
    domPath: 'chat > turn[2] > code',
    domFingerprint: 'fp-3',
    firstLineNo: 9,
    lastLineNo: 16,
    createdAt: now,
  },
];

const INITIAL_OPEN_QUESTIONS: OpenQuestion[] = [
  {
    id: 'mock-question-001',
    requirementId: 'mock-req-001',
    candidateId: 'mock-candidate-001',
    title: 'Should mock writes persist across browser refresh?',
    description: 'Local writes now persist in localStorage with a button in Settings to reset state.',
    category: 'DESIGN',
    status: 'ANSWERED',
    blocking: false,
    createdBy: 'Engineer',
    createdAt: now,
    entityType: 'requirement',
    entityId: 'mock-req-001',
    entityTitle: 'Assembly must run without backend services',
    answerCount: 1,
    roleCount: 1,
    answeredBy: 'Architect',
    answeredAt: now,
  },
  {
    id: 'mock-question-002',
    requirementId: null,
    candidateId: null,
    title: 'Which service boundary owns conversation snapshot blocks?',
    description: 'The live UI reads conversation blocks from the Nebula service boundary.',
    category: 'MISSING_INFO',
    status: 'OPEN',
    blocking: true,
    createdBy: 'Architect',
    createdAt: now,
    entityType: 'conversation',
    entityId: 'mock-conversation-001',
    entityTitle: 'Assembly mock-mode design conversation',
    answerCount: 0,
    roleCount: 0,
    answeredBy: null,
    answeredAt: null,
  },
];

const INITIAL_OPEN_QUESTION_ANSWERS: Record<string, OpenQuestionAnswer[]> = {
  'mock-question-001': [
    {
      id: 'ans-001',
      questionId: 'mock-question-001',
      role: 'Architect',
      answer: 'Yes! Storing mock state in localStorage provides seamless testing and iteration.',
      confidence: 'HIGH',
      reasoning: 'Reduces boilerplate and allows rich interactive preview without network server requirements.',
      answeredAt: now,
    },
  ],
};

const INITIAL_TIMELINE: Record<string, TimelineEvent[]> = {
  'mock-question-001': [
    {
      type: 'created',
      label: 'Question Raised',
      description: 'Raised by Engineer regarding mock state persistence.',
      timestamp: now,
      actor: 'Engineer',
      icon: 'Circle',
    },
    {
      type: 'resolved',
      label: 'Answer Provided',
      description: 'Architect suggested localStorage persistence.',
      timestamp: now,
      actor: 'Architect',
      icon: 'CheckCircle2',
    },
  ],
  'mock-question-002': [
    {
      type: 'created',
      label: 'Question Raised',
      description: 'Raised by Architect for Nebula service boundary.',
      timestamp: now,
      actor: 'Architect',
      icon: 'Circle',
    },
  ],
};

const INITIAL_INTENTS: IntentRecord[] = [
  {
    id: 'mock-intent-001',
    candidateId: 'mock-candidate-001',
    parentId: null,
    title: 'Portable Assembly UI',
    description: 'The interface should be refinable with zero external backend dependencies.',
    sourceType: 'SPECIFICATION',
    sourceRef: 'assembly-bootstrap',
    tags: ['offline', 'ui', 'react'],
    status: 'VERIFIED',
    metadata: { version: '2.0' },
    createdAt: now,
    updatedAt: now,
  },
];

const INITIAL_ASSESSMENTS: Assessment[] = [
  {
    id: 'mock-assessment-001',
    observationId: 'mock-observation-001',
    outcome: 'ACCEPTED',
    confidence: 0.95,
    impactScope: { ui: 'high', api: 'low' },
    openQuestions: { resolved: 1 },
    agendaId: 'mock-agenda-001',
    autoResolvePlanId: 'mock-plan-001',
    forumPostId: 'mock-thread-release',
    analysisDetail: 'Local client state pattern ensures fast interactive preview and instant user response.',
    createdAt: now,
  },
];

const INITIAL_OBSERVATIONS: Observation[] = [
  {
    id: 'mock-observation-001',
    triggerType: 'WORKSPACE_BOOTSTRAP',
    sourceArtifactType: 'ENVIRONMENT',
    sourceArtifactId: 'mock-env',
    payload: { mode: 'mock', platform: 'React Vite' },
    assessed: true,
    createdAt: now,
  },
];

const INITIAL_AGENT_RECORDS: AgentRecord[] = [
  {
    id: 'mock-record-001',
    recordType: 'report',
    role: 'Engineer',
    title: 'Assembly React rewrite status report',
    content: 'All 20+ Angular views converted into elegant React components styled with Tailwind CSS.',
    sourcePath: '/src/app',
    metadata: { framework: 'React 19', bundler: 'Vite' },
    tags: ['assembly', 'migration', 'react'],
    systemId: 'SYS-001',
    subsystemId: 'SUB-UI',
    featureId: 'FEAT-OFFLINE',
    planRef: 'mock-plan-001',
    level: 1,
    visibilityScope: 'PUBLIC',
    createdAt: now,
  },
  {
    id: 'mock-record-002',
    recordType: 'engineering_log',
    role: 'Architect',
    title: 'Architecture note on single-view hierarchy & responsive layout',
    content: 'Maintained dense Information Architecture with collapsible sidebars and sticky headers.',
    sourcePath: '/src/components',
    metadata: { design: 'Steel & Dark Mode' },
    tags: ['architecture', 'design-system'],
    systemId: 'SYS-001',
    subsystemId: 'SUB-UI',
    featureId: 'FEAT-DESIGN',
    planRef: 'mock-plan-001',
    level: 2,
    visibilityScope: 'PUBLIC',
    createdAt: now,
  },
];

const INITIAL_SPECIFICATIONS: Specification[] = [
  {
    id: 'mock-spec-001',
    agendaId: 'mock-agenda-001',
    revisionNumber: 1,
    revisionType: 'INITIAL',
    supersededBy: null,
    derivedFrom: ['assembly-bootstrap.md'],
    itemSnapshot: { title: 'Assembly Workspace Spec', items: 12 },
    changeSummary: 'Initial specification baseline for Assembly React application.',
    validFrom: now,
    validUntil: '2099-12-31T23:59:59.999Z',
    createdAt: now,
  },
];

const INITIAL_PLANS: Plan[] = [
  {
    id: 'mock-plan-001',
    fileName: 'react-assembly-rewrite.md',
    title: 'Assembly React Migration & Refinement',
    project: 'Assembly',
    goal: 'Rewrite Angular frontend into a standalone high-performance React application.',
    content: 'Full feature parity including Forums, Work Requests, Requirements, Agendas, Candidates, Open Questions, TTS support, and Theme management.',
    filesAffected: 'App.tsx, dataService.ts, index.html, vite.config.ts',
    acceptanceCriteria: 'Compiles clean with Vite, port 3000 accessible, responsive layout, full feature parity.',
    dependencies: 'React, React Router, Lucide Icons, Tailwind CSS',
    promptRef: 'user-request',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  },
];

const INITIAL_SPECS: SpecItem[] = [
  {
    id: 'mock-spec-item-001',
    agendaId: 'mock-agenda-001',
    sourceType: 'REQUIREMENT',
    sourceId: 'mock-req-001',
    title: 'React Dev Server Configuration',
    body: 'Vite dev server listens on 0.0.0.0:3000 for Cloud Run compatibility.',
    decisions: { framework: 'React' },
    openQuestions: {},
    supportingRefs: { port: 3000 },
    included: true,
    plannerNote: 'Crucial for platform deployment.',
    agendaTitle: 'Assembly offline workspace specification',
    agendaStatus: 'IN_REVIEW',
    createdAt: now,
    updatedAt: now,
  },
];

class StorageService {
  private key = 'assembly_app_state_v1';

  private loadState() {
    let state: any = null;
    try {
      const data = localStorage.getItem(this.key);
      if (data) state = JSON.parse(data);
    } catch {
      // ignore fallback
    }

    if (!state) {
      state = {
        forums: INITIAL_FORUMS,
        threads: INITIAL_THREADS,
        comments: INITIAL_COMMENTS,
        feed: INITIAL_FEED,
        workRequests: INITIAL_WORK_REQUESTS,
        requirements: INITIAL_REQUIREMENTS,
        agendas: INITIAL_AGENDAS,
        candidates: INITIAL_CANDIDATES,
        harvests: INITIAL_HARVESTS,
        conversations: INITIAL_CONVERSATIONS,
        conversationBlocks: INITIAL_CONVERSATION_BLOCKS,
        openQuestions: INITIAL_OPEN_QUESTIONS,
        questionAnswers: INITIAL_OPEN_QUESTION_ANSWERS,
        timelineEvents: INITIAL_TIMELINE,
        intents: INITIAL_INTENTS,
        assessments: INITIAL_ASSESSMENTS,
        observations: INITIAL_OBSERVATIONS,
        agentRecords: INITIAL_AGENT_RECORDS,
        specifications: INITIAL_SPECIFICATIONS,
        plans: INITIAL_PLANS,
        specs: INITIAL_SPECS,
        users: MOCK_USERS,
      };
    } else {
      // Ensure forums array exists and contains initial default forums
      if (!Array.isArray(state.forums) || state.forums.length === 0) {
        state.forums = INITIAL_FORUMS;
      } else {
        INITIAL_FORUMS.forEach((initF) => {
          if (!state.forums.some((f: Forum) => f.slug === initF.slug)) {
            state.forums.push(initF);
          }
        });
      }

      // Ensure threads array exists and contains initial default threads
      if (!Array.isArray(state.threads) || state.threads.length === 0) {
        state.threads = INITIAL_THREADS;
      }

      // Ensure harvests array exists and contains initial default harvests
      if (!Array.isArray(state.harvests) || state.harvests.length === 0) {
        state.harvests = INITIAL_HARVESTS;
      } else {
        INITIAL_HARVESTS.forEach((initH) => {
          if (!state.harvests.some((h: Harvest) => h.id === initH.id)) {
            state.harvests.unshift(initH);
          }
        });
      }
    }

    return state;
  }

  private saveState(state: any) {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  public resetToDefault() {
    localStorage.removeItem(this.key);
  }

  // API Methods
  getCounts(): Counts {
    const s = this.loadState();
    return {
      forums: s.forums.length,
      posts: s.feed.length,
      threads: s.threads.length,
      comments: s.comments.length,
      workRequests: s.workRequests.length,
      requirements: s.requirements.length,
      agendas: s.agendas.length,
      candidates: s.candidates.length,
      harvests: s.harvests.length,
      openQuestions: s.openQuestions.filter((q: OpenQuestion) => q.status !== 'ANSWERED' && q.status !== 'RESOLVED').length,
      intents: s.intents.length,
      assessments: s.assessments.length,
      observations: s.observations.length,
      agentRecords: s.agentRecords.length,
      specifications: s.specifications.length,
      plans: s.plans.length,
    };
  }

  getForums(): Forum[] {
    return this.loadState().forums;
  }

  createForum(data: { name: string; slug: string; description: string }): Forum {
    const s = this.loadState();
    const newForum: Forum = {
      id: `forum-${Date.now()}`,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      name: data.name,
      description: data.description,
      sortOrder: s.forums.length + 1,
      threadCount: 0,
      postCount: 0,
    };
    s.forums.push(newForum);
    this.saveState(s);
    return newForum;
  }

  reorderForums(orderedIds: string[]): boolean {
    const s = this.loadState();
    const map = new Map(s.forums.map((f: Forum) => [f.id, f]));
    const reordered: Forum[] = [];
    orderedIds.forEach((id, idx) => {
      const f = map.get(id);
      if (f) {
        f.sortOrder = idx + 1;
        reordered.push(f);
      }
    });
    s.forums = reordered;
    this.saveState(s);
    return true;
  }

  getThreads(slug: string): Thread[] {
    const s = this.loadState();
    return s.threads.filter((t: Thread) => t.forum.slug === slug || slug === 'all');
  }

  createThread(slug: string, data: { title: string; body: string; postedById?: string }): Thread {
    const s = this.loadState();
    let forum = s.forums.find((f: Forum) => f.slug === slug);
    if (!forum) {
      const generatedName = slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      forum = {
        id: `forum-${Date.now()}`,
        slug,
        name: generatedName,
        description: `Discussions and threads for ${generatedName}`,
        sortOrder: s.forums.length + 1,
        threadCount: 0,
        postCount: 0,
      };
      s.forums.push(forum);
    }

    const user = s.users.find((u: User) => u.id === data.postedById) || s.users[0];
    const newThread: Thread = {
      id: `thread-${Date.now()}`,
      title: data.title,
      body: data.body,
      createdAt: new Date().toISOString(),
      author: { id: user.id, name: user.name, avatar: user.avatar },
      forum: { id: forum.id, slug: forum.slug, name: forum.name },
      replyCount: 0,
      viewCount: 1,
      lastReplyAt: null,
      lastReplyAuthor: null,
    };
    s.threads.unshift(newThread);
    forum.threadCount += 1;
    this.saveState(s);
    return newThread;
  }

  getThread(threadId: string): { thread: Thread | undefined; comments: Comment[] } {
    const s = this.loadState();
    const thread = s.threads.find((t: Thread) => t.id === threadId);
    const comments = s.comments.filter((c: Comment) => c.threadId === threadId);
    return { thread, comments };
  }

  addComment(threadId: string, data: { body: string; postedById?: string; parentId?: string | null }): Comment {
    const s = this.loadState();
    const user = s.users.find((u: User) => u.id === data.postedById) || s.users[0];
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      threadId,
      body: data.body,
      createdAt: new Date().toISOString(),
      parentId: data.parentId || null,
      author: { id: user.id, name: user.name, avatar: user.avatar },
    };
    s.comments.push(newComment);
    const thread = s.threads.find((t: Thread) => t.id === threadId);
    if (thread) {
      thread.replyCount += 1;
      thread.lastReplyAt = newComment.createdAt;
      thread.lastReplyAuthor = user.name;
    }
    this.saveState(s);
    return newComment;
  }

  getFeed(): FeedPost[] {
    return this.loadState().feed;
  }

  createFeedPost(data: { title?: string; text: string; postedById?: string }): FeedPost {
    const s = this.loadState();
    const user = s.users.find((u: User) => u.id === data.postedById) || s.users[0];
    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      title: data.title || (data.text.length > 40 ? data.text.substring(0, 40) + '...' : data.text),
      content: data.text,
      createdAt: new Date().toISOString(),
      comments: 0,
      author: { id: user.id, name: user.name, avatar: user.avatar },
      forum: null,
    };
    s.feed.unshift(newPost);
    this.saveState(s);
    return newPost;
  }

  deleteFeedPost(id: string): boolean {
    const s = this.loadState();
    s.feed = s.feed.filter((p: FeedPost) => p.id !== id);
    this.saveState(s);
    return true;
  }

  getWorkRequests(): WorkRequest[] {
    return this.loadState().workRequests;
  }

  getWorkRequest(id: string): WorkRequest | undefined {
    return this.loadState().workRequests.find((w: WorkRequest) => w.id === id);
  }

  getRequirements(): Requirement[] {
    return this.loadState().requirements;
  }

  getRequirement(id: string): Requirement | undefined {
    return this.loadState().requirements.find((r: Requirement) => r.id === id);
  }

  getAgendas(): Agenda[] {
    return this.loadState().agendas;
  }

  getAgenda(id: string): Agenda | undefined {
    return this.loadState().agendas.find((a: Agenda) => a.id === id);
  }

  getCandidates(): Candidate[] {
    return this.loadState().candidates;
  }

  getCandidate(id: string): Candidate | undefined {
    return this.loadState().candidates.find((c: Candidate) => c.id === id);
  }

  getHarvests(): Harvest[] {
    return this.loadState().harvests;
  }

  getHarvest(id: string): Harvest | undefined {
    return this.loadState().harvests.find((h: Harvest) => h.id === id);
  }

  updateHarvest(id: string, sourceText: string): boolean {
    const s = this.loadState();
    const harvest = s.harvests.find((h: Harvest) => h.id === id);
    if (harvest) {
      harvest.sourceText = sourceText;
      harvest.fileSize = sourceText.length;
      this.saveState(s);
      return true;
    }
    return false;
  }

  getConversations(): ConversationSnapshot[] {
    return this.loadState().conversations;
  }

  getConversation(id: string): ConversationSnapshot | undefined {
    return this.loadState().conversations.find((c: ConversationSnapshot) => c.id === id);
  }

  getConversationBlocks(conversationId: string): ConversationBlock[] {
    const s = this.loadState();
    return s.conversationBlocks.filter((b: ConversationBlock) => b.snapshotId === conversationId || b.conversationId === conversationId);
  }

  getOpenQuestions(resolved = false, requirementId?: string): OpenQuestion[] {
    const s = this.loadState();
    return s.openQuestions.filter((q: OpenQuestion) => {
      const isRes = q.status === 'ANSWERED' || q.status === 'RESOLVED';
      if (resolved && !isRes) return false;
      if (!resolved && isRes) return false;
      if (requirementId && q.requirementId !== requirementId) return false;
      return true;
    });
  }

  getOpenQuestion(id: string): OpenQuestion | undefined {
    return this.loadState().openQuestions.find((q: OpenQuestion) => q.id === id);
  }

  createOpenQuestion(data: Partial<OpenQuestion>): OpenQuestion {
    const s = this.loadState();
    const newQ: OpenQuestion = {
      id: `question-${Date.now()}`,
      requirementId: data.requirementId || null,
      candidateId: data.candidateId || null,
      title: data.title || 'Untitled Question',
      description: data.description || null,
      category: data.category || 'GENERAL',
      status: 'OPEN',
      blocking: data.blocking || false,
      createdBy: data.createdBy || 'You (Mock)',
      createdAt: new Date().toISOString(),
      answerCount: 0,
      roleCount: 0,
    };
    s.openQuestions.unshift(newQ);
    s.timelineEvents[newQ.id] = [
      {
        type: 'created',
        label: 'Question Created',
        description: `Question created by ${newQ.createdBy}`,
        timestamp: newQ.createdAt,
        actor: newQ.createdBy,
        icon: 'Circle',
      },
    ];
    this.saveState(s);
    return newQ;
  }

  getQuestionAnswers(questionId: string): OpenQuestionAnswer[] {
    const s = this.loadState();
    return s.questionAnswers[questionId] || [];
  }

  addQuestionAnswer(questionId: string, data: { role: string; answer: string; confidence?: string; reasoning?: string }): OpenQuestionAnswer {
    const s = this.loadState();
    if (!s.questionAnswers[questionId]) s.questionAnswers[questionId] = [];
    const newAns: OpenQuestionAnswer = {
      id: `ans-${Date.now()}`,
      questionId,
      role: data.role || 'Contributor',
      answer: data.answer,
      confidence: data.confidence || 'HIGH',
      reasoning: data.reasoning || null,
      answeredAt: new Date().toISOString(),
    };
    s.questionAnswers[questionId].push(newAns);
    const q = s.openQuestions.find((item: OpenQuestion) => item.id === questionId);
    if (q) {
      q.status = 'ANSWERED';
      q.answerCount = (q.answerCount || 0) + 1;
      q.answeredBy = data.role;
      q.answeredAt = newAns.answeredAt;
    }
    if (!s.timelineEvents[questionId]) s.timelineEvents[questionId] = [];
    s.timelineEvents[questionId].push({
      type: 'resolved',
      label: 'Answer Added',
      description: `Answered by ${data.role}`,
      timestamp: newAns.answeredAt,
      actor: data.role,
      icon: 'CheckCircle2',
    });
    this.saveState(s);
    return newAns;
  }

  getQuestionTimeline(questionId: string): TimelineEvent[] {
    const s = this.loadState();
    return s.timelineEvents[questionId] || [];
  }

  getIntents(): IntentRecord[] {
    return this.loadState().intents;
  }

  getIntent(id: string): IntentRecord | undefined {
    return this.loadState().intents.find((i: IntentRecord) => i.id === id);
  }

  getAssessments(): Assessment[] {
    return this.loadState().assessments;
  }

  getAssessment(id: string): Assessment | undefined {
    return this.loadState().assessments.find((a: Assessment) => a.id === id);
  }

  getObservations(): Observation[] {
    return this.loadState().observations;
  }

  getObservation(id: string): Observation | undefined {
    return this.loadState().observations.find((o: Observation) => o.id === id);
  }

  getAgentRecords(typeFilter?: string): AgentRecord[] {
    const s = this.loadState();
    if (typeFilter) {
      return s.agentRecords.filter((r: AgentRecord) => r.recordType === typeFilter);
    }
    return s.agentRecords;
  }

  getAgentRecord(id: string): AgentRecord | undefined {
    return this.loadState().agentRecords.find((r: AgentRecord) => r.id === id);
  }

  getSpecifications(): Specification[] {
    return this.loadState().specifications;
  }

  getSpecification(id: string): Specification | undefined {
    return this.loadState().specifications.find((sp: Specification) => sp.id === id);
  }

  getPlans(): Plan[] {
    return this.loadState().plans;
  }

  getPlan(id: string): Plan | undefined {
    return this.loadState().plans.find((p: Plan) => p.id === id);
  }

  getSpecs(): SpecItem[] {
    return this.loadState().specs;
  }

  getSpecItem(id: string): SpecItem | undefined {
    return this.loadState().specs.find((sp: SpecItem) => sp.id === id);
  }

  getUsers(): User[] {
    return this.loadState().users;
  }

  getUser(id: string): User | undefined {
    return this.loadState().users.find((u: User) => u.id === id);
  }

  search(q: string): SearchResult[] {
    if (!q || !q.trim()) return [];
    const query = q.toLowerCase();
    const s = this.loadState();
    const results: SearchResult[] = [];

    s.forums?.forEach((f: Forum) => {
      if (f.id.toLowerCase().includes(query) || f.slug.toLowerCase().includes(query) || f.name.toLowerCase().includes(query) || f.description.toLowerCase().includes(query)) {
        results.push({ type: 'Forum', id: f.id, title: f.name, description: f.description, href: `/forums/${f.slug}` });
      }
    });

    s.threads?.forEach((t: Thread) => {
      if (t.id.toLowerCase().includes(query) || t.title.toLowerCase().includes(query) || t.body.toLowerCase().includes(query)) {
        results.push({ type: 'Thread', id: t.id, title: t.title, description: t.body, href: `/forums/${t.forum.slug}/${t.id}` });
      }
    });

    s.workRequests?.forEach((w: WorkRequest) => {
      if (w.id.toLowerCase().includes(query) || w.title.toLowerCase().includes(query) || (w.description && w.description.toLowerCase().includes(query))) {
        results.push({ type: 'Work Request', id: w.id, title: w.title, description: w.description || '', href: `/work-requests/${w.id}`, status: w.status });
      }
    });

    s.requirements?.forEach((r: Requirement) => {
      if (r.id.toLowerCase().includes(query) || (r.title && r.title.toLowerCase().includes(query)) || (r.description && r.description.toLowerCase().includes(query))) {
        results.push({ type: 'Requirement', id: r.id, title: r.title, description: r.description || '', href: `/requirements/${r.id}`, status: r.status || '' });
      }
    });

    s.agendas?.forEach((a: Agenda) => {
      if (a.id.toLowerCase().includes(query) || a.title.toLowerCase().includes(query) || (a.scope && a.scope.toLowerCase().includes(query))) {
        results.push({ type: 'Agenda', id: a.id, title: a.title, description: a.scope || '', href: `/agendas/${a.id}`, status: a.status });
      }
    });

    s.candidates?.forEach((c: Candidate) => {
      if (c.id.toLowerCase().includes(query) || c.title.toLowerCase().includes(query) || (c.intentDescription && c.intentDescription.toLowerCase().includes(query))) {
        results.push({ type: 'Candidate', id: c.id, title: c.title, description: c.intentDescription || '', href: `/candidates/${c.id}`, status: c.status || '' });
      }
    });

    s.openQuestions?.forEach((oq: OpenQuestion) => {
      if (oq.id.toLowerCase().includes(query) || oq.title.toLowerCase().includes(query) || (oq.description && oq.description.toLowerCase().includes(query))) {
        results.push({ type: 'Open Question', id: oq.id, title: oq.title, description: oq.description || '', href: `/open-questions/${oq.id}`, status: oq.status });
      }
    });

    s.agentRecords?.forEach((ar: AgentRecord) => {
      if (ar.id.toLowerCase().includes(query) || (ar.title && ar.title.toLowerCase().includes(query)) || (ar.content && ar.content.toLowerCase().includes(query))) {
        results.push({ type: 'Agent Record', id: ar.id, title: ar.title, description: ar.content || '', href: `/agent-records/${ar.id}`, recordType: ar.recordType || '' });
      }
    });

    s.plans?.forEach((p: Plan) => {
      if (p.id.toLowerCase().includes(query) || p.title.toLowerCase().includes(query) || p.goal.toLowerCase().includes(query)) {
        results.push({ type: 'Plan', id: p.id, title: p.title, description: p.goal, href: `/plans/${p.id}`, status: p.status });
      }
    });

    return results;
  }

  searchAll(q: string): SearchResult[] {
    return this.search(q);
  }
}

export const dataService = new StorageService();
