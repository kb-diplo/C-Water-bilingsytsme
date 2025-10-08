# 🔌 Water Billing System - API Documentation

## 📋 Base Information
- **Base URL**: `https://c-water-bilingsytsme.onrender.com/api`
- **Authentication**: JWT Bearer Token
- **Content-Type**: `application/json`
- **API Version**: v1.0

## 🔐 Authentication Endpoints

### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "username": "admin",
  "role": "Admin",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "dashboardData": {}
}
```

### POST /auth/register
Register new user (Admin/MeterReader only).

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "Client|MeterReader|Admin"
}
```

### POST /auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### GET /auth/admin-dashboard
Get admin dashboard statistics.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "totalCustomers": 150,
  "totalBills": 1200,
  "totalRevenue": 450000.00,
  "pendingPayments": 25000.00,
  "recentActivities": []
}
```

## 👥 Client Management Endpoints

### GET /clients
Get all clients with pagination and search.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 10)
- `search` (optional): Search term

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "254712345678",
      "meterNumber": "MTR001",
      "location": "Nairobi",
      "connectionStatus": "Connected",
      "isActive": true,
      "createdDate": "2024-01-15T10:30:00Z"
    }
  ],
  "totalCount": 150,
  "page": 1,
  "pageSize": 10
}
```

### POST /clients
Create new client.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "254712345678",
  "meterNumber": "MTR001",
  "location": "Nairobi"
}
```

### PUT /clients/{id}
Update existing client.

**Headers:** `Authorization: Bearer {token}`

### DELETE /clients/{id}
Soft delete client (sets IsActive = false).

**Headers:** `Authorization: Bearer {token}`

## 📊 Meter Reading Endpoints

### GET /readings
Get all meter readings with filtering.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `clientId` (optional): Filter by client
- `billingPeriod` (optional): Filter by period (YYYY-MM)
- `search` (optional): Search term

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "clientId": 1,
      "clientName": "John Doe",
      "meterNumber": "MTR001",
      "currentReading": 1250.5,
      "previousReading": 1200.0,
      "unitsUsed": 50.5,
      "readingDate": "2024-01-15T10:30:00Z",
      "billingPeriod": "2024-01",
      "recordedBy": "meterreader1",
      "generatedBillId": 123,
      "generatedBillNumber": "BILL-2024-001",
      "billAmount": 2525.00
    }
  ]
}
```

### POST /readings
Add new meter reading.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "clientId": 1,
  "currentReading": 1250.5,
  "notes": "Normal reading"
}
```

**Validation Rules:**
- Only one reading per client per month
- Current reading must be greater than previous reading
- Automatic bill generation for non-zero usage

## 💰 Billing Endpoints

### GET /bills
Get all bills with filtering and pagination.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `clientId` (optional): Filter by client
- `status` (optional): Filter by status (Paid/Unpaid)
- `billingPeriod` (optional): Filter by period

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "billNumber": "BILL-2024-001",
      "clientId": 1,
      "clientName": "John Doe",
      "billingPeriod": "2024-01",
      "unitsUsed": 50.5,
      "ratePerUnit": 50.00,
      "amount": 2525.00,
      "penaltyAmount": 0.00,
      "totalAmount": 2525.00,
      "balance": 2525.00,
      "dueDate": "2024-02-15T00:00:00Z",
      "status": "Unpaid",
      "billDate": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### GET /bills/{id}
Get specific bill details.

### POST /bills/{id}/remind
Send bill reminder email (Admin/MeterReader only).

**Headers:** `Authorization: Bearer {token}`

## 💳 Payment Endpoints

### GET /payments
Get all payments with filtering.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "billId": 1,
      "amount": 2525.00,
      "paymentMethod": "Cash",
      "referenceNumber": "PAY-001",
      "paymentDate": "2024-01-20T14:30:00Z",
      "recordedBy": "admin"
    }
  ]
}
```

### POST /payments
Record new payment.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "billId": 1,
  "amount": 2525.00,
  "paymentMethod": "Cash|Bank|Mobile|Card",
  "referenceNumber": "PAY-001",
  "notes": "Payment received"
}
```

### POST /payments/mpesa/stkpush
Initiate M-Pesa STK Push payment.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "phoneNumber": "254712345678",
  "amount": 2525.00,
  "billId": 1
}
```

### GET /payments/{id}/receipt
Download payment receipt (PDF).

### GET /payments/bill/{billId}/receipt
Download bill receipt (PDF).

## 📈 Reports Endpoints

### GET /reports/financial
Get financial reports with date filtering.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `groupBy`: Group by period (daily/monthly/yearly)

**Response:**
```json
{
  "totalRevenue": 125000.00,
  "totalPayments": 100000.00,
  "outstandingAmount": 25000.00,
  "periodData": [
    {
      "period": "2024-01",
      "revenue": 50000.00,
      "payments": 45000.00,
      "outstanding": 5000.00
    }
  ]
}
```

### GET /reports/usage
Get water usage analytics.

### GET /reports/clients
Get client analytics and statistics.

## 👤 User Management Endpoints

### GET /auth/users
Get all users (Admin only).

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "Admin",
      "isActive": true,
      "isBootstrap": true,
      "createdDate": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### DELETE /auth/users/{id}
Delete user (Admin only).

## ⚙️ Settings Endpoints

### GET /settings
Get system settings.

### PUT /settings
Update system settings (Admin only).

**Request Body:**
```json
{
  "ratePerUnit": 50.00,
  "penaltyRate": 0.05,
  "gracePeriodDays": 30,
  "companyName": "Denkam Waters",
  "companyEmail": "info@denkamwaters.com"
}
```

## 🔍 Error Responses

### Standard Error Format
```json
{
  "error": "Error message",
  "details": "Detailed error information",
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/clients"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## 🔐 Authentication Flow

1. **Login**: POST `/auth/login` with credentials
2. **Receive Token**: Get JWT token in response
3. **Use Token**: Include in `Authorization: Bearer {token}` header
4. **Token Expiry**: Tokens expire after 30 minutes
5. **Refresh**: Re-login when token expires

## 📝 Rate Limiting

- **Requests per minute**: 100 per IP address
- **Authentication attempts**: 5 per IP per hour
- **File uploads**: 10MB maximum size

## 🔄 Pagination

Most list endpoints support pagination:
- `page`: Page number (starts from 1)
- `pageSize`: Items per page (default: 10, max: 100)
- `totalCount`: Total items available
- `hasNext`: Boolean indicating if more pages exist

## 🎯 Best Practices

1. **Always include Authorization header** for protected endpoints
2. **Handle token expiry** gracefully in your application
3. **Use appropriate HTTP methods** (GET, POST, PUT, DELETE)
4. **Validate input data** before sending requests
5. **Handle errors** appropriately based on status codes
6. **Use pagination** for large data sets
7. **Cache responses** where appropriate to improve performance

---

For additional support or questions about the API, please contact the development team.
