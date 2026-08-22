import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { IdentityProvider } from './context/IdentityContext';
import { TTSProvider } from './context/TTSContext';
import { ToastProvider } from './context/ToastContext';
import { RecentlyViewedProvider } from './context/RecentlyViewedContext';
import { LiveDataProvider, useLiveData } from './context/LiveDataContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { SearchModal } from './components/SearchModal';
import { Breadcrumbs } from './components/Breadcrumbs';
import { SkeletonLoader } from './components/SkeletonLoader';

// ── Lazy-loaded route views (code-split per route) ──────────────────
// Each view is a separate chunk, loaded on demand when the route is visited.
// SkeletonLoader provides a consistent loading state during chunk fetch.

const FeedView = lazy(() => import('./views/FeedView').then(m => ({ default: m.FeedView })));
const ForumsView = lazy(() => import('./views/ForumsView').then(m => ({ default: m.ForumsView })));
const ForumDetailView = lazy(() => import('./views/ForumDetailView').then(m => ({ default: m.ForumDetailView })));
const ThreadDetailView = lazy(() => import('./views/ThreadDetailView').then(m => ({ default: m.ThreadDetailView })));
const WorkRequestsView = lazy(() => import('./views/WorkRequestsView').then(m => ({ default: m.WorkRequestsView })));
const WorkRequestDetailView = lazy(() => import('./views/WorkRequestDetailView').then(m => ({ default: m.WorkRequestDetailView })));
const RequirementsView = lazy(() => import('./views/RequirementsView').then(m => ({ default: m.RequirementsView })));
const AgendasView = lazy(() => import('./views/AgendasView').then(m => ({ default: m.AgendasView })));
const CandidatesView = lazy(() => import('./views/CandidatesView').then(m => ({ default: m.CandidatesView })));
const HarvestsView = lazy(() => import('./views/HarvestsView').then(m => ({ default: m.HarvestsView })));
const HarvestDetailView = lazy(() => import('./views/HarvestDetailView').then(m => ({ default: m.HarvestDetailView })));
const OpenQuestionsView = lazy(() => import('./views/OpenQuestionsView').then(m => ({ default: m.OpenQuestionsView })));
const OpenQuestionDetailView = lazy(() => import('./views/OpenQuestionDetailView').then(m => ({ default: m.OpenQuestionDetailView })));
const ResolutionsView = lazy(() => import('./views/ResolutionsView').then(m => ({ default: m.ResolutionsView })));
const AssessmentsView = lazy(() => import('./views/AssessmentsView').then(m => ({ default: m.AssessmentsView })));
const ObservationsView = lazy(() => import('./views/ObservationsView').then(m => ({ default: m.ObservationsView })));
const AgentRecordsView = lazy(() => import('./views/AgentRecordsView').then(m => ({ default: m.AgentRecordsView })));
const AgentsView = lazy(() => import('./views/AgentsView').then(m => ({ default: m.AgentsView })));

// /agents/:id redirects to the agent-record detail (Angular parity).
function AgentRedirect() {
 const { id } = useParams();
 return <Navigate to={`/agent-records/${id}`} replace />;
}
const ReportsView = lazy(() => import('./views/ReportsView').then(m => ({ default: m.ReportsView })));
const SpecificationsView = lazy(() => import('./views/SpecificationsView').then(m => ({ default: m.SpecificationsView })));
const SpecificationDetailView = lazy(() => import('./views/SpecificationDetailView').then(m => ({ default: m.SpecificationDetailView })));
const PlansView = lazy(() => import('./views/PlansView').then(m => ({ default: m.PlansView })));
const PlanDetailView = lazy(() => import('./views/PlanDetailView').then(m => ({ default: m.PlanDetailView })));
const SpecsView = lazy(() => import('./views/SpecsView').then(m => ({ default: m.SpecsView })));
const EntityDetailView = lazy(() => import('./views/EntityDetailView').then(m => ({ default: m.EntityDetailView })));
const ProfileView = lazy(() => import('./views/ProfileView').then(m => ({ default: m.ProfileView })));
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));
const SearchView = lazy(() => import('./views/SearchView').then(m => ({ default: m.SearchView })));

// ── Route-level Suspense fallback ───────────────────────────────────
function RouteFallback() {
 return (
 <div className="max-w-5xl mx-auto py-6 px-4">
 <SkeletonLoader type="list" count={3} />
 </div>
 );
}

