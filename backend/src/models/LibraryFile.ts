import mongoose, { Schema, Document } from 'mongoose';

export interface ILibraryFile extends Document {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  createdAt: Date;
}

const LibraryFileSchema = new Schema<ILibraryFile>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const LibraryFile = mongoose.model<ILibraryFile>('LibraryFile', LibraryFileSchema);
