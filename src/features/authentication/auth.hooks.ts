import { useAuth } from './auth.context.js';
import { AuthUser, AuthSession } from './auth.types.js';

export { useAuth };

export function useUser(): AuthUser | null {
  const { user } = useAuth();
  return user;
}

export function useSession(): AuthSession | null {
  const { session } = useAuth();
  return session;
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

export function useAuthLoading(): boolean {
  const { loading } = useAuth();
  return loading;
}
