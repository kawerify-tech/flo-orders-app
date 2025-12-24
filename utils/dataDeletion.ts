import { db, auth } from '../lib/firebaseConfig';
import { collection, doc, setDoc, updateDoc, writeBatch, getDocs, query, where, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DataDeletionRequest {
  userId: string;
  email: string;
  requestDate: Date;
  status: 'pending' | 'completed' | 'failed';
  reason?: string;
}

export class DataDeletionService {
  private static instance: DataDeletionService;
  private readonly COLLECTION_NAME = 'dataDeletionRequests';

  private constructor() {}

  public static getInstance(): DataDeletionService {
    if (!DataDeletionService.instance) {
      DataDeletionService.instance = new DataDeletionService();
    }
    return DataDeletionService.instance;
  }

  async requestDataDeletion(userId: string, email: string, reason?: string): Promise<void> {
    try {
      const request: DataDeletionRequest = {
        userId,
        email,
        requestDate: new Date(),
        status: 'pending',
        reason,
      };

      await setDoc(doc(db, this.COLLECTION_NAME, userId), request);

      // Notify admin about deletion request
      await this.notifyAdmin(request);
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      throw error;
    }
  }

  async processDeletionRequest(userId: string): Promise<void> {
    try {
      const batchWrite = writeBatch(db);
      const userRef = doc(db, 'users', userId);
      
      // Delete user data
      batchWrite.delete(userRef);

      // Delete transactions
      const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', userId));
      const transactions = await getDocs(transactionsQuery);
      transactions.forEach(doc => {
        batchWrite.delete(doc.ref);
      });

      // Delete notifications
      const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
      const notifications = await getDocs(notificationsQuery);
      notifications.forEach(doc => {
        batchWrite.delete(doc.ref);
      });

      // Delete local storage data
      await AsyncStorage.removeItem(`user_${userId}`);
      await AsyncStorage.removeItem(`settings_${userId}`);

      // Commit the batch
      await batchWrite.commit();

      // Update deletion request status
      await updateDoc(doc(db, this.COLLECTION_NAME, userId), {
        status: 'completed',
      });

      // Sign out the user
      await signOut(auth);
    } catch (error) {
      console.error('Error processing deletion request:', error);
      await updateDoc(doc(db, this.COLLECTION_NAME, userId), {
        status: 'failed',
      });
      throw error;
    }
  }

  private async notifyAdmin(request: DataDeletionRequest): Promise<void> {
    // Implementation for notifying admin
    // This could be sending an email, creating a notification, etc.
    console.log('Admin notified about deletion request:', request);
  }

  async getDeletionRequestStatus(userId: string): Promise<DataDeletionRequest | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as DataDeletionRequest;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting deletion request status:', error);
      throw error;
    }
  }
} 