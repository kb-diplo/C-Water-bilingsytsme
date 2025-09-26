# Water Billing System API

A comprehensive RESTful API for managing water billing operations, including client management, meter readings, billing, and payments. Built with ASP.NET Core and SQL Server.

## Features

- **User Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin, MeterReader, Client)
  - Secure password hashing

- **Core Functionality**
  - Client management
  - Meter reading tracking
  - Bill generation
  - Payment processing
  - System settings management

## Getting Started

### Prerequisites

- .NET 7.0 SDK or later
- SQL Server (LocalDB or full version)
- Visual Studio 2022 or VS Code with C# extensions

### Installation

1. Clone the repository:
   ```bash
   git clone [your-repository-url]
   cd MyApi
   ```

2. Update the connection string in `appsettings.json`:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=.;Database=BillingSystem;Trusted_Connection=True;TrustServerCertificate=True;"
   }
   ```

3. Apply database migrations:
   ```bash
   dotnet ef database update
   ```

4. Run the application:
   ```bash
   dotnet run
   ```

## API Documentation

Once the application is running, access the Swagger UI at:
```
https://localhost:7283/swagger
```

### Testing with Swagger
1. Navigate to the Swagger UI
2. Use the `/api/auth/login` endpoint with your credentials
3. Copy the returned JWT token
4. Click "Authorize" button and enter: `Bearer YOUR_TOKEN_HERE`
5. Test other endpoints with authentication

## Authentication & Testing

### Bootstrap Admin Account
A default admin account is automatically created on first startup if no admin exists:
- **Username**: admin
- **Password**: Admin123

**Note**: This bootstrap admin is removed when you create your first permanent admin user.

### Testing Authentication
Use the provided PowerShell script to test authentication endpoints:
```powershell
.\test-auth-endpoints.ps1
```

### Common Login Issues
- **Case Sensitivity**: Usernames are now case-insensitive
- **Password Requirements**: Ensure passwords meet security requirements
- **Database Initialization**: Run `dotnet run` to auto-create the bootstrap admin
- **JWT Configuration**: Verify JWT settings in `appsettings.json`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login (case-insensitive username)
- `POST /api/auth/register` - Register new users (Admin or MeterReader only)
- `GET /api/auth/users` - Get all users (Admin/MeterReader only)
- `DELETE /api/auth/users/{username}` - Delete user (Admin only)

**Login Request Example:**
```json
{
  "username": "admin",
  "password": "Admin123"
}
```

**Register Request Example:**
```json
{
  "username": "newuser",
  "password": "SecurePass123!",
  "role": "MeterReader"
}
```

### Clients
- `GET /api/Clients` - Search clients (Admin/MeterReader only)
  - Query parameters: `name`, `meterNumber`, `location`
- `POST /api/Clients` - Create new client (Admin/MeterReader only)
- `GET /api/Clients/{id}` - Get client by ID
- `PUT /api/Clients/{id}` - Update client

### Bills
- `GET /api/Bills` - Get all bills (Admin only)
- `GET /api/Bills/client/{clientId}` - Get client's bills (Admin or specific client)
- `GET /api/Bills/client/{clientId}/current` - Get client's current unpaid bills

### Meter Readings
- `POST /api/Readings` - Record new meter reading (MeterReader only)

### Payments
- `GET /api/Payments` - Get all payments (Admin only)
- `POST /api/Payments` - Record payment (Admin or Client for own bills)

### Dashboard
- `GET /api/Dashboard` - Get dashboard data based on user role

### Reports (Admin only)
- `GET /api/Reports/financial` - Get financial reports
  - Query parameters: `fromDate`, `toDate`
- `GET /api/Reports/clients` - Get client metrics report

### Settings (Admin only)
- `GET /api/Settings` - Get system settings
- `PUT /api/Settings` - Update system settings

## Security

- JWT authentication with Bearer token
- Role-based authorization
- Password hashing using ASP.NET Core Identity
- Secure API endpoints with `[Authorize]` attributes

## Environment Variables

- `JWT:Key` - Secret key for JWT tokens
- `JWT:Issuer` - Token issuer
- `JWT:Audience` - Token audience
- `JWT:ExpireMinutes` - Token expiration time

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@example.com
