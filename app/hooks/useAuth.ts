'use client';
import { useState, useEffect, useCallback } from 'react';

interface User {
  userId: string;
  email: string;
  name?: string;
  username?: string;
  role?: string;
  permissions?: string[];
}

// Global singleton to prevent multiple loads
let globalUserLoaded = false;

export function useAuth() {
  // Initialize user state from localStorage to prevent initial flash
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('userId');
      const email = localStorage.getItem('user_email');
      const name = localStorage.getItem('user_name');
      const username = localStorage.getItem('cognitoUsername');
      const role = localStorage.getItem('userRole') || 'user';
      const permissionsStr = localStorage.getItem('userPermissions');
      const permissions = permissionsStr ? JSON.parse(permissionsStr) : ['read:own'];

      if (userId && email) {
        return { userId, email, name: name || undefined, username: username || undefined, role, permissions };
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false); // AuthGuard handles loading

  // Namespace to resolve IAM against (configurable)
  const getNamespace = (): string => {
    // Priority: env → localStorage → default "Fintech"
    const envNs = (process.env.NEXT_PUBLIC_IAM_NAMESPACE || '').trim();
    if (envNs) return envNs;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('iam_namespace');
      if (stored && stored.trim()) return stored.trim();
    }
    return 'Fintech';
  };

  // Load role/permissions from IAM and persist
  const loadIamForUser = useCallback(async (userId: string) => {
    try {
      const namespace = getNamespace();

      // 1) Fetch role + permissions for namespace
      const roleRes = await fetch(
        `https://brmh.in/namespace-roles/${encodeURIComponent(userId)}/${encodeURIComponent(namespace)}`
      );
      if (roleRes.ok) {
        const roleData = await roleRes.json();
        const resolvedRole = roleData.role || 'user';
        const resolvedPermissions: string[] = Array.isArray(roleData.permissions) ? roleData.permissions : [];

        // If API says admin or permissions indicate full access, elevate to admin
        const isAdmin = resolvedRole === 'admin' || resolvedRole === 'superadmin' || resolvedPermissions.includes('crud:all');
        const finalRole = isAdmin ? 'admin' : resolvedRole;

        localStorage.setItem('userRole', finalRole);
        localStorage.setItem('userPermissions', JSON.stringify(resolvedPermissions));
        localStorage.setItem('iam_namespace', namespace);

        setUser(prev => prev ? { ...prev, role: finalRole, permissions: resolvedPermissions } : prev);
      }

      // 2) Optionally preflight a permission check (kept minimal - can be expanded by call-sites)
      // This verifies endpoint availability and returns canonical permission resolution
      await fetch(
        `https://brmh.in/namespace-roles/${encodeURIComponent(userId)}/${encodeURIComponent(namespace)}/check-permissions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requiredPermissions: ['read:files'] })
        }
      ).catch(() => void 0);
    } catch (e) {
      // Non-fatal - fall back to locally cached role/permissions
      console.warn('IAM load failed:', e);
    }
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      // Prevent multiple loads
      if (globalUserLoaded) {
        setIsLoading(false);
        return;
      }
      
      globalUserLoaded = true;
      
      try {
        const userId = localStorage.getItem('userId');
        const email = localStorage.getItem('user_email');
        const name = localStorage.getItem('user_name');
        const username = localStorage.getItem('cognitoUsername');
        const role = localStorage.getItem('userRole') || 'user';
        const permissionsStr = localStorage.getItem('userPermissions');
        const permissions = permissionsStr ? JSON.parse(permissionsStr) : ['read:own'];

        if (userId && email) {
          setUser({ 
            userId, 
            email, 
            name: name || undefined,
            username: username || undefined,
            role,
            permissions
          });
          // Kick off IAM resolution in background
          loadIamForUser(userId);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userId' || e.key === 'user_email' || e.key === 'userRole') {
        globalUserLoaded = false; // Reset to allow reload
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadIamForUser]);

  const login = (userData: User) => {
    localStorage.setItem('userId', userData.userId);
    localStorage.setItem('user_email', userData.email);
    if (userData.name) localStorage.setItem('user_name', userData.name);
    if (userData.username) localStorage.setItem('cognitoUsername', userData.username);
    if (userData.role) localStorage.setItem('userRole', userData.role);
    if (userData.permissions) localStorage.setItem('userPermissions', JSON.stringify(userData.permissions));
    setUser(userData);
    // Resolve IAM immediately after login
    loadIamForUser(userData.userId);
  };

  const logout = () => {
    // Clear all localStorage data
    localStorage.clear();
    
    // Clear all cookies (including httpOnly cookies via backend call)
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
    });
    
    // Reset user state
    setUser(null);
    globalUserLoaded = false;
    
    // Redirect to centralized auth login page (logout endpoint doesn't exist)
    const logoutUrl = `https://auth.brmh.in/login?next=${encodeURIComponent(window.location.origin)}`;
    window.location.href = logoutUrl;
  };

  const requireAuth = () => {
    if (!user && !isLoading) {
      // Always redirect to centralized auth login (both dev and prod)
      const loginUrl = `https://auth.brmh.in/login?next=${encodeURIComponent(window.location.href)}`;
      window.location.href = loginUrl;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission) || user.permissions.includes('crud:all');
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  // Programmatic permission check against backend (uses IAM endpoint)
  const checkPermissions = async (requiredPermissions: string[], namespace?: string): Promise<{ hasPermissions: boolean; missingPermissions: string[]; role?: string; userPermissions?: string[]; } | null> => {
    try {
      if (!user?.userId) return null;
      const ns = namespace || getNamespace();
      const res = await fetch(`https://brmh.in/namespace-roles/${encodeURIComponent(user.userId)}/${encodeURIComponent(ns)}/check-permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiredPermissions })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        hasPermissions: !!data.hasPermissions,
        missingPermissions: Array.isArray(data.missingPermissions) ? data.missingPermissions : [],
        role: data.role,
        userPermissions: Array.isArray(data.userPermissions) ? data.userPermissions : undefined
      };
    } catch {
      return null;
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    requireAuth,
    hasPermission,
    isAdmin,
    checkPermissions
  };
} 