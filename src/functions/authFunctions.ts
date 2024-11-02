import * as jose from 'jose'

export async function generateJWT(userId: string): Promise<string> {
    const secret = new TextEncoder().encode(`${process.env.SECRET_KEY}`);

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