import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
} from "react-native";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  Timestamp,
  where,
  CollectionReference,
  DocumentData,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import Icon from "react-native-vector-icons/Ionicons";
import { format, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";
import FlashMessage, { showMessage } from 'react-native-flash-message';
import { commonStyles } from '../../constants/theme';
import { SafeAreaLayout } from '../../components/SafeAreaLayout';

// Define the type for activity data
type ActivityData = {
  id: string;
  type: 
    | "create_client"
    | "update_client"
    | "delete_client"
    | "transaction" 
    | "login" 
    | "logout"
    | "payment"
    | "fuel_purchase"
    | "status_change"
    | "password_reset"
    | "document_upload"
    | "balance_update"
    | "threshold_update"
    | "vehicle_added"
    | "vehicle_removed"
    | "feedback"
    | "price_update"
    | "attendant_action"
    | "system_update"
    | "other";
  source: "client" | "attendant" | "system";
  clientId?: string;
  clientName?: string;
  attendantId?: string;
  attendantName?: string;
  message: string;
  details?: string;
  timestamp: Timestamp;
  performedBy?: string;
  amount?: number;
  oldValue?: string;
  newValue?: string;
  documentUrl?: string;
  vehicleInfo?: string;
  rating?: number;
  location?: string;
  pumpNumber?: string;
  fuelType?: string;
  quantity?: number;
};

interface FeedbackRequest {
  clientId: string;
  clientName: string;
  message: string;
  timestamp: Timestamp;
  status: 'pending' | 'responded' | 'expired';
  response?: {
    rating: number;
    comment: string;
    timestamp: Timestamp;
  };
}

const ClientActivities = ({ clientId }: { clientId: string }) => {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMoreActivities, setHasMoreActivities] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Update filter types to include all activities
  const filterTypes = [
    { label: "All", value: null },
    { label: "Create Client", value: "create_client" },
    { label: "Update Client", value: "update_client" },
    { label: "Transaction", value: "transaction" },
    { label: "Login", value: "login" },
  ];

  // Update fetchActivities to get data from multiple collections
  const fetchActivities = async (refresh = false) => {
    if ((loading && !refresh) || (!hasMoreActivities && !refresh)) return;
    
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Create queries for different collections
      const queries = [
        // Query main activities collection
        query(
          collection(db, 'activities'),
          orderBy('timestamp', 'desc'),
          limit(50)
        ),
        // Query transactions collection
        query(
          collection(db, 'transactions'),
          orderBy('timestamp', 'desc'),
          limit(50)
        ),
        // Query notifications collection
        query(
          collection(db, 'notifications'),
          orderBy('timestamp', 'desc'),
          limit(50)
        )
      ];

      // Get snapshots from all queries
      const snapshots = await Promise.all(queries.map(q => getDocs(q)));
      
      // Combine and process all documents
      let allActivities: ActivityData[] = [];
      
      snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          
          // Convert to ActivityData format
          const activity: ActivityData = {
            id: doc.id,
            type: data.type || 'other',
            source: data.source || 'system',
            message: data.message || data.description || 'Activity recorded',
            timestamp: data.timestamp,
            clientId: data.clientId,
                clientName: data.clientName,
            attendantId: data.attendantId,
            attendantName: data.attendantName,
            details: data.details,
            performedBy: data.performedBy || data.adminEmail,
                amount: data.amount,
            oldValue: data.oldValue,
            newValue: data.newValue,
            documentUrl: data.documentUrl,
            vehicleInfo: data.vehicleInfo,
            rating: data.rating,
                location: data.location,
            pumpNumber: data.pumpNumber,
                fuelType: data.fuelType,
            quantity: data.quantity
          };

          allActivities.push(activity);
        });
      });

      // Sort combined activities by timestamp
      allActivities.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });

      // Update state
      if (refresh) {
        setActivities(allActivities);
      } else {
        setActivities(prev => {
          // Combine with existing activities, remove duplicates
          const combined = [...prev, ...allActivities];
          const unique = Array.from(
            new Map(combined.map(item => [item.id, item])).values()
          );
          // Sort again after combining
          return unique.sort((a, b) => {
            const timeA = a.timestamp?.toMillis() || 0;
            const timeB = b.timestamp?.toMillis() || 0;
            return timeB - timeA;
          });
        });
      }

      // Set hasMore flag based on whether we got the maximum number of items
      setHasMoreActivities(allActivities.length >= 50);
      
    } catch (error) {
      console.error("Error fetching activities:", error);
      showMessage({
        message: "Error",
        description: "Failed to load activities. Please try again.",
        type: "danger",
      });
    } finally {
      setLoading(false);
        setRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, [clientId]);

  // Handle refresh
  const handleRefresh = () => {
    setLastVisible(null);
    setHasMoreActivities(true);
    fetchActivities(true);
  };

  // Load more activities
  const handleLoadMore = () => {
    if (!loading && hasMoreActivities) {
      setIsLoadingMore(true);
      fetchActivities().finally(() => {
        setIsLoadingMore(false);
      });
    }
  };

  // Format timestamp to relative time (e.g., "2 hours ago")
  const formatTimestamp = (timestamp: Timestamp) => {
    if (!timestamp) return "Unknown time";
    
    const date = timestamp.toDate();
    const now = new Date();
    
    // Calculate time differences using basic date-fns functions
    const secondsDiff = differenceInSeconds(now, date);
    const minutesDiff = differenceInMinutes(now, date);
    const hoursDiff = differenceInHours(now, date);
    const daysDiff = differenceInDays(now, date);
    
    // Format relative time manually
    if (secondsDiff < 60) {
      return `${secondsDiff} seconds ago`;
    } else if (minutesDiff < 60) {
      return `${minutesDiff} ${minutesDiff === 1 ? 'minute' : 'minutes'} ago`;
    } else if (hoursDiff < 24) {
      return `${hoursDiff} ${hoursDiff === 1 ? 'hour' : 'hours'} ago`;
    } else if (daysDiff < 7) {
      return `${daysDiff} ${daysDiff === 1 ? 'day' : 'days'} ago`;
    } else {
      // For older dates, just show the formatted date
      return format(date, 'MMM d, yyyy');
    }
  };

  // Format timestamp to full date and time for details
  const formatFullTimestamp = (timestamp: Timestamp) => {
    if (!timestamp) return "Unknown time";
    
    const date = timestamp.toDate();
    return format(date, "MMM d, yyyy 'at' h:mm a"); // e.g., "Apr 29, 2023 at 3:45 PM"
  };

  // Update the getActivityIcon function to include new types
  const getActivityIcon = (type: string, source: string) => {
    const iconColor = 
      source === "client" ? "#4CAF50" : 
      source === "attendant" ? "#2196F3" : "#FF9800";

    switch (type) {
      case "create_client":
        return <Icon name="person-add" size={24} color={iconColor} />;
      case "price_update":
        return <Icon name="pricetag" size={24} color={iconColor} />;
      case "attendant_action":
        return <Icon name="people" size={24} color={iconColor} />;
      case "system_update":
        return <Icon name="settings" size={24} color={iconColor} />;
      case "update_client":
        return <Icon name="create" size={24} color="#2196F3" />;
      case "delete_client":
        return <Icon name="trash" size={24} color="#F44336" />;
      case "login":
        return <Icon name="log-in" size={24} color="#9C27B0" />;
      case "logout":
        return <Icon name="log-out" size={24} color="#795548" />;
      case "payment":
        return <Icon name="cash" size={24} color="#4CAF50" />;
      case "fuel_purchase":
        return <Icon name="car" size={24} color="#FF5722" />;
      case "status_change":
        return <Icon name="sync" size={24} color="#3F51B5" />;
      case "password_reset":
        return <Icon name="key" size={24} color="#607D8B" />;
      case "document_upload":
        return <Icon name="document" size={24} color="#009688" />;
      case "balance_update":
        return <Icon name="wallet" size={24} color="#E91E63" />;
      case "threshold_update":
        return <Icon name="options" size={24} color="#673AB7" />;
      case "vehicle_added":
        return <Icon name="car-sport" size={24} color="#2196F3" />;
      case "vehicle_removed":
        return <Icon name="car" size={24} color="#F44336" />;
      case "feedback":
        return <Icon name="star" size={24} color="#FFC107" />;
      default:
        return <Icon name="notifications" size={24} color="#607D8B" />;
    }
  };

  // Get filter buttons for activity types
  const renderFilterButtons = () => {
    return (
      <View style={styles.filterContainer}>
        {filterTypes.map((filter) => (
          <TouchableOpacity
            key={filter.label}
            style={[
              styles.filterButton,
              filterType === filter.value && styles.filterButtonActive
            ]}
            onPress={() => setFilterType(filter.value)}
          >
            <Text 
              style={[
                styles.filterText,
                filterType === filter.value && styles.filterTextActive
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Update the activity item render to show more details
  const renderActivityItem = ({ item }: { item: ActivityData }) => {
    // Get the appropriate icon and color based on the activity type
    const getActivityStyle = () => {
      switch (item.type) {
        case 'transaction':
          return {
            icon: 'cash',
            color: '#4CAF50',
            bgColor: '#E8F5E9'
          };
        case 'balance_update':
          return {
            icon: 'wallet',
            color: '#2196F3',
            bgColor: '#E3F2FD'
          };
        // Add more cases for different activity types
        default:
          return {
            icon: 'notifications',
            color: '#607D8B',
            bgColor: '#ECEFF1'
          };
      }
    };

    const style = getActivityStyle();

    return (
    <TouchableOpacity style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <View style={[styles.iconContainer, { backgroundColor: style.bgColor }]}>
            <Icon name={style.icon} size={24} color={style.color} />
          </View>
        
          <View style={styles.activityContent}>
          <View style={styles.activityTitleRow}>
            <Text style={styles.sourceTag}>
              {item.type.toUpperCase().replace('_', ' ')}
            </Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(item.timestamp)}
              </Text>
          </View>

          <Text style={styles.activityMessage}>
            {item.clientName && (
              <Text style={styles.actorName}>{item.clientName}</Text>
            )}
            {" "}{item.message}
          </Text>

          {item.details && (
            <Text style={styles.details}>{item.details}</Text>
          )}

          {item.amount && (
            <View style={styles.detailRow}>
              <Icon name="cash" size={16} color="#4CAF50" />
              <Text style={styles.detailText}>
                Amount: ${item.amount.toFixed(2)}
              </Text>
            </View>
            )}
            
            {item.performedBy && (
              <Text style={styles.performedBy}>
                By: {item.performedBy}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render footer with loading indicator
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#6A0DAD" />
        <Text style={styles.loaderText}>Loading more activities...</Text>
      </View>
    );
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "client":
        return "#E8F5E9";
      case "attendant":
        return "#E3F2FD";
      case "system":
        return "#FFF3E0";
      default:
        return "#F5F5F5";
    }
  };

  // Add this after your state declarations
  useEffect(() => {
    console.log("Activities state updated:", activities.length);
  }, [activities]);

  return (
    <SafeAreaLayout>
      <View style={styles.container}>
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={renderActivityItem}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Activity History</Text>
              {renderFilterButtons()}
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#6A0DAD"]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="alert-circle" size={48} color="#666" />
              <Text style={styles.emptyText}>
                {loading ? "Loading activities..." : 
                 refreshing ? "Refreshing activities..." :
                 "No activities found. Pull down to refresh."}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={handleRefresh}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          }
        />
        <FlashMessage position="top" />
      </View>
    </SafeAreaLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    paddingBottom: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  filterButtonActive: {
    backgroundColor: '#6A0DAD',
    borderColor: '#6A0DAD',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f2f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  clientName: {
    fontWeight: "bold",
    color: "#6A0DAD",
  },
  timestamp: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
  },
  details: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  oldValue: {
    color: "#F44336",
    textDecorationLine: "line-through",
  },
  newValue: {
    color: "#4CAF50",
    fontWeight: "500",
  },
  amount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
    marginTop: 4,
  },
  performedBy: {
    fontSize: 12,
    color: "#888",
    marginTop: 8,
    fontStyle: "italic",
  },
  footerLoader: {
    marginVertical: 20,
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6A0DAD",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
  },
  ratingStars: {
    flexDirection: 'row',
    marginTop: 4,
  },
  sourceTag: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6A0DAD',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  actorName: {
    fontWeight: 'bold',
    color: '#6A0DAD',
  },
  retryButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#6A0DAD',
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  activityTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
});

export default ClientActivities; 