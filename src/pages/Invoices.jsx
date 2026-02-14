import React, { useState, useEffect, useRef } from 'react';
import {
    FilePlus,
    Copy,
    Check,
    Eye,
    Trash2,
    Loader2,
    RefreshCcw,
    Calendar,
    AlertCircle,
    MessageCircle,
    CheckCircle,
    Clock,
    Download,
    FileSpreadsheet,
    Users,
    Edit3,
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
    getDoc,
    updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSaturday, isSunday, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { fireConfetti, fireSideCannons } from '../utils/confetti';
import { useToast } from '../context/ToastContext';
import WhatsAppTemplates from '../components/WhatsAppTemplates';

const MONTH_OPTIONS = [
    { value: 1, label: '1 Month' },
    { value: 2, label: '2 Months' },
    { value: 3, label: '3 Months' },
    { value: 4, label: '4 Months' },
    { value: 6, label: '6 Months' }
];

const Invoices = () => {
    const toast = useToast();
    const [invoices, setInvoices] = useState([]);
    const [students, setStudents] = useState([]);
    const [coursePricing, setCoursePricing] = useState({});
    const [loading, setLoading] = useState(true);
    const [showGenModal, setShowGenModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [copyingId, setCopyingId] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const [filter, setFilter] = useState('all');
    const [detectedAttendance, setDetectedAttendance] = useState(0);
    const [fetchingAttendance, setFetchingAttendance] = useState(false);
    const [weekends, setWeekends] = useState([]);
    const [businessSettings, setBusinessSettings] = useState(null);

    const [genData, setGenData] = useState({
        studentId: '',
        endMonth: format(new Date(), 'MM'),
        endYear: format(new Date(), 'yyyy'),
        monthCount: 1,
        manualClasses: '',
        selectedDates: [],
        adjustment: '',
        adjLabel: '',
        type: 'invoice', // 'invoice' or 'quotation'
        selectedBankId: ''
    });

    const [bulkData, setBulkData] = useState({
        endMonth: format(new Date(), 'MM'),
        endYear: format(new Date(), 'yyyy'),
        monthCount: 1,
        selectedStudents: [],
        manualClasses: '',
        selectedBankId: ''
    });

    const fetchSettings = async () => {
        try {
            const sDoc = await getDoc(doc(db, 'settings', 'business'));
            if (sDoc.exists()) {
                const data = sDoc.data();
                setBusinessSettings(data);
                if (data.pricing) {
                    setCoursePricing(data.pricing);
                }
                // Only auto-select if nothing is currently selected
                if (data.bankAccounts?.length > 0) {
                    const defaultBank = data.bankAccounts.find(b => b.id === data.defaultBankId) || data.bankAccounts[0];
                    setGenData(prev => ({
                        ...prev,
                        selectedBankId: prev.selectedBankId || defaultBank.id
                    }));
                    setBulkData(prev => ({
                        ...prev,
                        selectedBankId: prev.selectedBankId || defaultBank.id
                    }));
                }
            } else {
                setCoursePricing({ 'Beginner': 999, 'Intermediate': 1499 });
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchSettings();
        fetchInvoices();
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

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'students'));
            const allStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(allStudents);
            setBulkData(prev => ({ ...prev, selectedStudents: allStudents.map(s => s.id) }));
        } catch (err) {
            console.error(err);
        }
    };

    const togglePaymentStatus = async (invoiceId, currentStatus, studentName, amount) => {
        const newStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
        try {
            await updateDoc(doc(db, 'invoices', invoiceId), {
                status: newStatus,
                paidAt: newStatus === 'Paid' ? new Date().toISOString() : null
            });
            setInvoices(invoices.map(inv =>
                inv.id === invoiceId ? { ...inv, status: newStatus } : inv
            ));

            // Celebrate when marked as paid! 🎉
            if (newStatus === 'Paid') {
                fireConfetti();
                setTimeout(() => fireSideCannons(), 300);
                toast.success(`Payment received! ₹${amount?.toLocaleString()} from ${studentName}`);
            } else {
                toast.warning(`Invoice marked as unpaid`);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to update status');
        }
    };

    const openWhatsAppTemplates = (inv) => {
        setSelectedInvoice(inv);
        setShowWhatsAppModal(true);
    };

    const openEditModal = (inv) => {
        setEditingInvoice({
            ...inv,
            studentName: inv.studentSnapshot?.name || '',
            parentName: inv.studentSnapshot?.parentName || '',
            phone: inv.studentSnapshot?.phone || '',
            email: inv.studentSnapshot?.email || '',
            address: inv.studentSnapshot?.address || '',
            course: inv.studentSnapshot?.course || '',
            adjustment: inv.adjustment || 0,
            adjLabel: inv.adjLabel || '',
            ratePerClass: inv.ratePerClass || 0,
            classCount: inv.classCount || 0,
            totalAmount: inv.totalAmount || 0,
            sessions: inv.sessions || [],
            invoiceNo: inv.customInvoiceNo || inv.id.slice(-6).toUpperCase(),
            bank: inv.bankSnapshot || businessSettings?.bank || {
                accountName: '',
                accountNumber: '',
                ifsc: '',
                bankName: '',
                accountType: '',
                upiId: businessSettings?.upiId || ''
            }
        });
        setShowEditModal(true);
    };

    const handleUpdateInvoice = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const { id, studentName, parentName, phone, email, address, course, adjustment, adjLabel, ratePerClass, classCount, sessions, invoiceNo, bank } = editingInvoice;

            const totalAmount = (parseInt(classCount) * parseFloat(ratePerClass)) + (parseFloat(adjustment) || 0);

            const updatedData = {
                classCount: parseInt(classCount),
                ratePerClass: parseFloat(ratePerClass),
                adjustment: parseFloat(adjustment) || 0,
                adjLabel: adjLabel,
                totalAmount: totalAmount,
                sessions: sessions,
                customInvoiceNo: invoiceNo,
                bankSnapshot: bank,
                studentSnapshot: {
                    name: studentName,
                    parentName: parentName,
                    phone: phone,
                    email: email,
                    address: address,
                    course: course
                }
            };

            await updateDoc(doc(db, 'invoices', id), updatedData);
            setInvoices(invoices.map(inv => inv.id === id ? { ...inv, ...updatedData } : inv));
            setShowEditModal(false);
            toast.success('Invoice updated successfully!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to update invoice');
        } finally {
            setUpdating(false);
        }
    };

    const shareOnWhatsApp = (inv) => {
        const phone = inv.studentSnapshot?.phone?.replace(/\D/g, '');
        const link = `${window.location.origin}${window.location.pathname}#/invoice/${inv.id}`;
        const period = formatPeriod(inv);
        const message = `Hello ${inv.studentSnapshot?.parentName}!\n\nHere is the invoice from Makerworks Lab for ${inv.studentSnapshot?.name}:\n\n📄 Invoice: #${inv.id.slice(-8).toUpperCase()}\n📅 Period: ${period}\n📚 Classes: ${inv.classCount}\n💰 Amount: ₹${inv.totalAmount?.toLocaleString()}\n\n🔗 View Invoice: ${link}\n\nThank you!`;
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const sendPaymentNudge = (inv) => {
        const phone = inv.studentSnapshot?.phone?.replace(/\D/g, '');
        const period = formatPeriod(inv);
        const message = `Hi ${inv.studentSnapshot?.parentName}!\n\nJust a friendly reminder regarding the invoice for ${inv.studentSnapshot?.name} (${period}).\n\n💰 Amount Due: ₹${inv.totalAmount?.toLocaleString()}\n📄 Invoice: #${inv.id.slice(-8).toUpperCase()}\n\nYou can view and pay it here: ${window.location.origin}${window.location.pathname}#/invoice/${inv.id}\n\nThank you!`;
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank');
        toast.info('Payment nudge created!');
    };

    const generateInvoiceForStudent = async (studentId, endMonth, endYear, monthCount, manualClasses = null, customDates = [], adjustment = 0, adjLabel = '', type = 'invoice', bankId = null) => {
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

        // Create custom sessions from dates if provided, or auto-generate if manual count is set
        let finalSessions = allSessions;
        if (customDates.length > 0) {
            finalSessions = customDates.map(dStr => ({
                date: dStr,
                location: 'MAKER WORKS',
                topic: 'Class Session'
            }));
        } else if (manualClasses) {
            // Auto-generate weekend dates for manual count
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

        const invoiceData = {
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
            status: type === 'quotation' ? 'Quotation' : 'Unpaid',
            type: type,
            createdAt: new Date().toISOString(),
            studentSnapshot: {
                name: sData.name,
                parentName: sData.parentName,
                email: sData.email,
                phone: sData.phone,
                address: sData.address || '',
                course: sData.course || 'Beginner'
            },
            bankSnapshot: (() => {
                let bank = null;
                if (bankId && businessSettings?.bankAccounts) {
                    bank = businessSettings.bankAccounts.find(b => b.id === bankId);
                } else if (businessSettings?.bankAccounts?.length > 0) {
                    bank = businessSettings.bankAccounts[0];
                }
                return bank ? { ...bank } : null;
            })()
        };

        return addDoc(collection(db, 'invoices'), invoiceData);
    };

    const generateInvoice = async (e) => {
        e.preventDefault();
        if (!genData.studentId) return;

        setGenerating(true);
        try {
            await generateInvoiceForStudent(
                genData.studentId,
                genData.endMonth,
                genData.endYear,
                genData.monthCount,
                genData.manualClasses,
                genData.selectedDates,
                genData.adjustment,
                genData.adjLabel,
                genData.type,
                genData.selectedBankId
            );
            await fetchInvoices();
            setShowGenModal(false);
            setGenData(prev => ({ ...prev, manualClasses: '', selectedDates: [], adjustment: '', adjLabel: '' }));
        } catch (err) {
            console.error('Generation Error:', err);
            alert('Error: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    const generateBulkInvoices = async (e) => {
        e.preventDefault();
        if (bulkData.selectedStudents.length === 0) return;

        setGenerating(true);
        setBulkProgress({ current: 0, total: bulkData.selectedStudents.length });

        try {
            for (let i = 0; i < bulkData.selectedStudents.length; i++) {
                await generateInvoiceForStudent(
                    bulkData.selectedStudents[i],
                    bulkData.endMonth,
                    bulkData.endYear,
                    bulkData.monthCount,
                    bulkData.manualClasses,
                    [], 0, '', 'invoice',
                    bulkData.selectedBankId
                );
                setBulkProgress({ current: i + 1, total: bulkData.selectedStudents.length });
            }
            await fetchInvoices();
            setShowBulkModal(false);
            alert(`Successfully generated ${bulkData.selectedStudents.length} invoices!`);
        } catch (err) {
            console.error('Bulk Generation Error:', err);
            alert('Error: ' + err.message);
        } finally {
            setGenerating(false);
            setBulkProgress({ current: 0, total: 0 });
        }
    };

    const toggleStudentSelection = (studentId) => {
        setBulkData(prev => ({
            ...prev,
            selectedStudents: prev.selectedStudents.includes(studentId)
                ? prev.selectedStudents.filter(id => id !== studentId)
                : [...prev.selectedStudents, studentId]
        }));
    };

    const selectAllStudents = () => {
        setBulkData(prev => ({
            ...prev,
            selectedStudents: prev.selectedStudents.length === students.length ? [] : students.map(s => s.id)
        }));
    };

    const exportToExcel = () => {
        const data = invoices.map(inv => ({
            'Invoice #': inv.id.slice(-8).toUpperCase(),
            'Student': inv.studentSnapshot?.name,
            'Parent': inv.studentSnapshot?.parentName,
            'Phone': inv.studentSnapshot?.phone,
            'Email': inv.studentSnapshot?.email,
            'Course': inv.studentSnapshot?.course,
            'Period': formatPeriod(inv),
            'Classes': inv.classCount,
            'Rate': inv.ratePerClass,
            'Amount': inv.totalAmount,
            'Status': inv.status,
            'Created': format(new Date(inv.createdAt), 'dd/MM/yyyy')
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Invoices_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast.success(`Exported ${invoices.length} invoices to Excel!`);
    };

    const copyLink = (id) => {
        const link = `${window.location.origin}${window.location.pathname}#/invoice/${id}`;
        navigator.clipboard.writeText(link);
        setCopyingId(id);
        toast.success('Invoice link copied to clipboard!');
        setTimeout(() => setCopyingId(null), 2000);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this invoice?')) {
            try {
                await deleteDoc(doc(db, 'invoices', id));
                fetchInvoices();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const formatPeriod = (inv) => {
        if (inv.monthCount > 1) {
            const start = format(new Date(2000, parseInt(inv.startMonth) - 1), 'MMM');
            const end = format(new Date(2000, parseInt(inv.endMonth) - 1), 'MMM');
            return `${start} - ${end} ${inv.endYear}`;
        }
        return `${format(new Date(2000, parseInt(inv.month) - 1), 'MMM')} ${inv.year}`;
    };

    const filteredInvoices = invoices.filter(inv => {
        if (filter === 'paid') return inv.status === 'Paid';
        if (filter === 'unpaid') return inv.status === 'Unpaid';
        return inv.type !== 'quotation';
    });

    const stats = {
        total: invoices.filter(i => i.type !== 'quotation').length,
        paid: invoices.filter(i => i.status === 'Paid').length,
        unpaid: invoices.filter(i => i.type !== 'quotation' && i.status === 'Unpaid').length,
        totalAmount: invoices.filter(i => i.type !== 'quotation').reduce((acc, i) => acc + (i.totalAmount || 0), 0),
        paidAmount: invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + (i.totalAmount || 0), 0)
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="invoices-page">
            <div className="page-header glass card">
                <div className="title-group">
                    <h3>Invoices</h3>
                    <p>Generate and manage student bills</p>
                </div>
                <div className="header-actions">
                    <button className="export-btn" onClick={exportToExcel} title="Export to Excel">
                        <FileSpreadsheet size={18} /> Export
                    </button>
                    <button className="sync-btn" onClick={fetchInvoices}>
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button className="bulk-btn" onClick={() => {
                        fetchSettings();
                        setShowBulkModal(true);
                    }}>
                        <Users size={18} /> Bulk Generate
                    </button>
                    <button className="btn-primary" onClick={() => {
                        fetchSettings();
                        setShowGenModal(true);
                    }}>
                        <FilePlus size={18} /> Generate Bill
                    </button>
                </div>
            </div>

            {/* Combined Stats & Filter Bar */}
            <div className="stats-bar interactive">
                <div
                    className={`stat-pill ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    <span className="stat-num">{stats.total}</span>
                    <span>Total Invoices</span>
                </div>
                <div
                    className={`stat-pill unpaid ${filter === 'unpaid' ? 'active' : ''}`}
                    onClick={() => setFilter('unpaid')}
                >
                    <span className="stat-num">{stats.unpaid}</span>
                    <span>Pending Payment</span>
                </div>
                <div
                    className={`stat-pill paid ${filter === 'paid' ? 'active' : ''}`}
                    onClick={() => setFilter('paid')}
                >
                    <span className="stat-num">{stats.paid}</span>
                    <span>Received</span>
                </div>
                <div className="stat-pill amount">
                    <span className="stat-num">₹{stats.paidAmount.toLocaleString()}</span>
                    <span>Total Collected</span>
                </div>
            </div>

            <div className="glass card table-container">
                {loading ? (
                    <div className="loader-box">
                        <Loader2 className="animate-spin text-primary" size={40} />
                        <p>Loading invoices...</p>
                    </div>
                ) : filteredInvoices.length > 0 ? (
                    <>
                        <table className="modern-table desktop-only">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Student</th>
                                    <th>Period</th>
                                    <th>Classes</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className={inv.status === 'Paid' ? 'row-paid' : 'row-unpaid'}>
                                        <td>
                                            <div className="inv-id-cell">
                                                <span className={`type-tag ${inv.type || 'invoice'}`}>
                                                    {inv.type === 'quotation' ? 'QUOT' : 'INV'}
                                                </span>
                                                <span className="inv-code">#{inv.id.slice(-8).toUpperCase()}</span>
                                            </div>
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
                                                {inv.monthCount > 1 && (
                                                    <span className="multi-badge">{inv.monthCount}M</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="class-count">{inv.classCount}</span>
                                        </td>
                                        <td>
                                            <span className="total-amt">₹{inv.totalAmount?.toLocaleString()}</span>
                                        </td>
                                        <td>
                                            <button
                                                className={`status-toggle ${inv.status?.toLowerCase()}`}
                                                onClick={() => inv.type !== 'quotation' && togglePaymentStatus(inv.id, inv.status, inv.studentSnapshot?.name, inv.totalAmount)}
                                                disabled={inv.type === 'quotation'}
                                            >
                                                {inv.status === 'Paid' ? <CheckCircle size={14} /> : (inv.type === 'quotation' ? <FileText size={14} /> : <Clock size={14} />)}
                                                {inv.status}
                                            </button>
                                        </td>
                                        <td align="right">
                                            <div className="action-row">
                                                {inv.status !== 'Paid' && (
                                                    <button onClick={() => sendPaymentNudge(inv)} className="action-btn nudge" title="Send Payment Nudge">
                                                        <MessageCircle size={18} />
                                                    </button>
                                                )}
                                                <button onClick={() => openWhatsAppTemplates(inv)} className="action-btn whatsapp" title="WhatsApp Templates">
                                                    <Copy size={18} />
                                                </button>
                                                <button onClick={() => openEditModal(inv)} className="action-btn" title="Edit Everything">
                                                    <Edit3 size={18} />
                                                </button>
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

                        <div className="mobile-cards-view mobile-only">
                            {filteredInvoices.map((inv) => (
                                <div key={inv.id} className={`invoice-mobile-card ${inv.status === 'Paid' ? 'paid' : 'unpaid'}`}>
                                    <div className="card-top">
                                        <div className="card-id">
                                            <span className={`type-tag-sm ${inv.type || 'invoice'}`}>
                                                {inv.type === 'quotation' ? 'QUOT' : 'INV'}
                                            </span>
                                            <strong>#{inv.id.slice(-8).toUpperCase()}</strong>
                                        </div>
                                        <button
                                            className={`status-pill ${inv.status?.toLowerCase()}`}
                                            onClick={() => inv.type !== 'quotation' && togglePaymentStatus(inv.id, inv.status, inv.studentSnapshot?.name, inv.totalAmount)}
                                            disabled={inv.type === 'quotation'}
                                        >
                                            {inv.status}
                                        </button>
                                    </div>

                                    <div className="card-student">
                                        <div className="student-info">
                                            <h3>{inv.studentSnapshot?.name}</h3>
                                            <span className={`course-tag-sm ${inv.studentSnapshot?.course?.toLowerCase()}`}>
                                                {inv.studentSnapshot?.course}
                                            </span>
                                        </div>
                                        <div className="card-amount">₹{inv.totalAmount?.toLocaleString()}</div>
                                    </div>

                                    <div className="card-details">
                                        <div className="detail-item">
                                            <Calendar size={12} />
                                            <span>{formatPeriod(inv)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <strong>{inv.classCount} classes</strong>
                                        </div>
                                    </div>

                                    <div className="card-actions">
                                        <button onClick={() => window.open(`${window.location.origin}${window.location.pathname}#/invoice/${inv.id}`, '_blank')} className="card-action-btn primary">
                                            <Eye size={16} /> View
                                        </button>
                                        <button onClick={() => openEditModal(inv)} className="card-action-btn">
                                            <Edit3 size={16} /> Edit
                                        </button>
                                        <button onClick={() => openWhatsAppTemplates(inv)} className="card-action-btn whatsapp">
                                            <Copy size={16} /> Send
                                        </button>
                                        {inv.status !== 'Paid' && (
                                            <button onClick={() => sendPaymentNudge(inv)} className="card-action-btn nudge">
                                                <MessageCircle size={16} /> Nudge
                                            </button>
                                        )}
                                        <button onClick={() => handleDelete(inv.id)} className="card-action-btn delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="empty-box">
                        <FilePlus size={48} />
                        <p>No invoices found.</p>
                        <button className="btn-primary" onClick={() => setShowGenModal(true)}>Create First Invoice</button>
                    </div>
                )}
            </div>

            {/* Single Invoice Modal */}
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
                                    <h3>Generate Invoice</h3>
                                    <p>Choose student and billing period</p>
                                </div>
                                <button className="close-btn" onClick={() => setShowGenModal(false)}>×</button>
                            </div>

                            <form onSubmit={generateInvoice} className="gen-form">
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
                                            placeholder={`Enter total (default: ${detectedAttendance})`}
                                            value={genData.manualClasses}
                                            onChange={(e) => setGenData({ ...genData, manualClasses: e.target.value })}
                                        />
                                    </div>
                                    <div className="scenario-hints">
                                        <p className="hint">1. For <strong>Future Classes</strong>, enter total classes planned (e.g. 4).</p>
                                        <p className="hint">2. For <strong>Past Classes</strong>, leave empty to use attendance ({detectedAttendance}).</p>
                                        <p className="hint">3. For <strong>Mixed</strong>, enter the total count (Past + Future).</p>
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
                                        <p className="hint">Suggested based on Saturdays & Sundays. Click to toggle.</p>
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
                                        <label>Extra Fee/Discount Label</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="e.g. Sibling Discount"
                                            value={genData.adjLabel}
                                            onChange={(e) => setGenData({ ...genData, adjLabel: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Amount (Use - for discount)</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            placeholder="e.g. -200 or 500"
                                            value={genData.adjustment}
                                            onChange={(e) => setGenData({ ...genData, adjustment: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Payment Bank Account</label>
                                    <select
                                        className="input-field"
                                        value={genData.selectedBankId}
                                        onChange={(e) => setGenData({ ...genData, selectedBankId: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Select Bank Account --</option>
                                        {(businessSettings?.bankAccounts || []).map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.bankName} ({b.accountNumber.slice(-4)})
                                            </option>
                                        ))}
                                    </select>
                                    {(!businessSettings?.bankAccounts || businessSettings.bankAccounts.length === 0) && (
                                        <div className="error-hint" style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                                            ⚠️ No bank accounts found! Please add one in Settings first.
                                        </div>
                                    )}
                                    <span className="hint">The bank account details shown on the invoice</span>
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

            {/* Edit Everything Modal */}
            <AnimatePresence>
                {showEditModal && editingInvoice && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass modal-card edit-everything-modal"
                        >
                            <div className="modal-header">
                                <div>
                                    <h3>Edit Invoice</h3>
                                    <p>You can edit every detail of this invoice</p>
                                </div>
                                <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
                            </div>

                            <form onSubmit={handleUpdateInvoice} className="gen-form">
                                <div className="section-title">📊 Invoice Metadata</div>
                                <div className="input-group">
                                    <label>Invoice Number #</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={editingInvoice.invoiceNo}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, invoiceNo: e.target.value })}
                                        placeholder="e.g. 212"
                                    />
                                    <span className="hint">Custom invoice number to display</span>
                                </div>

                                <div className="section-title">👤 Student Details</div>
                                <div className="form-row">
                                    <div className="input-group">
                                        <label>Student Name</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={editingInvoice.studentName}
                                            onChange={(e) => setEditingInvoice({ ...editingInvoice, studentName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Parent Name</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={editingInvoice.parentName}
                                            onChange={(e) => setEditingInvoice({ ...editingInvoice, parentName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="input-group">
                                        <label>Phone</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={editingInvoice.phone}
                                            onChange={(e) => setEditingInvoice({ ...editingInvoice, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            className="input-field"
                                            value={editingInvoice.email}
                                            onChange={(e) => setEditingInvoice({ ...editingInvoice, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Student Address</label>
                                    <textarea
                                        className="input-field"
                                        rows="2"
                                        value={editingInvoice.address}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, address: e.target.value })}
                                    />
                                </div>

                                <div className="section-title">💰 Billing & Pricing</div>
                                <div className="form-row">
                                    <div className="input-group">
                                        <label>Class Count</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={editingInvoice.classCount}
                                            onChange={(e) => setEditingInvoice({ ...editingInvoice, classCount: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Rate Per Class (₹)</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={editingInvoice.ratePerClass}
                                            onChange={(e) => setEditingInvoice({ ...editingInvoice, ratePerClass: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="input-group">
                                        <label>Adjustment Label</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={editingInvoice.adjLabel}
                                            onChange={(e) => setEditingInvoice({ ...editingInvoice, adjLabel: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Adjustment Amount (₹)</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={editingInvoice.adjustment}
                                            onChange={(e) => setEditingInvoice({ ...editingInvoice, adjustment: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="section-title">🏦 Bank & UPI Details</div>
                                <div className="input-group">
                                    <label>Switch Bank Account (Fast Fill)</label>
                                    <select
                                        className="input-field"
                                        style={{ background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--primary)' }}
                                        onChange={(e) => {
                                            const selected = businessSettings?.bankAccounts?.find(b => b.id === e.target.value);
                                            if (selected) {
                                                setEditingInvoice({
                                                    ...editingInvoice,
                                                    bank: { ...selected }
                                                });
                                            }
                                        }}
                                    >
                                        <option value="">-- Choose Account --</option>
                                        {(businessSettings?.bankAccounts || []).map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.bankName} - {b.accountNumber}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="hint">This will overwrite the current bank details for this invoice.</span>
                                </div>
                                <div className="form-group">
                                    <label>Account Name</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={editingInvoice.bank.accountName}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, bank: { ...editingInvoice.bank, accountName: e.target.value } })}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="input-group">
                                        <label>Account Number</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={editingInvoice.bank.accountNumber}
                                            onChange={(e) => setEditingInvoice({ ...editingInvoice, bank: { ...editingInvoice.bank, accountNumber: e.target.value } })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>IFSC Code</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={editingInvoice.bank.ifsc}
                                            onChange={(e) => setEditingInvoice({ ...editingInvoice, bank: { ...editingInvoice.bank, ifsc: e.target.value } })}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="input-group">
                                        <label>Bank Name</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={editingInvoice.bank.bankName}
                                            onChange={(e) => setEditingInvoice({ ...editingInvoice, bank: { ...editingInvoice.bank, bankName: e.target.value } })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Account Type</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={editingInvoice.bank.accountType}
                                            onChange={(e) => setEditingInvoice({ ...editingInvoice, bank: { ...editingInvoice.bank, accountType: e.target.value } })}
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>UPI ID (for QR Code)</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={editingInvoice.bank.upiId}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, bank: { ...editingInvoice.bank, upiId: e.target.value } })}
                                    />
                                </div>

                                <div className="summary-preview">
                                    <span>New Total:</span>
                                    <strong>₹{((parseInt(editingInvoice.classCount) || 0) * (parseFloat(editingInvoice.ratePerClass) || 0) + (parseFloat(editingInvoice.adjustment) || 0)).toLocaleString()}</strong>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="cancel-link" onClick={() => setShowEditModal(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={updating}>
                                        {updating ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                                        <span>{updating ? 'Updating...' : 'Save Changes'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bulk Invoice Modal */}
            <AnimatePresence>
                {showBulkModal && (
                    <div className="modal-overlay">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass modal-card bulk-modal"
                        >
                            <div className="modal-header">
                                <div>
                                    <h3>⚡ Bulk Generate Invoices</h3>
                                    <p>Generate invoices for multiple students at once</p>
                                </div>
                                <button className="close-btn" onClick={() => setShowBulkModal(false)}>×</button>
                            </div>

                            <form onSubmit={generateBulkInvoices} className="gen-form">
                                <div className="input-group">
                                    <label>How many months?</label>
                                    <div className="month-count-selector">
                                        {MONTH_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`count-option ${bulkData.monthCount === opt.value ? 'active' : ''}`}
                                                onClick={() => setBulkData({ ...bulkData, monthCount: opt.value })}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Override for All Students (Optional)</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        placeholder="e.g. 4"
                                        value={bulkData.manualClasses}
                                        onChange={(e) => setBulkData({ ...bulkData, manualClasses: e.target.value })}
                                    />
                                    <div className="scenario-hints">
                                        <p className="hint">Setting this will bill <strong>everyone</strong> for this exact number of classes, regardless of their attendance.</p>
                                        <p className="hint">Leave empty to bill each student based on their individual past attendance.</p>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="input-group">
                                        <label>End Month</label>
                                        <select
                                            className="input-field"
                                            value={bulkData.endMonth}
                                            onChange={(e) => setBulkData({ ...bulkData, endMonth: e.target.value })}
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
                                            value={bulkData.endYear}
                                            onChange={(e) => setBulkData({ ...bulkData, endYear: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Payment Bank Account (For All)</label>
                                    <select
                                        className="input-field"
                                        value={bulkData.selectedBankId}
                                        onChange={(e) => setBulkData({ ...bulkData, selectedBankId: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Select Bank Account --</option>
                                        {(businessSettings?.bankAccounts || []).map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.bankName} ({b.accountNumber.slice(-4)})
                                            </option>
                                        ))}
                                    </select>
                                    {(!businessSettings?.bankAccounts || businessSettings.bankAccounts.length === 0) && (
                                        <div className="error-hint" style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                                            ⚠️ No bank accounts found! Please add one in Settings first.
                                        </div>
                                    )}
                                </div>

                                <div className="input-group">
                                    <div className="students-header">
                                        <label>Select Students ({bulkData.selectedStudents.length}/{students.length})</label>
                                        <button type="button" className="select-all-btn" onClick={selectAllStudents}>
                                            {bulkData.selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    <div className="students-grid">
                                        {students.map(s => (
                                            <div
                                                key={s.id}
                                                className={`student-chip ${bulkData.selectedStudents.includes(s.id) ? 'selected' : ''}`}
                                                onClick={() => toggleStudentSelection(s.id)}
                                            >
                                                <span className="chip-avatar">{s.name?.[0]}</span>
                                                <span className="chip-name">{s.name}</span>
                                                {bulkData.selectedStudents.includes(s.id) && <Check size={14} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {generating && bulkProgress.total > 0 && (
                                    <div className="progress-section">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span>Generating {bulkProgress.current} of {bulkProgress.total}...</span>
                                    </div>
                                )}

                                <div className="modal-footer">
                                    <button type="button" className="cancel-link" onClick={() => setShowBulkModal(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={generating || bulkData.selectedStudents.length === 0}>
                                        {generating ? <Loader2 className="animate-spin" size={20} /> : <Users size={20} />}
                                        <span>{generating ? 'Generating...' : `Generate ${bulkData.selectedStudents.length} Invoices`}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* WhatsApp Templates Modal */}
            <WhatsAppTemplates
                isOpen={showWhatsAppModal}
                onClose={() => {
                    setShowWhatsAppModal(false);
                    setSelectedInvoice(null);
                }}
                invoice={selectedInvoice}
            />

            <style jsx="true">{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          margin-bottom: 20px;
          background: var(--bg-card);
        }

        .title-group h3 { margin: 0; font-size: 1.25rem; font-weight: 700; }
        .title-group p { margin: 4px 0 0; font-size: 0.85rem; color: var(--text-muted); }

        .header-actions { display: flex; gap: 12px; }
        .sync-btn { padding: 10px; border-radius: 10px; background: var(--bg-secondary); color: var(--text-muted); }

        .export-btn, .bulk-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .export-btn { background: #ecfdf5; color: #10b981; }
        .bulk-btn { background: #f0f4ff; color: var(--primary); }

        /* Stats Bar */
        .stats-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 25px;
          flex-wrap: wrap;
        }
        .stats-bar.interactive .stat-pill { cursor: pointer; transition: all 0.2s; border: 2px solid transparent; }
        .stats-bar.interactive .stat-pill:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .stats-bar.interactive .stat-pill.active { border-color: var(--primary); background: #f5f3ff; color: var(--primary); }
        .stats-bar.interactive .stat-pill.unpaid.active { border-color: #f59e0b; background: #fffbeb; }
        .stats-bar.interactive .stat-pill.paid.active { border-color: #10b981; background: #f0fdf4; }

        .stat-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: var(--bg-card);
          border-radius: 40px;
          font-size: 0.9rem;
          color: var(--text-muted);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border: 2px solid transparent;
        }

        .stat-num { font-weight: 800; color: var(--text-main); font-size: 1.1rem; }
        .stat-pill.paid .stat-num { color: #10b981; }
        .stat-pill.unpaid .stat-num { color: #f59e0b; }
        .stat-pill.amount .stat-num { color: var(--primary); }

        /* Unified Stats/Filter Layout */

        .table-container { padding: 0; background: var(--bg-card); min-height: 300px; }

        .row-paid { background: rgba(16, 185, 129, 0.05); }
        .row-unpaid { background: rgba(245, 158, 11, 0.05); }

        .inv-id-cell { display: flex; align-items: center; gap: 8px; }
        .type-tag {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .type-tag.invoice { background: rgba(79, 70, 229, 0.1); color: var(--primary); }
        .type-tag.quotation { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; }

        .inv-code {
          font-family: monospace;
          font-weight: 700;
          color: var(--primary);
          background: rgba(79, 70, 229, 0.1);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.85rem;
        }

        .st-cell { display: flex; flex-direction: column; gap: 4px; }
        .st-cell strong { font-size: 0.95rem; }

        .course-tag {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          width: fit-content;
        }

        .course-tag.beginner { background: #dcfce7; color: #15803d; }
        .course-tag.intermediate { background: #fef3c7; color: #92400e; }
        .course-tag.advanced { background: #fee2e2; color: #991b1b; }

        .period-badge { display: flex; align-items: center; gap: 6px; color: var(--text-muted); }

        .multi-badge {
          background: rgba(79, 70, 229, 0.1);
          color: var(--primary);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 800;
        }

        .class-count { font-weight: 700; }
        .total-amt { font-weight: 800; color: var(--text-main); font-size: 1rem; }

        .status-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.75rem;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .status-toggle.paid { background: #dcfce7; color: #15803d; }
        .status-toggle.unpaid { background: #fef3c7; color: #92400e; }
        .status-toggle.quotation { background: #e0f2fe; color: #0369a1; }
        .status-toggle:hover:not(:disabled) { transform: scale(1.05); }
        .status-toggle:disabled { cursor: default; opacity: 0.9; }

        .action-row { display: flex; gap: 6px; justify-content: flex-end; }

        .action-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-color);
        }

        .action-btn:hover { border-color: var(--primary); color: var(--primary); }
        .action-btn.delete:hover { border-color: var(--danger); color: var(--danger); }
        .action-btn.whatsapp { background: #dcfce7; color: #25D366; border-color: #86efac; }
        .action-btn.whatsapp:hover { background: #25D366; color: white; }
        .action-btn.nudge { background: #fffbeb; color: #f59e0b; border-color: #fef3c7; }
        .action-btn.nudge:hover { background: #f59e0b; color: white; }

        .loader-box, .empty-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: var(--text-muted);
          gap: 16px;
        }

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
          max-width: 500px;
          padding: 30px;
          background: var(--bg-card);
          box-shadow: var(--shadow-lg);
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 20px;
        }

        .bulk-modal { max-width: 600px; }

        .modal-header { display: flex; justify-content: space-between; margin-bottom: 25px; }
        .modal-header h3 { font-size: 1.2rem; font-weight: 700; margin: 0; color: var(--text-main); }
        .modal-header p { font-size: 0.85rem; color: var(--text-muted); }
        .close-btn { font-size: 1.5rem; background: none; color: var(--text-muted); line-height: 1; }

        .gen-form { display: flex; flex-direction: column; gap: 20px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }

        .input-group label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; }

        .month-count-selector { display: flex; gap: 8px; flex-wrap: wrap; }

        .count-option {
          padding: 10px 18px;
          border: 2px solid var(--border-color);
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          background: var(--bg-card);
          color: var(--text-muted);
        }

        .count-option:hover { border-color: var(--primary); color: var(--primary); }
        .count-option.active { background: var(--primary); border-color: var(--primary); color: white; }

        .type-selector { display: flex; gap: 8px; }
        .type-opt {
          flex: 1;
          padding: 10px;
          border: 2px solid var(--border-color);
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          background: var(--bg-card);
          color: var(--text-muted);
        }
        .type-opt:hover { border-color: var(--primary); color: var(--primary); }
        .type-opt.active { 
          background: rgba(79, 70, 229, 0.1); 
          border-color: var(--primary); 
          color: var(--primary); 
        }

        .students-header { display: flex; justify-content: space-between; align-items: center; }

        .select-all-btn {
          background: none;
          color: var(--primary);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .section-title {
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--primary);
          margin-top: 10px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 5px;
        }

        .summary-preview {
          background: #f0f4ff;
          padding: 15px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 1.1rem;
        }
        .summary-preview strong { color: var(--primary); font-size: 1.3rem; }

        .edit-everything-modal {
            max-width: 600px;
        }

        .students-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          max-height: 250px;
          overflow-y: auto;
          padding: 10px;
          background: var(--bg-secondary);
          border-radius: 10px;
        }

        .student-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--bg-card);
          border: 2px solid var(--border-color);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .student-chip:hover { border-color: var(--primary); }

        .student-chip.selected {
          border-color: var(--primary);
          background: rgba(79, 70, 229, 0.1);
        }

        .chip-avatar {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
        }

        .chip-name { flex: 1; font-weight: 600; font-size: 0.85rem; }

        .attendance-preview-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 10px;
          margin-bottom: 8px;
        }
        .att-info { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-muted); flex: 1; }
        .att-info strong { color: var(--primary); }
        .override-input { width: 140px !important; margin: 0 !important; font-weight: 800; text-align: center; }
        .scenario-hints { padding: 4px 8px; }
        .scenario-hints .hint { margin-bottom: 4px; font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; }
        .scenario-hints strong { color: var(--text-main); }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }

        .input-group label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; }

        .month-count-selector { display: flex; gap: 8px; flex-wrap: wrap; }

        .dates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
          gap: 8px;
          max-height: 150px;
          overflow-y: auto;
          padding: 10px;
          background: var(--bg-secondary);
          border-radius: 12px;
          margin-bottom: 8px;
        }

        .date-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 4px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .date-chip:hover { border-color: var(--primary); transform: translateY(-2px); }
        .date-chip.selected { background: var(--primary); border-color: var(--primary); color: white; }

        .date-chip .day-name { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; opacity: 0.7; }
        .date-chip .day-num { font-size: 1.1rem; font-weight: 800; line-height: 1.1; margin: 2px 0; }
        .date-chip .month-name { font-size: 0.65rem; font-weight: 600; opacity: 0.8; }
        .date-chip.selected .day-name, .date-chip.selected .month-name { opacity: 0.9; }

        /* Mobile Utility Classes */
        .mobile-only { display: none !important; }
        .desktop-only { display: table !important; width: 100%; border-collapse: collapse; }

        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: block !important; }
          .page-header { flex-direction: column; gap: 15px; }
          .header-actions { width: 100%; overflow-x: auto; padding-bottom: 5px; }
          .stats-bar { grid-template-columns: repeat(2, 1fr); padding: 5px; background: none; box-shadow: none; border: none; }
          .stat-pill { background: var(--bg-card); padding: 10px; border-radius: 12px; border: 1px solid var(--border-color); }
          .form-row { grid-template-columns: 1fr; }
          .table-container { background: none; border: none; box-shadow: none; padding: 0; }
        }

        /* Mobile Card Styles */
        .mobile-cards-view { display: flex; flex-direction: column; gap: 15px; padding: 10px 0; }
        .invoice-mobile-card {
          background: var(--bg-card);
          border-radius: 16px;
          padding: 18px;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
          position: relative;
          overflow: hidden;
        }
        .invoice-mobile-card.paid { border-left: 5px solid #10b981; }
        .invoice-mobile-card.unpaid { border-left: 5px solid #f59e0b; }

        .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .card-id { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; }
        .type-tag-sm { padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 0.65rem; background: var(--bg-secondary); }
        .type-tag-sm.quotation { background: #e0f2fe; color: #0369a1; }
        .type-tag-sm.invoice { background: #f1f5f9; color: #475569; }

        .status-pill {
          padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 800;
          text-transform: uppercase; cursor: pointer; border: none;
        }
        .status-pill.paid { background: #dcfce7; color: #15803d; }
        .status-pill.unpaid { background: #fef3c7; color: #92400e; }

        .card-student { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .student-info h3 { margin: 0 0 4px 0; font-size: 1.1rem; color: var(--text-main); }
        .course-tag-sm { font-size: 0.7rem; color: var(--primary); font-weight: 700; text-transform: uppercase; }
        .card-amount { font-size: 1.2rem; font-weight: 800; color: var(--text-main); }

        .card-details { display: flex; gap: 20px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 18px; }
        .detail-item { display: flex; align-items: center; gap: 6px; }

        .card-actions { 
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
          border-top: 1px solid var(--border-color); padding-top: 15px;
        }
        .card-action-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; padding: 8px 4px; border-radius: 10px; font-size: 0.65rem; font-weight: 700;
          background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-muted);
          transition: all 0.2s;
        }
        .card-action-btn.primary { background: rgba(var(--primary-rgb), 0.05); color: var(--primary); border-color: var(--primary); }
        .card-action-btn.whatsapp { background: #f0fdf4; color: #16a34a; border-color: #bcf5d4; }
        .card-action-btn.nudge { background: #fffbeb; color: #d97706; border-color: #fde68a; }
        .card-action-btn.delete { color: #ef4444; }
        .card-action-btn:active { transform: scale(0.95); }

      `}</style>
        </motion.div >
    );
};

export default Invoices;
