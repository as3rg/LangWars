"""Passwords are scrypt hashes; bearer session secrets are never stored in plaintext."""
import hashlib
import hmac
import secrets
import time
import unicodedata
import threading

_password_slots = threading.BoundedSemaphore(3)


def password_hash(password):
    salt = secrets.token_bytes(16)
    with _password_slots:
        digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1, dklen=32)
    return "scrypt$" + salt.hex() + "$" + digest.hex()


def password_matches(password, stored):
    try:
        _, salt, expected = stored.split("$")
        with _password_slots:
            digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1, dklen=32)
        return hmac.compare_digest(digest.hex(), expected)
    except (ValueError, TypeError):
        return False


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def normalized(text):
    return unicodedata.normalize("NFKC", text).casefold()


def prohibited(text, words):
    text = normalized(text)
    return any(normalized(word) in text for word in words if word)


def issue_session(tx, user, ttl):
    token = secrets.token_urlsafe(32)
    key = token_hash(token)
    tx.put("sessions", key, {"userId": user["id"], "expires": time.time() + ttl})
    return token


def revoke_sessions(tx, user_id):
    for row in tx.execute("SELECT id,data FROM records WHERE kind='sessions'").fetchall():
        import json
        if json.loads(row[1])["userId"] == user_id:
            tx.delete("sessions", row[0])


def public_user(user, admin=False):
    value = {key: val for key, val in user.items() if key not in {"passwordHash", "claimedNames", "lastRun", "lastSubmit"}}
    value["usedNames"] = len(user.get("claimedNames", []))
    if not admin:
        value.pop("adminNote", None)
    return value
