import * as jose from 'jose'
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextFunction, Request, Response } from 'express';
import '../env.js';
import { eq } from 'drizzle-orm';
import { db } from '../db/database.js';
import { admins } from '../db/schema.js';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;
const TOKEN_LIFETIME = '7d';

if (!process.env.SECRET_KEY) {
    throw new Error('SECRET_KEY is not set. Add it to .env (or `fly secrets set SECRET_KEY=...` in production).');
}
const secret = new TextEncoder().encode(process.env.SECRET_KEY);

// Stored as "scrypt$<salt hex>$<hash hex>".
export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const hash = await scryptAsync(password, salt, KEY_LENGTH);
    return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const [algorithm, saltHex, hashHex] = stored.split('$');
    if (algorithm !== 'scrypt' || !saltHex || !hashHex) {
        return false;
    }
    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
    return timingSafeEqual(actual, expected);
}

export async function generateJWT(userId: string): Promise<string> {
    return new jose.SignJWT({ id: userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(TOKEN_LIFETIME)
        .sign(secret);
}

async function decodeJWT(token: string): Promise<jose.JWTPayload | null> {
    try {
        const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] });
        return payload;
    } catch {
        return null;
    }
}

// Rejects requests without a valid "Authorization: Bearer <token>" header.
// On success the user's id is available as res.locals.userId.
export async function requireAuth<P>(req: Request<P>, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    const payload = token ? await decodeJWT(token) : null;
    if (payload === null || typeof payload.id !== 'string') {
        res.status(401).send({ message: 'Missing or invalid token.' });
        return;
    }
    res.locals.userId = payload.id;
    next();
}

const ATTEMPT_LIMIT = 20;
const attempts = new Map<string, number>();
setInterval(() => attempts.clear(), 60_000).unref();

// Slows down password guessing on login and sign-up: each IP gets ATTEMPT_LIMIT tries per route per minute.
// shortcut: counts live in this process, so they reset on restart and aren't shared between machines.
// Move them to a shared store (or Fly's proxy) if we run more than one machine.
export function rateLimit(req: Request, res: Response, next: NextFunction) {
    // Behind Fly's proxy req.ip is the proxy's address; Fly sends the real client's in this header.
    const key = `${req.path} ${req.headers['fly-client-ip'] ?? req.ip}`;
    const count = (attempts.get(key) ?? 0) + 1;
    attempts.set(key, count);
    if (count > ATTEMPT_LIMIT) {
        res.status(429).send({ message: 'Too many attempts. Try again in a minute.' });
        return;
    }
    next();
}

export async function isAdmin(userId: string): Promise<boolean> {
    const [admin] = await db.select({ user_id: admins.user_id }).from(admins).where(eq(admins.user_id, userId));
    return admin !== undefined;
}

// Use after requireAuth. Rejects users who aren't in the Admins table.
export async function requireAdmin<P>(req: Request<P>, res: Response, next: NextFunction) {
    if (!(await isAdmin(res.locals.userId))) {
        res.status(403).send({ message: 'Only admins can do this.' });
        return;
    }
    next();
}
