import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Send, Copy, Check, Edit3 } from 'lucide-react';

const TEMPLATES = [
    {
        id: 'invoice',
        name: 'Invoice Share',
        icon: '📄',
        template: `Hello {{parent_name}}!

Here is the invoice from {{business_name}} for {{student_name}}:

📄 Invoice: #{{invoice_id}}
📅 Period: {{period}}
📚 Classes: {{class_count}}
💰 Amount: ₹{{amount}}

🔗 View Invoice: {{invoice_link}}

Thank you!`
    },
    {
        id: 'reminder',
        name: 'Payment Reminder',
        icon: '🔔',
        template: `Hi {{parent_name}},

This is a friendly reminder from {{business_name}}.

Your payment of ₹{{amount}} for {{student_name}}'s classes is pending.

📄 Invoice: #{{invoice_id}}

🔗 Pay Now: {{invoice_link}}

Please make the payment at your earliest convenience. Thank you!`
    },
    {
        id: 'receipt',
        name: 'Payment Received',
        icon: '✅',
        template: `Hi {{parent_name}}! 🎉

Thank you for your payment!

We have received ₹{{amount}} for {{student_name}}'s classes.

📄 Invoice: #{{invoice_id}}
✅ Status: PAID

📥 Download Receipt: {{invoice_link}}

Thank you for choosing {{business_name}}!`
    },
    {
        id: 'class_update',
        name: 'Class Update',
        icon: '📚',
        template: `Hi {{parent_name}}!

Quick update about {{student_name}}'s progress at {{business_name}}:

📅 This month: {{class_count}} classes attended
📊 Total classes: {{total_classes}}

Keep up the great work! 🌟

Regards,
{{business_name}}`
    },
    {
        id: 'schedule',
        name: 'Class Schedule',
        icon: '📅',
        template: `Hi {{parent_name}}!

Here's {{student_name}}'s upcoming schedule at {{business_name}}:

📅 Day: {{weekday}}
⏰ Time: {{class_time}}
📍 Topic: {{topic}}

See you soon! 🚀

{{business_name}}`
    },
    {
        id: 'welcome',
        name: 'Welcome Message',
        icon: '👋',
        template: `Welcome to {{business_name}}! 🎉

Hi {{parent_name}},

We're excited to have {{student_name}} join us!

📚 Course: {{course}}
📅 Start Date: {{start_date}}

If you have any questions, feel free to reach out.

Let's learn and grow together! 🚀

Best regards,
{{business_name}}`
    }
];

const WhatsAppTemplates = ({ isOpen, onClose, invoice = null, student = null }) => {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [editedMessage, setEditedMessage] = useState('');
    const [copied, setCopied] = useState(false);

    const fillTemplate = (template) => {
        let message = template;

        // Replace placeholders with actual data
        const replacements = {
            '{{parent_name}}': invoice?.studentSnapshot?.parentName || student?.parentName || 'Parent',
            '{{student_name}}': invoice?.studentSnapshot?.name || student?.name || 'Student',
            '{{business_name}}': 'Makerworks Lab',
            '{{invoice_id}}': invoice?.id?.slice(-8).toUpperCase() || 'XXXXXX',
            '{{period}}': invoice ? formatPeriod(invoice) : 'Month Year',
            '{{class_count}}': invoice?.classCount || '0',
            '{{amount}}': invoice?.totalAmount?.toLocaleString() || '0',
            '{{invoice_link}}': invoice ? `${window.location.origin}${window.location.pathname}#/invoice/${invoice.id}` : 'https://example.com',
            '{{course}}': invoice?.studentSnapshot?.course || student?.course || 'Beginner',
            '{{total_classes}}': '0',
            '{{weekday}}': 'Saturday',
            '{{class_time}}': '10:00 AM',
            '{{topic}}': 'Robotics Basics',
            '{{start_date}}': 'Today'
        };

        Object.entries(replacements).forEach(([key, value]) => {
            message = message.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
        });

        return message;
    };

    const formatPeriod = (inv) => {
        if (!inv) return '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (inv.monthCount > 1) {
            return `${months[parseInt(inv.startMonth) - 1]} - ${months[parseInt(inv.endMonth) - 1]} ${inv.endYear}`;
        }
        return `${months[parseInt(inv.month) - 1]} ${inv.year}`;
    };

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        setEditedMessage(fillTemplate(template.template));
    };

    const handleSendWhatsApp = () => {
        const phone = (invoice?.studentSnapshot?.phone || student?.phone || '').replace(/\D/g, '');
        const url = `https://wa.me/91${phone}?text=${encodeURIComponent(editedMessage)}`;
        window.open(url, '_blank');
        onClose();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(editedMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleBack = () => {
        setSelectedTemplate(null);
        setEditedMessage('');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="template-overlay" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="template-modal"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="template-header">
                        <div className="template-title">
                            <MessageCircle size={24} className="wa-icon" />
                            <h3>{selectedTemplate ? 'Edit Message' : 'WhatsApp Templates'}</h3>
                        </div>
                        <button className="close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="template-body">
                        {!selectedTemplate ? (
                            <div className="template-grid">
                                {TEMPLATES.map((t) => (
                                    <div
                                        key={t.id}
                                        className="template-card"
                                        onClick={() => handleSelectTemplate(t)}
                                    >
                                        <span className="template-icon">{t.icon}</span>
                                        <span className="template-name">{t.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="message-editor">
                                <div className="editor-header">
                                    <button className="back-btn" onClick={handleBack}>← Back</button>
                                    <span className="current-template">
                                        {selectedTemplate.icon} {selectedTemplate.name}
                                    </span>
                                </div>

                                <textarea
                                    className="message-textarea"
                                    value={editedMessage}
                                    onChange={(e) => setEditedMessage(e.target.value)}
                                    rows={12}
                                />

                                <div className="editor-actions">
                                    <button className="copy-btn" onClick={handleCopy}>
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                    <button className="send-btn" onClick={handleSendWhatsApp}>
                                        <Send size={18} />
                                        Send on WhatsApp
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            <style jsx="true">{`
        .template-overlay {
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

        .template-modal {
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          background: var(--bg-card);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
        }

        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .template-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wa-icon { color: #25D366; }

        .template-title h3 {
          margin: 0;
          font-size: 1.2rem;
        }

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

        .template-body {
          padding: 24px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .template-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .template-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 24px 16px;
          background: var(--bg-secondary);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .template-card:hover {
          border-color: var(--primary);
          transform: translateY(-2px);
        }

        .template-icon { font-size: 1.8rem; }
        .template-name { font-weight: 600; font-size: 0.9rem; text-align: center; }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .back-btn {
          background: none;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.9rem;
        }

        .back-btn:hover { color: var(--primary); }

        .current-template {
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .message-textarea {
          width: 100%;
          padding: 16px;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          background: var(--bg-secondary);
          color: var(--text-main);
          font-size: 0.9rem;
          line-height: 1.6;
          resize: none;
          font-family: inherit;
        }

        .message-textarea:focus {
          outline: none;
          border-color: var(--primary);
        }

        .editor-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .copy-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: var(--bg-secondary);
          border-radius: 10px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .copy-btn:hover { color: var(--primary); }

        .send-btn {
          flex: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: #25D366;
          border-radius: 10px;
          font-weight: 600;
          color: white;
        }

        .send-btn:hover { background: #1da851; }
      `}</style>
        </AnimatePresence>
    );
};

export default WhatsAppTemplates;
