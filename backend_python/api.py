from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from recomendador import cargar_y_preparar_datos, recomendar_jugador
from auth_utils import register_user, login_user, get_user_from_token
from logger import log_interaction
from saved_utils import add_saved_player, remove_saved_player, get_saved_players
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from collections import Counter

app = FastAPI(title="API de Scouting")

class ForceCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

app.add_middleware(ForceCORSMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas las conexiones (en producción se restringe)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Cargar catálogo una vez
df_catalogo = cargar_y_preparar_datos()

# --- Modelos ---
class PeticionRecomendacion(BaseModel):
    nombre_jugador: str
    top_n: int = 5
class UserAuth(BaseModel):
    username: str
    password: str
# --- Dependencia de autenticación ---
def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    token = authorization.split(" ")[1]
    username = get_user_from_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Token inválido")
    return username

# --- Rutas de autenticación ---

@app.post("/register")
def register(user: UserAuth):
    ok, msg = register_user(user.username, user.password)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"msg": msg}

@app.post("/login")
def login(user: UserAuth):
    token = login_user(user.username, user.password)
    if not token:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return {"access_token": token, "token_type": "bearer"}


# --- Ruta de recomendación (protegida, registra en log) ---
@app.post("/api/recomendar")
def obtener_recomendacion(peticion: PeticionRecomendacion, username: str = Depends(get_current_user)):
    resultados = recomendar_jugador(peticion.nombre_jugador, df_catalogo, peticion.top_n)
    if isinstance(resultados, str) and resultados.startswith("Error"):
        raise HTTPException(status_code=404, detail=resultados)

    # Determinar el nombre del jugador buscado (el que se encontró en el catálogo)
    # La función recomendar_jugador ya devuelve el nombre real, podemos tomarlo del primer resultado.
    searched_player = peticion.nombre_jugador  # por simplicidad, guardamos el input
    # Si quieres el nombre exacto del catálogo, puedes extraerlo de los resultados:
    # Ejemplo: si los resultados contienen al jugador base, añádelo a la función.
    log_interaction(username, peticion.nombre_jugador, searched_player, resultados)

    return {"status": "success", "data": resultados}
def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, "r") as f:
        content = f.read().strip()
        if not content:
            return []
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Si el archivo está corrupto, lo reiniciamos
            return []
        
@app.get("/api/parati")
def get_parati(username: str = Depends(get_current_user)):
    from collections import Counter
    import json

    # Leer todas las interacciones
    interactions = []
    try:
        with open("interacciones.log", "r", encoding="utf-8") as f:
            for line in f:
                interactions.append(json.loads(line))
    except FileNotFoundError:
        return {"parati": []}

    # Jugadores que ha buscado el usuario actual
    user_queries = set()
    user_seen_players = set()  # jugadores que ya ha visto en sus resultados
    for entry in interactions:
        if entry["user"] == username:
            user_queries.add(entry["search_query"].lower().strip())
            for rec in entry.get("results", []):
                user_seen_players.add(rec["nombre"].lower())

    # Usuarios afines (que buscaron al menos un jugador en común)
    related_users = set()
    for entry in interactions:
        if entry["user"] != username and entry["search_query"].lower().strip() in user_queries:
            related_users.add(entry["user"])

    # Contar jugadores recomendados a esos usuarios afines
    counter = Counter()
    for entry in interactions:
        if entry["user"] in related_users:
            for rec in entry.get("results", []):
                name = rec["nombre"]
                if name.lower() not in user_seen_players:
                    counter[name] += 1

    # Top 10
    top = counter.most_common(10)
    parati_data = []
    for player_name, count in top:
        jug = df_catalogo[df_catalogo["nombre"] == player_name]
        if not jug.empty:
            jug = jug.iloc[0]
            parati_data.append({
                "nombre": player_name,
                "equipo": jug["equipo"],
                "posicion": jug["posicion"],
                "frecuencia": count
            })
        else:
            parati_data.append({"nombre": player_name, "frecuencia": count})

    return {"parati": parati_data}


# --- Rutas de guardado de jugadores ---
class PlayerAction(BaseModel):
    player_name: str

@app.post("/api/save-player")
def save_player(action: PlayerAction, username: str = Depends(get_current_user)):
    ok = add_saved_player(username, action.player_name)
    if not ok:
        raise HTTPException(status_code=409, detail="El jugador ya está guardado")
    return {"msg": f"Jugador {action.player_name} guardado"}

@app.delete("/api/save-player")
def unsave_player(action: PlayerAction, username: str = Depends(get_current_user)):
    ok = remove_saved_player(username, action.player_name)
    if not ok:
        raise HTTPException(status_code=404, detail="El jugador no estaba guardado")
    return {"msg": f"Jugador {action.player_name} eliminado de guardados"}

@app.get("/api/saved-players")
def list_saved_players(username: str = Depends(get_current_user)):
    saved = get_saved_players(username)
    enriched = []
    for name in saved:
        jug = df_catalogo[df_catalogo["nombre"] == name]
        if not jug.empty:
            j = jug.iloc[0]
            enriched.append({
                "nombre": name,
                "equipo": str(j["equipo"]),
                "posicion": str(j["posicion"]),
                "edad": str(j["edad"])   # ya es string, pero por si acaso
            })
        else:
            enriched.append({"nombre": name})
    return {"saved": enriched}
@app.get("/api/saved-recommendations")
def get_saved_recommendations(username: str = Depends(get_current_user)):
    from saved_utils import load_all_saved
    from collections import Counter
    all_saved = load_all_saved()
    my_saved = set(all_saved.get(username, []))
    counter = Counter()
    for user, saved in all_saved.items():
        if user == username:
            continue
        if my_saved.intersection(saved):
            for p in saved:
                if p not in my_saved:
                    counter[p] += 1
    top = counter.most_common(10)
    recs = []
    for pname, freq in top:
        jug = df_catalogo[df_catalogo["nombre"] == pname]
        if not jug.empty:
            j = jug.iloc[0]
            recs.append({
                "nombre": pname,
                "equipo": str(j["equipo"]),
                "posicion": str(j["posicion"]),
                "frecuencia": int(freq)   # convertir a int nativo
            })
        else:
            recs.append({
                "nombre": pname,
                "frecuencia": int(freq)
            })
    return {"recommendations": recs}


# --- Ruta de tendencias (protegida) ---
@app.get("/api/trending")
def get_trending(top_n: int = 10, username: str = Depends(get_current_user)):
    from collections import Counter
    import json

    counter = Counter()
    try:
        with open("interacciones.log", "r", encoding="utf-8") as f:
            for line in f:
                entry = json.loads(line)
                # Solo contamos jugadores que aparecen en "results" (cada uno es un dict con "nombre")
                for player in entry.get("results", []):
                    counter[player["nombre"]] += 1
    except FileNotFoundError:
        pass

    trending = counter.most_common(top_n)
    trend_data = []
    for name, count in trending:
        # Buscar info extra en el catálogo
        jug = df_catalogo[df_catalogo["nombre"] == name]
        if not jug.empty:
            jug = jug.iloc[0]
            trend_data.append({
                "nombre": name,
                "equipo": jug["equipo"],
                "posicion": jug["posicion"],
                "apariciones": count
            })
        else:
            trend_data.append({"nombre": name, "apariciones": count})

    return {"trending": trend_data}