import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyBVgqwFQu3AlSqc7Khmwg05bUdKIDd8WrI",
    authDomain: "ledgerapp-4f04a.firebaseapp.com",
    projectId: "ledgerapp-4f04a",
    storageBucket: "ledgerapp-4f04a.firebasestorage.app",
    messagingSenderId: "227637983990",
    appId: "1:227637983990:web:3e28c3f97d795740594ad7",
    measurementId: "G-4T9V56HLY1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
