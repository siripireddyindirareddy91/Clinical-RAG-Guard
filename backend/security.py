import base64, hashlib, hmac, json, os, secrets, time
from fastapi import HTTPException, Request
from database import Session, User

DEMO = os.getenv('DEMO_MODE', 'true').lower() == 'true'
SECRET = os.getenv('JWT_SECRET')
if not DEMO and (not SECRET or len(SECRET) < 32): raise RuntimeError('Set JWT_SECRET to at least 32 random characters outside demo mode')
# Ephemeral secret is intentionally invalidated on cold start without configuration.
SECRET = SECRET or secrets.token_urlsafe(48)
def password_hash(password):
    salt = secrets.token_hex(16)
    return salt + ':' + hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 310000).hex()
def password_ok(password, stored):
    salt, expected = stored.split(':')
    return hmac.compare_digest(hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 310000).hex(), expected)
def b64(data): return base64.urlsafe_b64encode(data).decode().rstrip('=')
def token(user_id):
    header = b64(b'{"alg":"HS256","typ":"JWT"}')
    payload = b64(json.dumps({'sub': user_id, 'exp': int(time.time()) + 86400}).encode())
    body = header + '.' + payload
    return body + '.' + b64(hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).digest())
def current_user(request: Request):
    raw = request.cookies.get('mv_session') or request.headers.get('authorization', '').removeprefix('Bearer ')
    try:
        header, payload, sig = raw.split('.')
        expected = b64(hmac.new(SECRET.encode(), (header+'.'+payload).encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected): raise ValueError()
        data = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
        if data['exp'] < time.time(): raise ValueError()
        with Session() as db: user = db.get(User, data['sub'])
        if not user: raise ValueError()
        return user
    except (ValueError, KeyError, TypeError): raise HTTPException(401, 'Please sign in to continue.')
