# IslandLoaf Deployment Checklist & Setup Instructions

## 🚀 Pre-Deployment Checklist

### ✅ Environment Setup
- [ ] Copy `env.example` to `.env`
- [ ] Set `NODE_ENV=production` for production deployment
- [ ] Configure `SESSION_SECRET` with a strong random string
- [ ] Set `PORT=5000` (required for Replit)
- [ ] Configure `ALLOWED_ORIGINS` for your domain

### ✅ Database Configuration
- [ ] Set `DATABASE_URL` for MongoDB or PostgreSQL
- [ ] Test database connection
- [ ] Set `STORAGE_TYPE=database` for production

### ✅ Optional Integrations
- [ ] **Airtable**: Set `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID`
- [ ] **OpenAI**: Set `OPENAI_API_KEY` for AI features
- [ ] **Stripe**: Set payment keys if using payments
- [ ] **Email**: Configure SMTP settings if using email notifications

### ✅ Security Configuration
- [ ] Change default admin password
- [ ] Set strong `SESSION_SECRET`
- [ ] Configure rate limiting
- [ ] Set up CORS origins

## 🔧 Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit .env with your actual values
nano .env
```

### 3. Database Setup
```bash
# For PostgreSQL (if using)
npm run db:push

# For MongoDB (connection will be tested on startup)
# No additional setup needed
```

### 4. Build Application
```bash
npm run build
```

### 5. Start Application
```bash
# Development
npm run dev

# Production
npm start
```

## 🌐 Replit Deployment

### 1. Upload to Replit
- [ ] Upload all files to Replit
- [ ] Ensure `.replit` file is present
- [ ] Set Replit to use Node.js

### 2. Environment Variables in Replit
- [ ] Go to "Secrets" tab in Replit
- [ ] Add all variables from `.env` file
- [ ] Set `NODE_ENV=production`
- [ ] Set `PORT=5000`

### 3. Start Application
- [ ] Click "Run" in Replit
- [ ] Application will be available at your Replit URL

## 🔍 Post-Deployment Verification

### ✅ API Endpoints Test
- [ ] Test `/api/auth/login` with admin credentials
- [ ] Test `/api/bookings` (requires authentication)
- [ ] Test `/api/services` (requires authentication)
- [ ] Test `/api/airtable/test` (if Airtable configured)

### ✅ Frontend Functionality
- [ ] Login page loads correctly
- [ ] Dashboard displays after login
- [ ] All navigation links work
- [ ] Forms submit successfully
- [ ] Data displays and updates correctly

### ✅ CRUD Operations
- [ ] **Create**: Add new bookings, services, vendors
- [ ] **Read**: View all data in dashboard
- [ ] **Update**: Edit existing records
- [ ] **Delete**: Remove records (if implemented)

### ✅ Error Handling
- [ ] Invalid login shows error message
- [ ] API errors display user-friendly messages
- [ ] Network errors are handled gracefully
- [ ] Form validation works correctly

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Issues
**Problem**: Application won't start
**Solution**: Ensure `PORT=5000` in environment variables

#### 2. Database Connection
**Problem**: Database connection errors
**Solution**: 
- Check `DATABASE_URL` format
- Verify database credentials
- Test connection manually

#### 3. CORS Errors
**Problem**: Frontend can't connect to API
**Solution**: 
- Check `ALLOWED_ORIGINS` configuration
- Ensure frontend URL is included

#### 4. Authentication Issues
**Problem**: Can't login or session expires
**Solution**:
- Check `SESSION_SECRET` is set
- Verify session configuration
- Clear browser cookies

#### 5. Missing API Endpoints
**Problem**: Frontend shows 404 errors
**Solution**:
- Ensure all routes are properly registered
- Check HTTP method (GET, POST, PATCH, DELETE)
- Verify authentication middleware

### Debug Commands

```bash
# Check application status
curl http://localhost:5000/api/system/status

# Test database connection
npm run db:init

# View application logs
# Check Replit console or server logs
```

## 📊 Monitoring & Maintenance

### Health Checks
- [ ] Set up monitoring for `/api/system/status`
- [ ] Monitor database connection
- [ ] Track API response times
- [ ] Monitor error rates

### Backup Strategy
- [ ] Regular database backups
- [ ] Environment configuration backup
- [ ] Code repository backup

### Updates
- [ ] Keep dependencies updated
- [ ] Monitor security advisories
- [ ] Test updates in staging environment

## 🔐 Security Best Practices

### Production Checklist
- [ ] Use HTTPS in production
- [ ] Set secure session cookies
- [ ] Implement rate limiting
- [ ] Validate all user inputs
- [ ] Use environment variables for secrets
- [ ] Regular security audits

### Access Control
- [ ] Implement role-based access
- [ ] Audit user permissions
- [ ] Monitor login attempts
- [ ] Implement account lockout

## 📞 Support

### Default Credentials
- **Admin**: `admin@islandloaf.com` / `admin123`
- **Vendor**: `vendor@islandloaf.com` / `vendor123`

### Contact Information
- Technical issues: Check application logs
- Feature requests: Update codebase
- Security issues: Immediate attention required

---

## 🎯 Success Criteria

Your deployment is successful when:
- [ ] Application starts without errors
- [ ] All API endpoints respond correctly
- [ ] Frontend loads and functions properly
- [ ] Users can login and access dashboard
- [ ] CRUD operations work for all data types
- [ ] Error handling works gracefully
- [ ] Performance is acceptable
- [ ] Security measures are in place

**Ready for production! 🚀** 