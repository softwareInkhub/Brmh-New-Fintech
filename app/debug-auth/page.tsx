'use client';

import { useEffect, useState } from 'react';

interface DebugInfo {
  environment: Record<string, unknown>;
  localStorage: Record<string, unknown>;
  cookies: Record<string, unknown>;
  urlHash: string;
  authMeEndpoint?: Record<string, unknown>;
  authValidateEndpoint?: Record<string, unknown>;
  brmhUsersEndpoint?: Record<string, unknown>;
}

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    environment: {},
    localStorage: {},
    cookies: {},
    urlHash: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gatherDebugInfo = async () => {
      const isProduction = window.location.hostname.includes('brmh.in') && !window.location.hostname.includes('localhost');
      const API_BASE_URL = isProduction 
        ? (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://brmh.in')
        : 'http://localhost:5001';

      const info: DebugInfo = {
        environment: {
          hostname: window.location.hostname,
          href: window.location.href,
          isProduction,
          apiBaseUrl: API_BASE_URL,
        },
        localStorage: {
          access_token: !!localStorage.getItem('access_token'),
          id_token: !!localStorage.getItem('id_token'),
          user_id: localStorage.getItem('userId'),
          user_email: localStorage.getItem('user_email'),
          user_name: localStorage.getItem('user_name'),
          cognitoUsername: localStorage.getItem('cognitoUsername'),
          userRole: localStorage.getItem('userRole'),
          userPermissions: localStorage.getItem('userPermissions'),
        },
        cookies: {
          auth_valid: document.cookie.includes('auth_valid=true'),
          allCookies: document.cookie,
        },
        urlHash: window.location.hash,
      };

      // Test /auth/me endpoint
      try {
        const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include',
        });
        info.authMeEndpoint = {
          status: meResponse.status,
          ok: meResponse.ok,
          data: meResponse.ok ? await meResponse.json() : await meResponse.text(),
        };
      } catch (error) {
        info.authMeEndpoint = {
          error: error instanceof Error ? error.message : String(error),
        };
      }

      // Test /auth/validate endpoint (if we have access token)
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        try {
          const validateResponse = await fetch(`${API_BASE_URL}/auth/validate`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          info.authValidateEndpoint = {
            status: validateResponse.status,
            ok: validateResponse.ok,
            data: validateResponse.ok ? await validateResponse.json() : await validateResponse.text(),
          };
        } catch (error) {
          info.authValidateEndpoint = {
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      // Test brmh-users table access
      const cognitoUsername = localStorage.getItem('cognitoUsername');
      if (cognitoUsername) {
        try {
          const roleResponse = await fetch(`${API_BASE_URL}/crud?tableName=brmh-users&FilterExpression=cognitoUsername = :username&:username=${cognitoUsername}`, {
            credentials: 'include',
          });
          info.brmhUsersEndpoint = {
            status: roleResponse.status,
            ok: roleResponse.ok,
            data: roleResponse.ok ? await roleResponse.json() : await roleResponse.text(),
          };
        } catch (error) {
          info.brmhUsersEndpoint = {
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      setDebugInfo(info);
      setLoading(false);
    };

    gatherDebugInfo();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    alert('Debug info copied to clipboard!');
  };

  const clearStorage = () => {
    if (confirm('Clear all localStorage data?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading debug info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">🔍 Fintech Auth Debug</h1>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                📋 Copy Debug Info
              </button>
              <button
                onClick={clearStorage}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                🗑️ Clear Storage
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Environment */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h2 className="text-xl font-semibold mb-3">Environment</h2>
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugInfo.environment, null, 2)}
              </pre>
            </div>

            {/* LocalStorage */}
            <div className="border-l-4 border-green-500 pl-4">
              <h2 className="text-xl font-semibold mb-3">LocalStorage</h2>
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugInfo.localStorage, null, 2)}
              </pre>
            </div>

            {/* Cookies */}
            <div className="border-l-4 border-yellow-500 pl-4">
              <h2 className="text-xl font-semibold mb-3">Cookies</h2>
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugInfo.cookies, null, 2)}
              </pre>
            </div>

            {/* /auth/me Endpoint */}
            <div className="border-l-4 border-purple-500 pl-4">
              <h2 className="text-xl font-semibold mb-3">/auth/me Endpoint</h2>
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(debugInfo.authMeEndpoint, null, 2)}
              </pre>
            </div>

            {/* /auth/validate Endpoint */}
            {debugInfo.authValidateEndpoint && (
              <div className="border-l-4 border-indigo-500 pl-4">
                <h2 className="text-xl font-semibold mb-3">/auth/validate Endpoint</h2>
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-96">
                  {JSON.stringify(debugInfo.authValidateEndpoint, null, 2)}
                </pre>
              </div>
            )}

            {/* brmh-users Table */}
            {debugInfo.brmhUsersEndpoint && (
              <div className="border-l-4 border-pink-500 pl-4">
                <h2 className="text-xl font-semibold mb-3">brmh-users Table (Role Check)</h2>
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-96">
                  {JSON.stringify(debugInfo.brmhUsersEndpoint, null, 2)}
                </pre>
              </div>
            )}

            {/* URL Hash */}
            {debugInfo.urlHash && (
              <div className="border-l-4 border-red-500 pl-4">
                <h2 className="text-xl font-semibold mb-3">URL Hash</h2>
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
                  {debugInfo.urlHash}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Quick Actions</h3>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.href = 'https://auth.brmh.in/login?next=' + encodeURIComponent(window.location.origin)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                🔐 Go to SSO Login
              </button>
              <button
                onClick={() => window.location.href = window.location.origin}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                🏠 Go to Homepage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

