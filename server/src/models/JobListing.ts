import mongoose, { Document, Schema, Types } from 'mongoose';
import { z } from 'zod';

// Zod schemas for validation
export const jobListingZodSchema = z.object({
  title: z.string().min(1).max(200),
  organization: z.string().min(1).max(200),
  type: z.enum(['corporate', 'gov_exam']),
  requiredSkills: z.array(z.string().min(1).max(50)).default([]),
  preferredSkills: z.array(z.string().min(1).max(50)).default([]),
  minQualification: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  eligibilityCriteria: z.record(z.unknown()).default({}),
  location: z.string().max(200).optional(),
  experienceYears: z.number().int().min(0).max(50).default(0),
  certifications: z.array(z.string().max(100)).default([]),
  matchVector: z.array(z.number()).length(384).optional(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
});

export type JobListingInput = z.infer<typeof jobListingZodSchema>;

// Mongoose schema
export interface IJobListing extends Document {
  title: string;
  organization: string;
  type: 'corporate' | 'gov_exam';
  requiredSkills: string[];
  preferredSkills: string[];
  minQualification?: string;
  description?: string;
  eligibilityCriteria: Record<string, unknown>;
  location?: string;
  experienceYears: number;
  certifications: string[];
  matchVector?: number[];
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const jobListingSchema = new Schema<IJobListing>({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  organization: { type: String, required: true, trim: true, maxlength: 200 },
  type: { type: String, enum: ['corporate', 'gov_exam'], required: true, index: true },
  requiredSkills: { type: [String], default: [], index: true },
  preferredSkills: { type: [String], default: [] },
  minQualification: { type: String, maxlength: 200 },
  description: { type: String, maxlength: 5000 },
  eligibilityCriteria: { type: Schema.Types.Mixed, default: {} },
  location: { type: String, maxlength: 200 },
  experienceYears: { type: Number, default: 0, min: 0, max: 50 },
  certifications: { type: [String], default: [] },
  matchVector: { type: [Number], validate: { validator: (v: number[]) => !v || v.length === 384, message: 'matchVector must be 384 dimensions' } },
  isActive: { type: Boolean, default: true, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

// Indexes
jobListingSchema.index({ type: 1, isActive: 1 });
jobListingSchema.index({ requiredSkills: 1 });
jobListingSchema.index({ title: 'text', description: 'text', organization: 'text' });

export const JobListingModel = mongoose.model<IJobListing>('JobListing', jobListingSchema);
export type JobListing = IJobListing;