import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div className="login-bg-orbs">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="login-card glass"
      >
        <div className="login-header">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="logo-brand"
          >
            <div className="logo-circ">
              <ShieldCheck size={28} />
            </div>
            <h2 className="title-gradient">EduBill Admin</h2>
          </motion.div>
          <p>Sign in to manage your academy records</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="error-box"
            >
              {error}
            </motion.div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <div className="input-with-icon">
              <Mail className="ico" size={18} />
              <input
                type="email"
                className="input-field"
                placeholder="admin@edubill.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label>Secure Password</label>
            <div className="input-with-icon">
              <Lock className="ico" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn-primary login-btn"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Signing in...
              </>
            ) : (
              'Access Dashboard'
            )}
          </motion.button>
        </form>

        <footer className="login-footer">
          <p>© 2026 EduBill Management System</p>
          <span className="secure-tag"><Lock size={12} /> SSL Encrypted</span>
        </footer>
      </motion.div>

      <style jsx="true">{`
        .login-page {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        /* Animated background orbs */
        .login-bg-orbs {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 0;
        }

        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.5;
        }

        .login-orb-1 {
          width: 400px;
          height: 400px;
          background: var(--primary);
          top: -10%;
          left: -5%;
          animation: loginFloat1 12s ease-in-out infinite;
        }

        .login-orb-2 {
          width: 350px;
          height: 350px;
          background: var(--accent-purple);
          bottom: -10%;
          right: -5%;
          animation: loginFloat2 15s ease-in-out infinite;
        }

        .login-orb-3 {
          width: 250px;
          height: 250px;
          background: var(--accent-pink);
          top: 40%;
          right: 30%;
          animation: loginFloat3 10s ease-in-out infinite;
        }

        @keyframes loginFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.1); }
        }

        @keyframes loginFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -40px) scale(1.05); }
        }

        @keyframes loginFloat3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(25px, -25px); }
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          padding: 48px 40px;
          background: var(--bg-card);
          box-shadow: var(--shadow-xl), 0 0 80px rgba(37, 99, 235, 0.08);
          border-radius: 28px;
          position: relative;
          z-index: 1;
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          margin-bottom: 14px;
        }

        .logo-circ {
          width: 68px;
          height: 68px;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          color: white;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3);
        }

        .login-header h2 { font-size: 1.75rem; margin: 0; }
        .login-header p { color: var(--text-muted); font-size: 0.92rem; margin-top: 4px; }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .form-group label {
          display: block;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .input-with-icon {
          position: relative;
        }

        .ico {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-light);
          pointer-events: none;
        }

        .input-with-icon .input-field {
          padding-left: 44px;
          padding-right: 44px;
          height: 50px;
          background: var(--bg-secondary);
          border: 1.5px solid var(--border-color);
          border-radius: 14px;
          font-size: 0.95rem;
          width: 100%;
          transition: all 0.2s;
          color: var(--text-main);
        }

        .input-with-icon .input-field:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
          background: var(--bg-card);
        }

        .password-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          color: var(--text-light);
          padding: 4px;
          cursor: pointer;
          border-radius: 6px;
          transition: color 0.2s;
        }

        .password-toggle:hover {
          color: var(--text-main);
        }

        .error-box {
          padding: 14px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--danger);
          border-radius: 12px;
          font-size: 0.85rem;
          text-align: center;
          font-weight: 600;
        }

        .login-btn {
          height: 52px;
          font-size: 1rem;
          font-weight: 700;
          margin-top: 8px;
          border-radius: 14px;
          gap: 10px;
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: 36px;
          text-align: center;
        }

        .login-footer p { font-size: 0.78rem; color: var(--text-muted); margin: 0; }

        .secure-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.68rem;
          color: var(--success);
          font-weight: 700;
          text-transform: uppercase;
          margin-top: 10px;
          padding: 5px 12px;
          background: rgba(16, 185, 129, 0.08);
          border-radius: 20px;
          letter-spacing: 0.04em;
        }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .login-card {
            padding: 36px 24px;
            border-radius: 24px;
          }

          .login-header h2 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
