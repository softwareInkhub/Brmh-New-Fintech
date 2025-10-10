'use client';

import { useEffect, useState } from 'react';

interface TestResult {
  name: string;
  passed: boolean;
  details: Record<string, unknown>;
}

interface TestResults {
  environment: Record<string, unknown>;
  tests: TestResult[];
}

export default function TestCookiesPage() {
  const [results, setResults] = useState<TestResults>({
    environment: {},
    tests: [],
  });
  const [testing, setTesting] = useState(true);

  useEffect(() => {
    const runTests = async () => {
      const isProduction = window.location.hostname.includes('brmh.in') && !window.location.hostname.includes('localhost');
      const API_BASE_URL = isProduction 
        ? (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://brmh.in')
        : 'http://localhost:5001';

      const testResults: TestResults = {
        environment: {
          hostname: window.location.hostname,
          isProduction,
          apiBaseUrl: API_BASE_URL,
        },
        tests: [],
      };

      // Test 1: Client-readable cookies
      console.log('[Test 1] Checking client-readable cookies...');
      const clientCookies = document.cookie;
      const hasAuthValid = clientCookies.includes('auth_valid=true');
      testResults.tests.push({
        name: 'Client-readable cookies',
        passed: hasAuthValid || !isProduction,
        details: { cookies: clientCookies, hasAuthValid },
      });

      // Test 2: /auth/me with credentials
      console.log('[Test 2] Testing /auth/me endpoint...');
      try {
        const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });

        const meData = meResponse.ok ? await meResponse.json() : await meResponse.text();
        testResults.tests.push({
          name: '/auth/me endpoint',
          passed: meResponse.ok,
          details: {
            status: meResponse.status,
            ok: meResponse.ok,
            data: meData,
          },
        });

        // Test 3: Role check from brmh-users table
        if (meResponse.ok && meData.user && meData.user['cognito:username']) {
          console.log('[Test 3] Testing brmh-users table access...');
          const cognitoUsername = meData.user['cognito:username'];
          
          try {
            const roleResponse = await fetch(`${API_BASE_URL}/crud?tableName=brmh-users&FilterExpression=cognitoUsername = :username&:username=${cognitoUsername}`, {
              credentials: 'include',
            });

            const roleData = roleResponse.ok ? await roleResponse.json() : await roleResponse.text();
            testResults.tests.push({
              name: 'brmh-users table access',
              passed: roleResponse.ok && roleData.items && roleData.items.length > 0,
              details: {
                status: roleResponse.status,
                ok: roleResponse.ok,
                data: roleData,
                fintechRole: roleData.items?.[0]?.namespaceRoles?.fintech,
              },
            });
          } catch (roleError) {
            testResults.tests.push({
              name: 'brmh-users table access',
              passed: false,
              details: { error: roleError instanceof Error ? roleError.message : String(roleError) },
            });
          }
        }
      } catch (meError) {
        testResults.tests.push({
          name: '/auth/me endpoint',
          passed: false,
          details: { error: meError instanceof Error ? meError.message : String(meError) },
        });
      }

      setResults(testResults);
      setTesting(false);
    };

    runTests();
  }, []);

  const getTestIcon = (passed: boolean) => {
    return passed ? '✅' : '❌';
  };

  if (testing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Running authentication tests...</p>
        </div>
      </div>
    );
  }

  const allPassed = results.tests?.every((t: TestResult) => t.passed) ?? false;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">🧪 Cookie & Auth Tests</h1>
            <p className="text-gray-600 mt-2">Testing authentication flow and cookie functionality</p>
          </div>

          {/* Summary */}
          <div className={`p-4 rounded-lg mb-6 ${allPassed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-3">
              <div className="text-3xl">{allPassed ? '✅' : '❌'}</div>
              <div>
                <h2 className="text-xl font-semibold">{allPassed ? 'All tests passed!' : 'Some tests failed'}</h2>
                <p className="text-sm text-gray-600">
                  {results.tests?.filter((t: TestResult) => t.passed).length || 0} / {results.tests?.length || 0} tests passed
                </p>
              </div>
            </div>
          </div>

          {/* Environment */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Environment</h2>
            <div className="bg-gray-50 p-4 rounded">
              <pre className="text-sm overflow-auto">{JSON.stringify(results.environment, null, 2)}</pre>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test Results</h2>
            {results.tests?.map((test: TestResult, index: number) => (
              <div
                key={index}
                className={`border-l-4 pl-4 py-3 ${test.passed ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getTestIcon(test.passed)}</span>
                  <h3 className="font-semibold text-lg">{test.name}</h3>
                </div>
                <div className="bg-white p-3 rounded text-sm">
                  <pre className="overflow-auto max-h-96">{JSON.stringify(test.details, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 p-4 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Quick Actions</h3>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                🔄 Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                🏠 Go to Homepage
              </button>
              <button
                onClick={() => window.location.href = 'https://auth.brmh.in/login?next=' + encodeURIComponent(window.location.origin)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                🔐 Go to SSO Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

