import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="login-card glass"
      >
        <div className="login-header">
          <div className="logo-brand">
            <div className="logo-circ btn-primary">
              <ShieldCheck size={28} />
            </div>
            <h2 className="title-gradient">EduBill Admin</h2>
          </div>
          <p>Please sign in to manage your academy records</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="error-box">{error}</motion.div>}

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
              />
            </div>
          </div>

          <div className="form-group">
            <label>Secure Password</label>
            <div className="input-with-icon">
              <Lock className="ico" size={18} />
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Access Dashboard'}
          </button>
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
          background-color: var(--bg-main);
          padding: 20px;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          padding: 50px 40px;
          background: white;
          box-shadow: var(--shadow-lg);
          border-radius: 24px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 35px;
        }

        .logo-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
        }

        .logo-circ {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-header h2 { font-size: 1.8rem; margin: 0; }
        .login-header p { color: var(--text-muted); font-size: 0.95rem; margin-top: 5px; }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .input-with-icon {
          position: relative;
        }

        .ico {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .input-with-icon .input-field {
          padding-left: 44px;
          height: 48px;
        }

        .error-box {
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          color: var(--danger);
          border-radius: 10px;
          font-size: 0.85rem;
          text-align: center;
          font-weight: 600;
        }

        .login-btn {
          height: 50px;
          font-size: 1rem;
          font-weight: 700;
          margin-top: 10px;
        }

        .login-footer {
          margin-top: 40px;
          text-align: center;
        }

        .login-footer p { font-size: 0.8rem; color: var(--text-muted); margin: 0; }

        .secure-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          color: var(--success);
          font-weight: 700;
          text-transform: uppercase;
          margin-top: 10px;
          padding: 4px 10px;
          background: #ecfdf5;
          border-radius: 20px;
        }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Login;
