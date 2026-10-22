import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../hooks/useAuthStore';

const API_BASE_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = useAuthStore.getState().accessToken;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const { refreshToken } = useAuthStore.getState();
            if (refreshToken) {
              const response = await axios.post(
                `${API_BASE_URL}/auth/refresh`,
                { refreshToken },
                { withCredentials: true }
              );
              const { accessToken } = response.data;
              useAuthStore.getState().setAccessToken(accessToken);
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: { name: string; email: string; password: string; studyTimeMinutes: number }) {
    return this.client.post('/auth/register', data);
  }

  async login(data: { email: string; password: string }) {
    return this.client.post('/auth/login', data);
  }

  async refreshToken(refreshToken: string) {
    return this.client.post('/auth/refresh', { refreshToken });
  }

  async getMe() {
    return this.client.get('/auth/me');
  }

  // Onboarding endpoints
  async startOnboarding() {
    return this.client.post('/onboarding/start');
  }

  async answerOnboarding(data: { questionId: string; answer: string | number }) {
    return this.client.post('/onboarding/answer', data);
  }

  async completeOnboarding() {
    return this.client.post('/onboarding/complete');
  }

  // Recommendation endpoints
  async getRecommendations(userId: string, limit = 10) {
    return this.client.get(`/recommendations/${userId}`, { params: { limit } });
  }

  // Task endpoints
  async generateTasks(data: { courseId?: string; date?: string }) {
    return this.client.post(`/tasks/generate`, data);
  }

  async getTodaysTasks(userId: string) {
    return this.client.get(`/tasks/today/${userId}`);
  }

  async completeTaskUnit(taskId: string, unitIndex: number) {
    return this.client.patch(`/tasks/${taskId}/complete`, { unitIndex });
  }

  // Analytics endpoints
  async getSkillTimeline(userId: string) {
    return this.client.get(`/analytics/skill-timeline/${userId}`);
  }

  async getDisengagementRisk(userId: string) {
    return this.client.get(`/analytics/disengagement-risk/${userId}`);
  }

  // Resume endpoints
  async getResume(userId: string) {
    return this.client.get(`/resume/${userId}`);
  }

  // Job endpoints
  async getJobMatches(userId: string) {
    return this.client.get(`/jobs/matches/${userId}`);
  }

  // Interaction endpoints
  async getUserInteractions(userId: string) {
    return this.client.get(`/interactions/user/${userId}`);
  }
}

export const api = new ApiClient();

// Type exports for use in components
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'learner' | 'instructor' | 'admin';
  onboardingCompleted: boolean;
  academicBackground?: string;
  studyTimeMinutes: number;
  skills: Array<{ name: string; level: string }>;
  interests: string[];
  profileVector?: number[];
  disengagementRiskScore: number;
}

export interface Course {
  _id: string;
  title: string;
  description: string;
  domain: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  modules: Array<{ title: string; content: string; durationMinutes: number }>;
  skillsTaught: string[];
}

export interface Recommendation {
  courseId: string;
  title: string;
  domain: string;
  difficulty: string;
  matchScore: number;
  reason: string;
}

export interface DailyTask {
  _id: string;
  courseId: { _id: string; title: string; domain: string; difficulty: string };
  date: string;
  title: string;
  microUnits: Array<{ step: string; completed: boolean }>;
  difficultyLevel: string;
  estimatedMinutes: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

export interface SkillMetric {
  skill: string;
  level: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ProgressSummary {
  streak: number;
  totalHours: number;
  tier: string;
  skills: SkillMetric[];
}