import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  getDoc,
  where,
  setDoc,
  serverTimestamp,
  writeBatch,
  arrayUnion,
} from "firebase/firestore";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  updateEmail, 
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "firebase/auth";
import { db } from "../../../lib/firebaseConfig";
import Icon from "react-native-vector-icons/Ionicons"; // Import Ionicons for FAB
import { showMessage } from "react-native-flash-message";
import Modal from 'react-native-modal';
import { useRouter } from 'expo-router';

// Define the type for client data
type ClientData = {
  id?: string;
  uid?: string;
  address: string;
  amount: number;
  balance: number;
  cellPhone: string;
  contactPerson: number;
  email: string;
  fuelWithdrawn: number;
  invoiceNumbers: string[];
  litresDrawn: number;
  name: string;
  notifications: string;
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
  vatNumber: number;
  vehicle: string[];
};

// Separate type for client summary (for listing in FlatList)
type ClientSummary = {
  id: string;
  name: string;
  email: string;
  cellPhone: string;
  role: string;
  status: string;
};

// Add these new interfaces after your existing types
interface TopupData {
  amount: number;
  notes: string;
  timestamp: any;
  type: 'credit';
  previousBalance: number;
  newBalance: number;
  adminId: string;
  adminEmail: string;
}

interface TopupModalProps {
  client: ClientSummary & { balance?: number } | null;
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (clientId: string, amount: number) => Promise<void>;
}

// Add this new type for vehicle input
type VehicleInputProps = {
  vehicles: string[];
  onChange: (vehicles: string[]) => void;
};

