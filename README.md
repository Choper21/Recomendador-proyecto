# ⚽ Scouting Terminal

**Sistema inteligente de recomendación de fichajes de fútbol**  
Aplicación full‑stack que combina aprendizaje automático, filtrado colaborativo y una interfaz moderna para ayudar a ojeadores y aficionados a descubrir jugadores similares, tendencias globales y recomendaciones personalizadas basadas en datos reales de FBref.

---

## 📌 Características principales

- 🔐 **Autenticación de usuarios** – registro e inicio de sesión con contraseñas seguras (SHA‑256).
- 🔍 **Búsqueda por similitud** – encuentra jugadores con un perfil estadístico parecido usando *cosine similarity* sobre métricas normalizadas.
- ⚡ **Boost por edad** – prioriza jugadores jóvenes (≤23 años) con potencial de reventa.
- 📈 **Tendencias globales** – ranking de los jugadores más buscados por todos los usuarios.
- 👥 **“Para ti”** – recomendaciones colaborativas: “Usuarios que buscaron lo mismo que tú también vieron a…”
- 🔖 **Guardados** – cada usuario puede guardar jugadores y recibir sugerencias del tipo *“Usuarios con gustos similares también guardaron a…”*.
- 📊 **Datos reales** – extracción automática desde FBref (Premier League) combinando múltiples tablas.
- 🎨 **Interfaz moderna** – construida con React + Tailwind CSS, modo oscuro, diseño *glassmorphism*.

---

## 🧰 Tecnologías

| Capa        | Tecnología                          |
|-------------|--------------------------------------|
| Backend     | Python 3.10+, FastAPI, Uvicorn      |
| Machine Learning | scikit‑learn, pandas           |
| Frontend    | React (Vite), Tailwind CSS, Axios   |
| Autenticación | SHA‑256 con sal (sin dependencias externas) |
| Despliegue  | Render (backend), Vercel (frontend) |

---
# Estructura del Proyecto: Scouting Terminal

Esta es la jerarquía de directorios de la aplicación, diseñada para separar la lógica de backend, la gestión de datos y la interfaz de usuario.

```text
scouting-terminal/
├── backend/                  # API y lógica de recomendación
│   ├── api.py                # Endpoints FastAPI
│   ├── recomendador.py       # Algoritmo de similitud y preparación de datos
│   ├── auth_utils.py         # Registro, login, gestión de tokens
│   ├── saved_utils.py        # Gestión de jugadores guardados por usuario
│   ├── logger.py             # Registro de interacciones y logs
│   ├── mineria.py            # Extracción y limpieza de datos desde FBref
│   ├── jugadores_catalogo.json
│   └── requirements.txt
├── frontend/                 # Aplicación React
│   ├── src/
│   │   ├── App.jsx           # Componente principal
│   │   └── apiService.js     # Comunicación con la API (axios/fetch)
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js    # Configuración de estilos
│   └── vite.config.js
├── .gitignore
└── README.md

---

## 🚀 Instalación y ejecución local

### 1. Clonar el repositorio
```bash
git clone [https://github.com/TU_USUARIO/scouting-terminal.git](https://github.com/Choper21/Recomendador-proyecto.git)
cd scouting-terminal
2. Backend
bash
cd backend
python -m venv venv
# Activar el entorno:
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

pip install -r requirements.txt
Asegúrate de tener el archivo jugadores_catalogo.json (generado con mineria.py o descargado del repositorio). Luego inicia el servidor:

bash
uvicorn api:app --reload
La API estará disponible en http://127.0.0.1:8000.

3. Frontend
En otra terminal:

bash
cd frontend
npm install
npm run dev
El frontend se abrirá en http://localhost:5173. Asegúrate de que en src/apiService.js la variable BASE_URL apunte a http://127.0.0.1:8000.
