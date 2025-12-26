import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Dimensions, TextInput, Button
} from 'react-native';
import { collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebaseConfig';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Modal from 'react-native-modal';
import { useLocalSearchParams } from 'expo-router';
import { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { SafeAreaLayout } from '../../../components/SafeAreaLayout';

type FetchClientDetails = (id: string) => Promise<void>;

interface Transaction {
  id?: string;
  amount: number;
  attendantId: string;
  attendantName: string;
  clientEmail: string;
  clientId: string;
  clientName: string;
  fuelType: string;
  litres: number;
  metadata: {
    clientBalance: number;
    remainingFuel: number;
    processedAt: any;
  };
  pumpPrice: string;
  status: string;
  timestamp: any;
  updatedAt: any;
  vehicle: string;
  comment?: string;
}

interface Notification {
  id: string;
  clientId: string;
  clientName: string;
  message: string;
  status: string;
  timestamp: any;
  type: string;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  cellPhone: string;
  balance: number;
  address: string;
  status: string;
  role: string;
  createdAt: any;
  updatedAt: any;
}

interface Topup {
  id: string;
  amount: number;
  timestamp: any;
  clientId: string;
  clientName: string;
  status: string;
  message: string;
  type: string;
}

type Activity = Transaction | Topup | Notification;

const ClientDetails = () => {
  const { clientId, clientName } = useLocalSearchParams<{ clientId: string; clientName: string }>();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const transactionsPerPage = 10;
  const [isTopupModalVisible, setIsTopupModalVisible] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [notificationSortBy, setNotificationSortBy] = useState<'date' | 'type' | 'status'>('date');
  const [notificationSortOrder, setNotificationSortOrder] = useState<'asc' | 'desc'>('desc');
  const [notificationPage, setNotificationPage] = useState(1);
  const notificationsPerPage = 10;
  const [selectedTopup, setSelectedTopup] = useState<Topup | null>(null);
  const [topupSortBy, setTopupSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [topupSortOrder, setTopupSortOrder] = useState<'asc' | 'desc'>('desc');
  const [topupPage, setTopupPage] = useState(1);
  const topupsPerPage = 10;
  const [transactionForm, setTransactionForm] = useState({
    vehicle: '',
    fuelType: '',
    litres: '',
    amount: '',
    comment: ''
  });
  const [isTransactionModalVisible, setIsTransactionModalVisible] = useState(false);
  const [topupDescription, setTopupDescription] = useState('');
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [showTopupDetails, setShowTopupDetails] = useState(false);
  const [showNotificationDetails, setShowNotificationDetails] = useState(false);

  // Add a counter for generating unique keys
  const keyCounter = useRef(0);

  // Add a function to generate unique keys
  const generateUniqueKey = React.useCallback((type: string, id: string | undefined) => {
    keyCounter.current += 1;
    return `${type}-${id || 'temp'}-${keyCounter.current}-${Date.now()}`;
  }, []);

  // Add a Set to track used keys
  const usedKeys = React.useRef(new Set<string>());

  // Reset usedKeys when data changes
  React.useEffect(() => {
    usedKeys.current.clear();
  }, [transactions, topups, notifications]);

  // Add a function to load all data
  const loadAllData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      // Load client data
      if (clientId) {
        await fetchClientDetails(clientId);
      } else if (clientName) {
        await searchClientByName(clientName);
      }

      // Load notifications
      if (clientData?.id) {
        const notificationsRef = collection(db, 'notifications');
        const notificationsQuery = query(
          notificationsRef,
          where('clientId', '==', clientData.id),
          orderBy('timestamp', 'desc')
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        const notificationsData = notificationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];
        setNotifications(notificationsData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
      setLoading(false);
    }
  }, [clientId, clientName, clientData?.id]);

  // Load data when component mounts or clientId/clientName changes
  React.useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  console.log('Route params:', { clientId, clientName });

  const fetchClientDetails: FetchClientDetails = async (id: string) => {
    try {
      console.log('Starting fetchClientDetails for ID:', id);
      setLoading(true);
      
      // 1. Fetch client data
      console.log('Fetching client document...');
      const clientDoc = await getDoc(doc(db, 'clients', id));
      if (!clientDoc.exists()) {
        console.log('Client document not found');
        Alert.alert('Error', 'Client not found');
        setLoading(false);
        return;
      }

      const clientData = clientDoc.data() as ClientData;
      console.log('Client data fetched successfully - ID:', clientDoc.id, 'Data:', clientData);
      setClientData({ ...clientData, id: clientDoc.id });

      // 2. Fetch all transactions for this client
      console.log('Fetching transactions...');
      const transactionsRef = collection(db, 'transactions');
      const transactionsQuery = query(
        transactionsRef,
        where('clientId', '==', id),
        orderBy('timestamp', 'desc')
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        amount: doc.data().amount,
        attendantId: doc.data().attendantId,
        attendantName: doc.data().attendantName,
        clientEmail: doc.data().clientEmail,
        clientId: doc.data().clientId,
        clientName: doc.data().clientName,
        fuelType: doc.data().fuelType,
        litres: doc.data().litres,
        metadata: {
          clientBalance: doc.data().metadata?.clientBalance || 0,
          remainingFuel: doc.data().metadata?.remainingFuel || 0,
          processedAt: doc.data().metadata?.processedAt || null
        },
        pumpPrice: doc.data().pumpPrice,
        status: doc.data().status,
        timestamp: doc.data().timestamp,
        updatedAt: doc.data().updatedAt,
        vehicle: doc.data().vehicle,
        comment: doc.data().comment
      })) as Transaction[];
      console.log('Transactions fetched:', transactionsData.length);
      setTransactions(transactionsData);
      setFilteredTransactions(transactionsData);

      // 3. Fetch all notifications for this client
      console.log('Fetching notifications...');
      const notificationsRef = collection(db, 'notifications');
      const notificationsQuery = query(
        notificationsRef,
        where('clientId', '==', id),
        orderBy('timestamp', 'desc')
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const notificationsData = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        clientId: doc.data().clientId,
        clientName: doc.data().clientName,
        message: doc.data().message,
        status: doc.data().status,
        timestamp: doc.data().timestamp,
        type: doc.data().type
      })) as Notification[];
      console.log('Notifications fetched:', notificationsData.length);
      setNotifications(notificationsData);

      // 4. Fetch all topups for this client
      console.log('Fetching topups...');
      const topupsRef = collection(db, 'topups');
      const topupsQuery = query(
        topupsRef,
        where('clientId', '==', id),
        orderBy('timestamp', 'desc')
      );
      const topupsSnapshot = await getDocs(topupsQuery);
      const topupsData = topupsSnapshot.docs.map(doc => ({
        id: doc.id,
        amount: doc.data().amount,
        timestamp: doc.data().timestamp,
        clientId: doc.data().clientId,
        clientName: doc.data().clientName,
        status: doc.data().status,
        message: doc.data().message,
        type: doc.data().type
      })) as Topup[];
      console.log('Topups fetched:', topupsData.length);
      setTopups(topupsData);

      console.log('All data fetched successfully');
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchClientDetails:', error);
      Alert.alert('Error', 'Failed to fetch client details');
      setLoading(false);
    }
  };

  const searchClientByName = async (name: string): Promise<void> => {
    try {
      setLoading(true);
      console.log('Searching for client with name:', name);
      
      // First try exact match
      const clientsRef = collection(db, 'clients');
      const exactMatchQuery = query(clientsRef, where('name', '==', name));
      const exactMatchSnapshot = await getDocs(exactMatchQuery);
      
      if (!exactMatchSnapshot.empty) {
        console.log('Found exact match for client name');
        const clientDoc = exactMatchSnapshot.docs[0];
        await fetchClientDetails(clientDoc.id);
        return;
      }

      // If no exact match, try partial match
      const partialMatchQuery = query(
        clientsRef,
        where('name', '>=', name),
        where('name', '<=', name + '\uf8ff')
      );
      const partialMatchSnapshot = await getDocs(partialMatchQuery);
      
      if (partialMatchSnapshot.empty) {
        console.log('No client found with that name');
        Alert.alert('Error', 'No client found with that name');
        setLoading(false);
        return;
      }

      console.log('Found partial match for client name');
      const clientDoc = partialMatchSnapshot.docs[0];
      await fetchClientDetails(clientDoc.id);
    } catch (error) {
      console.error('Error searching for client:', error);
      Alert.alert('Error', 'Failed to search for client');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useEffect triggered with:', { clientId, clientName });
    const initializeClient = async () => {
      console.log('Starting client initialization');
      try {
        setLoading(true);
        if (clientId) {
          console.log('Fetching client by ID:', clientId);
          await fetchClientDetails(clientId);
        } else if (clientName) {
          console.log('Searching client by name:', clientName);
          await searchClientByName(clientName);
        } else {
          console.log('No client identifier provided');
          Alert.alert('Error', 'No client identifier provided');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing client:', error);
        Alert.alert('Error', 'Failed to load client data');
    } finally {
      setLoading(false);
        console.log('Client initialization completed');
      }
    };

    initializeClient();
  }, [clientId, clientName]);

  // Add real-time listener for transactions
  useEffect(() => {
    if (!clientData?.id) return;

    const transactionsRef = collection(db, 'transactions');
    const transactionsQuery = query(
      transactionsRef,
      where('clientId', '==', clientData.id),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
      const updatedTransactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(updatedTransactions);
      setFilteredTransactions(updatedTransactions);
    });

    return () => unsubscribe();
  }, [clientData?.id]);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid Date';
    }
  };

  // Sort transactions
  useEffect(() => {
    let sorted = [...filteredTransactions];
    
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => {
          const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
          const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
          return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        });
        break;
      case 'amount':
        sorted.sort((a, b) => 
          sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount
        );
        break;
      case 'status':
        sorted.sort((a, b) => 
          sortOrder === 'asc' 
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status)
        );
        break;
    }

    setFilteredTransactions(sorted);
  }, [sortBy, sortOrder]);

  // Add real-time listener for notifications
  useEffect(() => {
    if (!clientData?.id) return;

    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('clientId', '==', clientData.id),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const updatedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(updatedNotifications);
    });

    return () => unsubscribe();
  }, [clientData?.id]);

  // Sort notifications
  useEffect(() => {
    let sorted = [...notifications];
    
    switch (notificationSortBy) {
      case 'date':
        sorted.sort((a, b) => {
          const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
          const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
          return notificationSortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        });
        break;
      case 'type':
        sorted.sort((a, b) => 
          notificationSortOrder === 'asc' 
            ? a.type.localeCompare(b.type)
            : b.type.localeCompare(a.type)
        );
        break;
      case 'status':
        sorted.sort((a, b) => 
          notificationSortOrder === 'asc' 
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status)
        );
        break;
    }

    setNotifications(sorted);
  }, [notificationSortBy, notificationSortOrder]);

  // Add real-time listener for topups
  useEffect(() => {
    if (!clientData?.id) return;

    const topupsRef = collection(db, 'topups');
    const topupsQuery = query(
      topupsRef,
      where('clientId', '==', clientData.id),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(topupsQuery, (snapshot) => {
      const updatedTopups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Topup[];
      setTopups(updatedTopups);
    });

    return () => unsubscribe();
  }, [clientData?.id]);

  // Sort topups
  useEffect(() => {
    let sorted = [...topups];
    
    switch (topupSortBy) {
      case 'date':
        sorted.sort((a, b) => {
          const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
          const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
          return topupSortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        });
        break;
      case 'amount':
        sorted.sort((a, b) => 
          topupSortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount
        );
        break;
      case 'status':
        sorted.sort((a, b) => 
          topupSortOrder === 'asc' 
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status)
        );
        break;
    }

    setTopups(sorted);
  }, [topupSortBy, topupSortOrder]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredTransactions(transactions);
    } else {
      const filtered = transactions.filter(transaction =>
        transaction.vehicle.toLowerCase().includes(text.toLowerCase()) ||
        transaction.fuelType.toLowerCase().includes(text.toLowerCase()) ||
        formatTimestamp(transaction.timestamp)
          .toLowerCase()
          .includes(text.toLowerCase())
      );
      setFilteredTransactions(filtered);
    }
  };

  const generatePDF = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, create a simple HTML table and convert to PDF
        const html = `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
                h1 { color: #333; }
                h2 { color: #666; margin-top: 30px; }
                .section { margin-bottom: 30px; }
              </style>
            </head>
            <body>
              <h1>Client Report: ${clientData?.name}</h1>
              
              <div class="section">
                <h2>Client Information</h2>
                <table>
                  <tr><th>Name</th><td>${clientData?.name || 'N/A'}</td></tr>
                  <tr><th>Email</th><td>${clientData?.email || 'N/A'}</td></tr>
                  <tr><th>Phone</th><td>${clientData?.cellPhone || 'N/A'}</td></tr>
                  <tr><th>Current Balance</th><td>$${clientData?.balance?.toFixed(2) || '0.00'}</td></tr>
                  <tr><th>Status</th><td>${clientData?.status || 'N/A'}</td></tr>
                  <tr><th>Role</th><td>${clientData?.role || 'N/A'}</td></tr>
                  <tr><th>Account Created</th><td>${clientData?.createdAt ? formatTimestamp(clientData.createdAt) : 'N/A'}</td></tr>
                </table>
              </div>

              <div class="section">
                <h2>Transaction History</h2>
                <table>
                  <tr>
                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Fuel Type</th>
                    <th>Litres</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Balance After</th>
                  </tr>
                  ${transactions.map(transaction => `
                    <tr>
                      <td>${formatTimestamp(transaction.timestamp)}</td>
                      <td>${transaction.vehicle}</td>
                      <td>${transaction.fuelType}</td>
                      <td>${transaction.litres}</td>
                      <td>$${transaction.amount.toFixed(2)}</td>
                      <td>${transaction.status}</td>
                      <td>$${transaction.metadata.clientBalance.toFixed(2)}</td>
                    </tr>
                    ${transaction.comment ? `<tr><td colspan="7"><strong>Comment:</strong> ${transaction.comment}</td></tr>` : ''}
                  `).join('')}
                </table>
              </div>

              <div class="section">
                <h2>Topup History</h2>
                <table>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                  ${topups.map(topup => `
                    <tr>
                      <td>${formatTimestamp(topup.timestamp)}</td>
                      <td>$${topup.amount.toFixed(2)}</td>
                      <td>${topup.type}</td>
                      <td>${topup.status}</td>
                      <td>${topup.message}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>

              <div class="section">
                <h2>Notifications</h2>
                <table>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Message</th>
                    <th>Status</th>
                  </tr>
                  ${notifications.map(notification => `
                    <tr>
                      <td>${formatTimestamp(notification.timestamp)}</td>
                      <td>${notification.type}</td>
                      <td>${notification.message}</td>
                      <td>${notification.status}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            </body>
          </html>
        `;

        // Create a blob from the HTML
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Open in new window for printing
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = function() {
            printWindow.print();
          };
        }
        return;
      }

      // For mobile platforms, use expo-print (same HTML as web)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; }
              h1 { color: #333; text-align: center; }
              h2 { color: #666; margin-top: 30px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f2f2f2; }
              .section { margin-bottom: 30px; }
            </style>
          </head>
          <body>
            <h1>Client Report: ${clientData?.name || 'N/A'}</h1>
            
            <div class="section">
              <h2>Client Information</h2>
              <table>
                <tr><th>Name</th><td>${clientData?.name || 'N/A'}</td></tr>
                <tr><th>Email</th><td>${clientData?.email || 'N/A'}</td></tr>
                <tr><th>Phone</th><td>${clientData?.cellPhone || 'N/A'}</td></tr>
                <tr><th>Current Balance</th><td>$${clientData?.balance?.toFixed(2) || '0.00'}</td></tr>
                <tr><th>Status</th><td>${clientData?.status || 'N/A'}</td></tr>
                <tr><th>Role</th><td>${clientData?.role || 'N/A'}</td></tr>
                <tr><th>Account Created</th><td>${clientData?.createdAt ? formatTimestamp(clientData.createdAt) : 'N/A'}</td></tr>
              </table>
            </div>

            <div class="section">
              <h2>Transaction History</h2>
              <table>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Fuel Type</th>
                  <th>Litres</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Balance After</th>
                </tr>
                ${transactions.map(transaction => `
                  <tr>
                    <td>${formatTimestamp(transaction.timestamp)}</td>
                    <td>${transaction.vehicle}</td>
                    <td>${transaction.fuelType}</td>
                    <td>${transaction.litres}</td>
                    <td>$${transaction.amount.toFixed(2)}</td>
                    <td>${transaction.status}</td>
                    <td>$${transaction.metadata.clientBalance.toFixed(2)}</td>
                  </tr>
                  ${transaction.comment ? `<tr><td colspan="7"><strong>Comment:</strong> ${transaction.comment}</td></tr>` : ''}
                `).join('')}
              </table>
            </div>

            <div class="section">
              <h2>Topup History</h2>
              <table>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
                ${topups.map(topup => `
                  <tr>
                    <td>${formatTimestamp(topup.timestamp)}</td>
                    <td>$${topup.amount.toFixed(2)}</td>
                    <td>${topup.type}</td>
                    <td>${topup.status}</td>
                    <td>${topup.message}</td>
                  </tr>
                `).join('')}
              </table>
            </div>

            <div class="section">
              <h2>Notifications</h2>
              <table>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Status</th>
                </tr>
                ${notifications.map(notification => `
                  <tr>
                    <td>${formatTimestamp(notification.timestamp)}</td>
                    <td>${notification.type}</td>
                    <td>${notification.message}</td>
                    <td>${notification.status}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Client Report - ${clientData?.name}`,
        UTI: 'public.pdf',
      });

      Alert.alert('Success', 'PDF generated and shared successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    }
  };

  const handleTopup = async () => {
    if (!topupAmount || isNaN(Number(topupAmount)) || Number(topupAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!topupDescription) {
      Alert.alert('Error', 'Please enter a description for the topup');
      return;
    }

    try {
      setTopupLoading(true);
      const amount = Number(topupAmount);
      const currentBalance = clientData?.balance || 0;
      const newBalance = currentBalance + amount;

      if (!clientData) {
        Alert.alert('Error', 'No client data available');
        return;
      }

      // Create topup notification
      const topupNotification: Notification = {
        id: '',
        clientId: clientData.id,
        clientName: clientData.name,
        message: `Topup of $${amount.toFixed(2)} added to account - ${topupDescription}`,
        status: 'completed',
        timestamp: serverTimestamp(),
        type: 'topup'
      };

      // Add topup notification to Firestore
      const topupRef = await addDoc(collection(db, 'notifications'), topupNotification);

      // Update client balance
      await updateDoc(doc(db, 'clients', clientData.id), {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setClientData({
        ...clientData,
        balance: newBalance
      });
      setNotifications([{ ...topupNotification, id: topupRef.id }, ...notifications]);
      setTopupAmount('');
      setTopupDescription('');
      setIsTopupModalVisible(false);

      Alert.alert('Success', 'Topup added successfully');
    } catch (error) {
      console.error('Error adding topup:', error);
      Alert.alert('Error', 'Failed to add topup');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleSort = (field: 'date' | 'amount' | 'status' | 'type') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleNotificationSort = (field: 'date' | 'type' | 'status') => {
    if (notificationSortBy === field) {
      setNotificationSortOrder(notificationSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setNotificationSortBy(field);
      setNotificationSortOrder('desc');
    }
  };

  const handleTopupSort = (field: 'date' | 'amount' | 'status') => {
    if (topupSortBy === field) {
      setTopupSortOrder(topupSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setTopupSortBy(field);
      setTopupSortOrder('desc');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FFC107';
      case 'failed':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'topup':
        return 'add-circle';
      case 'transaction':
        return 'cash';
      case 'alert':
        return 'alert-circle';
      case 'system':
        return 'settings';
      default:
        return 'notifications';
    }
  };

  const getNotificationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FFC107';
      case 'failed':
        return '#F44336';
      case 'read':
        return '#2196F3';
      case 'unread':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const handleTransactionSubmit = async () => {
    if (!transactionForm.vehicle || !transactionForm.fuelType || !transactionForm.litres || !transactionForm.amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!clientData?.id || !clientData?.name || !clientData?.email) {
      Alert.alert('Error', 'Client information is incomplete');
      return;
    }

    try {
      setLoading(true);
      const transactionData: Omit<Transaction, 'id'> = {
        vehicle: transactionForm.vehicle,
        fuelType: transactionForm.fuelType,
        litres: parseFloat(transactionForm.litres),
        amount: parseFloat(transactionForm.amount),
        comment: transactionForm.comment || '',
        clientId: clientData.id,
        clientName: clientData.name,
        clientEmail: clientData.email,
        status: 'pending',
        timestamp: serverTimestamp(),
        metadata: {
          clientBalance: clientData.balance || 0,
          remainingFuel: 0,
          processedAt: null
        },
        attendantId: '',
        attendantName: '',
        pumpPrice: '0',
        updatedAt: serverTimestamp()
      };

      const transactionRef = await addDoc(collection(db, 'transactions'), transactionData);
      
      // Update local state with the new transaction including its ID
      const newTransaction: Transaction = {
        ...transactionData,
        id: transactionRef.id
      };
      setTransactions([newTransaction, ...transactions]);
      
      // Reset form
      setTransactionForm({
        vehicle: '',
        fuelType: '',
        litres: '',
        amount: '',
        comment: ''
      });
      
      Alert.alert('Success', 'Transaction created successfully');
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const generateTransactionPDF = async (transaction: Transaction) => {
    try {
      console.log('Starting PDF generation for transaction:', transaction.id);
      
      if (Platform.OS === 'web') {
        // For web, create a simple HTML table and convert to PDF
        const html = `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
              </style>
            </head>
            <body>
              <h1>Transaction Receipt</h1>
              <h2>Client Information</h2>
              <table>
                <tr><th>Name</th><td>${clientData?.name || 'N/A'}</td></tr>
                <tr><th>Email</th><td>${clientData?.email || 'N/A'}</td></tr>
                <tr><th>Phone</th><td>${clientData?.cellPhone || 'N/A'}</td></tr>
              </table>
              <h2>Transaction Details</h2>
              <table>
                <tr><th>Date</th><td>${formatTimestamp(transaction.timestamp)}</td></tr>
                <tr><th>Vehicle</th><td>${transaction.vehicle}</td></tr>
                <tr><th>Fuel Type</th><td>${transaction.fuelType}</td></tr>
                <tr><th>Litres</th><td>${transaction.litres}</td></tr>
                <tr><th>Amount</th><td>$${transaction.amount.toFixed(2)}</td></tr>
                <tr><th>Status</th><td>${transaction.status}</td></tr>
                <tr><th>Attendant</th><td>${transaction.attendantName}</td></tr>
                <tr><th>Balance After</th><td>$${transaction.metadata.clientBalance.toFixed(2)}</td></tr>
                ${transaction.comment ? `<tr><th>Comment</th><td>${transaction.comment}</td></tr>` : ''}
              </table>
            </body>
          </html>
        `;

        // Create a blob from the HTML
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Open in new window for printing
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = function() {
            printWindow.print();
          };
        }
        return;
      }

      // For mobile platforms, use expo-print
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; }
              h1 { color: #333; text-align: center; }
              h2 { color: #666; margin-top: 30px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Transaction Receipt</h1>
            
            <h2>Client Information</h2>
            <table>
              <tr><th>Name</th><td>${clientData?.name || 'N/A'}</td></tr>
              <tr><th>Email</th><td>${clientData?.email || 'N/A'}</td></tr>
              <tr><th>Phone</th><td>${clientData?.cellPhone || 'N/A'}</td></tr>
            </table>

            <h2>Transaction Details</h2>
            <table>
              <tr><th>Date</th><td>${formatTimestamp(transaction.timestamp)}</td></tr>
              <tr><th>Vehicle</th><td>${transaction.vehicle}</td></tr>
              <tr><th>Fuel Type</th><td>${transaction.fuelType}</td></tr>
              <tr><th>Litres</th><td>${transaction.litres}</td></tr>
              <tr><th>Amount</th><td>$${transaction.amount.toFixed(2)}</td></tr>
              <tr><th>Status</th><td>${transaction.status}</td></tr>
              <tr><th>Attendant</th><td>${transaction.attendantName}</td></tr>
              <tr><th>Balance After</th><td>$${transaction.metadata.clientBalance.toFixed(2)}</td></tr>
              ${transaction.comment ? `<tr><th>Comment</th><td>${transaction.comment}</td></tr>` : ''}
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Transaction Receipt - ${transaction.vehicle}`,
        UTI: 'public.pdf',
      });

      Alert.alert('Success', 'PDF generated and shared successfully');
    } catch (error) {
      console.error('Error generating transaction PDF:', error);
      Alert.alert('Error', 'Failed to generate transaction PDF');
    }
  };

  const generateAllTransactionsPDF = async () => {
    try {
      console.log('Starting PDF generation for all transactions');
      
      if (Platform.OS === 'web') {
        // For web, create a simple HTML table and convert to PDF
        const html = `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
                h1 { color: #333; }
                h2 { color: #666; margin-top: 30px; }
              </style>
            </head>
            <body>
              <h1>All Transactions Report - ${clientData?.name}</h1>
              
              <h2>Client Information</h2>
              <table>
                <tr><th>Name</th><td>${clientData?.name || 'N/A'}</td></tr>
                <tr><th>Email</th><td>${clientData?.email || 'N/A'}</td></tr>
                <tr><th>Phone</th><td>${clientData?.cellPhone || 'N/A'}</td></tr>
                <tr><th>Current Balance</th><td>$${clientData?.balance?.toFixed(2) || '0.00'}</td></tr>
              </table>

              <h2>Transaction History</h2>
              <table>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Fuel Type</th>
                  <th>Litres</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Balance After</th>
                </tr>
                ${transactions.map(transaction => `
                  <tr>
                    <td>${formatTimestamp(transaction.timestamp)}</td>
                    <td>${transaction.vehicle}</td>
                    <td>${transaction.fuelType}</td>
                    <td>${transaction.litres}</td>
                    <td>$${transaction.amount.toFixed(2)}</td>
                    <td>${transaction.status}</td>
                    <td>$${transaction.metadata.clientBalance.toFixed(2)}</td>
                  </tr>
                  ${transaction.comment ? `<tr><td colspan="7"><strong>Comment:</strong> ${transaction.comment}</td></tr>` : ''}
                `).join('')}
              </table>
            </body>
          </html>
        `;

        // Create a blob from the HTML
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Open in new window for printing
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = function() {
            printWindow.print();
          };
        }
        return;
      }

      // For mobile platforms, use expo-print (same HTML as web)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; }
              h1 { color: #333; text-align: center; }
              h2 { color: #666; margin-top: 30px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>All Transactions Report - ${clientData?.name || 'N/A'}</h1>
            
            <h2>Client Information</h2>
            <table>
              <tr><th>Name</th><td>${clientData?.name || 'N/A'}</td></tr>
              <tr><th>Email</th><td>${clientData?.email || 'N/A'}</td></tr>
              <tr><th>Phone</th><td>${clientData?.cellPhone || 'N/A'}</td></tr>
              <tr><th>Current Balance</th><td>$${clientData?.balance?.toFixed(2) || '0.00'}</td></tr>
            </table>

            <h2>Transaction History</h2>
            <table>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Fuel Type</th>
                <th>Litres</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Balance After</th>
              </tr>
              ${transactions.map(transaction => `
                <tr>
                  <td>${formatTimestamp(transaction.timestamp)}</td>
                  <td>${transaction.vehicle}</td>
                  <td>${transaction.fuelType}</td>
                  <td>${transaction.litres}</td>
                  <td>$${transaction.amount.toFixed(2)}</td>
                  <td>${transaction.status}</td>
                  <td>$${transaction.metadata.clientBalance.toFixed(2)}</td>
                </tr>
                ${transaction.comment ? `<tr><td colspan="7"><strong>Comment:</strong> ${transaction.comment}</td></tr>` : ''}
              `).join('')}
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `All Transactions Report - ${clientData?.name}`,
        UTI: 'public.pdf',
      });

      Alert.alert('Success', 'PDF generated and shared successfully');
    } catch (error) {
      console.error('Error generating all transactions PDF:', error);
      Alert.alert('Error', 'Failed to generate transactions PDF');
    }
  };

  const isTransaction = (activity: Activity): activity is Transaction => {
    return 'amount' in activity && 'vehicle' in activity;
  };

  const isTopup = (activity: Activity): activity is Topup => {
    return 'amount' in activity && 'type' in activity && activity.type === 'topup';
  };

  const isNotification = (activity: Activity): activity is Notification => {
    return 'message' in activity && 'type' in activity;
  };

  // Add a function to get unique activities
  const getUniqueActivities = React.useCallback((activities: Activity[]) => {
    const seen = new Set<string>();
    return activities.filter(activity => {
      const timestamp = activity.timestamp?.toDate?.()?.getTime() || 0;
      const key = `${activity.id || ''}-${timestamp}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, []);

  if (loading) {
    return (
      <SafeAreaLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading client data...</Text>
        </View>
      </SafeAreaLayout>
    );
  }

  if (!clientData) {
    return (
      <SafeAreaLayout>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No client data available</Text>
          <Button
            title="Try Again"
            onPress={() => {
              if (clientId) {
                fetchClientDetails(clientId);
              } else if (clientName) {
                searchClientByName(clientName);
              }
            }}
          />
        </View>
      </SafeAreaLayout>
    );
  }

  return (
    <SafeAreaLayout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{clientData.name}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.topupButton} 
              onPress={() => setIsTopupModalVisible(true)}
            >
              <Icon name="add-circle" size={24} color="#fff" />
              <Text style={styles.buttonText}>Topup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportButton} onPress={generatePDF}>
              <Icon name="download" size={24} color="#fff" />
              <Text style={styles.buttonText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{clientData.name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{clientData.email}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{clientData.cellPhone}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Balance</Text>
            <Text style={styles.infoValue}>${clientData.balance?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{clientData.status}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{clientData.role}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.exportButton} 
            onPress={generateAllTransactionsPDF}
          >
            <Icon name="download" size={24} color="#fff" />
            <Text style={styles.buttonText}>Export All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Icon
            name="search"
            size={20}
            color="#666"
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by vehicle or fuel type..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        <View style={styles.sortContainer}>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => handleSort('date')}
          >
            <Text style={styles.sortButtonText}>Date</Text>
            {sortBy === 'date' && (
              <Icon 
                name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                size={16} 
                color="#000" 
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => handleSort('amount')}
          >
            <Text style={styles.sortButtonText}>Amount</Text>
            {sortBy === 'amount' && (
              <Icon 
                name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                size={16} 
                color="#000" 
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => handleSort('status')}
          >
            <Text style={styles.sortButtonText}>Status</Text>
            {sortBy === 'status' && (
              <Icon 
                name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                size={16} 
                color="#000" 
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.headerCell}>Date</Text>
            <Text style={styles.headerCell}>Vehicle</Text>
            <Text style={styles.headerCell}>Fuel Type</Text>
            <Text style={styles.headerCell}>Litres</Text>
            <Text style={styles.headerCell}>Amount</Text>
            <Text style={styles.headerCell}>Status</Text>
          </View>
          
          {filteredTransactions
            .slice((page - 1) * transactionsPerPage, page * transactionsPerPage)
            .map((transaction) => (
              <TouchableOpacity 
                key={`transaction-${transaction.id || Date.now()}`} 
                style={styles.tableRow}
                onPress={() => setSelectedTransaction(transaction)}
              >
              <Text style={styles.cell}>
                  {formatTimestamp(transaction.timestamp)}
              </Text>
                <Text style={styles.cell}>{transaction.vehicle}</Text>
                <Text style={styles.cell}>{transaction.fuelType}</Text>
                <Text style={styles.cell}>{transaction.litres}</Text>
                <Text style={styles.cell}>${transaction.amount.toFixed(2)}</Text>
                <View style={styles.statusCell}>
                  <View 
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(transaction.status) }
                    ]} 
                  />
                  <Text style={styles.cell}>{transaction.status}</Text>
            </View>
              </TouchableOpacity>
          ))}
        </View>

        <View style={styles.pagination}>
          <TouchableOpacity 
            style={[styles.pageButton, page === 1 && styles.disabledButton]}
            onPress={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </TouchableOpacity>
          
          <Text style={styles.pageInfo}>
            Page {page} of {Math.ceil(filteredTransactions.length / transactionsPerPage)}
          </Text>
          
          <TouchableOpacity 
            style={[
              styles.pageButton,
              page >= Math.ceil(filteredTransactions.length / transactionsPerPage) && styles.disabledButton
            ]}
            onPress={() => setPage(page + 1)}
            disabled={page >= Math.ceil(filteredTransactions.length / transactionsPerPage)}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.sortContainer}>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => handleNotificationSort('date')}
          >
            <Text style={styles.sortButtonText}>Date</Text>
            {notificationSortBy === 'date' && (
              <Icon 
                name={notificationSortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                size={16} 
                color="#000" 
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => handleNotificationSort('type')}
          >
            <Text style={styles.sortButtonText}>Type</Text>
            {notificationSortBy === 'type' && (
              <Icon 
                name={notificationSortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                size={16} 
                color="#000" 
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => handleNotificationSort('status')}
          >
            <Text style={styles.sortButtonText}>Status</Text>
            {notificationSortBy === 'status' && (
              <Icon 
                name={notificationSortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                size={16} 
                color="#000" 
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.headerCell}>Date</Text>
            <Text style={styles.headerCell}>Type</Text>
            <Text style={styles.headerCell}>Message</Text>
            <Text style={styles.headerCell}>Status</Text>
          </View>
          
          {notifications
            .slice((notificationPage - 1) * notificationsPerPage, notificationPage * notificationsPerPage)
            .map((notification) => (
              <TouchableOpacity 
                key={`notification-${notification.id || Date.now()}`} 
                style={styles.tableRow}
                onPress={() => setSelectedNotification(notification)}
              >
                <Text style={styles.cell}>
                  {formatTimestamp(notification.timestamp)}
                </Text>
                <View style={styles.typeCell}>
                  <Icon 
                    name={getNotificationTypeIcon(notification.type)} 
                    size={20} 
                    color="#666" 
                  />
                  <Text style={styles.cell}>{notification.type}</Text>
                </View>
                <Text style={styles.cell} numberOfLines={1}>{notification.message}</Text>
                <View style={styles.statusCell}>
                  <View 
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: getNotificationStatusColor(notification.status) }
                    ]} 
                  />
                  <Text style={styles.cell}>{notification.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
        </View>

        <View style={styles.pagination}>
          <TouchableOpacity 
            style={[styles.pageButton, notificationPage === 1 && styles.disabledButton]}
            onPress={() => setNotificationPage(notificationPage - 1)}
            disabled={notificationPage === 1}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </TouchableOpacity>
          
          <Text style={styles.pageInfo}>
            Page {notificationPage} of {Math.ceil(notifications.length / notificationsPerPage)}
          </Text>
          
          <TouchableOpacity 
            style={[
              styles.pageButton,
              notificationPage >= Math.ceil(notifications.length / notificationsPerPage) && styles.disabledButton
            ]}
            onPress={() => setNotificationPage(notificationPage + 1)}
            disabled={notificationPage >= Math.ceil(notifications.length / notificationsPerPage)}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Topup History</Text>
        
        <View style={styles.sortContainer}>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => handleTopupSort('date')}
          >
            <Text style={styles.sortButtonText}>Date</Text>
            {topupSortBy === 'date' && (
              <Icon 
                name={topupSortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                size={16} 
                color="#000" 
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => handleTopupSort('amount')}
          >
            <Text style={styles.sortButtonText}>Amount</Text>
            {topupSortBy === 'amount' && (
              <Icon 
                name={topupSortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                size={16} 
                color="#000" 
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => handleTopupSort('status')}
          >
            <Text style={styles.sortButtonText}>Status</Text>
            {topupSortBy === 'status' && (
              <Icon 
                name={topupSortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                size={16} 
                color="#000" 
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.headerCell}>Date</Text>
            <Text style={styles.headerCell}>Amount</Text>
            <Text style={styles.headerCell}>Type</Text>
            <Text style={styles.headerCell}>Status</Text>
          </View>
          
          {topups
            .slice((topupPage - 1) * topupsPerPage, topupPage * topupsPerPage)
            .map((topup) => (
              <TouchableOpacity 
                key={`topup-${topup.id || Date.now()}`} 
                style={styles.tableRow}
                onPress={() => setSelectedTopup(topup)}
              >
              <Text style={styles.cell}>
                  {formatTimestamp(topup.timestamp)}
              </Text>
                <Text style={styles.cell}>${topup.amount.toFixed(2)}</Text>
                <Text style={styles.cell}>{topup.type}</Text>
                <View style={styles.statusCell}>
                  <View 
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(topup.status) }
                    ]} 
                  />
                  <Text style={styles.cell}>{topup.status}</Text>
            </View>
              </TouchableOpacity>
          ))}
        </View>

        <View style={styles.pagination}>
          <TouchableOpacity 
            style={[styles.pageButton, topupPage === 1 && styles.disabledButton]}
            onPress={() => setTopupPage(topupPage - 1)}
            disabled={topupPage === 1}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </TouchableOpacity>
          
          <Text style={styles.pageInfo}>
            Page {topupPage} of {Math.ceil(topups.length / topupsPerPage)}
          </Text>
          
          <TouchableOpacity 
            style={[
              styles.pageButton,
              topupPage >= Math.ceil(topups.length / topupsPerPage) && styles.disabledButton
            ]}
            onPress={() => setTopupPage(topupPage + 1)}
            disabled={topupPage >= Math.ceil(topups.length / topupsPerPage)}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
      </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity History</Text>
        <View style={styles.activityList}>
          {getUniqueActivities([...transactions, ...topups, ...notifications] as Activity[])
            .sort((a, b) => {
              const dateA = a.timestamp?.toDate?.() || new Date(0);
              const dateB = b.timestamp?.toDate?.() || new Date(0);
              return dateB.getTime() - dateA.getTime();
            })
            .map((activity) => {
              const activityType = isTransaction(activity) ? 'transaction' :
                                 isTopup(activity) ? 'topup' : 'notification';
              
              const key = generateUniqueKey(activityType, activity.id);

              return (
                <TouchableOpacity 
                  key={key}
                  style={styles.activityItem}
                  onPress={() => {
                    if (isTransaction(activity)) {
                      setSelectedTransaction(activity);
                      setShowTransactionDetails(true);
                    } else if (isTopup(activity)) {
                      setSelectedTopup(activity);
                      setShowTopupDetails(true);
                    } else {
                      setSelectedNotification(activity);
                      setShowNotificationDetails(true);
                    }
                  }}
                >
                  <Text style={styles.cell}>
                    {formatTimestamp(activity.timestamp)}
                  </Text>
                  <View style={styles.typeCell}>
                    <Icon 
                      name={
                        isTransaction(activity) ? 'car' :
                        isTopup(activity) ? 'add-circle' :
                        getNotificationTypeIcon(activity.type)
                      } 
                      size={20} 
                      color="#666" 
                    />
                    <Text style={styles.cell}>
                      {isTransaction(activity) ? 'Transaction' :
                       isTopup(activity) ? 'Topup' :
                       activity.type}
                    </Text>
                  </View>
                  <Text style={styles.cell} numberOfLines={1}>
                    {isTransaction(activity) ? `${activity.vehicle} - ${activity.fuelType}` :
                     isTopup(activity) ? `$${activity.amount.toFixed(2)}` :
                     activity.message}
                  </Text>
                  <View style={styles.statusCell}>
                    <View 
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: getStatusColor(activity.status) }
                      ]} 
                    />
                    <Text style={styles.cell}>{activity.status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>
      </View>

      <Modal
        isVisible={isTopupModalVisible}
        onBackdropPress={() => setIsTopupModalVisible(false)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        style={styles.modalView}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add Topup</Text>
          <Text style={styles.balanceText}>
            Current Balance: ${clientData?.balance?.toFixed(2) || '0.00'}
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Amount<Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={topupAmount}
              onChangeText={setTopupAmount}
              autoFocus
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description<Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.commentInput]}
              placeholder="Enter description for the topup"
              value={topupDescription}
              onChangeText={setTopupDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.submitButton, topupLoading && styles.disabledButton]}
              onPress={handleTopup}
              disabled={topupLoading}
            >
              {topupLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>Confirm Topup</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsTopupModalVisible(false)}
              disabled={topupLoading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        isVisible={!!selectedTransaction}
        onBackdropPress={() => setSelectedTransaction(null)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        style={styles.modalView}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Transaction Details</Text>
          
          {selectedTransaction && (
            <View style={styles.transactionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>
                  {formatTimestamp(selectedTransaction.timestamp)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vehicle:</Text>
                <Text style={styles.detailValue}>{selectedTransaction.vehicle}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fuel Type:</Text>
                <Text style={styles.detailValue}>{selectedTransaction.fuelType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Litres:</Text>
                <Text style={styles.detailValue}>{selectedTransaction.litres}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>${selectedTransaction.amount.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={styles.statusCell}>
                  <View 
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(selectedTransaction.status) }
                    ]} 
                  />
                  <Text style={styles.detailValue}>{selectedTransaction.status}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Attendant:</Text>
                <Text style={styles.detailValue}>{selectedTransaction.attendantName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Balance After:</Text>
                <Text style={styles.detailValue}>
                  ${selectedTransaction.metadata.clientBalance.toFixed(2)}
                </Text>
              </View>
              {selectedTransaction.comment && (
                <View style={styles.commentContainer}>
                  <Text style={styles.detailLabel}>Comment:</Text>
                  <Text style={styles.commentText}>{selectedTransaction.comment}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#2196F3' }]}
              onPress={() => selectedTransaction && generateTransactionPDF(selectedTransaction)}
            >
              <Icon name="download" size={20} color="#fff" />
              <Text style={styles.buttonText}>Export PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedTransaction(null)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        isVisible={!!selectedNotification}
        onBackdropPress={() => setSelectedNotification(null)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        style={styles.modalView}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Notification Details</Text>
          
          {selectedNotification && (
            <View style={styles.notificationDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>
                  {formatTimestamp(selectedNotification.timestamp)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <View style={styles.typeCell}>
                  <Icon 
                    name={getNotificationTypeIcon(selectedNotification.type)} 
                    size={20} 
                    color="#666" 
                  />
                  <Text style={styles.detailValue}>{selectedNotification.type}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={styles.statusCell}>
                  <View 
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: getNotificationStatusColor(selectedNotification.status) }
                    ]} 
                  />
                  <Text style={styles.detailValue}>{selectedNotification.status}</Text>
                </View>
              </View>
              <View style={styles.messageContainer}>
                <Text style={styles.detailLabel}>Message:</Text>
                <Text style={styles.messageText}>{selectedNotification.message}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedNotification(null)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        isVisible={!!selectedTopup}
        onBackdropPress={() => setSelectedTopup(null)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        style={styles.modalView}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Topup Details</Text>
          
          {selectedTopup && (
            <View style={styles.topupDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>
                  {formatTimestamp(selectedTopup.timestamp)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>${selectedTopup.amount.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{selectedTopup.type}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={styles.statusCell}>
                  <View 
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(selectedTopup.status) }
                    ]} 
                  />
                  <Text style={styles.detailValue}>{selectedTopup.status}</Text>
                </View>
              </View>
              <View style={styles.messageContainer}>
                <Text style={styles.detailLabel}>Message:</Text>
                <Text style={styles.messageText}>{selectedTopup.message}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedTopup(null)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        isVisible={isTransactionModalVisible}
        onBackdropPress={() => setIsTransactionModalVisible(false)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        style={styles.modalView}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Create New Transaction</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Vehicle<Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter vehicle details"
              value={transactionForm.vehicle}
              onChangeText={(text) => setTransactionForm({ ...transactionForm, vehicle: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Fuel Type<Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter fuel type"
              value={transactionForm.fuelType}
              onChangeText={(text) => setTransactionForm({ ...transactionForm, fuelType: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Litres<Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter litres"
              keyboardType="numeric"
              value={transactionForm.litres}
              onChangeText={(text) => setTransactionForm({ ...transactionForm, litres: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Amount<Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={transactionForm.amount}
              onChangeText={(text) => setTransactionForm({ ...transactionForm, amount: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Comment</Text>
            <TextInput
              style={[styles.input, styles.commentInput]}
              placeholder="Add a comment (optional)"
              value={transactionForm.comment}
              onChangeText={(text) => setTransactionForm({ ...transactionForm, comment: text })}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleTransactionSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>Create Transaction</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsTransactionModalVisible(false)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: Platform.OS === 'web' ? 24 : 16,
    ...(Platform.OS === 'web' ? {
      maxWidth: 1200,
      marginHorizontal: 'auto',
      width: '100%',
    } : {}),
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 32 : 20,
    ...(Platform.OS === 'web' ? {
      paddingHorizontal: 24,
    } : {}),
  } as ViewStyle,
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  } as TextStyle,
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  } as ViewStyle,
  topupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
  } as ViewStyle,
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A0DAD',
    padding: 10,
    borderRadius: 8,
  } as ViewStyle,
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: Platform.OS === 'web' ? 24 : 16,
    marginBottom: Platform.OS === 'web' ? 32 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    ...(Platform.OS === 'web' ? {
      maxWidth: '100%',
      marginHorizontal: 'auto',
    } : {}),
  } as ViewStyle,
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  } as TextStyle,
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Platform.OS === 'web' ? 24 : 16,
    ...(Platform.OS === 'web' ? {
      paddingHorizontal: 24,
      justifyContent: 'flex-start',
    } : {}),
  } as ViewStyle,
  infoItem: {
    ...(Platform.OS === 'web' ? {
      flex: '0 0 calc(33.333% - 16px)',
      minWidth: 200,
      maxWidth: 'calc(33.333% - 16px)',
    } : {
    flex: 1,
    minWidth: 150,
    }),
    backgroundColor: '#f8f9fa',
    padding: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 8,
  } as ViewStyle,
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  } as TextStyle,
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  } as TextStyle,
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  } as ViewStyle,
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  } as TextStyle,
  table: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: Platform.OS === 'web' ? 24 : 16,
  } as ViewStyle,
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: Platform.OS === 'web' ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  } as ViewStyle,
  headerCell: {
    flex: 1,
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: Platform.OS === 'web' ? 16 : 14,
  } as TextStyle,
  tableRow: {
    flexDirection: 'row',
    padding: Platform.OS === 'web' ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  } as ViewStyle,
  cell: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#2c3e50',
  } as TextStyle,
  modalView: {
    margin: 0,
    justifyContent: 'center',
    padding: Platform.OS === 'web' ? 40 : 20,
  } as ViewStyle,
  modalContainer: {
    backgroundColor: 'white',
    padding: Platform.OS === 'web' ? 32 : 20,
    borderRadius: 10,
    ...(Platform.OS === 'web' ? {
      maxHeight: '90vh',
      width: 600,
      marginHorizontal: 'auto',
    } : {
      maxHeight: '80%',
      width: '100%',
    }),
  } as ViewStyle,
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  } as TextStyle,
  balanceText: {
    fontSize: 16,
    marginBottom: 15,
    color: '#666',
  } as TextStyle,
  formGroup: {
    marginBottom: Platform.OS === 'web' ? 24 : 15,
  } as ViewStyle,
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  } as TextStyle,
  requiredStar: {
    color: 'red',
    marginLeft: 5,
  } as TextStyle,
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: Platform.OS === 'web' ? 12 : 10,
    borderRadius: 5,
    marginBottom: Platform.OS === 'web' ? 20 : 15,
    fontSize: Platform.OS === 'web' ? 16 : 14,
  } as TextStyle,
  submitButton: {
    backgroundColor: "#4CAF50",
    padding: Platform.OS === 'web' ? 16 : 15,
    borderRadius: 5,
    flex: 1,
  } as ViewStyle,
  disabledButton: {
    backgroundColor: "#9d9d9d",
  } as ViewStyle,
  cancelButton: {
    backgroundColor: "#ccc",
    padding: Platform.OS === 'web' ? 16 : 15,
    borderRadius: 5,
    flex: 1,
  } as ViewStyle,
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'web' ? 32 : 20,
    ...(Platform.OS === 'web' ? {
      gap: 16,
    } : {
      gap: 10,
    }),
  } as ViewStyle,
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0000ff',
  } as TextStyle,
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  } as ViewStyle,
  errorText: {
    marginBottom: 20,
    fontSize: 16,
    fontWeight: 'bold',
    color: 'red',
  } as TextStyle,
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: Platform.OS === 'web' ? 16 : 10,
    ...(Platform.OS === 'web' ? {
      paddingHorizontal: 24,
      gap: 16,
    } : {
      paddingHorizontal: 10,
      gap: 10,
    }),
  } as ViewStyle,
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 12 : 8,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    ...(Platform.OS === 'web' ? {
      minWidth: 120,
    } : {
      minWidth: 80,
    }),
  } as ViewStyle,
  sortButtonText: {
    marginRight: Platform.OS === 'web' ? 8 : 5,
    fontWeight: '600',
    fontSize: Platform.OS === 'web' ? 16 : 14,
  } as TextStyle,
  statusCell: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  } as ViewStyle,
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 24 : 10,
    ...(Platform.OS === 'web' ? {
      paddingHorizontal: 24,
    } : {
      paddingHorizontal: 10,
    }),
  } as ViewStyle,
  pageButton: {
    padding: Platform.OS === 'web' ? 12 : 8,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    ...(Platform.OS === 'web' ? {
      minWidth: 100,
    } : {
      minWidth: 80,
    }),
  } as ViewStyle,
  pageButtonText: {
    fontWeight: '600',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    textAlign: 'center',
  } as TextStyle,
  pageInfo: {
    fontWeight: '600',
    fontSize: Platform.OS === 'web' ? 16 : 14,
  } as TextStyle,
  transactionDetails: {
    marginVertical: 15,
  } as ViewStyle,
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  } as ViewStyle,
  detailLabel: {
    fontWeight: '600',
    color: '#666',
  } as TextStyle,
  detailValue: {
    color: '#333',
  } as TextStyle,
  closeButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15,
  } as ViewStyle,
  closeButtonText: {
    fontWeight: '600',
  } as TextStyle,
  typeCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  } as ViewStyle,
  messageContainer: {
    marginTop: 10,
  } as ViewStyle,
  messageText: {
    marginTop: 5,
    color: '#333',
    lineHeight: 20,
  } as TextStyle,
  notificationDetails: {
    marginVertical: 15,
  } as ViewStyle,
  topupDetails: {
    marginVertical: 15,
  } as ViewStyle,
  commentContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  } as ViewStyle,
  commentText: {
    marginTop: 5,
    color: '#333',
    lineHeight: 20,
  } as TextStyle,
  commentInput: {
    height: Platform.OS === 'web' ? 100 : 80,
    textAlignVertical: 'top',
  } as TextStyle,
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  } as TextStyle,
  activityList: {
    marginTop: 10,
  } as ViewStyle,
  activityItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  } as ViewStyle,
});

export default ClientDetails; 