import { useState, useEffect } from 'react';
import { Lock, ArrowLeft, Mail, LayoutDashboard, Fingerprint } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/30 backdrop-blur-sm rounded-2xl mb-6 border border-blue-400/30 shadow-lg shadow-blue-900/20">
            <LayoutDashboard className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Cloud Kitchen</h1>
          <p className="text-blue-200/80 text-sm">Management Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-100 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-blue-300/70" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-blue-400/30 rounded-xl text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all shadow-inner"
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-100 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Fingerprint className="h-5 w-5 text-blue-300/70" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-blue-400/30 rounded-xl text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all shadow-inner"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Verifying Credentials...</span>
              </div>
            ) : (
              'Access Management Dashboard'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-blue-200/60 leading-relaxed">
            Secure Admin Access • Authorized Personnel Only
          </p>
          <p className="text-xs text-blue-200/40 mt-2">
            © {new Date().getFullYear()} Cloud Kitchen Management
          </p>
        </div>
      </div>
    </div>
  );
};