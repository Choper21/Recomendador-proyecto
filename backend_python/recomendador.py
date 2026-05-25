import json
import pandas as pd
import unicodedata
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler

# ------------------------------------------------------------
# 1. Definir las columnas matemáticas UNA SOLA VEZ
# ------------------------------------------------------------
COLUMNAS_MATEMATICAS = [
    'edad', 'partidos_jugados', 'titularidades', 'minutos_jugados',
    'goles', 'asistencias', 'intercepciones', 'tackles_won',
    'crosses', 'ppm', 'faltas_cometidas'
]

def limpiar_texto(texto):
    return unicodedata.normalize('NFKD', str(texto)).encode('ASCII', 'ignore').decode('utf-8').lower()

def cargar_y_preparar_datos():
    with open('jugadores_catalogo.json', 'r', encoding='utf-8') as f:
        datos = json.load(f)
    df = pd.DataFrame(datos)
    
    # Limpiar 'edad': tomar solo el número antes del guion
    df['edad'] = df['edad'].astype(str).str.split('-').str[0]
    
    # Convertir TODAS las columnas matemáticas a numérico (manejar comas y nulos)
    for col in COLUMNAS_MATEMATICAS:
        # Asegurarse de que la columna existe
        if col in df.columns:
            df[col] = df[col].astype(str).str.replace(',', '')
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        else:
            # Si alguna falta (por ejemplo en un catálogo incompleto), la creamos con 0
            df[col] = 0.0
    
    # Filtrar jugadores con pocos minutos (> 400)
    df = df[df['minutos_jugados'] > 400].reset_index(drop=True)
    
    # Crear columna de búsqueda normalizada
    df['nombre_busqueda'] = df['nombre'].apply(limpiar_texto)
    return df

def recomendar_jugador(nombre_objetivo, df, top_n=5):
    busqueda_limpia = limpiar_texto(nombre_objetivo)
    idx_lista = df.index[df['nombre_busqueda'].str.contains(busqueda_limpia)].tolist()
    
    if not idx_lista:
        return "Error: Jugador no encontrado en el catálogo."
        
    idx_objetivo = idx_lista[0]
    jugador_base = df.iloc[idx_objetivo]
    
    # Posiciones del jugador buscado (puede tener varias separadas por coma)
    posiciones_base = str(jugador_base['posicion']).split(',')
    
    # Escalar las columnas matemáticas
    scaler = MinMaxScaler()
    df_escalado = pd.DataFrame(
        scaler.fit_transform(df[COLUMNAS_MATEMATICAS]),
        columns=COLUMNAS_MATEMATICAS
    )
    
    # Similitud del coseno
    matriz_similitud = cosine_similarity(df_escalado)
    puntajes_similitud = matriz_similitud[idx_objetivo]
    
    resultados = []
    for i, score in enumerate(puntajes_similitud):
        if i == idx_objetivo:
            continue   # Saltar al mismo jugador
        
        jugador = df.iloc[i]
        
        # Verificar que comparten al menos una posición
        posiciones_evaluado = str(jugador['posicion']).split(',')
        if not any(pos in posiciones_evaluado for pos in posiciones_base):
            continue
        
        boost_aplicado = False
        score_final = score
        
        # Boost por juventud (potencial de reventa)
        if jugador['edad'] <= 23:
            score_final = score * 1.15
            boost_aplicado = True
        
        resultados.append({
            'nombre': jugador['nombre'],
            'equipo': jugador['equipo'],
            'posicion': jugador['posicion'],
            'similitud_base': round(score * 100, 1),
            'score_final': round(score_final * 100, 1),
            'boost_aplicado': boost_aplicado,
            'edad': int(jugador['edad'])
        })
    
    # Ordenar por score final y tomar top_n
    resultados = sorted(resultados, key=lambda x: x['score_final'], reverse=True)[:top_n]
    
    # Agregar explicación "caja blanca"
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