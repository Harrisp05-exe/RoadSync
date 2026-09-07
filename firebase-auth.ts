import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase-config";

export async function registerUser(
  email: string,
  password: string,
  username: string,
) {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: username,
    });

    // Save user profile to Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email,
      username,
      profileImage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function loginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export function onUserStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function getUserProfile(userId: string) {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    return snap.data();
  } catch (error: any) {
    throw new Error(error.message);
  }
}
