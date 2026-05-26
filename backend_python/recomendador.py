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
    posiciones_base = str(jugador_base['posicion']).split(',')
    
    # 1. ESCALADO ESTÁNDAR
    scaler = MinMaxScaler()
    df_escalado = pd.DataFrame(
        scaler.fit_transform(df[COLUMNAS_MATEMATICAS]),
        columns=COLUMNAS_MATEMATICAS
    )
    
    # 2. PONDERACIÓN DE VARIABLES (PESOS)
    # Le damos más multiplicador a las stats que definen a un jugador bueno
    pesos_estadisticas = {
        'edad': 0.5,                # La edad como métrica pura importa poco para el estilo de juego
        'partidos_jugados': 0.8,
        'titularidades': 0.8,
        'minutos_jugados': 0.8,     # Importante para volumen, pero no define la calidad
        'goles': 2.5,               # IMPACTO ALTO
        'asistencias': 2.5,         # IMPACTO ALTO
        'intercepciones': 1.5,
        'tackles_won': 1.5,
        'crosses': 1.2,
        'ppm': 2.0,                 # Puntos Por Partido: Indica si su equipo gana cuando él juega 
        'faltas_cometidas': 0.3     # Ruido estadístico, peso muy bajo
    }
    
    # Multiplicamos el dataframe escalado por nuestros pesos
    for col in COLUMNAS_MATEMATICAS:
        if col in pesos_estadisticas:
            df_escalado[col] = df_escalado[col] * pesos_estadisticas[col]
            
    # 3. CÁLCULO DE SIMILITUD (Ahora con datos ponderados)
    matriz_similitud = cosine_similarity(df_escalado)
    puntajes_similitud = matriz_similitud[idx_objetivo]
    
    resultados = []
    for i, score in enumerate(puntajes_similitud):
        if i == idx_objetivo:
            continue
            
        jugador = df.iloc[i]
        posiciones_evaluado = str(jugador['posicion']).split(',')
        
        if not any(pos in posiciones_evaluado for pos in posiciones_base):
            continue
            
        boost_aplicado = False
        score_final = score
        
        # 4. UMBRAL DEL 90% Y BOOST DEL 5%
        # Solo consideramos el bono si el jugador ya demostró ser una "Gema" (>= 0.90) y es joven
        if jugador['edad'] <= 23 and score >= 0.90:
            score_final = score * 1.05  # Boost realista del 5%
            boost_aplicado = True
            
        resultados.append({
            'nombre': jugador['nombre'],
            'equipo': jugador['equipo'],
            'posicion': jugador['posicion'],
            'similitud_base': round(score * 100, 1),
            'score_final': round(score_final * 100, 1),
            'boost_aplicado': boost_aplicado,
            'edad': int(jugador['edad']),
            'estadisticas': {col: float(jugador[col]) for col in COLUMNAS_MATEMATICAS}
        })
        
    # Ordeno de mayor a menor y saco mi Top N
    resultados = sorted(resultados, key=lambda x: x['score_final'], reverse=True)[:top_n]
    
    # Diccionario para traducir las columnas técnicas a texto elegante para tu Modal/UI
    traduccion_stats = {
        'goles': 'Goles',
        'asistencias': 'Asistencias',
        'intercepciones': 'Intercepciones',
        'tackles_won': 'Entradas Ganadas',
        'crosses': 'Centros',
        'ppm': 'Puntos por Partido (Impacto)'
    }
    
    for res in resultados:
        # 1. ENCONTRAR EN QUÉ SE PARECEN MÁS (Comparación uno a uno)
        similitudes_detalle = []
        for col, nombre_legible in traduccion_stats.items():
            val_base = float(jugador_base[col])
            val_rec = res['estadisticas'][col]
            
            # Ignoramos si ambos tienen 0 para no decir "se parecen en que ninguno anota goles"
            if val_base > 0 or val_rec > 0:
                max_val = max(val_base, val_rec)
                # Calculamos qué tan diferente es un valor del otro
                diferencia_pct = abs(val_base - val_rec) / max_val
                
                similitudes_detalle.append({
                    'stat': nombre_legible,
                    'diferencia': diferencia_pct,
                    'val_base': val_base,
                    'val_rec': val_rec
                })
        
        # Ordenamos las estadísticas para que las de MENOR diferencia (más idénticas) queden de primero
        similitudes_detalle.sort(key=lambda x: x['diferencia'])
        
        # 2. CONSTRUIR LA EXPLICACIÓN NARRATIVA
        explicacion = (
            f"Recomendado por un {res['similitud_base']}% de similitud general "
            f"con {jugador_base['nombre']}. "
        )
        
        # Si logramos encontrar al menos 2 métricas comparables, las inyectamos al texto
        if len(similitudes_detalle) >= 2:
            top_1 = similitudes_detalle[0]
            top_2 = similitudes_detalle[1]
            
            # Limpiamos los decimales si son números enteros para que se lea mejor (ej: 5.0 -> 5)
            val1_rec_str = int(top_1['val_rec']) if top_1['val_rec'].is_integer() else top_1['val_rec']
            val1_base_str = int(top_1['val_base']) if top_1['val_base'].is_integer() else top_1['val_base']
            val2_rec_str = int(top_2['val_rec']) if top_2['val_rec'].is_integer() else top_2['val_rec']
            val2_base_str = int(top_2['val_base']) if top_2['val_base'].is_integer() else top_2['val_base']

            explicacion += (
                f"Destacan sus perfiles casi idénticos en {top_1['stat']} "
                f"({val1_rec_str} vs {val1_base_str} del original) y "
                f"{top_2['stat']} ({val2_rec_str} vs {val2_base_str}). "
            )
            
        if res['boost_aplicado']:
            explicacion += (
                f"[💎 HIDDEN GEM]: Priorizado por 'Alto Potencial' "
                f"(Edad: {res['edad']}, superó el corte técnico del 90%)."
            )
            
        res['explicacion_caja_blanca'] = explicacion
        
    return resultados



