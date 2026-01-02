// firebaseConfig.ts
import { getApp, getApps, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore, setLogLevel, collection, getDocs, addDoc, updateDoc, query, where, orderBy, limit, startAfter, doc, runTransaction } from 'firebase/firestore';
import { getDatabase, ref, onValue, push, set, serverTimestamp, update, onDisconnect, get, child } from 'firebase/database';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration object
export const firebaseConfig = {
  apiKey: "AIzaSyBHrEVy_MF24m35Fi9YQYrdaD0ncXj9N88",
  authDomain: "flo-app-7de7d.firebaseapp.com",
  databaseURL: "https://flo-app-7de7d-default-rtdb.firebaseio.com",
  projectId: "flo-app-7de7d",
  storageBucket: "flo-app-7de7d.firebasestorage.app",
  messagingSenderId: "231184460855",
  appId: "1:231184460855:web:7c51b1350a36d96e0623b2",
  measurementId: "G-H8YC0ERT12",
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firestore, Authentication, Messaging, and Realtime Database
const db = getFirestore(app);

// Prevent Firestore SDK internal logs from surfacing as red error overlays in the app.
// This is especially important during auth transitions (logout) where snapshot listeners
// can briefly receive permission-denied.
try {
  setLogLevel('silent');
} catch {
  // Ignore; logging level is best-effort.
}

const globalForFirebase = globalThis as unknown as {
  __flo_firebase_auth__?: ReturnType<typeof getAuth>;
  __flo_firebase_auth_by_app__?: Record<string, ReturnType<typeof getAuth>>;
};

const getOrInitAuth = (targetApp: typeof app) => {
  globalForFirebase.__flo_firebase_auth_by_app__ ??= {};
  const key = targetApp.name;
  const existing = globalForFirebase.__flo_firebase_auth_by_app__[key];
  if (existing) return existing;

  let instance: ReturnType<typeof getAuth>;
  if (Platform.OS === 'web') {
    instance = getAuth(targetApp);
  } else {
    try {
      instance = initializeAuth(targetApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // If already initialized (fast refresh) or RN bundle not available, fall back.
      instance = getAuth(targetApp);
    }
  }

  globalForFirebase.__flo_firebase_auth_by_app__[key] = instance;
  if (key === app.name) globalForFirebase.__flo_firebase_auth__ = instance;
  return instance;
};

const auth = (() => {
  if (globalForFirebase.__flo_firebase_auth__) return globalForFirebase.__flo_firebase_auth__;
  return getOrInitAuth(app);
})();
let messaging: any = null;
let getToken: any = null;
let onMessage: any = null;

if (Platform.OS === 'web') {
  try {
    const messagingMod = require('firebase/messaging');
    messaging = messagingMod.getMessaging(app);
    getToken = messagingMod.getToken;
    onMessage = messagingMod.onMessage;
  } catch {
    messaging = null;
    getToken = null;
    onMessage = null;
  }
}
const database = getDatabase(app);

const getSecondaryApp = () => {
  const existing = getApps().find((a) => a.name === 'secondary');
  return existing ?? initializeApp(firebaseConfig, 'secondary');
};

const getSecondaryAuth = () => {
  return getOrInitAuth(getSecondaryApp());
};

// Helper functions for Realtime Database
const getChatRef = (chatId: string) => ref(database, `chats/${chatId}`);
const getMessagesRef = (chatId: string) => ref(database, `chats/${chatId}/messages`);
const getUserRef = (userId: string) => ref(database, `users/${userId}`);
const getStatusRef = (userId: string) => ref(database, `users/${userId}/status`);

// Export the Firebase app, Firestore, Authentication, Messaging, and Realtime Database
export { 
    app, 
    db, 
    auth, 
    getSecondaryAuth,
    messaging,
    database,
    // Firestore exports
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    startAfter, 
    doc,
    runTransaction,
    // Auth exports
    createUserWithEmailAndPassword,
    // Messaging exports
    getToken,
    onMessage,
    // Realtime Database exports
    ref,
    onValue,
    push,
    set,
    serverTimestamp,
    update,
    onDisconnect,
    get,
    child,
    // Helper functions
    getChatRef,
    getMessagesRef,
    getUserRef,
    getStatusRef
};
