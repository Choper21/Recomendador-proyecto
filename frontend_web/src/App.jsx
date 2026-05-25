import { useState, useEffect } from 'react';
import {
  obtenerRecomendaciones,
  obtenerTendencias,
  obtenerParati,
  savePlayer,
  unsavePlayer,
  getSavedPlayers,
  getSavedRecommendations,
  loginUser,
  registerUser
} from './apiService';
import {
  Search,
  LogOut,
  TrendingUp,
  UserPlus,
  LogIn,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  X
} from 'lucide-react';

function App() {
  // Auth
  const [token, setToken] = useState(localStorage.getItem('scoutToken') || null);
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // App principal
  const [jugador, setJugador] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [tendencias, setTendencias] = useState([]);
  const [parati, setParati] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Guardados
  const [savedPlayers, setSavedPlayers] = useState([]);
  const [savedNames, setSavedNames] = useState(new Set());
  const [savedRecs, setSavedRecs] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (token) {
      cargarTendencias();
      cargarParati();
      cargarSaved();
      cargarSavedRecommendations();
    }
  }, [token]);

  const cargarTendencias = async () => {
    try {
      const data = await obtenerTendencias(token);
      setTendencias(data);
    } catch (e) {
      if (e.message.includes('Sesión expirada')) cerrarSesion();
      else setErrorMsg(e.message);
    }
  };

  const cargarParati = async () => {
    try {
      const data = await obtenerParati(token);
      setParati(data);
    } catch (e) {
      if (e.message.includes('Sesión expirada')) cerrarSesion();
    }
  };

  const cargarSaved = async () => {
    try {
      const data = await getSavedPlayers(token);
      setSavedPlayers(data);
      setSavedNames(new Set(data.map(p => p.nombre)));
    } catch (e) {
      if (e.message.includes('Sesión expirada')) cerrarSesion();
    }
  };

  const cargarSavedRecommendations = async () => {
    try {
      const data = await getSavedRecommendations(token);
      setSavedRecs(data);
    } catch (e) {
      if (e.message.includes('Sesión expirada')) cerrarSesion();
    }
  };

  const handleGuardar = async (playerName) => {
    try {
      await savePlayer(playerName, token);
      await cargarSaved();
      await cargarSavedRecommendations();
    } catch (e) {
      if (e.message.includes('Sesión expirada')) cerrarSesion();
      else setErrorMsg('No se pudo guardar el jugador');
    }
  };

  const handleEliminarGuardado = async (playerName) => {
    try {
      await unsavePlayer(playerName, token);
      await cargarSaved();
      await cargarSavedRecommendations();
    } catch (e) {
      if (e.message.includes('Sesión expirada')) cerrarSesion();
      else setErrorMsg('No se pudo eliminar el guardado');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const tok = await loginUser(username, password);
      setToken(tok);
      localStorage.setItem('scoutToken', tok);
    } catch (error) {
      setAuthError(error.response?.data?.detail || 'Error de autenticación');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await registerUser(username, password);
      const tok = await loginUser(username, password);
      setToken(tok);
      localStorage.setItem('scoutToken', tok);
    } catch (error) {
      setAuthError(error.response?.data?.detail || 'Error al registrar');
    }
  };

  const cerrarSesion = () => {
    setToken(null);
    localStorage.removeItem('scoutToken');
    setTendencias([]);
    setParati([]);
    setResultados([]);
    setJugador('');
    setSavedPlayers([]);
    setSavedNames(new Set());
    setSavedRecs([]);
  };

  const buscar = async () => {
    if (!jugador.trim()) return;
    setCargando(true);
    setErrorMsg('');
    try {
      const data = await obtenerRecomendaciones(jugador, token);
      setResultados(data);
    } catch (e) {
      if (e.message.includes('Sesión expirada')) cerrarSesion();
      else setErrorMsg(e.message);
    }
    setCargando(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-slate-950 to-emerald-950 p-8">
        <div className="bg-slate-900/80 backdrop-blur-md p-8 rounded-2xl border border-slate-700/50 w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-emerald-500/20 p-3 rounded-full">
              <Sparkles className="text-emerald-400" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 text-center mb-2">
            SCOUTING TERMINAL
          </h1>
          <p className="text-slate-400 text-sm text-center mb-6">Sistema inteligente de recomendación de fichajes</p>

          <div className="flex justify-center mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={`px-5 py-2 rounded-l-lg font-medium transition-all ${authMode === 'login' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <LogIn className="inline mr-1" size={16} /> Iniciar sesión
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`px-5 py-2 rounded-r-lg font-medium transition-all ${authMode === 'register' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <UserPlus className="inline mr-1" size={16} /> Registro
            </button>
          </div>

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            <input
              className="w-full bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-100 placeholder-slate-500"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-100 placeholder-slate-500"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {authError}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 p-3 rounded-lg font-bold hover:from-emerald-500 hover:to-cyan-500 transition-all shadow-lg shadow-emerald-600/25 text-white"
            >
              {authMode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-emerald-950 text-slate-100 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight">
                SCOUTING TERMINAL
              </h1>
              <p className="text-slate-400 mt-1">Descubre el próximo fichaje perfecto</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaved(!showSaved)}
                className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 px-4 py-2 rounded-lg transition-all text-slate-300"
              >
                <BookmarkCheck size={16} /> Guardados ({savedPlayers.length})
              </button>
              <button
                onClick={cerrarSesion}
                className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 px-4 py-2 rounded-lg transition-all text-slate-400 hover:text-slate-200"
              >
                <LogOut size={16} /> Salir
              </button>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 p-4 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-100 placeholder-slate-500 text-lg"
                placeholder="Buscar jugador similar a... (ej. Salah)"
                value={jugador}
                onChange={(e) => setJugador(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
              />
              <button
                onClick={buscar}
                disabled={cargando}
                className="bg-emerald-600 hover:bg-emerald-500 px-6 rounded-xl transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="text-white" size={24} />
              </button>
            </div>
            {errorMsg && (
              <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {errorMsg}
              </div>
            )}
          </div>
        </header>

        {/* Sección de Guardados (si está abierta) */}
        {showSaved && (
          <section className="mb-10 bg-slate-900/60 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                <BookmarkCheck size={20} /> Tus jugadores guardados
              </h2>
              <button onClick={() => setShowSaved(false)}>
                <X size={20} className="text-slate-500 hover:text-slate-300" />
              </button>
            </div>
            {savedPlayers.length === 0 ? (
              <p className="text-slate-500">Aún no has guardado ningún jugador.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedPlayers.map((p, i) => (
                  <div key={i} className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium">{p.nombre}</p>
                      <p className="text-slate-400 text-sm">{p.equipo} · {p.posicion}</p>
                    </div>
                    <button onClick={() => handleEliminarGuardado(p.nombre)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Secciones de recomendaciones pasivas */}
        {tendencias.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2 mb-4">
              <TrendingUp size={20} /> Tendencias globales
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {tendencias.slice(0, 12).map((jug, idx) => (
                <div key={idx} className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-xl p-4 hover:border-emerald-500/30 hover:bg-slate-800/60 transition-all">
                  <div className="text-emerald-400 font-bold text-sm truncate">{jug.nombre}</div>
                  <div className="text-slate-500 text-xs mt-1">{jug.equipo}</div>
                  <div className="text-slate-400 text-xs mt-2 flex items-center gap-1">
                    <TrendingUp size={12} />
                    {jug.apariciones} búsquedas
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
<section className="mb-10">
  <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2 mb-4">
    <Sparkles size={20} /> Para ti
  </h2>
  {parati.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {parati.map((jug, idx) => (
        <div key={idx} className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-xl p-5 hover:border-cyan-500/30 hover:bg-slate-800/60 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-white font-bold text-lg">{jug.nombre}</h3>
              <p className="text-cyan-400 text-sm">{jug.equipo}</p>
            </div>
            <span className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-1 rounded-full">
              {jug.frecuencia} usuarios
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-2">{jug.posicion}</p>
          <p className="text-slate-400 text-xs mt-3 italic">
            Usuarios con tus búsquedas también consultaron a este jugador.
          </p>
        </div>
      ))}
    </div>
  ) : (
    <div className="bg-slate-900/40 border border-slate-800/30 rounded-xl p-8 text-center">
      <Sparkles size={32} className="mx-auto text-slate-600 mb-3" />
      <p className="text-slate-400 text-sm max-w-md mx-auto">
        Aún no hay recomendaciones personalizadas. <br/>
        Sigue buscando jugadores y cuando otros ojeadores con tus mismos intereses descubran nuevos talentos, aparecerán aquí.
      </p>
    </div>
  )}
</section>

        {/* "Podría interesarte" basado en guardados */}
        {savedRecs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2 mb-4">
              <BookmarkCheck size={20} /> Podría interesarte
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Basado en lo que otros usuarios con gustos similares han guardado.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedRecs.map((jug, idx) => (
                <div key={idx} className="bg-slate-900/60 backdrop-blur-sm border border-purple-500/20 rounded-xl p-5 hover:border-purple-500/40 hover:bg-slate-800/60 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-bold text-lg">{jug.nombre}</h3>
                      <p className="text-purple-400 text-sm">{jug.equipo}</p>
                    </div>
                    <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded-full">
                      {jug.frecuencia} guardados
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">{jug.posicion}</p>
                  <p className="text-slate-400 text-xs mt-3 italic">
                    Usuarios que guardan jugadores como los tuyos también guardan a {jug.nombre}.
                  </p>
                  {/* Podríamos añadir botón de guardar aquí, pero mejor simple */}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Resultados de búsqueda */}
        {resultados.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-emerald-400 mb-4">Resultados de la búsqueda</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {resultados.map((res, i) => (
                <div
                  key={i}
                  className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 hover:border-emerald-500/30 hover:bg-slate-800/60 transition-all group relative"
                >
                  <h2 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{res.nombre}</h2>
                  <p className="text-emerald-400 text-sm">{res.equipo}</p>
                  <div className="mt-4 text-xs text-slate-400 italic leading-relaxed">
                    {res.explicacion_caja_blanca}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-mono font-bold text-emerald-500">
                      {res.score_final}%
                    </span>
                    <div className="flex gap-2">
                      {savedNames.has(res.nombre) ? (
                        <button
                          onClick={() => handleEliminarGuardado(res.nombre)}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors"
                          title="Quitar de guardados"
                        >
                          <BookmarkCheck size={20} fill="currentColor" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGuardar(res.nombre)}
                          className="text-slate-500 hover:text-cyan-400 transition-colors"
                          title="Guardar jugador"
                        >
                          <Bookmark size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {resultados.length === 0 && !cargando && (
          <div className="text-center py-20 text-slate-600">
            <p className="text-xl">🔍 Realiza una búsqueda para obtener recomendaciones</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;