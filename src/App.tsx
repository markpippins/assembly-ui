import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { TTSProvider } from './context/TTSContext';
import { ToastProvider } from './context/ToastContext';
import { RecentlyViewedProvider } from './context/RecentlyViewedContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { SearchModal } from './components/SearchModal';
import { Breadcrumbs } from './components/Breadcrumbs';

import { FeedView } from './views/FeedView';
import { ForumsView } from './views/ForumsView';
import { ForumDetailView } from './views/ForumDetailView';
import { ThreadDetailView } from './views/ThreadDetailView';
import { WorkRequestsView } from './views/WorkRequestsView';
import { WorkRequestDetailView } from './views/WorkRequestDetailView';
import { RequirementsView } from './views/RequirementsView';
import { AgendasView } from './views/AgendasView';
import { CandidatesView } from './views/CandidatesView';
import { HarvestsView } from './views/HarvestsView';
import { HarvestDetailView } from './views/HarvestDetailView';
import { ConversationsView } from './views/ConversationsView';
import { OpenQuestionsView } from './views/OpenQuestionsView';
import { OpenQuestionDetailView } from './views/OpenQuestionDetailView';
import { ResolutionsView } from './views/ResolutionsView';
import { IntentsView } from './views/IntentsView';
import { AssessmentsView } from './views/AssessmentsView';
import { ObservationsView } from './views/ObservationsView';
import { AgentRecordsView } from './views/AgentRecordsView';
import { ReportsView } from './views/ReportsView';
import { SpecificationsView } from './views/SpecificationsView';
import { SpecificationDetailView } from './views/SpecificationDetailView';
import { PlansView } from './views/PlansView';
import { PlanDetailView } from './views/PlanDetailView';
import { SpecsView } from './views/SpecsView';
import { EntityDetailView } from './views/EntityDetailView';
import { ProfileView } from './views/ProfileView';
import { SettingsView } from './views/SettingsView';
import { SearchView } from './views/SearchView';

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
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<FeedView />} />

          {/* Forums */}
          <Route path="/forums" element={<ForumsView />} />
          <Route path="/forums/:slug" element={<ForumDetailView />} />
          <Route path="/forums/:slug/:threadId" element={<ThreadDetailView />} />

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

          {/* Conversations */}
          <Route path="/conversations" element={<ConversationsView />} />
          <Route path="/conversations/:id" element={<EntityDetailView />} />

          {/* Open Questions */}
          <Route path="/open-questions" element={<OpenQuestionsView />} />
          <Route path="/open-questions/:id" element={<OpenQuestionDetailView />} />

          {/* Resolutions */}
          <Route path="/resolutions" element={<ResolutionsView />} />

          {/* Intents */}
          <Route path="/intents" element={<IntentsView />} />
          <Route path="/intents/:id" element={<EntityDetailView />} />

          {/* Assessments */}
          <Route path="/assessments" element={<AssessmentsView />} />
          <Route path="/assessments/:id" element={<EntityDetailView />} />

          {/* Observations */}
          <Route path="/observations" element={<ObservationsView />} />
          <Route path="/observations/:id" element={<EntityDetailView />} />

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
      </motion.div>
    </AnimatePresence>
  );
}

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
      <TTSProvider>
        <ToastProvider>
          <BrowserRouter>
            <RecentlyViewedProvider>
              <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-200">
                <Header onOpenSearch={() => setIsSearchOpen(true)} />
                <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
                <div className="flex-1 flex min-h-0 overflow-hidden">
                  <Sidebar />
                  <main className="flex-1 min-w-0 overflow-y-auto pb-12 bg-slate-50 dark:bg-slate-950 transition-colors">
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
    </ThemeProvider>
  );
}
export default App;
