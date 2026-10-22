export interface AIProvider {
  /**
   * Generate daily micro-tasks for a user based on their profile and current course
   */
  generateDailyTasks(
    userProfile: {
      interests: string[];
      skills: Array<{ name: string; level: string }>;
      studyTimeMinutes: number;
      academicBackground?: string;
    },
    course: {
      title: string;
      description: string;
      skillsTaught: string[];
      difficulty: string;
      modules: Array<{ title: string; durationMinutes: number }>;
    }
  ): Promise<Array<{
    title: string;
    description: string;
    durationMin: number;
  }>>;

  /**
   * Generate text embeddings for semantic similarity
   */
  generateTextEmbeddings(text: string): Promise<number[]>;

  /**
   * Tailor a resume bullet point for a completed course
   */
  tailorResumeBullet(
    courseTitle: string,
    skills: string[]
  ): Promise<string>;
}

export type AIProviderType = 'gemini' | 'local' | 'mock';