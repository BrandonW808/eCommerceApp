# Production-Ready eCommerce API

A scalable, secure, and well-structured eCommerce API built with TypeScript, Express, MongoDB, and Stripe.

## 🚀 Features

### Security
- **Authentication & Authorization**: JWT-based authentication with refresh tokens
- **Password Security**: Bcrypt hashing with configurable rounds
- **Rate Limiting**: Configurable rate limits for API endpoints
- **Input Validation**: Comprehensive input validation and sanitization
- **CORS**: Configurable Cross-Origin Resource Sharing
- **Helmet**: Security headers for protection against common vulnerabilities
- **MongoDB Injection Protection**: Query sanitization to prevent NoSQL injection
- **Account Security**: Login attempt tracking and account locking

### Payment Processing
- **Stripe Integration**: Full Stripe payment processing
- **Payment Methods**: Support for multiple payment methods
- **Invoice Generation**: Automatic invoice creation and management
- **Refunds**: Complete refund management system
- **Webhooks**: Secure webhook handling for payment events

### Data Management
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis caching support (optional)
- **File Storage**: Google Cloud Storage integration
- **Backups**: Automated database backup system

### API Features
- **RESTful Design**: Clean, intuitive API endpoints
- **Pagination**: Built-in pagination support
- **Error Handling**: Comprehensive error handling with custom error classes
- **Logging**: Structured logging with Winston
- **Request Tracking**: Request ID generation and tracking
- **Health Checks**: Multiple health check endpoints

### Developer Experience
- **TypeScript**: Full TypeScript support with strict mode
- **Code Quality**: ESLint and Prettier configuration
- **Testing**: Jest testing setup (ready to implement)
- **Documentation**: Swagger/OpenAPI support (ready to implement)
- **Hot Reload**: Nodemon for development
- **Environment Configuration**: Comprehensive environment variable management

## 📁 Project Structure

```
ecommerce-api/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── database/         # Database connection and migrations
│   ├── middleware/       # Express middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── validators/      # Request validators
│   ├── app.ts           # Express app setup
│   └── index.ts         # Application entry point
├── tests/               # Test files
├── logs/               # Log files (gitignored)
├── uploads/            # Uploaded files (gitignored)
├── .env.example        # Environment variables example
├── .eslintrc.json      # ESLint configuration
├── .gitignore         # Git ignore file
├── .prettierrc        # Prettier configuration
├── nodemon.json       # Nodemon configuration
├── package.json       # Dependencies and scripts
├── README.md          # Project documentation
└── tsconfig.json      # TypeScript configuration
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ecommerce-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Update `MONGODB_URI` in `.env`

5. **Set up Redis (optional)**
   - Install Redis locally or use Redis Cloud
   - Update Redis configuration in `.env`

6. **Set up Stripe**
   - Create a Stripe account
   - Get your API keys from Stripe dashboard
   - Update Stripe configuration in `.env`

7. **Set up Google Cloud Storage**
   - Create a GCP project and bucket
   - Download service account key
   - Update GCS configuration in `.env`

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm run start:prod
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Format Code
```bash
npm run format
```

## 📚 API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Customer Endpoints

#### Get Profile
```http
GET /api/v1/customers/profile
Authorization: Bearer <access-token>
```

#### Update Profile
```http
PUT /api/v1/customers/profile
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Updated"
}
```

### Payment Endpoints

#### Create Payment
```http
POST /api/v1/payments
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "amount": 100.00,
  "currency": "usd",
  "paymentMethodId": "pm_xxx",
  "description": "Order #12345"
}
```

## 🔒 Security Best Practices Implemented

1. **Environment Variables**: All sensitive data stored in environment variables
2. **Input Validation**: All inputs validated and sanitized
3. **SQL Injection Protection**: Parameterized queries and input sanitization
4. **XSS Protection**: Content Security Policy headers and input sanitization
5. **Rate Limiting**: Prevents brute force and DOS attacks
6. **HTTPS Enforcement**: Strict Transport Security headers
7. **Password Policy**: Strong password requirements
8. **Account Locking**: Automatic account locking after failed attempts
9. **Token Expiration**: JWT tokens expire and refresh tokens rotate
10. **Secure Headers**: Helmet.js for security headers

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options. Key variables include:

- `NODE_ENV`: Environment (development/production/test)
- `APP_PORT`: Server port
- `JWT_SECRET`: Secret for JWT signing
- `MONGODB_URI`: MongoDB connection string
- `STRIPE_SECRET_KEY`: Stripe API key
- `GCS_BUCKET_NAME`: Google Cloud Storage bucket

### Feature Flags

Enable/disable features via environment variables:

- `FEATURE_STRIPE_PAYMENTS`: Enable Stripe integration
- `FEATURE_EMAIL_NOTIFICATIONS`: Enable email notifications
- `FEATURE_BACKUP_SERVICE`: Enable automated backups
- `FEATURE_CACHE`: Enable Redis caching

## 📈 Monitoring

### Health Checks
- `/health` - Overall system health
- `/ping` - Simple ping endpoint
- `/ready` - Readiness probe
- `/metrics` - Basic metrics

### Logging
Logs are written to:
- Console (development)
- Daily rotating files (production)
- Error logs separated from combined logs

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e
```

## 🚢 Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Environment-Specific Builds
```bash
# Development
NODE_ENV=development npm run dev

# Production
NODE_ENV=production npm run build && npm run start:prod
```

## 📝 License

ISC License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support, email support@example.com or create an issue in the repository.
