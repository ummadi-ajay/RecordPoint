import React, { useState, useEffect } from 'react';
import {
    Save,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCcw,
    Plus,
    Trash2,
    Calendar,
    Clock,
    ChevronDown,
    ChevronUp,
    CalendarPlus,
    MapPin,
    BookOpen,
    Zap
} from 'lucide-react';
import {
    collection,
    getDocs,
    doc,
    setDoc,
    query,
    where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, addMonths, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// Course pricing
const COURSE_PRICING = {
    'Beginner': 999,
    'Intermediate': 1499,
    'Advanced': 1499
};

// Default location
const DEFAULT_LOCATION = 'MAKER WORKS';

// Quick topic presets
const TOPIC_PRESETS = [
    'Micro Bit Intro',
    'Micro Bit',
    'Arduino Intro',
    'Arduino',
    'Sensors',
    'Motors',
    'LEDs & Display',
    'Coding',
    'Robotics',
    'Project Work',
    '3D Printing',
    'Electronics'
];

const Attendance = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [students, setStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [expandedStudent, setExpandedStudent] = useState(null);
    const [addingSession, setAddingSession] = useState(null);
    const [quickPickStudent, setQuickPickStudent] = useState(null);

    // New session form
    const [sessionForm, setSessionForm] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        location: DEFAULT_LOCATION,
        topic: ''
    });

    const monthStr = format(currentDate, 'MM');
    const yearStr = format(currentDate, 'yyyy');
    const displayMonth = format(currentDate, 'MMMM yyyy');
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const sSnapshot = await getDocs(collection(db, 'students'));
            const sList = sSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(sList);

            const aSnapshot = await getDocs(
                query(
                    collection(db, 'monthly_attendance'),
                    where('month', '==', monthStr),
                    where('year', '==', yearStr)
                )
            );

            const aData = {};
            aSnapshot.forEach(doc => {
                const data = doc.data();
                aData[data.studentId] = {
                    sessions: data.sessions || [],
                    classCount: data.classCount || 0
                };
            });
            setAttendanceData(aData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Quick add with preset topic
    const quickAddWithTopic = (studentId, topic) => {
        const session = {
            date: todayStr,
            location: DEFAULT_LOCATION,
            topic: topic
        };
        addSession(studentId, session);
        setQuickPickStudent(null);
    };

    // Add session with full details
    const addSession = (studentId, session) => {
        setAttendanceData(prev => {
            const current = prev[studentId] || { sessions: [], classCount: 0 };
            const newSessions = [...current.sessions, session].sort((a, b) =>
                new Date(a.date) - new Date(b.date)
            );
            return {
                ...prev,
                [studentId]: {
                    sessions: newSessions,
                    classCount: newSessions.length
                }
            };
        });
        setAddingSession(null);
        setSessionForm({
            date: format(new Date(), 'yyyy-MM-dd'),
            location: DEFAULT_LOCATION,
            topic: ''
        });
    };

    // Remove specific session
    const removeSession = (studentId, sessionIndex) => {
        setAttendanceData(prev => {
            const current = prev[studentId] || { sessions: [], classCount: 0 };
            const newSessions = current.sessions.filter((_, i) => i !== sessionIndex);
            return {
                ...prev,
                [studentId]: {
                    sessions: newSessions,
                    classCount: newSessions.length
                }
            };
        });
    };

    const saveAttendance = async () => {
        setSaving(true);
        setStatus(null);
        try {
            const promises = students.map(student => {
                const data = attendanceData[student.id] || { sessions: [], classCount: 0 };
                const docId = `${student.id}_${monthStr}_${yearStr}`;
                return setDoc(doc(db, 'monthly_attendance', docId), {
                    studentId: student.id,
                    month: monthStr,
                    year: yearStr,
                    sessions: data.sessions,
                    classCount: data.classCount,
                    updatedAt: new Date().toISOString()
                });
            });

            await Promise.all(promises);
            setStatus({ type: 'success', message: 'Saved!' });
            setTimeout(() => setStatus(null), 3000);
        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: 'Failed to save.' });
        } finally {
            setSaving(false);
        }
    };

    const toggleExpand = (studentId) => {
        setExpandedStudent(expandedStudent === studentId ? null : studentId);
    };

    const openAddSession = (studentId, studentCourse) => {
        setAddingSession(studentId);
        setQuickPickStudent(null);
        setSessionForm({
            date: format(new Date(), 'yyyy-MM-dd'),
            location: DEFAULT_LOCATION,
            topic: studentCourse || ''
        });
    };

    const handleAddSession = (studentId) => {
        if (!sessionForm.topic.trim()) {
            alert('Please enter what was taught');
            return;
        }
        addSession(studentId, { ...sessionForm });
    };

    const toggleQuickPick = (studentId) => {
        setQuickPickStudent(quickPickStudent === studentId ? null : studentId);
        setAddingSession(null);
    };

    return (
        <div className="attendance-simple">
            {/* Header */}
            <div className="att-header glass card">
                <div className="month-switcher">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="nav-btn">◀</button>
                    <div className="month-display">
                        <Calendar size={18} className="text-primary" />
                        <span>{displayMonth}</span>
                    </div>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="nav-btn">▶</button>
                </div>

                <div className="header-right">
                    <AnimatePresence>
                        {status && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className={`status-chip ${status.type}`}
                            >
                                {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                <span>{status.message}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button className="sync-btn" onClick={fetchData}>
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button className="btn-primary" onClick={saveAttendance} disabled={saving || loading}>
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        <span>{saving ? 'Saving...' : 'Save All'}</span>
                    </button>
                </div>
            </div>

            {/* Instructions */}
            <div className="instructions">
                <p>💡 <strong>+ Quick</strong> = Pick topic from list | <strong>+ Details</strong> = Custom date, place & topic</p>
            </div>

            {/* Student List */}
            <div className="glass card student-list-card">
                {loading ? (
                    <div className="loader-box">
                        <Loader2 className="animate-spin text-primary" size={40} />
                        <p>Loading...</p>
                    </div>
                ) : students.length > 0 ? (
                    <div className="student-rows">
                        {students.map(student => {
                            const data = attendanceData[student.id] || { sessions: [], classCount: 0 };
                            const rate = COURSE_PRICING[student.course] || 999;
                            const total = data.classCount * rate;
                            const isExpanded = expandedStudent === student.id;
                            const isAdding = addingSession === student.id;
                            const isQuickPicking = quickPickStudent === student.id;

                            return (
                                <div key={student.id} className="student-block">
                                    <div className="student-row">
                                        <div className="st-info">
                                            <div className="st-avatar">{student.name?.[0] || '?'}</div>
                                            <div className="st-details">
                                                <h4>{student.name}</h4>
                                                <span className={`course-tag ${student.course?.toLowerCase()}`}>
                                                    {student.course || 'Beginner'} • ₹{rate}/class
                                                </span>
                                            </div>
                                        </div>

                                        <div className="class-controls">
                                            <button className="add-quick-btn" onClick={() => toggleQuickPick(student.id)}>
                                                <Zap size={16} /> Quick
                                            </button>
                                            <button className="add-details-btn" onClick={() => openAddSession(student.id, student.course)}>
                                                <CalendarPlus size={16} /> Details
                                            </button>
                                            <div className="class-count-display">
                                                <span className="count-num">{data.classCount}</span>
                                                <span className="count-label">classes</span>
                                            </div>
                                        </div>

                                        <div className="total-section">
                                            <label>Monthly</label>
                                            <p className="total-amount">₹{total.toLocaleString()}</p>
                                        </div>

                                        <button className="expand-btn" onClick={() => toggleExpand(student.id)}>
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                    </div>

                                    {/* Quick Topic Picker */}
                                    <AnimatePresence>
                                        {isQuickPicking && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="quick-pick-section"
                                            >
                                                <div className="quick-pick-header">
                                                    <Zap size={14} />
                                                    <span>Quick Add for Today ({format(new Date(), 'dd MMM')}) - Pick Topic:</span>
                                                </div>
                                                <div className="topic-grid">
                                                    {TOPIC_PRESETS.map((topic) => (
                                                        <button
                                                            key={topic}
                                                            className="topic-btn"
                                                            onClick={() => quickAddWithTopic(student.id, topic)}
                                                        >
                                                            {topic}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="quick-pick-footer">
                                                    <button className="cancel-quick" onClick={() => setQuickPickStudent(null)}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Add Session Form (Details) */}
                                    <AnimatePresence>
                                        {isAdding && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="add-session-form"
                                            >
                                                <div className="form-grid">
                                                    <div className="form-field">
                                                        <label><Calendar size={14} /> Date</label>
                                                        <input
                                                            type="date"
                                                            value={sessionForm.date}
                                                            onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="form-field">
                                                        <label><MapPin size={14} /> Location</label>
                                                        <input
                                                            type="text"
                                                            value={sessionForm.location}
                                                            onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                                                            placeholder="e.g. MAKER WORKS"
                                                        />
                                                    </div>
                                                    <div className="form-field wide">
                                                        <label><BookOpen size={14} /> What was taught?</label>
                                                        <input
                                                            type="text"
                                                            value={sessionForm.topic}
                                                            onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
                                                            placeholder="e.g. Micro Bit Introduction"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="preset-row">
                                                    <span>Quick pick:</span>
                                                    {TOPIC_PRESETS.slice(0, 6).map((topic) => (
                                                        <button
                                                            key={topic}
                                                            className="preset-chip"
                                                            onClick={() => setSessionForm({ ...sessionForm, topic })}
                                                        >
                                                            {topic}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="form-actions">
                                                    <button className="save-session-btn" onClick={() => handleAddSession(student.id)}>
                                                        <Plus size={16} /> Add This Class
                                                    </button>
                                                    <button className="cancel-btn" onClick={() => setAddingSession(null)}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Sessions List */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="sessions-section"
                                            >
                                                <div className="sessions-header">
                                                    <Clock size={14} />
                                                    <span>Class History ({data.sessions.length})</span>
                                                </div>
                                                {data.sessions.length > 0 ? (
                                                    <div className="sessions-list">
                                                        {data.sessions.map((session, idx) => (
                                                            <div key={idx} className="session-card">
                                                                <div className="session-main">
                                                                    <div className="session-topic">{session.topic || 'Class'}</div>
                                                                    <div className="session-meta">
                                                                        <span className="meta-item">
                                                                            <Calendar size={12} />
                                                                            {format(new Date(session.date), 'dd MMM yyyy (EEE)')}
                                                                        </span>
                                                                        <span className="meta-item">
                                                                            <MapPin size={12} />
                                                                            {session.location || DEFAULT_LOCATION}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <button className="remove-session" onClick={() => removeSession(student.id, idx)}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="no-sessions">No classes recorded yet</p>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-box">
                        <p>No students found. Add students first!</p>
                    </div>
                )}
            </div>

            <style jsx="true">{`
        .attendance-simple { max-width: 1000px; margin: 0 auto; }

        .att-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          margin-bottom: 20px;
          background: var(--bg-card);
        }

        .month-switcher {
          display: flex;
          align-items: center;
          gap: 15px;
          background: var(--bg-secondary);
          padding: 8px 15px;
          border-radius: 12px;
        }

        .nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          font-size: 0.8rem;
          color: var(--text-main);
        }

        .nav-btn:hover { background: var(--primary); color: white; }

        .month-display {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          min-width: 160px;
          justify-content: center;
        }

        .header-right { display: flex; align-items: center; gap: 15px; }

        .status-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .status-chip.success { background: #ecfdf5; color: var(--success); }
        .status-chip.error { background: #fef2f2; color: var(--danger); }

        .sync-btn { padding: 10px; border-radius: 10px; background: #f1f5f9; color: var(--text-muted); }

        .instructions {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .instructions p { margin: 0; color: #0284c7; font-size: 0.9rem; }

        .student-list-card { padding: 0; background: var(--bg-card); }

        .loader-box, .empty-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: var(--text-muted);
          gap: 16px;
        }

        .student-block { border-bottom: 1px solid var(--border-color); }
        .student-block:last-child { border-bottom: none; }

        .student-row {
          display: grid;
          grid-template-columns: 1fr auto auto 40px;
          align-items: center;
          gap: 20px;
          padding: 20px 24px;
        }

        .student-row:hover { background: #fafafa; }

        .st-info { display: flex; align-items: center; gap: 15px; }

        .st-avatar {
          width: 44px;
          height: 44px;
          background: var(--primary-light);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .st-details h4 { margin: 0 0 4px; font-size: 1rem; font-weight: 700; }

        .course-tag { font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
        .course-tag.beginner { background: #dcfce7; color: #15803d; }
        .course-tag.intermediate { background: #fef3c7; color: #92400e; }
        .course-tag.advanced { background: #fee2e2; color: #991b1b; }

        .class-controls { display: flex; align-items: center; gap: 10px; }

        .add-quick-btn, .add-details-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.8rem;
          border: 1px solid;
        }

        .add-quick-btn { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
        .add-quick-btn:hover { background: #f59e0b; color: white; }

        .add-details-btn { background: #faf5ff; color: #7c3aed; border-color: #c4b5fd; }
        .add-details-btn:hover { background: #7c3aed; color: white; }

        .class-count-display {
          text-align: center;
          background: #f8fafc;
          padding: 8px 16px;
          border-radius: 10px;
          min-width: 70px;
        }

        .count-num { display: block; font-size: 1.4rem; font-weight: 800; color: var(--primary); }
        .count-label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; }

        .total-section { text-align: right; min-width: 90px; }
        .total-section label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
        .total-amount { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--success); }

        .expand-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #f8fafc;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-color);
        }

        /* Quick Topic Picker */
        .quick-pick-section {
          background: #fffbeb;
          border-top: 1px solid #fcd34d;
          padding: 20px 24px;
          overflow: hidden;
        }

        .quick-pick-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #92400e;
          margin-bottom: 15px;
        }

        .topic-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .topic-btn {
          padding: 10px 18px;
          background: white;
          border: 2px solid #fcd34d;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          color: #92400e;
          transition: all 0.15s;
        }

        .topic-btn:hover {
          background: #f59e0b;
          border-color: #f59e0b;
          color: white;
          transform: scale(1.02);
        }

        .quick-pick-footer {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px dashed #fcd34d;
        }

        .cancel-quick {
          padding: 8px 16px;
          background: none;
          color: #92400e;
          font-weight: 600;
        }

        /* Add Session Form */
        .add-session-form {
          background: #faf5ff;
          border-top: 1px solid #c4b5fd;
          padding: 20px 24px;
          overflow: hidden;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 150px 200px 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }

        .form-field label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #6b21a8;
          margin-bottom: 6px;
        }

        .form-field input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 0.9rem;
          background: var(--bg-card);
          color: var(--text-main);
        }

        .form-field.wide { grid-column: span 1; }

        .preset-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .preset-row span { font-size: 0.8rem; color: #6b21a8; font-weight: 600; }

        .preset-chip {
          padding: 5px 12px;
          background: white;
          border: 1px solid #c4b5fd;
          border-radius: 6px;
          font-size: 0.75rem;
          color: #7c3aed;
          font-weight: 600;
        }

        .preset-chip:hover { background: #7c3aed; color: white; }

        .form-actions { display: flex; gap: 10px; }

        .save-session-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: #7c3aed;
          color: white;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .cancel-btn { padding: 10px 16px; background: none; color: #64748b; font-weight: 600; }

        /* Sessions List */
        .sessions-section {
          padding: 0 24px 20px;
          overflow: hidden;
        }

        .sessions-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 12px;
          padding-left: 60px;
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-left: 60px;
        }

        .session-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          background: #f8fafc;
          border: 1px solid var(--border-color);
          border-radius: 10px;
        }

        .session-topic { font-weight: 700; font-size: 0.95rem; color: var(--text-main); margin-bottom: 4px; }

        .session-meta { display: flex; gap: 15px; }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .remove-session {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: none;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-session:hover { color: var(--danger); background: #fef2f2; }

        .no-sessions { padding-left: 60px; color: var(--text-muted); font-size: 0.85rem; }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 900px) {
          .student-row { grid-template-columns: 1fr; gap: 15px; }
          .form-grid { grid-template-columns: 1fr 1fr; }
          .form-field.wide { grid-column: span 2; }
          .class-controls { flex-wrap: wrap; }
          .sessions-header, .sessions-list, .no-sessions { padding-left: 0; }
        }
      `}</style>
        </div>
    );
};

export default Attendance;
