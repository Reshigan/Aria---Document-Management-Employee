# ARIA System Test Plan - Complete Frontend & Password Reset Testing

## 📋 Overview
Comprehensive system testing plan for ARIA Document Management System covering:
- New corporate color scheme and icon
- Password reset feature (forgot password & reset password)
- All frontend pages and components
- End-to-end user workflows
- API endpoints and integrations

## 🎨 Corporate Design Testing

### Color Scheme Verification
**Expected Colors:**
- Primary Navy: `#1a2332`
- Primary Slate: `#2c3e50`
- Accent Teal: `#16a085`
- Premium Gold: `#f39c12`
- Success Green: `#27ae60`
- Error Red: `#e74c3c`

**Test Cases:**
1. ✅ **Landing Page**
   - Verify gradient background uses new navy/slate/teal colors
   - Check icon displays as `aria-corporate-icon.svg`
   - Confirm button colors match corporate palette

2. ✅ **Login Page**
   - Verify left panel gradient: `#1a2332 → #2c3e50 → #16a085`
   - Check corporate icon displays correctly (200x200px)
   - Verify primary button color is `#2c3e50`
   - Check hover state changes to `#16a085`

3. ✅ **Register Page**
   - Verify corporate colors in header and buttons
   - Check icon consistency
   - Test button hover states

4. ✅ **Forgot Password Page** (NEW)
   - Verify page loads without 404 error
   - Check gradient background matches corporate scheme
   - Verify corporate icon displays
   - Test button colors and hover effects

5. ✅ **Reset Password Page** (NEW)
   - Verify page loads without 404 error
   - Check corporate gradient
   - Verify icon consistency
   - Test form styling

6. ✅ **Dashboard Pages**
   - Check navigation bar uses `#2c3e50`
   - Verify cards and components use new color scheme
   - Test buttons and interactive elements

### Icon Testing
1. ✅ **Favicon**
   - Verify `favicon-corporate.svg` displays in browser tab
   - Check icon is visible and clear at 16x16, 32x32 sizes
   - Test on multiple browsers (Chrome, Firefox, Safari, Edge)

2. ✅ **Apple Touch Icon**
   - Verify `aria-corporate-icon.svg` for mobile bookmarks
   - Test on iOS and Android devices

3. ✅ **Page Icons**
   - Check all pages display corporate icon consistently
   - Verify icon quality and resolution
   - Test icon animations (if any)

## 🔐 Password Reset Feature Testing

### 1. Forgot Password Flow

#### Test Case 1.1: Request Password Reset (Valid Email)
**URL:** `https://aria.vantax.co.za/forgot-password`
**Steps:**
1. Navigate to forgot password page
2. Enter registered email address
3. Click "Send Reset Instructions"
**Expected Results:**
- ✅ Success message appears
- ✅ In development mode, reset link is displayed
- ✅ Button shows loading state during request
- ✅ Form validates email format
**API Endpoint:** `POST /api/auth/forgot-password`
**Payload:** `{ "email": "user@example.com" }`

#### Test Case 1.2: Request Password Reset (Invalid Email)
**Steps:**
1. Navigate to forgot password page
2. Enter non-registered email address
3. Click "Send Reset Instructions"
**Expected Results:**
- ✅ Generic success message (security: no email enumeration)
- ✅ No error reveals email doesn't exist
- ✅ Form completes normally

#### Test Case 1.3: Email Validation
**Steps:**
1. Try submitting empty form
2. Try invalid email format (e.g., "notanemail")
3. Try email with spaces
**Expected Results:**
- ✅ Ant Design validation triggers
- ✅ Error messages display
- ✅ Submit button disabled until valid

#### Test Case 1.4: UI/UX Elements
**Verify:**
- ✅ Back to Login link works
- ✅ Sign up link works
- ✅ Page is responsive on mobile
- ✅ Loading spinner displays during submission
- ✅ Success state shows check icon
- ✅ Corporate colors applied correctly

### 2. Reset Password Flow

