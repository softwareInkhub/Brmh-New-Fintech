"use client";
import { useEffect } from "react";

export default function LoginSignupPage() {
  useEffect(() => {
    // Always redirect to centralized SSO login (both dev and prod)
    const nextUrl = encodeURIComponent(window.location.origin);
    const loginUrl = `https://auth.brmh.in/login?next=${nextUrl}`;

    console.log('[Fintech Login] Redirecting to SSO:', loginUrl);
    window.location.href = loginUrl;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">BRMH Fintech</h1>
          <p className="text-gray-600">Secure Single Sign-On</p>
        </div>

        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 mb-2">Redirecting to SSO login...</p>
        <p className="text-sm text-gray-500">You will be redirected to auth.brmh.in</p>

        <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs text-blue-900">
            🔐 This app uses centralized authentication for secure access across all BRMH services.
          </p>
        </div>
      </div>
    </div>
  );
}
