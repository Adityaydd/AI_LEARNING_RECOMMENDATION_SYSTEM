import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import TfIdf from 'natural/lib/natural/tfidf/tfidf.js';
import { AIProvider, AIProviderType } from './aiProvider.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_PROVIDER = (process.env.AI_PROVIDER as AIProviderType) || 'gemini';

// TF-IDF fallback for local embeddings
const tfidf = new TfIdf();
let tfidfDocCount = 0;

// Pre-populate TF-IDF with common tech terms for better fallback embeddings
const techCorpus = [
  'javascript typescript react node express mongodb postgresql',
  'python pandas numpy scikit-learn tensorflow pytorch',
  'docker kubernetes aws gcp azure terraform',
  'machine learning deep learning neural networks transformers',
  'frontend backend fullstack devops microservices',
  'security authentication authorization oauth jwt',
  'testing jest vitest cypress playwright',
  'git github gitlab ci cd pipeline',
];
techCorpus.forEach(doc => {
  tfidf.addDocument(doc);
  tfidfDocCount++;
});

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private embeddingModel: any = null;
  private available = false;

  constructor() {
    if (GEMINI_API_KEY && AI_PROVIDER === 'gemini') {
      try {
        this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        });
        this.embeddingModel = this.genAI.getGenerativeModel({
          model: 'gemini-embedding-001',
        });
        this.available = true;
        console.log('✅ Gemini AI provider initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Gemini provider, falling back to local:', error);
        this.available = false;
      }
    } else {
      console.log('ℹ️ Gemini API key not configured or AI_PROVIDER not set to gemini, using local fallback');
    }
  }

  private async withFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    if (!this.available) {
      return fallback();
    }
    try {
      return await operation();
    } catch (error: any) {
      // Check for rate limiting or quota errors
      if (error?.message?.includes('429') ||
          error?.message?.includes('quota') ||
          error?.message?.includes('rate limit') ||
          error?.status === 429) {
        console.warn('⚠️ Gemini rate limited, falling back to local TF-IDF');
        return fallback();
      }
      console.warn('⚠️ Gemini error, falling back to local:', error?.message || error);
      return fallback();
    }
  }

  async generateDailyTasks(
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
  }>> {
    return this.withFallback(
      async () => {
        const prompt = `
You are an AI learning coach creating personalized daily micro-tasks for a learner.

USER PROFILE:
- Interests: ${userProfile.interests.join(', ') || 'Not specified'}
- Skills: ${userProfile.skills.map(s => `${s.name} (${s.level})`).join(', ') || 'Beginner'}
- Daily Study Time: ${userProfile.studyTimeMinutes} minutes
- Background: ${userProfile.academicBackground || 'Not specified'}

COURSE: ${course.title}
- Description: ${course.description}
- Difficulty: ${course.difficulty}
- Skills Taught: ${course.skillsTaught.join(', ')}
- Modules: ${course.modules.map(m => `${m.title} (${m.durationMinutes}min)`).join('; ')}

Create 3-5 daily micro-tasks that:
1. Break down the course into achievable daily units
2. Match the user's ${userProfile.studyTimeMinutes}-minute daily budget
3. Adapt to their skill level (${userProfile.skills[0]?.level || 'beginner'})
4. Include hands-on practice, not just reading
5. Build progressively toward course completion

Return ONLY valid JSON array of tasks, each with:
- "title": brief task name
- "description": specific actionable steps (2-3 sentences)
- "durationMin": minutes to complete (total ≤ ${userProfile.studyTimeMinutes})

Example format:
[
  {"title": "Setup Development Environment", "description": "Install Node.js and VS Code. Create a new React project with Vite.", "durationMin": 30},
  {"title": "Learn React Components", "description": "Read about functional components and props. Build a simple Button component.", "durationMin": 45}
]
        `;

        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        try {
          // Extract JSON from response (handle potential markdown code blocks)
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          const jsonText = jsonMatch ? jsonMatch[0] : text;
          const tasks = JSON.parse(jsonText);

          // Validate and adjust durations
          return tasks.map((task: any) => ({
            title: task.title?.substring(0, 100) || 'Untitled Task',
            description: task.description?.substring(0, 500) || 'No description provided',
            durationMin: Math.min(Math.max(Number(task.durationMin) || 30, 5), userProfile.studyTimeMinutes),
          })).slice(0, 5);
        } catch (parseError) {
          throw new Error('Failed to parse Gemini response as JSON');
        }
      },
      async () => this.generateLocalDailyTasks(userProfile, course)
    );
  }

  private async generateLocalDailyTasks(
    userProfile: {
      interests: string[];
      skills: Array<{ name: string; level: string }>;
      studyTimeMinutes: number;
    },
    course: {
      title: string;
      skillsTaught: string[];
      modules: Array<{ title: string; durationMinutes: number }>;
    }
  ): Promise<Array<{
    title: string;
    description: string;
    durationMin: number;
  }>> {
    // Deterministic local fallback using course structure
    const tasks: Array<{ title: string; description: string; durationMin: number }> = [];
    const timePerTask = Math.floor(userProfile.studyTimeMinutes / Math.min(course.modules.length, 5));

    course.modules.slice(0, 5).forEach((module, index) => {
      const skill = course.skillsTaught[index % course.skillsTaught.length];
      tasks.push({
        title: `Day ${index + 1}: ${module.title}`,
        description: `Study ${skill} fundamentals through ${module.title}. Complete hands-on exercises and take notes on key concepts.`,
        durationMin: Math.min(timePerTask, userProfile.studyTimeMinutes),
      });
    });

    // If no modules, create generic tasks
    if (tasks.length === 0) {
      const skills = course.skillsTaught.slice(0, 3);
      skills.forEach((skill, index) => {
        tasks.push({
          title: `Learn ${skill} Basics`,
          description: `Watch tutorial on ${skill}. Complete practice exercises. Review key concepts.`,
          durationMin: userProfile.studyTimeMinutes,
        });
      });
    }

    return tasks;
  }

  async generateTextEmbeddings(text: string): Promise<number[]> {
    return this.withFallback(
      async () => {
        const result = await this.embeddingModel.embedContent(text);
        const embedding = result.embedding;
        return embedding.values;
      },
      async () => this.generateLocalEmbedding(text)
    );
  }

  private async generateLocalEmbedding(text: string): Promise<number[]> {
    // Use TF-IDF for local fallback embeddings (384-dim to match all-MiniLM-L6-v2)
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const vector = new Array(384).fill(0);

    // Add document to TF-IDF
    tfidf.addDocument(text);
    const docIndex = tfidfDocCount;
    tfidfDocCount++;

    // Get TF-IDF terms - listTerms returns array of {term, tfidf}
    const terms = tfidf.listTerms(docIndex) as Array<{ term: string; tfidf: number }>;
    terms.forEach((term, idx) => {
      if (idx < 384) {
        vector[idx] = term.tfidf;
      }
    });

    // Fill remaining dimensions with hash-based values for consistency
    words.forEach((word, idx) => {
      if (idx < 384) {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
          hash = ((hash << 5) - hash) + word.charCodeAt(i);
          hash |= 0;
        }
        vector[idx] += (hash % 1000) / 10000 * 0.1;
      }
    });

    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      return vector.map(v => v / magnitude);
    }
    return vector;
  }

  async tailorResumeBullet(
    courseTitle: string,
    skills: string[]
  ): Promise<string> {
    return this.withFallback(
      async () => {
        const prompt = `
Write a single, powerful resume bullet point for a software engineer who completed this course.

Course: ${courseTitle}
Skills gained: ${skills.join(', ')}

Requirements:
- Start with a strong action verb
- Include specific technology/skill names
- Quantify impact where possible (use reasonable estimates)
- Keep it to ONE line, max 200 characters
- Format: "Action verb + technology + context + measurable outcome"

Examples:
- "Built scalable REST APIs with Node.js/Express and PostgreSQL, reducing response time by 40%"
- "Developed React/TypeScript dashboard with real-time data visualization using WebSockets and D3.js"

Return ONLY the bullet point text, no quotes, no extra formatting.
        `;

        const result = await this.model.generateContent(prompt);
        const response = result.response;
        return response.text().trim();
      },
      async () => this.generateLocalResumeBullet(courseTitle, skills)
    );
  }

  private async generateLocalResumeBullet(
    courseTitle: string,
    skills: string[]
  ): Promise<string> {
    const actionVerbs = ['Built', 'Developed', 'Designed', 'Implemented', 'Created', 'Engineered'];
    const verb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
    const topSkills = skills.slice(0, 3).join(', ');

    return `${verb} ${courseTitle.toLowerCase()} with ${topSkills}, demonstrating proficiency in modern development practices and problem-solving`;
  }
}

// Factory function removed - use the singleton from ./index.ts instead
// import { aiProvider } from './index.js';