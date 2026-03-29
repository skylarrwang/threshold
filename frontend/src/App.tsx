import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { InterviewPage } from '@/pages/InterviewPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ChatPage } from '@/pages/ChatPage';
import { EmploymentPage } from '@/pages/EmploymentPage';
import { HousingPage } from '@/pages/HousingPage';
import { BenefitsPage } from '@/pages/BenefitsPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProfileReviewPage } from '@/pages/ProfileReviewPage';
import { checkProfileExists } from '@/lib/api';

function RequireProfile({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'exists' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    checkProfileExists()
      .then((res) => {
        if (!cancelled) setStatus(res.exists ? 'exists' : 'missing');
      })
      .catch(() => {
        // Backend unreachable — let the user through (offline mode)
        if (!cancelled) setStatus('exists');
      });
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (status === 'loading') return null;
  if (status === 'missing') return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="/review" element={<ProfileReviewPage />} />
        <Route element={<RequireProfile><AppShell /></RequireProfile>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/employment" element={<EmploymentPage />} />
          <Route path="/housing" element={<HousingPage />} />
          <Route path="/benefits" element={<BenefitsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
