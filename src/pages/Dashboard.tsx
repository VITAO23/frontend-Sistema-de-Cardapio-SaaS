import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Badge, Card, Section } from '../components';

type TabId = 'estoque' | 'insumos' | 'producao' | 'entrega';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('estoque');

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
        <h3 className="font-semibold text-mint-900">Operações e Gestão</h3>
        <p className="mt-2 text-sm text-mint-700">Gerencie estoque, insumos, produção e entregas em um só lugar.</p>

        {/* Tabs Navigation */}
        <div className="mt-4 flex gap-2 border-b border-mint-300">
          <button
            onClick={() => setActiveTab('estoque')}
            className={`px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'estoque'
                ? 'border-b-2 border-mint-600 text-mint-900'
                : 'text-mint-700 hover:text-mint-900'
            }`}
          >
            📦 Estoque
          </button>
          <button
            onClick={() => setActiveTab('insumos')}
            className={`px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'insumos'
                ? 'border-b-2 border-mint-600 text-mint-900'
                : 'text-mint-700 hover:text-mint-900'
            }`}
          >
            🏭 Insumos
          </button>
          <button
            onClick={() => setActiveTab('producao')}
            className={`px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'producao'
                ? 'border-b-2 border-mint-600 text-mint-900'
                : 'text-mint-700 hover:text-mint-900'
            }`}
          >
            ⚙️ Produção
          </button>
          <button
            onClick={() => setActiveTab('entrega')}
            className={`px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'entrega'
                ? 'border-b-2 border-mint-600 text-mint-900'
                : 'text-mint-700 hover:text-mint-900'
            }`}
          >
            🚗 Entrega
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6 space-y-4">
          {activeTab === 'estoque' && (
            <div>
              <h4 className="font-semibold text-ink-900">Controle de Estoque</h4>
              <p className="mt-2 text-sm text-ink-600">Monitore quantidades e alertas de produtos baixos.</p>
              <div className="mt-4 rounded-lg border border-dashed border-ink-300 bg-ink-50 p-8 text-center text-ink-500">
                <p>📊 Funcionalidade em desenvolvimento</p>
                <p className="mt-1 text-xs">Breve: relatórios e alertas de estoque baixo</p>
              </div>
            </div>
          )}

          {activeTab === 'insumos' && (
            <div>
              <h4 className="font-semibold text-ink-900">Gestão de Insumos</h4>
              <p className="mt-2 text-sm text-ink-600">Organize fornecedores, custos e prazos de entrega.</p>
              <div className="mt-4 rounded-lg border border-dashed border-ink-300 bg-ink-50 p-8 text-center text-ink-500">
                <p>🏪 Funcionalidade em desenvolvimento</p>
                <p className="mt-1 text-xs">Breve: cadastro de insumos e fornecedores</p>
              </div>
            </div>
          )}

          {activeTab === 'producao' && (
            <div>
              <h4 className="font-semibold text-ink-900">Plano de Produção</h4>
              <p className="mt-2 text-sm text-ink-600">Controle receitas, quantidades e preparos.</p>
              <div className="mt-4 rounded-lg border border-dashed border-ink-300 bg-ink-50 p-8 text-center text-ink-500">
                <p>👨‍🍳 Funcionalidade em desenvolvimento</p>
                <p className="mt-1 text-xs">Breve: dashboard de produção com receitas</p>
              </div>
            </div>
          )}

          {activeTab === 'entrega' && (
            <div>
              <h4 className="font-semibold text-ink-900">Gestão de Entrega</h4>
              <p className="mt-2 text-sm text-ink-600">Acompanhe pedidos, rotas e status de entrega.</p>
              <div className="mt-4 rounded-lg border border-dashed border-ink-300 bg-ink-50 p-8 text-center text-ink-500">
                <p>🗺️ Funcionalidade em desenvolvimento</p>
                <p className="mt-1 text-xs">Breve: rastreamento de pedidos e rotas</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">
              Organização
            </p>
            <h3 className="mt-2 text-lg font-semibold text-orange-900">QR Code movido para o Perfil</h3>
            <p className="mt-2 text-sm text-orange-700">
              O QR do cardápio agora fica no seu Perfil, com opções de copiar link, baixar PNG e imprimir.
            </p>
          </div>
          <Badge variant="warning">→</Badge>
        </div>
      </Card>
    </Section>
  );
}
