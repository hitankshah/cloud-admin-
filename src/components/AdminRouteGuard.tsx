import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'superadmin';
}

export const AdminRouteGuard = ({ children, requiredRole = 'admin' }: AdminRouteGuardProps) => {
  const { user, userProfile, loading } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || !userProfile) {
        setHasAccess(false);
        return;
      }

      // Check if user has required role
      if (requiredRole === 'superadmin') {
        setHasAccess(userProfile.role === 'superadmin');
      } else {
        setHasAccess(userProfile.role === 'admin' || userProfile.role === 'superadmin');
      }
    }
  }, [user, userProfile, loading, requiredRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don&apos;t have permission to access this page.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const useAdminPermissions = () => {
  const { userProfile } = useAuth();

  const hasPermission = (requiredRole: 'admin' | 'superadmin'): boolean => {
    if (!userProfile) return false;

    if (requiredRole === 'superadmin') {
      return userProfile.role === 'superadmin';
    }

    return userProfile.role === 'admin' || userProfile.role === 'superadmin';
  };

  return { hasPermission };
};