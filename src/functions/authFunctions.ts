import * as jose from 'jose'
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextFunction, Request, Response } from 'express';
import 'dotenv/config';

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

export async function verifyJWT(token: string): Promise<boolean> {
    return (await decodeJWT(token)) !== null;
}

export async function decodeJWT(token: string): Promise<jose.JWTPayload | null> {
    try {
        const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] });
        return payload;
    } catch {
        return null;
    }
}

// Rejects requests without a valid "Authorization: Bearer <token>" header.
// On success the user's id is available as res.locals.userId.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
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
