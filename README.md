# IslandLoaf Admin Dashboard

A comprehensive full-stack admin dashboard for the IslandLoaf tourism platform, featuring complete CRUD operations, AI-powered features, and seamless integrations.

![IslandLoaf Dashboard](https://img.shields.io/badge/Status-Ready%20for%20Deployment-green)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MongoDB or PostgreSQL (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/islandloaf-dashboard.git
   cd islandloaf-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## 🔑 Default Credentials

- **Admin**: `admin@islandloaf.com` / `admin123`
- **Vendor**: `vendor@islandloaf.com` / `vendor123`

⚠️ **Change these passwords immediately after deployment!**

## 📚 Documentation

- [🚀 Deployment Guide](README_DEPLOYMENT.md) - Quick deployment instructions
- [📋 Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Comprehensive deployment guide
- [🔍 Technical Audit Summary](AUDIT_SUMMARY.md) - Details of fixes and improvements
- [📖 GitHub Setup Guide](GITHUB_SETUP.md) - How to upload to GitHub

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **React Query** - Data fetching
- **React Hook Form** - Form management

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB/PostgreSQL** - Database
- **JWT** - Authentication
- **Express Session** - Session management

### Integrations
- **OpenAI** - AI features
- **Airtable** - External data sync
- **Stripe** - Payment processing
- **Email** - Notifications

## 🎯 Features

### ✅ Core Dashboard
- **User Authentication** - Secure login/logout
- **Role-Based Access** - Admin and Vendor roles
- **Booking Management** - Complete CRUD operations
- **Service Management** - Full service lifecycle
- **Calendar Integration** - Event management
- **Notification System** - Real-time alerts

### ✅ AI-Powered Features
- **Marketing Content Generation** - AI-written content
- **Booking Optimization** - Smart recommendations
- **Vendor Analytics** - Performance insights
- **Feedback Analysis** - Sentiment analysis
- **Trip Concierge** - Personalized itineraries

### ✅ External Integrations
- **Airtable Sync** - Bidirectional data sync
- **Payment Processing** - Stripe integration
- **Email Notifications** - Automated alerts
- **Calendar Sync** - External calendar support

### ✅ Advanced Features
- **Real-time Updates** - Live data synchronization
- **Error Handling** - Comprehensive error management
- **Rate Limiting** - Security protection
- **Logging** - Detailed activity logs
- **CORS Support** - Cross-origin requests

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Bookings
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id/status` - Update booking status
- `DELETE /api/bookings/:id` - Delete booking

### Services
- `GET /api/services` - List services
- `POST /api/services` - Create service
- `PATCH /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

### AI Features
- `POST /api/ai/generate-marketing` - Generate marketing content
- `POST /api/ai/optimize-booking` - Optimize bookings
- `POST /api/ai/vendor-analytics` - Vendor analytics
- `POST /api/ai/analyze-feedback` - Feedback analysis

### Airtable Integration
- `GET /api/airtable/test` - Test connection
- `GET /api/airtable/vendors` - Get vendors
- `GET /api/airtable/bookings` - Get bookings
- `POST /api/airtable/sync` - Sync data

## 🌐 Deployment

### Replit (Recommended)
1. Import from GitHub
2. Configure environment variables
3. Deploy automatically

### Vercel
1. Connect GitHub repository
2. Configure environment variables
3. Deploy with one click

### Netlify
1. Import from GitHub
2. Set build commands
3. Configure environment variables

### Manual Deployment
See [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) for detailed instructions.

## 🔧 Environment Variables

### Required
```bash
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-super-secret-key
```

### Database
```bash
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/islandloaf
# OR
DATABASE_URL=postgresql://username:password@localhost:5432/islandloaf
```

### Optional Integrations
```bash
AIRTABLE_API_KEY=your_airtable_key
AIRTABLE_BASE_ID=your_airtable_base_id
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=your_stripe_key
```

## 🐛 Troubleshooting

### Common Issues

1. **Application won't start**
   - Check `PORT=5000` is set
   - Verify all dependencies installed
   - Check environment variables

2. **Database connection errors**
   - Verify `DATABASE_URL` format
   - Check database credentials
   - Test connection manually

3. **Frontend can't connect to API**
   - Check CORS configuration
   - Verify API endpoints running
   - Check authentication

4. **Missing features**
   - Verify optional integrations configured
   - Check environment variables
   - Review error logs

### Debug Commands
```bash
# Check application status
curl http://localhost:5000/api/system/status

# Test database connection
npm run db:init

# View logs
# Check deployment platform logs
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Comprehensive error handling
- Security best practices
- Production-ready configuration

## 📞 Support

- **Documentation**: Check the guides in this repository
- **Issues**: Create an issue on GitHub
- **Security**: Report security issues privately

---

**IslandLoaf Dashboard - Ready for Production! 🚀**

*Built with ❤️ for the tourism industry* 