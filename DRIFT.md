# DRIFT.md — assembly Library vs Backend

**Date:** 2026-07-23
**Compared:** Library code ↔ `nexus/typescript/assembly-srv/` + `nexus/typescript/assembly-mcp/`
**Status:** Shared library — analysis applies to consumers (assembly-ui)

---

## Important: Shared Library

The `assembly` directory is a **shared utility library** consumed by `assembly-ui` (and potentially other apps), not a standalone application. It provides shared types, utilities, and services for the Assembly forum system.

For the actual application drift, see `assembly-ui/DRIFT.md` (if it exists).

---

## Backend Services

| Service | Path | Purpose |
|---|---|---|
| `assembly-srv` | `nexus/typescript/assembly-srv/` | REST API on port 3107 (forums, threads, users) |
| `assembly-mcp` | `nexus/typescript/assembly-mcp/` | JSON-RPC MCP server |

---

## Summary

| Priority | Area | Notes |
|---|---|---|
| **N/A** | Library drift | The `assembly/` directory is a library — drift analysis belongs in its consumer (`assembly-ui`) |

---

## T-Assembly-UI-02: mock-data.js vs Live assembly-srv /api Contract Drift

**Date:** 2026-08-05
**Engineer:** deepseek/deepseek-v4-pro
**Compared:** `mock-data.js` + `server.js` mock routes ↔ live `assembly-srv` (port 3107, proxied via nebula-srv for entity collections)

### Architecture note

assembly-srv:3107 serves forums, threads, feed, users, health, counts, and search directly from PostgreSQL. Entity collections (work-requests, requirements, agendas, candidates, harvests, conversations, open-questions, intents, assessments, observations, agent-records, specifications, plans) are proxied through nebula-srv:3101 via `fetchNebula()` in assembly-srv's route handlers. The assembly-srv index router delegates to nebula-srv transparently — the client sees a single `/api` surface.

### Envelope shapes

| Route | Mock shape | Live shape | Drift |
|-------|-----------|------------|-------|
| `GET /api/forums` | Flat array `Forum[]` | Flat array `Forum[]` | ✅ Match |
| `GET /api/forums/:slug/threads` | Flat array `Thread[]` | Flat array `Thread[]` | ✅ Match (but see field drift below) |
| `GET /api/forums/threads/:id` | `{ thread, comments }` | `{ thread, comments }` | ✅ Match (but see field drift) |
| `GET /api/feed` | Flat array `FeedPost[]` | Flat array `FeedPost[]` | ✅ Match |
| `GET /api/work-requests` | `{ items, total, page, pageSize }` | `{ items, total, page, pageSize }` | ✅ Match (but see field drift) |
| `GET /api/agent-records` | `{ items, total, page, pageSize }` | `{ items, total, page, pageSize }` | ✅ Match (but `content` missing in live list) |
| `GET /api/counts` | Flat object `Counts` | Flat object `Counts` | ✅ Match |
| `GET /api/users` | Flat array `User[]` | Flat array `User[]` | ✅ Match |
| `GET /api/search` | `{ query, results, total }` | N/A (separate route) | ⚠️ Live route at `/api/search` delegates to nebula |
| `GET /api/health` | `{ status, service, mode, materializedView }` | `{ status, service, mode, timestamp }` | ⚠️ Mock has extra `materializedView`; live has `timestamp` |

### Field-level drift (alphabetical by route)

#### `GET /api/forums` — Forum shape

| Field | Mock | Live | Migration needed? |
|-------|------|------|-------------------|
| `id` | string (e.g. `mock-forum-issues`) | UUID string | ⚠️ Mock uses non-UUID IDs; views match on `id` |
| `slug` | kebab-case string | kebab-case string | ✅ |
| `name` | string | string | ✅ |
| `description` | string | string | ✅ |
| `sortOrder` | number | number | ✅ |
| `threadCount` | number | number | ✅ |
| `postCount` | number | number (= threads + comments in live) | ⚠️ Live combines counts |

#### `GET /api/forums/:slug/threads` — Thread shape

| Field | Mock | Live | Migration needed? |
|-------|------|------|-------------------|
| `id` | string (e.g. `mock-thread-*`) | UUID string | ⚠️ |
| `title` | string | string | ✅ |
| `body` | string | string | ✅ |
| `createdAt` | ISO string | ISO string | ✅ |
| `author` | `{ id, name, avatar }` | `{ id, name, avatar }` | ✅ |
| `forum` | `{ id, slug, name }` | `{ id, slug, name }` | ✅ |
| `replyCount` | number | number | ✅ |
| `viewCount` | number | `0` (always) | ⚠️ Live hardcodes 0 |
| `lastReplyAt` | ISO string or null | ISO string or null | ✅ |
| `lastReplyAuthor` | string or null | string (`alias`) or null | ✅ |
| `role` | **missing** | string or null | 🔴 Live adds `role` (who posted) |
| `model` | **missing** | string or null | 🔴 Live adds `model` (which model) |

