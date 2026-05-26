import { LogIn, UserPlus, Sparkles } from 'lucide-react';

// Se integra la pantalla de autenticación con la paleta estructurada (Carbón y Teal).
// Se reemplazan los fondos duros por las variables dinámicas del tema configurado.
export default function AuthScreen({ 
  authMode, 
  setAuthMode, 
  username, 
  setUsername, 
  password, 
  setPassword, 
  handleLogin, 
  handleRegister, 
  authError 
}) {
  return (
    // Se utiliza slate-950 (#1A1D24) como base y se inyecta el resplandor Teal (rgba 118, 171, 174)
    <div className="min-h-screen flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(118,171,174,0.15),rgba(26,29,36,0))] p-8">
      <div className="bg-slate-900/90 backdrop-blur-xl p-10 rounded-3xl border border-slate-700/50 w-full max-w-md shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        
        <div className="flex items-center justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full"></div>
            {/* Se evita slate-800 para fondos (ahora es Teal) y se usa slate-950 */}
          </div>
        </div>
        
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300 text-center mb-2 tracking-tight">
          SCOUTING TERMINAL
        </h1>
        <p className="text-slate-500 text-sm text-center mb-8 font-medium">Sistema inteligente de recomendación</p>

        <div className="flex bg-slate-950/50 p-1 rounded-xl mb-8 border border-slate-700/50">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2.5 rounded-lg font-bold transition-all text-sm flex items-center justify-center gap-2 ${
              authMode === 'login' 
                ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/25' 
                : 'text-slate-500 hover:text-slate-400 hover:bg-slate-700/30'
            }`}
          >
            <LogIn size={16} /> Entrar
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2.5 rounded-lg font-bold transition-all text-sm flex items-center justify-center gap-2 ${
              authMode === 'register' 
                ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/25' 
                : 'text-slate-500 hover:text-slate-400 hover:bg-slate-700/30'
            }`}
          >
            <UserPlus size={16} /> Registro
          </button>
        </div>

        <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-5">
          <div>
            <input
              className="w-full bg-slate-950/50 border border-slate-700/50 p-3.5 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-400 placeholder-slate-500 font-medium"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="password"
              className="w-full bg-slate-950/50 border border-slate-700/50 p-3.5 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-400 placeholder-slate-500 font-medium"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {authError && (
            /* Los errores se mapean a la familia cyan, que ahora representa el naranja de alerta */
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3.5 text-cyan-500 text-sm font-medium flex items-center justify-center">
              {authError}
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 p-4 rounded-xl font-black transition-all shadow-lg shadow-emerald-500/25 text-slate-900 active:scale-[0.98] tracking-wide"
          >
            {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}