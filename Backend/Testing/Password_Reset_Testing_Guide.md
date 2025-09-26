# 🔐 Password Reset Testing Guide

## **📋 TESTING CHECKLIST**

### **✅ Prerequisites**
- [ ] Backend application is running (`dotnet run`)
- [ ] Database migration applied successfully
- [ ] Email settings configured in `appsettings.json`
- [ ] Gmail app password is valid
- [ ] Postman installed (or use any API testing tool)

---

## **🚀 STEP-BY-STEP TESTING**

### **1️⃣ Test Forgot Password Endpoint**

#### **Test Case 1: Valid Email**
```http
POST https://localhost:7000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "admin@example.com"
}
```

**Expected Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

#### **Test Case 2: Invalid Email Format**
```http
POST https://localhost:7000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "invalid-email"
}
```

**Expected Response:** `400 Bad Request` with validation errors

#### **Test Case 3: Non-existent Email**
```http
POST https://localhost:7000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "nonexistent@example.com"
}
```

**Expected Response:** Same success message (security feature)

---

### **2️⃣ Verify Email Delivery**

#### **Check Email Inbox:**
- [ ] Email received in inbox
- [ ] Subject: "Water Billing System - Password Reset Request"
- [ ] Professional HTML formatting
- [ ] Reset button works
- [ ] Reset link contains token parameter
- [ ] Link format: `https://my-angular-app/reset-password?token=XYZ`

#### **Extract Reset Token:**
- Copy the token from the email link
- Token should be ~43 characters long
- Example: `Ab3dEf9GhI2jKlMnOpQrStUvWxYz1234567890AbCdEf`

---

### **3️⃣ Test Reset Password Endpoint**

#### **Test Case 1: Valid Token & Password**
```http
POST https://localhost:7000/api/auth/reset-password
Content-Type: application/json

{
  "token": "YOUR_ACTUAL_TOKEN_HERE",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Expected Response:**
```json
{
  "message": "Password has been successfully reset. You can now log in with your new password."
}
```

#### **Test Case 2: Invalid Token**
```http
POST https://localhost:7000/api/auth/reset-password
Content-Type: application/json

{
  "token": "invalid-token",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Expected Response:** `400 Bad Request` - "Invalid or expired reset token."

#### **Test Case 3: Password Mismatch**
```http
POST https://localhost:7000/api/auth/reset-password
Content-Type: application/json

{
  "token": "YOUR_ACTUAL_TOKEN_HERE",
  "newPassword": "Password1",
  "confirmPassword": "Password2"
}
```

**Expected Response:** `400 Bad Request` with validation errors

#### **Test Case 4: Expired Token (after 15 minutes)**
- Wait 15+ minutes after requesting reset
- Use the same token
- **Expected Response:** `400 Bad Request` - "Reset token has expired."

---

### **4️⃣ Test Login with New Password**

```http
POST https://localhost:7000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "NewPassword123!"
}
```

**Expected Response:** Successful login with JWT token

---

## **🔍 VERIFICATION POINTS**

### **Database Verification:**
1. **Before Reset:** Check Users table for `ResetToken` and `ResetTokenExpiry`
2. **After Reset:** Verify token fields are cleared (`NULL`)
3. **Password Hash:** Confirm `PasswordHash` has changed

### **Security Verification:**
- [ ] Generic responses don't reveal if email exists
- [ ] Tokens expire after 15 minutes
- [ ] Tokens are single-use (cleared after reset)
- [ ] Password validation enforced
- [ ] Secure token generation (cryptographically random)

### **Email Verification:**
- [ ] Professional HTML template
- [ ] Correct sender information
- [ ] Reset link works
- [ ] Mobile-responsive design
- [ ] Security messaging included

---

## **🐛 TROUBLESHOOTING**

### **Email Not Received:**
1. Check spam/junk folder
2. Verify Gmail app password
3. Check application logs for email errors
4. Verify SMTP settings in `appsettings.json`

### **Token Issues:**
1. Ensure token copied correctly (no extra spaces)
2. Check token hasn't expired (15-minute limit)
3. Verify token hasn't been used already

### **Database Issues:**
1. Confirm migration applied: Check Users table schema
2. Verify connection string in `appsettings.json`
3. Check application startup logs

---

## **📊 EXPECTED RESULTS**

| Test Case | Expected Result | Status |
|-----------|----------------|---------|
| Valid email forgot password | Success message | ⏳ |
| Invalid email format | Validation error | ⏳ |
| Non-existent email | Success message | ⏳ |
| Email delivery | Professional email received | ⏳ |
| Valid token reset | Password reset success | ⏳ |
| Invalid token | Error message | ⏳ |
| Password mismatch | Validation error | ⏳ |
| Expired token | Expiration error | ⏳ |
| Login with new password | Successful login | ⏳ |

---

## **🎯 SUCCESS CRITERIA**

✅ **Complete Success When:**
- All API endpoints respond correctly
- Email delivery works reliably
- Password reset flow completes end-to-end
- Security measures function properly
- Database updates correctly
- User can login with new password

**🚀 Your password reset functionality is ready for production!**
