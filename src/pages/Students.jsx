import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Save,
    Phone,
    Mail,
    User,
    Loader2,
    RefreshCcw,
    GraduationCap,
    Camera,
    Upload,
    Calendar,
    Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import RecurringSchedule from '../components/RecurringSchedule';
import { StudentCardSkeleton, SkeletonStyles } from '../components/Skeleton';
import StudentProfile from '../components/StudentProfile';

// Course data fetched from settings now

const Students = () => {
    const [students, setStudents] = useState([]);
    const [coursePricing, setCoursePricing] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [scheduleStudent, setScheduleStudent] = useState(null);
    const [viewingStudent, setViewingStudent] = useState(null); // Added viewingStudent state

    const [formData, setFormData] = useState({
        name: '',
        parentName: '',
        email: '',
        phone: '',
        course: '', // Initial empty, will set to first key later
        photo: '',
        address: '' // Added address
    });

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Settings for Pricing
                const sDoc = await getDoc(doc(db, 'settings', 'business'));
                if (sDoc.exists() && sDoc.data().pricing) {
                    const pricing = sDoc.data().pricing;
                    setCoursePricing(pricing);
                    // Set default course if empty
                    if (Object.keys(pricing).length > 0) {
                        setFormData(prev => ({ ...prev, course: Object.keys(pricing)[0] }));
                    }
                }

                // 2. Fetch Students
                const snapshot = await getDocs(collection(db, 'students'));
                setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const fetchStudents = async () => {
        // Simple reload for students only
        try {
            const snapshot = await getDocs(collection(db, 'students'));
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const dataToSave = {
                ...formData,
                feePerClass: coursePricing[formData.course] || 0
            };

            if (currentStudent) {
                await updateDoc(doc(db, 'students', currentStudent.id), dataToSave);
            } else {
                await addDoc(collection(db, 'students'), dataToSave);
            }
            await fetchStudents();
            closeModal();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this student?')) {
            try {
                await deleteDoc(doc(db, 'students', id));
                await fetchStudents();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const openModal = (student = null) => {
        setCurrentStudent(student);
        if (student) {
            setFormData(student);
        } else {
            // Default to first available course or empty string
            const firstCourse = Object.keys(coursePricing)[0] || '';
            setFormData({ name: '', parentName: '', email: '', phone: '', course: firstCourse, photo: '', address: '' });
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setCurrentStudent(null);
    };

    // Handle photo upload (convert to base64)
    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 500000) { // 500KB limit
                alert('Image too large. Please use an image under 500KB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photo: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.parentName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="students-page">
            {/* Header */}
            <div className="page-header glass card">
                <div className="title-group">
                    <h3>Students</h3>
                    <p>{students.length} enrolled students</p>
                </div>
                <div className="header-actions">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="sync-btn" onClick={fetchStudents}>
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button className="btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Add Student
                    </button>
                </div>
            </div>

            {/* Student Grid */}
            <div className="students-grid">
                {loading ? (
                    <>
                        <SkeletonStyles />
                        <StudentCardSkeleton />
                        <StudentCardSkeleton />
                        <StudentCardSkeleton />
                        <StudentCardSkeleton />
                    </>
                ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                        <motion.div
                            key={student.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -5 }}
                            className="glass card student-card"
                        >
                            <div className="card-actions">
                                <button onClick={() => setViewingStudent(student)} className="view-btn" title="View Profile">
                                    <Eye size={14} />
                                </button>
                                <button
                                    onClick={() => setScheduleStudent(student)}
                                    className="schedule-btn"
                                    title="Recurring Schedule"
                                >
                                    <Calendar size={14} />
                                </button>
                                <button onClick={() => openModal(student)} className="edit-btn" title="Edit">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDelete(student.id)} className="delete-btn" title="Delete">
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="student-photo" onClick={() => setViewingStudent(student)} style={{ cursor: 'pointer' }}>
                                {student.photo ? (
                                    <img src={student.photo} alt={student.name} />
                                ) : (
                                    <span>{student.name?.[0]}</span>
                                )}
                            </div>

                            <h4 onClick={() => setViewingStudent(student)} style={{ cursor: 'pointer' }}>{student.name}</h4>

                            <div className="badge-group">
                                <span className={`course-badge ${student.course?.toLowerCase()}`}>
                                    <GraduationCap size={12} />
                                    {student.course || 'Beginner'}
                                </span>
                                <span className="fee-badge">₹{coursePricing[student.course] || 0}/class</span>
                            </div>

                            <div className="student-details">
                                <p><User size={14} /> {student.parentName}</p>
                                <p><Phone size={14} /> {student.phone}</p>
                                <p><Mail size={14} /> {student.email}</p>
                            </div>

                            <button className="whatsapp-quick" onClick={() => {
                                const phone = student.phone?.replace(/\D/g, '');
                                window.open(`https://wa.me/91${phone}`, '_blank');
                            }}>
                                💬 WhatsApp
                            </button>
                        </motion.div>
                    ))
                ) : (
                    <div className="empty-state">
                        <User size={48} />
                        <h4>No Students Found</h4>
                        <p>{searchQuery ? 'No matching students' : 'Add your first student'}</p>
                        {!searchQuery && (
                            <button className="btn-primary" onClick={() => openModal()}>
                                <Plus size={18} /> Add Student
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass modal-card"
                        >
                            <div className="modal-header">
                                <h3>{currentStudent ? 'Edit Student' : 'Add New Student'}</h3>
                                <button className="close-btn" onClick={closeModal}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="student-form">
                                {/* Photo Upload */}
                                <div className="photo-upload-section">
                                    <div className="photo-preview">
                                        {formData.photo ? (
                                            <img src={formData.photo} alt="Student" />
                                        ) : (
                                            <Camera size={32} />
                                        )}
                                    </div>
                                    <label className="upload-btn">
                                        <Upload size={16} />
                                        {formData.photo ? 'Change Photo' : 'Upload Photo'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                    {formData.photo && (
                                        <button type="button" className="remove-photo" onClick={() => setFormData({ ...formData, photo: '' })}>
                                            Remove
                                        </button>
                                    )}
                                </div>

                                <div className="form-grid">
                                    <div className="f-group">
                                        <label>Student Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            placeholder="Enter student name"
                                        />
                                    </div>

                                    <div className="f-group">
                                        <label>Parent Name *</label>
                                        <input
                                            type="text"
                                            value={formData.parentName}
                                            onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                                            required
                                            placeholder="Enter parent name"
                                        />
                                    </div>

                                    <div className="f-group">
                                        <label>Phone *</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                            placeholder="10-digit number"
                                        />
                                    </div>

                                    <div className="f-group">
                                        <label>Email *</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="f-group full-width">
                                    <label>Address</label>
                                    <textarea
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Enter full address"
                                        rows={2}
                                        style={{ resize: 'vertical' }}
                                    />
                                </div>

                                <div className="f-group full-width">
                                    <label>Course Level *</label>
                                    <div className="course-selector">
                                        {Object.entries(coursePricing).map(([level, price]) => (
                                            <button
                                                key={level}
                                                type="button"
                                                className={`course-option ${formData.course === level ? 'active' : ''}`}
                                                onClick={() => setFormData({ ...formData, course: level })}
                                            >
                                                <span className="level-name">{level}</span>
                                                <span className="level-price">₹{price}/class</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="cancel-btn" onClick={closeModal}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={saving}>
                                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        <span>{saving ? 'Saving...' : 'Save Student'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Recurring Schedule Modal */}
            <RecurringSchedule
                isOpen={!!scheduleStudent}
                onClose={() => setScheduleStudent(null)}
                studentId={scheduleStudent?.id}
                studentName={scheduleStudent?.name}
            />

            <StudentProfile
                student={viewingStudent}
                onClose={() => setViewingStudent(null)}
            />

            <style jsx="true">{`
                .view-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-main);
                    background: var(--bg-secondary);
                    transition: all 0.2s;
                }
                .view-btn:hover { background: var(--bg-hover); color: var(--primary); }

        .students-page { max-width: 1200px; margin: 0 auto; }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          margin-bottom: 24px;
          background: var(--bg-card);
        }

        .title-group h3 { margin: 0; font-size: 1.25rem; font-weight: 700; }
        .title-group p { margin: 4px 0 0; font-size: 0.85rem; color: var(--text-muted); }

        .header-actions { display: flex; gap: 12px; align-items: center; }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: var(--bg-secondary);
          border-radius: 10px;
          color: var(--text-muted);
        }

        .search-box input {
          border: none;
          background: none;
          outline: none;
          font-size: 0.9rem;
          width: 200px;
        }

        .sync-btn { padding: 10px; border-radius: 10px; background: #f1f5f9; color: var(--text-muted); }

        .students-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .loader-box {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 16px;
          color: var(--text-muted);
        }

        .empty-state {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 12px;
          color: var(--text-muted);
        }

        .empty-state h4 { margin: 0; color: var(--text-main); }

        .student-card {
          padding: 24px;
          background: var(--bg-card);
          text-align: center;
          position: relative;
        }

        .card-actions {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          gap: 6px;
        }

        .edit-btn, .delete-btn, .schedule-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .schedule-btn { background: #fdf4ff; color: #a855f7; }
        .edit-btn { background: #f0f4ff; color: var(--primary); }
        .delete-btn { background: #fef2f2; color: var(--danger); }

        .student-photo {
          width: 80px;
          height: 80px;
          margin: 0 auto 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 700;
          overflow: hidden;
        }

        .student-photo img { width: 100%; height: 100%; object-fit: cover; }

        .student-card h4 { margin: 0 0 10px; font-size: 1.1rem; }

        .badge-group { display: flex; justify-content: center; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; }

        .course-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .course-badge.beginner { background: #ecfdf5; color: #10b981; }
        .course-badge.intermediate { background: #fef3c7; color: #f59e0b; }
        .course-badge.advanced { background: #fef2f2; color: #ef4444; }

        .fee-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          background: #f0f4ff;
          color: var(--primary);
        }

        .student-details {
          text-align: left;
          padding: 15px;
          background: #f8fafc;
          border-radius: 10px;
          margin-bottom: 15px;
        }

        .student-details p {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 8px 0;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .whatsapp-quick {
          width: 100%;
          padding: 10px;
          background: #dcfce7;
          color: #15803d;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .whatsapp-quick:hover { background: #25D366; color: white; }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-card {
          width: 100%;
          max-width: 550px;
          padding: 30px;
          background: white;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .modal-header h3 { margin: 0; font-size: 1.2rem; font-weight: 700; }
        .close-btn { background: none; color: var(--text-muted); }

        /* Photo Upload */
        .photo-upload-section {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 25px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .photo-preview {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #f0f4ff;
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .photo-preview img { width: 100%; height: 100%; object-fit: cover; }

        .upload-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: var(--primary);
          color: white;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .remove-photo {
          padding: 8px 14px;
          background: none;
          color: var(--danger);
          font-weight: 600;
          font-size: 0.85rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .f-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .f-group input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          font-size: 0.95rem;
        }

        .f-group.full-width { grid-column: span 2; }

        .course-selector { display: flex; gap: 10px; }

        .course-option {
          flex: 1;
          padding: 15px;
          border: 2px solid var(--border-color);
          border-radius: 12px;
          background: white;
          text-align: center;
          transition: all 0.2s;
        }

        .course-option:hover { border-color: var(--primary); }

        .course-option.active {
          border-color: var(--primary);
          background: #f0f4ff;
        }

        .level-name { display: block; font-weight: 700; margin-bottom: 4px; }
        .level-price { font-size: 0.8rem; color: var(--text-muted); }
        .course-option.active .level-price { color: var(--primary); }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 15px;
          margin-top: 25px;
          padding-top: 20px;
          border-top: 1px solid var(--border-color);
        }

        .cancel-btn { background: none; color: var(--text-muted); font-weight: 600; padding: 10px 20px; }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 600px) {
          .form-grid { grid-template-columns: 1fr; }
          .f-group.full-width { grid-column: span 1; }
          .course-selector { flex-direction: column; }
        }
      `}</style>
        </div >
    );
};

export default Students;
