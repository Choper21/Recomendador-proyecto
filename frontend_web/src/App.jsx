import { useState, useEffect } from 'react';
import {
  obtenerRecomendaciones, obtenerTendencias, obtenerParati, savePlayer,
  unsavePlayer, getSavedPlayers, getSavedRecommendations, loginUser, registerUser
} from './apiService';
import {
  Search, LogOut, TrendingUp, Sparkles, Bookmark, BookmarkCheck, X
} from 'lucide-react';

// Se importan los módulos recién creados
import AuthScreen from './components/AuthScreen';
import PlayerModal from './components/PlayerModal';

function App() {
  // Se conserva la lógica de estado intacta
  const [token, setToken] = useState(localStorage.getItem('scoutToken') || null);
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [jugador, setJugador] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [tendencias, setTendencias] = useState([]);
  const [parati, setParati] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const [savedPlayers, setSavedPlayers] = useState([]);
  const [savedNames, setSavedNames] = useState(new Set());
  const [savedRecs, setSavedRecs] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);

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
    setJugadorSeleccionado(null);
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

  // Se delega el renderizado al componente modular
  if (!token) {
    return (
      <AuthScreen 
        authMode={authMode} setAuthMode={setAuthMode}
        username={username} setUsername={setUsername}
        password={password} setPassword={setPassword}
        handleLogin={handleLogin} handleRegister={handleRegister}
        authError={authError}
      />
    );
  }

  // Se mejora la estructura visual global, incorporando backgrounds premium y unificaciones de tarjetas
  return (
  <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto relative z-10">
        
        <header className="mb-12 pt-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300 tracking-tight">
                SCOUTING TERMINAL
              </h1>
              <p className="text-slate-400 mt-2 font-medium">Inteligencia de datos para descubrir tu próximo fichaje</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaved(!showSaved)}
                className="flex items-center gap-2 bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/50 px-5 py-2.5 rounded-xl transition-all text-slate-300 shadow-sm font-semibold"
              >
                <BookmarkCheck size={18} className="text-emerald-400" /> 
                Guardados <span className="bg-slate-700 px-2 py-0.5 rounded-md text-xs">{savedPlayers.length}</span>
              </button>
              <button
                onClick={cerrarSesion}
                className="flex items-center gap-2 bg-slate-800/40 hover:bg-red-500/10 border border-slate-700/50 hover:border-red-500/30 px-5 py-2.5 rounded-xl transition-all text-slate-400 hover:text-red-400 font-semibold"
              >
                <LogOut size={18} /> Salir
              </button>
            </div>
          </div>

          <div className="relative max-w-3xl">
            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={22} />
                <input
                  className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 hover:border-slate-600 focus:border-emerald-500 py-4 pl-12 pr-4 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-slate-100 placeholder-slate-500 text-lg shadow-inner"
                  placeholder="Buscar jugador similar a... (ej. Salah)"
                  value={jugador}
                  onChange={(e) => setJugador(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscar()}
                />
              </div>
              <button
                onClick={buscar}
                disabled={cargando}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 px-8 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] disabled:opacity-50 disabled:cursor-not-allowed font-bold text-white tracking-wide active:scale-95"
              >
                {cargando ? 'Buscando...' : 'Analizar'}
              </button>
            </div>
            {errorMsg && (
              <div className="absolute top-full mt-3 left-0 w-full bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm font-medium">
                {errorMsg}
              </div>
            )}
          </div>
        </header>

        {showSaved && (
          <section className="mb-14 bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                <BookmarkCheck size={24} className="text-emerald-400" /> Tu Agenda de Fichajes
              </h2>
              <button onClick={() => setShowSaved(false)} className="text-slate-500 hover:text-white bg-slate-900/50 p-2 rounded-full transition-colors border border-slate-700/50">
                <X size={20} />
              </button>
            </div>
            
            {savedPlayers.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-slate-700/30 border-dashed">
                <Bookmark className="mx-auto text-slate-600 mb-3" size={32} />
                <p className="text-slate-500 font-medium">Aún no has guardado ningún jugador en tu agenda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
                {savedPlayers.map((p, i) => (
                  <div 
                    key={i} 
                    onClick={() => setJugadorSeleccionado(p)}
                    className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 flex flex-col justify-between cursor-pointer hover:border-emerald-500/40 hover:bg-slate-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-white font-bold text-lg leading-tight group-hover:text-emerald-300 transition-colors">{p.nombre}</h3>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEliminarGuardado(p.nombre);
                        }} 
                        className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-md transition-all -mt-1 -mr-1"
                        title="Eliminar"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-md border border-slate-700">{p.equipo}</span>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">{p.posicion}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tendencias.length > 0 && (
          <section className="mb-14">
            <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-6 tracking-tight">
              <TrendingUp size={24} className="text-emerald-400" /> Radar Global
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tendencias.slice(0, 12).map((jug, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setJugadorSeleccionado(jug)}
                  className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:bg-slate-800/80 hover:border-emerald-500/40 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(16,185,129,0.08)] group"
                >
                  <div className="text-white font-bold text-sm mb-2 group-hover:text-emerald-300 transition-colors line-clamp-1">{jug.nombre}</div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 truncate">{jug.equipo}</span>
                    <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wide">{jug.posicion}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-700/50 text-slate-500 text-xs flex items-center gap-1.5 font-medium">
                    <TrendingUp size={12} className="text-emerald-500" />
                    {jug.apariciones} búsquedas
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid lg:grid-cols-2 gap-8 mb-14">
          <section>
            <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-6 tracking-tight">
              Recomendado Para Ti
            </h2>
            {parati.length > 0 ? (
              <div className="flex flex-col gap-4">
                {parati.slice(0,4).map((jug, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setJugadorSeleccionado(jug)}
                    className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:bg-slate-800/80 hover:border-cyan-500/40 hover:shadow-lg flex justify-between items-center group"
                  >
                    <div>
                      <h3 className="text-white font-bold text-lg group-hover:text-cyan-300 transition-colors">{jug.nombre}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-400">{jug.equipo}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span className="text-xs font-bold text-cyan-400">{jug.posicion}</span>
                      </div>
                    </div>
                    <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs px-3 py-1.5 rounded-lg font-bold flex flex-col items-center">
                      <span className="text-lg leading-none">{jug.frecuencia}</span>
                      <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">Afines</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-8 text-center h-full flex flex-col justify-center items-center">
               
                <p className="text-slate-400 text-sm font-medium">Amplía tus búsquedas para recibir recomendaciones del algoritmo.</p>
              </div>
            )}
          </section>

          {savedRecs.length > 0 && (
            <section>
              <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-6 tracking-tight">
                <BookmarkCheck size={24} className="text-purple-400" /> Basado en tu Agenda
              </h2>
              <div className="flex flex-col gap-4">
                {savedRecs.slice(0,4).map((jug, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setJugadorSeleccionado(jug)}
                    className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:bg-slate-800/80 hover:border-purple-500/40 hover:shadow-lg flex justify-between items-center group"
                  >
                    <div>
                      <h3 className="text-white font-bold text-lg group-hover:text-purple-300 transition-colors">{jug.nombre}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-400">{jug.equipo}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span className="text-xs font-bold text-purple-400">{jug.posicion}</span>
                      </div>
                    </div>
                    <span className="bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs px-3 py-1.5 rounded-lg font-bold flex flex-col items-center">
                      <span className="text-lg leading-none">{jug.frecuencia}</span>
                      <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">Red</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {resultados.length > 0 && (
          <section className="mb-14">
            <h2 className="text-3xl font-black text-white flex items-center gap-3 mb-8 tracking-tight">
              Informe de Similitud
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {resultados.map((res, i) => (
                <div
                  key={i}
                  onClick={() => setJugadorSeleccionado(res)}
                  className="bg-slate-800/40 backdrop-blur-md border border-slate-700/60 rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:bg-slate-800/80 hover:border-emerald-500/50 hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(16,185,129,0.12)] group relative flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors mb-1">{res.nombre}</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400 font-medium">{res.equipo}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">{res.posicion}</span>
                      </div>
                    </div>
                    
                    {/* Botón de guardado reubicado para mejor UX */}
                    <div className="absolute top-6 right-6 z-10">
                      {savedNames.has(res.nombre) ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEliminarGuardado(res.nombre); }}
                          className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 p-2.5 rounded-xl transition-all shadow-sm"
                          title="Quitar de guardados"
                        >
                          <BookmarkCheck size={20} fill="currentColor" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleGuardar(res.nombre); }}
                          className="bg-slate-900/50 text-slate-400 border border-slate-700 hover:text-emerald-400 hover:border-emerald-500/30 p-2.5 rounded-xl transition-all"
                          title="Guardar jugador"
                        >
                          <Bookmark size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-auto bg-slate-900/40 rounded-2xl p-4 border border-slate-800 mb-4">
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      {res.explicacion_caja_blanca}
                    </p>
                  </div>
                  
                  <div className="flex items-end justify-between mt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Match Index</span>
                      <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tighter">
                        {res.score_final}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold group-hover:text-emerald-500 transition-colors">
                      Ver ficha completa →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {resultados.length === 0 && !cargando && (
          <div className="text-center py-32 opacity-50">
            <Search className="mx-auto text-slate-600 mb-4" size={48} strokeWidth={1} />
            <p className="text-xl font-medium text-slate-500">Inicia una búsqueda en la terminal superior</p>
          </div>
        )}

        <PlayerModal 
          jugadorSeleccionado={jugadorSeleccionado} 
          setJugadorSeleccionado={setJugadorSeleccionado} 
        />
      </div>
    </div>
  );
}

export default App;