import { Role } from '../../types'

interface LoginProps {
  onLogin: (role: Role) => void
}

export function Login({ onLogin }: LoginProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#080808] p-6">
      <div className="mb-12 text-center">
        <div className="text-6xl mb-4">🍕</div>
        <h1 className="text-4xl font-bold tracking-tight text-white">Pizzería Volcán</h1>
        <p className="text-[#8a8a8a] mt-2 font-mono text-sm tracking-widest uppercase">
          Sistema de Comandas
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        {(
          [
            ['pos', '🧑‍🍳', 'Caja / POS', 'Tomar pedidos y cobrar'],
            ['admin', '👨‍💼', 'Administrador', 'Reportes y gestión'],
          ] as const
        ).map(([role, icon, title, sub]) => (
          <button
            key={role}
            onClick={() => onLogin(role as Role)}
            className="flex-1 flex flex-col items-center gap-3 p-8 rounded-xl border border-[#272727] bg-[#141414] hover:border-[#C41E3A] hover:bg-[#1c1c1c] transition-all group cursor-pointer"
          >
            <span className="text-4xl">{icon}</span>
            <div className="text-center">
              <div className="font-bold text-lg text-white group-hover:text-[#C41E3A] transition-colors">
                {title}
              </div>
              <div className="text-sm text-[#8a8a8a] mt-1">{sub}</div>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-10 text-[#404040] text-xs font-mono">v2.0 · 2026</p>
    </div>
  )
}
