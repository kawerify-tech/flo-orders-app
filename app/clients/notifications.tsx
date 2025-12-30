import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from '../../lib/firebaseConfig';
import { DocumentData, QueryDocumentSnapshot, Timestamp, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { commonStyles } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { SafeAreaLayout } from '../../components/SafeAreaLayout';

interface Notification {
  id: string;
  type: 'transaction' | 'system';
  message: string;
  timestamp: Timestamp;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  transactionId?: string;
  amount?: number;
  fuelType?: 'diesel' | 'blend';
  litres?: number;
  pumpPrice?: number;
  vehicle?: string;
  attendantName?: string;
  attendantId?: string;
  read: boolean;
}

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const subscribeToNotifications = useCallback((userUid: string, userEmail?: string | null) => {
    if (!userUid) return () => {};

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const setup = async () => {
      try {
        let clientDocId = userUid;

        const byUidRef = doc(db, 'clients', userUid);
        const byUidSnap = await getDoc(byUidRef);
        if (!byUidSnap.exists() && userEmail) {
          const clientsRef = collection(db, 'clients');
          const q = query(clientsRef, where('email', '==', userEmail.toLowerCase()), limit(1));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            clientDocId = snapshot.docs[0].id;
          }
        }

        const clientRef = doc(db, 'clients', clientDocId);

        const normalizedEmail = (userEmail || '').toLowerCase();
        if (!normalizedEmail) {
          setLoading(false);
          setRefreshing(false);
          return;
        }

        // Subscribe to global transactions (same source as transaction history) so every transaction appears here.
        // Avoid orderBy here to prevent requiring composite indexes; sort client-side instead.
        const transactionsRef = collection(db, 'transactions');
        const transactionsQuery = query(transactionsRef, where('clientEmail', '==', normalizedEmail), limit(200));

        unsubscribe = onSnapshot(
          transactionsQuery,
          async (transactionSnapshot) => {
            try {
              const transactionNotifications = transactionSnapshot.docs
                .map((txDoc) => {
                  const data = txDoc.data() as any;
                  const timestamp = data.timestamp instanceof Timestamp ? data.timestamp : Timestamp.now();

                  return {
                    id: txDoc.id,
                    type: 'transaction' as const,
                    message: `Transaction ${String(data.status || 'pending')}: $${Number(data.amount || 0).toFixed(2)}`,
                    timestamp,
                    status: (data.status || 'pending') as 'pending' | 'approved' | 'rejected' | 'completed',
                    transactionId: data.id || txDoc.id,
                    amount: Number(data.amount || 0),
                    fuelType: data.fuelType as 'diesel' | 'blend',
                    litres: data.litres !== undefined ? Number(data.litres) : undefined,
                    pumpPrice: data.pumpPrice !== undefined ? Number(data.pumpPrice) : undefined,
                    vehicle: data.vehicle || undefined,
                    attendantName: data.attendantName || undefined,
                    attendantId: data.attendantId || undefined,
                    read: false,
                  };
                })
                .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

              // Get system notifications (client subcollection)
              const notificationsRef = collection(clientRef, 'notifications');
              const notificationsQuery = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));

              const notificationSnapshot = await getDocs(notificationsQuery);
              const systemNotifications = notificationSnapshot.docs.map((nDoc: QueryDocumentSnapshot<DocumentData>) => {
                const data = nDoc.data();
                const timestamp = data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now();

                return {
                  id: nDoc.id,
                  type: 'system' as const,
                  message: data.message || '',
                  timestamp,
                  status: 'pending' as const,
                  read: data.read || false,
                };
              });

              const allNotifications = [...transactionNotifications, ...systemNotifications].sort(
                (a, b) => b.timestamp.seconds - a.timestamp.seconds
              );

              setNotifications(allNotifications);
              setError(null);
            } catch (err) {
              console.error('Error processing notifications:', err);
              setError('Notifications are unavailable right now. Please try again.');
            } finally {
              setLoading(false);
              setRefreshing(false);
            }
          },
          (err) => {
            console.error('Error subscribing to notifications:', err);
            setError('Notifications are unavailable right now. Please try again.');
            setLoading(false);
            setRefreshing(false);
          }
        );
      } catch (err) {
        console.error('Error setting up notifications:', err);
        setError('Notifications are unavailable right now. Please try again.');
        setLoading(false);
        setRefreshing(false);
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeAuth: () => void;
    let unsubscribeNotifications: (() => void) | undefined;

    const setupSubscriptions = async () => {
      if (!isMounted) return;

      unsubscribeAuth = auth.onAuthStateChanged((user) => {
        if (!isMounted) return;

        if (user?.uid) {
          console.log('Fetching notifications for:', user.uid);
          unsubscribeNotifications = subscribeToNotifications(user.uid, user.email);
        } else {
          console.log('No authenticated user');
          if (unsubscribeNotifications) {
            try {
              unsubscribeNotifications();
            } catch (e) {
              console.warn('Error unsubscribing notifications listener:', e);
            }
            unsubscribeNotifications = undefined;
          }
          setLoading(false);
          router.replace("/signin");
        }
      });
    };

    setupSubscriptions();

    return () => {
      isMounted = false;
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, [subscribeToNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const user = auth.currentUser;
    if (user?.uid) {
      subscribeToNotifications(user.uid, user.email);
    } else {
      setRefreshing(false);
      Alert.alert('Error', 'Please login again');
      router.replace("/signin");
    }
  }, [auth.currentUser, router, subscribeToNotifications]);

  // Add error boundary
  if (!auth.currentUser) {
    return (
      <SafeAreaLayout>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color="#FF5252" />
          <Text style={styles.errorText}>Please sign in to view notifications</Text>
        </View>
      </SafeAreaLayout>
    );
  }

  if (loading) {
    return (
      <SafeAreaLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A0DAD" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaLayout>
    );
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transaction':
        return 'card-outline';
      case 'system':
        return 'settings-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FFA500';
      case 'approved':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      case 'completed':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  const getNotificationKey = (notification: Notification) => {
    return `${notification.type}:${notification.id}`;
  };

  const renderNotification = (notification: Notification) => (
    <View 
      key={getNotificationKey(notification)} 
      style={[
        styles.notificationCard,
        !notification.read && styles.unreadNotification
      ]}
    >
      <View style={styles.notificationHeader}>
        <Icon 
          name={getNotificationIcon(notification.type)} 
          size={24} 
          color="#6A0DAD" 
        />
        {notification.type === 'transaction' && (
          <View 
            style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(notification.status) }
            ]}
          >
            <Text style={styles.statusText}>{notification.status}</Text>
          </View>
        )}
      </View>

      <Text style={styles.notificationText}>{notification.message}</Text>

      {notification.type === 'transaction' && (
        <View style={styles.transactionDetails}>
          {notification.amount !== undefined && (
            <Text style={styles.detailText}>
              Amount: ${notification.amount.toFixed(2)}
            </Text>
          )}
          {notification.fuelType && (
            <Text style={styles.detailText}>
              Fuel Type: {notification.fuelType}
            </Text>
          )}
        </View>
      )}

      <View style={styles.notificationMeta}>
        <Text style={styles.notificationDate}>
          {notification.timestamp.toDate().toLocaleDateString()} at{' '}
          {notification.timestamp.toDate().toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaLayout>
      <View style={styles.backgroundDecoration}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />
      </View>

      <View style={styles.headerContainer}>
        <Text style={styles.header}>Notifications</Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6A0DAD']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {notifications.length > 0 ? (
          notifications.map(renderNotification)
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="notifications-off-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaLayout>
  );
};

const styles = StyleSheet.create({
  backgroundDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F5F5F5',
  },
  headerContainer: {
    backgroundColor: '#6A0DAD',
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 2,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 16,
    flexGrow: 1,
    paddingBottom: 32,
  },
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    backgroundColor: '#9575CD',
    borderRadius: 100,
    top: -50,
    right: -50,
    opacity: 0.2,
    zIndex: 0,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    backgroundColor: '#7E57C2',
    borderRadius: 75,
    bottom: 100,
    left: -50,
    opacity: 0.15,
    zIndex: 0,
  },
  circle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    backgroundColor: '#B39DDB',
    borderRadius: 50,
    bottom: -20,
    right: 30,
    opacity: 0.2,
    zIndex: 0,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#6A0DAD',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  transactionDetails: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationCard: {
    ...commonStyles.glassCard,
    borderRadius: 15,
    padding: 20,
    marginBottom: 12,
  },
  notificationText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontWeight: '500',
  },
  notificationMeta: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  notificationDate: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF5252',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default NotificationScreen;
