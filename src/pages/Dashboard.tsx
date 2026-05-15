import { useAuth } from '../hooks/useAuth';
import { Badge, Card, Section } from '../components';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <Section
      title={`Bem-vindo${user?.name ? `, ${user.name}` : ''}`}
      subtitle="Vamos organizar seu cardápio de forma rápida e profissional."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                Status
              </p>
              <p className="mt-2 text-2xl font-bold text-ink-900">API conectada</p>
              <p className="mt-1 text-sm text-ink-600">Login validado com sucesso.</p>
            </div>
            <Badge variant="success">✓</Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                Próximo passo
              </p>
              <p className="mt-2 text-2xl font-bold text-ink-900">Categorias</p>
              <p className="mt-1 text-sm text-ink-600">Cadastre as seções do menu.</p>
            </div>
            <Badge variant="warning">→</Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Dica</p>
              <p className="mt-2 text-2xl font-bold text-ink-900">Imagens</p>
              <p className="mt-1 text-sm text-ink-600">Prepare fotos leves e quadradas.</p>
            </div>
            <Badge variant="default">💡</Badge>
          </div>
        </Card>
      </div>

      <Card className="border-mint-200 bg-gradient-to-r from-mint-50 to-white p-6">
        <h3 className="font-semibold text-mint-900">Checklist de Configuração</h3>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-mint-700">
            <span>✓</span> Backend e API conectados
          </div>
          <div className="flex items-center gap-2 text-sm text-mint-700">
            <span>✓</span> Autenticação com JWT
          </div>
          <div className="flex items-center gap-2 text-sm text-mint-700">
            <span>→</span> Categorias (em progresso)
          </div>
          <div className="flex items-center gap-2 text-sm text-mint-700">
            <span>→</span> Produtos com upload
          </div>
        </div>
      </Card>
    </Section>
  );
}
