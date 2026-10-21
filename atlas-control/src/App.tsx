import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Layout } from './components/layout/Layout';
import { useStore } from './store/store';
import { can, ROLES, type Permission } from './domain/permissions';
import { DashboardPage } from './pages/Dashboard';
import { ProjectsPage } from './pages/Projects';
import { ProjectDetailPage } from './pages/ProjectDetail';
import { FinancePage } from './pages/Finance';
import { MapPage } from './pages/MapPage';
import { SiteLogPage } from './pages/SiteLog';
import { FieldPage } from './pages/Field';
import { ResourcesPage } from './pages/Resources';
import { MaterialsPage } from './pages/Materials';
import { ProductionPage } from './pages/Production';
import { IntelligencePage } from './pages/Intelligence';
import { SettingsPage } from './pages/Settings';
import { ArchitecturePage } from './pages/Architecture';

/** Client-side guard for the demo. Production: the API enforces the same permissions. */
function Guard({ perm, children }: { perm: Permission; children: ReactNode }) {
  const role = useStore((s) => s.role);
  if (!can(role, perm)) return <Navigate to={ROLES[role].home} replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Guard perm="dashboard.view"><DashboardPage /></Guard>} />
          <Route path="/proiecte" element={<Guard perm="dashboard.view"><ProjectsPage /></Guard>} />
          <Route path="/proiecte/:id" element={<Guard perm="dashboard.view"><ProjectDetailPage /></Guard>} />
          <Route path="/financiar" element={<Guard perm="finance.view"><FinancePage /></Guard>} />
          <Route path="/harta" element={<Guard perm="map.view"><MapPage /></Guard>} />
          <Route path="/jurnal" element={<Guard perm="sitelog.view"><SiteLogPage /></Guard>} />
          <Route path="/field" element={<Guard perm="field.use"><FieldPage /></Guard>} />
          <Route path="/resurse" element={<Guard perm="resources.view"><ResourcesPage /></Guard>} />
          <Route path="/materiale" element={<Guard perm="materials.view"><MaterialsPage /></Guard>} />
          <Route path="/productie" element={<Guard perm="production.view"><ProductionPage /></Guard>} />
          <Route path="/intelligence" element={<Guard perm="intelligence.use"><IntelligencePage /></Guard>} />
          <Route path="/setari" element={<SettingsPage />} />
          <Route path="/arhitectura" element={<ArchitecturePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
