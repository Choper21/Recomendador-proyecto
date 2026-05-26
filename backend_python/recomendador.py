import json
import pandas as pd
import unicodedata
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler

# ------------------------------------------------------------
# 1. Defino las columnas matemáticas UNA SOLA VEZ para evitar errores de tipeo
# ------------------------------------------------------------
COLUMNAS_MATEMATICAS = [
    'edad', 'partidos_jugados', 'titularidades', 'minutos_jugados',
    'goles', 'asistencias', 'intercepciones', 'tackles_won',
    'crosses', 'ppm', 'faltas_cometidas'
]

def limpiar_texto(texto):
    # Quito acentos y paso todo a minúsculas para que mis búsquedas no fallen por tildes
    return unicodedata.normalize('NFKD', str(texto)).encode('ASCII', 'ignore').decode('utf-8').lower()

def cargar_y_preparar_datos():
    # Cargo mi catálogo de jugadores
    with open('jugadores_catalogo.json', 'r', encoding='utf-8') as f:
        datos = json.load(f)
    df = pd.DataFrame(datos)
    
    # Limpio la edad: si viene como "25-algo", me quedo solo con el 25
    df['edad'] = df['edad'].astype(str).str.split('-').str[0]
    
    # Convierto TODAS mis columnas matemáticas a numérico
    for col in COLUMNAS_MATEMATICAS:
        if col in df.columns:
            # Quito las comas de los miles por si acaso
            df[col] = df[col].astype(str).str.replace(',', '')
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        else:
            # Si en mi JSON falta alguna columna, la creo en 0 para que no crashee el escalador
            df[col] = 0.0
    
    # Filtro a los que tienen muy pocos minutos para no ensuciar mis estadísticas
    df = df[df['minutos_jugados'] > 400].reset_index(drop=True)
    
    # Creo una columna de búsqueda normalizada con la función de arriba
    df['nombre_busqueda'] = df['nombre'].apply(limpiar_texto)
    return df

def recomendar_jugador(nombre_objetivo, df, top_n=5):
    busqueda_limpia = limpiar_texto(nombre_objetivo)
    idx_lista = df.index[df['nombre_busqueda'].str.contains(busqueda_limpia)].tolist()
    
    if not idx_lista:
        return "Error: Jugador no encontrado en el catálogo."
        
    idx_objetivo = idx_lista[0]
    jugador_base = df.iloc[idx_objetivo]
    
    # Guardo las posiciones de mi jugador base separándolas por coma
    posiciones_base = str(jugador_base['posicion']).split(',')
    
    # Escalo mis columnas para que los minutos jugados no aplasten a los goles (todo de 0 a 1)
    scaler = MinMaxScaler()
    df_escalado = pd.DataFrame(
        scaler.fit_transform(df[COLUMNAS_MATEMATICAS]),
        columns=COLUMNAS_MATEMATICAS
    )
    
    # Aplico similitud del coseno para ver qué tan parecidos son matemáticamente
    matriz_similitud = cosine_similarity(df_escalado)
    puntajes_similitud = matriz_similitud[idx_objetivo]
    
    resultados = []
    for i, score in enumerate(puntajes_similitud):
        if i == idx_objetivo:
            continue   # Me salto a mi mismo jugador
        
        jugador = df.iloc[i]
        
        # Verifico que compartan al menos una posición, si no, lo descarto
        posiciones_evaluado = str(jugador['posicion']).split(',')
        if not any(pos in posiciones_evaluado for pos in posiciones_base):
            continue
        
        boost_aplicado = False
        score_final = score
        
        # Le meto mi regla de negocio: si es joven (<= 23), le doy un boost del 15% por potencial de reventa
        if jugador['edad'] <= 23:
            score_final = score * 1.15
            boost_aplicado = True
        
        # Empaqueto mi resultado
        resultados.append({
            'nombre': jugador['nombre'],
            'equipo': jugador['equipo'],
            'posicion': jugador['posicion'],
            'similitud_base': round(score * 100, 1),
            'score_final': round(score_final * 100, 1),
            'boost_aplicado': boost_aplicado,
            'edad': int(jugador['edad']),
            # AQUI EXTRAIGO TODAS LAS ESTADÍSTICAS: Hago un diccionario dinámico iterando sobre mi array de columnas
            # Esto es lo que me va a pintar los números en el Modal de React
            'estadisticas': {col: float(jugador[col]) for col in COLUMNAS_MATEMATICAS}
        })
    
    # Ordeno de mayor a menor y saco mi Top N
    resultados = sorted(resultados, key=lambda x: x['score_final'], reverse=True)[:top_n]
    
    # Le pego mi justificación de caja blanca para que el usuario entienda la recomendación
    for res in resultados:
        explicacion = (
            f"Recomendado por un {res['similitud_base']}% de similitud estadística general "
            f"con {jugador_base['nombre']} compartiendo zona del campo."
        )
        if res['boost_aplicado']:
            explicacion += (
                f" [BOOST ACTIVO]: Priorizado por la regla de 'Alto Potencial de Reventa' "
                f"(Edad: {res['edad']})."
            )
        res['explicacion_caja_blanca'] = explicacion
    
    return resultados