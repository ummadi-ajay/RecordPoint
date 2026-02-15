import React, { useState, useEffect } from 'react';
import {
    FilePlus, Copy, Check, Eye, Trash2, Loader2, RefreshCcw,
    Calendar, FileText, TrendingUp, Hash, IndianRupee
} from 'lucide-react';
import {
    collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSaturday, isSunday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { InvoiceTableSkeleton, SkeletonStyles } from '../components/Skeleton';

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
                    month: m.month, year: m.year, label: m.label,
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
                    date: dStr, location: 'MAKER WORKS', topic: 'Class Session'
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
                    date: d.toISOString(), location: 'MAKER WORKS', topic: 'Planned Session'
                }));
            }

            const quotationData = {
                studentId, startMonth: monthsToFetch[0].month, startYear: monthsToFetch[0].year,
                endMonth: monthsToFetch[monthsToFetch.length - 1].month,
                endYear: monthsToFetch[monthsToFetch.length - 1].year,
                month: endMonth, year: endYear, monthCount, monthlyBreakdown,
                classCount: totalClassesToBill, actualAttendanceCount: totalClasses,
                sessions: finalSessions, ratePerClass: rate, adjustment: adjValue,
                adjLabel: adjLabel || (adjValue < 0 ? 'Discount' : 'Additional Fee'),
                totalAmount, isManualBilling: !!manualClasses, status: 'Quotation',
                type: 'quotation', createdAt: new Date().toISOString(),
                studentSnapshot: {
                    name: sData.name, parentName: sData.parentName,
                    email: sData.email, phone: sData.phone, course: sData.course || 'Beginner'
                }
            };

            await addDoc(collection(db, 'invoices'), quotationData);
            await fetchQuotations();
            setShowGenModal(false);
            setGenData({
                studentId: '', endMonth: format(new Date(), 'MM'),
                endYear: format(new Date(), 'yyyy'), monthCount: 1,
                manualClasses: '', selectedDates: [], adjustment: '', adjLabel: ''
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
        const link = `${window.location.origin}${window.location.pathname}#/invoice/${id}`;
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

    const totalValue = quotations.reduce((s, q) => s + (q.totalAmount || 0), 0);
    const avgValue = quotations.length > 0 ? totalValue / quotations.length : 0;

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

            {/* Summary Stats */}
            {!loading && quotations.length > 0 && (
                <motion.div className="q-stats-row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="q-stat-card glass card">
                        <div className="q-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}><Hash size={20} /></div>
                        <div className="q-stat-info">
                            <span className="q-stat-label">Total Quotations</span>
                            <span className="q-stat-value">{quotations.length}</span>
                        </div>
                    </div>
                    <div className="q-stat-card glass card">
                        <div className="q-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}><IndianRupee size={20} /></div>
                        <div className="q-stat-info">
                            <span className="q-stat-label">Total Value</span>
                            <span className="q-stat-value">₹{totalValue.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="q-stat-card glass card">
                        <div className="q-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}><TrendingUp size={20} /></div>
                        <div className="q-stat-info">
                            <span className="q-stat-label">Avg / Quotation</span>
                            <span className="q-stat-value">₹{Math.round(avgValue).toLocaleString()}</span>
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="glass card table-container">
                {loading ? (
                    <>
                        <SkeletonStyles />
                        <InvoiceTableSkeleton />
                    </>
                ) : quotations.length > 0 ? (
                    <>
                        {/* Desktop Table */}
                        <table className="modern-table q-desktop">
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
                                                <button onClick={() => window.open(`${window.location.origin}${window.location.pathname}#/invoice/${inv.id}`, '_blank')} className="action-btn" title="View">
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

                        {/* Mobile Cards */}
                        <div className="mobile-cards q-mobile">
                            {quotations.map((inv) => (
                                <motion.div key={inv.id} className="q-mobile-card glass" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                    <div className="qmc-top">
                                        <span className="inv-code">#{inv.id.slice(-8).toUpperCase()}</span>
                                        <span className={`course-tag ${inv.studentSnapshot?.course?.toLowerCase()}`}>
                                            {inv.studentSnapshot?.course}
                                        </span>
                                    </div>
                                    <div className="qmc-name">{inv.studentSnapshot?.name}</div>
                                    <div className="qmc-meta">
                                        <div className="period-badge"><Calendar size={13} /><span>{formatPeriod(inv)}</span></div>
                                        <span className="class-count">{inv.classCount} classes</span>
                                    </div>
                                    <div className="qmc-bottom">
                                        <span className="total-amt">₹{inv.totalAmount?.toLocaleString()}</span>
                                        <div className="action-row">
                                            <button onClick={() => window.open(`${window.location.origin}${window.location.pathname}#/invoice/${inv.id}`, '_blank')} className="action-btn" title="View"><Eye size={16} /></button>
                                            <button onClick={() => copyLink(inv.id)} className="action-btn" title="Copy Link">
                                                {copyingId === inv.id ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                                            </button>
                                            <button onClick={() => handleDelete(inv.id)} className="action-btn delete" title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="empty-box">
                        <div className="empty-icon-wrap">
                            <FileText size={48} />
                        </div>
                        <h4>No quotations yet</h4>
                        <p>Create your first quotation to get started</p>
                        <button className="btn-primary" onClick={() => setShowGenModal(true)}>
                            <FilePlus size={18} /> Create First Quotation
                        </button>
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
                                            placeholder="Total"
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
                .quotations-page { padding: 20px; max-width: 1200px; margin: 0 auto; }

                /* Page Header */
                .quotations-page .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 24px 28px;
                    margin-bottom: 20px;
                }
                .quotations-page .title-group h3 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin: 0;
                    color: var(--text-main);
                }
                .quotations-page .title-group p {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    margin: 4px 0 0;
                }
                .quotations-page .header-actions {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                .quotations-page .sync-btn {
                    width: 42px;
                    height: 42px;
                    border-radius: 12px;
                    background: var(--bg-secondary);
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--border-color);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .quotations-page .sync-btn:hover {
                    color: var(--primary);
                    border-color: var(--primary);
                    transform: translateY(-1px);
                }
                .quotations-page .btn-primary {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    background: var(--primary);
                    color: white;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.9rem;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
                }
                .quotations-page .btn-primary:hover {
                    background: var(--primary-hover);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
                }
                .quotations-page .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                /* Table Container */
                .quotations-page .table-container {
                    padding: 0;
                    background: var(--bg-card);
                    border-radius: 16px;
                    overflow: hidden;
                    min-height: 200px;
                }

                /* Summary Stats */
                .q-stats-row {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    margin-bottom: 20px;
                }
                .q-stat-card {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 18px 20px;
                }
                .q-stat-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .q-stat-info {
                    display: flex;
                    flex-direction: column;
                }
                .q-stat-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .q-stat-value {
                    font-size: 1.3rem;
                    font-weight: 800;
                    color: var(--text-main);
                }

                /* Table Styling */
                .action-btn {
                    width: 34px; height: 34px; border-radius: 8px;
                    background: var(--bg-secondary); color: var(--text-muted);
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid var(--border-color);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .action-btn:hover { background: var(--primary-light); color: var(--primary); border-color: var(--primary); transform: translateY(-1px); }
                .action-btn.delete:hover { background: #fef2f2; color: #ef4444; border-color: #ef4444; }
                .action-row { display: flex; gap: 6px; justify-content: flex-end; }
                .inv-code {
                    font-family: 'JetBrains Mono', monospace; font-weight: 700;
                    color: #0ea5e9; background: rgba(14, 165, 233, 0.1);
                    padding: 4px 10px; border-radius: 6px; font-size: 0.82rem;
                    letter-spacing: 0.5px;
                }
                .st-cell { display: flex; flex-direction: column; gap: 4px; }
                .period-badge { display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 0.88rem; }
                .total-amt { font-weight: 800; color: var(--text-main); font-size: 1rem; }
                .class-count { font-weight: 700; color: var(--primary); }
                .course-tag {
                    font-size: 0.62rem; font-weight: 700; padding: 2px 8px;
                    border-radius: 4px; text-transform: uppercase; width: fit-content;
                    letter-spacing: 0.3px;
                }
                .course-tag.beginner { background: #dcfce7; color: #15803d; }
                .course-tag.intermediate { background: #fef3c7; color: #92400e; }
                .course-tag.advanced { background: #fee2e2; color: #991b1b; }

                /* Desktop / Mobile Toggle */
                .q-desktop { display: table; width: 100%; }
                .q-mobile { display: none; }

                .q-mobile-card {
                    padding: 16px 18px;
                    border-radius: 14px;
                    margin: 12px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                }
                .q-mobile-card:first-child { margin-top: 12px; }
                .q-mobile-card:last-child { margin-bottom: 12px; }
                .qmc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                .qmc-name { font-weight: 700; font-size: 1.05rem; color: var(--text-main); margin-bottom: 6px; }
                .qmc-meta {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 12px; padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-color);
                }
                .qmc-bottom { display: flex; justify-content: space-between; align-items: center; }

                /* Empty State */
                .empty-box {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; padding: 60px 20px; text-align: center;
                }
                .empty-icon-wrap {
                    width: 80px; height: 80px; border-radius: 20px;
                    background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1));
                    display: flex; align-items: center; justify-content: center;
                    color: #3b82f6; margin-bottom: 16px;
                }
                .empty-box h4 { font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 4px; }
                .empty-box p { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 20px; }

                /* Modal */
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(6px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }
                .modal-card {
                    width: 100%;
                    max-width: 560px;
                    max-height: 85vh;
                    overflow-y: auto;
                    border-radius: 20px;
                    padding: 28px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.15);
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 24px;
                }
                .modal-header h3 { font-size: 1.25rem; font-weight: 800; margin: 0; color: var(--text-main); }
                .modal-header p { font-size: 0.85rem; color: var(--text-muted); margin: 4px 0 0; }
                .close-btn {
                    width: 36px; height: 36px; border-radius: 10px;
                    background: var(--bg-secondary); color: var(--text-muted);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.3rem; cursor: pointer; border: 1px solid var(--border-color);
                    transition: all 0.2s;
                }
                .close-btn:hover { color: var(--danger); border-color: var(--danger); }
                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 24px;
                    padding-top: 20px;
                    border-top: 1px solid var(--border-color);
                }
                .cancel-link {
                    padding: 10px 20px;
                    background: none;
                    color: var(--text-muted);
                    font-weight: 600;
                    border: none;
                    cursor: pointer;
                    border-radius: 10px;
                    transition: all 0.2s;
                }
                .cancel-link:hover { background: var(--bg-secondary); color: var(--text-main); }

                /* Form */
                .gen-form { display: flex; flex-direction: column; gap: 16px; }
                .input-group { display: flex; flex-direction: column; gap: 6px; }
                .input-group label {
                    font-size: 0.8rem; font-weight: 700; color: var(--text-muted);
                    text-transform: uppercase; letter-spacing: 0.5px;
                }
                .input-field {
                    width: 100%;
                    padding: 10px 14px;
                    border-radius: 10px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                    color: var(--text-main);
                    font-size: 0.9rem;
                    font-family: inherit;
                    transition: all 0.2s;
                    outline: none;
                }
                .input-field:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .month-count-selector { display: flex; gap: 8px; flex-wrap: wrap; }
                .count-option {
                    padding: 8px 16px;
                    border-radius: 10px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                    color: var(--text-muted);
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .count-option:hover { border-color: var(--primary); color: var(--primary); }
                .count-option.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
                }

                /* Date Chips */
                .dates-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
                    gap: 8px; max-height: 150px; overflow-y: auto; padding: 10px;
                    background: var(--bg-secondary); border-radius: 12px; margin-bottom: 8px;
                }
                .date-chip {
                    display: flex; flex-direction: column; align-items: center;
                    padding: 8px 4px; background: var(--bg-card);
                    border: 1px solid var(--border-color); border-radius: 8px;
                    cursor: pointer; transition: all 0.2s;
                }
                .date-chip:hover { border-color: var(--primary); transform: translateY(-1px); }
                .date-chip.selected { background: var(--primary); border-color: var(--primary); color: white; }
                .date-chip .day-name { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; opacity: 0.7; }
                .date-chip .day-num { font-size: 1.1rem; font-weight: 800; line-height: 1.1; margin: 2px 0; }
                .date-chip .month-name { font-size: 0.65rem; font-weight: 600; opacity: 0.8; }
                .attendance-preview-box {
                    display: flex; align-items: center; gap: 12px; padding: 12px;
                    background: var(--bg-secondary); border-radius: 10px; margin-bottom: 8px;
                }
                .att-info { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-muted); flex: 1; }
                .override-input { width: 100px !important; margin: 0 !important; font-weight: 800; text-align: center; }

                /* Animations */
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                @media (max-width: 768px) {
                    .quotations-page { padding: 12px; }
                    .quotations-page .page-header { flex-direction: column; gap: 12px; align-items: flex-start; padding: 18px 20px; }
                    .q-stats-row { grid-template-columns: 1fr; gap: 10px; }
                    .q-desktop { display: none !important; }
                    .q-mobile { display: block !important; }
                    .form-row { grid-template-columns: 1fr; }
                    .modal-card { padding: 20px; }
                }
            `}</style>
        </motion.div>
    );
};

export default Quotations;
