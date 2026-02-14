import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, FileText, Calendar, TrendingUp, Settings, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

const GlobalSearch = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ students: [], invoices: [] });
    const [students, setStudents] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Quick actions
    const quickActions = [
        { label: 'Go to Dashboard', icon: <TrendingUp size={18} />, path: '/' },
        { label: 'Add Student', icon: <User size={18} />, path: '/students' },
        { label: 'Log Attendance', icon: <Calendar size={18} />, path: '/attendance' },
        { label: 'Generate Invoice', icon: <FileText size={18} />, path: '/invoices' },
        { label: 'Analytics', icon: <TrendingUp size={18} />, path: '/analytics' },
        { label: 'Settings', icon: <Settings size={18} />, path: '/settings' },
    ];

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                const sSnap = await getDocs(collection(db, 'students'));
                setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                const iSnap = await getDocs(collection(db, 'invoices'));
                setInvoices(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error(err);
            }
        };
        loadData();
    }, []);

    // Keyboard shortcut to open
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Cmd+K or Ctrl+K to open
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            // Escape to close
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Search logic
    useEffect(() => {
        if (!query.trim()) {
            setResults({ students: [], invoices: [] });
            return;
        }

        const q = query.toLowerCase();

        const matchedStudents = students.filter(s =>
            s.name?.toLowerCase().includes(q) ||
            s.parentName?.toLowerCase().includes(q) ||
            s.phone?.includes(q)
        ).slice(0, 5);

        const matchedInvoices = invoices.filter(i =>
            i.studentSnapshot?.name?.toLowerCase().includes(q) ||
            i.id.toLowerCase().includes(q)
        ).slice(0, 5);

        setResults({ students: matchedStudents, invoices: matchedInvoices });
        setSelectedIndex(0);
    }, [query, students, invoices]);

    const handleSelect = (type, item) => {
        setIsOpen(false);
        setQuery('');

        if (type === 'student') {
            navigate('/students');
        } else if (type === 'invoice') {
            window.open(`/invoice/${item.id}`, '_blank');
        } else if (type === 'action') {
            navigate(item.path);
        }
    };

    const allResults = [
        ...results.students.map(s => ({ type: 'student', item: s })),
        ...results.invoices.map(i => ({ type: 'invoice', item: i })),
        ...(query ? [] : quickActions.map(a => ({ type: 'action', item: a })))
    ];

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, allResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && allResults[selectedIndex]) {
            const selected = allResults[selectedIndex];
            handleSelect(selected.type, selected.item);
        }
    };

    return (
        <>
            {/* Search Trigger Button */}
            <button className="search-trigger" onClick={() => setIsOpen(true)}>
                <Search size={18} />
                <span>Search...</span>
                <kbd>⌘K</kbd>
            </button>

            {/* Search Modal */}
            <AnimatePresence>
                {isOpen && (
                    <div className="search-overlay" onClick={() => setIsOpen(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.15 }}
                            className="search-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="search-header">
                                <Search size={20} className="search-icon" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search students, invoices, or type a command..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                <button className="close-btn" onClick={() => setIsOpen(false)}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="search-results">
                                {!query && (
                                    <div className="result-section">
                                        <div className="section-label">Quick Actions</div>
                                        {quickActions.map((action, idx) => (
                                            <div
                                                key={action.path}
                                                className={`result-item ${selectedIndex === idx ? 'selected' : ''}`}
                                                onClick={() => handleSelect('action', action)}
                                            >
                                                <div className="result-icon action">{action.icon}</div>
                                                <span>{action.label}</span>
                                                <ArrowRight size={14} className="arrow" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {results.students.length > 0 && (
                                    <div className="result-section">
                                        <div className="section-label">Students</div>
                                        {results.students.map((student, idx) => (
                                            <div
                                                key={student.id}
                                                className={`result-item ${selectedIndex === idx ? 'selected' : ''}`}
                                                onClick={() => handleSelect('student', student)}
                                            >
                                                <div className="result-icon student">
                                                    {student.photo ? (
                                                        <img src={student.photo} alt="" />
                                                    ) : (
                                                        student.name?.[0]
                                                    )}
                                                </div>
                                                <div className="result-info">
                                                    <strong>{student.name}</strong>
                                                    <span>{student.parentName} • {student.phone}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {results.invoices.length > 0 && (
                                    <div className="result-section">
                                        <div className="section-label">Invoices</div>
                                        {results.invoices.map((invoice, idx) => (
                                            <div
                                                key={invoice.id}
                                                className={`result-item ${selectedIndex === results.students.length + idx ? 'selected' : ''}`}
                                                onClick={() => handleSelect('invoice', invoice)}
                                            >
                                                <div className="result-icon invoice">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="result-info">
                                                    <strong>#{invoice.id.slice(-8).toUpperCase()}</strong>
                                                    <span>{invoice.studentSnapshot?.name} • ₹{invoice.totalAmount?.toLocaleString()}</span>
                                                </div>
                                                <span className={`status-badge ${invoice.status?.toLowerCase()}`}>
                                                    {invoice.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {query && results.students.length === 0 && results.invoices.length === 0 && (
                                    <div className="no-results">
                                        <Search size={40} />
                                        <p>No results for "{query}"</p>
                                    </div>
                                )}
                            </div>

                            <div className="search-footer">
                                <span><kbd>↑↓</kbd> Navigate</span>
                                <span><kbd>↵</kbd> Select</span>
                                <span><kbd>esc</kbd> Close</span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx="true">{`
        .search-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          color: var(--text-muted);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .search-trigger:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .search-trigger kbd {
          background: var(--bg-card);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid var(--border-color);
        }

        .search-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 100px;
          z-index: 9999;
        }

        .search-modal {
          width: 100%;
          max-width: 600px;
          background: var(--bg-card);
          border-radius: 16px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .search-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .search-icon { color: var(--text-muted); }

        .search-header input {
          flex: 1;
          border: none;
          background: none;
          font-size: 1.1rem;
          color: var(--text-main);
          outline: none;
        }

        .search-header input::placeholder { color: var(--text-muted); }

        .close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-results {
          max-height: 400px;
          overflow-y: auto;
          padding: 10px;
        }

        .result-section { margin-bottom: 15px; }

        .section-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 8px 12px;
        }

        .result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .result-item:hover, .result-item.selected {
          background: var(--bg-secondary);
        }

        .result-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          overflow: hidden;
        }

        .result-icon.action { background: rgba(79, 70, 229, 0.1); color: var(--primary); }
        .result-icon.student { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .result-icon.invoice { background: rgba(16, 185, 129, 0.1); color: #10b981; }

        .result-icon img { width: 100%; height: 100%; object-fit: cover; }

        .result-info { flex: 1; }
        .result-info strong { display: block; font-size: 0.95rem; }
        .result-info span { font-size: 0.8rem; color: var(--text-muted); }

        .arrow { color: var(--text-muted); margin-left: auto; }

        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-badge.paid { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-badge.unpaid { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

        .no-results {
          text-align: center;
          padding: 40px;
          color: var(--text-muted);
        }

        .no-results svg { margin-bottom: 15px; opacity: 0.3; }

        .search-footer {
          display: flex;
          gap: 20px;
          padding: 12px 20px;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .search-footer kbd {
          background: var(--bg-card);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          margin-right: 5px;
          border: 1px solid var(--border-color);
        }
      `}</style>
        </>
    );
};

export default GlobalSearch;
