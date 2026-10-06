import { X, FileText, LogOut, Coffee, Power, Users } from 'lucide-react'

interface ExitMenuModalProps {
  onClose: () => void
  onLogout: () => void
}

export function ExitMenuModal({ onClose, onLogout }: ExitMenuModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#121212] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-xl font-black text-white tracking-tight">Menú de Salida</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-3">
          <button className="flex flex-col items-center justify-center gap-3 p-6 bg-[#1a1a1a] border border-gray-800 hover:border-blue-500/50 hover:bg-[#202020] rounded-2xl transition-all group">
            <FileText size={32} className="text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="text-white font-bold text-sm">Consultar Notas</span>
          </button>
          
          <button className="flex flex-col items-center justify-center gap-3 p-6 bg-[#1a1a1a] border border-gray-800 hover:border-yellow-500/50 hover:bg-[#202020] rounded-2xl transition-all group">
            <Coffee size={32} className="text-yellow-500 group-hover:scale-110 transition-transform" />
            <span className="text-white font-bold text-sm">Abrir Turno</span>
          </button>

          <button className="flex flex-col items-center justify-center gap-3 p-6 bg-[#1a1a1a] border border-gray-800 hover:border-orange-500/50 hover:bg-[#202020] rounded-2xl transition-all group">
            <Power size={32} className="text-orange-500 group-hover:scale-110 transition-transform" />
            <span className="text-white font-bold text-sm">Cerrar Turno</span>
          </button>

          <button 
            onClick={onLogout}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-[#1a1a1a] border border-gray-800 hover:border-red-500/50 hover:bg-[#202020] rounded-2xl transition-all group"
          >
            <Users size={32} className="text-red-500 group-hover:scale-110 transition-transform" />
            <span className="text-white font-bold text-sm">Cambiar Usuario</span>
          </button>
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-[#1a1a1a]">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
          >
            <LogOut size={18} /> Cerrar Sesión del Sistema
          </button>
        </div>
      </div>
    </div>
  )
}
