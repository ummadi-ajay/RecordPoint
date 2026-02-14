import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, Award, BookOpen, Clock } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';

const StudentProfile = ({ student, onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (student) {
            fetchHistory();
        }
    }, [student]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Fetch all monthly attendance docs for this student
            // Note: In a larger app, we might want a dedicated 'sessions' collection for easier querying.
            // But here we query monthly_attendance and aggregate.
            const q = query(
                collection(db, 'monthly_attendance'),
                where('studentId', '==', student.id)
            );

            const querySnapshot = await getDocs(q);
            let sessions = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.sessions && Array.isArray(data.sessions)) {
                    sessions = [...sessions, ...data.sessions];
                }
            });

            // Sort by date descending (newest first)
            sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
            setHistory(sessions);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!student) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="modal-content glass profile-modal"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                >
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>

                    <div className="profile-header">
                        <div className="profile-avatar">
                            {student.name[0]}
                        </div>
                        <div className="profile-info">
                            <h2>{student.name}</h2>
                            <span className={`course-badge ${student.course?.toLowerCase() || 'beginner'}`}>
                                {student.course || 'Beginner'}
                            </span>
                        </div>
                    </div>

                    <div className="profile-stats">
                        <div className="p-stat">
                            <label>Total Classes</label>
                            <span>{history.length}</span>
                        </div>
                        <div className="p-stat">
                            <label>First Class</label>
                            <span>{history.length > 0 ? format(new Date(history[history.length - 1].date), 'dd MMM yyyy') : '-'}</span>
                        </div>
                        <div className="p-stat">
                            <label>Latest Class</label>
                            <span>{history.length > 0 ? format(new Date(history[0].date), 'dd MMM yyyy') : '-'}</span>
                        </div>
                    </div>

                    <div className="timeline-section scroller">
                        <h3><Clock size={18} /> Learning Journey</h3>

                        {loading ? (
                            <p className="loading-text">Loading history...</p>
                        ) : history.length > 0 ? (
                            <div className="timeline">
                                {history.map((session, idx) => (
                                    <div key={idx} className="timeline-item">
                                        <div className="t-line"></div>
                                        <div className="t-dot"></div>
                                        <div className="t-content">
                                            <span className="t-date">{format(new Date(session.date), 'EEE, dd MMM yyyy')}</span>
                                            <h4 className="t-topic">{session.topic || 'Class Session'}</h4>
                                            <div className="t-meta">
                                                <span><MapPin size={12} /> {session.location || 'MAKER WORKS'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-history">
                                <BookOpen size={40} />
                                <p>No classes recorded yet.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            <style jsx="true">{`
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }

                .profile-modal {
                    background: white;
                    width: 100%;
                    max-width: 500px;
                    max-height: 85vh;
                    border-radius: 20px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                }

                .close-btn {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    z-index: 10;
                    width: 32px; height: 32px;
                    border-radius: 50%;
                    background: #f1f5f9;
                    border: none;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                }

                .profile-header {
                    padding: 30px 24px 20px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    border-bottom: 1px solid var(--border-color);
                }

                .profile-avatar {
                    width: 64px; height: 64px;
                    border-radius: 16px;
                    background: var(--primary);
                    color: white;
                    font-size: 1.8rem;
                    font-weight: 700;
                    display: flex; align-items: center; justify-content: center;
                }

                .profile-info h2 { margin: 0 0 5px; font-size: 1.4rem; font-weight: 800; }
                
                .course-badge {
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    display: inline-block;
                }
                .course-badge.beginner { background: #dcfce7; color: #15803d; }
                .course-badge.intermediate { background: #fef3c7; color: #92400e; }
                .course-badge.advanced { background: #fee2e2; color: #991b1b; }

                .profile-stats {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    padding: 15px 24px;
                    background: #f8fafc;
                    border-bottom: 1px solid var(--border-color);
                }

                .p-stat { text-align: center; }
                .p-stat label { display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
                .p-stat span { font-size: 1rem; font-weight: 700; color: var(--text-main); }

                .timeline-section {
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                }

                .timeline-section h3 {
                    font-size: 0.95rem; font-weight: 700; color: var(--text-muted);
                    display: flex; align-items: center; gap: 8px;
                    margin: 0 0 20px;
                }

                .timeline {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }

                .timeline-item {
                    display: flex;
                    gap: 15px;
                    position: relative;
                    padding-bottom: 25px;
                }
                
                .timeline-item:last-child { padding-bottom: 0; }

                .t-line {
                    position: absolute;
                    left: 7px;
                    top: 20px;
                    bottom: 0;
                    width: 2px;
                    background: #e2e8f0;
                }
                
                .timeline-item:last-child .t-line { display: none; }

                .t-dot {
                    width: 16px; height: 16px;
                    border-radius: 50%;
                    background: white;
                    border: 3px solid var(--primary);
                    flex-shrink: 0;
                    margin-top: 4px;
                    z-index: 2;
                }

                .t-content { flex: 1; }

                .t-date { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
                
                .t-topic { 
                    margin: 4px 0; 
                    font-size: 1rem; 
                    font-weight: 600; 
                    color: var(--text-main); 
                }

                .t-meta { display: flex; align-items: center; gap: 10px; font-size: 0.8rem; color: var(--text-muted); }
                
                .empty-history {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    color: var(--text-muted); gap: 10px; padding: 40px 0;
                }

                .loading-text { text-align: center; color: var(--text-muted); margin-top: 20px; }
            `}</style>
        </AnimatePresence>
    );
};

export default StudentProfile;
