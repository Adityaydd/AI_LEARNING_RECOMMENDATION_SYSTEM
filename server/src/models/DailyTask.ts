import mongoose, { Document, Schema, Types } from 'mongoose';
import { z } from 'zod';

// Zod schemas for validation
export const dailyTaskZodSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  courseId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  date: z.string().datetime().or(z.date()),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  microUnits: z.array(z.object({
    step: z.string().min(1).max(500),
    completed: z.boolean().default(false),
  })).default([]),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  estimatedMinutes: z.number().int().min(1).max(480).default(30),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).default('pending'),
  completedAt: z.date().optional(),
  generatedBy: z.enum(['ai', 'template', 'manual']).default('template'),
  metadata: z.record(z.unknown()).default({}),
});

export type DailyTaskInput = z.infer<typeof dailyTaskZodSchema>;

// Mongoose schema
export interface IDailyTask extends Document {
  userId: Types.ObjectId;
  courseId?: Types.ObjectId;
  date: Date;
  title: string;
  description?: string;
  microUnits: Array<{ step: string; completed: boolean }>;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
  generatedBy: 'ai' | 'template' | 'manual';
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const microUnitSchema = new Schema({
  step: { type: String, required: true, maxlength: 500 },
  completed: { type: Boolean, default: false },
}, { _id: false });

const dailyTaskSchema = new Schema<IDailyTask>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true },
  date: { type: Date, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, maxlength: 2000 },
  microUnits: { type: [microUnitSchema], default: [] },
  difficultyLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  estimatedMinutes: { type: Number, default: 30, min: 1, max: 480 },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'skipped'], default: 'pending', index: true },
  completedAt: { type: Date },
  generatedBy: { type: String, enum: ['ai', 'template', 'manual'], default: 'template' },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

// Compound indexes for common queries
dailyTaskSchema.index({ userId: 1, date: -1 });
dailyTaskSchema.index({ userId: 1, status: 1 });
dailyTaskSchema.index({ userId: 1, courseId: 1 });

export const DailyTaskModel = mongoose.model<IDailyTask>('DailyTask', dailyTaskSchema);
export type DailyTask = IDailyTask;