import * as jose from 'jose'

const secret = new TextEncoder().encode(`${process.env.SECRET_KEY}`);

export async function generateJWT(userId: string): Promise<string> {
    const payload = {
        id: userId,
        iat: Math.floor(Date.now() / 1000) // Issued at time
    };

    // Create the JWT
    const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' }) // Specify the signing algorithm
        .sign(secret); // Sign the token with the secret key

    return jwt;
}

export async function verifyJWT(token: string): Promise<boolean> {
    try {
        const { payload, protectedHeader } = await jose.jwtVerify(token, secret);
        console.log('Payload:', payload);
        console.log('Protected Header:', protectedHeader);
        return true;
    } catch (error) {
        console.error('JWT verification failed:', error);
        return false;
    }
}

export async function decodeJWT(token: string): Promise<any> {
    try {
        const { payload, protectedHeader } = await jose.jwtVerify(token, secret);
        return payload;
    } catch (error) {
        console.error('JWT decoding failed:', error);
        return null;
    }
}
