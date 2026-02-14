// Invoice template styles - can be selected in Settings
export const INVOICE_TEMPLATES = [
  {
    id: 'modern',
    name: 'Modern',
    preview: '🎨',
    description: 'Clean and professional',
    styles: {
      headerBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      headerColor: '#ffffff',
      accentColor: '#667eea',
      borderRadius: '16px',
      fontFamily: "'Outfit', sans-serif",
    }
  },
  {
    id: 'classic',
    name: 'Classic',
    preview: '📜',
    description: 'Traditional business style',
    styles: {
      headerBg: '#1e293b',
      headerColor: '#ffffff',
      accentColor: '#1e293b',
      borderRadius: '8px',
      fontFamily: "'Georgia', serif",
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    preview: '✨',
    description: 'Simple and elegant',
    styles: {
      headerBg: '#ffffff',
      headerColor: '#0f172a',
      accentColor: '#0f172a',
      borderRadius: '0px',
      fontFamily: "'Inter', sans-serif",
    }
  },
  {
    id: 'colorful',
    name: 'Colorful',
    preview: '🌈',
    description: 'Fun and vibrant',
    styles: {
      headerBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      headerColor: '#ffffff',
      accentColor: '#f5576c',
      borderRadius: '20px',
      fontFamily: "'Poppins', sans-serif",
    }
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    preview: '🌙',
    description: 'Sleek dark theme',
    styles: {
      headerBg: '#0f172a',
      headerColor: '#f1f5f9',
      accentColor: '#6366f1',
      borderRadius: '12px',
      fontFamily: "'Outfit', sans-serif",
    }
  },
  {
    id: 'corporate',
    name: 'Corporate',
    preview: '🏢',
    description: 'Professional enterprise',
    styles: {
      headerBg: '#0369a1',
      headerColor: '#ffffff',
      accentColor: '#0369a1',
      borderRadius: '4px',
      fontFamily: "'Roboto', sans-serif",
    }
  }
];

// Function to generate CSS for a template
export const getTemplateStyles = (templateId) => {
  const template = INVOICE_TEMPLATES.find(t => t.id === templateId) || INVOICE_TEMPLATES[0];
  const { styles } = template.styles;

  // We can return inline styles object or a CSS string depending on usage.
  // Here we return CSS string to be injected.

  const t = template.styles;

  return `
    .invoice-paper {
        font-family: ${t.fontFamily} !important;
        border-radius: ${t.borderRadius} !important;
    }

    .inv-header {
        background: ${t.headerBg} !important;
        color: ${t.headerColor} !important;
        border-radius: ${t.borderRadius} ${t.borderRadius} 0 0 !important;
        padding: 30px !important;
        margin: -60px -60px 50px -60px !important; /* Counteract padding of parent */
    }

    /* Adjust header text colors based on background */
    .inv-header .brand h1, 
    .inv-header .brand p,
    .inv-header .inv-meta p,
    .inv-header .inv-meta p strong {
        color: ${t.headerColor} !important; 
    }

    .logo {
        background: ${t.headerColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)'} !important;
        color: ${t.headerColor} !important;
    }

    .summary-item.highlight {
        background: ${t.accentColor} !important;
        border-radius: ${t.borderRadius} !important;
    }

    .summary-item.highlight p, .summary-item.highlight label {
        color: #ffffff !important;
    }

    .btn-primary, .payment-amount {
        background-color: ${t.accentColor} !important;
        color: #ffffff !important;
    }
    
    .status-badge {
        background: ${t.headerColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)'} !important;
        color: ${t.headerColor} !important;
    }

    .breakdown-month {
        color: ${t.accentColor} !important;
    }
  `;
};

export default INVOICE_TEMPLATES;
