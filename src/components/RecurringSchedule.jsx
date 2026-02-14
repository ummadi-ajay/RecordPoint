import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Save, Loader2, Trash2, Plus, Check, RefreshCcw } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, addDays, startOfWeek, getDay } from 'date-fns';
import { useToast } from '../context/ToastContext';

const WEEKDAYS = [
    { id: 0, name: 'Sunday', short: 'Sun' },
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' },
];

const TIME_SLOTS = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM'
];

const RecurringSchedule = ({ isOpen, onClose, studentId, studentName }) => {
    const toast = useToast();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newSchedule, setNewSchedule] = useState({
        weekday: 6, // Saturday default
        time: '10:00 AM',
        topic: ''
    });

    useEffect(() => {
        if (isOpen && studentId) {
            fetchSchedules();
        }
    }, [isOpen, studentId]);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'schedules', studentId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSchedules(docSnap.data().recurring || []);
            } else {
                setSchedules([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const saveSchedules = async (newSchedules) => {
        try {
            await setDoc(doc(db, 'schedules', studentId), {
                studentId,
                studentName,
                recurring: newSchedules,
                updatedAt: new Date().toISOString()
            });
            setSchedules(newSchedules);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const handleAddSchedule = async () => {
        if (schedules.some(s => s.weekday === newSchedule.weekday && s.time === newSchedule.time)) {
            toast.warning('This time slot already exists!');
            return;
        }

        setSaving(true);
        const updated = [...schedules, { ...newSchedule, id: Date.now() }];
        const success = await saveSchedules(updated);

        if (success) {
            toast.success('Schedule added!');
            setNewSchedule({ weekday: 6, time: '10:00 AM', topic: '' });
        } else {
            toast.error('Failed to add schedule');
        }
        setSaving(false);
    };

    const handleRemoveSchedule = async (id) => {
        const updated = schedules.filter(s => s.id !== id);
        const success = await saveSchedules(updated);
        if (success) {
            toast.success('Schedule removed');
        }
    };

    const applyScheduleToAttendance = async () => {
        if (schedules.length === 0) {
            toast.warning('No schedules to apply');
            return;
        }

        setSaving(true);
        try {
            const now = new Date();
            const month = format(now, 'MM');
            const year = format(now, 'yyyy');
            const attDocId = `${studentId}_${month}_${year}`;

            // Get existing attendance
            const attDoc = await getDoc(doc(db, 'monthly_attendance', attDocId));
            const existing = attDoc.exists() ? attDoc.data() : { sessions: [], classCount: 0 };

            // Calculate upcoming classes based on schedule
            const startOfThisWeek = startOfWeek(now);
            const sessionsToAdd = [];

            for (let week = 0; week < 4; week++) {
                for (const schedule of schedules) {
                    const classDate = addDays(startOfThisWeek, week * 7 + schedule.weekday);

                    // Only add if it's in the current month
                    if (format(classDate, 'MM') !== month) continue;

                    const dateStr = format(classDate, 'yyyy-MM-dd');

                    // Skip if already exists
                    if (existing.sessions?.some(s => s.date === dateStr)) continue;

                    sessionsToAdd.push({
                        date: dateStr,
                        time: schedule.time,
                        topic: schedule.topic || 'Regular Class',
                        status: 'scheduled'
                    });
                }
            }

            if (sessionsToAdd.length === 0) {
                toast.info('No new sessions to add');
                setSaving(false);
                return;
            }

            // Merge and save
            const allSessions = [...(existing.sessions || []), ...sessionsToAdd];
            await setDoc(doc(db, 'monthly_attendance', attDocId), {
                studentId,
                month,
                year,
                sessions: allSessions,
                classCount: allSessions.filter(s => s.status !== 'cancelled').length,
                updatedAt: new Date().toISOString()
            });

            toast.success(`Added ${sessionsToAdd.length} scheduled classes!`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to apply schedule');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="schedule-overlay" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="schedule-modal"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="schedule-header">
                        <div className="schedule-title">
                            <Calendar size={24} />
                            <div>
                                <h3>Recurring Schedule</h3>
                                <p>{studentName}</p>
                            </div>
                        </div>
                        <button className="close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="schedule-body">
                        {loading ? (
                            <div className="loading-box">
                                <Loader2 className="animate-spin" size={32} />
                                <p>Loading schedules...</p>
                            </div>
                        ) : (
                            <>
                                {/* Current Schedules */}
                                <div className="current-schedules">
                                    <h4>Current Schedule</h4>
                                    {schedules.length > 0 ? (
                                        <div className="schedule-list">
                                            {schedules.map((s) => (
                                                <div key={s.id} className="schedule-item">
                                                    <div className="schedule-info">
                                                        <span className="weekday-badge">
                                                            {WEEKDAYS.find(w => w.id === s.weekday)?.name}
                                                        </span>
                                                        <span className="time-badge">
                                                            <Clock size={14} />
                                                            {s.time}
                                                        </span>
                                                        {s.topic && <span className="topic">{s.topic}</span>}
                                                    </div>
                                                    <button
                                                        className="remove-btn"
                                                        onClick={() => handleRemoveSchedule(s.id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="empty-msg">No recurring schedule set</p>
                                    )}
                                </div>

                                {/* Add New Schedule */}
                                <div className="add-schedule">
                                    <h4>Add Class Day</h4>
                                    <div className="add-form">
                                        <div className="weekday-selector">
                                            {WEEKDAYS.map((day) => (
                                                <button
                                                    key={day.id}
                                                    className={`day-btn ${newSchedule.weekday === day.id ? 'active' : ''}`}
                                                    onClick={() => setNewSchedule({ ...newSchedule, weekday: day.id })}
                                                >
                                                    {day.short}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="form-row">
                                            <select
                                                className="input-field"
                                                value={newSchedule.time}
                                                onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                                            >
                                                {TIME_SLOTS.map((t) => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>

                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="Topic (optional)"
                                                value={newSchedule.topic}
                                                onChange={(e) => setNewSchedule({ ...newSchedule, topic: e.target.value })}
                                            />
                                        </div>

                                        <button
                                            className="add-btn"
                                            onClick={handleAddSchedule}
                                            disabled={saving}
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                                            Add Schedule
                                        </button>
                                    </div>
                                </div>

                                {/* Apply to Attendance */}
                                {schedules.length > 0 && (
                                    <div className="apply-section">
                                        <button
                                            className="apply-btn"
                                            onClick={applyScheduleToAttendance}
                                            disabled={saving}
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
                                            Apply Schedule to This Month
                                        </button>
                                        <p className="apply-hint">
                                            This will add scheduled classes to this month's attendance
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>

            <style jsx="true">{`
        .schedule-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .schedule-modal {
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          background: var(--bg-card);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
        }

        .schedule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .schedule-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--primary);
        }

        .schedule-title h3 { margin: 0; font-size: 1.1rem; color: var(--text-main); }
        .schedule-title p { margin: 4px 0 0; font-size: 0.85rem; color: var(--text-muted); }

        .close-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--bg-secondary);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .schedule-body {
          padding: 24px;
          max-height: 65vh;
          overflow-y: auto;
        }

        .loading-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px;
          color: var(--text-muted);
        }

        .current-schedules { margin-bottom: 25px; }
        .current-schedules h4 { margin: 0 0 15px; font-size: 0.95rem; }

        .schedule-list { display: flex; flex-direction: column; gap: 10px; }

        .schedule-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-radius: 10px;
        }

        .schedule-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .weekday-badge {
          background: var(--primary);
          color: white;
          padding: 4px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.8rem;
        }

        .time-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .topic {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .remove-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          color: var(--text-muted);
          border-radius: 8px;
        }

        .remove-btn:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        .empty-msg {
          text-align: center;
          color: var(--text-muted);
          padding: 20px;
          background: var(--bg-secondary);
          border-radius: 10px;
        }

        .add-schedule {
          background: var(--bg-secondary);
          padding: 20px;
          border-radius: 12px;
        }

        .add-schedule h4 { margin: 0 0 15px; font-size: 0.95rem; }

        .weekday-selector {
          display: flex;
          gap: 6px;
          margin-bottom: 15px;
        }

        .day-btn {
          flex: 1;
          padding: 10px 8px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .day-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .form-row {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }

        .form-row .input-field { flex: 1; }

        .add-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: var(--primary);
          color: white;
          border-radius: 10px;
          font-weight: 600;
        }

        .apply-section {
          margin-top: 20px;
          text-align: center;
        }

        .apply-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: 10px;
          font-weight: 600;
        }

        .apply-hint {
          margin-top: 10px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </AnimatePresence>
    );
};

export default RecurringSchedule;
