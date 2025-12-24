import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { db } from '../../lib/firebaseConfig';
import { collection, query, orderBy, onSnapshot, Timestamp, getDocs, limit, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRouter } from 'expo-router';

interface Notification {
  id: string;
  message: string;
  timestamp: Timestamp;
  type: 'transaction' | 'system' | 'alert';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  transactionId?: string;
  amount?: number;
  litres?: number;
  fuelType?: 'diesel' | 'blend';
  read: boolean;
}

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();
  const router = useRouter();

  const subscribeToNotifications = useCallback((userEmail: string) => {
    if (!userEmail) return () => {};

    try {
      const email = userEmail.toLowerCase();
      const clientRef = doc(db, 'clients', email);

      // Subscribe to client's transactions subcollection
      const transactionsRef = collection(clientRef, 'transactions');
      const transactionsQuery = query(
        transactionsRef,
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      return onSnapshot(
        transactionsQuery,
        async (transactionSnapshot) => {
          try {
          const transactionNotifications = transactionSnapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp instanceof Timestamp 
              ? data.timestamp 
              : Timestamp.now();

            return {
              id: doc.id,
              type: 'transaction' as const,
              message: `Transaction ${data.status}: ${data.litres}L of ${data.fuelType}`,
                timestamp,
              status: data.status as 'pending' | 'approved' | 'rejected' | 'completed',
              transactionId: doc.id,
              amount: data.amount || 0,
              litres: data.litres || 0,
              fuelType: data.fuelType as 'diesel' | 'blend',
              read: false
              };
          });

            // Get system notifications
          const notificationsRef = collection(clientRef, 'notifications');
          const notificationsQuery = query(
            notificationsRef,
            orderBy('createdAt', 'desc'),
            limit(20)
          );

            const notificationSnapshot = await getDocs(notificationsQuery);
              const systemNotifications = notificationSnapshot.docs.map(doc => {
                const data = doc.data();
                const timestamp = data.createdAt instanceof Timestamp 
                  ? data.createdAt 
                  : Timestamp.now();

                return {
                  id: doc.id,
                  type: 'system' as const,
                  message: data.message || '',
                timestamp,
                  status: 'pending' as const,
                  read: data.read || false
              };
              });

              const allNotifications = [...transactionNotifications, ...systemNotifications]
                .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

              setNotifications(allNotifications);
            setError(null);
          } catch (err) {
            console.error('Error processing notifications:', err);
            setError('Error processing notifications');
          } finally {
              setLoading(false);
              setRefreshing(false);
            }
        },
        (error) => {
          console.error('Error subscribing to notifications:', error);
          setError('Failed to load notifications');
          setLoading(false);
          setRefreshing(false);
        }
      );
    } catch (error) {
      console.error('Error setting up notifications:', error);
      setError('Failed to setup notifications');
      setLoading(false);
      setRefreshing(false);
      return () => {};
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeAuth: () => void;
    let unsubscribeNotifications: (() => void) | undefined;

    const setupSubscriptions = async () => {
      if (!isMounted) return;

      unsubscribeAuth = auth.onAuthStateChanged((user) => {
        if (!isMounted) return;

        if (user?.email) {
          console.log('Fetching notifications for:', user.email);
          unsubscribeNotifications = subscribeToNotifications(user.email);
        } else {
          console.log('No authenticated user');
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
    if (user?.email) {
      subscribeToNotifications(user.email);
    } else {
      setRefreshing(false);
      Alert.alert('Error', 'Please login again');
      router.replace("/signin");
    }
  }, [auth.currentUser, router, subscribeToNotifications]);

  // Add error boundary
  if (!auth.currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color="#FF5252" />
          <Text style={styles.errorText}>Please sign in to view notifications</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transaction':
        return 'card-outline';
      case 'system':
        return 'settings-outline';
      case 'alert':
        return 'alert-circle-outline';
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

  const renderNotification = (notification: Notification) => (
    <View 
      key={notification.id} 
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
          {notification.amount && (
            <Text style={styles.detailText}>
              Amount: ${notification.amount.toFixed(2)}
            </Text>
          )}
          {notification.litres && (
            <Text style={styles.detailText}>
              Litres: {notification.litres.toFixed(2)}L
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
    <SafeAreaView style={styles.container}>
      {/* Background Circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <View style={styles.circle3} />

      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Notifications</Text>
      </View>

      {/* Scrollable Content */}
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
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length > 0 ? (
          notifications.map(renderNotification)
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="notifications-off-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingTop: 5,
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
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
