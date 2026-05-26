import pandas as pd
import json
from io import StringIO

def leer_tabla_con_multiindex(archivo):
    """Lee un HTML de FBref y devuelve el DataFrame con MultiIndex de columnas."""
    with open(archivo, 'r', encoding='utf-8') as f:
        html_str = f.read()
    tablas = pd.read_html(StringIO(html_str))
    for tabla in tablas:
        # Ignorar tablas que no tienen columnas (muy raro)
        if tabla.columns.empty:
            continue
        
        # Si los nombres de columna son enteros, la tabla no sirve 
        if any(isinstance(c, int) for c in tabla.columns):
            continue
        
        # Ahora sí, trabajar con la tabla
        if isinstance(tabla.columns, pd.MultiIndex):
            # Verificar si en el segundo nivel existe 'Player'
            if 'Player' in tabla.columns.get_level_values(1):
                # Quitar filas que son repetición de encabezados
                idx_player = list(tabla.columns.get_level_values(1)).index('Player')
                tabla = tabla[tabla.iloc[:, idx_player] != 'Player'].copy()
                return tabla
        else:
            # Columnas planas, pero aseguramos que sean strings
            cols = [str(c) for c in tabla.columns]
            if 'Player' in cols or 'player' in [c.lower() for c in cols]:
                # Quitar filas de encabezados repetidos
                col_player = tabla.columns[cols.index('Player')] if 'Player' in cols else tabla.columns[[c.lower() for c in cols].index('player')]
                tabla = tabla[tabla[col_player] != 'Player'].copy()
                return tabla
    raise ValueError(f"No se encontró la tabla de jugadores en {archivo}")
def extraer_columna_por_nivel(df, nivel1_palabra, nivel2_palabra):
    """
    Busca en un DataFrame con MultiIndex la columna cuyo nivel1 contenga
    nivel1_palabra y cuyo nivel2 coincida exactamente con nivel2_palabra.
    Devuelve la etiqueta de la columna (tupla) o None.
    """
    for col in df.columns:
        if isinstance(col, tuple) and len(col) == 2:
            n1, n2 = col
            # nivel1 suele ser la categoría, nivel2 la abreviatura
            if nivel1_palabra.lower() in n1.lower() and n2.lower() == nivel2_palabra.lower():
                return col
    return None

def extraer_columna_simple(df, palabra_clave, excluir_substrings=[]):
    """
    Busca en un DataFrame de columnas planas la columna cuyo nombre contenga
    palabra_clave, ignorando las que contengan algún substring de excluir_substrings.
    """
    for c in df.columns:
        c_low = c.lower()
        if palabra_clave.lower() in c_low and not any(ex in c_low for ex in excluir_substrings):
            return c
    return None

