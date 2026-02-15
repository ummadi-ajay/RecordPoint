import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Users,
    DollarSign,
    Brain,
    Loader2,
    Calendar,
    ChevronRight,
    Sparkles,
    FileText,
    Search,
    X,
    MessageCircle,
    Plus,
    Trash2
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { collection, getDocs, doc, getDoc, addDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, subMonths, isSameMonth } from 'date-fns';
import { motion } from 'framer-motion';
import { InsightsSkeleton } from '../components/Skeleton';

const Insights = () => {
    const [loading, setLoading] = useState(true);
    const [allStudents, setAllStudents] = useState([]);
    const [chartData, setChartData] = useState([]);

    const [stats, setStats] = useState({
        totalStudents: 0,
        activeStudents: 0,
        churnRisk: [],
        revenueForecast: 0,
        growthRate: 0,
        topPerformers: []
    });

    const [selectedStudent, setSelectedStudent] = useState(null);
    const [aiReport, setAiReport] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [error, setError] = useState(null);
    const [allAttendance, setAllAttendance] = useState([]); // Store all attendance for quarterly analysis
    const [expenses, setExpenses] = useState([]);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd') });

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log("Fetching insights data...");
            const now = new Date();
            const currentMonth = format(now, 'MM');
            const currentYear = format(now, 'yyyy');
            const prevDate = subMonths(now, 1);
            const prevMonth = format(prevDate, 'MM');
            const prevYear = format(prevDate, 'yyyy');

            // 1. Fetch Settings for Pricing
            let coursePricing = { 'Beginner': 999, 'Intermediate': 1499 }; // Fallback
            try {
                const sDoc = await getDoc(doc(db, 'settings', 'business'));
                if (sDoc.exists() && sDoc.data().pricing) {
                    coursePricing = sDoc.data().pricing;
                }
            } catch (pricingError) {
                console.warn("Using default pricing due to error:", pricingError);
            }

            // 2. Fetch Students
            const sSnap = await getDocs(collection(db, 'students'));
            const studentsList = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllStudents(studentsList);

            // 3. Fetch Attendance (Current & Previous)
            const aSnap = await getDocs(collection(db, 'monthly_attendance'));
            const attendance = aSnap.docs.map(d => d.data());
            setAllAttendance(attendance);

            // 4. Fetch Expenses
            const eSnap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
            const expensesList = eSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setExpenses(expensesList);

            // Calculate Expenses for Current Month
            const currentMonthExpenses = expensesList.filter(e => {
                const d = new Date(e.date);
                return format(d, 'MM') === currentMonth && format(d, 'yyyy') === currentYear;
            });
            const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

            // Process Data
            let currentRevenue = 0;
            let currentActive = 0;
            let prevActive = 0;
            const risks = [];
            const performers = [];

            // Chart Data Aggregation
            const monthlyStats = {}; // Key: "yyyy-MM", Value: { revenue: 0, active: 0 }

            attendance.forEach(record => {
                const key = `${record.year}-${record.month}`;
                if (!monthlyStats[key]) {
                    monthlyStats[key] = { name: `${record.month}/${record.year.slice(2)}`, revenue: 0, activeStudents: 0, uniqueStudents: new Set() };
                }

                const student = studentsList.find(s => s.id === record.studentId);
                const fee = student ? (coursePricing[student.course] || 0) : 0;

                if (record.classCount > 0) {
                    monthlyStats[key].revenue += (record.classCount * fee);
                    monthlyStats[key].uniqueStudents.add(record.studentId);
                }
            });

            // Convert to array and sort
            const chartArray = Object.keys(monthlyStats).sort().map(key => ({
                name: monthlyStats[key].name,
                revenue: monthlyStats[key].revenue,
                active: monthlyStats[key].uniqueStudents.size
            })).slice(-6); // Last 6 months

            setChartData(chartArray);

            studentsList.forEach(student => {
                // Get this student's attendance records
                const currAtt = attendance.find(a =>
                    a.studentId === student.id && a.month === currentMonth && a.year === currentYear
                );
                const prevAtt = attendance.find(a =>
                    a.studentId === student.id && a.month === prevMonth && a.year === prevYear
                );

                const currClasses = currAtt?.classCount || 0;
                const prevClasses = prevAtt?.classCount || 0;
                const fee = coursePricing[student.course] || 0;

                // Attach for easy access
                student.currentClasses = currClasses;

                // Revenue & Activity
                if (currClasses > 0) {
                    currentActive++;
                    currentRevenue += (currClasses * fee);
                }
                if (prevClasses > 0) prevActive++;

                // Risk Analysis
                const dayOfMonth = parseInt(format(now, 'dd'));
                if (prevClasses > 0) {
                    if (currClasses === 0 && dayOfMonth > 7) {
                        risks.push({ ...student, reason: 'No classes this month', severity: 'high' });
                    } else if (currClasses < prevClasses * 0.5 && dayOfMonth > 20) {
                        risks.push({ ...student, reason: 'Attendance dropped 50%', severity: 'medium' });
                    }
                }

                // Top Performers (>8 classes/month)
                if (currClasses >= 8) {
                    performers.push({ ...student, classes: currClasses });
                }
            });

            const growth = prevActive > 0 ? ((currentActive - prevActive) / prevActive) * 100 : 0;
            const netProfit = currentRevenue - totalExpenses;

            setStats({
                totalStudents: studentsList.length,
                activeStudents: currentActive,
                churnRisk: risks,
                revenueForecast: currentRevenue,
                totalExpenses,
                netProfit,
                growthRate: growth,
                topPerformers: performers
            });

        } catch (err) {
            console.error("Error fetching insights:", err);
            setError("Failed to load insights. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!newExpense.description || !newExpense.amount) return;
        try {
            await addDoc(collection(db, 'expenses'), {
                ...newExpense,
                createdAt: new Date().toISOString()
            });
            setShowExpenseModal(false);
            setNewExpense({ description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd') });
            fetchInsights();
        } catch (err) {
            console.error("Error adding expense:", err);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("Delete this expense?")) return;
        try {
            await deleteDoc(doc(db, 'expenses', id));
            fetchInsights();
        } catch (err) {
            console.error("Error deleting expense:", err);
        }
    };

    // AI Report Generation
    const generateReport = (student) => {
        if (!student) return;
        setGenerating(true);
        setSelectedStudent(student);
        setShowSearch(false);
        setSearchTerm('');

        // Simulating AI Analysis
        setTimeout(() => {
            // Calculate Quarterly Stats
            const now = new Date();
            const last3Months = [0, 1, 2].map(i => {
                const d = subMonths(now, i);
                return { month: format(d, 'MM'), year: format(d, 'yyyy'), label: format(d, 'MMMM') };
            });

            let totalClasses = 0;
            let attendedMonths = 0;
            const monthlyBreakdown = [];

            // Find matching records in allAttendance
            // Note: In real app, consider indexing or map for O(1) lookup
            last3Months.forEach(({ month, year, label }) => {
                const record = allAttendance.find(a =>
                    a.studentId === student.id && a.month === month && a.year === year
                );
                const count = record ? (record.classCount || 0) : 0;
                totalClasses += count;
                if (count > 0) attendedMonths++;
                monthlyBreakdown.push({ label, count });
            });

            const avg = attendedMonths > 0 ? (totalClasses / attendedMonths).toFixed(1) : 0;
            const sName = student.name || 'Student';

            let tone = 'Positive';
            let summary = `${sName} has attended ${totalClasses} classes in the last quarter (Avg: ${avg}/month).`;
            let recommendation = 'Maintain consistency.';

            if (totalClasses < 6) {
                tone = 'Needs Attention';
                summary = `${sName} attended only ${totalClasses} classes in 3 months. Requires immediate attention.`;
                recommendation = 'Schedule a parent meeting to discuss attendance.';
            } else if (totalClasses > 24) {
                tone = 'Excellent';
                summary = `Exceptional dedication! ${totalClasses} classes attended. Mastering concepts rapidly.`;
                recommendation = 'Assign leadership role or advanced project tasks.';
            } else if (totalClasses >= 12) {
                tone = 'Consistent';
                summary = `${sName} is regular with ${totalClasses} classes. Good progress.`;
                recommendation = 'Encourage to participate in extra challenges.';
            }

            const waMessage = `*Quarterly Progress Report - ${sName}*\n\n` +
                `📅 *Period*: ${last3Months[2].label} - ${last3Months[0].label}\n` +
                `📊 *Total Attendance*: ${totalClasses} Classes\n` +
                `📈 *Average*: ${avg} classes/month\n\n` +
                `*Performance*: ${tone}\n` +
                `*Summary*: ${summary}\n` +
                `*Recommendation*: ${recommendation}\n\n` +
                `_Generated by EduBill AI_`;

            setAiReport({
                student: sName,
                tone,
                summary,
                recommendation,
                breakdown: monthlyBreakdown,
                whatsappMessage: encodeURIComponent(waMessage),
                generatedAt: new Date().toISOString()
            });
            setGenerating(false);
        }, 1500);
    };

    return (
        <div className="insights-page">
            <header className="page-header">
                <div>
                    <h3 className="flex-center gap-2"><Brain className="text-primary" /> AI Student Insights</h3>
                    <p>Intelligent analysis of student performance and business health</p>
                </div>
            </header>

            {error ? (
                <div className="error-box">
                    <AlertTriangle className="text-danger" size={48} />
                    <p>{error}</p>
                    <button className="retry-btn" onClick={fetchInsights}>Retry</button>
                </div>
            ) : loading ? (
                <InsightsSkeleton />
            ) : (
                <div className="insights-grid">
                    {/* Top Cards */}
                    {/* Financial Row */}
                    <div className="stat-card glass">
                        <div className="icon-box green"><DollarSign size={20} /></div>
                        <div>
                            <label>Est. Revenue</label>
                            <h4>₹{stats.revenueForecast.toLocaleString()}</h4>
                            <span className="sub-text">Current month fees</span>
                        </div>
                    </div>

                    <div className="stat-card glass clickable" onClick={() => setShowExpenseModal(true)} style={{ cursor: 'pointer' }}>
                        <div className="icon-box red"><TrendingDown size={20} /></div>
                        <div>
                            <label>Expenses (Mo.)</label>
                            <h4>₹{stats.totalExpenses?.toLocaleString() || 0}</h4>
                            <span className="sub-text">Click to manage</span>
                        </div>
                    </div>

                    <div className="stat-card glass">
                        <div className="icon-box blue"><TrendingUp size={20} /></div>
                        <div>
                            <label>Net Profit</label>
                            <h4>₹{stats.netProfit?.toLocaleString() || 0}</h4>
                            <span className="sub-text text-success">
                                {stats.revenueForecast > 0 ? ((stats.netProfit / stats.revenueForecast) * 100).toFixed(1) : 0}% Margin
                            </span>
                        </div>
                    </div>

                    {/* Student Stats */}
                    <div className="stat-card glass">
                        <div className="icon-box purple"><Users size={20} /></div>
                        <div>
                            <label>Active Students</label>
                            <h4>{stats.activeStudents}</h4>
                            <span className={`trend ${stats.growthRate >= 0 ? 'up' : 'down'}`}>
                                {stats.growthRate >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {Math.abs(stats.growthRate).toFixed(1)}% vs last mo.
                            </span>
                        </div>
                    </div>

                    <div className="stat-card glass">
                        <div className="icon-box orange"><AlertTriangle size={20} /></div>
                        <div>
                            <label>Churn Risk</label>
                            <h4 className="text-danger">{stats.churnRisk.length}</h4>
                            <span className="sub-text">Need attention</span>
                        </div>
                    </div>

                    <div className="stat-card glass">
                        <div className="icon-box blue"><Sparkles size={20} /></div>
                        <div>
                            <label>Top Performers</label>
                            <h4>{stats.topPerformers.length}</h4>
                            <span className="sub-text">Consistent attendance</span>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="charts-row">
                        <div className="chart-card glass">
                            <h4>Revenue Trend (6 Months)</h4>
                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 1000}k`} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <Tooltip
                                            contentStyle={{ background: '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                                        />
                                        <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPv)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="chart-card glass">
                            <h4>Active Students</h4>
                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            cursor={{ fill: '#f1f5f9' }}
                                            contentStyle={{ background: '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="active" fill="#3b82f6" radius={[4, 4, 0, 0]} activeBar={{ fill: '#2563eb' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="main-grid">
                        {/* Risk Board */}
                        <div className="risk-board glass card">
                            <h4>🚨 At-Risk Students</h4>
                            {stats.churnRisk.length > 0 ? (
                                <div className="risk-list">
                                    {stats.churnRisk.map(student => (
                                        <div key={student.id} className="risk-item" onClick={() => generateReport(student)}>
                                            <div className="risk-info">
                                                <h5>{student.name || 'Unknown Student'}</h5>
                                                <span className="risk-reason">{student.reason}</span>
                                            </div>
                                            <button className="analyze-btn">
                                                <Brain size={16} /> Analyze
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <Sparkles size={40} className="text-success" />
                                    <p>No students at risk!</p>
                                </div>
                            )}
                        </div>

                        {/* AI Report Generator */}
                        <div className="ai-panel glass card">
                            <div className="panel-header-row">
                                <h4>🤖 AI Progress Report</h4>
                                <button className="icon-btn" onClick={() => setShowSearch(!showSearch)} title="Search Student">
                                    {showSearch ? <X size={18} /> : <Search size={18} />}
                                </button>
                            </div>

                            {showSearch ? (
                                <div className="search-section">
                                    <input
                                        type="text"
                                        className="search-input"
                                        placeholder="Type student name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="search-results scroller">
                                        {searchTerm && allStudents
                                            .filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map(s => (
                                                <div key={s.id} className="search-item" onClick={() => generateReport(s)}>
                                                    <div className="s-avatar">{s.name?.[0] || '?'}</div>
                                                    <div className="s-info">
                                                        <span className="name">{s.name || 'Unknown'}</span>
                                                        <span className="course">{s.course || 'No Course'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        {searchTerm && allStudents.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                            <p className="no-res">No students found</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-muted mb-4 opacity-75">Select any student to generate a comprehensive quarterly report.</p>

                                    {generating ? (
                                        <div className="generating-state">
                                            <Loader2 className="animate-spin text-primary" size={40} />
                                            <p>Analyzing class history and progress...</p>
                                        </div>
                                    ) : aiReport ? (
                                        <div className="report-card glass-panel">
                                            <div className="report-header-section">
                                                <div className="r-title">
                                                    <h5>{aiReport.student}</h5>
                                                    <span className="report-date">{aiReport.generatedAt ? format(new Date(aiReport.generatedAt), 'dd MMM') : ''}</span>
                                                </div>
                                                <span className={`report-badge ${aiReport.tone?.replace(' ', '-').toLowerCase()}`}>{aiReport.tone} Outlook</span>
                                            </div>

                                            <div className="report-body">
                                                <h6>Quarterly Summary</h6>
                                                <p className="summary">{aiReport.summary}</p>

                                                {aiReport.breakdown && (
                                                    <div className="breakdown-list">
                                                        {aiReport.breakdown.map((m, i) => (
                                                            <div key={i} className="bd-item">
                                                                <span className="bd-label">{m.label}</span>
                                                                <span className="bd-val">{m.count} classes</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="recommendation">
                                                    <strong>💡 Recommendation:</strong>
                                                    <p>{aiReport.recommendation}</p>
                                                </div>
                                            </div>

                                            <div className="report-actions">
                                                <button className="whatsapp-btn" onClick={() => {
                                                    const phone = selectedStudent?.phone?.replace(/\D/g, '');
                                                    const url = `https://wa.me/${phone ? '91' + phone : ''}?text=${aiReport.whatsappMessage}`;
                                                    window.open(url, '_blank');
                                                }}>
                                                    <MessageCircle size={18} /> Share on WhatsApp
                                                </button>
                                                <button className="copy-btn icon-only" onClick={() => {
                                                    navigator.clipboard.writeText(decodeURIComponent(aiReport.whatsappMessage));
                                                }} title="Copy Text">
                                                    <FileText size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="placeholder-state">
                                            <Brain size={48} />
                                            <p>Select a student to generate quarterly insights.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Expense Modal */}
            {showExpenseModal && (
                <div className="modal-overlay">
                    <div className="glass modal-card expense-modal">
                        <div className="modal-header">
                            <div>
                                <h3>Manage Expenses</h3>
                                <p>Track monthly operating costs</p>
                            </div>
                            <button className="close-btn" onClick={() => setShowExpenseModal(false)}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleAddExpense} className="expense-form">
                            <div className="form-row">
                                <div className="form-group flex-2">
                                    <label>Description</label>
                                    <input
                                        className="input-field"
                                        value={newExpense.description}
                                        onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                        required
                                        placeholder="e.g. Rent, Electricity"
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Amount (₹)</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        value={newExpense.amount}
                                        onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={newExpense.date}
                                    onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                                    required
                                />
                            </div>

                            <button className="btn-primary full-width">
                                <Plus size={18} /> Add Expense
                            </button>
                        </form>

                        <div className="section-divider">
                            <span>Recent Expenses</span>
                        </div>

                        <div className="expense-list scroller">
                            {expenses.length > 0 ? expenses.slice(0, 10).map(exp => (
                                <div key={exp.id} className="expense-item-row">
                                    <div className="exp-info">
                                        <strong>{exp.description}</strong>
                                        <small>{format(new Date(exp.date), 'dd MMM yyyy')}</small>
                                    </div>
                                    <div className="exp-actions">
                                        <span className="exp-amount">-₹{parseFloat(exp.amount).toLocaleString()}</span>
                                        <button type="button" onClick={() => handleDeleteExpense(exp.id)} className="icon-btn delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-muted text-center py-4">No expenses recorded.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx="true">{`
                /* Modal Styles */
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000;
                }
                .modal-card {
                    background: white;
                    padding: 30px;
                    border-radius: 20px;
                    width: 90%; max-width: 500px;
                    max-height: 85vh;
                    display: flex; flex-direction: column;
                }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .modal-header h3 { margin: 0; font-size: 1.25rem; }
                .close-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 5px; }
                .close-btn:hover { color: var(--danger); }

                .expense-form { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color); }
                .form-row { display: flex; gap: 15px; }
                .flex-2 { flex: 2; }
                .full-width { width: 100%; justify-content: center; margin-top: 10px; }
                
                .section-divider { display: flex; align-items: center; margin-bottom: 15px; color: var(--text-muted); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                .section-divider::after { content: ''; flex: 1; height: 1px; background: var(--border-color); margin-left: 10px; }

                .expense-list { flex: 1; overflow-y: auto; padding-right: 5px; }
                .expense-item-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 10px; border-radius: 8px; margin-bottom: 8px;
                    background: var(--bg-secondary);
                    transition: all 0.2s;
                }
                .expense-item-row:hover { transform: translateX(2px); background: #f1f5f9; }
                .exp-info { display: flex; flex-direction: column; }
                .exp-info small { color: var(--text-muted); font-size: 0.75rem; }
                .exp-actions { display: flex; align-items: center; gap: 10px; }
                .exp-amount { font-weight: 700; color: var(--danger); }
                .icon-btn.delete { color: var(--text-muted); background: none; }
                .icon-btn.delete:hover { color: var(--danger); background: #fef2f2; }

                .insights-page {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                .page-header {
                    margin-bottom: 30px;
                }
                
                .page-header h3 { font-size: 1.5rem; font-weight: 700; margin-bottom: 5px; display: flex; align-items: center; }
                .gap-2 { gap: 8px; }
                .text-primary { color: var(--primary); }
                .text-danger { color: var(--danger); }
                .text-success { color: var(--success); }
                .text-muted { color: var(--text-muted); }
                
                .insights-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                }
                
                .stat-card {
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    border-radius: 16px;
                }
                
                .icon-box {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .icon-box.blue { background: #eff6ff; color: #3b82f6; }
                .icon-box.green { background: #f0fdf4; color: #22c55e; }
                .icon-box.purple { background: #faf5ff; color: #a855f7; }
                .icon-box.red { background: #fef2f2; color: #ef4444; }
                
                .stat-card label { display: block; font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
                .stat-card h4 { margin: 2px 0; font-size: 1.4rem; font-weight: 700; }
                .stat-card .sub-text { font-size: 0.75rem; color: var(--text-muted); }
                
                .trend {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    margin-top: 4px;
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                
                .trend.up { background: #ecfdf5; color: #16a34a; }
                .trend.down { background: #fef2f2; color: #dc2626; }
                
                .main-grid {
                    grid-column: 1 / -1;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-top: 10px;
                }
                
                .risk-board, .ai-panel {
                    padding: 25px;
                    border-radius: 16px;
                    min-height: 400px;
                }
                
                .risk-list {
                    margin-top: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .risk-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: #fef2f2;
                    border: 1px solid #fee2e2;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .risk-item:hover {
                    transform: translateX(4px);
                    border-color: #fecaca;
                }
                
                .risk-info h5 { margin: 0; font-size: 0.95rem; font-weight: 700; color: #991b1b; }
                .risk-reason { font-size: 0.8rem; color: #b91c1c; }
                
                .analyze-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    background: white;
                    border: 1px solid #fecaca;
                    color: #991b1b;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 300px;
                    color: var(--text-muted);
                    gap: 10px;
                }

                .generating-state, .placeholder-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 300px;
                    text-align: center;
                    color: var(--text-muted);
                    gap: 15px;
                }
                
                .placeholder-state svg { color: #e2e8f0; }

                .report-card {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-sm);
                }
                
                .report-header {
                    padding: 12px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .report-header.bg-green { background: #ecfdf5; color: #166534; }
                .report-header.bg-orange { background: #fff7ed; color: #9a3412; }
                
                .report-badge { font-weight: 700; font-size: 0.85rem; text-transform: uppercase; }
                .report-date { font-size: 0.75rem; opacity: 0.8; }
                
                .report-body { padding: 20px; }
                .report-body h5 { margin: 0 0 10px; font-size: 1.1rem; }
                
                .summary { color: var(--text-muted); line-height: 1.6; margin-bottom: 20px; }
                
                .recommendation {
                    background: #f8fafc;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 3px solid var(--primary);
                }
                
                .recommendation strong { display: block; margin-bottom: 5px; color: var(--primary); font-size: 0.85rem; }
                .recommendation p { margin: 0; font-size: 0.9rem; color: var(--text-main); }
                
                .copy-btn {
                    width: 100%;
                    padding: 12px;
                    background: #f8fafc;
                    border: none;
                    border-top: 1px solid var(--border-color);
                    color: var(--text-muted);
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                
                .copy-btn:hover { background: #f1f5f9; color: var(--primary); }
                
                @media (max-width: 1024px) {
                    .insights-grid { grid-template-columns: 1fr 1fr; }
                }
                
                @media (max-width: 768px) {
                    .insights-grid { grid-template-columns: 1fr; }
                    .main-grid { grid-template-columns: 1fr; }
                }

                .panel-header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                
                .panel-header-row h4 { margin: 0; }

                .icon-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    background: var(--bg-secondary);
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .icon-btn:hover { background: var(--border-color); color: var(--text-main); }

                .search-section {
                    margin-top: 10px;
                }

                .search-input {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    margin-bottom: 12px;
                    background: var(--bg-main);
                }

                .search-input:focus {
                    border-color: var(--primary);
                    background: white;
                }

                .search-results {
                    max-height: 250px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .search-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .search-item:hover { background: var(--bg-secondary); }

                .s-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: var(--primary);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.9rem;
                }

                .s-info .name { display: block; font-weight: 600; font-size: 0.9rem; }
                .s-info .course { display: block; font-size: 0.75rem; color: var(--text-muted); }
                
                .no-res { text-align: center; color: var(--text-muted); font-size: 0.9rem; margin-top: 10px; }
                
                .error-box {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    background: #fef2f2;
                    border-radius: 12px;
                    border: 1px solid #fee2e2;
                    text-align: center;
                    gap: 15px;
                }
                
                .retry-btn {
                    padding: 8px 20px;
                    background: var(--danger);
                    color: white;
                    border-radius: 8px;
                    font-weight: 600;
                }

                .charts-row {
                    grid-column: 1 / -1;
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 20px;
                    margin-top: 10px;
                }

                .chart-card {
                    padding: 20px;
                    border-radius: 16px;
                    display: flex;
                    flex-direction: column;
                }

                .chart-card h4 {
                    margin: 0 0 20px 0;
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-muted);
                }

                .chart-wrapper {
                    flex: 1;
                    min-height: 250px;
                }

                @media (max-width: 1024px) {
                    .charts-row { grid-template-columns: 1fr; }
                }

                /* New Report Styles */
                .report-header-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--border-color);
                }

                .r-title h5 { margin: 0; font-size: 1.1rem; font-weight: 700; }
                .report-date { display: block; font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; }
                
                .report-badge { padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
                .report-badge.positive, .report-badge.excellent, .report-badge.consistent { background: #dcfce7; color: #15803d; }
                .report-badge.needs-attention, .report-badge.needs-improvement { background: #fee2e2; color: #991b1b; }
                .report-badge.neutral { background: #e0f2fe; color: #0369a1; }

                .breakdown-list {
                    background: var(--bg-secondary);
                    padding: 15px;
                    border-radius: 12px;
                    margin: 15px 0;
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 10px;
                }
                
                .bd-item { display: flex; flex-direction: column; align-items: center; text-align: center; }
                .bd-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
                .bd-val { font-size: 0.9rem; font-weight: 700; color: var(--text-main); }
                
                .report-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid var(--border-color);
                }
                
                .whatsapp-btn {
                    flex: 1;
                    background: #25D366;
                    color: white;
                    padding: 10px;
                    border-radius: 10px;
                    font-weight: 600;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    transition: all 0.2s;
                }
                .whatsapp-btn:hover { background: #128c7e; transform: translateY(-2px); }
                
                .copy-btn.icon-only { width: 44px; padding: 0; flex: 0 0 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--bg-secondary); color: var(--text-muted); }
                .copy-btn.icon-only:hover { background: var(--bg-hover); color: var(--primary); }

            `}</style>
        </div>
    );
};

export default Insights;
