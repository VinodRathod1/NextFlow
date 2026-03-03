# 🚀 NextFlow — AI Workflow Automation Engine

NextFlow is a full-stack **visual AI workflow builder** that allows users to design, execute, and manage AI-powered pipelines using a drag-and-drop canvas.

It integrates AI models, media processing, background jobs, authentication, and database persistence into a scalable production-ready system.

---

## ✨ Core Features

### 🧩 Visual Workflow Builder
- Drag & drop node system
- Directed Acyclic Graph (DAG) validation
- Node connection rules
- Undo / Redo support
- Real-time execution state updates

### 🧠 AI Integration (Google Gemini)
- Text prompts
- System prompts
- Multimodal support
- Streaming responses
- Background execution via Trigger.dev

### 🎬 Media Processing
- Server-side image cropping
- Video frame extraction
- FFmpeg background processing
- Non-blocking scalable pipeline

### 🗄 Database & Persistence
- PostgreSQL (Neon)
- Prisma ORM
- Workflow save & load
- Execution history tracking
- Node-level logs
- Multi-user isolation

### 🔐 Authentication
- Clerk authentication
- Protected routes
- User-scoped workflow ownership
- Secure API access

### 🚀 Production Deployment
- Vercel hosting
- Trigger.dev production worker
- Environment-based secrets
- Production migrations

---

# 🏗 Architecture Overview

```
Frontend (Next.js + React Flow)
        ↓
Next.js API Routes
        ↓
Execution Engine
        ↓
Trigger.dev Background Tasks
        ↓
FFmpeg / Gemini AI
        ↓
PostgreSQL (Prisma ORM)
```

---

# 🧱 Tech Stack

## Frontend
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- React Flow
- Zustand

## Backend
- Next.js API routes
- Prisma ORM
- PostgreSQL (Neon)

## AI & Processing
- Google Gemini API
- FFmpeg
- Trigger.dev

## Authentication
- Clerk

## Deployment
- Vercel
- Trigger.dev Production Worker

---

# 📂 Project Structure

```
app/                → API routes & pages
components/         → Canvas & node components
hooks/              → Custom React hooks
lib/                → Core logic & utilities
prisma/             → Schema & migrations
store/              → Zustand stores
trigger/            → Background task definitions
```

---

# ⚙️ Environment Variables

Create a `.env.local` file:

```
DATABASE_URL=
GEMINI_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
TRIGGER_API_KEY=
TRIGGER_PROJECT_ID=
```

⚠️ Never commit `.env` files.

---

# 🧪 Local Development Setup

## 1️⃣ Install Dependencies

```bash
npm install
```

## 2️⃣ Run Prisma Migration

```bash
npx prisma migrate dev
```

## 3️⃣ Start Development Server

```bash
npm run dev
```

## 4️⃣ Start Trigger.dev Worker

```bash
npx trigger dev
```

---

# 🚀 Production Deployment

## Deploy Frontend
- Import project into Vercel
- Configure environment variables
- Deploy

## Run Production Migration

```bash
npx prisma migrate deploy
```

## Deploy Trigger Worker

```bash
npx trigger deploy
```

---

# 🎯 Sample Workflow Included

**Product Marketing Generator**

Example Flow:

Text Input  
→ Gemini AI  
→ Media Processing  
→ Final Output  

---

# 🔒 Security Practices

- Environment-based secret management
- User-scoped data isolation
- Protected API routes
- Background task isolation
- Production-safe migrations

---

# 📊 Project Status

✅ Workflow Engine  
✅ AI Integration  
✅ FFmpeg Processing  
✅ Execution History  
✅ Multi-user Authentication  
✅ Production Deployment Ready  

---

# 👨‍💻 Author

**Vinod Rathod**  
GitHub: https://github.com/VinodRathod1

---

# 🚀 Future Improvements

- Rate limiting
- Workflow versioning
- Real-time collaboration
- Cloud file storage (S3 / Transloadit)
- Monitoring dashboard
