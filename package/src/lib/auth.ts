import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from './db';

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export async function registerUser(email: string, password: string, name: string): Promise<AuthResponse> {
  try {
    // Check if user already exists
    const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return {
        success: false,
        message: 'User with this email already exists',
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await dbRun(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name]
    );

    const newUser = await dbGet('SELECT id, email, name, created_at FROM users WHERE id = ?', [result.lastID]);

    return {
      success: true,
      message: 'User registered successfully',
      user: newUser as User,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: 'Registration failed',
    };
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  try {
    // Find user by email
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.NEXTAUTH_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'Login successful',
      user: userWithoutPassword as User,
      token,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Login failed',
    };
  }
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'your-secret-key') as { userId: number; email: string };

    const user = await dbGet('SELECT id, email, name, created_at FROM users WHERE id = ?', [decoded.userId]);

    return user as User;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}