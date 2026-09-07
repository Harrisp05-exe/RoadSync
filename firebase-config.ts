import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDNwByK3lqG5t5xO9QRY9-n5hwF91c1zw0",
  authDomain: "roadsync-2b690.firebaseapp.com",
  projectId: "roadsync-2b690",
  storageBucket: "roadsync-2b690.firebasestorage.app",
  messagingSenderId: "797403589424",
  appId: "1:797403589424:web:125c14259765c0696b36f5",
  measurementId: "G-17B0N799CK",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
