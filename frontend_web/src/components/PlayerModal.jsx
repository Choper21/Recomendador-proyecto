import { X, Activity } from 'lucide-react';

// Se extrae el modal de estadísticas. Se optimiza la presentación de datos en forma de tarjetas
// individuales (estilo videojuego) para mejorar la legibilidad y el impacto visual.
export default function PlayerModal({ jugadorSeleccionado, setJugadorSeleccionado }) {
  if (!jugadorSeleccionado) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-opacity">
      {/* Se añade un resplandor detrás del modal principal */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-full blur-[100px] pointer-events-none scale-75"></div>
      
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-8 w-full max-w-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto transform transition-all">
        
        <button
          onClick={() => setJugadorSeleccionado(null)}
          className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 p-2.5 rounded-full transition-colors border border-slate-700/50"
        >
          <X size={20} />
        </button>

        <div className="mb-8 pr-12">
          <h2 className="text-4xl font-black text-white mb-2 tracking-tight">
            {jugadorSeleccionado.nombre}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-semibold">
              {jugadorSeleccionado.equipo}
            </span>
            <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full text-sm font-semibold">
              {jugadorSeleccionado.posicion}
            </span>
            {jugadorSeleccionado.edad && (
              <span className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-sm font-semibold">
                {jugadorSeleccionado.edad} años
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {jugadorSeleccionado.estadisticas ? (
            Object.entries(jugadorSeleccionado.estadisticas).map(([key, value]) => (
              <div 
                key={key} 
                className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4 rounded-2xl border border-slate-700/50 flex flex-col justify-center items-center text-center shadow-inner relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
              >
                {/* Detalle visual sutil en la tarjeta */}
                <div className="absolute -right-2 -top-2 opacity-5">
                  <Activity size={40} />
                </div>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1.5 font-bold z-10">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-white font-black text-2xl tracking-tight z-10">{value}</p>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-slate-800/30 rounded-2xl border border-slate-700/30 text-slate-400 flex flex-col items-center">
              <Activity className="mb-3 text-slate-500 opacity-50" size={32} />
              <p className="text-sm font-medium">Estadísticas completas no disponibles en esta vista.</p>
              <p className="text-xs mt-1.5 opacity-60">Es necesario actualizar el endpoint en FastAPI.</p>
            </div>
          )}
        </div>
        
        {jugadorSeleccionado.explicacion_caja_blanca && (
          <div className="mt-8 bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <h3 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-2.5">Análisis de Inteligencia</h3>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              {jugadorSeleccionado.explicacion_caja_blanca}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}