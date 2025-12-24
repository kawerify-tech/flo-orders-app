import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
  where,
} from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { logClientFeedback } from '../../lib/activityLogger';

// Types
interface FeedbackItem {
  id: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  timestamp: Timestamp;
  status: 'new' | 'read' | 'responded';
  response?: {
    text: string;
    timestamp: Timestamp;
    respondedBy: string;
  };
}

interface Client {
  id: string;
  name: string;
  email: string;
}

const AdminFeedback = () => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [notificationText, setNotificationText] = useState('');
  const [showNotificationForm, setShowNotificationForm] = useState(false);

  // Fetch feedback and clients
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch clients
        const clientsRef = collection(db, 'clients');
        const clientsSnap = await getDocs(clientsRef);
        const clientsData: Client[] = [];
        clientsSnap.forEach((doc) => {
          clientsData.push({ id: doc.id, ...doc.data() } as Client);
        });
        setClients(clientsData);

        // Subscribe to feedback updates
    const feedbackRef = collection(db, 'clientFeedback');
    const q = query(feedbackRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedbackData: FeedbackItem[] = [];
      snapshot.forEach((doc) => {
        feedbackData.push({ id: doc.id, ...doc.data() } as FeedbackItem);
      });
      setFeedback(feedbackData);
      setLoading(false);
    });

    return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSendNotification = async () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client');
      return;
    }

    if (!notificationText.trim()) {
      Alert.alert('Error', 'Please enter notification text');
      return;
    }

    try {
      await addDoc(collection(db, 'notifications'), {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        message: notificationText.trim(),
        timestamp: serverTimestamp(),
        type: 'feedback_request',
        status: 'unread'
      });

      Alert.alert('Success', 'Feedback request sent successfully!');
      setNotificationText('');
      setSelectedClient(null);
      setShowNotificationForm(false);
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', 'Failed to send notification');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const feedbackRef = collection(db, 'clientFeedback');
      const q = query(feedbackRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      
      const feedbackData: FeedbackItem[] = [];
      snapshot.forEach((doc) => {
        feedbackData.push({ id: doc.id, ...doc.data() } as FeedbackItem);
      });
      setFeedback(feedbackData);
    } catch (error) {
      console.error('Error refreshing feedback:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderFeedbackItem = ({ item }: { item: FeedbackItem }) => (
    <View style={styles.feedbackCard}>
      <View style={styles.feedbackHeader}>
        <View>
          <Text style={styles.clientName}>{item.clientName}</Text>
          <Text style={styles.timestamp}>{format(item.timestamp.toDate(), 'MMM d, yyyy h:mm a')}</Text>
        </View>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={item.rating >= star ? 'star' : 'star-outline'}
            size={20}
            color={item.rating >= star ? '#FFD700' : '#CCCCCC'}
            style={styles.starIcon}
          />
        ))}
      </View>

      <Text style={styles.comment}>{item.comment}</Text>

      {item.response && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseHeader}>Response:</Text>
          <Text style={styles.responseText}>{item.response.text}</Text>
          <Text style={styles.responseTimestamp}>
            {format(item.response.timestamp.toDate(), 'MMM d, yyyy h:mm a')} by {item.response.respondedBy}
          </Text>
        </View>
      )}
    </View>
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'new':
        return styles.statusNew;
      case 'read':
        return styles.statusRead;
      case 'responded':
        return styles.statusResponded;
      default:
        return {};
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6A0DAD']}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Feedback Management</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowNotificationForm(!showNotificationForm)}
            >
              <Ionicons name={showNotificationForm ? 'close' : 'add'} size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {showNotificationForm && (
            <View style={styles.notificationForm}>
              <Text style={styles.formLabel}>Request Feedback</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientsList}>
                {clients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.clientChip,
                      selectedClient?.id === client.id && styles.selectedClientChip
                    ]}
                    onPress={() => setSelectedClient(client)}
                  >
                    <Text style={[
                      styles.clientChipText,
                      selectedClient?.id === client.id && styles.selectedClientChipText
                    ]}>
                      {client.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={styles.input}
                placeholder="Enter feedback request message..."
                value={notificationText}
                onChangeText={setNotificationText}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendNotification}
              >
                <Text style={styles.sendButtonText}>Send Request</Text>
                <Ionicons name="send" size={20} color="#fff" style={styles.sendIcon} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.feedbackList}>
            <Text style={styles.sectionTitle}>Recent Feedback</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#6A0DAD" />
            ) : feedback.length > 0 ? (
              <FlatList
                data={feedback}
                renderItem={renderFeedbackItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbox-ellipses-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No feedback yet</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6A0DAD',
  },
  addButton: {
    backgroundColor: '#6A0DAD',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  notificationForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  formLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  clientsList: {
    marginBottom: 15,
  },
  clientChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedClientChip: {
    backgroundColor: '#6A0DAD',
  },
  clientChipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedClientChipText: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#6A0DAD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 15,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  sendIcon: {
    marginLeft: 4,
  },
  feedbackList: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusNew: {
    backgroundColor: '#E3F2FD',
  },
  statusRead: {
    backgroundColor: '#F3E5F5',
  },
  statusResponded: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  starIcon: {
    marginRight: 4,
  },
  comment: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  responseContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  responseHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  responseText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  responseTimestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});

export default AdminFeedback; 