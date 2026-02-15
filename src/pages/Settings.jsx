import React, { useState, useEffect, useRef } from 'react';
import {
    Save,
    Loader2,
    Building,
    Mail,
    Phone,
    Globe,
    CreditCard,
    DollarSign,
    Upload,
    Check,
    RefreshCcw,
    Palette,
    Moon,
    Sun,
    Database,
    Download,
    UploadCloud,
    AlertTriangle,
    FileText,
    Trash2,
    Plus
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { exportAllData, importData } from '../utils/backup';
import { INVOICE_TEMPLATES } from '../config/invoiceTemplates';
import { SettingsSkeleton } from '../components/Skeleton';

const Settings = () => {
    const { isDark, toggleTheme } = useTheme();
    const toast = useToast();
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [newCourse, setNewCourse] = useState({ name: '', price: '' });

    const [settings, setSettings] = useState({
        businessName: 'Makerworks Lab',
        tagline: 'Robotics & S.T.E.A.M Education',
        email: 'hello@makerworkslab.in',
        phone: '',
        website: 'makerworkslab.in',
        address: '',
        upiId: '',
        logo: '',
        invoiceTemplate: 'modern',
        pricing: {
            Beginner: 999,
            Intermediate: 1499,
            Advanced: 1499
        },
        invoiceTerms: [
            'Please pay by the 10th of the month',
            'Fees once paid are non-refundable'
        ],
        bankAccounts: [],
        defaultBankId: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleExport = async () => {
        setExporting(true);
        try {
            const result = await exportAllData();
            if (result.success) {
                toast.success(`Backup created! ${result.counts.students} students, ${result.counts.invoices} invoices exported.`);
            } else {
                toast.error('Export failed: ' + result.error);
            }
        } catch (err) {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm('This will merge data from the backup. Existing data with same IDs will be preserved. Continue?')) {
            return;
        }

        setImporting(true);
        try {
            const result = await importData(file);
            if (result.success) {
                toast.success(`Restored ${result.counts.students} students, ${result.counts.invoices} invoices!`);
                // Reload window to see new data
                setTimeout(() => window.location.reload(), 2000);
            }
        } catch (err) {
            toast.error('Import failed: ' + err.error);
        } finally {
            setImporting(false);
            e.target.value = '';
        }
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'settings', 'business');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSettings({ ...settings, ...docSnap.data() });
            }
        } catch (err) {
            console.error('Error loading settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'business'), settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Error saving:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 500000) {
                alert('Logo too large. Please use under 500KB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings({ ...settings, logo: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const updatePricing = (level, value) => {
        setSettings({
            ...settings,
            pricing: {
                ...settings.pricing,
                [level]: parseInt(value) || 0
            }
        });
    };

    const addCourse = () => {
        if (!newCourse.name.trim() || !newCourse.price) return;
        setSettings({
            ...settings,
            pricing: {
                ...settings.pricing,
                [newCourse.name.trim()]: parseInt(newCourse.price)
            }
        });
        setNewCourse({ name: '', price: '' });
    };

    const deleteCourse = (name) => {
        if (window.confirm(`Delete course "${name}"?`)) {
            const newPricing = { ...settings.pricing };
            delete newPricing[name];
            setSettings({ ...settings, pricing: newPricing });
        }
    };

    const addBank = () => {
        const newBank = {
            id: Date.now().toString(),
            accountName: settings.businessName || '',
            accountNumber: '',
            ifsc: '',
            bankName: '',
            accountType: 'Savings',
            upiId: settings.upiId || ''
        };
        const updatedBanks = [...(settings.bankAccounts || []), newBank];
        setSettings({
            ...settings,
            bankAccounts: updatedBanks,
            defaultBankId: settings.defaultBankId || newBank.id // Auto-set if it's the first bank
        });
    };

    const setDefaultBank = (id) => {
        setSettings({ ...settings, defaultBankId: id });
    };

    const updateBank = (id, field, value) => {
        const updated = (settings.bankAccounts || []).map(b =>
            b.id === id ? { ...b, [field]: value } : b
        );
        setSettings({ ...settings, bankAccounts: updated });
    };

    const deleteBank = (id) => {
        if (!window.confirm('Remove this bank account?')) return;
        setSettings({
            ...settings,
            bankAccounts: (settings.bankAccounts || []).filter(b => b.id !== id)
        });
    };

    if (loading) {
        return <SettingsSkeleton />;
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="settings-page">
            <div className="page-header">
                <div>
                    <h2>⚙️ Settings</h2>
                    <p>Customize your business profile and preferences</p>
                </div>
                <button className="sync-btn" onClick={fetchSettings}>
                    <RefreshCcw size={18} />
                    Reload
                </button>
            </div>

            <form onSubmit={saveSettings}>
                <div className="settings-grid">
                    {/* Business Info */}
                    <div className="glass card settings-card">
                        <div className="card-title">
                            <Building size={20} />
                            <h4>Business Information</h4>
                        </div>

                        <div className="logo-section">
                            <div className="logo-preview">
                                {settings.logo ? (
                                    <img src={settings.logo} alt="Logo" />
                                ) : (
                                    <span>MW</span>
                                )}
                            </div>
                            <div className="logo-controls">
                                <label className="upload-btn">
                                    <Upload size={16} />
                                    Upload Logo
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} hidden />
                                </label>
                                {settings.logo && (
                                    <button type="button" className="remove-btn" onClick={() => setSettings({ ...settings, logo: '' })}>
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Business Name</label>
                            <input
                                type="text"
                                className="input-field"
                                value={settings.businessName}
                                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Tagline</label>
                            <input
                                type="text"
                                className="input-field"
                                value={settings.tagline}
                                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label><Mail size={14} /> Email</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    value={settings.email}
                                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label><Phone size={14} /> Phone</label>
                                <input
                                    type="tel"
                                    className="input-field"
                                    value={settings.phone}
                                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label><Globe size={14} /> Website</label>
                            <input
                                type="text"
                                className="input-field"
                                value={settings.website}
                                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Address</label>
                            <textarea
                                className="input-field"
                                rows="2"
                                value={settings.address}
                                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Payment Settings */}
                    <div className="glass card settings-card">
                        <div className="card-title">
                            <CreditCard size={20} />
                            <h4>Payment Settings</h4>
                        </div>

                        <div className="form-group">
                            <label><CreditCard size={14} /> Default UPI ID</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="yourname@upi"
                                value={settings.upiId}
                                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                            />
                            <span className="hint">This will be used as the default for new bank accounts</span>
                        </div>

                        <div className="pricing-section">
                            <label><DollarSign size={14} /> Course Pricing (per class)</label>
                            <div className="pricing-grid">
                                {Object.entries(settings.pricing).map(([level, price]) => (
                                    <div key={level} className="pricing-item">
                                        <span className="level-badge">{level}</span>
                                        <div className="price-row-actions">
                                            <div className="price-input">
                                                <span>₹</span>
                                                <input
                                                    type="number"
                                                    value={price}
                                                    onChange={(e) => updatePricing(level, e.target.value)}
                                                />
                                            </div>
                                            <button type="button" className="delete-icon-btn" onClick={() => deleteCourse(level)} title="Delete Course">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <div className="add-course-row">
                                    <input
                                        type="text"
                                        placeholder="Course Name"
                                        value={newCourse.name}
                                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                                        className="sm-input"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        value={newCourse.price}
                                        onChange={(e) => setNewCourse({ ...newCourse, price: e.target.value })}
                                        className="sm-input price"
                                    />
                                    <button type="button" className="add-btn-sm" onClick={addCourse} disabled={!newCourse.name || !newCourse.price}>
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Invoice Terms</label>
                            <textarea
                                className="input-field"
                                rows="3"
                                value={settings.invoiceTerms.join('\n')}
                                onChange={(e) => setSettings({ ...settings, invoiceTerms: e.target.value.split('\n') })}
                                placeholder="One term per line"
                            />
                        </div>

                        <div className="section-title">🏦 Bank Accounts</div>
                        <p className="hint">Add one or more bank accounts. You can select one when generating an invoice.</p>

                        <div className="bank-accounts-list">
                            {(settings.bankAccounts || []).map((bank, index) => (
                                <div key={bank.id} className="bank-item-card">
                                    <div className="bank-item-header">
                                        <div className="bank-header-left">
                                            <h5>Account #{index + 1}</h5>
                                            <button
                                                type="button"
                                                className={`star-btn ${settings.defaultBankId === bank.id ? 'active' : ''}`}
                                                onClick={() => setDefaultBank(bank.id)}
                                                title={settings.defaultBankId === bank.id ? "Default Account" : "Set as Default"}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {settings.defaultBankId === bank.id ? '★ Default' : '☆ Set Default'}
                                                </div>
                                            </button>
                                        </div>
                                        <button type="button" className="remove-btn" onClick={() => deleteBank(bank.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="form-group">
                                        <label>Account Name</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            value={bank.accountName}
                                            onChange={(e) => updateBank(bank.id, 'accountName', e.target.value)}
                                            placeholder="e.g. Makerworks Lab PVT LTD"
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Account Number</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                value={bank.accountNumber}
                                                onChange={(e) => updateBank(bank.id, 'accountNumber', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>IFSC Code</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                value={bank.ifsc}
                                                onChange={(e) => updateBank(bank.id, 'ifsc', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Bank Name</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                value={bank.bankName}
                                                onChange={(e) => updateBank(bank.id, 'bankName', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>UPI ID</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                value={bank.upiId}
                                                onChange={(e) => updateBank(bank.id, 'upiId', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Account Type</label>
                                        <select
                                            className="input-field"
                                            value={bank.accountType}
                                            onChange={(e) => updateBank(bank.id, 'accountType', e.target.value)}
                                        >
                                            <option value="Savings">Savings</option>
                                            <option value="Current">Current</option>
                                        </select>
                                    </div>
                                </div>
                            ))}

                            <button type="button" className="add-bank-btn" onClick={addBank}>
                                <Plus size={18} />
                                Add Another Bank Account
                            </button>
                        </div>
                    </div>

                    {/* Appearance */}
                    <div className="glass card settings-card">
                        <div className="card-title">
                            <Palette size={20} />
                            <h4>Appearance</h4>
                        </div>

                        <div className="theme-section">
                            <p>Choose your preferred theme</p>
                            <div className="theme-options">
                                <button
                                    type="button"
                                    className={`theme-option ${!isDark ? 'active' : ''}`}
                                    onClick={() => isDark && toggleTheme()}
                                >
                                    <Sun size={24} />
                                    <span>Light</span>
                                </button>
                                <button
                                    type="button"
                                    className={`theme-option ${isDark ? 'active' : ''}`}
                                    onClick={() => !isDark && toggleTheme()}
                                >
                                    <Moon size={24} />
                                    <span>Dark</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Templates */}
                    <div className="glass card settings-card">
                        <div className="card-title">
                            <FileText size={20} />
                            <h4>Invoice Templates</h4>
                        </div>

                        <div className="template-section">
                            <p>Select a style for your invoices</p>
                            <div className="template-grid">
                                {INVOICE_TEMPLATES.map((template) => (
                                    <button
                                        key={template.id}
                                        type="button"
                                        className={`template-card ${settings.invoiceTemplate === template.id ? 'active' : ''}`}
                                        onClick={() => setSettings({ ...settings, invoiceTemplate: template.id })}
                                    >
                                        <span className="template-preview">{template.preview}</span>
                                        <span className="template-name">{template.name}</span>
                                        <span className="template-desc">{template.description}</span>
                                        {settings.invoiceTemplate === template.id && (
                                            <span className="template-check">
                                                <Check size={14} />
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Data Management */}
                    <div className="glass card settings-card">
                        <div className="card-title">
                            <Database size={20} />
                            <h4>Data Management</h4>
                        </div>

                        <div className="backup-section">
                            <div className="backup-info">
                                <h5>💾 Backup & Restore</h5>
                                <p>Export all your data as a JSON file for safekeeping, or restore from a previous backup.</p>
                            </div>

                            <div className="backup-actions">
                                <button
                                    type="button"
                                    className="backup-btn export"
                                    onClick={handleExport}
                                    disabled={exporting}
                                >
                                    {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                                    <span>{exporting ? 'Exporting...' : 'Export Backup'}</span>
                                </button>

                                <label className={`backup-btn import ${importing ? 'disabled' : ''}`}>
                                    {importing ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                                    <span>{importing ? 'Importing...' : 'Import Backup'}</span>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImport}
                                        disabled={importing}
                                        hidden
                                    />
                                </label>
                            </div>

                            <div className="backup-warning">
                                <AlertTriangle size={16} />
                                <span>Backup includes: Students, Invoices, Attendance, and Settings</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="save-bar">
                    <button type="submit" className="btn-primary save-btn" disabled={saving}>
                        {saving ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : saved ? (
                            <Check size={20} />
                        ) : (
                            <Save size={20} />
                        )}
                        <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}</span>
                    </button>
                </div>
            </form>

            <style jsx="true">{`
        .settings-page { max-width: 1000px; margin: 0 auto; }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 30px;
        }

        .page-header h2 { margin: 0; font-size: 1.75rem; }
        .page-header p { margin: 4px 0 0; color: var(--text-muted); }

        .sync-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .settings-card { padding: 28px; }

        .card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 25px;
          color: var(--primary);
        }

        .card-title h4 { margin: 0; font-size: 1.1rem; color: var(--text-main); }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 25px;
          padding: 20px;
          background: var(--bg-secondary);
          border-radius: 12px;
        }

        .logo-preview {
          width: 70px;
          height: 70px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--primary), var(--accent-purple));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.3rem;
          overflow: hidden;
        }

        .logo-preview img { width: 100%; height: 100%; object-fit: cover; }

        .logo-controls { display: flex; flex-direction: column; gap: 8px; }

        .upload-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--primary);
          color: white;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .remove-btn {
          background: none;
          color: var(--danger);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .form-group { margin-bottom: 20px; }
        .form-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }

        .bank-accounts-list { display: flex; flex-direction: column; gap: 20px; margin-top: 15px; }
        .bank-item-card { 
            padding: 20px; 
            background: rgba(var(--primary-rgb), 0.03); 
            border: 1px solid var(--border-color); 
            border-radius: 12px;
        }
        .bank-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .bank-header-left { display: flex; align-items: center; gap: 15px; }
        .bank-item-header h5 { margin: 0; font-size: 0.9rem; color: var(--primary); }
        
        .star-btn {
            background: none; border: 1px solid var(--border-color); border-radius: 20px;
            padding: 4px 12px; font-size: 0.75rem; font-weight: 600; color: var(--text-muted);
            cursor: pointer; transition: all 0.2s;
        }
        .star-btn:hover { background: rgba(var(--primary-rgb), 0.05); color: var(--primary); }
        .star-btn.active { background: var(--primary); color: white; border-color: var(--primary); }

        .add-bank-btn {
            display: flex; align-items: center; justify-content: center; gap: 8px;
            padding: 12px; border: 2px dashed var(--border-color); border-radius: 12px;
            color: var(--text-muted); font-weight: 600; cursor: pointer;
        }
        .add-bank-btn:hover { border-color: var(--primary); color: var(--primary); }

        .hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display: block; }

        .pricing-section { margin-bottom: 25px; }
        .pricing-section > label { margin-bottom: 15px; display: block; }

        .pricing-grid { display: flex; flex-direction: column; gap: 12px; }

        .pricing-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px;
          background: var(--bg-secondary);
          border-radius: 10px;
        }

        .level-badge {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .level-badge.beginner { background: #dcfce7; color: #15803d; }
        .level-badge.intermediate { background: #fef3c7; color: #92400e; }
        .level-badge.advanced { background: #fef2f2; color: #991b1b; }

        .price-input {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
        }

        .price-input input {
          width: 80px;
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 700;
          text-align: right;
          background: var(--bg-card);
          color: var(--text-main);
        }

        .price-row-actions { display: flex; align-items: center; gap: 8px; }
        .delete-icon-btn { 
            background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px;
            display: flex; align-items: center; justify-content: center;
        }
        .delete-icon-btn:hover { color: var(--danger); background: #fee2e2; }

        .add-course-row {
            display: grid;
            grid-template-columns: 2fr 1fr 40px;
            gap: 10px;
            padding: 10px;
            background: rgba(37, 99, 235, 0.05); /* varying primary tint */
            border-radius: 10px;
            align-items: center;
        }

        .sm-input { padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; width: 100%; font-size: 0.9rem; }
        .sm-input.price { font-weight: 700; }
        .add-btn-sm {
            width: 36px; height: 36px;
            background: var(--primary); color: white; border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
        }
        .add-btn-sm:disabled { background: var(--text-muted); opacity: 0.5; }

        .theme-section p { color: var(--text-muted); margin-bottom: 15px; }

        .theme-options { display: flex; gap: 15px; }

        .theme-option {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 25px;
          border: 2px solid var(--border-color);
          border-radius: 12px;
          background: var(--bg-secondary);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .theme-option:hover { border-color: var(--primary); color: var(--primary); }

        .theme-option.active {
          border-color: var(--primary);
          background: ${isDark ? 'rgba(59, 130, 246, 0.15)' : '#f0f4ff'};
          color: var(--primary);
        }

        .save-bar {
          margin-top: 30px;
          display: flex;
          justify-content: flex-end;
        }

        .save-btn {
          min-width: 180px;
          padding: 14px 28px;
          font-size: 1rem;
        }

        .loader-full {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          gap: 16px;
          color: var(--text-muted);
        }

        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .backup-section {
          padding: 20px;
          background: var(--bg-secondary);
          border-radius: 12px;
        }

        .backup-info h5 { margin: 0 0 8px; font-size: 1rem; }
        .backup-info p { margin: 0 0 20px; color: var(--text-muted); font-size: 0.9rem; }

        .backup-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 15px;
        }

        .backup-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .backup-btn.export {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .backup-btn.export:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }

        .backup-btn.import {
          background: var(--bg-card);
          border: 2px dashed var(--border-color);
          color: var(--text-muted);
        }

        .backup-btn.import:hover { border-color: var(--primary); color: var(--primary); }
        .backup-btn.disabled { opacity: 0.6; pointer-events: none; }

        .backup-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 15px;
          background: rgba(245, 158, 11, 0.1);
          border-radius: 8px;
          font-size: 0.8rem;
          color: #f59e0b;
        }

        .template-section p { color: var(--text-muted); margin-bottom: 15px; }

        .template-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .template-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px 12px;
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .template-card:hover {
          border-color: var(--primary);
          transform: translateY(-2px);
        }

        .template-card.active {
          border-color: var(--primary);
          background: ${isDark ? 'rgba(59, 130, 246, 0.15)' : '#f0f4ff'};
        }

        .template-preview { font-size: 1.8rem; }
        .template-name { font-weight: 600; font-size: 0.85rem; }
        .template-desc { font-size: 0.7rem; color: var(--text-muted); text-align: center; }

        .template-check {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 22px;
          height: 22px;
          background: var(--primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .settings-grid { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
          .backup-actions { flex-direction: column; }
          .template-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
        </motion.div>
    );
};

export default Settings;
