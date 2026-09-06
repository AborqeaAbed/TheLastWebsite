# The Last Website

A permanent digital monument containing exactly 1,000,000 numbered spots.

## Overview

The Last Website is a digital platform where anyone can claim a permanent spot on the Internet for just $1 USD. Each spot has a unique number and coordinates in a vast digital map that users can explore.

## Features

- **1,000,000 Permanent Spots**: Every spot has a unique, unchanging number
- **Interactive Map**: Zoomable, pan-able world with 1 million spots
- **Simple Claiming Process**: $1 to claim, email verification required
- **Permanent Ownership**: Once claimed, your spot remains forever
- **Public Messages**: Leave your mark for future visitors

## Technology Stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion for animations

### Backend
- Spring Boot 3
- Java 21
- PostgreSQL
- Stripe for payments
- Spring Security for authentication

### Deployment
- Docker Compose for local development
- Vercel for frontend hosting
- AWS/Railway/Render for backend deployment

## Project Structure

```
the-last-website/
├── frontend/           # Next.js frontend application
│   ├── app/            # Pages and routes
│   ├── components/     # Reusable UI components
│   ├── map/            # Map rendering logic
│   ├── hooks/          # Custom React hooks
│   └── services/       # API service layer
│
├── backend/            # Spring Boot backend application
│   ├── src/main/java/com/thelastwebsite/
│   │   ├── auth/       # Authentication and security
│   │   ├── spots/      # Spot management
│   │   ├── payments/   # Payment processing
│   │   ├── users/      # User management
│   │   ├── admin/      # Admin dashboard
│   │   └── common/     # Shared utilities
│   │
│   └── src/main/resources/
│       └── db/migration/  # Database migrations
│
├── docker-compose.yml  # Local development setup
└── README.md           # This file
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- Java 21+

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd the-last-website
```

2. Create environment variables:
```bash
cp .env.example .env
```

3. Start the development environment:
```bash
docker compose up
```

4. Access the applications:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

### Manual Setup (Alternative)

If you prefer to run components manually:

#### Backend Setup
1. Start PostgreSQL database
2. Build and run backend:
```bash
cd backend
mvn clean package
java -jar target/the-last-website-backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=dev
```
The backend will start on port 8080.

#### Frontend Setup
1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run the development server:
```bash
npm run dev
```
The frontend will start on port 3000.

## Database Schema

The database contains these main tables:

1. **users** - User accounts with email verification
2. **spots** - 1,000,000 spots with coordinates and status
3. **payments** - Payment records from Stripe
4. **verification_tokens** - Magic links for email verification
5. **audit_logs** - Tracking of important user actions

## API Endpoints

### Spots
- `GET /api/spots/{spotNumber}` - Get spot details
- `GET /api/spots/viewport` - Get spots in current viewport
- `GET /api/spots/random` - Get a random available spot
- `GET /api/spots/latest` - Get recently claimed spots

### Payments
- `POST /api/payments/create-checkout` - Create Stripe checkout session
- `POST /api/payments/stripe-webhook` - Handle Stripe webhooks

### Authentication
- `POST /api/auth/request-magic-link` - Request email verification link
- `GET /api/auth/verify` - Verify email with magic link

## Development Guidelines

1. **Frontend**: Use Next.js App Router for routing and React Server Components
2. **Backend**: Follow Spring Boot conventions, clean architecture with separation of concerns
3. **Database**: Use PostgreSQL with proper indexing for performance
4. **Security**: All authentication based on email verification only
5. **Performance**: Implement viewport-based loading for the interactive map

## Current Status

The backend is successfully running with:
- Spring Boot 3.2.0
- PostgreSQL integration
- Basic authentication enabled
- REST endpoints available on port 8080

The frontend structure appears to be correct but needs proper dependencies installed.

## Troubleshooting

If you encounter issues with the database connection:
1. Make sure PostgreSQL is running
2. Verify the database credentials in `application-dev.yml`
3. Check that the database exists and is accessible

## License

This project is proprietary and for demonstration purposes only.