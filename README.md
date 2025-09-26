# 💧 Water Billing System

A comprehensive water billing management system built with **Angular 17** frontend and **ASP.NET Core 8** backend, featuring role-based access control and modern UI/UX design.

## 🌟 Features

### 🔐 Authentication & Authorization
- JWT-based authentication with 30-minute token expiry
- Role-based access control (Admin, MeterReader, Client)
- Secure password hashing with ASP.NET Core Identity
- Professional login interface with form validation

### 👥 User Management
- **Admin**: Full system access, user management, financial reports
- **MeterReader**: Customer management, meter readings, operational data
- **Client**: Personal billing, payment history, usage tracking

### 💼 Core Functionality
- **Customer Management**: CRUD operations with search and filtering
- **Billing System**: Automated bill generation and status tracking
- **Payment Processing**: Payment recording and history management
- **Meter Readings**: Reading entry and consumption analytics
- **Reports & Analytics**: Financial reports with data visualization
- **System Settings**: Configurable billing rates and system parameters

### 🎨 Modern UI/UX
- Responsive design for desktop, tablet, and mobile
- Professional teal branding (#00bcd4)
- Interactive charts and data visualization
- Clean, corporate aesthetic with Angular Material components

## 🏗️ Architecture

- **Backend**: ASP.NET Core 8 Web API
- **Frontend**: Angular 17 with standalone components
- **Database**: SQL Server with Entity Framework Core
- **Authentication**: JWT tokens with role-based policies
- **API Documentation**: Swagger/OpenAPI integration

## 🚀 Quick Start

### Prerequisites
- .NET 8.0 SDK
- Node.js 18+ and npm
- SQL Server (LocalDB or full instance)
- Visual Studio 2022 or VS Code

### 1. Clone Repository
```bash
git clone https://github.com/kb-diplo/C-Water-bilingsytsme.git
cd C-Water-bilingsytsme
```

### 2. Backend Setup
```bash
cd Backend

# Copy configuration template
cp appsettings.example.json appsettings.json

# Update appsettings.json with your values:
# - JWT Key (32+ characters)
# - Admin password
# - Email settings (Gmail App Password)
# - SQL Server connection string

# Setup database
dotnet ef database update

# Run backend
dotnet run
```
**Backend URL**: `https://localhost:44372`

### 3. Frontend Setup
```bash
cd water-billing-angular

# Install dependencies
npm install

# Run frontend
ng serve
```
**Frontend URL**: `http://localhost:4200`

## 🔑 Default Admin Account
- **Username**: admin
- **Password**: (as configured in appsettings.json)

## 📊 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Create users (Admin/MeterReader only)
- `POST /login` - User authentication with JWT
- `GET /users` - List users (Admin/MeterReader)
- `DELETE /users/{username}` - Delete user (Admin only)

### Clients (`/api/clients`)
- `GET /` - All clients (Admin/MeterReader)
- `GET /{id}` - Client details (role-based access)
- `PUT /{id}` - Update client (Admin/MeterReader)

### Bills (`/api/bills`)
- `GET /` - All bills with pagination (Admin)
- `GET /client/{clientId}` - Client bills (role-based)
- `GET /client/{clientId}/unpaid` - Unpaid bills

### Payments (`/api/payments`)
- `POST /` - Record payment
- `GET /` - All payments (Admin)

### Reports (`/api/reports`)
- `GET /financial` - Financial reports (Admin)

### Readings (`/api/readings`)
- `POST /` - Add meter reading (MeterReader)
- `GET /` - All readings (Admin)

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Authorization**: Granular access control
- **Password Security**: BCrypt hashing with salt
- **CORS Protection**: Configured for secure cross-origin requests
- **Input Validation**: Comprehensive data validation
- **SQL Injection Prevention**: Entity Framework parameterized queries

## 🎯 Development Workflow

The project follows a structured commit history for easy tracking:

1. **Project Foundation** - Security and documentation
2. **Database Models** - Entity Framework setup
3. **Authentication System** - JWT implementation
4. **Core Controllers** - Business logic APIs
5. **Advanced Features** - Reports and settings
6. **Backend Configuration** - Services and dependencies
7. **Angular Foundation** - Project structure
8. **Core Services** - API integration
9. **Authentication UI** - Login components
10. **Role-Based Dashboards** - User interfaces
11. **Business Components** - CRUD operations
12. **Advanced UI** - Reports and analytics
13. **Final Polish** - Styling and assets

## 📚 Documentation

- **API Documentation**: Visit `https://localhost:44372/swagger` when backend is running
- **Database Schema**: See `Backend/Models/` for entity definitions
- **Frontend Components**: Organized in `water-billing-angular/src/app/`

## 🛠️ Configuration

### Environment Variables (Production)
```bash
JWT_KEY=your_jwt_secret_key_here
ADMIN_PASSWORD=your_secure_admin_password
EMAIL_PASSWORD=your_email_app_password
CONNECTION_STRING=your_production_connection_string
```

### Email Configuration
For Gmail SMTP, use App Passwords:
1. Enable 2-Factor Authentication
2. Generate App Password
3. Use App Password in `EmailSettings.SenderPassword`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Developer

**Lawrence Mbugua**
- GitHub: [@kb-diplo](https://github.com/kb-diplo)
- Email: tingzlarry@gmail.com

## 🙏 Acknowledgments

- Built with ASP.NET Core 8 and Angular 17
- UI components from Angular Material
- Charts powered by Chart.js
- Professional design inspired by modern water utility systems

---

**© 2025 Water Billing System - Developed by Lawrence Mbugua**
