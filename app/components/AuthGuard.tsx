'use client';

import { useEffect, useState } from 'react';

// Global singleton to ensure auth check only runs once EVER
// This persists across component unmounts/remounts and even full re-renders
let globalAuthChecked = false;
let globalAuthChecking = false;
let globalIsAuthenticated = false;

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(() => !globalAuthChecked);
  const [isAuthenticated, setIsAuthenticated] = useState(() => globalIsAuthenticated);

  const addDebugLog = (message: string) => {
    // Only log if we haven't checked yet (reduce spam)
    if (!globalAuthChecked) {
      console.log(`[Fintech AuthGuard] ${message}`);
    }
  };

  const getNamespace = (): string => {
    const envNs = (process.env.NEXT_PUBLIC_IAM_NAMESPACE || '').trim();
    if (envNs) return envNs;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('iam_namespace');
      if (stored && stored.trim()) return stored.trim();
    }
    return 'Fintech';
  };

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for debug and public pages
      if (typeof window !== 'undefined' && 
          (window.location.pathname.startsWith('/debug-auth') || 
           window.location.pathname.startsWith('/test-cookies') ||
           window.location.pathname.startsWith('/login-signup'))) {
        if (!globalAuthChecked) {
          console.log(`[Fintech AuthGuard] 🔍 Public/debug page detected, skipping auth check`);
          globalAuthChecked = true;
          globalIsAuthenticated = true;
        }
        setIsAuthenticated(true);
        setIsChecking(false);
        return;
      }
      
      // Prevent multiple runs using global flag (persists across unmounts!)
      if (globalAuthChecked || globalAuthChecking) {
        // Auth already done, just update component state
        setIsAuthenticated(globalIsAuthenticated);
        setIsChecking(false);
        return;
      }
      
      globalAuthChecking = true;
      
      // Determine API URL based on environment
      // Use NEXT_PUBLIC_BACKEND_URL if it's set, otherwise determine based on hostname
      const envBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const isProduction = window.location.hostname.includes('brmh.in') && !window.location.hostname.includes('localhost');
      
      let API_BASE_URL;
      if (envBackendUrl) {
        // If NEXT_PUBLIC_BACKEND_URL is explicitly set, use it
        API_BASE_URL = envBackendUrl;
      } else {
        // Fallback to hostname-based detection
        API_BASE_URL = isProduction ? 'https://brmh.in' : 'http://localhost:5001';
      }

      addDebugLog(`🔍 Starting authentication check...`);
      addDebugLog(`🌐 API Base URL: ${API_BASE_URL} (${envBackendUrl ? 'env-configured' : isProduction ? 'production' : 'development'})`);
      addDebugLog(`📍 Current URL: ${window.location.href}`);
      addDebugLog(`🔧 Environment Backend URL: ${envBackendUrl || 'not set'}`);

      try {
        // PRODUCTION: Use httpOnly cookies with /auth/me endpoint
        // Check if we're using production backend URL (regardless of hostname)
        const usingProductionBackend = API_BASE_URL.includes('https://brmh.in');
        
        if (usingProductionBackend) {
          addDebugLog(`🌐 Production mode - using cookie-based authentication`);
          addDebugLog(`🌐 Production: Using /auth/me for cookie-based authentication...`);
          addDebugLog(`📡 Calling: ${API_BASE_URL}/auth/me`);
          addDebugLog(`🍪 Credentials: include (will send httpOnly cookies)`);

          try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
              method: 'GET',
              credentials: 'include', // CRITICAL: Send httpOnly cookies
              headers: {
                'Content-Type': 'application/json',
              },
            });

            addDebugLog(`📡 Response status: ${response.status} ${response.statusText}`);
            
            // Log response headers for debugging
            const headersObj: Record<string, string> = {};
            response.headers.forEach((value, key) => {
              headersObj[key] = value;
            });
            addDebugLog(`📡 Response headers: ${JSON.stringify(headersObj)}`);

            if (response.ok) {
              const userData = await response.json();
              addDebugLog(`📦 User data: ${JSON.stringify(userData).substring(0, 200)}`);
              
              const userEmail = userData.user?.email || userData.email;
              addDebugLog(`✅ Authenticated via cookies! User: ${userEmail}`);

              // Store user info in localStorage for client-side access
              if (userData.user) {
                const userInfo = {
                  sub: userData.user.sub,
                  email: userData.user.email,
                  username: userData.user['cognito:username'],
                  email_verified: userData.user.email_verified,
                };
                localStorage.setItem('user', JSON.stringify(userInfo));
                
                // Also store individual fields for backward compatibility
                if (userData.user.sub) {
                  localStorage.setItem('user_id', userData.user.sub);
                  localStorage.setItem('userId', userData.user.sub);
                  addDebugLog(`💾 Stored user_id: ${userData.user.sub}`);
                }
                if (userData.user.email) {
                  localStorage.setItem('user_email', userData.user.email);
                  addDebugLog(`💾 Stored user_email: ${userData.user.email}`);
                }
                if (userData.user['cognito:username']) {
                  localStorage.setItem('user_name', userData.user['cognito:username']);
                  localStorage.setItem('cognitoUsername', userData.user['cognito:username']);
                  addDebugLog(`💾 Stored user_name: ${userData.user['cognito:username']}`);
                }

                // Fetch role/permissions from IAM for the current namespace
                try {
                  const namespace = getNamespace();
                  const sub = userData.user.sub;
                  if (sub) {
                    addDebugLog(`🔍 Fetching IAM role for namespace: ${namespace}`);
                    const roleRes = await fetch(`https://brmh.in/namespace-roles/${encodeURIComponent(sub)}/${encodeURIComponent(namespace)}`, {
                      credentials: 'include'
                    });
                    if (roleRes.ok) {
                      const iam = await roleRes.json();
                      const resolvedRole = iam.role || 'user';
                      const resolvedPerms = Array.isArray(iam.permissions) ? iam.permissions : [];
                      const isAdmin = resolvedRole === 'admin' || resolvedRole === 'superadmin' || resolvedPerms.includes('crud:all');
                      const finalRole = isAdmin ? 'admin' : resolvedRole;
                      localStorage.setItem('userRole', finalRole);
                      localStorage.setItem('userPermissions', JSON.stringify(resolvedPerms));
                      localStorage.setItem('iam_namespace', namespace);
                      addDebugLog(`✅ IAM role: ${finalRole}, perms: ${JSON.stringify(resolvedPerms)}`);
                    } else {
                      localStorage.setItem('userRole', 'user');
                      localStorage.setItem('userPermissions', JSON.stringify(['read:own']));
                      addDebugLog(`⚠️ IAM role fetch failed, defaulting to user`);
                    }
                  }
                } catch (e) {
                  localStorage.setItem('userRole', 'user');
                  localStorage.setItem('userPermissions', JSON.stringify(['read:own']));
                  addDebugLog(`⚠️ IAM error: ${e}`);
                }
              }
              
              // CRITICAL: Set authenticated state IMMEDIATELY
              globalAuthChecked = true;
              globalAuthChecking = false;
              globalIsAuthenticated = true;
              setIsAuthenticated(true);
              setIsChecking(false);
              addDebugLog(`🎉 Cookie-based authentication successful!`);
              addDebugLog(`✅ isAuthenticated set to TRUE`);
              addDebugLog(`✅ isChecking set to FALSE`);
              addDebugLog(`🚀 App should now render!`);
              
              // Exit early to prevent any redirects
              return;
            } else {
              const errorText = await response.text();
              addDebugLog(`❌ Cookie-based auth failed with status: ${response.status}`);
              addDebugLog(`❌ Error response: ${errorText.substring(0, 200)}`);
            }
          } catch (error) {
            addDebugLog(`⚠️ Cookie auth check failed: ${error}`);
          }
        } else {
          // DEVELOPMENT: Use localStorage + URL hash tokens
          addDebugLog(`🌐 Development mode - checking localStorage and URL hash`);

          // Check URL hash for tokens (from SSO redirect)
          const hash = window.location.hash;
          if (hash) {
            addDebugLog(`🔗 Found URL hash: ${hash.substring(0, 100)}...`);
            
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            const idToken = params.get('id_token');

            if (accessToken && idToken) {
              addDebugLog(`✅ Found tokens in URL hash!`);
              
              // Store tokens in localStorage
              localStorage.setItem('access_token', accessToken);
              localStorage.setItem('id_token', idToken);
              addDebugLog(`💾 Stored tokens in localStorage`);

              // Parse ID token to get user info (JWT format: header.payload.signature)
              try {
                const idTokenParts = idToken.split('.');
                if (idTokenParts.length === 3) {
                  const payload = JSON.parse(atob(idTokenParts[1]));
                  addDebugLog(`📦 ID Token payload: ${JSON.stringify(payload).substring(0, 200)}`);

                  const userInfo = {
                    sub: payload.sub,
                    email: payload.email,
                    username: payload['cognito:username'],
                    email_verified: payload.email_verified,
                  };
                  
                  localStorage.setItem('user', JSON.stringify(userInfo));
                  localStorage.setItem('user_id', payload.sub);
                  localStorage.setItem('userId', payload.sub);
                  localStorage.setItem('user_email', payload.email);
                  localStorage.setItem('user_name', payload['cognito:username']);
                  localStorage.setItem('cognitoUsername', payload['cognito:username']);
                  addDebugLog(`💾 Stored user info from ID token`);

                  // Fetch user role from brmh-users table
                  try {
                    addDebugLog(`🔍 Fetching user role from brmh-users table...`);
                    const namespace = getNamespace();
                    addDebugLog(`🔍 Fetching IAM role for namespace: ${namespace}`);
                    const roleRes = await fetch(`https://brmh.in/namespace-roles/${encodeURIComponent(payload.sub)}/${encodeURIComponent(namespace)}`, {
                      headers: {
                        'Authorization': `Bearer ${accessToken}`,
                      },
                    });
                    if (roleRes.ok) {
                      const iam = await roleRes.json();
                      const resolvedRole = iam.role || 'user';
                      const resolvedPerms = Array.isArray(iam.permissions) ? iam.permissions : [];
                      const isAdmin = resolvedRole === 'admin' || resolvedRole === 'superadmin' || resolvedPerms.includes('crud:all');
                      const finalRole = isAdmin ? 'admin' : resolvedRole;
                      localStorage.setItem('userRole', finalRole);
                      localStorage.setItem('userPermissions', JSON.stringify(resolvedPerms));
                      localStorage.setItem('iam_namespace', namespace);
                      addDebugLog(`✅ IAM role: ${finalRole}, perms: ${JSON.stringify(resolvedPerms)}`);
                    } else {
                      localStorage.setItem('userRole', 'user');
                      localStorage.setItem('userPermissions', JSON.stringify(['read:own']));
                      addDebugLog(`⚠️ IAM role fetch failed, defaulting to user`);
                    }
                  } catch (roleError) {
                    addDebugLog(`⚠️ IAM error: ${roleError}`);
                    localStorage.setItem('userRole', 'user');
                    localStorage.setItem('userPermissions', JSON.stringify(['read:own']));
                  }
                }
              } catch (parseError) {
                addDebugLog(`⚠️ Failed to parse ID token: ${parseError}`);
              }

              // Clean up URL (remove hash)
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              addDebugLog(`🧹 Cleaned URL hash`);
            }
          }

          // Check localStorage for existing tokens
          const storedAccessToken = localStorage.getItem('access_token');
          const storedIdToken = localStorage.getItem('id_token');

          addDebugLog(`🔍 localStorage tokens: accessToken=${!!storedAccessToken}, idToken=${!!storedIdToken}`);

          if (storedAccessToken && storedIdToken) {
            addDebugLog(`✅ Found tokens in localStorage`);
            
            // Validate tokens with backend
            addDebugLog(`📡 Validating tokens with: ${API_BASE_URL}/auth/validate`);
            
            const response = await fetch(`${API_BASE_URL}/auth/validate`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${storedAccessToken}`,
                'Content-Type': 'application/json',
              },
            });

            addDebugLog(`📡 Validation response: ${response.status} ${response.statusText}`);

            if (response.ok) {
              const data = await response.json();
              addDebugLog(`✅ Token validation successful!`);
              addDebugLog(`📦 User: ${data.user?.email || 'unknown'}`);
              
              // Store user data if not already stored
              if (data.user && !localStorage.getItem('user')) {
                const userData = data.user || data.result;
                localStorage.setItem('user', JSON.stringify(userData));
                addDebugLog(`💾 Stored user data in localStorage`);
              }
              
              // CRITICAL: Set authenticated state IMMEDIATELY
              globalAuthChecked = true;
              globalAuthChecking = false;
              globalIsAuthenticated = true;
              setIsAuthenticated(true);
              setIsChecking(false);
              addDebugLog(`🎉 Authentication complete! Rendering app...`);
              
              // Exit early to prevent any redirects
              return;
            } else {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              addDebugLog(`❌ Token validation failed (${response.status}): ${JSON.stringify(errorData)}`);
              addDebugLog(`🔍 Full error details: ${JSON.stringify(errorData, null, 2)}`);
              
              // Clear invalid tokens
              localStorage.removeItem('access_token');
              localStorage.removeItem('id_token');
              localStorage.removeItem('user');
              addDebugLog(`🧹 Cleared invalid tokens from localStorage`);
            }
          } else {
            addDebugLog(`❌ No tokens found in localStorage or URL hash`);
          }
        }

        // If we reach here, user is not authenticated
        addDebugLog(`❌ Authentication failed - redirecting to SSO login`);
        
        // Always redirect to centralized auth service (both dev and prod)
        const authUrl = `https://auth.brmh.in/login?next=${encodeURIComponent(window.location.href)}`;
        addDebugLog(`🔗 Redirecting to: ${authUrl}`);
        
        window.location.href = authUrl;
        return;
      } catch (error) {
        addDebugLog(`❌ Auth check error: ${error}`);
        
        // On error, redirect to SSO login
        const authUrl = `https://auth.brmh.in/login?next=${encodeURIComponent(window.location.href)}`;
        addDebugLog(`🔗 Error occurred, redirecting to: ${authUrl}`);
        
        window.location.href = authUrl;
        return;
      }
      
      globalAuthChecking = false;
      setIsChecking(false);
    };

    checkAuth();
  }, []); // Empty deps - only run once on mount

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

