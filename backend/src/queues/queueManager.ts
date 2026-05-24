import { Queue, Worker, Job } from 'bullmq';
import { getIsRedisAvailable, redisConfig } from '../config/redis';
import { Assignment } from '../models/Assignment';
import { generateAssessment } from '../services/aiService';
import { Server } from 'socket.io';

const QUEUE_NAME = 'assessment-generation';

let bullQueue: Queue | null = null;
let bullWorker: Worker | null = null;
let ioInstance: Server | null = null;

// Temporary in-memory queue for offline fallback
const fallbackQueue: Array<{ id: string; data: any }> = [];

export function setSocketIO(io: Server) {
  ioInstance = io;
}

/**
 * Emit real-time status updates via WebSockets
 */
function emitProgress(assignmentId: string, message: string, progressPercent: number, status: 'generating' | 'completed' | 'failed' = 'generating', result?: any) {
  if (ioInstance) {
    ioInstance.to(assignmentId).emit('generation-progress', {
      assignmentId,
      message,
      progress: progressPercent,
      status,
      result
    });
    console.log(`[Socket Broadcast] Job ${assignmentId}: ${message} (${progressPercent}%)`);
  }
}

/**
 * The actual business logic for generating an assessment.
 * Shared by both BullMQ and Fallback systems.
 */
async function processGenerationJob(assignmentId: string, jobData: any) {
  console.log(`Starting generation job for Assignment: ${assignmentId}`);
  
  // 1. Update DB state to generating
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new Error(`Assignment ${assignmentId} not found in database.`);
  }

  assignment.status = 'generating';
  await assignment.save();
  emitProgress(assignmentId, "Connecting to AI Generation Engine...", 5);

  try {
    // 2. Trigger AI Generation with real-time progress callbacks
    const result = await generateAssessment({
      title: assignment.title,
      questionTypes: assignment.questionTypes,
      numQuestions: assignment.numQuestions,
      totalMarks: assignment.totalMarks,
      additionalInstructions: assignment.additionalInstructions,
      fileText: jobData.fileText
    }, (message, percent) => {
      emitProgress(assignmentId, message, percent);
    });

    // 3. Save result back to MongoDB
    assignment.status = 'completed';
    assignment.sections = result.sections;
    await assignment.save();

    // 4. Dispatch finished event with payload
    emitProgress(assignmentId, "Assessment generated successfully!", 100, 'completed', assignment);
    console.log(`Completed job for Assignment: ${assignmentId}`);
  } catch (error: any) {
    console.error(`Error processing job for assignment ${assignmentId}:`, error);
    assignment.status = 'failed';
    assignment.error = error?.message || 'Unknown generation error';
    await assignment.save();

    emitProgress(assignmentId, `Generation failed: ${assignment.error}`, 100, 'failed');
  }
}

/**
 * Initializes the background queue systems
 */
export async function initQueues() {
  const redisAvailable = getIsRedisAvailable();

  if (redisAvailable) {
    console.log("Initializing BullMQ background worker system...");
    
    // Create BullMQ queue
    bullQueue = new Queue(QUEUE_NAME, {
      connection: redisConfig.connection as any
    });

    // Create BullMQ worker
    bullWorker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        const { assignmentId, fileText } = job.data;
        await processGenerationJob(assignmentId, { fileText });
      },
      {
        connection: redisConfig.connection as any,
        concurrency: 1
      }
    );

    bullWorker.on('failed', (job, err) => {
      console.error(`BullMQ job ${job?.id} failed with error:`, err);
    });

    console.log("BullMQ active and listening on channel:", QUEUE_NAME);
  } else {
    console.log("Fallback Queue system active. No background Redis server required.");
  }
}

/**
 * Pushes a new generation task onto the background queue
 */
export async function addGenerationJob(assignmentId: string, data: { fileText?: string }) {
  const redisAvailable = getIsRedisAvailable();

  if (redisAvailable && bullQueue) {
    console.log(`Pushing job to BullMQ queue for assignment: ${assignmentId}`);
    await bullQueue.add(`generate-${assignmentId}`, {
      assignmentId,
      fileText: data.fileText
    }, {
      removeOnComplete: true,
      removeOnFail: true
    });
  } else {
    console.log(`Scheduling in-memory deferred fallback execution for assignment: ${assignmentId}`);
    
    // Simulate background process asynchronously using setTimeout
    setTimeout(async () => {
      try {
        await processGenerationJob(assignmentId, data);
      } catch (err) {
        console.error("Deferred fallback job crashed:", err);
      }
    }, 500);
  }
}
