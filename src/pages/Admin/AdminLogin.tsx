import { useState, useEffect } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

interface AdminLoginProps {
  onSuccess: () => void;
}

export const AdminLogin = ({ onSuccess }: AdminLoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, userProfile } = useAuth();
  const { addNotification } = useNotification();

  // Redirect if already logged in as admin
  useEffect(() => {
    if (userProfile?.role === 'admin') {
      onSuccess();
    }
  }, [userProfile, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Frontend validation
    if (!email || !password) {
      addNotification('Please enter both email and password', 'error');
      return;
    }

    if (password.length < 6) {
      addNotification('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);

    try {
      // signIn now handles admin validation automatically
      await signIn(email, password);
      
      // If we get here, user is authenticated and is an admin
      addNotification('Welcome back, Admin!', 'success');
      onSuccess();
      
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      // Handle specific error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Invalid email or password')) {
        addNotification('Invalid email or password', 'error');
      } else if (errorMessage.includes('Access denied') || errorMessage.includes('Admin credentials required')) {
        addNotification('Access denied. Admin privileges required.', 'error');
      } else if (errorMessage.includes('Email not confirmed')) {
        addNotification('Please verify your email address first', 'error');
      } else if (errorMessage.includes('Too many attempts')) {
        addNotification('Too many login attempts. Please wait a moment.', 'error');
      } else {
        addNotification(errorMessage || 'Login failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/20">
        <button
          onClick={handleBackToHome}
          className="absolute top-6 left-6 flex items-center space-x-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="text-center mb-10 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 border border-white/30">
            <Lock className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
          <p className="text-white/70 text-sm">Management Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                placeholder="admin@example.com"
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                placeholder="Enter your password"
                required
                minLength={6}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white/20 backdrop-blur-sm text-white py-4 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl border border-white/30 hover:border-white/50"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Verifying Credentials...</span>
              </div>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-white/50 leading-relaxed">
            Secure Admin Access • Authorized Personnel Only
          </p>
          <p className="text-xs text-white/30 mt-2">
            All login attempts are monitored and logged
          </p>
        </div>
      </div>
    </div>
  );
};