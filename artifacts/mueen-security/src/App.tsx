import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { ReportPage, StaffPage, type Language } from './pages/experiences';
import { OperationsDashboard } from './pages/operations-dashboard';

const queryClient = new QueryClient();

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      return localStorage.getItem('mueen-language') === 'ar' ? 'ar' : 'en';
    } catch {
      return 'en';
    }
  });
  const changeLanguage = (next: Language) => {
    setLang(next);
    localStorage.setItem('mueen-language', next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  };
  return <RoutedErrorBoundary><Switch>
    <Route path="/"><Redirect to="/dashboard" /></Route>
    <Route path="/dashboard"><OperationsDashboard lang={lang} setLang={changeLanguage} /></Route>
    <Route path="/staff"><StaffPage lang={lang} setLang={changeLanguage} /></Route>
    <Route path="/report"><ReportPage lang={lang} setLang={changeLanguage} /></Route>
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function App() {
  useEffect(() => {
    const language = localStorage.getItem('mueen-language') === 'ar' ? 'ar' : 'en';
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = 'MUEEN — Haram Safety Support';
  }, []);
  return <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  </QueryClientProvider>;
}

export default App;
