import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Badge, Button, Card, Section } from '../components';

const STORAGE_PUBLIC_SLUG_KEY = 'public_menu_slug';

export default function DashboardPage() {
  const { user } = useAuth();
  const [slug, setSlug] = useState('');
  const [slugLoading, setSlugLoading] = useState(true);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      setSlugLoading(true);
      setSlugError(null);

      try {
        const response = await api.get('/restaurants/me');
        const restaurantSlug = response.data?.slug || '';

        if (!isCancelled) {
          setSlug(restaurantSlug);
          if (restaurantSlug) {
            localStorage.setItem(STORAGE_PUBLIC_SLUG_KEY, restaurantSlug);
            setSlugError(null);
          } else {
            setSlugError('Slug da loja não configurado.');
          }
          setSlugLoading(false);
        }
      } catch (err) {
        const cached = localStorage.getItem(STORAGE_PUBLIC_SLUG_KEY) || '';
        if (!isCancelled) {
          setSlug(cached);
          setSlugLoading(false);
          setSlugError(
            cached
              ? 'Usando slug em cache (verificar backend).'
              : 'Não foi possível carregar slug da loja. Verifique backend/autenticação.',
          );
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  const publicMenuUrl = useMemo(() => {
    if (!slug || typeof window === 'undefined') return '';
    return `${window.location.origin}/r/${slug}`;
  }, [slug]);

  useEffect(() => {
    if (!publicMenuUrl) {
      setQrCodeDataUrl(null);
      return;
    }

    void QRCode.toDataURL(publicMenuUrl, {
      width: 512,
      margin: 1,
    })
      .then((dataUrl: string) => setQrCodeDataUrl(dataUrl))
      .catch(() => setQrCodeDataUrl(null));
  }, [publicMenuUrl]);

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `qrcode-${slug || 'restaurante'}.png`;
    link.click();
  };

  const handlePrintQr = () => {
    if (!qrCodeDataUrl || !publicMenuUrl) return;

    const printWindow = window.open('', '_blank', 'width=720,height=720');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head><title>QR Code ${slug}</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 24px;">
          <h2>QR Code do Cardápio</h2>
          <p>${publicMenuUrl}</p>
          <img src="${qrCodeDataUrl}" alt="QR Code do cardápio" style="width: 320px; height: 320px;" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleCopyLink = async () => {
    if (!publicMenuUrl) return;

    try {
      await navigator.clipboard.writeText(publicMenuUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

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

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-3">
            <h3 className="text-lg font-semibold text-ink-900">QR Code do Cardápio</h3>
            <p className="text-sm text-ink-600">
              Use este QR no balcão/mesa para os clientes abrirem seu cardápio público.
            </p>

            <div className="space-y-1">
              <label htmlFor="public-slug" className="block text-xs font-semibold uppercase tracking-wide text-ink-500">
                Slug público da loja
              </label>
              <div
                id="public-slug"
                className="w-full rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-900"
              >
                {slugLoading ? 'Detectando slug da loja...' : slug || 'Slug indisponível'}
              </div>
            </div>

            <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-700">
              {publicMenuUrl || 'Defina um slug para gerar o link público.'}
            </div>

            {slugError ? <p className="text-xs text-red-600">{slugError}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleCopyLink} disabled={!publicMenuUrl}>
                {copied ? 'Link copiado' : 'Copiar link'}
              </Button>
              <Button variant="secondary" onClick={handleDownloadQr} disabled={!qrCodeDataUrl}>
                Baixar QR (PNG)
              </Button>
              <Button variant="secondary" onClick={handlePrintQr} disabled={!qrCodeDataUrl}>
                Imprimir QR
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Code do cardápio" className="h-48 w-48" />
            ) : (
              <div className="flex h-48 w-48 items-center justify-center text-sm text-ink-500">
                Gerando QR Code...
              </div>
            )}
          </div>
        </div>
      </Card>
    </Section>
  );
}