// Add this new component for vehicle input
const VehicleInput: React.FC<VehicleInputProps> = ({ vehicles, onChange }) => {
  const [newVehicle, setNewVehicle] = useState('');

  const handleAddVehicle = () => {
    if (newVehicle.trim()) {
      onChange([...vehicles, newVehicle.trim()]);
      setNewVehicle('');
    }
  };

  const handleRemoveVehicle = (index: number) => {
    const updatedVehicles = vehicles.filter((_, i) => i !== index);
    onChange(updatedVehicles);
  };

  return (
    <View style={styles.vehicleContainer}>
      <View style={styles.vehicleInputContainer}>
        <TextInput
          style={styles.vehicleInput}
          placeholder="Enter vehicle registration"
          value={newVehicle}
          onChangeText={setNewVehicle}
        />
        <TouchableOpacity
          style={styles.addVehicleButton}
          onPress={handleAddVehicle}
        >
          <Icon name="add-circle-outline" size={24} color="#6A0DAD" />
        </TouchableOpacity>
      </View>
      <View style={styles.vehicleList}>
        {vehicles.map((vehicle, index) => (
          <View key={index} style={styles.vehicleItem}>
            <Text style={styles.vehicleText}>{vehicle}</Text>
            <TouchableOpacity
              style={styles.removeVehicleButton}
              onPress={() => handleRemoveVehicle(index)}
            >
              <Icon name="close-circle-outline" size={20} color="#dc3545" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

const ClientsScreen = () => {
  const router = useRouter();
  const [clients, setClients] = useState<ClientSummary[]>([]); // Updated to use ClientSummary type
  const [newClient, setNewClient] = useState<ClientData>({
    address: "",
    amount: 0,
    balance: 0,
    cellPhone: "",
    contactPerson: 0,
    email: "",
    fuelWithdrawn: 0,
    invoiceNumbers: [],
    litresDrawn: 0,
    name: "",
    notifications: "",
    openingBalance: 0,
    password: "",
    pumpPrice: 0,
    receiptNumber: 0,
    remainingFuel: 0,
    requests: [],
    role: "client", // Default role
    status: "active", // Default status
    threshold: 0,
    tinNumber: 0,
    totalFuelPurchased: 0,
    totalValue: 0,
    vatNumber: 0,
    vehicle: [],
  });

  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null); // To store the last document fetched
  const [loading, setLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false); // Separate state for "loading more"
  const [searchQuery, setSearchQuery] = useState<string>(""); // State for search query
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasMoreClients, setHasMoreClients] = useState<boolean>(true); // Track if there are more clients to load
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const auth = getAuth(); // Initialize Firebase Auth

  // Add this new state in ClientsScreen component
  const [isTopupModalVisible, setIsTopupModalVisible] = useState(false);
  const [selectedClientForTopup, setSelectedClientForTopup] = useState<ClientSummary & { balance?: number } | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);

  // Reset clients list when search query changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch();
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Generate document ID from client name
  const generateDocumentId = (name: string): string => {
    // Remove spaces and special characters, convert to lowercase
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Add a timestamp to ensure uniqueness
    const timestamp = Date.now();
    
    return `${cleanName}_${timestamp}`;
  };

  // Search for clients by name - more accurate implementation
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // If search query is empty, fetch all clients
      setClients([]);
      setLastVisible(null);
      setHasMoreClients(true);
      setLoading(true);
      
      try {
        const clientQuery = query(
          collection(db, "clients"),
          orderBy("name"),
          limit(20)
        );
        
        const querySnapshot = await getDocs(clientQuery);
        const uniqueClients = new Map();
        
        querySnapshot.docs.forEach((doc) => {
          const data = doc.data();
          uniqueClients.set(doc.id, {
            id: doc.id,
            name: data.name || "",
            email: data.email || "",
            cellPhone: data.cellPhone || "",
            role: data.role || "",
            status: data.status || "",
          });
        });
        
        const clientsList = Array.from(uniqueClients.values());
        setClients(clientsList);
        
        if (querySnapshot.docs.length > 0) {
          setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }
        
        setHasMoreClients(querySnapshot.docs.length === 20);
      } catch (error) {
        console.error("Error fetching clients:", error);
        Alert.alert("Error", "Failed to load clients. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }
    
    setIsSearching(true);
    setClients([]);
    
    try {
      const clientsRef = collection(db, "clients");
      const uniqueResults = new Map<string, ClientSummary>();
      
      // First try exact match
      const exactQuery = query(
        clientsRef,
        where("name", "==", searchQuery),
        limit(20)
      );
      
      const exactSnapshot = await getDocs(exactQuery);
      
      exactSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        uniqueResults.set(doc.id, {
          id: doc.id,
          name: data.name || "",
          email: data.email || "",
          cellPhone: data.cellPhone || "",
          role: data.role || "",
          status: data.status || "",
        });
      });

      // If no exact matches, try prefix search
      if (uniqueResults.size === 0) {
        const prefixQuery = query(
          clientsRef,
          orderBy("name"),
          where("name", ">=", searchQuery),
          where("name", "<=", searchQuery + "\uf8ff"),
          limit(20)
        );
        
        const prefixSnapshot = await getDocs(prefixQuery);
        
        prefixSnapshot.docs.forEach((doc) => {
          if (!uniqueResults.has(doc.id)) {
            const data = doc.data();
            uniqueResults.set(doc.id, {
              id: doc.id,
              name: data.name || "",
              email: data.email || "",
              cellPhone: data.cellPhone || "",
              role: data.role || "",
              status: data.status || "",
            });
          }
        });
      }
      
      // If still no results, try email search
      if (uniqueResults.size === 0) {
        const emailQuery = query(
          clientsRef,
          where("email", ">=", searchQuery),
          where("email", "<=", searchQuery + "\uf8ff"),
          limit(20)
        );
        
        const emailSnapshot = await getDocs(emailQuery);
        
        emailSnapshot.docs.forEach((doc) => {
          if (!uniqueResults.has(doc.id)) {
            const data = doc.data();
            uniqueResults.set(doc.id, {
              id: doc.id,
              name: data.name || "",
              email: data.email || "",
              cellPhone: data.cellPhone || "",
              role: data.role || "",
              status: data.status || "",
            });
          }
        });
      }
      
      setClients(Array.from(uniqueResults.values()));
    } catch (error) {
      console.error("Error searching clients:", error);
      Alert.alert("Error", "Failed to search clients. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch clients with pagination
  const fetchClients = async () => {
    if (loading || !hasMoreClients || searchQuery.trim()) return; // Don't fetch if searching
    setLoading(true);

    try {
      let clientQuery = query(
        collection(db, "clients"),
        orderBy("name"),
        limit(20)
      );

      if (lastVisible) {
        clientQuery = query(clientQuery, startAfter(lastVisible));
      }

      const querySnapshot = await getDocs(clientQuery);

      if (querySnapshot.empty) {
        setHasMoreClients(false);
        setLoading(false);
        return;
      }

      // Use Map to ensure uniqueness
      const uniqueClients = new Map(
        clients.map(client => [client.id, client])
      );
      
      // Add new clients to Map
      querySnapshot.docs.forEach((doc) => {
        if (!uniqueClients.has(doc.id)) {
          const data = doc.data();
          uniqueClients.set(doc.id, {
          id: doc.id,
          name: data.name || "",
          email: data.email || "",
          cellPhone: data.cellPhone || "",
          role: data.role || "",
          status: data.status || "",
          });
        }
      });

      // Convert Map back to array and update state
      const updatedClients = Array.from(uniqueClients.values());
      setClients(updatedClients);
      
      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
      
      setHasMoreClients(querySnapshot.docs.length === 20);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      Alert.alert("Error", "Failed to load clients. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Load more clients when reaching the end of the list
  const handleLoadMore = () => {
    if (!loading && !searchQuery && hasMoreClients) {
      setIsLoadingMore(true);
      fetchClients().finally(() => {
        setIsLoadingMore(false);
      });
    }
  };

  // Fetch full client data for editing
  const fetchClientData = async (id: string) => {
    try {
      const clientDocRef = doc(db, "clients", id);
      const clientDoc = await getDoc(clientDocRef);

      if (clientDoc.exists()) {
        const data = clientDoc.data() as ClientData;
        setSelectedClient({ ...data, id });
      } else {
        console.log("No such document!");
        Alert.alert("Error", "Client not found!");
      }
    } catch (error: any) {
      console.error("Error fetching client data:", error);
      Alert.alert("Error", "Failed to load client details. Please try again.");
    }
  };

  // Validate client data before saving
  const validateClientData = (client: ClientData): boolean => {
    if (!client.name.trim()) {
      Alert.alert("Validation Error", "Client name is required");
      return false;
    }
    
    if (!client.email.trim()) {
      Alert.alert("Validation Error", "Email is required");
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client.email)) {
      Alert.alert("Validation Error", "Please enter a valid email address");
      return false;
    }
    
    if (!client.cellPhone.trim()) {
      Alert.alert("Validation Error", "Phone number is required");
      return false;
    }
    
    if (!client.password.trim() && !selectedClient) {
      Alert.alert("Validation Error", "Password is required for new clients");
      return false;
    }
    
    return true;
  };

  // Update the addClient function
  const addClient = async () => {
    Keyboard.dismiss();
    
    if (!validateClientData(newClient)) {
      return;
    }

    const { name, email, password } = newClient;

    try {
      setLoading(true);
      
      // First create the authentication account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      
      // Generate a document ID based on name
      const docId = generateDocumentId(name);
      
      // Prepare client data
      const newClientData = {
        ...newClient,
        uid: userId, // Add the auth UID to the client data
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Create the document with custom ID
      try {
        await setDoc(doc(db, "clients", docId), newClientData);
      } catch (docError) {
        console.error("Error creating document with custom ID:", docError);
        // If that fails, fall back to auto-generated ID
        await addDoc(collection(db, "clients"), newClientData);
      }
      
      // Add the new client to the list without refetching
      const newClientSummary: ClientSummary = {
        id: docId,
        name: newClient.name,
        email: newClient.email,
        cellPhone: newClient.cellPhone,
        role: newClient.role,
        status: newClient.status,
      };
      
      setClients(prevClients => [newClientSummary, ...prevClients]);
      
      Alert.alert("Success", "Client added successfully!");

      // Reset form
      setNewClient({
        address: "",
        amount: 0,
        balance: 0,
        cellPhone: "",
        contactPerson: 0,
        email: "",
        fuelWithdrawn: 0,
        invoiceNumbers: [],
        litresDrawn: 0,
        name: "",
        notifications: "",
        openingBalance: 0,
        password: "",
        pumpPrice: 0,
        receiptNumber: 0,
        remainingFuel: 0,
        requests: [],
        role: "client",
        status: "active",
        threshold: 0,
        tinNumber: 0,
        totalFuelPurchased: 0,
        totalValue: 0,
        vatNumber: 0,
        vehicle: [],
      });

      setIsModalVisible(false);
      
      // Refresh the client list
      setClients([]);
      setLastVisible(null);
      setHasMoreClients(true);
      fetchClients();
      
    } catch (error: any) {
      console.error("Error adding client:", error);
      let errorMessage = "Failed to add client.";
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Perform the actual delete operation
  const performDelete = async (id: string) => {
    try {
      setLoading(true);
      
      // Reference to the document to delete
      const clientDocRef = doc(db, "clients", id);
      
      // Check if document exists before attempting to delete
      const docSnap = await getDoc(clientDocRef);
      
      if (!docSnap.exists()) {
        Alert.alert("Error", "Client document not found. It may have been already deleted.");
        return;
      }
      
      // Delete the document from Firestore
      await deleteDoc(clientDocRef);
      
      // Update the client list by removing the deleted client
      setClients(prevClients => prevClients.filter(client => client.id !== id));
      
      Alert.alert("Success", "Client deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting client:", error);
      Alert.alert("Error", `Failed to delete client: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Show delete confirmation dialog
  const showDeleteConfirmation = (id: string) => {
    // Find the client name for the confirmation message
    const clientToDelete = clients.find(client => client.id === id);
    const clientName = clientToDelete ? clientToDelete.name : "this client";
    
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete ${clientName}? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Show loading indicator
            setLoading(true);
            performDelete(id);
          }
        }
      ]
    );
  };

  // Update a client in Firestore
  const updateClient = async () => {
    Keyboard.dismiss();
    
    if (!selectedClient?.id) {
      Alert.alert("Error", "No client selected for update.");
      return;
    }
    
    if (!validateClientData(selectedClient)) {
      return;
    }

    try {
      setLoading(true);
      
      // Get the current client document to compare changes
      const clientDocRef = doc(db, "clients", selectedClient.id);
      const currentDoc = await getDoc(clientDocRef);
      
      if (!currentDoc.exists()) {
        throw new Error("Client document not found");
      }
      
      const currentData = currentDoc.data() as ClientData;
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("Authentication required");
      }

      // If email or password changed, we need to re-authenticate
      if (selectedClient.email !== currentData.email || selectedClient.password) {
        // Prompt for current password
        const currentPassword = await new Promise<string>((resolve) => {
          Alert.prompt(
            "Re-authentication Required",
            "Please enter your current password to update authentication details",
            [
              {
                text: "Cancel",
                onPress: () => resolve(""),
                style: "cancel",
              },
              {
                text: "OK",
                onPress: (password: string | undefined) => resolve(password || ""),
              },
            ],
            "secure-text"
          );
        });

        if (!currentPassword) {
          throw new Error("Re-authentication cancelled");
        }

        // Create credentials and re-authenticate
        const credential = EmailAuthProvider.credential(user.email || "", currentPassword);
        await reauthenticateWithCredential(user, credential);

        // Now we can update email and password
        if (selectedClient.email !== currentData.email) {
          await updateEmail(user, selectedClient.email);
        }
        
        if (selectedClient.password) {
          await updatePassword(user, selectedClient.password);
        }
      }
      
      // Remove id and password fields before updating Firestore
      const { id, password, ...clientDataToUpdate } = selectedClient;
      
      await updateDoc(clientDocRef, {
        ...clientDataToUpdate,
        updatedAt: serverTimestamp(),
      });

      // Update the client in the list without refetching
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === id 
            ? { 
                ...client, 
                name: selectedClient.name,
                email: selectedClient.email,
                cellPhone: selectedClient.cellPhone,
                role: selectedClient.role,
                status: selectedClient.status
              } 
            : client
        )
      );

      Alert.alert("Success", "Client updated successfully!");
      setIsModalVisible(false);
    } catch (error: any) {
      console.error("Error updating client:", error);
      let errorMessage = "Failed to update client.";
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Please enter your current password to update authentication details.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes for client data
  const handleInputChange = (key: keyof ClientData, value: any) => {
    if (selectedClient) {
      setSelectedClient(prevState => {
        if (!prevState) return null;
        
        // Handle different data types appropriately
        let processedValue = value;
        
        // Convert numeric fields from string to number
        if ([
          'amount', 'balance', 'contactPerson', 'fuelWithdrawn', 
          'litresDrawn', 'openingBalance', 'pumpPrice', 'receiptNumber',
          'remainingFuel', 'threshold', 'tinNumber', 'totalFuelPurchased',
          'totalValue', 'vatNumber'
        ].includes(key)) {
          processedValue = value === '' ? 0 : Number(value);
        }
        
        return { ...prevState, [key]: processedValue };
      });
    } else {
      setNewClient(prevState => {
        // Handle different data types appropriately
        let processedValue = value;
        
        // Convert numeric fields from string to number
        if ([
          'amount', 'balance', 'contactPerson', 'fuelWithdrawn', 
          'litresDrawn', 'openingBalance', 'pumpPrice', 'receiptNumber',
          'remainingFuel', 'threshold', 'tinNumber', 'totalFuelPurchased',
          'totalValue', 'vatNumber'
        ].includes(key)) {
          processedValue = value === '' ? 0 : Number(value);
        }
        
        return { ...prevState, [key]: processedValue };
      });
    }
  };

  const handleViewDetails = (client: ClientSummary) => {
    router.push({
      pathname: '/admin/clients/client-details',
      params: {
      clientId: client.id,
      clientName: client.name
      }
    });
  };

  const handleEdit = (client: ClientSummary) => {
    fetchClientData(client.id);
    setIsModalVisible(true);
  };

  const renderClientItem = ({ item }: { item: ClientSummary }) => {
    return (
      <View style={styles.clientItem}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.name}</Text>
          <Text style={styles.clientDetails}>
            {item.email} • {item.cellPhone}
          </Text>
          <Text style={styles.clientDetails}>
            Role: {item.role} • Status: {item.status}
          </Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#6A0DAD' }]}
            onPress={() => handleViewDetails(item)}
          >
            <Icon name="document-text" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => handleEdit(item)}
          >
            <Icon name="create" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#f44336' }]}
            onPress={() => showDeleteConfirmation(item.id)}
          >
            <Icon name="trash" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render the footer with loading indicator
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#6A0DAD" />
        <Text style={styles.loaderText}>Loading more clients...</Text>
      </View>
    );
  };

  // Update the renderInputField function to handle vehicles specially
  const renderInputField = (key: string, value: any) => {
    // Skip rendering password field in edit mode
    if (selectedClient && key === 'password') {
      return null;
    }
    
    // Skip ID field
    if (key === 'id') {
      return null;
    }
    
    // Special handling for vehicle array
    if (key === 'vehicle') {
      return (
        <View key={key} style={styles.formGroup}>
          <Text style={styles.label}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
            <Text style={styles.requiredStar}>*</Text>
          </Text>
          <VehicleInput
            vehicles={Array.isArray(value) ? value : []}
            onChange={(vehicles) => handleInputChange(key as keyof ClientData, vehicles)}
          />
        </View>
      );
    }
    
    // Determine if field is an array
    const isArray = Array.isArray(value) && key !== 'vehicle';
    
    return (
      <View key={key} style={styles.formGroup}>
        <Text style={styles.label}>
          {key.replace(/([A-Z])/g, " $1").charAt(0).toUpperCase() + key.replace(/([A-Z])/g, " $1").slice(1)}
          {['name', 'email', 'cellPhone'].includes(key) && <Text style={styles.requiredStar}>*</Text>}
        </Text>
        
        {isArray ? (
          <Text style={styles.arrayNotice}>Array field - edit not supported in this view</Text>
        ) : (
          <TextInput
            style={styles.input}
            placeholder={`Enter ${key.replace(/([A-Z])/g, " $1")}`}
            value={value?.toString() ?? ""}
            onChangeText={(text) => handleInputChange(key as keyof ClientData, text)}
            keyboardType={
              [
                'amount', 'balance', 'contactPerson', 'fuelWithdrawn', 
                'litresDrawn', 'openingBalance', 'pumpPrice', 'receiptNumber',
                'remainingFuel', 'threshold', 'tinNumber', 'totalFuelPurchased',
                'totalValue', 'vatNumber'
              ].includes(key) 
                ? 'numeric' 
                : 'default'
            }
            secureTextEntry={key === 'password'}
          />
        )}
      </View>
    );
  };

  // Update the handleTopupSubmit function to match your working permissions pattern
  const handleTopupSubmit = async (clientId: string, amount: number) => {
    try {
      setLoading(true);
      const auth = getAuth();
      const adminUser = auth.currentUser;
      
      if (!adminUser) {
        throw new Error('Authentication required');
      }

      // Get client reference and data
      const clientRef = doc(db, 'clients', clientId);
      const clientDoc = await getDoc(clientRef);

      if (!clientDoc.exists()) {
        throw new Error('Client not found');
      }

      const currentBalance = clientDoc.data().balance || 0;
      const newBalance = currentBalance + amount;

      // Update client document directly - similar to how edit works
      await updateDoc(clientRef, {
        balance: newBalance,
        updatedAt: serverTimestamp(),
        lastTopup: {
          amount: amount,
          timestamp: serverTimestamp(),
          adminId: adminUser.uid,
          adminEmail: adminUser.email
        }
      });

      // Update local state
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId 
            ? { ...client, balance: newBalance }
            : client
        )
      );

      showMessage({
        message: "Success",
        description: `Successfully added $${amount.toFixed(2)} topup`,
        type: "success",
        duration: 3000,
      });

      setIsTopupModalVisible(false);
      setSelectedClientForTopup(null);

    } catch (error: any) {
      console.error('Error processing topup:', error);
      showMessage({
        message: "Error",
        description: error.message || "Failed to process topup",
        type: "danger",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Update the Modal to not use native driver on web
  const TopupModal: React.FC<TopupModalProps> = ({ client, isVisible, onClose, onSubmit }) => {
    const [amount, setAmount] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
      if (!client) {
        showMessage({
          message: "Error",
          description: "Client information not found",
          type: "danger"
        });
        return;
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        showMessage({
          message: "Error",
          description: "Please enter a valid amount greater than 0",
          type: "danger"
        });
        return;
      }

      setLoading(true);
      try {
        await onSubmit(client.id, numAmount);
        setAmount('');
        onClose();
      } catch (error) {
        console.error('Error in topup:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Modal
        isVisible={isVisible}
        onBackdropPress={onClose}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        useNativeDriver={Platform.OS !== 'web'} // Only use native driver on mobile
        hideModalContentWhileAnimating={Platform.OS !== 'web'}
        style={styles.modalView}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add Topup for {client?.name}</Text>
          <Text style={styles.balanceText}>
            Current Balance: ${client?.balance?.toFixed(2) || '0.00'}
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Amount<Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>Confirm Topup</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Update the add new client button press handler
  const handleAddNewClient = () => {
    setNewClient({
      address: "",
      amount: 0,
      balance: 0,
      cellPhone: "",
      contactPerson: 0,
      email: "",
      fuelWithdrawn: 0,
      invoiceNumbers: [],
      litresDrawn: 0,
      name: "",
      notifications: "",
      openingBalance: 0,
      password: "",
      pumpPrice: 0,
      receiptNumber: 0,
      remainingFuel: 0,
      requests: [],
      role: "client",
      status: "active",
      threshold: 0,
      tinNumber: 0,
      totalFuelPurchased: 0,
      totalValue: 0,
      vatNumber: 0,
      vehicle: [],
    });
    setSelectedClient(null);
    setIsModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients Management</Text>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#6c757d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddNewClient}
        >
          <Icon name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Client</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6A0DAD" />
            </View>
          ) : clients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No clients found</Text>
            </View>
          ) : (
            <FlatList
              data={clients}
              renderItem={renderClientItem}
              keyExtractor={(item) => item.id}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
            />
          )}
        </View>
      </View>

      {/* Modal for Adding/Editing Clients */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setIsModalVisible(false)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        useNativeDriver
        hideModalContentWhileAnimating
        style={styles.modalView}
      >
        <View style={styles.modalContainer}>
          <ScrollView>
            <Text style={styles.modalTitle}>
              {selectedClient ? "Edit Client" : "Add New Client"}
            </Text>

            {/* Render input fields */}
            {selectedClient
              ? Object.entries(selectedClient).map(([key, value]) => renderInputField(key, value))
              : Object.entries(newClient).map(([key, value]) => renderInputField(key, value))}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.disabledButton]}
                onPress={selectedClient ? updateClient : addClient}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    {selectedClient ? "Update Client" : "Add Client"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <TopupModal
        client={selectedClientForTopup}
        isVisible={isTopupModalVisible}
        onClose={() => {
          setIsTopupModalVisible(false);
          setSelectedClientForTopup(null);
        }}
        onSubmit={handleTopupSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexWrap: 'wrap',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    minWidth: 200,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 45,
    flex: 1,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#6A0DAD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  clientDetails: {
    fontSize: 14,
    color: '#6c757d',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    maxHeight: '80%',
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#6A0DAD',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  requiredStar: {
    color: 'red',
    marginLeft: 5,
  },
  arrayNotice: {
    fontStyle: 'italic',
    color: '#666',
  },
  submitButton: {
    backgroundColor: "#6A0DAD",
    padding: 15,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
  },
  disabledButton: {
    backgroundColor: "#9d9d9d",
  },
  cancelButton: {
    backgroundColor: "#ccc",
    padding: 15,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  modalView: {
    margin: 0,
    justifyContent: 'center',
    padding: 20,
  },
  balanceText: {
    fontSize: 16,
    marginBottom: 15,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  footerLoader: {
    marginVertical: 20,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6A0DAD',
  },
  vehicleContainer: {
    marginBottom: 15,
  },
  vehicleInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  vehicleInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  addVehicleButton: {
    padding: 5,
  },
  vehicleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  vehicleText: {
    marginRight: 8,
    fontSize: 14,
  },
  removeVehicleButton: {
    padding: 2,
  },
});

export default ClientsScreen;