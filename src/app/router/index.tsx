import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type AppRoute =
  | '/'
  | '/install'
  | '/auth'
  | '/auth/reset-password'
  | '/onboarding'
  | '/app/home'
  | '/app/jobs'
  | `/app/jobs/${string}`
  | '/app/applications'
  | `/app/applications/${string}`
  | '/app/agent'
  | '/app/profile'
  | '/app/resume'
  | '/app/preferences';

interface RouterContextValue {
  path: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  goBack: () => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function matchRouteParams(pattern: string, actual: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const actualParts = actual.split('/').filter(Boolean);

  if (patternParts.length !== actualParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(actualParts[i]);
    } else if (patternParts[i] !== actualParts[i]) {
      return null;
    }
  }
  return params;
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read current pathname from window.location
  const getInitialPath = () => {
    if (typeof window === 'undefined') return '/';
    const pathname = window.location.pathname;
    return pathname === '/' ? '/' : pathname;
  };

  const [path, setPath] = useState<string>(getInitialPath);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string, options?: { replace?: boolean }) => {
    if (typeof window !== 'undefined') {
      if (options?.replace) {
        window.history.replaceState({}, '', to);
      } else {
        window.history.pushState({}, '', to);
      }
    }
    setPath(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/app/home');
    }
  };

  const params = useMemo(() => {
    // Check job route pattern
    const jobMatch = matchRouteParams('/app/jobs/:jobId', path);
    if (jobMatch) return jobMatch;

    // Check application route pattern
    const appMatch = matchRouteParams('/app/applications/:applicationId', path);
    if (appMatch) return appMatch;

    return {};
  }, [path]);

  return (
    <RouterContext.Provider value={{ path, navigate, goBack, params }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}
