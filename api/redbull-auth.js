import crypto from 'crypto';

const EXPECTED_HASH_HEX = '5d82836a18b4b0d6d81e79df5e65a46eaafe36f1fc580b4789e08bb49960eb3d';

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    try {
        const body = typeof req.body === 'string'
            ? JSON.parse(req.body || '{}')
            : (req.body || {});
        const candidate = typeof body.password === 'string' ? body.password.trim() : '';

        if (!candidate) {
            return res.status(400).json({ ok: false, error: 'Password is required' });
        }

        const expectedHash = process.env.REDBULL_PORTAL_PASSWORD
            ? crypto.createHash('sha256').update(process.env.REDBULL_PORTAL_PASSWORD).digest('hex')
            : EXPECTED_HASH_HEX;

        const actualBuf = Buffer.from(crypto.createHash('sha256').update(candidate).digest('hex'), 'utf8');
        const expectedBuf = Buffer.from(expectedHash, 'utf8');

        const isValid = actualBuf.length === expectedBuf.length && crypto.timingSafeEqual(actualBuf, expectedBuf);

        if (!isValid) {
            return res.status(401).json({ ok: false, error: 'Invalid password' });
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(400).json({ ok: false, error: 'Invalid request' });
    }
}
