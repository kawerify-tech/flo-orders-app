import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  setDoc,
  writeBatch,
  limit,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../lib/firebaseConfig';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';

interface ClientData {
  id: string;
  address: string;
  amount: number;
  balance: number;
  cellPhone: string;
  contactPerson: number;
  email: string;
  fuelWithdrawn: number;
  invoiceNumbers: string[];
  language: string;
  litresDrawn: number;
  name: string;
  notifications: boolean;
  openingBalance: number;
  password: string;
  pumpPrice: number;
  receiptNumber: number;
  remainingFuel: number;
  requests: string[];
  role: string;
  status: string;
  threshold: number;
  tinNumber: number;
  totalFuelPurchased: number;
  totalValue: number;
  updatedAt: any;
  vatNumber: number;
  vehicle: string[];
}

interface Transaction {
  id: string;
  amount: number;
  litres: number;
  pumpPrice: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  vehicle: string;
  fuelType: 'diesel' | 'blend';
  attendantId: string;
  attendantName: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
    toDate: () => Date;
  };
  createdAt: Date;
  updatedAt: Date;
  clientId: string;
  clientName: string;
  clientEmail: string;
  isDraft?: boolean;
  metadata: {
    clientBalance: number;
    remainingFuel: number;
    requestSource: string;
  };
  processingSteps: Array<{
    step: string;
    timestamp: string;
    status: string;
  }>;
  notes?: string;
}

interface Notification {
  id: string;
  type: 'transaction' | 'message' | 'creation' | 'update';
  title: string;
  message: string;
  fromUserId: string;
  fromUserName: string;
  fromUserRole: string;
  toUserId: string;
  toUserRole: string;
  status: 'unread' | 'read';
  createdAt: any;
  relatedDocId?: string;
  relatedCollection?: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  receiverId: string;
  receiverName: string;
  content: string;
  timestamp: any;
  status: 'sent' | 'delivered' | 'read';
  attachments?: string[];
}

interface SavedTransaction extends Transaction {
  isDraft: boolean;
  lastModified: any;
}

const { width } = Dimensions.get('window');

