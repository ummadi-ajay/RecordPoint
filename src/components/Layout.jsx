import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Users,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  TrendingUp,
  Settings,
  Moon,
  Sun,
  Brain,
  QrCode
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearch from './GlobalSearch';
import QRScanner from './QRScanner';

const Layout = ({ children }) => {
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showQRScanner, setShowQRScanner] = useState(false);

  const navItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/students', icon: <Users size={20} />, label: 'Students' },
    { path: '/attendance', icon: <CalendarCheck size={20} />, label: 'Attendance' },
    { path: '/invoices', icon: <FileText size={20} />, label: 'Invoices' },
    { path: '/quotations', icon: <Brain size={20} />, label: 'Quotations' },
    { path: '/insights', icon: <Brain size={20} />, label: 'Insights' },
    { path: '/analytics', icon: <TrendingUp size={20} />, label: 'Analytics' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="layout-container">
      <aside className="sidebar glass">
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon btn-primary">
              <FileText size={20} />
            </div>
            <h2 className="title-gradient">EduBill</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              <span className="label">{item.label}</span>
              <ChevronRight className="chevron" size={14} />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header glass">
          <div className="header-left">
            <GlobalSearch />
          </div>
          <div className="header-right">
            <button className="header-btn" onClick={() => setShowQRScanner(true)} title="Scan QR Code">
              <QrCode size={20} />
            </button>
            <button className="header-btn" onClick={toggleTheme} title="Toggle Theme">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="user-profile">
              <div className="user-info">
                <p className="u-name">System Administrator</p>
                <p className="u-role">Main Branch</p>
              </div>
              <div className="avatar">A</div>
            </div>
          </div>
        </header>
        <section className="content-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      {/* QR Scanner Modal */}
      <QRScanner isOpen={showQRScanner} onClose={() => setShowQRScanner(false)} />

      <style jsx="true">{`
        .layout-container {
          display: flex;
          min-height: 100vh;
          /* background-color: var(--bg-main); Removed to show body gradient */
          font-family: 'Outfit', sans-serif;
        }

        .sidebar {
          width: 280px;
          height: calc(100vh - 40px);
          margin: 20px 0 20px 20px;
          display: flex;
          flex-direction: column;
          padding: 30px 20px;
          border-radius: 24px;
          position: fixed;
          left: 0;
          z-index: 50;
          transition: all 0.3s ease;
        }

        .sidebar-header {
          margin-bottom: 30px;
          padding: 0 10px;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .logo-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
        }

        .sidebar h2 { font-size: 1.5rem; letter-spacing: -0.02em; }

        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          scrollbar-width: thin;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border-radius: 16px;
          color: var(--text-muted);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 600;
          font-size: 0.95rem;
          margin: 0 5px;
        }

        .nav-link:hover {
          color: var(--text-main);
          background: var(--bg-hover);
          transform: translateX(4px);
        }

        .nav-link.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
        }

        .nav-link.active .icon { color: white; }
        .nav-link.active .chevron { color: white; opacity: 1; }

        .chevron {
            margin-left: auto;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .sidebar-footer {
          margin-top: auto;
          padding: 20px 10px 0;
          border-top: 1px solid var(--border-color);
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-radius: 12px;
          color: var(--danger);
          background: transparent;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .logout-btn:hover {
          background: #fee2e2;
        }
        
        [data-theme="dark"] .logout-btn:hover { background: rgba(239, 68, 68, 0.15); }

        .main-content {
          flex: 1;
          margin-left: 320px;
          padding: 20px 30px 40px;
          max-width: 1600px;
        }

        .top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          margin-bottom: 30px;
          border-radius: 20px;
          transition: all 0.3s ease;
        }

        .header-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--bg-card);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid var(--border-color);
        }

        .header-btn:hover {
          color: var(--primary);
          border-color: var(--primary);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 6px 12px;
          border-radius: 14px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          cursor: pointer;
        }

        .u-name { font-weight: 700; font-size: 0.9rem; margin: 0; }
        .u-role { font-size: 0.75rem; color: var(--text-muted); margin: 0; }
        
        .avatar {
            width: 36px; height: 36px;
            background: linear-gradient(135deg, var(--accent-purple), var(--primary));
            color: white;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 700;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        @media (max-width: 1024px) {
          .sidebar { width: 80px; padding: 20px 12px; }
          .sidebar h2, .label, .chevron, .sidebar-footer span, .user-info { display: none; }
          .logo-icon { width: 40px; height: 40px; }
          .main-content { margin-left: 110px; padding: 20px; }
          .nav-link { justify-content: center; padding: 14px; }
          .logout-btn { justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default Layout;
