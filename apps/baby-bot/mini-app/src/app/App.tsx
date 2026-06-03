import { useEffect, useRef } from 'react';
import {
  HashRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom';
import {
  AddEvent,
  Dashboard,
  GrowthChart,
  Journal,
  Pattern,
  Profile,
  Stats,
} from '@acme/baby-bot-feature-main';
import {
  PageTransition,
  SwipeBack,
  TabBar,
  Toaster,
  type TransitionDirection,
} from '@acme/baby-bot-ui';

const TABS = [
  { id: '/', label: 'Главная', icon: '🏠' },
  { id: '/journal', label: 'Журнал', icon: '📖' },
  { id: '/stats', label: 'Статистика', icon: '📊' },
  { id: '/pattern', label: 'Режим', icon: '🕐' },
  { id: '/profile', label: 'Профиль', icon: '⚙️' },
];

const TAB_PATHS = new Set(TABS.map((t) => t.id));

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const isTab = TAB_PATHS.has(location.pathname);
  const prevIsTab = useRef(isTab);

  // Forward into a sub-screen (push), back when returning; no slide tab↔tab.
  let direction: TransitionDirection = 'none';
  if (!isTab) direction = navType === 'POP' ? 'back' : 'forward';
  else if (!prevIsTab.current) direction = 'back';

  useEffect(() => {
    prevIsTab.current = isTab;
  });

  const active = TAB_PATHS.has(location.pathname) ? location.pathname : '/';

  return (
    <>
      <SwipeBack enabled={location.pathname !== '/'} onBack={() => navigate(-1)} />
      <main style={{ flex: 1 }}>
        <PageTransition transitionKey={location.pathname} direction={direction}>
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add/:type" element={<AddEvent />} />
            <Route path="/event/:id" element={<AddEvent />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/pattern" element={<Pattern />} />
            <Route path="/growth" element={<GrowthChart />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </PageTransition>
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
