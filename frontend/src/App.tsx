import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ChatPage } from '@/pages/ChatPage';
import { EmploymentPage } from '@/pages/EmploymentPage';
import { HousingPage } from '@/pages/HousingPage';
import { BenefitsPage } from '@/pages/BenefitsPage';
import { DocumentsPage } from '@/pages/DocumentsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/employment" element={<EmploymentPage />} />
          <Route path="/housing" element={<HousingPage />} />
          <Route path="/benefits" element={<BenefitsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
