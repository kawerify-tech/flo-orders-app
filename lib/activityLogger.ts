import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// Activity types
export type ActivityType = 
  | "create" 
  | "update" 
  | "delete" 
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
  | "other";

// Interface for activity data
interface ActivityData {
  type: ActivityType;
  clientId: string;
  clientName: string;
  message: string;
  details?: string;
  performedBy?: string;
  amount?: number;
  oldValue?: string;
  newValue?: string;
  documentUrl?: string;
  vehicleInfo?: string;
  rating?: number;
}

/**
 * Log a client activity to Firestore
 * 
 * @param activityData The activity data to log
 * @returns Promise that resolves when the activity is logged
 */
export const logClientActivity = async (activityData: ActivityData): Promise<string | null> => {
  try {
    // Add timestamp to the activity data
    const activityWithTimestamp = {
      ...activityData,
      timestamp: serverTimestamp(),
    };

    // Add the activity to Firestore
    const docRef = await addDoc(
      collection(db, "clientActivities"), 
      activityWithTimestamp
    );
    
    console.log("Activity logged with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error logging activity:", error);
    return null;
  }
};

/**
 * Log client creation activity
 */
export const logClientCreation = (
  clientId: string, 
  clientName: string, 
  performedBy?: string
) => {
  return logClientActivity({
    type: "create",
    clientId,
    clientName,
    message: "was added as a new client",
    details: "A new client account was created",
    performedBy,
  });
};

/**
 * Log client update activity
 */
export const logClientUpdate = (
  clientId: string, 
  clientName: string, 
  changedFields: string[],
  performedBy?: string
) => {
  const fieldsText = changedFields.join(", ");
  return logClientActivity({
    type: "update",
    clientId,
    clientName,
    message: `had information updated`,
    details: `Updated fields: ${fieldsText}`,
    performedBy,
  });
};

/**
 * Log client deletion activity
 */
export const logClientDeletion = (
  clientId: string, 
  clientName: string, 
  performedBy?: string
) => {
  return logClientActivity({
    type: "delete",
    clientId,
    clientName,
    message: "was deleted from the system",
    performedBy,
  });
};

/**
 * Log client transaction activity
 */
export const logClientTransaction = (
  clientId: string, 
  clientName: string, 
  transactionType: string,
  amount: number,
  details?: string,
  performedBy?: string
) => {
  return logClientActivity({
    type: "transaction",
    clientId,
    clientName,
    message: `made a ${transactionType}`,
    details: details || `Transaction amount: $${amount.toFixed(2)}`,
    amount,
    performedBy,
  });
};

/**
 * Log client login activity
 */
export const logClientLogin = (
  clientId: string, 
  clientName: string
) => {
  return logClientActivity({
    type: "login",
    clientId,
    clientName,
    message: "logged into their account",
  });
};

/**
 * Log client logout activity
 */
export const logClientLogout = (
  clientId: string, 
  clientName: string
) => {
  return logClientActivity({
    type: "logout",
    clientId,
    clientName,
    message: "logged out of their account",
  });
};

/**
 * Log client payment activity
 */
export const logClientPayment = (
  clientId: string, 
  clientName: string,
  amount: number,
  paymentMethod: string,
  performedBy?: string
) => {
  return logClientActivity({
    type: "payment",
    clientId,
    clientName,
    message: `made a payment`,
    details: `Payment of $${amount.toFixed(2)} via ${paymentMethod}`,
    amount,
    performedBy,
  });
};

/**
 * Log fuel purchase activity
 */
export const logFuelPurchase = (
  clientId: string, 
  clientName: string,
  liters: number,
  amount: number,
  vehicleInfo?: string,
  performedBy?: string
) => {
  return logClientActivity({
    type: "fuel_purchase",
    clientId,
    clientName,
    message: `purchased fuel`,
    details: `Purchased ${liters.toFixed(2)} liters for $${amount.toFixed(2)}`,
    amount,
    vehicleInfo,
    performedBy,
  });
};

