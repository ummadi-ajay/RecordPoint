import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Export all data as JSON
export const exportAllData = async () => {
    try {
        const data = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            students: [],
            invoices: [],
            attendance: [],
            settings: null
        };

        // Students
        const studentsSnap = await getDocs(collection(db, 'students'));
        data.students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Invoices
        const invoicesSnap = await getDocs(collection(db, 'invoices'));
        data.invoices = invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Attendance
        const attSnap = await getDocs(collection(db, 'monthly_attendance'));
        data.attendance = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Settings
        try {
            const settingsSnap = await getDocs(collection(db, 'settings'));
            if (settingsSnap.docs.length > 0) {
                data.settings = settingsSnap.docs[0].data();
            }
        } catch (e) {
            console.log('No settings found');
        }

        // Create and download file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EduBill_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return {
            success: true, counts: {
                students: data.students.length,
                invoices: data.invoices.length,
                attendance: data.attendance.length
            }
        };
    } catch (error) {
        console.error('Export error:', error);
        return { success: false, error: error.message };
    }
};

// Import data from JSON backup
export const importData = async (file, options = { overwrite: false }) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!data.version || !data.exportDate) {
                    throw new Error('Invalid backup file format');
                }

                const counts = { students: 0, invoices: 0, attendance: 0 };

                // Import students
                for (const student of data.students || []) {
                    const { id, ...studentData } = student;
                    await setDoc(doc(db, 'students', id), studentData, { merge: !options.overwrite });
                    counts.students++;
                }

                // Import invoices
                for (const invoice of data.invoices || []) {
                    const { id, ...invoiceData } = invoice;
                    await setDoc(doc(db, 'invoices', id), invoiceData, { merge: !options.overwrite });
                    counts.invoices++;
                }

                // Import attendance
                for (const att of data.attendance || []) {
                    const { id, ...attData } = att;
                    await setDoc(doc(db, 'monthly_attendance', id), attData, { merge: !options.overwrite });
                    counts.attendance++;
                }

                // Import settings
                if (data.settings) {
                    await setDoc(doc(db, 'settings', 'business'), data.settings, { merge: !options.overwrite });
                }

                resolve({ success: true, counts });
            } catch (error) {
                reject({ success: false, error: error.message });
            }
        };

        reader.onerror = () => reject({ success: false, error: 'Failed to read file' });
        reader.readAsText(file);
    });
};

// Clear all data (dangerous!)
export const clearAllData = async () => {
    try {
        // Delete students
        const studentsSnap = await getDocs(collection(db, 'students'));
        for (const d of studentsSnap.docs) {
            await deleteDoc(doc(db, 'students', d.id));
        }

        // Delete invoices
        const invoicesSnap = await getDocs(collection(db, 'invoices'));
        for (const d of invoicesSnap.docs) {
            await deleteDoc(doc(db, 'invoices', d.id));
        }

        // Delete attendance
        const attSnap = await getDocs(collection(db, 'monthly_attendance'));
        for (const d of attSnap.docs) {
            await deleteDoc(doc(db, 'monthly_attendance', d.id));
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
