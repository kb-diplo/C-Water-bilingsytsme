# Denkam Waters - Quick Start Guide

## Prerequisites
- .NET 8 SDK installed
- Node.js and npm installed
- SQL Server or SQL Server Express LocalDB

## Running the Application

### 1. Start Backend API (Terminal 1)
```bash
# Navigate to backend directory
cd "C:\Users\LARRY\Desktop\Attach projects\MyApi\Backend"

# Run the API server
dotnet run
```
**Expected Output:** 
- Server starts on `https://localhost:7001`
- Database migrations applied automatically
- Admin user created: `admin` / `Admin123`

### 2. Start Frontend (Terminal 2)
```bash
# Navigate to Angular frontend directory
cd "C:\Users\LARRY\Desktop\Attach projects\MyApi\water-billing-angular"

# Install dependencies (first time only)
npm install

# Start Angular development server
ng serve --port 4202
```
**Expected Output:**
- Angular app compiles successfully
- Server starts on `http://localhost:4202`

## Access the Application

1. **Homepage:** http://localhost:4202
2. **Login Page:** http://localhost:4202/login
3. **API Documentation:** https://localhost:7001/swagger

## Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | Admin123 |

## Quick Test Commands

### Test Backend API
```bash
# Test login endpoint
curl -k -X POST https://localhost:7001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"Admin123\"}"
```

### Check Running Processes
```bash
# Check if backend is running
netstat -an | findstr :7001

# Check if frontend is running  
netstat -an | findstr :4202
```

## Troubleshooting

### Backend Issues
- **Database Error:** Ensure SQL Server LocalDB is running
- **Port 7001 in use:** Stop other .NET processes or change port in `launchSettings.json`

### Frontend Issues
- **Port 4202 in use:** Use different port: `ng serve --port 4203`
- **Build errors:** Run `npm install` and `ng build`

### Login Issues
- **CORS Error:** Ensure backend is running with CORS enabled
- **Connection Error:** Check both backend and frontend are running
- **Invalid Credentials:** Use default admin credentials above

## Project Structure
```
MyApi/
├── Backend/                 # .NET 8 Web API
│   ├── Controllers/         # API endpoints
│   ├── Models/             # Data models
│   └── Data/               # Database context
└── water-billing-angular/   # Angular 20 app
    ├── src/app/            # Angular components
    ├── src/assets/         # Static files
    └── node_modules/       # Angular dependencies
```

## Development Notes
- Backend runs on HTTPS (port 7001)
- Frontend runs on HTTP (port 4202)
- CORS is configured for localhost development
- JWT authentication with 30-minute expiry
- Role-based access: Admin, MeterReader, Client

---
**Developed by Lawrence Mbugua Njuguna**  
**© 2025 Denkam Waters - Kiambu**