#### Test Case 2.1: Reset Password (Valid Token)
**URL:** `https://aria.vantax.co.za/reset-password?token=VALID_TOKEN_HERE`
**Steps:**
1. Click reset link from forgot password flow
2. Enter new password (meets requirements)
3. Confirm password (matching)
4. Click "Reset Password"
**Expected Results:**
- ✅ Token is validated
- ✅ Password strength requirements shown
- ✅ Success message displays
- ✅ Auto-redirect to login after 3 seconds
- ✅ Can login with new password
**API Endpoint:** `POST /api/auth/reset-password`
**Payload:** `{ "token": "...", "new_password": "..." }`

#### Test Case 2.2: Reset Password (Expired Token)
**Steps:**
1. Use reset link older than 48 hours
2. Try to reset password
**Expected Results:**
- ✅ Error message: "This reset link has expired"
- ✅ Instructions to request new link
- ✅ Link to forgot password page

#### Test Case 2.3: Reset Password (Used Token)
**Steps:**
1. Use same reset link twice
2. Second attempt should fail
**Expected Results:**
- ✅ Error message: "This reset link has already been used"
- ✅ Instructions to request new link

#### Test Case 2.4: Reset Password (Invalid Token)
**Steps:**
1. Manually modify token in URL
2. Try to reset password
**Expected Results:**
- ✅ Error message: "Invalid reset link"
- ✅ Link to forgot password page

#### Test Case 2.5: Password Validation
**Test password requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Steps:**
1. Try weak password: "password"
2. Try short password: "Pass1!"
3. Try without uppercase: "password123!"
4. Try without number: "Password!"
5. Try valid password: "MyP@ssw0rd!"
**Expected Results:**
- ✅ Validation errors display for weak passwords
- ✅ Green checkmarks show for met requirements
- ✅ Submit button disabled until all requirements met
- ✅ Real-time validation feedback

#### Test Case 2.6: Password Confirmation
**Steps:**
1. Enter valid password
2. Enter different confirmation password
3. Try to submit
**Expected Results:**
- ✅ Error: "Passwords do not match"
- ✅ Form won't submit
- ✅ Visual indicator of mismatch

#### Test Case 2.7: UI/UX Elements
**Verify:**
- ✅ Password strength indicator works
- ✅ Eye icon toggles password visibility
- ✅ Requirements list updates in real-time
- ✅ Success state with check icon
- ✅ Loading state during submission
- ✅ Countdown timer before redirect
- ✅ Responsive design on mobile
- ✅ Corporate colors consistent

### 3. Integration with Login Page

#### Test Case 3.1: Forgot Password Link
**Steps:**
1. Navigate to login page
2. Locate "Forgot your password?" link
3. Click link
**Expected Results:**
- ✅ Link is visible and styled correctly
- ✅ Navigates to `/forgot-password`
- ✅ No 404 error

#### Test Case 3.2: Return to Login
**Steps:**
1. From forgot password page, click "Back to Login"
2. From reset password page, click "Back to Login"
**Expected Results:**
- ✅ Returns to login page
- ✅ No data loss or errors

## 🌐 Complete Frontend Testing

### Page Load Tests
Test all pages load without errors:

1. ✅ **/** - Landing Page
   - Corporate icon displays
   - Call-to-action buttons work
   - Navigation links functional

2. ✅ **/login** - Login Page
   - Form validation works
   - Login functionality intact
   - Forgot password link present

3. ✅ **/register** - Register Page
   - Registration form works
   - Validation functions
   - Link to login works

4. ✅ **/forgot-password** - Forgot Password (NEW)
   - Page loads without 404
   - Form submits correctly
   - API integration works

5. ✅ **/reset-password?token=...** - Reset Password (NEW)
   - Page loads without 404
   - Token validation works
   - Password reset completes

6. ✅ **/dashboard** - Dashboard
   - Requires authentication
   - Displays user data
   - Corporate colors applied

7. ✅ **/documents** - Documents List
   - Lists documents correctly
   - Search/filter works
   - Corporate styling consistent

8. ✅ **/documents/[id]** - Document Details
   - Document loads correctly
   - Actions functional
   - UI elements styled

9. ✅ **/upload** - Upload Page
   - File upload works
   - Progress indicators show
   - Success/error handling

