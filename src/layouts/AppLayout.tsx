import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navLinkBase =
  'rounded-xl px-4 py-2 text-sm font-semibold transition hover:bg-ink-100'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f1fcf7,_#ffffff_55%,_#eef2f7)] text-ink-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink-200 bg-white/80 px-6 py-4 shadow-[0_18px_45px_rgba(31,41,55,0.08)] backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
              Sistema de Cardapio
            </p>
            <h1 className="text-2xl font-semibold text-ink-900">
              Painel administrativo
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-2 text-xs text-ink-600">
              {user?.email || 'Usuario autenticado'}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-ink-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="flex flex-row gap-3 overflow-x-auto lg:flex-col">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? 'bg-ink-900 text-white shadow-[0_14px_30px_rgba(22,32,45,0.3)]'
                    : 'bg-white/80 text-ink-600'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/categories"
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? 'bg-ink-900 text-white shadow-[0_14px_30px_rgba(22,32,45,0.3)]'
                    : 'bg-white/80 text-ink-600'
                }`
              }
            >
              Categorias
            </NavLink>
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `${navLinkBase} ${
                  isActive
                    ? 'bg-ink-900 text-white shadow-[0_14px_30px_rgba(22,32,45,0.3)]'
                    : 'bg-white/80 text-ink-600'
                }`
              }
            >
              Produtos
            </NavLink>
          </nav>

          <main className="rounded-3xl border border-ink-200 bg-white/90 p-6 shadow-[0_22px_50px_rgba(31,41,55,0.08)] backdrop-blur">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
