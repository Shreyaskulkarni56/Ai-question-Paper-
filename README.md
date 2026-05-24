# VedaAI Assessment Creator

A high-fidelity, premium AI-powered Assessment Creator application designed for teachers. Built using a modern monorepo-style architecture with **Next.js (App Router, TypeScript, Redux Toolkit)** on the frontend and **Node.js (Express, TypeScript, MongoDB, Redis, BullMQ, Socket.io)** on the backend.

---

## 🌟 Key Features

1. **Assignment Settings Panel (Frontend)**:
   - A gorgeous glassmorphic form to specify the assignment topic/title, question quantities, total marks, and additional teacher instructions.
   - Support for **Institutional Details** like School Name, Subject, and Class Name to automatically brand the exam paper.
   - Interactive checkbox grid to select multiple question types (MCQs, Short Answers, Essays, True/False).
   - **Reference Material Library**: Supports uploading PDF and text documents, saving them to a dedicated library for reuse, and using their parsed text as contextual boundaries for the AI prompt.
   - Rigorous client-side input validation preventing negative, empty, or overflow fields.

2. **Background Queue Engine (Backend)**:
   - Job submissions are added to a **BullMQ** queue backed by **Redis** to ensure heavy LLM processing runs safely in the background.
   - **Zero-Dependency Fallback Scheduler**: If Redis is offline, the backend automatically boots a robust in-memory job scheduler mimicking BullMQ workflows, ensuring the system remains fully functional in any environment.
   - **Socket.io Real-Time Synchronization**: WebSocket channels map clients to specific assignment rooms, delivering live, animated stage updates (e.g. "Connecting to AI...", "Assembling MCQ keys...", "Formatting sections...") directly to the frontend.

3. **Curriculum-Aware AI Service**:
   - Integrates the official `@google/generative-ai` SDK using `gemini-2.5-flash` with strict schema validation.
   - **Semantic Dynamic Mock Engine**: If `USE_MOCK_AI=true` or if no Gemini key is specified, a creative local dictionary checks the assignment topic and dynamically synthesizes authentic, realistic syllabus questions (e.g. photosynthesis questions for biology topics, closures/event-loop questions for coding topics, derivatives for math) to provide a zero-setup evaluation experience.

4. **Institutional Academic Paper View (Output Page)**:
   - Displays the generated assessment in an authentic, double-bordered cream paper simulation utilizing a print-optimized serif typeface (`Georgia`) and a red margin guide.
   - Displays student details entry fields (*Name*, *Roll Number*, *Section*) using traditional dotted ledger lines.
   - Groups questions into distinct alphabetical sections (Section A, B, C...) with custom sub-instructions, colored HSL difficulty badges, and specific marks tallies.
   - **Teacher's Secret Keys Toggle**: Allows teachers to instantly reveal/hide correct answer keys on the assessment sheet.
   - **One-Click PDF Export**: Uses high-end, responsive CSS print rules to ensure clicking "Download PDF" prints an official, beautifully margins-aligned test sheet, stripping away floating action bars, loaders, and navigation panels automatically.

5. **Integrated History Panel**:
   - Stores all past generated papers in a MongoDB database.
   - Lists past tests in a sleek vertical panel, letting teachers toggle back and forth between active exam sheets or clean up old logs instantly.

---

## 📁 Repository Structure

```
veda-ai/
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB & Redis client initializations
│   │   ├── models/          # Mongoose Assignment & LibraryFile schemas
│   │   ├── queues/          # BullMQ queue setup & hybrid offline fallbacks
│   │   ├── services/        # Gemini API connector & Dynamic Semantic Mock Engine
│   │   └── index.ts         # Express server routing & Socket.io room bindings
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js Server Layout and Providers
│   │   ├── store/           # Redux Toolkit store, actions, and slices
│   │   ├── components/      # CreateForm, ProgressBar, AssessmentViewer, HistoryPanel, LibraryView
│   │   └── styles/          # Vanilla CSS variables, keyframe animations, & print media rules
│   ├── tsconfig.json
│   ├── package.json
│   └── next.config.js
└── README.md
```

---

## 🚀 Setup & Launch Instructions (Windows Sandbox)

Follow these simple commands in your terminal to boot both servers.

### 1. Prerequisite Checks

Make sure you have **Node.js (v18+)** installed. 
*Note: A local MongoDB and Redis server are recommended, but the application includes custom, built-in, zero-setup fallbacks. If they are offline, the app will simulate databases and background queues in-memory automatically without throwing crash errors!*

### 2. Configure Environment variables

In the `backend` folder, you will find `.env` pre-configured for instant mock evaluation:
```ini
PORT=4000
MONGODB_URI=mongodb://localhost:27017/veda-ai
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=
USE_MOCK_AI=true
```
If you wish to test with actual live Gemini API generation:
1. Set `USE_MOCK_AI=false`
2. Insert a valid API key into `GEMINI_API_KEY=`

---

### 3. Spin up Backend Server

Open a terminal at the root of the project and execute:
```powershell
# Navigate into backend, install dependencies, and run in dev mode
cd backend
npm install
npm run dev
```
The server will boot and display:
```
Successfully connected to MongoDB / Fallback mode active.
VedaAI Assessment Creator API Server running on: http://localhost:4000
```

---

### 4. Spin up Frontend Next.js Client

Open a **second, separate terminal** at the root of the project and execute:
```powershell
# Navigate into frontend, install dependencies, and run in dev mode
cd frontend
npm install
npm run dev
```
The client will compile and boot. Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📝 Verification Walkthrough

1. **Zero-Setup Dynamic Tryout**:
   - Input `"Photosynthesis"` as your topic. Select 5 questions, 20 marks, check `MCQ` and `Short Answer`.
   - Hit **Generate**. Watch the circular radial loader track active background queues over WebSockets from 0% to 100%.
   - Observe the cream-lined exam paper slide in with highly specific biology questions about chloroplasts, stomata, and light-dependent cycles!
   - Try another topic like `"JavaScript Event Loop"` with `True or False` checked to see curriculum-aware programming questions load instead!

2. **Grading & Review**:
   - Click the **Show Answer Key** action bar button. Watch the green tick answer guides appear on the paper. Click again to hide.

3. **PDF Printing**:
   - Click **Download PDF**. Notice that the browser print dialog loads a pristine, print-perfect black & white official examination grid with student info blanks and clean margins, automatically stripping away sidebar elements and dashboard banners.

4. **Multi-Test History**:
   - Create several papers. Click through the vertical **Assessment Logs** history feed on the left sidebar to instantly hot-reload and preview older exam sets, or click the trash icon to purge them.
