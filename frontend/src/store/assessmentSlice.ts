
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IQuestion {
  id: string;
  text: string;
  options?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  answerKey?: string;
}

export interface ISection {
  title: string;
  instructions: string;
  questions: IQuestion[];
}

export interface IAssignment {
  _id: string;
  title: string;
  schoolName?: string;
  subject?: string;
  className?: string;
  dueDate?: string;
  questionTypes: string[];
  numQuestions: number;
  totalMarks: number;
  additionalInstructions?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  sections: ISection[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IGenerationProgress {
  assignmentId: string;
  message: string;
  progress: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  result?: IAssignment;
}

interface AssessmentState {
  list: IAssignment[];
  current: IAssignment | null;
  loading: boolean;
  error: string | null;
  generationJob: {
    assignmentId: string | null;
    status: 'idle' | 'pending' | 'generating' | 'completed' | 'failed';
    progress: number;
    message: string;
  };
}

const initialState: AssessmentState = {
  list: [],
  current: null,
  loading: false,
  error: null,
  generationJob: {
    assignmentId: null,
    status: 'idle',
    progress: 0,
    message: ''
  }
};

export const assessmentSlice = createSlice({
  name: 'assessment',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setAssignments: (state, action: PayloadAction<IAssignment[]>) => {
      state.list = action.payload;
    },
    addAssignmentToList: (state, action: PayloadAction<IAssignment>) => {
      state.list.unshift(action.payload);
    },
    setCurrentAssignment: (state, action: PayloadAction<IAssignment | null>) => {
      state.current = action.payload;
    },
    startGenerationJob: (state, action: PayloadAction<string>) => {
      state.generationJob = {
        assignmentId: action.payload,
        status: 'pending',
        progress: 0,
        message: 'Job submitted to backend queue...'
      };
    },
    updateGenerationProgress: (state, action: PayloadAction<IGenerationProgress>) => {
      const { assignmentId, progress, message, status, result } = action.payload;
      
      if (state.generationJob.assignmentId === assignmentId) {
        state.generationJob.progress = progress;
        state.generationJob.message = message;
        state.generationJob.status = status;
      }

      if (status === 'completed' && result) {
        state.current = result;
        // Update list entry as well
        const idx = state.list.findIndex(item => item._id === result._id);
        if (idx !== -1) {
          state.list[idx] = result;
        } else {
          state.list.unshift(result);
        }
      }
    },
    clearGenerationJob: (state) => {
      state.generationJob = {
        assignmentId: null,
        status: 'idle',
        progress: 0,
        message: ''
      };
    }
  }
});

export const {
  setLoading,
  setError,
  setAssignments,
  addAssignmentToList,
  setCurrentAssignment,
  startGenerationJob,
  updateGenerationProgress,
  clearGenerationJob
} = assessmentSlice.actions;

export default assessmentSlice.reducer;
