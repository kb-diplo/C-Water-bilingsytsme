# 🚀 Water Billing System - Setup Guide

## 📋 Prerequisites
- .NET 8.0 SDK
- Node.js 18+ and npm
- SQL Server (LocalDB or full instance)
- Visual Studio 2022 or VS Code

## 🔧 Backend Setup (C# ASP.NET Core)

### 1. Configuration Setup
```bash
cd Backend
cp appsettings.example.json appsettings.json
```

### 2. Update appsettings.json with your values:
- **JWT Key**: Generate a secure 32+ character key
- **Admin Password**: Set a strong admin password
- **Email Settings**: Configure SMTP settings (Gmail App Password recommended)
- **Connection String**: Update for your SQL Server instance

### 3. Database Setup
```bash
dotnet ef database update
```

### 4. Run Backend
```bash
dotnet run
```
Backend will run on: `https://localhost:44372`

## 🎨 Frontend Setup (Angular 17)

### 1. Install Dependencies
```bash
cd water-billing-angular
npm install
```

### 2. Update Environment
Update `src/environments/environment.ts` with your backend URL if different.

### 3. Run Frontend
```bash
ng serve
```
Frontend will run on: `http://localhost:4200`

## 👤 Default Admin Account
- **Username**: admin
- **Password**: (as configured in appsettings.json)

## 🔐 Security Notes
- Never commit `appsettings.json` to version control
- Use environment variables in production
- Generate strong JWT keys (32+ characters)
- Use Gmail App Passwords for email functionality

## 📚 API Documentation
Once running, visit: `https://localhost:44372/swagger`

## 🏗️ Architecture
- **Backend**: ASP.NET Core 8 Web API with JWT Authentication
- **Frontend**: Angular 17 with standalone components
- **Database**: SQL Server with Entity Framework Core
- **Authentication**: Role-based (Admin, MeterReader, Client)