const TransactionScreen = () => {
  const [amount, setAmount] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttendant, setSelectedAttendant] = useState<any>(null);
  const [attendants, setAttendants] = useState<any[]>([]);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [pumpPrice, setPumpPrice] = useState(0);
  const [calculatedLitres, setCalculatedLitres] = useState(0);
  const [isAmountValid, setIsAmountValid] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingAttendants, setIsLoadingAttendants] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savedTransactions, setSavedTransactions] = useState<SavedTransaction[]>([]);
  const [draftTransactions, setDraftTransactions] = useState<SavedTransaction[]>([]);
  const [selectedFuelType, setSelectedFuelType] = useState<'diesel' | 'blend'>('diesel');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Add new state for displaying current balance in transaction form
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [displayBalance, setDisplayBalance] = useState<number>(0);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      Alert.alert('Error', 'Please sign in to access transactions');
      return;
    }

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const clientDataResult = await fetchClientData();
        
        if (clientDataResult) {
          // Calculate remaining fuel based on balance and pump price
          const remainingFuel = clientDataResult.balance / clientDataResult.pumpPrice;
          
          // Update the states
          setCurrentBalance(clientDataResult.balance);
          setDisplayBalance(clientDataResult.balance);
          
          // Update client data with calculated remaining fuel
          await updateDoc(doc(db, 'clients', clientDataResult.id), {
            remainingFuel: remainingFuel
          });
        }

        await Promise.all([
          fetchAttendants(),
          subscribeToTransactions()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setLastError('Failed to load initial data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [currentUser]);

  // Calculate litres when amount or pump price changes
  useEffect(() => {
    if (amount && pumpPrice && clientData) {
      const amountNum = parseFloat(amount);
      const litres = amountNum / pumpPrice;
      setCalculatedLitres(Number(litres.toFixed(2)));
      
      // Ensure we're comparing numbers
      const currentBalance = Number(clientData.balance) || 0;
      const isValid = amountNum <= currentBalance;
      
      console.log('Balance validation:', {
        enteredAmount: amountNum,
        currentBalance: currentBalance,
        isValid: isValid
      });
      
      setIsAmountValid(isValid);
    } else {
      setCalculatedLitres(0);
      setIsAmountValid(true);
    }
  }, [amount, pumpPrice, clientData]);

  const fetchClientData = async () => {
    if (!currentUser?.email) {
      console.log('No user email found');
      Alert.alert('Error', 'Please sign in again');
      setLoading(false);
      return null;
    }

    const userEmail = currentUser.email.toLowerCase();

    try {
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('email', '==', userEmail));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        // Ensure vehicle array is properly initialized
        const clientData = {
        id: doc.id,
          ...data,
          balance: Number(data.balance || 0),
          remainingFuel: Number(data.remainingFuel || 0),
          pumpPrice: Number(data.pumpPrice || 0),
          vehicle: Array.isArray(data.vehicle) ? data.vehicle : [], // Ensure it's an array
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as ClientData;

        console.log('Client data loaded:', {
          id: clientData.id,
          email: userEmail,
          balance: clientData.balance,
          remainingFuel: clientData.remainingFuel,
          pumpPrice: clientData.pumpPrice,
          vehicleCount: clientData.vehicle.length
        });

        setClientData(clientData);
        setPumpPrice(clientData.pumpPrice);

        return clientData;
      } else {
        console.log('No client profile found for:', userEmail);
        Alert.alert(
          'Account Not Found',
          'Please contact support to set up your client account.',
          [{ text: 'OK' }]
        );
        setClientData(null);
        return null;
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
      Alert.alert('Error', 'Failed to load client data. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendants = async () => {
    try {
      const attendantsRef = collection(db, 'attendants');
      const snapshot = await getDocs(attendantsRef);
      const attendantList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        status: doc.data().status
      }));
      setAttendants(attendantList);
      setIsLoadingAttendants(false);
    } catch (error) {
      console.error('Error fetching attendants:', error);
      Alert.alert('Error', 'Failed to load attendants');
    }
  };

  const subscribeToTransactions = () => {
    if (!currentUser?.email) return () => {};

    setIsLoadingTransactions(true);

    // First try without the complex query
    const transactionsRef = collection(db, 'transactions');
    const simpleQuery = query(
      transactionsRef,
      where('clientEmail', '==', currentUser.email.toLowerCase())
    );

    return onSnapshot(simpleQuery, 
      (snapshot) => {
        const transactionList = snapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp instanceof Timestamp 
            ? data.timestamp 
            : Timestamp.now();

          return {
            ...data,
            id: doc.id,
            timestamp: {
              seconds: timestamp.seconds,
              nanoseconds: timestamp.nanoseconds,
              toDate: () => timestamp.toDate()
            }
          } as Transaction;
        });

        // Sort transactions client-side instead of in the query
        const sortedTransactions = transactionList.sort((a, b) => 
          b.timestamp.seconds - a.timestamp.seconds
        );

        // Limit to 20 transactions after sorting
        const limitedTransactions = sortedTransactions.slice(0, 20);

        setTransactions(limitedTransactions);
        setIsLoadingTransactions(false);
        
        console.log(`Fetched ${limitedTransactions.length} transactions`);
      }, 
      (error) => {
        console.error('Error subscribing to transactions:', error);
        setIsLoadingTransactions(false);
        Alert.alert('Error', 'Failed to load transactions. Please try again.');
      }
    );
  };

  const getClientDocRef = () => {
    if (!currentUser?.email) return null;
    // Use email as the document ID
    return doc(db, 'clients', currentUser.email);
  };

  const validateTransaction = () => {
    if (!amount || !selectedVehicle || !selectedAttendant) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (!clientData) {
      Alert.alert('Error', 'Client data not loaded. Please refresh.');
      return false;
    }

    const requestedAmount = parseFloat(amount);
    const currentBalance = Number(clientData.balance);
    const currentPumpPrice = Number(pumpPrice);
    
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return false;
    }

    if (requestedAmount > currentBalance) {
      Alert.alert('Error', 
        `Insufficient balance\n\nRequested: $${requestedAmount.toFixed(2)}\nAvailable: $${currentBalance.toFixed(2)}`
      );
      return false;
    }

    const calculatedLitres = requestedAmount / currentPumpPrice;
    if (calculatedLitres > clientData.remainingFuel) {
      Alert.alert('Error',
        `Insufficient fuel allocation\n\nRequested: ${calculatedLitres.toFixed(2)}L\nAvailable: ${clientData.remainingFuel.toFixed(2)}L`
      );
      return false;
    }

    return true;
  };

  const createNotification = async (
    type: Notification['type'],
    title: string,
    message: string,
    toUserId: string,
    toUserRole: string,
    relatedDocId?: string,
    relatedCollection?: string
  ) => {
    try {
      const notification: Omit<Notification, 'id'> = {
        type,
        title,
        message,
        fromUserId: currentUser!.uid,
        fromUserName: clientData!.name,
        fromUserRole: 'client',
        toUserId,
        toUserRole,
        status: 'unread',
        createdAt: serverTimestamp(),
        relatedDocId,
        relatedCollection
      };

      await addDoc(collection(db, 'notifications'), notification);
      console.log('Notification created successfully');
    } catch (error) {
      console.error('Error creating notification:', error);
      Alert.alert('Error', 'Failed to send notification');
    }
  };

  const sendMessage = async (receiverId: string, receiverName: string, content: string, attachments?: string[]) => {
    try {
      const message: Omit<Message, 'id'> = {
        senderId: currentUser!.uid,
        senderName: clientData!.name,
        senderRole: 'client',
        receiverId,
        receiverName,
        content,
        timestamp: serverTimestamp(),
        status: 'sent',
        attachments
      };

      await addDoc(collection(db, 'messages'), message);
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const updateUserInformation = async (updates: Partial<ClientData>) => {
    try {
      const userRef = doc(db, 'clients', clientData!.id);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Notify admin about the update
      await createNotification(
        'update',
        'Client Information Updated',
        `${clientData!.name} has updated their information`,
        'admin', // Replace with actual admin ID if available
        'admin',
        clientData!.id,
        'clients'
      );

      console.log('User information updated successfully');
      Alert.alert('Success', 'Your information has been updated');
    } catch (error) {
      console.error('Error updating user information:', error);
      Alert.alert('Error', 'Failed to update information');
    }
  };

  const handleCreateTransaction = async () => {
    if (!validateTransaction()) return;

    if (!currentUser?.email || !clientData) {
      Alert.alert('Error', 'Please sign in to create a transaction');
      return;
    }

    try {
      setIsSubmitting(true);
      const transactionAmount = parseFloat(amount);
      const userEmail = currentUser.email.toLowerCase();
      
      // Calculate new balance
      const newBalance = currentBalance - transactionAmount;
      const newRemainingFuel = newBalance / pumpPrice;

      // Create transaction ID
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create batch write
      const batch = writeBatch(db);

      // 1. Update client document using the document ID from clientData
      const clientRef = doc(db, 'clients', clientData.id);
      batch.update(clientRef, {
        balance: newBalance,
        remainingFuel: newRemainingFuel,
        updatedAt: serverTimestamp(),
        fuelWithdrawn: increment(calculatedLitres),
        litresDrawn: increment(calculatedLitres),
        totalValue: increment(transactionAmount)
      });

      // 2. Create transaction document
      const transactionRef = doc(db, 'transactions', transactionId);
      const transactionData = {
        id: transactionId,
        amount: transactionAmount,
        litres: calculatedLitres,
        fuelType: selectedFuelType,
        status: 'pending',
        vehicle: selectedVehicle,
        attendantId: selectedAttendant?.id || '',
        attendantName: selectedAttendant?.name || '',
        pumpPrice: pumpPrice,
        clientEmail: userEmail,
        clientId: clientData.id,
        clientName: clientData.name,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        metadata: {
          clientBalance: newBalance,
          remainingFuel: newRemainingFuel,
          requestSource: 'mobile_app'
        },
        processingSteps: [{
          step: 'created',
          timestamp: new Date().toISOString(),
          status: 'completed'
        }]
      };
      batch.set(transactionRef, transactionData);

      // Commit the batch
      await batch.commit();

      // Update local state
      setCurrentBalance(newBalance);
      setDisplayBalance(newBalance);
      
      // Update client data in state
      setClientData(prevData => {
        if (!prevData) return null;
        return {
          ...prevData,
          balance: newBalance,
          remainingFuel: newRemainingFuel,
          fuelWithdrawn: (prevData.fuelWithdrawn || 0) + calculatedLitres,
          litresDrawn: (prevData.litresDrawn || 0) + calculatedLitres,
          totalValue: (prevData.totalValue || 0) + transactionAmount
        };
      });
      
      // Reset form
      setAmount('');
      setSelectedVehicle('');
      setSelectedFuelType('diesel');
      setSelectedAttendant(null);

      Alert.alert('Success', 'Transaction created successfully');

    } catch (error) {
      console.error('Error in transaction:', error);
      Alert.alert('Error', 'Failed to process transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePDF = async (transaction: Transaction) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 30px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .total { margin-top: 20px; text-align: right; }
            .status { padding: 8px; border-radius: 4px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Fuel Transaction Receipt</h1>
            <p>Invoice Number: ${transaction.id}</p>
          </div>
          <div class="invoice-details">
            <p><strong>Date:</strong> ${format(transaction.timestamp.toDate(), 'MMMM d, yyyy HH:mm')}</p>
            <p><strong>Client:</strong> ${transaction.clientName}</p>
            <p><strong>Station:</strong> ${transaction.attendantName}</p>
            <p><strong>Status:</strong> <span class="status" style="background-color: ${
              transaction.status === 'approved' ? '#4CAF50' : 
              transaction.status === 'rejected' ? '#FF0000' : '#FFA500'
            }; color: white;">${transaction.status.toUpperCase()}</span></p>
          </div>
          <table class="table">
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Price/L</th>
              <th>Amount</th>
            </tr>
            <tr>
              <td>Fuel Purchase</td>
              <td>${transaction.litres.toFixed(2)} L</td>
              <td>$${transaction.pumpPrice.toFixed(2)}</td>
              <td>$${transaction.amount.toFixed(2)}</td>
            </tr>
          </table>
          <div class="total">
            <h3>Total Amount: $${transaction.amount.toFixed(2)}</h3>
          </div>
          ${transaction.notes ? `<p><strong>Notes:</strong> ${transaction.notes}</p>` : ''}
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri);
      } else {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download Receipt'
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate receipt');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'approved':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      case 'completed':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusMessage = (transaction: Transaction) => {
    switch (transaction.status) {
      case 'approved':
        return `Approved by ${transaction.attendantName}`;
      case 'rejected':
        return `Rejected by ${transaction.attendantName}`;
      case 'pending':
        return `Awaiting approval from ${transaction.attendantName}`;
      default:
        return '';
    }
  };

  const saveDraftTransaction = async () => {
    if (!currentUser?.email || !clientData) {
      Alert.alert('Error', 'Please sign in to save draft');
      return;
    }

    if (!validateTransaction()) return;

    setIsProcessing(true);
    setLastError(null);

    try {
      const draftId = `DRAFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();

      const draftData = {
        id: draftId,
        amount: parseFloat(amount),
        litres: calculatedLitres,
        pumpPrice: clientData.pumpPrice,
        status: 'pending',
        vehicle: selectedVehicle,
        fuelType: selectedFuelType,
        attendantId: selectedAttendant.id,
        attendantName: selectedAttendant.name,
        timestamp: now,
        createdAt: now,
        updatedAt: now,
        clientId: currentUser.email,
        clientName: clientData.name,
        clientEmail: currentUser.email,
        isDraft: true,
        lastModified: now,
        metadata: {
          clientBalance: clientData.balance,
          remainingFuel: clientData.remainingFuel,
          requestSource: 'mobile_app'
        },
        processingSteps: [{
          step: 'draft_created',
          timestamp: now.toISOString(),
          status: 'completed'
        }]
      };

      // Save draft directly to client's drafts subcollection
      await setDoc(
        doc(db, `clients/${currentUser.email}/drafts/${draftId}`),
        draftData
      );

      // Reset form
      setAmount('');
      setSelectedVehicle('');
      setSelectedFuelType('diesel');
      setSelectedAttendant(null);

      Alert.alert('Success', 'Draft saved successfully');

    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendDraftTransaction = async (draft: SavedTransaction) => {
    setIsProcessing(true);
    setLastError(null);

    try {
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = Timestamp.now();

      // Remove the draft from local state first to prevent duplicates
      setDraftTransactions(prev => prev.filter(d => d.id !== draft.id));

      const transactionData: Transaction = {
        ...draft,
        id: transactionId,
        isDraft: false,
        timestamp: {
          seconds: now.seconds,
          nanoseconds: now.nanoseconds,
          toDate: () => now.toDate()
        },
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
        processingSteps: [
          ...draft.processingSteps,
          {
            step: 'draft_sent',
            timestamp: now.toDate().toISOString(),
            status: 'completed'
          }
        ]
      };

      // Delete the draft first
      const draftRef = doc(db, `clients/${currentUser?.email}/drafts/${draft.id}`);
      await deleteDoc(draftRef);

      // Then create the new transaction
      const clientTransactionRef = doc(db, 
        `clients/${currentUser?.email}/transactions/${transactionId}`);
      
      await setDoc(clientTransactionRef, transactionData);

      Alert.alert('Success', 'Transaction created successfully');

    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'Failed to create transaction');
      // Refresh drafts list in case of error
      const draftsQuery = query(
        collection(db, `clients/${currentUser?.email}/drafts`),
        orderBy('lastModified', 'desc')
      );
      const snapshot = await getDocs(draftsQuery);
      const draftsList = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SavedTransaction[];
      setDraftTransactions(draftsList);
    } finally {
      setIsProcessing(false);
    }
  };

  const editDraft = (draft: SavedTransaction) => {
    // Set all the form fields
    setAmount(draft.amount.toString());
    setSelectedVehicle(draft.vehicle);
    setSelectedFuelType(draft.fuelType);
    
    // Find and set the attendant
    const attendant = attendants.find(a => a.id === draft.attendantId);
    setSelectedAttendant(attendant || null);

    // Delete the draft after loading its data
    const deleteDraft = async () => {
      try {
        const draftRef = doc(db, `clients/${currentUser?.email}/drafts/${draft.id}`);
        await deleteDoc(draftRef);
        setDraftTransactions(prev => prev.filter(d => d.id !== draft.id));
      } catch (error) {
        console.error('Error deleting draft:', error);
        Alert.alert('Error', 'Failed to delete draft');
      }
    };

    deleteDraft();
    
    // Scroll to the form
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  useEffect(() => {
    if (!currentUser?.email) return;

    // Subscribe to drafts in client's subcollection
    const draftsQuery = query(
      collection(db, `clients/${currentUser.email}/drafts`),
      orderBy('lastModified', 'desc')
    );

    const unsubscribe = onSnapshot(draftsQuery, (snapshot) => {
      const draftsList = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SavedTransaction[];
      setDraftTransactions(draftsList);
    }, (error) => {
      console.error('Error subscribing to drafts:', error);
      Alert.alert('Error', 'Failed to load drafts');
    });

    return () => unsubscribe();
  }, [currentUser?.email]);

  const renderAttendantSelector = () => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>Select Attendant</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedAttendant?.id || ''}
          onValueChange={(itemValue) => {
            const selected = attendants.find(a => a.id === itemValue);
            setSelectedAttendant(selected || null);
          }}
          style={styles.picker}
        >
          <Picker.Item label="Select an attendant" value="" />
          {attendants.map((attendant) => (
            <Picker.Item 
              key={attendant.id} 
              label={attendant.name} 
              value={attendant.id} 
            />
          ))}
        </Picker>
      </View>
    </View>
  );

  const renderFuelTypeSelector = () => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>Select Fuel Type</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedFuelType}
          onValueChange={(itemValue) => setSelectedFuelType(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Diesel" value="diesel" />
          <Picker.Item label="Blend" value="blend" />
        </Picker>
      </View>
    </View>
  );

  const renderVehicleSelector = () => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>Select Vehicle</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedVehicle}
          onValueChange={(itemValue) => setSelectedVehicle(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select a vehicle" value="" />
          {clientData && clientData.vehicle && Array.isArray(clientData.vehicle) ? (
            clientData.vehicle.map((vehicle, index) => (
              <Picker.Item key={index} label={vehicle} value={vehicle} />
            ))
          ) : null}
        </Picker>
      </View>
    </View>
  );

  const renderFormButtons = () => (
    <View style={styles.buttonContainer}>
            <TouchableOpacity
        style={[styles.button, styles.saveButton]}
        onPress={saveDraftTransaction}
        disabled={isProcessing}
      >
        <Text style={styles.buttonText}>Save Draft</Text>
            </TouchableOpacity>
        <TouchableOpacity
        style={[styles.button, styles.submitButton]}
          onPress={handleCreateTransaction}
        disabled={isProcessing}
        >
        <Text style={styles.submitButtonText}>Send Now</Text>
        </TouchableOpacity>
      </View>
  );

  const renderDrafts = () => (
    <View style={styles.draftsContainer}>
      <Text style={styles.sectionTitle}>Saved Drafts</Text>
      {draftTransactions.length === 0 ? (
        <Text style={styles.noTransactionsText}>No saved drafts</Text>
      ) : (
        draftTransactions.map(draft => (
          <View key={draft.id} style={styles.draftCard}>
            <View style={styles.draftHeader}>
              <View>
                <Text style={styles.draftId}>Draft #{draft.id.slice(-6)}</Text>
                <Text style={styles.draftVehicle}>{draft.vehicle}</Text>
              </View>
              <Text style={styles.draftAmount}>
                ${draft.amount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.draftDetails}>
              <Text style={styles.draftLitres}>
                {draft.litres.toFixed(2)}L @ ${draft.pumpPrice.toFixed(2)}/L
              </Text>
              <Text style={styles.draftDate}>
                {format(draft.lastModified.toDate(), 'MMM d, yyyy HH:mm')}
              </Text>
            </View>
            <View style={styles.draftActions}>
              <TouchableOpacity
                style={[styles.draftButton, styles.editButton]}
                onPress={() => editDraft(draft)}
              >
                <Icon name="create-outline" size={20} color="#6A0DAD" />
                <Text style={styles.draftButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.draftButton, styles.sendButton]}
                onPress={() => sendDraftTransaction(draft)}
                disabled={isProcessing}
              >
                <Icon name="send-outline" size={20} color="#FFFFFF" />
                <Text style={[styles.draftButtonText, styles.sendButtonText]}>
                  {isProcessing ? 'Sending...' : 'Send'}
              </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderTransactionList = () => {
    if (isLoadingTransactions) {
      return <ActivityIndicator size="large" color="#6A0DAD" />;
    }

    if (transactions.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No transactions yet</Text>
        </View>
      );
    }

    return (
      <View>
        {transactions.map((item) => {
          let date: Date;
          try {
            date = item.timestamp?.toDate?.() || new Date();
          } catch (error) {
            console.warn('Invalid timestamp for transaction:', item.id);
            date = new Date();
          }

          return (
            <View key={item.id} style={styles.transactionCard}>
              <View style={styles.transactionHeaderRow}>
                <View style={styles.transactionAmountContainer}>
                  <Icon name="cash-outline" size={24} color="#6A0DAD" />
                  <Text style={styles.transactionAmount}>
                    ${item.amount.toFixed(2)}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) }
                ]}>
                  <Icon
                    name={
                      item.status === 'completed' ? 'checkmark-circle-outline' :
                      item.status === 'pending' ? 'time-outline' :
                      item.status === 'rejected' ? 'close-circle-outline' :
                      'help-circle-outline'
                    }
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.statusText}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.transactionDetailsBox}>
                <View style={styles.detailRow}>
                  <Icon name="water-outline" size={18} color="#666666" />
                  <Text style={styles.transactionDetail}>
                    {item.litres.toFixed(2)} L of {item.fuelType}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="car-outline" size={18} color="#666666" />
                  <Text style={styles.transactionDetail}>
                    Vehicle: {item.vehicle}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="calendar-outline" size={18} color="#666666" />
                  <Text style={styles.transactionDetail}>
                    Date: {date.toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderTransactionForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>New Transaction</Text>
      
      {/* Always visible balance */}
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Current Balance:</Text>
        <Text style={styles.balanceAmount}>${displayBalance.toFixed(2)}</Text>
      </View>

      {renderFuelTypeSelector()}
      {renderVehicleSelector()}
      
      <TextInput
        style={[styles.input, !isAmountValid && styles.invalidInput]}
        placeholder="Enter Amount ($)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholderTextColor="#999"
      />

      {amount !== '' && (
        <View style={styles.calculationContainer}>
          <Text style={[
            styles.calculationText,
            !isAmountValid && styles.invalidText
          ]}>
            Calculated Litres: {calculatedLitres.toFixed(2)}L
          </Text>
        </View>
      )}

      {renderAttendantSelector()}
      {renderFormButtons()}
    </View>
  );

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please sign in to view transactions</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A0DAD" />
      </View>
    );
  }

  if (lastError) {
  return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{lastError}</Text>
            <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLastError(null);
            fetchClientData();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Background Circles */}
      <View style={styles.backgroundCircle1} />
      <View style={styles.backgroundCircle2} />
      <View style={styles.backgroundCircle3} />
      
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container}
    >
        {/* Current Balance and Fuel Info */}
        <LinearGradient
          colors={['#8A2BE2', '#6A0DAD']}
          style={styles.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{clientData?.name || 'Welcome'}</Text>
            <View style={styles.infoContainer}>
              <View style={styles.infoCard}>
                <Icon name="wallet-outline" size={24} color="#FFFFFF" style={styles.cardIcon} />
                <Text style={styles.infoLabel}>Current Balance</Text>
                <Text style={styles.infoValue}>
                  ${currentBalance.toFixed(2)}
                </Text>
                <Text style={styles.infoSubtext}>Available Funds</Text>
              </View>
              <View style={styles.infoCard}>
                <Icon name="gas-station-outline" size={24} color="#FFFFFF" style={styles.cardIcon} />
                <Text style={styles.infoLabel}>Remaining Fuel</Text>
                <Text style={styles.infoValue}>
                  {(currentBalance / pumpPrice).toFixed(2)}L
                </Text>
                <Text style={styles.infoSubtext}>Based on Current Balance</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Client Details Summary with icons */}
        <View style={styles.clientInfoCard}>
          <Text style={styles.sectionTitle}>Client Details</Text>
          <View style={styles.clientInfoRow}>
            <Icon name="receipt-outline" size={20} color="#6A0DAD" />
            <Text style={styles.clientInfoTextStyle}>VAT: {clientData?.vatNumber || 'N/A'}</Text>
          </View>
          <View style={styles.clientInfoRow}>
            <Icon name="document-text-outline" size={20} color="#6A0DAD" />
            <Text style={styles.clientInfoTextStyle}>TIN: {clientData?.tinNumber || 'N/A'}</Text>
          </View>
          <View style={styles.clientInfoRow}>
            <Icon name="pricetag-outline" size={20} color="#6A0DAD" />
            <Text style={styles.clientInfoTextStyle}>Pump Price: ${pumpPrice.toFixed(2)}/L</Text>
          </View>
        </View>

      {/* New Transaction Form */}
      {renderTransactionForm()}

      {/* Add drafts section */}
      {renderDrafts()}

      {/* Transactions List */}
      <View style={styles.transactionsList}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        
        {renderTransactionList()}
      </View>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  container: {
    flex: 1,
  },
  backgroundCircle1: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(106, 13, 173, 0.1)',
    top: -width * 0.2,
    right: -width * 0.2,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(138, 43, 226, 0.08)',
    top: width * 0.3,
    left: -width * 0.3,
  },
  backgroundCircle3: {
    position: 'absolute',
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    backgroundColor: 'rgba(106, 13, 173, 0.05)',
    bottom: width * 0.2,
    right: -width * 0.1,
  },
  gradientHeader: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 20,
    paddingBottom: 30,
    marginBottom: 20,
  },
  headerContent: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center', // Center the icon
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 16,
    borderRadius: 20,
    shadowColor: '#6A0DAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F8F9FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  calculationContainer: {
    backgroundColor: '#F8F9FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  calculationText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 4,
  },
  attendantList: {
    flexGrow: 0,
    marginBottom: 20,
  },
  attendantItem: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8F9FE',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedAttendant: {
    backgroundColor: '#6A0DAD',
    borderColor: '#6A0DAD',
  },
  attendantName: {
    color: '#333333',
    fontWeight: '500',
  },
  selectedAttendantText: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#6A0DAD',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6A0DAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clientInfoCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 16,
    borderRadius: 20,
    shadowColor: '#6A0DAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  clientInfoTextStyle: {
    fontSize: 15,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
  },
  transactionsList: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transactionDetailsBox: {
    backgroundColor: '#F8F9FE',
    padding: 12,
    borderRadius: 12,
  },
  transactionAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6A0DAD',
    marginBottom: 8,
  },
  transactionDate: {
    fontSize: 13,
    color: '#666666',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FE',
    marginTop: 12,
  },
  downloadButtonText: {
    marginLeft: 8,
    color: '#6A0DAD',
    fontWeight: '600',
  },
  statusMessage: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#F8F9FE',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF0000',
    textAlign: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invalidInput: {
    borderColor: '#FF0000',
    borderWidth: 1,
    backgroundColor: '#FFF5F5',
  },
  invalidText: {
    color: '#FF0000',
  },
  errorMessage: {
    color: '#FF0000',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerWrapper: {
    backgroundColor: '#F8F9FE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  transactionVehicle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  transactionLitres: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  loadingAttendants: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FE',
    borderRadius: 16,
  },
  loadingTransactions: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#666666',
    fontSize: 14,
  },
  noTransactionsText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#6A0DAD',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  draftsContainer: {
    marginTop: 20,
    padding: 16,
  },
  draftCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  draftActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  draftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#F8F9FE',
    borderWidth: 1,
    borderColor: '#6A0DAD',
  },
  sendButton: {
    backgroundColor: '#6A0DAD',
  },
  draftButtonText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#6A0DAD',
  },
  sendButtonText: {
    color: '#FFFFFF',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#F8F9FE',
    borderWidth: 1,
    borderColor: '#6A0DAD',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6A0DAD',
  },
  draftId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  draftVehicle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  draftAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6A0DAD',
  },
  draftDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F8F9FE',
    padding: 12,
    borderRadius: 12,
  },
  draftLitres: {
    fontSize: 14,
    color: '#666666',
  },
  draftDate: {
    fontSize: 13,
    color: '#666666',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  transactionDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardIcon: {
    marginBottom: 8,
  },
  clientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  balanceContainer: {
    backgroundColor: '#F8F9FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 18,
    color: '#6A0DAD',
    fontWeight: 'bold',
  },
});

export default TransactionScreen; 