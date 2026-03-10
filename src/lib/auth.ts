import { sign, verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'supportflow-secret-key-change-in-production'

export interface TokenPayload {
    userId: string
    email: string
    role: string
    name: string
}

export function createToken(payload: TokenPayload): string {
    return sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        return verify(token, JWT_SECRET) as TokenPayload
    } catch {
        return null
    }
}
