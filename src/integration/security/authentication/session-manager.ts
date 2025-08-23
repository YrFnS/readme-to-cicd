/**
 * Session Manager Implementation
 * 
 * Manages user sessions, tracks failed login attempts, and handles
 * account lockout policies for security.
 */

import { User } from '../types.js'

export interface Session {
  id: string
  token: string
  user: User
  createdAt: Date
  expiresAt: Date
  lastActivity: Date
  ipAddress?: string
  userAgent?: string
}

export interface SessionManagerConfig {
  sessionTimeout: number // in seconds
  maxLoginAttempts: number
  lockoutDuration: number // in seconds
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map()
  private failedAttempts: Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }> = new Map()
  private config: SessionManagerConfig

  constructor(config: SessionManagerConfig) {
    this.config = config
    this.startCleanupTimer()
  }

  async createSession(user: User, metadata?: { ipAddress?: string; userAgent?: string }): Promise<Session> {
    const sessionId = this.generateSessionId()
    const token = this.generateToken()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.config.sessionTimeout * 1000)

    const session: Session = {
      id: sessionId,
      token,
      user,
      createdAt: now,
      expiresAt,
      lastActivity: now,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent
    }

    this.sessions.set(token, session)
    return session
  }

  async getSession(token: string): Promise<Session | null> {
    const session = this.sessions.get(token)
    if (!session) {
      return null
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      this.sessions.delete(token)
      return null
    }

    // Update last activity
    session.lastActivity = new Date()
    return session
  }

  async refreshSession(refreshToken: string): Promise<Session | null> {
    // In a real implementation, this would validate the refresh token
    // and create a new session. For now, we'll mock it.
    
    // Find session by refresh token (simplified)
    for (const [token, session] of this.sessions.entries()) {
      if (session.id === refreshToken) {
        // Create new session
        const newSession = await this.createSession(session.user)
        // Remove old session
        this.sessions.delete(token)
        return newSession
      }
    }

    return null
  }

  async destroySession(token: string): Promise<void> {
    this.sessions.delete(token)
  }

  async destroyAllUserSessions(userId: string): Promise<void> {
    for (const [token, session] of this.sessions.entries()) {
      if (session.user.id === userId) {
        this.sessions.delete(token)
      }
    }
  }

  async recordFailedAttempt(userId: string): Promise<void> {
    const now = new Date()
    const attempts = this.failedAttempts.get(userId) || { count: 0, lastAttempt: now }

    attempts.count++
    attempts.lastAttempt = now

    // Check if account should be locked
    if (attempts.count >= this.config.maxLoginAttempts) {
      attempts.lockedUntil = new Date(now.getTime() + this.config.lockoutDuration * 1000)
    }

    this.failedAttempts.set(userId, attempts)
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    this.failedAttempts.delete(userId)
  }

  async isAccountLocked(userId: string): Promise<boolean> {
    const attempts = this.failedAttempts.get(userId)
    if (!attempts || !attempts.lockedUntil) {
      return false
    }

    // Check if lockout period has expired
    if (attempts.lockedUntil < new Date()) {
      this.failedAttempts.delete(userId)
      return false
    }

    return true
  }

  async getFailedAttempts(userId: string): Promise<number> {
    const attempts = this.failedAttempts.get(userId)
    return attempts?.count || 0
  }

  async getActiveSessions(): Promise<Session[]> {
    const now = new Date()
    const activeSessions: Session[] = []

    for (const session of this.sessions.values()) {
      if (session.expiresAt > now) {
        activeSessions.push(session)
      }
    }

    return activeSessions
  }

  async getActiveSessionsForUser(userId: string): Promise<Session[]> {
    const activeSessions = await this.getActiveSessions()
    return activeSessions.filter(session => session.user.id === userId)
  }

  async extendSession(token: string, additionalTime?: number): Promise<boolean> {
    const session = this.sessions.get(token)
    if (!session) {
      return false
    }

    const extension = additionalTime || this.config.sessionTimeout
    session.expiresAt = new Date(session.expiresAt.getTime() + extension * 1000)
    session.lastActivity = new Date()

    return true
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`
  }

  private generateToken(): string {
    // In a real implementation, this would be a cryptographically secure token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  private startCleanupTimer(): void {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions()
    }, 5 * 60 * 1000)
  }

  private cleanupExpiredSessions(): void {
    const now = new Date()
    
    // Clean up expired sessions
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(token)
      }
    }

    // Clean up expired lockouts
    for (const [userId, attempts] of this.failedAttempts.entries()) {
      if (attempts.lockedUntil && attempts.lockedUntil < now) {
        this.failedAttempts.delete(userId)
      }
    }
  }

  // Statistics and monitoring
  async getSessionStatistics(): Promise<any> {
    const activeSessions = await this.getActiveSessions()
    const uniqueUsers = new Set(activeSessions.map(s => s.user.id)).size
    const lockedAccounts = Array.from(this.failedAttempts.values())
      .filter(a => a.lockedUntil && a.lockedUntil > new Date()).length

    return {
      totalActiveSessions: activeSessions.length,
      uniqueActiveUsers: uniqueUsers,
      lockedAccounts,
      averageSessionDuration: this.calculateAverageSessionDuration(activeSessions),
      sessionsByUser: this.groupSessionsByUser(activeSessions)
    }
  }

  private calculateAverageSessionDuration(sessions: Session[]): number {
    if (sessions.length === 0) return 0

    const totalDuration = sessions.reduce((sum, session) => {
      return sum + (session.lastActivity.getTime() - session.createdAt.getTime())
    }, 0)

    return Math.round(totalDuration / sessions.length / 1000) // Return in seconds
  }

  private groupSessionsByUser(sessions: Session[]): Record<string, number> {
    const grouped: Record<string, number> = {}
    
    for (const session of sessions) {
      const userId = session.user.id
      grouped[userId] = (grouped[userId] || 0) + 1
    }

    return grouped
  }
}