10. ✅ **/chat** - AI Chat
    - Chat interface loads
    - Messages send/receive
    - AI responses work

11. ✅ **/admin** - Admin Panel (if applicable)
    - Admin functions work
    - User management functional
    - Analytics display

### Responsive Design Tests
Test on multiple screen sizes:
- ✅ Desktop (1920x1080, 1366x768)
- ✅ Tablet (iPad: 768x1024)
- ✅ Mobile (iPhone: 375x667, 414x896)
- ✅ Large Mobile (430x932)

### Browser Compatibility Tests
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

## 🔌 API Endpoint Testing

### Authentication Endpoints
1. ✅ **POST /api/auth/register**
   - User registration works
   - Validation functions
   - Returns JWT token

2. ✅ **POST /api/auth/login**
   - User login successful
   - JWT token issued
   - Invalid credentials handled

3. ✅ **POST /api/auth/logout**
   - Session terminated
   - Token invalidated

4. ✅ **POST /api/auth/forgot-password** (NEW)
   - Accepts email
   - Generates reset token
   - Token saved to database
   - Returns success message

5. ✅ **POST /api/auth/reset-password** (NEW)
   - Validates token
   - Checks expiration (48 hours)
   - Checks if already used
   - Updates password
   - Marks token as used
   - Returns success

### Document Endpoints
1. ✅ **GET /api/documents**
   - Lists user documents
   - Pagination works
   - Filtering functions

2. ✅ **POST /api/documents**
   - File upload successful
   - OCR processing triggered
   - Metadata extracted

3. ✅ **GET /api/documents/{id}**
   - Document details retrieved
   - Permissions checked
   - Data correct

4. ✅ **PUT /api/documents/{id}**
   - Document updated
   - Changes saved

5. ✅ **DELETE /api/documents/{id}**
   - Document deleted
   - File removed from storage

### AI Chat Endpoints
1. ✅ **POST /api/chat**
   - Message sent
   - AI response received
   - Context maintained

2. ✅ **GET /api/chat/history**
   - Chat history retrieved
   - Pagination works

## 🗄️ Database Testing

### Migration Verification
1. ✅ Run database migration:
   ```bash
   cd backend
   alembic upgrade head
   ```
2. ✅ Verify `password_reset_tokens` table created
3. ✅ Check table structure:
   - id (Primary Key)
   - user_id (Foreign Key → users.id)
   - token (Unique, Indexed)
   - expires_at
   - used (Boolean)
   - used_at
   - created_at
   - updated_at

### Data Integrity Tests
1. ✅ **Token Creation**
   - Token generated correctly
   - Expiration set to +48 hours
   - Token is unique

2. ✅ **Token Validation**
   - Valid token accepted
   - Expired token rejected
   - Used token rejected
   - Invalid token rejected

3. ✅ **Token Usage**
   - used=True after reset
   - used_at timestamp set
   - Can't reuse token

## 🔒 Security Testing

### Password Reset Security
1. ✅ **Email Enumeration Prevention**
   - Same response for valid/invalid emails
   - No information leak

2. ✅ **Token Security**
   - Token is random and unpredictable
   - Token length sufficient (100 chars recommended)
   - Token properly indexed for fast lookup

3. ✅ **Brute Force Protection**
   - Rate limiting on forgot password
   - Rate limiting on reset password
   - Account lockout after multiple attempts

4. ✅ **Password Strength**
   - Minimum requirements enforced
   - Weak passwords rejected
   - Client & server validation

## ⚡ Performance Testing

### Load Time Tests
1. ✅ **Page Load Times**
   - Landing page < 2 seconds
   - Login page < 1.5 seconds
   - Dashboard < 3 seconds
   - Document list < 2.5 seconds

2. ✅ **API Response Times**
   - Auth endpoints < 500ms
   - Document list < 1 second
   - Document details < 800ms
   - Password reset < 500ms

3. ✅ **Frontend Bundle Size**
   - Check production build size
   - Verify code splitting works
   - Check lazy loading

## 📱 Mobile-Specific Testing

### Touch Interactions
1. ✅ Buttons are tappable (minimum 44x44px)
2. ✅ Forms work with mobile keyboards
3. ✅ Scrolling is smooth
4. ✅ No horizontal scroll issues

