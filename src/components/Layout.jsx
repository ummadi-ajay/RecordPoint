import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  QrCode,
  Menu,
  X,
  ChevronLeft,
  Keyboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearch from './GlobalSearch';
import QRScanner from './QRScanner';

const Layout = ({ children }) => {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const navItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard', shortcut: '1' },
    { path: '/students', icon: <Users size={20} />, label: 'Students', shortcut: '2' },
    { path: '/attendance', icon: <CalendarCheck size={20} />, label: 'Attendance', shortcut: '3' },
    { path: '/invoices', icon: <FileText size={20} />, label: 'Invoices', shortcut: '4' },
    { path: '/quotations', icon: <FileText size={20} />, label: 'Quotations', shortcut: '5' },
    { path: '/insights', icon: <Brain size={20} />, label: 'Insights', shortcut: '6' },
    { path: '/analytics', icon: <TrendingUp size={20} />, label: 'Analytics', shortcut: '7' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Settings', shortcut: '8' },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt + Number for navigation
      if (e.altKey && e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (navItems[idx]) {
          navigate(navItems[idx].path);
          setMobileMenuOpen(false);
        }
      }
      // Alt + S for search focus
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        document.querySelector('.global-search-input')?.focus();
      }
      // Alt + T for theme toggle
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        toggleTheme();
      }
      // Escape closes mobile menu
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, toggleTheme]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getPageTitle = () => {
    const current = navItems.find(item => item.path === location.pathname);
    return current?.label || 'EduBill';
  };

  return (
    <div className={`layout-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mobile-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar glass ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">
              <FileText size={20} />
            </div>
            <h2 className="title-gradient sidebar-brand-text">EduBill</h2>
          </div>
          <button
            className="collapse-btn desktop-only"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft size={16} className={`collapse-icon ${sidebarCollapsed ? 'rotated' : ''}`} />
          </button>
          <button className="close-mobile-btn mobile-only" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="icon">{item.icon}</span>
              <span className="label">{item.label}</span>
              <span className="shortcut-hint label">Alt+{item.shortcut}</span>
              <ChevronRight className="chevron" size={14} />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user label">
            <div className="sidebar-user-avatar">
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">Admin</span>
              <span className="sidebar-user-email">{user?.email || 'admin'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} />
            <span className="label">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header glass">
          <div className="header-left">
            <button className="hamburger-btn mobile-only" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={22} />
            </button>
            <div className="header-title-area mobile-only">
              <h3 className="mobile-page-title">{getPageTitle()}</h3>
            </div>
            <div className="desktop-only search-area">
              <GlobalSearch />
            </div>
          </div>
          <div className="header-right">
            <button className="header-btn" onClick={() => setShowQRScanner(true)} title="Scan QR Code">
              <QrCode size={20} />
            </button>
            <button className="header-btn" onClick={toggleTheme} title={`Switch to ${isDark ? 'light' : 'dark'} mode (Alt+T)`}>
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="user-profile desktop-only">
              <div className="user-info">
                <p className="u-greeting">{getGreeting()} 👋</p>
                <p className="u-role">System Administrator</p>
              </div>
              <div className="avatar">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
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
          font-family: 'Outfit', sans-serif;
        }

        /* Sidebar */
        .sidebar {
          width: 280px;
          height: calc(100vh - 40px);
          margin: 20px 0 20px 20px;
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          border-radius: 24px;
          position: fixed;
          left: 0;
          z-index: 100;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .sidebar-collapsed .sidebar {
          width: 80px;
          padding: 24px 12px;
        }

        .sidebar-collapsed .sidebar-brand-text,
        .sidebar-collapsed .label,
        .sidebar-collapsed .chevron,
        .sidebar-collapsed .sidebar-user {
          display: none;
        }

        .sidebar-collapsed .logo-container {
          justify-content: center;
        }

        .sidebar-collapsed .nav-link {
          justify-content: center;
          padding: 14px;
        }

        .sidebar-collapsed .logout-btn {
          justify-content: center;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          padding: 0 6px;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .sidebar h2 {
          font-size: 1.4rem;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        .collapse-btn {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          cursor: pointer;
          border: 1px solid var(--border-color);
        }

        .collapse-btn:hover {
          background: var(--bg-hover);
          color: var(--primary);
        }

        .collapse-icon {
          transition: transform 0.3s ease;
        }

        .collapse-icon.rotated {
          transform: rotate(180deg);
        }

        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          scrollbar-width: thin;
          padding: 0 2px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 14px;
          color: var(--text-muted);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 600;
          font-size: 0.9rem;
          position: relative;
          white-space: nowrap;
        }

        .nav-link:hover {
          color: var(--text-main);
          background: var(--bg-hover);
          transform: translateX(3px);
        }

        .nav-link.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
          transform: none;
        }

        .nav-link.active .icon { color: white; }
        .nav-link.active .chevron { color: white; opacity: 1; }
        .nav-link.active .shortcut-hint { color: rgba(255,255,255,0.6); }

        .shortcut-hint {
          margin-left: auto;
          font-size: 0.65rem;
          color: var(--text-light);
          font-weight: 500;
          letter-spacing: 0.02em;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .nav-link:hover .shortcut-hint {
          opacity: 1;
        }

        .chevron {
          margin-left: auto;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .nav-link:hover .chevron { opacity: 0.5; }

        /* Sidebar Footer */
        .sidebar-footer {
          margin-top: auto;
          padding: 16px 4px 0;
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: 12px;
          background: var(--bg-secondary);
        }

        .sidebar-user-avatar {
          width: 34px;
          height: 34px;
          min-width: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--accent-purple), var(--primary));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .sidebar-user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sidebar-user-name {
          font-weight: 700;
          font-size: 0.8rem;
          color: var(--text-main);
        }

        .sidebar-user-email {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          color: var(--danger);
          background: transparent;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: #fee2e2;
        }
        
        [data-theme="dark"] .logout-btn:hover { background: rgba(239, 68, 68, 0.15); }

        /* Main Content */
        .main-content {
          flex: 1;
          margin-left: 320px;
          padding: 20px 30px 40px;
          max-width: 1600px;
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-collapsed .main-content {
          margin-left: 120px;
        }

        /* Header */
        .top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          margin-bottom: 28px;
          border-radius: 20px;
          transition: all 0.3s ease;
          gap: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .search-area {
          flex: 1;
          max-width: 400px;
        }

        .header-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: var(--bg-card);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .header-btn:hover {
          color: var(--primary);
          border-color: var(--primary);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transform: translateY(-1px);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 14px 6px 16px;
          border-radius: 14px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: all 0.2s;
        }

        .user-profile:hover {
          border-color: var(--primary);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .u-greeting { font-weight: 700; font-size: 0.85rem; margin: 0; color: var(--text-main); }
        .u-role { font-size: 0.72rem; color: var(--text-muted); margin: 0; }
        
        .avatar {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, var(--accent-purple), var(--primary));
          color: white;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          font-size: 0.9rem;
        }

        /* Mobile controls */
        .hamburger-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: var(--bg-card);
          color: var(--text-main);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-color);
          cursor: pointer;
          flex-shrink: 0;
        }

        .mobile-page-title {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
          white-space: nowrap;
        }

        .close-mobile-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--bg-secondary);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 99;
        }

        /* Responsive utilities */
        .mobile-only { display: none; }
        .desktop-only { display: flex; }

        /* Tablet */
        @media (max-width: 1024px) {
          .sidebar:not(.mobile-open) {
            width: 80px;
            padding: 20px 12px;
          }
          
          .sidebar:not(.mobile-open) .sidebar-brand-text,
          .sidebar:not(.mobile-open) .label,
          .sidebar:not(.mobile-open) .chevron,
          .sidebar:not(.mobile-open) .sidebar-user,
          .sidebar:not(.mobile-open) .collapse-btn {
            display: none;
          }
          
          .sidebar:not(.mobile-open) .logo-container {
            justify-content: center;
          }
          
          .sidebar:not(.mobile-open) .nav-link {
            justify-content: center;
            padding: 14px;
          }
          
          .sidebar:not(.mobile-open) .logout-btn {
            justify-content: center;
          }
          
          .main-content {
            margin-left: 110px;
            padding: 20px;
          }
          
          .sidebar-collapsed .main-content {
            margin-left: 110px;
          }
          
          .user-info { display: none; }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .mobile-only { display: flex; }
          .desktop-only { display: none !important; }

          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: 300px;
            height: 100vh;
            margin: 0;
            border-radius: 0 24px 24px 0;
            transform: translateX(-110%);
            transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 200;
          }

          .sidebar.mobile-open {
            transform: translateX(0);
          }

          .sidebar.mobile-open .label,
          .sidebar.mobile-open .sidebar-brand-text,
          .sidebar.mobile-open .sidebar-user {
            display: flex;
          }

          .sidebar.mobile-open .chevron {
            display: block;
          }

          .main-content {
            margin-left: 0;
            padding: 12px 16px 30px;
          }

          .sidebar-collapsed .main-content {
            margin-left: 0;
          }

          .top-header {
            padding: 12px 16px;
            border-radius: 16px;
            margin-bottom: 20px;
          }

          .collapse-btn { display: none; }
        }

        /* Tiny screens */
        @media (max-width: 400px) {
          .header-right .header-btn:first-child {
            display: none;
          }
          
          .user-profile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
