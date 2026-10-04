import React, { useEffect } from 'react';
import { RouterProvider, useRouter } from './router/index.js';
import { AppLayout } from './layouts/AppLayout.js';
import { AuthProvider, useAuth } from '../features/authentication/auth.context.js';
import { AuthLoadingState } from '../components/auth/AuthLoadingState.js';

// Screens
import { SplashScreen } from '../pages/splash/SplashScreen.js';
import { InstallScreen } from '../pages/install/InstallScreen.js';
import { AuthScreen } from '../pages/auth/AuthScreen.js';
import { ResetPasswordScreen } from '../pages/auth/ResetPasswordScreen.js';
import { OnboardingScreen } from '../pages/onboarding/OnboardingScreen.js';
import { HomeScreen } from '../pages/home/HomeScreen.js';
import { JobsScreen } from '../pages/jobs/JobsScreen.js';
import { JobDetailScreen } from '../pages/jobs/JobDetailScreen.js';
import { ApplicationsScreen } from '../pages/applications/ApplicationsScreen.js';
import { ApplicationDetailScreen } from '../pages/applications/ApplicationDetailScreen.js';
import { PrepareApplicationScreen } from '../pages/applications/PrepareApplicationScreen.js';
import { AgentScreen } from '../pages/agent/AgentScreen.js';
import { TasksScreen } from '../pages/tasks/TasksScreen.js';
import { HiringIntelligenceScreen } from '../pages/hiring/HiringIntelligenceScreen.js';
import { ProfileScreen } from '../pages/profile/ProfileScreen.js';
import { ResumeScreen } from '../pages/profile/ResumeScreen.js';
import { PreferencesScreen } from '../pages/profile/PreferencesScreen.js';
import { CareerReportScreen } from '../pages/report/CareerReportScreen.js';
import { NotificationsScreen } from '../pages/notifications/NotificationsScreen.js';

const RouteRenderer: React.FC = () => {
  const { path, navigate } = useRouter();
  const { status, isAuthenticated } = useAuth();

  const isPublicRoute =
    path === '/' ||
    path === '/install' ||
    path === '/auth' ||
    path === '/auth/reset-password';

  const isProtectedRoute = !isPublicRoute;

  // Enforce session check on protected routes: redirect unauthenticated users to /auth with redirect param
  useEffect(() => {
    if (isProtectedRoute && status === 'UNAUTHENTICATED') {
      const redirectUrl = `/auth?redirect=${encodeURIComponent(path)}`;
      navigate(redirectUrl, { replace: true });
    }
  }, [isProtectedRoute, status, path, navigate]);

  // If already authenticated and accessing login screen directly, take user to app
  useEffect(() => {
    if (path === '/auth' && isAuthenticated) {
      navigate('/app/home', { replace: true });
    }
  }, [path, isAuthenticated, navigate]);

  // Handle protected route loading state while session initializes
  if (isProtectedRoute && status === 'INITIALIZING') {
    return <AuthLoadingState message="Checking your session..." />;
  }

  // Handle protected route when user is unauthenticated (during redirect)
  if (isProtectedRoute && !isAuthenticated) {
    return <AuthLoadingState message="Redirecting to sign in..." />;
  }

  // --- Public Routes ---
  if (path === '/') {
    return <SplashScreen />;
  }

  if (path === '/install') {
    return <InstallScreen />;
  }

  if (path === '/auth') {
    return <AuthScreen />;
  }

  if (path === '/auth/reset-password') {
    return <ResetPasswordScreen />;
  }

  // --- Protected Routes ---
  if (path === '/onboarding') {
    return <OnboardingScreen />;
  }

  if (path === '/app/home' || path === '/app') {
    return <HomeScreen />;
  }

  if (path.startsWith('/app/jobs/') && path !== '/app/jobs') {
    return <JobDetailScreen />;
  }

  if (path === '/app/jobs') {
    return <JobsScreen />;
  }

  if (path === '/app/applications/prepare') {
    return <PrepareApplicationScreen />;
  }

  if (path.startsWith('/app/applications/') && path !== '/app/applications') {
    return <ApplicationDetailScreen />;
  }

  if (path === '/app/applications') {
    return <ApplicationsScreen />;
  }

  if (path === '/app/agent') {
    return <AgentScreen />;
  }

  if (path === '/app/tasks' || path.startsWith('/app/tasks/')) {
    return <TasksScreen />;
  }

  if (path === '/app/hiring' || path === '/app/gmail') {
    return <HiringIntelligenceScreen />;
  }

  if (path === '/app/profile') {
    return <ProfileScreen />;
  }

  if (path === '/app/resume') {
    return <ResumeScreen />;
  }

  if (path === '/app/preferences') {
    return <PreferencesScreen />;
  }

  if (path === '/app/report' || path.startsWith('/app/reports/')) {
    return <CareerReportScreen />;
  }

  if (path === '/app/notifications') {
    return <NotificationsScreen />;
  }

  // Fallback to Home screen
  return <HomeScreen />;
};

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppLayout>
          <RouteRenderer />
        </AppLayout>
      </RouterProvider>
    </AuthProvider>
  );
}
