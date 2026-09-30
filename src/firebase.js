// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDFMBs_V69Cnq9k074vmJ-T4KkSJdrXU4g",
    authDomain: "hackqubit-cc914.firebaseapp.com",
    projectId: "hackqubit-cc914",
    storageBucket: "hackqubit-cc914.firebasestorage.app",
    messagingSenderId: "128139365420",
    appId: "1:128139365420:web:8181d2dd437057f953d589",
    measurementId: "G-EJ23NFGZZB"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;