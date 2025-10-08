# 💧 Denkam Waters - Water Billing System

A comprehensive water billing management system built with **Angular 17** frontend and **ASP.NET Core 8** backend, featuring role-based access control, M-Pesa integration, and modern UI/UX design.

## 🌐 Live Demo
- **Frontend**: [Deploying to Vercel](https://vercel.com) (Migration from Netlify)
- **Backend API**: [https://c-water-bilingsytsme.onrender.com](https://c-water-bilingsytsme.onrender.com)

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
- **Payment Processing**: M-Pesa STK Push integration, payment recording and history
- **Meter Readings**: Monthly reading restrictions, billing period tracking
- **Reports & Analytics**: Financial reports with data visualization
- **Email System**: Bill reminders, payment confirmations, password reset
- **System Settings**: Configurable billing rates and system parameters

### 🎨 Modern UI/UX
- Responsive design for desktop, tablet, and mobile
- Professional teal branding (#00bcd4)
- Interactive charts and data visualization
- Clean, corporate aesthetic with Angular Material components

## 🏗️ Architecture

- **Backend**: ASP.NET Core 8 Web API
- **Frontend**: Angular 17 with standalone components
- **Database**: PostgreSQL (Production) / SQL Server (Development)
- **Authentication**: JWT tokens with role-based policies
- **Payments**: M-Pesa Daraja API integration
- **Email**: SMTP with professional templates
- **Deployment**: Netlify (Frontend) + Render (Backend)
- **API Documentation**: Swagger/OpenAPI integration

### 📚 Documentation
- **[Architecture Guide](ARCHITECTURE.md)**: Complete system architecture
- **[API Documentation](API_DOCUMENTATION.md)**: Full API reference
- **[Quick Start Guide](QUICK_START_GUIDE.md)**: Setup instructions

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
- **Password**: Admin123! (Bootstrap admin for initial setup)

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
- `POST /mpesa/stkpush` - M-Pesa STK Push payment
- `GET /` - All payments (Admin)
- `GET /{id}/receipt` - Download payment receipt

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

## 🎯 Key Features Implemented

### 🔄 Monthly Reading System
- **One reading per client per month** with validation
- **Automatic billing period tracking** (YYYY-MM format)
- **Bill generation** for non-zero usage
- **Previous reading display** with smart validation

### 💳 M-Pesa Integration
- **STK Push payments** directly from client dashboard
- **Phone number validation** (254XXXXXXXXX format)
- **Real-time payment processing**
- **Payment confirmation emails**

### 📧 Email System
- **Bill reminder emails** with overdue/due soon logic
- **Payment confirmation emails** with receipt details
- **Password reset emails** with secure tokens
- **Professional HTML templates** with company branding

### 🏢 Company Information
- **Denkam Waters Company Limited**
- **Location**: Ikinu, Kiambu County, Kenya
- **Phone**: +254 757 690 915
- **Email**: info@denkamwaters.co.ke

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

## 🚀 Deployment

### Frontend (Vercel)
- **Platform**: Vercel
- **Build Command**: `npm run build:vercel`
- **Output Directory**: `dist/water-billing-angular`
- **Framework**: Angular
- **Auto-deploy**: GitHub integration

### Backend (Render)
- **Platform**: Render
- **Service**: Web Service
- **Build Command**: `dotnet publish -c Release -o out`
- **Start Command**: `dotnet out/MyApi.dll`
- **Database**: PostgreSQL (Render)

### Recent Improvements
- ✅ Mobile UI optimizations (footer, navigation, spacing)
- ✅ PostgreSQL migration error handling
- ✅ Enhanced STK Push payment system
- ✅ Monthly meter reading restrictions
- ✅ Improved role-based access control
- ✅ Professional receipt generation
- ✅ Comprehensive error handling

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
- Email: mbugualawrencee@gmail.com

## 🙏 Acknowledgments

- Built with ASP.NET Core 8 and Angular 17
- UI components from Angular Material
- Charts powered by Chart.js
- Professional design inspired by modern water utility systems

---

**© 2025 Water Billing System - Developed by Lawrence Mbugua**
