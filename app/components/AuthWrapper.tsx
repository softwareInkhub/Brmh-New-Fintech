'use client';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  // AuthGuard now handles all authentication
  // This component is just a passthrough wrapper for backward compatibility
  return <>{children}</>;
} 