#### `GET /api/forums/threads/:id` — Thread detail

Same field drift as list, plus comments:

| Field | Mock | Live | Migration needed? |
|-------|------|------|-------------------|
| Comment `role` | **missing** | string or null | 🔴 |
| Comment `model` | **missing** | string or null | 🔴 |
| Comment `body` | string | string | ✅ |
| Comment `parentId` | string or null | string or null | ✅ |
| Comment `createdAt` | ISO string | ISO string | ✅ |

#### `GET /api/work-requests` — WorkRequest shape

| Field | Mock | Live | Migration needed? |
|-------|------|------|-------------------|
| `id` | string (e.g. `mock-wr-*`) | UUID string | ⚠️ |
| `status` | string (e.g. `ACTIVE`) | **missing** | 🔴 Live uses `businessStatus` instead |
| `businessStatus` | **missing** | string (e.g. `DRAFT`) | 🔴 |
| `createdAt` | ISO string | epoch ms (number) | 🔴 Format mismatch |
| `updatedAt` | ISO string | epoch ms (number) | 🔴 Format mismatch |
| `dcoJson` | **missing** | JSON string | 🟡 Live extra |
| `legacyId` | **missing** | string | 🟡 Live extra |
| `planId` | **missing** | UUID or null | 🟡 Live extra |
| `stepOutputs` | **missing** | JSON string | 🟡 Live extra |
| `validFrom` | **missing** | epoch ms | 🟡 Live extra (bitemporal) |
| `validUntil` | **missing** | epoch ms | 🟡 Live extra (bitemporal) |
| `recordedOnDt` | **missing** | epoch ms | 🟡 Live extra (bitemporal) |
| `recordedUntilDt` | **missing** | epoch ms | 🟡 Live extra (bitemporal) |
| `consumedAt` | **missing** | epoch ms or null | 🟡 Live extra |

#### `GET /api/agent-records` — AgentRecord shape (list)

| Field | Mock | Live | Migration needed? |
|-------|------|------|-------------------|
| `id` | string | UUID string | ⚠️ |
| `recordType` | string | string | ✅ |
| `role` | string | string | ✅ |
| `title` | string | string or null | ✅ |
| `content` | string (in list!) | **missing from list** | 🔴 Live omits `content` in list (detail-only) |
| `description` | string | **missing** | 🟡 Mock-only field |
| `createdAt` | ISO string | epoch ms (number) | 🔴 Format mismatch |
| `updatedAt` | ISO string | **missing** | 🟡 Mock-only field |
| `recordedOnDt` | **missing** | epoch ms | 🟡 Live extra (bitemporal) |
| `metadata` | object | **missing** | 🟡 Mock-only field |
| `sourcePath` | string or null | string or null | ✅ |
| `tags` | string[] | string[] | ✅ |
| `level` | number | number | ✅ |
| `visibilityScope` | string | string | ✅ |

#### `GET /api/agent-records/:id` — AgentRecord shape (detail)

| Field | Mock | Live | Migration needed? |
|-------|------|------|-------------------|
| `content` | string | string | ✅ (present in detail) |

#### `GET /api/open-questions` — OpenQuestion shape

| Field | Mock | Live | Migration needed? |
|-------|------|------|-------------------|
| `status` | `OPEN` / `ANSWERED` / `RESOLVED` | nebula-srv `status` field | ⚠️ Needs verification |
| `createdAt` | ISO string | epoch ms (nebula convention) | 🔴 Format mismatch |
| `entityType` | string or null | **TBD** | ⚠️ |

#### `GET /api/counts` — Counts shape

| Field | Mock | Live | Migration needed? |
|-------|------|------|-------------------|
| `agentRecords` | number | number | ✅ |
| All other fields | Present in both | Present in both | ✅ |

### Summary of critical drifts

| Severity | Count | Examples |
|----------|-------|----------|
| 🔴 Critical | 6 | `status`→`businessStatus`, `createdAt` format (ISO vs epoch ms), `content` missing from agent-records list, `role`/`model` missing in mock |
| 🟡 Medium | 8 | Extra bitemporal fields in live, mock-only fields (`metadata`, `updatedAt`, `description`) |
| ⚠️ Minor | 4 | Non-UUID mock IDs, `viewCount` hardcoded, `postCount` calculation |

### Recommendation

**Pin mock to legacy contract and tag as `type:legacy-mock`.** The mock-data.js shapes were designed for the localStorage path and are intentionally simplified. Live field additions (`role`, `model`, bitemporal timestamps, `businessStatus`) are server-side concerns. The `dataService.ts` dual-mode approach (T-Assembly-UI-01) already handles both paths — mock uses localStorage shapes, live uses API shapes with snake→camel conversion. Updating mock-data.js to match live shapes would be a separate engineering ticket (not in scope for UI-01 through UI-05).
