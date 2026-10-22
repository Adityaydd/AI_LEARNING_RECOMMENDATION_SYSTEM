import mongoose, { Document, Schema, Types } from 'mongoose';
import { z } from 'zod';

// Zod schemas for validation
export const userZodSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  passwordHash: z.string().min(60).max(60), // bcrypt hash length
  role: z.enum(['learner', 'instructor', 'admin']).default('learner'),
  onboardingCompleted: z.boolean().default(false),
  academicBackground: z.string().max(500).optional(),
  studyTimeMinutes: z.number().int().min(5).max(480).default(30),
  skills: z.array(z.object({
    name: z.string().min(1).max(50),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  })).default([]),
  interests: z.array(z.string().max(50)).default([]),
  profileVector: z.array(z.number()).length(384).optional(),
  disengagementRiskScore: z.number().min(0).max(1).default(0),
  onboardingAnswers: z.object({
    targetDomain: z.string().optional(),
    skills: z.array(z.string()).optional(),
    studyTimeMinutes: z.number().int().min(5).max(480).optional(),
  }).optional(),
});

export const registerZodSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  studyTimeMinutes: z.number().int().min(5).max(480).default(30),
});

export const loginZodSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type UserInput = z.infer<typeof userZodSchema>;
export type RegisterInput = z.infer<typeof registerZodSchema>;
export type LoginInput = z.infer<typeof loginZodSchema>;

// Mongoose schema
const skillSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], required: true },
}, { _id: false });

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'learner' | 'instructor' | 'admin';
  onboardingCompleted: boolean;
  academicBackground?: string;
  studyTimeMinutes: number;
  skills: Array<{ name: string; level: string }>;
  interests: string[];
  profileVector?: number[];
  disengagementRiskScore: number;
  onboardingAnswers?: {
    targetDomain?: string;
    skills?: string[];
    studyTimeMinutes?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['learner', 'instructor', 'admin'], default: 'learner' },
  onboardingCompleted: { type: Boolean, default: false },
  academicBackground: { type: String, maxlength: 500 },
  studyTimeMinutes: { type: Number, default: 30, min: 5, max: 480 },
  skills: { type: [skillSchema], default: [] },
  interests: { type: [String], default: [] },
  profileVector: { type: [Number], validate: { validator: (v: number[]) => v == null || (Array.isArray(v) && v.length === 0) || (v.length === 384), message: 'profileVector must be 384 dimensions' } },
  disengagementRiskScore: { type: Number, default: 0, min: 0, max: 1 },
  onboardingAnswers: {
    targetDomain: { type: String },
    skills: { type: [String] },
    studyTimeMinutes: { type: Number, min: 5, max: 480 },
  },
}, {
  timestamps: true,
});

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ onboardingCompleted: 1 });
userSchema.index({ 'skills.name': 1 });
userSchema.index({ interests: 1 });

// Virtual for safe user object (excludes password)
userSchema.virtual('safeUser').get(function(this: IUser) {
  const { passwordHash, ...rest } = this.toObject();
  return rest;
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export const UserModel = mongoose.model<IUser>('User', userSchema);
export type User = IUser;