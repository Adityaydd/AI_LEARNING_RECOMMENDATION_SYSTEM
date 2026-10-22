import mongoose, { Document, Schema, Types } from 'mongoose';
import { z } from 'zod';

// Zod schemas for validation
export const interactionZodSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  courseId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  interactionType: z.enum(['view', 'enroll', 'start', 'complete', 'rate', 'bookmark']),
  timeSpentMinutes: z.number().int().min(0).default(0),
  completionStatus: z.enum(['not_started', 'in_progress', 'completed', 'dropped']).default('not_started'),
  assessmentScores: z.array(z.number().min(0).max(100)).default([]),
  rating: z.number().min(1).max(5).optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type InteractionInput = z.infer<typeof interactionZodSchema>;

// Mongoose schema
export interface IInteraction extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  interactionType: 'view' | 'enroll' | 'start' | 'complete' | 'rate' | 'bookmark';
  timeSpentMinutes: number;
  completionStatus: 'not_started' | 'in_progress' | 'completed' | 'dropped';
  assessmentScores: number[];
  rating?: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const interactionSchema = new Schema<IInteraction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  interactionType: {
    type: String,
    enum: ['view', 'enroll', 'start', 'complete', 'rate', 'bookmark'],
    required: true
  },
  timeSpentMinutes: { type: Number, default: 0, min: 0 },
  completionStatus: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'dropped'],
    default: 'not_started'
  },
  assessmentScores: { type: [Number], default: [] },
  rating: { type: Number, min: 1, max: 5 },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

// Compound indexes for common queries
interactionSchema.index({ userId: 1, courseId: 1 }, { unique: true });
interactionSchema.index({ userId: 1, createdAt: -1 });
interactionSchema.index({ courseId: 1, completionStatus: 1 });
interactionSchema.index({ userId: 1, interactionType: 1 });

export const InteractionModel = mongoose.model<IInteraction>('Interaction', interactionSchema);
export type Interaction = IInteraction;