// Create a new file for shared types
export interface Transaction {
  id: string;
  amount: number;
  litres: number;
  fuelType: 'diesel' | 'blend';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  vehicle: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
    toDate: () => Date;
  };
  attendantName?: string;
  pumpPrice: number;
  clientEmail: string;
  clientId: string;
  notes?: string;
}

export default function TransactionTypeRoute() {
  return null;
}