def construir_df_base():
    # Leer las tres tablas
    print("Cargando tablas...")
    std = leer_tabla_con_multiindex('fbref_standard.html')
    plt = leer_tabla_con_multiindex('fbref_playing.html')
    misc = leer_tabla_con_multiindex('fbref_misc.html')

    # 1. Tabla Standard: columnas básicas + goles/asistencias totales
    # La columna 'Player' está en nivel2, la buscamos
    def col_std(abbr):
        # Para categorías como 'Playing Time', 'Performance', etc.
        # Primero intentamos con categoría exacta (puede variar)
        # A veces las categorías son 'Playing Time', 'Performance', 'Per 90 Minutes'
        if abbr in ['MP', 'Starts', 'Min']:
            return extraer_columna_por_nivel(std, 'Playing', abbr)  # 'Playing Time'
        elif abbr in ['Gls', 'Ast']:
            # 'Performance' contiene los totales, 'Per 90 Minutes' los /90
            col = extraer_columna_por_nivel(std, 'Performance', abbr)
            if col is None:
                # Si no existe 'Performance', probamos con 'Standard' o buscamos directamente
                col = extraer_columna_por_nivel(std, '', abbr)  # búsqueda laxa
            return col
        else:
            # Para Age, Pos, Squad, Nation: a veces están bajo 'Unnamed: ...'
            return extraer_columna_por_nivel(std, 'Unnamed', abbr)  # Age, Pos, Squad, Nation suelen estar en Unnamed

    col_player = col_std('Player')  # realmente el nivel2 es 'Player'
    if col_player is None:
        # buscar manualmente
        for col in std.columns:
            if col[1] == 'Player':
                col_player = col
                break

    # Construir DataFrame base
    df_base = pd.DataFrame()
    df_base['nombre'] = std[col_player]

    # Posición
    col_pos = col_std('Pos')
    df_base['posicion'] = std[col_pos] if col_pos else None

    # Equipo
    col_squad = col_std('Squad')
    df_base['equipo'] = std[col_squad] if col_squad else None

    # Edad
    col_age = col_std('Age')
    df_base['edad'] = std[col_age] if col_age else None

    # MP, Starts, Min
    for stat, nombre in [('MP', 'partidos_jugados'), ('Starts', 'titularidades'), ('Min', 'minutos_jugados')]:
        col = col_std(stat)
        df_base[nombre] = std[col] if col else 0

    # Goles totales
    col_gls = col_std('Gls')
    if col_gls is None:
        # buscar la primera columna 'Gls' que no sea per90 (evitamos la de 'Per 90 Minutes')
        for col in std.columns:
            if col[1] == 'Gls' and 'per 90' not in col[0].lower():
                col_gls = col
                break
    df_base['goles'] = std[col_gls] if col_gls else 0

    # Asistencias totales
    col_ast = col_std('Ast')
    if col_ast is None:
        for col in std.columns:
            if col[1] == 'Ast' and 'per 90' not in col[0].lower():
                col_ast = col
                break
    df_base['asistencias'] = std[col_ast] if col_ast else 0

    # 2. Playing Time: obtener PPM
    col_player_plt = None
    col_ppm = None
    for col in plt.columns:
        if col[1] == 'Player':
            col_player_plt = col
        # PPM suele estar bajo 'Team Success' o 'Performance'
        if col[1] == 'PPM':
            col_ppm = col
    if col_player_plt and col_ppm:
        df_ppm = pd.DataFrame({
            'nombre': plt[col_player_plt],
            'ppm': plt[col_ppm]
        })
    else:
        df_ppm = pd.DataFrame({'nombre': [], 'ppm': []})

    # 3. Miscellaneous: Intercepciones, tackles, crosses, faltas
    col_player_misc = None
    cols_misc = {}
    for col in misc.columns:
        if col[1] == 'Player':
            col_player_misc = col
        elif col[1] in ['Int', 'TklW', 'Crs', 'Fls']:
            cols_misc[col[1]] = col
    if col_player_misc and cols_misc:
        df_misc = pd.DataFrame({'nombre': misc[col_player_misc]})
        for stat, col in cols_misc.items():
            df_misc[stat.lower()] = misc[col]
    else:
        df_misc = pd.DataFrame({'nombre': []})

    # Fusionar todo
    print("Fusionando datos...")
    df_final = df_base.copy()
    if not df_ppm.empty:
        df_final = pd.merge(df_final, df_ppm, on='nombre', how='left')
    if not df_misc.empty:
        # Renombrar columnas para que coincidan
        df_misc_ren = df_misc.rename(columns={
            'int': 'intercepciones',
            'tklw': 'tackles_won',
            'crs': 'crosses',
            'fls': 'faltas_cometidas'
        })
        df_final = pd.merge(df_final, df_misc_ren, on='nombre', how='left')

    # Rellenar NaN con 0 y convertir a tipos manejables
    columnas_finales = ['nombre', 'posicion', 'equipo', 'edad', 'partidos_jugados',
                       'titularidades', 'minutos_jugados', 'goles', 'asistencias',
                       'intercepciones', 'tackles_won', 'crosses', 'ppm', 'faltas_cometidas']
    for c in columnas_finales:
        if c not in df_final.columns:
            df_final[c] = 0
        else:
            df_final[c] = df_final[c].fillna(0).astype(str)  # guardamos como string para JSON uniforme

    # Eliminar filas sin nombre
    df_final = df_final.dropna(subset=['nombre'])
    df_final = df_final[df_final['nombre'] != '0']

    # Guardar JSON
    datos = df_final[columnas_finales].to_dict(orient='records')
    with open('jugadores_catalogo.json', 'w', encoding='utf-8') as f:
        json.dump(datos, f, indent=4, ensure_ascii=False)

    print(f"¡Éxito! Catálogo generado con {len(datos)} jugadores.")
    print("Muestra de las primeras 3 filas:")
    for j in datos[:3]:
        print(j)

if __name__ == "__main__":
    construir_df_base()