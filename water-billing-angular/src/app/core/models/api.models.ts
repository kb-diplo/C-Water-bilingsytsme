// API Models and DTOs based on C# backend analysis

// Authentication DTOs
export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  role: string; // Admin, MeterReader, Client
}

export interface UserResponse {
  message: string;
  username: string;
  email?: string;
  role: string;
  token?: string;
  dashboardData?: any;
}

export interface UserDto {
  id: number;
  username: string;
  role: string;
  isBootstrap: boolean;
  isActive: boolean;
}

// Client DTOs
export interface ClientDto {
  id: number;
  username?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  contactNumber?: string; // For backward compatibility
  meterNumber: string;
  location: string;
  address?: string; // For backward compatibility
  connectionStatus: string;
  status?: string; // For backward compatibility
  isActive: boolean; // Added for client status tracking
  hasFullDetails: boolean;
  createdByUserId: number;
  createdDate: Date;
}

export interface ClientUpdateDto {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  meterNumber?: string;
  location?: string;
  connectionStatus?: string;
}

// Bill DTOs
export interface BillResponseDto {
  id: number;
  clientId: number;
  clientName: string;
  billNumber: string;
  unitsUsed: number;
  ratePerUnit: number;
  amount: number;
  penaltyAmount: number;
  totalAmount: number;
  billDate: Date;
  dueDate: Date;
  status: string;
  amountPaid: number;
  balance: number;
}

// Payment DTOs
export interface PaymentCreateDto {
  billId: number;
  amount: number;
  paymentMethod: string;
  reference?: string;
}

export interface PaymentResponseDto {
  id: number;
  billId: number;
  billNumber: string;
  clientName: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  paymentDate: Date;
  recordedByUsername: string;
}

// Meter Reading DTOs
export interface MeterReadingCreateDto {
  clientId: number;
  currentReading: number;
}

export interface MeterReadingResponseDto {
  id: number;
  clientId: number;
  clientName: string;
  meterNumber: string;
  currentReading: number;
  previousReading: number;
  unitsUsed: number;
  readingDate: Date;
  status: string;
  recordedByUsername: string;
}

// Report DTOs
export interface FinancialReportDto {
  period: DateRangeDto;
  totalBilled: number;
  totalCollected: number;
  collectionRate: number;
  outstanding: number;
  totalBills: number;
  paidBills: number;
  overdueBills: number;
}

export interface CustomerReportDto {
  totalCustomers: number;
  activeConnections: number;
  disconnectedConnections: number;
  pendingConnections: number;
  customers: CustomerSummaryDto[];
}

export interface CustomerSummaryDto {
  id: number;
  name: string;
  meterNumber: string;
  connectionStatus: string;
  totalBills: number;
  totalOwed: number;
  lastReadingDate?: Date;
  lastPaymentDate?: Date;
}

export interface DateRangeDto {
  fromDate?: Date;
  toDate?: Date;
}

// Settings DTOs
export interface SystemSettingsDto {
  ratePerUnit: number;
  penaltyRate: number;
  gracePeriodDays: number;
}

export interface SystemSettingsResponseDto extends SystemSettingsDto {
  id?: number;
  lastUpdated: Date;
  updatedByUsername: string;
}

// Dashboard DTOs
export interface AdminDashboardStats {
  totalCustomers: number;
  totalBills: number;
  totalRevenue: number;
  unpaidBills: number;
}

export interface MeterReaderDashboardStats {
  totalReadings: number;
  todayReadings: number;
  totalCustomers: number;
  readingsThisMonth: number;
  pendingReadings: number;
  averageConsumption: number;
}

export interface ClientDashboardStats {
  currentBills: number;
  totalOwed: number;
  lastPayment?: Date;
  unpaidBills: number;
  totalPaidThisYear: number;
  paymentCount: number;
  averageMonthlyBill: number;
  paymentHistory: any[]; // Array of payment records
}

// API Response wrapper
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  success: boolean;
  errors?: string[];
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
