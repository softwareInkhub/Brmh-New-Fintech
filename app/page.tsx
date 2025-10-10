'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Global singleton to prevent multiple redirects
let globalHasRedirected = false;

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Only redirect once using global flag
    if (globalHasRedirected) return;
    globalHasRedirected = true;
    
    // Use replace instead of push to avoid browser history issues
    router.replace('/dashboard');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run once only (router is stable)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
   </div>
  );
}