// ── AnimatedRoutes ───────────────────────────────────────────────────
function AnimatedRoutes() {
 const location = useLocation();

 return (
 <AnimatePresence mode="wait">
 <motion.div
 key={location.pathname}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
 className="w-full h-full"
 >
 <Suspense fallback={<RouteFallback />}>
 <Routes location={location}>
 <Route path="/" element={<Navigate to="/feed" replace />} />
 <Route path="/feed" element={<FeedView />} />

 {/* Forums */}
 <Route path="/forums" element={<ForumsView />} />
 <Route path="/forums/:slug" element={<ForumDetailView />} />
 <Route path="/forums/:slug/:threadId" element={<ThreadDetailView />} />

 {/* To Do — dedicated top-level link to the to-do forum */}
 <Route path="/todo" element={<ForumDetailView slug="to-do" />} />

 {/* Work Requests */}
 <Route path="/work-requests" element={<WorkRequestsView />} />
 <Route path="/work-requests/:id" element={<WorkRequestDetailView />} />

 {/* Requirements */}
 <Route path="/requirements" element={<RequirementsView />} />
 <Route path="/requirements/:id" element={<EntityDetailView />} />

 {/* Agendas */}
 <Route path="/agendas" element={<AgendasView />} />
 <Route path="/agendas/:id" element={<EntityDetailView />} />

 {/* Candidates */}
 <Route path="/candidates" element={<CandidatesView />} />
 <Route path="/candidates/:id" element={<EntityDetailView />} />

 {/* Harvests */}
 <Route path="/harvests" element={<HarvestsView />} />
 <Route path="/harvests/:id" element={<HarvestDetailView />} />

 {/* Open Questions */}
 <Route path="/open-questions" element={<OpenQuestionsView />} />
 <Route path="/open-questions/:id" element={<OpenQuestionDetailView />} />

 {/* Resolutions */}
 <Route path="/resolutions" element={<ResolutionsView />} />

 {/* Assessments */}
 <Route path="/assessments" element={<AssessmentsView />} />
 <Route path="/assessments/:id" element={<EntityDetailView />} />

 {/* Observations */}
 <Route path="/observations" element={<ObservationsView />} />
 <Route path="/observations/:id" element={<EntityDetailView />} />

 {/* Agents (table view) — :id redirects to the agent-record detail (Angular parity) */}
 <Route path="/agents" element={<AgentsView />} />
 <Route path="/agents/:id" element={<AgentRedirect />} />

 {/* Agent Records & Reports */}
 <Route path="/agent-records" element={<AgentRecordsView />} />
 <Route path="/agent-records/:id" element={<EntityDetailView />} />
 <Route path="/reports" element={<ReportsView />} />

 {/* Specifications */}
 <Route path="/specifications" element={<SpecificationsView />} />
 <Route path="/specifications/:id" element={<SpecificationDetailView />} />

 {/* Plans */}
 <Route path="/plans" element={<PlansView />} />
 <Route path="/plans/:id" element={<PlanDetailView />} />

 {/* Specs */}
 <Route path="/specs" element={<SpecsView />} />
 <Route path="/specs/:id" element={<EntityDetailView />} />

 {/* Users & Utility */}
 <Route path="/users/:id" element={<ProfileView />} />
 <Route path="/profile/:id" element={<ProfileView />} />
 <Route path="/settings" element={<SettingsView />} />
 <Route path="/search" element={<SearchView />} />

 {/* Fallback */}
 <Route path="*" element={<Navigate to="/feed" replace />} />
 </Routes>
 </Suspense>
 </motion.div>
 </AnimatePresence>
 );
}

// ── Health banner (T-Assembly-UI-03) ─────────────────────────────────
// Polls /api/health every 15 s against the live backend.
function HealthBanner() {
 const [unhealthy, setUnhealthy] = useState(false);
 const [checking, setChecking] = useState(false);
 const { refreshNow } = useLiveData();

 useEffect(() => {
 let mounted = true;

 async function check() {
 if (!mounted) return;
 try {
 const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
 if (mounted) setUnhealthy(!res.ok);
 } catch {
 if (mounted) setUnhealthy(true);
 }
 }

 // Initial check after 3 s (let the page settle)
 const initialTimer = setTimeout(() => { check(); }, 3000);

 // Poll every 15 s
 const interval = setInterval(check, 15000);

 return () => {
 mounted = false;
 clearTimeout(initialTimer);
 clearInterval(interval);
 };
 }, []);

 const handleRetry = async () => {
 setChecking(true);
 try {
 const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
 setUnhealthy(!res.ok);
 if (res.ok) refreshNow(); // backend is back — pull fresh data immediately
 } catch {
 setUnhealthy(true);
 } finally {
 setChecking(false);
 }
 };

 if (!unhealthy) return null;

 return (
 <div className="sticky top-14 z-30 w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
 <div className="flex items-center gap-2 text-amber-800 ">
 <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
 <span className="font-medium text-sm">Backend unreachable — data may be stale</span>
 </div>
 <button
 onClick={handleRetry}
 disabled={checking}
 className="px-3 py-1 text-sm font-medium bg-amber-200 text-amber-900 rounded-md hover:bg-amber-300 :bg-amber-700 disabled:opacity-50 transition-colors"
 >
 {checking ? 'Checking…' : 'Retry'}
 </button>
 </div>
 );
}

// ── App ──────────────────────────────────────────────────────────────

export function App() {
 const [isSearchOpen, setIsSearchOpen] = useState(false);

 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
 e.preventDefault();
 setIsSearchOpen((prev) => !prev);
 }
 };

 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, []);

 return (
 <ThemeProvider>
 <LiveDataProvider>
 <IdentityProvider>
 <TTSProvider>
 <ToastProvider>
 <BrowserRouter>
 <RecentlyViewedProvider>
 <div className="h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-200">
 <Header onOpenSearch={() => setIsSearchOpen(true)} />
 <HealthBanner />
 <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
 <div className="flex-1 flex min-h-0 overflow-hidden">
 <Sidebar />
 <main className="flex-1 min-w-0 overflow-y-auto overscroll-contain pb-12 bg-slate-50 transition-colors">
 <Breadcrumbs />
 <AnimatedRoutes />
 </main>
 </div>
 <ToastContainer />
 </div>
 </RecentlyViewedProvider>
 </BrowserRouter>
 </ToastProvider>
 </TTSProvider>
 </IdentityProvider>
 </LiveDataProvider>
 </ThemeProvider>
 );
}

export default App;
