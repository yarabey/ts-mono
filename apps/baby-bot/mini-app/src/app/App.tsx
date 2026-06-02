import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  AddEvent,
  Dashboard,
  GrowthChart,
  Journal,
  Pattern,
  Profile,
  Stats,
} from '@acme/baby-bot-feature-main';
import { TabBar, Toaster } from '@acme/baby-bot-ui';

const TABS = [
  { id: '/', label: 'Главная', icon: '🏠' },
  { id: '/journal', label: 'Журнал', icon: '📖' },
  { id: '/stats', label: 'Статистика', icon: '📊' },
  { id: '/pattern', label: 'Режим', icon: '🕐' },
  { id: '/profile', label: 'Профиль', icon: '⚙️' },
];

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const active = TABS.some((t) => t.id === location.pathname) ? location.pathname : '/';

  return (
    <>
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/event" element={<AddEvent />} />
          <Route path="/event/:id" element={<AddEvent />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/pattern" element={<Pattern />} />
          <Route path="/growth" element={<GrowthChart />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      <TabBar items={TABS} active={active} onChange={navigate} />
      <Toaster />
    </>
  );
}

export function App() {
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  );
}
