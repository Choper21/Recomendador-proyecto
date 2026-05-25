import json
import os
import secrets
import hashlib

USERS_FILE = "usuarios.json"

def hash_password(password: str) -> str:
    """Genera un hash SHA-256 con sal aleatoria y devuelve 'salt$hash'."""
    salt = secrets.token_hex(16)
    salted = salt + password
    h = hashlib.sha256(salted.encode('utf-8')).hexdigest()
    return f"{salt}${h}"

def verify_password(password: str, stored: str) -> bool:
    """Verifica la contraseña contra un hash almacenado en formato 'salt$hash'."""
    try:
        salt, h = stored.split('$')
        return hashlib.sha256((salt + password).encode('utf-8')).hexdigest() == h
    except Exception:
        return False

def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)

def register_user(username: str, password: str):
    users = load_users()
    if any(u["username"] == username for u in users):
        return False, "El usuario ya existe"
    hashed = hash_password(password)
    users.append({"username": username, "password_hash": hashed, "token": None})
    save_users(users)
    return True, "Usuario creado"

def login_user(username: str, password: str):
    users = load_users()
    for u in users:
        if u["username"] == username and verify_password(password, u["password_hash"]):
            token = secrets.token_hex(16)
            u["token"] = token
            save_users(users)
            return token
    return None

def get_user_from_token(token: str):
    users = load_users()
    for u in users:
        if u["token"] == token:
            return u["username"]
    return None