### Mobile Features
1. ✅ Copy/paste works in forms
2. ✅ Autofill works for email/password
3. ✅ Password managers integrate correctly
4. ✅ Back button functions properly

## 🐛 Bug Testing Scenarios

### Edge Cases
1. ✅ **Rapid Form Submissions**
   - Multiple clicks don't cause issues
   - Loading states prevent duplicate requests

2. ✅ **Network Failures**
   - Graceful error handling
   - Retry options available
   - User notified of issues

3. ✅ **Session Expiration**
   - User redirected to login
   - No data loss
   - Clear messaging

4. ✅ **Token Manipulation**
   - Modified tokens rejected
   - SQL injection attempts blocked
   - XSS attempts sanitized

## 📊 Test Execution Checklist

### Pre-Deployment
- ✅ Code pushed to GitHub
- ✅ Database migration file created
- ✅ Frontend built successfully
- ✅ No console errors in build
- ✅ No TypeScript errors

### Deployment Steps
1. ✅ Pull latest code on server
2. ✅ Run database migration
3. ✅ Rebuild frontend
4. ✅ Restart backend service
5. ✅ Verify services running
6. ✅ Check logs for errors

### Post-Deployment
1. ✅ Smoke test all pages
2. ✅ Test password reset flow end-to-end
3. ✅ Verify corporate colors applied
4. ✅ Check icons display correctly
5. ✅ Monitor error logs
6. ✅ Check API response times
7. ✅ Verify database connections

## 🚀 Deployment Verification

### Live Server Checks
**Server:** 3.8.139.178 (AWS EC2)  
**Domain:** https://aria.vantax.co.za

1. ✅ **Frontend Accessible**
   ```bash
   curl -I https://aria.vantax.co.za
   # Should return 200 OK
   ```

2. ✅ **Backend Healthy**
   ```bash
   curl https://aria.vantax.co.za/api/health
   # Should return {"status": "healthy"}
   ```

3. ✅ **HTTPS Working**
   - SSL certificate valid
   - No mixed content warnings
   - Secure connections only

4. ✅ **Static Assets Loading**
   - Images load correctly
   - CSS applies properly
   - JavaScript executes
   - Icons display

## 📝 Test Results Template

### Test Execution Log
```
Date: _____________
Tester: _____________
Build Version: _____________

[ ] All pages load without 404 errors
[ ] Corporate colors applied throughout
[ ] Icons display correctly (favicon + page icons)
[ ] Forgot password page functional
[ ] Reset password page functional
[ ] Password reset flow works end-to-end
[ ] Email validation working
[ ] Token validation working
[ ] Password strength validation working
[ ] Responsive design on mobile
[ ] Cross-browser compatibility
[ ] API endpoints responding correctly
[ ] Database migration successful
[ ] No console errors
[ ] No security vulnerabilities found
[ ] Performance meets targets

Critical Issues Found: _____________
Minor Issues Found: _____________
Blockers: _____________
Sign-off: _____________
```

## 🎯 Success Criteria

System is ready for production if:
1. ✅ All pages load without 404 errors
2. ✅ Corporate color scheme applied consistently
3. ✅ New icons display correctly across all devices
4. ✅ Password reset flow completes successfully
5. ✅ All API endpoints return expected responses
6. ✅ Database migration runs without errors
7. ✅ No console errors in browser
8. ✅ Responsive design works on all screen sizes
9. ✅ Security tests pass
10. ✅ Performance targets met
11. ✅ Cross-browser compatibility confirmed
12. ✅ Production logs show no errors

## 📞 Rollback Plan

If critical issues found:
1. Note the specific issue
2. SSH to server: `ssh ubuntu@3.8.139.178`
3. Roll back to previous commit:
   ```bash
   cd /var/www/aria
   git log --oneline -5  # Find previous stable commit
   git checkout <previous-commit-hash>
   npm run build
   sudo systemctl restart aria-backend
   ```
4. Document issue for fixing
5. Re-test after fix before re-deploying

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-07  
**Next Review:** After deployment testing
