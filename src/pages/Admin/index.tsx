import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLogin } from './AdminLogin';
import { AdminPanel } from './AdminPanel';
import { useAuth } from '../../contexts/AuthContext';

export const AdminApp = () => {
  const { user, userProfile, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    if (!loading) {
      // If user is authenticated and has admin role, show panel
      if (user && userProfile && (userProfile.role === 'admin' || userProfile.role === 'superadmin')) {
        setShowLogin(false);
      } else {
        setShowLogin(true);
      }
    }
  }, [user, userProfile, loading]);

  const handleLoginSuccess = () => {
    setShowLogin(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/admin/*" 
          element={
            showLogin ? (
              <AdminLogin onSuccess={handleLoginSuccess} />
            ) : (
              <AdminPanel />
            )
          } 
        />
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Router>
  );
};

export default AdminApp;