import os
import json
from collections import Counter
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Se importa el motor y la constante de columnas matemáticas que se arreglaron previamente
from recomendador import cargar_y_preparar_datos, recomendar_jugador, COLUMNAS_MATEMATICAS
from auth_utils import register_user, login_user, get_user_from_token
from logger import log_interaction
from saved_utils import add_saved_player, remove_saved_player, get_saved_players, load_all_saved

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

# Se carga el catálogo una sola vez al iniciar
df_catalogo = cargar_y_preparar_datos()

# --- Modelos ---
class PeticionRecomendacion(BaseModel):
    nombre_jugador: str
    top_n: int = 5

class UserAuth(BaseModel):
    username: str
    password: str

class PlayerAction(BaseModel):
    player_name: str

# --- Función auxiliar de estandarización ---
def empaquetar_jugador_completo(nombre_jugador, datos_extra=None):
    """
    Busca al jugador en el dataframe global y empaqueta sus datos, 
    incluyendo siempre las estadísticas matemáticas para el frontend.
    """
    jugador_fila = df_catalogo[df_catalogo["nombre"] == nombre_jugador]
    
    if jugador_fila.empty:
        # Si por alguna razón no está en el catálogo, se devuelve lo básico para no romper la UI
        base = {"nombre": nombre_jugador}
        if datos_extra:
            base.update(datos_extra)
        return base

    jugador = jugador_fila.iloc[0]
    resultado = {
        "nombre": jugador["nombre"],
        "equipo": str(jugador["equipo"]),
        "posicion": str(jugador["posicion"]),
        "edad": int(jugador["edad"]) if str(jugador["edad"]).isdigit() else 0,
        "estadisticas": {col: float(jugador[col]) for col in COLUMNAS_MATEMATICAS}
    }
    
    if datos_extra:
        resultado.update(datos_extra)
        
    return resultado

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

    searched_player = peticion.nombre_jugador  
    log_interaction(username, peticion.nombre_jugador, searched_player, resultados)

    return {"status": "success", "data": resultados}

# --- Ruta Para Ti ---
@app.get("/api/parati")
def get_parati(username: str = Depends(get_current_user)):
    interactions = []
    try:
        with open("interacciones.log", "r", encoding="utf-8") as f:
            for line in f:
                interactions.append(json.loads(line))
    except FileNotFoundError:
        return {"parati": []}

    user_queries = set()
    user_seen_players = set()
    
    for entry in interactions:
        if entry["user"] == username:
            user_queries.add(entry["search_query"].lower().strip())
            for rec in entry.get("results", []):
                user_seen_players.add(rec["nombre"].lower())

    related_users = set()
    for entry in interactions:
        if entry["user"] != username and entry["search_query"].lower().strip() in user_queries:
            related_users.add(entry["user"])

    counter = Counter()
    for entry in interactions:
        if entry["user"] in related_users:
            for rec in entry.get("results", []):
                name = rec["nombre"]
                if name.lower() not in user_seen_players:
                    counter[name] += 1

    top = counter.most_common(10)
    parati_data = []
    
    # Se utiliza la función estandarizadora en lugar del mapeo manual
    for player_name, count in top:
        jugador_enriquecido = empaquetar_jugador_completo(player_name, datos_extra={"frecuencia": count})
        parati_data.append(jugador_enriquecido)

    return {"parati": parati_data}

# --- Rutas de guardado de jugadores ---
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
    
    # Se utiliza la función estandarizadora
    for name in saved:
        jugador_enriquecido = empaquetar_jugador_completo(name)
        enriched.append(jugador_enriquecido)
        
    return {"saved": enriched}

@app.get("/api/saved-recommendations")
def get_saved_recommendations(username: str = Depends(get_current_user)):
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
    
    # Se utiliza la función estandarizadora
    for pname, freq in top:
        jugador_enriquecido = empaquetar_jugador_completo(pname, datos_extra={"frecuencia": int(freq)})
        recs.append(jugador_enriquecido)
        
    return {"recommendations": recs}

# --- Ruta de tendencias (protegida) ---
@app.get("/api/trending")
def get_trending(top_n: int = 10, username: str = Depends(get_current_user)):
    counter = Counter()
    try:
        with open("interacciones.log", "r", encoding="utf-8") as f:
            for line in f:
                entry = json.loads(line)
                for player in entry.get("results", []):
                    counter[player["nombre"]] += 1
    except FileNotFoundError:
        pass

    trending = counter.most_common(top_n)
    trend_data = []
    
    # Se utiliza la función estandarizadora
    for name, count in trending:
        jugador_enriquecido = empaquetar_jugador_completo(name, datos_extra={"apariciones": count})
        trend_data.append(jugador_enriquecido)

    return {"trending": trend_data}