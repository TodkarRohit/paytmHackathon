# Paytm AI Sales Teammate

An AI-powered sales automation platform that helps Paytm sales teams contact shopkeepers, answer questions, identify interested customers, and assign high-intent leads to human sales agents.

---

## 🏗️ Project Architecture & Tech Stack

This repository contains a modular monorepo structure with distinct frontend and backend services:

- **Frontend:**
  - **Framework:** React 19 (JavaScript)
  - **Build Tool:** Vite
  - **Styling:** Tailwind CSS v4
- **Backend:**
  - **Runtime:** Node.js (ES Modules)
  - **Framework:** Express.js
  - **Database:** MongoDB Atlas
  - **ODM:** Mongoose
  - **Configuration:** dotenv

---

## 📁 Project Directory Structure

```text
paytm/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js            # MongoDB Atlas connection handler
│   │   └── server.js            # Express application & API routing
│   ├── .env                     # Local environment variables (git-ignored)
│   ├── .env.example             # Template for backend environment variables
│   ├── .gitignore               # Backend gitignore rules
│   └── package.json             # Backend dependencies and scripts
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main React landing component
│   │   ├── index.css            # Tailwind CSS directives
│   │   └── main.jsx             # React DOM entry point
│   ├── .env                     # Frontend environment variables (git-ignored)
│   ├── .env.example             # Template for frontend environment variables
│   ├── .gitignore               # Frontend gitignore rules
│   ├── index.html               # Single page HTML entry
│   ├── package.json             # Frontend dependencies and scripts
│   └── vite.config.js           # Vite configuration with Tailwind CSS plugin
├── .gitignore                   # Root gitignore rules
└── README.md                    # Project documentation
```

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18.0.0 or higher recommended, tested on v24)
- **npm** (v9.0.0 or higher)
- A **MongoDB Atlas** account (or local MongoDB instance)

---

## 🚀 Getting Started

### 1. Clone or Open the Repository
```bash
cd paytm
```

### 2. Configure Backend Environment
Navigate to the `backend` folder and create a `.env` file from `.env.example`:
```bash
cd backend
cp .env.example .env
```

Ensure `backend/.env` contains:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/paytm_sales?retryWrites=true&w=majority
CLIENT_URL=http://localhost:5173
```

### 3. Configure Frontend Environment
Navigate to the `frontend` folder and create a `.env` file from `.env.example`:
```bash
cd ../frontend
cp .env.example .env
```

Ensure `frontend/.env` contains:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 📦 Installation & Running

### Starting the Backend
Open a terminal in `backend/`:
```bash
cd backend
npm install
npm run dev
```
- The backend server will start at: `http://localhost:5000`
- Health check API: `http://localhost:5000/api/health`

### Starting the Frontend
Open a second terminal in `frontend/`:
```bash
cd frontend
npm install
npm run dev
```
- The React application will start at: `http://localhost:5173`

---

## 🍃 MongoDB Atlas Configuration Guide

Follow these steps to connect your MongoDB Atlas cloud database:

1. **Log In to MongoDB Atlas:**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in or create a free account.

2. **Create a Free Cluster:**
   - Create a new project named `Paytm-AI-Sales`.
   - Deploy a free **M0 Sandbox** cluster in your preferred region (e.g., `AWS / Mumbai (ap-south-1)`).

3. **Set Up Database Access (Credentials):**
   - In the left sidebar, navigate to **Security** → **Database Access**.
   - Click **Add New Database User**.
   - Choose **Password** authentication.
   - Enter a username (e.g., `paytm_admin`) and a secure password.
   - Set privileges to **Read and write to any database** (or **Atlas admin** for dev).
   - Click **Add User**.

4. **Set Up Network Access (IP Whitelist):**
   - In the left sidebar, navigate to **Security** → **Network Access**.
   - Click **Add IP Address**.
   - For local development, choose **Allow Access From Anywhere** (`0.0.0.0/0`) or enter your current IP.
   - Click **Confirm**.

5. **Copy the Connection String:**
   - In the left sidebar, go to **Deployment** → **Database**.
   - Click **Connect** next to your cluster.
   - Choose **Drivers** (Node.js).
   - Copy the connection string format:
     ```text
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Update it with your database user password and specify the database name `paytm_sales`:
     ```text
     mongodb+srv://paytm_admin:<your_password>@cluster0.xxxxx.mongodb.net/paytm_sales?retryWrites=true&w=majority
     ```

6. **Add to `backend/.env`:**
   - Paste the connection string into `backend/.env` as `MONGODB_URI`.
   - Restart the backend server with `npm run dev`.
   - The console will display: `✅ MongoDB Connected: <cluster-host>`.

---

## 🩺 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API status and root metadata |
| `GET` | `/api/health` | Health-check endpoint reporting server and MongoDB connection state |

### Sample Response (`GET /api/health`):
```json
{
  "status": "ok",
  "message": "Paytm AI Sales Teammate API is running",
  "timestamp": "2026-11-11T04:11:32.845Z",
  "environment": "development",
  "database": {
    "status": "disconnected",
    "readyState": 0
  }
}
```
*(Status will display `"connected"` with `readyState: 1` once valid MongoDB credentials are configured.)*

