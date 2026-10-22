import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../db/index.js';
import { registerZodSchema, loginZodSchema } from '../models/User.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

router.post('/register', validate(registerZodSchema), async (req, res) => {
  try {
    const { name, email, password, studyTimeMinutes } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({
      name,
      email,
      passwordHash,
      studyTimeMinutes: studyTimeMinutes || 30,
    });

    const { accessToken, refreshToken } = generateTokens(user._id.toString());
    res.status(201).json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', validate(loginZodSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString());
    res.json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { userId: string };
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tokens = generateTokens(user._id.toString());
    res.json(tokens);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
        academicBackground: user.academicBackground,
        studyTimeMinutes: user.studyTimeMinutes,
        skills: user.skills,
        interests: user.interests,
        profileVector: user.profileVector,
        disengagementRiskScore: user.disengagementRiskScore,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;