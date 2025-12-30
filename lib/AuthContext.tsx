import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { db } from './firebaseConfig';
import { collection, getDoc, getDocs, limit, query, where, doc as firestoreDoc } from 'firebase/firestore';

// Define the context type
type AuthContextType = {
  user: User | null;
  loading: boolean;
  userRole: string | null;
  setUserRole: (role: string | null) => void;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userRole: null,
  setUserRole: () => {},
});

// Create a provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  const routeForRole = (role: string | null) => {
    if (role === 'admin') return '/admin';
    if (role === 'attendant') return '/attendant';
    if (role === 'client') return '/clients';
    return null;
  };

  const resolveRole = async (email: string): Promise<string | null> => {
    try {
      const normalizedEmail = email.toLowerCase();

      const adminRef = firestoreDoc(db, 'admins', 'admin');
      const adminSnap = await getDoc(adminRef);
      if (adminSnap.exists() && String(adminSnap.data()?.email || '').toLowerCase() === normalizedEmail) {
        return 'admin';
      }

      const attendantsQuery = query(collection(db, 'attendants'), where('email', '==', normalizedEmail), limit(1));
      const attendantsSnap = await getDocs(attendantsQuery);
      if (!attendantsSnap.empty) {
        return 'attendant';
      }

      const clientsQuery = query(collection(db, 'clients'), where('email', '==', normalizedEmail), limit(1));
      const clientsSnap = await getDocs(clientsQuery);
      if (!clientsSnap.empty) {
        return 'client';
      }

      return null;
    } catch (error) {
      console.error('Error resolving role:', error);
      return null;
    }
  };

  // Check for stored auth state on app start
  useEffect(() => {
    const checkStoredAuth = async () => {
      try {
        // Check if there's a stored user role
        const storedRole = await AsyncStorage.getItem('userRole');
        if (storedRole) {
          setUserRole(storedRole);
        }
      } catch (error) {
        console.error('Error checking stored auth:', error);
      }
    };

    checkStoredAuth();
  }, []);

  // Set up auth state listener
  useEffect(() => {
    let unsubscribe: () => void;
    
    try {
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        try {
          setUser(currentUser);
          
          if (currentUser) {
            // User is signed in
            if (__DEV__) {
              console.log('User is signed in:', currentUser.email);
            }

            const email = currentUser.email || '';
            const storedRole = await AsyncStorage.getItem('userRole');
            let role = storedRole;

            if (!role && email) {
              try {
                role = await resolveRole(email);
              } catch (error) {
                console.error('Error determining user role:', error);
              }
            }

            if (role) {
              setUserRole(role);
              try {
                await AsyncStorage.setItem('userRole', role);
              } catch (storageError) {
                console.error('Error storing user role:', storageError);
              }
              const target = routeForRole(role);
              if (target) {
                try {
                  router.replace(target as any);
                } catch (navError) {
                  console.error('Error navigating:', navError);
                }
              }
            }
          } else {
            // User is signed out
            if (__DEV__) {
              console.log('User is signed out');
            }
            setUserRole(null);
            // Clear all auth-related storage
            try {
              await AsyncStorage.multiRemove([
                'userRole',
                'isSignedIn',
                'lastSignInTime',
                'deviceInfo',
                'lastLocation',
              ]);
            } catch (storageError) {
              console.error('Error clearing storage:', storageError);
            }
            // Navigate to signin if not already there
            if (router) {
              router.replace('/signin' as any);
            }
          }
        } catch (error) {
          console.error('Error in auth state change handler:', error);
        } finally {
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error setting up auth state listener:', error);
      setLoading(false);
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [router]);

  // Provide the auth context to children
  return (
    <AuthContext.Provider value={{ user, loading, userRole, setUserRole }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext); 