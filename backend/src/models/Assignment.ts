import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  id: string;
  text: string;
  options?: string[]; // MCQs
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  answerKey?: string;
}

export interface ISection {
  title: string;
  instructions: string;
  questions: IQuestion[];
}

export interface IAssignment extends Document {
  title: string;
  schoolName?: string;
  subject?: string;
  className?: string;
  dueDate?: Date;
  questionTypes: string[];
  numQuestions: number;
  totalMarks: number;
  additionalInstructions?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  sections: ISection[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  options: { type: [String], default: undefined },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  marks: { type: Number, required: true },
  answerKey: { type: String }
});

const SectionSchema = new Schema<ISection>({
  title: { type: String, required: true },
  instructions: { type: String, required: true },
  questions: [QuestionSchema]
});

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    schoolName: { type: String },
    subject: { type: String },
    className: { type: String },
    dueDate: { type: Date },
    questionTypes: { type: [String], required: true },
    numQuestions: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    additionalInstructions: { type: String },
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending'
    },
    sections: { type: [SectionSchema], default: [] },
    error: { type: String }
  },
  { timestamps: true }
);

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
