import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Upload from './pages/Upload';
import Processing from './pages/Processing';
import Results from './pages/Results';
import Dashboard from './pages/Dashboard';
import ConceptMapPage from './pages/ConceptMapPage';
import ExamPrepSetup from './pages/ExamPrepSetup';
import StudyDashboard from './pages/StudyDashboard';
import study-notes-viewer from './pages/study-notes-viewer';
import exam-prep-history from './pages/exam-prep-history';
import BrainDump from './pages/BrainDump';
import ProcessedDump from './pages/ProcessedDump';
import BrainDumpResults from './pages/BrainDumpResults';
import HomeDashboard from './pages/HomeDashboard';
import ClassPage from './pages/ClassPage';
import TaskCreation from './pages/TaskCreation';
import TaskProgressiveView from './pages/TaskProgressiveView';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Upload />} />
      <Route path="/Upload" element={<Upload />} />
      <Route path="/Processing" element={<Processing />} />
      <Route path="/Results" element={<Results />} />
      <Route path="/Dashboard" element={<Dashboard />} />
      <Route path="/ConceptMapPage" element={<ConceptMapPage />} />
      <Route path="/ExamPrepSetup" element={<ExamPrepSetup />} />
      <Route path="/StudyDashboard" element={<StudyDashboard />} />
      <Route path="/study-notes-viewer" element={<study-notes-viewer />} />
      <Route path="/exam-prep-history" element={<exam-prep-history />} />
      <Route path="/BrainDump" element={<BrainDump />} />
      <Route path="/ProcessedDump" element={<ProcessedDump />} />
      <Route path="/BrainDumpResults" element={<BrainDumpResults />} />
      <Route path="/HomeDashboard" element={<HomeDashboard />} />
      <Route path="/ClassPage" element={<ClassPage />} />
      <Route path="/TaskCreation" element={<TaskCreation />} />
      <Route path="/TaskProgressiveView" element={<TaskProgressiveView />} />
      {/* Add your page Route elements here */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
