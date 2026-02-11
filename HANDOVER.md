# Handover Documentation - APPI RSI Group

This document provides instructions for the next developer to set up and run the application.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (Latest LTS recommended)
- PostgreSQL installed locally

### 2. Installation
Install the project dependencies:
```bash
npm install
```

### 3. Environment Setup
Copy the example environment file and update it with your local settings:
```bash
cp .env.local.example .env.local
```
Update `DATABASE_URL` in `.env.local` to match your local PostgreSQL connection.

### 4. Database Setup
1. Create a new database in PostgreSQL (e.g., named `appi`).
2. Restore the provided database backup file (`.sql` or `.tar`) using pgAdmin or the command line.
3. If migrations are needed after restoration, run:
   ```bash
   npx drizzle-kit push
   ```
   or
   ```bash
   npm run db:migrate
   ```

### 5. Running the Application
Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## 🛠 Tech Stack
- **Framework**: Next.js 15
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS & React Bootstrap
- **State Management**: Zustand & React Query

## 📝 Notes for Developers
- **Performance Optimizations**: 
  - Refactored Zustand stores for better state management and reduced re-renders.
  - Disabled Recharts animations (`isAnimationActive={false}`) for instant data visualization.
  - Implemented lazy loading for heavy report components.
- **Database Neutrality**: The application has been fully decoupled from Supabase and now uses a standard PostgreSQL connection via Drizzle ORM.
- **Environment Setup**: The project has been cleaned (removed `.next`, `node_modules`, and `.env.local`). Use the `.env.local.example` as a template.
- **Drizzle Studio**: You can view and edit the database records easily by running:
  ```bash
  npm run db:studio
  ```

