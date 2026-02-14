import React, { useState, useEffect } from 'react';
import {
    FilePlus,
    Copy,
    Check,
    Eye,
    Trash2,
    Loader2,
    RefreshCcw,
    Calendar,
    FileText
} from 'lucide-react';
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    doc,
    getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSaturday, isSunday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';

const MONTH_OPTIONS = [
    { value: 1, label: '1 Month' },
    { value: 2, label: '2 Months' },
    { value: 3, label: '3 Months' },
    { value: 4, label: '4 Months' },
    { value: 6, label: '6 Months' }
];

const Quotations = () => {
    const toast = useToast();
    const [quotations, setQuotations] = useState([]);
    const [students, setStudents] = useState([]);
    const [coursePricing, setCoursePricing] = useState({});
    const [loading, setLoading] = useState(true);
    const [showGenModal, setShowGenModal] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [detectedAttendance, setDetectedAttendance] = useState(0);
    const [fetchingAttendance, setFetchingAttendance] = useState(false);
    const [weekends, setWeekends] = useState([]);
    const [copyingId, setCopyingId] = useState(null);

    const [genData, setGenData] = useState({
        studentId: '',
        endMonth: format(new Date(), 'MM'),
        endYear: format(new Date(), 'yyyy'),
        monthCount: 1,
        manualClasses: '',
        selectedDates: [],
        adjustment: '',
        adjLabel: ''
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const sDoc = await getDoc(doc(db, 'settings', 'business'));
                if (sDoc.exists() && sDoc.data().pricing) {
                    setCoursePricing(sDoc.data().pricing);
                }
            } catch (e) { console.error(e); }
        };
        fetchSettings();
        fetchQuotations();
        fetchStudents();
    }, []);

    useEffect(() => {
        const fetchPreview = async () => {
            if (!genData.studentId) {
                setDetectedAttendance(0);
                setWeekends([]);
                return;
            }
            setFetchingAttendance(true);
            try {
                const endDate = new Date(parseInt(genData.endYear), parseInt(genData.endMonth) - 1, 1);
                let total = 0;
                let foundWeekends = [];

                for (let i = 0; i < genData.monthCount; i++) {
                    const d = subMonths(endDate, i);
                    const monthStart = startOfMonth(d);
                    const monthEnd = endOfMonth(d);

                    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
                    const mWeekends = days.filter(day => isSaturday(day) || isSunday(day));
                    foundWeekends = [...foundWeekends, ...mWeekends];

                    const attDocId = `${genData.studentId}_${format(d, 'MM')}_${format(d, 'yyyy')}`;
                    const attDoc = await getDoc(doc(db, 'monthly_attendance', attDocId));
                    if (attDoc.exists()) {
                        total += attDoc.data().classCount || 0;
                    }
                }
                setDetectedAttendance(total);
                setWeekends(foundWeekends.sort((a, b) => a - b));
            } catch (e) {
                console.error(e);
            } finally {
                setFetchingAttendance(false);
            }
        };
        if (showGenModal) fetchPreview();
    }, [genData.studentId, genData.endMonth, genData.endYear, genData.monthCount, showGenModal]);

    // Auto-select dates when manual count changes
    useEffect(() => {
        if (genData.manualClasses && weekends.length > 0) {
            const count = parseInt(genData.manualClasses);
            if (!isNaN(count)) {
                setGenData(prev => ({
                    ...prev,
                    selectedDates: weekends.slice(0, count).map(d => d.toISOString())
                }));
            }
        } else if (!genData.manualClasses) {
            setGenData(prev => ({ ...prev, selectedDates: [] }));
        }
    }, [genData.manualClasses, weekends]);

    const fetchQuotations = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setQuotations(all.filter(i => i.type === 'quotation'));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'students'));
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error(err);
        }
    };

    const generateQuotation = async (e) => {
        e.preventDefault();
        if (!genData.studentId) return;

        setGenerating(true);
        try {
            const studentId = genData.studentId;
            const endMonth = genData.endMonth;
            const endYear = genData.endYear;
            const monthCount = genData.monthCount;
            const manualClasses = genData.manualClasses;
            const customDates = genData.selectedDates;
            const adjustment = genData.adjustment;
            const adjLabel = genData.adjLabel;

            const sDoc = await getDoc(doc(db, 'students', studentId));
            if (!sDoc.exists()) throw new Error("Student not found");
            const sData = sDoc.data();

            const endDate = new Date(parseInt(endYear), parseInt(endMonth) - 1, 1);
            const monthsToFetch = [];

            for (let i = 0; i < monthCount; i++) {
                const d = subMonths(endDate, i);
                monthsToFetch.push({
                    month: format(d, 'MM'),
                    year: format(d, 'yyyy'),
                    label: format(d, 'MMM yyyy')
                });
            }
            monthsToFetch.reverse();

            let allSessions = [];
            let totalClasses = 0;
            const monthlyBreakdown = [];

            for (const m of monthsToFetch) {
                const attDocId = `${studentId}_${m.month}_${m.year}`;
                const attDoc = await getDoc(doc(db, 'monthly_attendance', attDocId));
                const attData = attDoc.exists() ? attDoc.data() : { classCount: 0, sessions: [] };

                allSessions = [...allSessions, ...(attData.sessions || [])];
                totalClasses += attData.classCount || 0;

                monthlyBreakdown.push({
                    month: m.month,
                    year: m.year,
                    label: m.label,
                    classCount: attData.classCount || 0
                });
            }

            const rate = coursePricing[sData.course] || 0;
            const totalClassesToBill = manualClasses ? parseInt(manualClasses) : totalClasses;
            const totalAmountBase = totalClassesToBill * rate;
            const adjValue = parseFloat(adjustment) || 0;
            const totalAmount = totalAmountBase + adjValue;

            let finalSessions = allSessions;
            if (customDates.length > 0) {
                finalSessions = customDates.map(dStr => ({
                    date: dStr,
                    location: 'MAKER WORKS',
                    topic: 'Class Session'
                }));
            } else if (manualClasses) {
                const count = parseInt(manualClasses);
                let autoDates = [];
                for (const m of monthsToFetch) {
                    const d = new Date(parseInt(m.year), parseInt(m.month) - 1, 1);
                    const days = eachDayOfInterval({ start: startOfMonth(d), end: endOfMonth(d) });
                    const mWeekends = days.filter(day => isSaturday(day) || isSunday(day));
                    autoDates = [...autoDates, ...mWeekends];
                }
                autoDates.sort((a, b) => a - b);
                finalSessions = autoDates.slice(0, count).map(d => ({
                    date: d.toISOString(),
                    location: 'MAKER WORKS',
                    topic: 'Planned Session'
                }));
            }

            const quotationData = {
                studentId: studentId,
                startMonth: monthsToFetch[0].month,
                startYear: monthsToFetch[0].year,
                endMonth: monthsToFetch[monthsToFetch.length - 1].month,
                endYear: monthsToFetch[monthsToFetch.length - 1].year,
                month: endMonth,
                year: endYear,
                monthCount: monthCount,
                monthlyBreakdown: monthlyBreakdown,
                classCount: totalClassesToBill,
                actualAttendanceCount: totalClasses,
                sessions: finalSessions,
                ratePerClass: rate,
                adjustment: adjValue,
                adjLabel: adjLabel || (adjValue < 0 ? 'Discount' : 'Additional Fee'),
                totalAmount: totalAmount,
                isManualBilling: !!manualClasses,
                status: 'Quotation',
                type: 'quotation',
                createdAt: new Date().toISOString(),
                studentSnapshot: {
                    name: sData.name,
                    parentName: sData.parentName,
                    email: sData.email,
                    phone: sData.phone,
                    course: sData.course || 'Beginner'
                }
            };

            await addDoc(collection(db, 'invoices'), quotationData);
            await fetchQuotations();
            setShowGenModal(false);
            setGenData({
                studentId: '',
                endMonth: format(new Date(), 'MM'),
                endYear: format(new Date(), 'yyyy'),
                monthCount: 1,
                manualClasses: '',
                selectedDates: [],
                adjustment: '',
                adjLabel: ''
            });
            toast.success('Quotation generated successfully!');
        } catch (err) {
            console.error('Generation Error:', err);
            toast.error('Error: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this quotation?')) {
            try {
                await deleteDoc(doc(db, 'invoices', id));
                fetchQuotations();
                toast.success('Quotation deleted');
            } catch (err) {
                console.error(err);
                toast.error('Failed to delete');
            }
        }
    };

    const copyLink = (id) => {
        const link = `${window.location.origin}/invoice/${id}`;
        navigator.clipboard.writeText(link);
        setCopyingId(id);
        toast.success('Quotation link copied!');
        setTimeout(() => setCopyingId(null), 2000);
    };

    const formatPeriod = (inv) => {
        if (inv.monthCount > 1) {
            const start = format(new Date(2000, parseInt(inv.startMonth) - 1), 'MMM');
            const end = format(new Date(2000, parseInt(inv.endMonth) - 1), 'MMM');
            return `${start} - ${end} ${inv.endYear}`;
        }
        return `${format(new Date(2000, parseInt(inv.month) - 1), 'MMM')} ${inv.year}`;
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="quotations-page">
            <div className="page-header glass card">
                <div className="title-group">
                    <h3>Quotations</h3>
                    <p>Manage preliminary billing estimates</p>
                </div>
                <div className="header-actions">
                    <button className="sync-btn" onClick={fetchQuotations}>
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button className="btn-primary" onClick={() => setShowGenModal(true)}>
                        <FilePlus size={18} /> Generate Quotation
                    </button>
                </div>
            </div>

            <div className="glass card table-container">
                {loading ? (
                    <div className="loader-box">
                        <Loader2 className="animate-spin text-primary" size={40} />
                        <p>Loading quotations...</p>
                    </div>
                ) : quotations.length > 0 ? (
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Quotation #</th>
                                <th>Student</th>
                                <th>Period</th>
                                <th>Classes</th>
                                <th>Amount</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotations.map((inv) => (
                                <tr key={inv.id}>
                                    <td>
                                        <span className="inv-code">#{inv.id.slice(-8).toUpperCase()}</span>
                                    </td>
                                    <td>
                                        <div className="st-cell">
                                            <strong>{inv.studentSnapshot?.name}</strong>
                                            <span className={`course-tag ${inv.studentSnapshot?.course?.toLowerCase()}`}>
                                                {inv.studentSnapshot?.course}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="period-badge">
                                            <Calendar size={14} />
                                            <span>{formatPeriod(inv)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="class-count">{inv.classCount}</span>
                                    </td>
                                    <td>
                                        <span className="total-amt">₹{inv.totalAmount?.toLocaleString()}</span>
                                    </td>
                                    <td align="right">
                                        <div className="action-row">
                                            <button onClick={() => window.open(`/invoice/${inv.id}`, '_blank')} className="action-btn" title="View">
                                                <Eye size={18} />
                                            </button>
                                            <button onClick={() => copyLink(inv.id)} className="action-btn" title="Copy Link">
                                                {copyingId === inv.id ? <Check size={18} className="text-success" /> : <Copy size={18} />}
                                            </button>
                                            <button onClick={() => handleDelete(inv.id)} className="action-btn delete" title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-box">
                        <FileText size={48} />
                        <p>No quotations found.</p>
                        <button className="btn-primary" onClick={() => setShowGenModal(true)}>Create First Quotation</button>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showGenModal && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass modal-card"
                        >
                            <div className="modal-header">
                                <div>
                                    <h3>Generate Quotation</h3>
                                    <p>Preliminary estimate for student</p>
                                </div>
                                <button className="close-btn" onClick={() => setShowGenModal(false)}>×</button>
                            </div>

                            <form onSubmit={generateQuotation} className="gen-form">
                                <div className="input-group">
                                    <label>Student</label>
                                    <select
                                        className="input-field"
                                        value={genData.studentId}
                                        onChange={(e) => setGenData({ ...genData, studentId: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Select Student --</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} ({s.course || 'Beginner'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label>Billing Type & Classes</label>
                                    <div className="attendance-preview-box">
                                        <div className="att-info">
                                            <Calendar size={16} />
                                            <span>Attendance Found: <strong>{fetchingAttendance ? '...' : detectedAttendance} classes</strong></span>
                                        </div>
                                        <input
                                            type="number"
                                            className="input-field override-input"
                                            placeholder={`Total`}
                                            value={genData.manualClasses}
                                            onChange={(e) => setGenData({ ...genData, manualClasses: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {weekends.length > 0 && (
                                    <div className="input-group">
                                        <label>Session Dates ({genData.selectedDates.length} selected)</label>
                                        <div className="dates-grid">
                                            {weekends.map((date, idx) => {
                                                const dISO = date.toISOString();
                                                const isSelected = genData.selectedDates.includes(dISO);
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        className={`date-chip ${isSelected ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            const newDates = isSelected
                                                                ? genData.selectedDates.filter(d => d !== dISO)
                                                                : [...genData.selectedDates, dISO];
                                                            setGenData({ ...genData, selectedDates: newDates, manualClasses: newDates.length || '' });
                                                        }}
                                                    >
                                                        <span className="day-name">{format(date, 'EEE')}</span>
                                                        <span className="day-num">{format(date, 'dd')}</span>
                                                        <span className="month-name">{format(date, 'MMM')}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="input-group">
                                        <label>End Month</label>
                                        <select
                                            className="input-field"
                                            value={genData.endMonth}
                                            onChange={(e) => setGenData({ ...genData, endMonth: e.target.value })}
                                        >
                                            {[...Array(12)].map((_, i) => {
                                                const m = String(i + 1).padStart(2, '0');
                                                return <option key={m} value={m}>{format(new Date(2000, i), 'MMMM')}</option>;
                                            })}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Year</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={genData.endYear}
                                            onChange={(e) => setGenData({ ...genData, endYear: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Month Span</label>
                                    <div className="month-count-selector">
                                        {MONTH_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`count-option ${genData.monthCount === opt.value ? 'active' : ''}`}
                                                onClick={() => setGenData({ ...genData, monthCount: opt.value })}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="input-group">
                                        <label>Adjustment Label</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="Label"
                                            value={genData.adjLabel}
                                            onChange={(e) => setGenData({ ...genData, adjLabel: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Amount (+/-)</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            placeholder="0"
                                            value={genData.adjustment}
                                            onChange={(e) => setGenData({ ...genData, adjustment: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="cancel-link" onClick={() => setShowGenModal(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={generating || !genData.studentId}>
                                        {generating ? <Loader2 className="animate-spin" size={20} /> : <FilePlus size={20} />}
                                        <span>{generating ? 'Creating...' : 'Generate'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx="true">{`
                .quotations-page { padding: 20px; }
                .action-btn { width: 34px; height: 34px; border-radius: 8px; background: var(--bg-secondary); color: var(--text-muted); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color); }
                .action-row { display: flex; gap: 6px; justify-content: flex-end; }
                .inv-code { font-family: monospace; font-weight: 700; color: #0ea5e9; background: rgba(14, 165, 233, 0.1); padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; }
                .st-cell { display: flex; flex-direction: column; gap: 4px; }
                .period-badge { display: flex; align-items: center; gap: 6px; color: var(--text-muted); }
                .total-amt { font-weight: 800; color: var(--text-main); font-size: 1rem; }
                .course-tag { font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; width: fit-content; }
                .course-tag.beginner { background: #dcfce7; color: #15803d; }
                .course-tag.intermediate { background: #fef3c7; color: #92400e; }
                .course-tag.advanced { background: #fee2e2; color: #991b1b; }
                .dates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; max-height: 150px; overflow-y: auto; padding: 10px; background: var(--bg-secondary); border-radius: 12px; margin-bottom: 8px; }
                .date-chip { display: flex; flex-direction: column; align-items: center; padding: 8px 4px; background: white; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .date-chip.selected { background: var(--primary); border-color: var(--primary); color: white; }
                .date-chip .day-name { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; opacity: 0.7; }
                .date-chip .day-num { font-size: 1.1rem; font-weight: 800; line-height: 1.1; margin: 2px 0; }
                .date-chip .month-name { font-size: 0.65rem; font-weight: 600; opacity: 0.8; }
                .attendance-preview-box { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-secondary); border-radius: 10px; margin-bottom: 8px; }
                .att-info { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-muted); flex: 1; }
                .override-input { width: 100px !important; margin: 0 !important; font-weight: 800; text-align: center; }
            `}</style>
        </motion.div>
    );
};

export default Quotations;