/**
 * Log client status change
 */
export const logStatusChange = (
  clientId: string, 
  clientName: string,
  oldStatus: string,
  newStatus: string,
  performedBy?: string
) => {
  return logClientActivity({
    type: "status_change",
    clientId,
    clientName,
    message: `had status changed`,
    details: `Status changed from ${oldStatus} to ${newStatus}`,
    oldValue: oldStatus,
    newValue: newStatus,
    performedBy,
  });
};

/**
 * Log password reset
 */
export const logPasswordReset = (
  clientId: string, 
  clientName: string,
  performedBy?: string
) => {
  return logClientActivity({
    type: "password_reset",
    clientId,
    clientName,
    message: `had password reset`,
    details: `Password was reset${performedBy ? " by administrator" : ""}`,
    performedBy,
  });
};

/**
 * Log document upload
 */
export const logDocumentUpload = (
  clientId: string, 
  clientName: string,
  documentType: string,
  documentUrl: string,
  performedBy?: string
) => {
  return logClientActivity({
    type: "document_upload",
    clientId,
    clientName,
    message: `uploaded a document`,
    details: `Uploaded a ${documentType} document`,
    documentUrl,
    performedBy,
  });
};

/**
 * Log balance update
 */
export const logBalanceUpdate = (
  clientId: string, 
  clientName: string,
  oldBalance: number,
  newBalance: number,
  reason: string,
  performedBy?: string
) => {
  return logClientActivity({
    type: "balance_update",
    clientId,
    clientName,
    message: `had balance updated`,
    details: `Balance updated from $${oldBalance.toFixed(2)} to $${newBalance.toFixed(2)} due to ${reason}`,
    oldValue: `$${oldBalance.toFixed(2)}`,
    newValue: `$${newBalance.toFixed(2)}`,
    amount: newBalance - oldBalance,
    performedBy,
  });
};

/**
 * Log threshold update
 */
export const logThresholdUpdate = (
  clientId: string, 
  clientName: string,
  oldThreshold: number,
  newThreshold: number,
  performedBy?: string
) => {
  return logClientActivity({
    type: "threshold_update",
    clientId,
    clientName,
    message: `had fuel threshold updated`,
    details: `Fuel threshold updated from ${oldThreshold.toFixed(2)} liters to ${newThreshold.toFixed(2)} liters`,
    oldValue: `${oldThreshold.toFixed(2)} liters`,
    newValue: `${newThreshold.toFixed(2)} liters`,
    performedBy,
  });
};

/**
 * Log vehicle added
 */
export const logVehicleAdded = (
  clientId: string, 
  clientName: string,
  vehicleInfo: string,
  performedBy?: string
) => {
  return logClientActivity({
    type: "vehicle_added",
    clientId,
    clientName,
    message: `added a vehicle`,
    details: `Added vehicle: ${vehicleInfo}`,
    vehicleInfo,
    performedBy,
  });
};

/**
 * Log vehicle removed
 */
export const logVehicleRemoved = (
  clientId: string, 
  clientName: string,
  vehicleInfo: string,
  performedBy?: string
) => {
  return logClientActivity({
    type: "vehicle_removed",
    clientId,
    clientName,
    message: `removed a vehicle`,
    details: `Removed vehicle: ${vehicleInfo}`,
    vehicleInfo,
    performedBy,
  });
};

/**
 * Log client feedback
 */
export const logClientFeedback = (
  clientId: string,
  clientName: string,
  rating: number,
  comment: string
) => {
  const starRating = "★".repeat(rating) + "☆".repeat(5 - rating);
  
  return logClientActivity({
    type: "feedback",
    clientId,
    clientName,
    message: `submitted feedback`,
    details: `Rating: ${starRating} (${rating}/5)\nComment: ${comment}`,
    rating,
  });
}; 