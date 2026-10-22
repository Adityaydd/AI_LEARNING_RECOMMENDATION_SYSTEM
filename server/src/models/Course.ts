import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';

// Zod schemas for validation
export const courseZodSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  domain: z.string().min(1).max(50),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  prerequisites: z.array(z.string().max(100)).default([]),
  modules: z.array(z.object({
    title: z.string().min(1).max(200),
    content: z.string().max(50000),
    durationMinutes: z.number().int().min(1).max(480),
  })).min(1),
  skillsTaught: z.array(z.string().max(50)).default([]),
  tfidfTerms: z.record(z.number()).default({}),
  embedding: z.array(z.number()).length(384).optional(),
  eligibilityRules: z.record(z.unknown()).default({}),
});

export const courseCreateZodSchema = courseZodSchema.required();

export type CourseInput = z.infer<typeof courseZodSchema>;
export type CourseCreateInput = z.infer<typeof courseCreateZodSchema>;

// Mongoose schema
const moduleSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, maxlength: 50000 },
  durationMinutes: { type: Number, required: true, min: 1, max: 480 },
}, { _id: false });

export interface ICourse extends Document {
  title: string;
  description: string;
  domain: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  modules: Array<{ title: string; content: string; durationMinutes: number }>;
  skillsTaught: string[];
  tfidfTerms: Record<string, number>;
  embedding?: number[];
  eligibilityRules: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 5000 },
  domain: { type: String, required: true, trim: true, maxlength: 50 },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
  prerequisites: { type: [String], default: [] },
  modules: { type: [moduleSchema], required: true, validate: { validator: (v: any[]) => v.length > 0, message: 'At least one module required' } },
  skillsTaught: { type: [String], default: [] },
  tfidfTerms: { type: Schema.Types.Mixed, default: {} },
  embedding: { type: [Number], validate: { validator: (v: number[]) => !v || v.length === 384, message: 'embedding must be 384 dimensions' } },
  eligibilityRules: { type: Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

// Indexes
courseSchema.index({ domain: 1 });
courseSchema.index({ difficulty: 1 });
courseSchema.index({ skillsTaught: 1 });
courseSchema.index({ title: 'text', description: 'text' });

export const CourseModel = mongoose.model<ICourse>('Course', courseSchema);
export type Course = ICourse;