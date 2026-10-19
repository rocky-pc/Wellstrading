import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-[#070b14] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
