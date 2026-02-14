# EduBill - Student Management & Billing System

A premium, fast, and secure student management system built with React, Vite, and Firebase.

## 🚀 Key Features
- **Attendance-Driven Billing**: Automatic fee calculation based on monthly attendance.
- **Data Snapshotting**: Invoices store snapshots of student profile and attendance at the time of generation, ensuring historical accuracy.
- **Dynamic Invoices**: No static PDFs stored in the DB. Invoices are rendered in real-time and can be printed/downloaded on demand.
- **Public Parent Portal**: Secure, read-only links for parents to view and download invoices without authentication.
- **Glassmorphic UI**: High-end, modern design with vibrant aesthetics and smooth transitions.
- **QR Code Scanner**: Scan invoice QR codes directly from the app to verify or view on mobile.
- **Recurring Schedules**: Set weekly class schedules and auto-apply them to monthly attendance.
- **Invoice Templates**: Multiple professional invoice designs (Modern, Classic, Minimal, Colorful, Dark, Corporate).
- **WhatsApp Integration**: One-click sharing with customizable message templates.
- **Dynamic Course Management**: Create and price custom courses directly from settings.
- **Expense Tracking & Net Profit**: Log operating costs to calculate true profit margins in real-time.
- **Performance**: Optimized with skeleton loading states for smooth data fetching.

## 🛠️ Tech Stack
- **Frontend**: React (Vite)
- **Styling**: Vanilla CSS (Custom Design System)
- **Database**: Firestore (Source of Truth)
- **Auth**: Firebase Authentication (Admin Access)
- **Icons**: Lucide React
- **Animations**: Framer Motion

## ⚙️ Setup Instructions

### 1. Firebase Project Setup
1. Create a new project in [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Email/Password).
3. Enable **Cloud Firestore** in Test Mode (or apply rules below).
4. Register a Web App and copy your `firebaseConfig`.

### 2. Configuration
Replace the placeholders in `src/lib/firebase.js` with your actual Firebase configuration.

### 3. Firestore Rules
Add these rules to your Firestore console to allow public invoice viewing while protecting student data:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin access
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Public Invoice access (Read-only by ID)
    match /invoices/{invoiceId} {
      allow read: if true;
    }
  }
}
```

### 4. Installation
```bash
npm install
npm run dev
```

## 📖 Logical Flow
1. **Add Students**: Enter student details and monthly fee.
2. **Mark Attendance**: Update the total and attended classes for the month.
3. **Generate Invoice**: Click "Generate" in the Invoices tab. This takes a snapshot of the student's current fee and attendance.
4. **Share Link**: Copy the generated link and send it to parents.

---

