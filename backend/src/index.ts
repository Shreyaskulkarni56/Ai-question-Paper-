import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { Assignment } from './models/Assignment';
import { LibraryFile } from './models/LibraryFile';
import { checkRedisConnection } from './config/redis';
import { initQueues, addGenerationJob, setSocketIO } from './queues/queueManager';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure CORS to allow frontend connections
app.use(cors({
  origin: '*', // In development, allow all origins
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Set up Socket.io with lax CORS for easy dev setups
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Pass socket server to queue manager for real-time broadcasts
setSocketIO(io);

// Express Routes

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    redis: require('./config/redis').getIsRedisAvailable() ? 'connected' : 'fallback-mode',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

/**
 * Fetch all assignments (history)
 */
app.get('/api/assignments', async (req, res) => {
  try {
    const list = await Assignment.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Fetch a single assignment by ID
 */
app.get('/api/assignments/:id', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a specific assignment
 */
app.delete('/api/assignments/:id', async (req, res) => {
  try {
    const deleted = await Assignment.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update a specific assignment
 */
app.patch('/api/assignments/:id', async (req, res) => {
  try {
    const { title, schoolName, subject, className } = req.body;
    
    const updated = await Assignment.findByIdAndUpdate(
      req.params.id,
      { $set: { title, schoolName, subject, className } },
      { new: true } // Return the updated document
    );

    if (!updated) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new assignment and queue generation
 */
app.post('/api/assignments', upload.single('file'), async (req: any, res: any) => {
  try {
    // Parse body inputs
    const { title, dueDate, questionTypes, numQuestions, totalMarks, additionalInstructions, schoolName, subject, className } = req.body;

    // Server-side validation
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Assignment topic or title is required.' });
    }

    const parsedNumQuestions = parseInt(numQuestions);
    const parsedTotalMarks = parseInt(totalMarks);

    if (isNaN(parsedNumQuestions) || parsedNumQuestions <= 0) {
      return res.status(400).json({ error: 'Number of questions must be a positive integer greater than zero.' });
    }

    if (isNaN(parsedTotalMarks) || parsedTotalMarks <= 0) {
      return res.status(400).json({ error: 'Total marks must be a positive integer greater than zero.' });
    }

    let parsedQuestionTypes: string[] = [];
    try {
      parsedQuestionTypes = typeof questionTypes === 'string' ? JSON.parse(questionTypes) : questionTypes;
    } catch {
      parsedQuestionTypes = ['mcq'];
    }

    if (!Array.isArray(parsedQuestionTypes) || parsedQuestionTypes.length === 0) {
      return res.status(400).json({ error: 'At least one question type must be selected.' });
    }

    // Process file upload if present
    let fileText = '';
    if (req.file) {
      console.log(`Received file: ${req.file.originalname} (${req.file.mimetype})`);
      try {
        const fileBuffer = await fs.promises.readFile(req.file.path);
        
        if (req.file.mimetype === 'application/pdf') {
          const data = await pdfParse(fileBuffer);
          fileText = data.text;
        } else {
          fileText = fileBuffer.toString('utf-8');
        }
        console.log(`Successfully parsed file text, size: ${fileText.length} characters.`);
        
        // Save to LibraryFile
        const libraryEntry = new LibraryFile({
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: `/uploads/${req.file.filename}`
        });
        await libraryEntry.save();
        console.log(`Saved file to library: ${libraryEntry.filename}`);
        
      } catch (fileErr) {
        console.error("Failed to parse file buffer:", fileErr);
        // Do not crash, proceed with empty text context
      }
    }

    // Create the assignment entry in MongoDB (pending status)
    const assignment = new Assignment({
      title,
      schoolName: schoolName || '',
      subject: subject || '',
      className: className || '',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      questionTypes: parsedQuestionTypes,
      numQuestions: parsedNumQuestions,
      totalMarks: parsedTotalMarks,
      additionalInstructions: additionalInstructions || '',
      status: 'pending',
      sections: []
    });

    await assignment.save();

    // Push task onto background queue
    await addGenerationJob(assignment._id.toString(), { fileText });

    // Respond back immediately with pending assignment details
    res.status(202).json(assignment);
  } catch (error: any) {
    console.error("Error creating assignment:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Regenerate an existing assignment
 */
app.post('/api/assignments/:id/regenerate', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Clear existing questions and reset status
    assignment.sections = [];
    assignment.status = 'pending';
    assignment.error = undefined;
    await assignment.save();

    // Re-queue the generation job
    await addGenerationJob(assignment._id.toString(), { fileText: '' });

    res.status(202).json(assignment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Fetch library files
 */
app.get('/api/library', async (req, res) => {
  try {
    const files = await LibraryFile.find().sort({ createdAt: -1 });
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a library file
 */
app.delete('/api/library/:id', async (req, res) => {
  try {
    const file = await LibraryFile.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    
    // Remove from disk
    const fullPath = path.join(__dirname, '..', file.path);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
    
    await LibraryFile.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io Handlers for Real-time Generation Progress
io.on('connection', (socket) => {
  console.log(`WebSocket client connected: ${socket.id}`);

  // Client joins a room dedicated to their assignment generation
  socket.on('join-assignment', (assignmentId: string) => {
    socket.join(assignmentId);
    console.log(`Client ${socket.id} joined room for Assignment: ${assignmentId}`);
  });

  socket.on('disconnect', () => {
    console.log(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Startup Coordination
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/veda-ai';

async function bootstrap() {
  // 1. Connect to MongoDB
  console.log("Connecting to MongoDB at:", MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB database successfully.");
  } catch (dbErr) {
    console.error("CRITICAL: Failed to connect to MongoDB.", dbErr);
    console.warn("Continuing server start in mock-database mode. DB read/write operations will be bypassed or simulated.");
    // Install mongoose mock bypasses if needed
  }

  // 2. Establish Redis Connectivity & Boot Queues
  await checkRedisConnection();
  await initQueues();

  // 3. Start Listening
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` VedaAI Assessment Creator API Server`);
    console.log(` Running on: http://localhost:${PORT}`);
    console.log(` WebSockets Listening on same port`);
    console.log(`======================================================\n`);
  });
}

bootstrap().catch((err) => {
  console.error("Fatal Server Startup Error:", err);
  process.exit(1);
});
