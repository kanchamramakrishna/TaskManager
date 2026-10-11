# TaskManager

A full-stack task management application with Google Calendar integration, built with React (Vite) and Node.js (Express) + MongoDB.

---

## Project Structure

```
├── backend/            # Express.js REST API with MongoDB & Google Calendar integration
│   ├── api/            # Serverless entrypoint for Vercel
│   ├── routes/         # Auth & Calendar route handlers
│   ├── models/         # Mongoose User & Task schemas
│   ├── server.js       # Express server initialization
│   └── vercel.json     # Vercel serverless routing config
├── frontend/           # React + Vite frontend
│   ├── src/            # Components, styles, and API configuration
│   └── vercel.json     # Single-page application route rewrites
└── README.md
```

---

## Deployment Guide

### 1. Deploy the Backend

You can deploy the backend to **[Render](https://render.com)** (recommended for long-running Node/Express apps) or **Vercel**:

#### Option A: On Render (Web Service)
1. Sign up/Log in at [Render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository `TaskManager`.
4. Configure settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add the Environment Variables:
   - `MONGODB_URI`: your MongoDB Atlas connection string
   - `JWT_SECRET`: a secure random secret string
   - `GOOGLE_CLIENT_ID`: from Google Cloud Console
   - `GOOGLE_CLIENT_SECRET`: from Google Cloud Console
   - `GOOGLE_CALLBACK_URL`: `https://your-backend-app.onrender.com/api/auth/google/callback`
   - `FRONTEND_URL`: `https://your-frontend-app.vercel.app`

#### Option B: On Vercel
1. Import repository and choose **Root Directory**: `backend`.
2. Add the same Environment Variables listed above.

---

### 2. Deploy the Frontend on Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New...** -> **Project**.
2. Select your `TaskManager` repository.
3. In the setup screen:
   - **Root Directory**: Click *Edit* and select **`frontend`** (or click *Import single project* next to `frontend`).
   - **Framework Preset**: Vite (detected automatically).
4. Expand **Environment Variables** and add:
   - `VITE_API_URL`: URL of your deployed backend (e.g., `https://your-backend.onrender.com`).
5. Click **Deploy**.

---

### 3. Update Google Cloud OAuth Credentials
In your Google Cloud Console (APIs & Services > Credentials):
- Add your frontend URL to **Authorized JavaScript origins**:
  `https://your-frontend-app.vercel.app`
- Add your backend callback to **Authorized redirect URIs**:
  `https://your-backend-app.onrender.com/api/auth/google/callback`

---

## Local Development

1. **Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
