# Dr. A.P.J. Abdul Kalam Association - Donation Receipt Management System

A full-stack web application designed for Vinayagar Chadurthi Donation Collection, replacing handwritten receipts with a fully digital system. 

## Features
- **Admin Dashboard**: Real-time stats, charts (street-wise, payment-wise), and recent donations.
- **Donation Management**: Create, edit, search, and manage donations.
- **Smart Validation**: Detects duplicate entries (same name, street, door number on the same day).
- **PDF Generation**: Automatically generates a professional A5 receipt using `pdf-lib`.
- **QR Code Verification**: Receipts have QR codes linking to a public verification page.
- **GitHub Integration**: Automatically uploads PDF receipts to a GitHub repository using Personal Access Tokens.
- **WhatsApp Integration**: Sends predefined WhatsApp messages directly to donors with receipt links.
- **Settings**: Customizable association name, president name, defaults, and message templates.

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router, Recharts, React Hook Form
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Security**: JWT Authentication, bcrypt, Helmet, Express Rate Limit

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running

### 1. Database Setup
1. Create a database in PostgreSQL, e.g., `abdulkalam_donations`.
2. Navigate to the `server` directory and configure `.env`:
   ```bash
   cd server
   ```
   Edit the `.env` file to include your actual PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/abdulkalam_donations?schema=public"
   JWT_SECRET="your_secure_jwt_secret"
   GITHUB_TOKEN="your_github_personal_access_token"
   GITHUB_REPO="yourusername/abdulkalam-receipts"
   FRONTEND_URL="http://localhost:5173"
   ```

3. Run Prisma Migrations and Seed Admin User:
   ```bash
   npx prisma db push
   node seed.js
   ```
   *The default admin user is `admin` with password `admin123`.*

### 2. Running the Backend (Render Deployment Ready)
```bash
npm install
npm run dev # Or use nodemon server.js
```
The backend will run on `http://localhost:5000`.

### 3. Running the Frontend (Vercel Deployment Ready)
Navigate to the `client` directory in a new terminal:
```bash
cd client
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

---

## Deployment Guides

### Deploying Frontend to Vercel
1. Push the `client` directory to a GitHub repository (or the entire monorepo).
2. Go to Vercel and import the project.
3. If using a monorepo, set the Root Directory to `client`.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add Environment Variables:
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://api.yourdomain.com/api`)

### Deploying Backend to Render
1. Push the `server` directory to a GitHub repository.
2. Go to Render and create a new Web Service.
3. If using a monorepo, set the Root Directory to `server`.
4. Build command: `npm install && npx prisma generate`
5. Start command: `node server.js`
6. Add Environment Variables:
   - `DATABASE_URL` (Use Render's managed PostgreSQL or your own)
   - `JWT_SECRET`
   - `GITHUB_TOKEN`
   - `GITHUB_REPO`
   - `FRONTEND_URL` (Your Vercel deployed URL)

## Folder Structure
- `/client` - React frontend (Pages, Components, Contexts, Services)
- `/server` - Express backend (Routes, Controllers, Prisma Schema, Utilities)
