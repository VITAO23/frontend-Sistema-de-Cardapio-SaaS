import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../services/api';
import { Alert, AvatarUploader, Button, Card, Input, Section, Select, Textarea } from '../components';

const restaurantSchema = z.object({
  name: z.string().min(2, 'Informe o nome do restaurante.'),
  address: z.string().optional(),
  whatsapp: z.string().optional(),
});

type RestaurantForm = z.infer<typeof restaurantSchema>;

type MenuSettings = {
  status: 'open' | 'closed';
  openingHours: string;
  deliveryTime: string;
  pickupTime: string;
  deliveryInfo: string;
};

type RestaurantResponse = {
  name?: string | null;
  address?: string | null;
  whatsapp?: string | null;
  logoUrl?: string | null;
  slug?: string | null;
  status?: 'open' | 'closed' | null;
  openingHours?: string | null;
  deliveryTime?: string | null;
  pickupTime?: string | null;
  deliveryInfo?: string | null;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const MENU_SETTINGS_KEY = 'public-menu-settings';

const defaultMenuSettings: MenuSettings = {
  status: 'open',
  openingHours: 'Seg - Dom | 18:00 - 23:00',
  deliveryTime: '50 - 70 min',
  pickupTime: '25 - 40 min',
  deliveryInfo: 'Entregas em um raio de 6 km. Taxa a partir de R$ 6,00.',
};

function readMenuSettings() {
  const raw = localStorage.getItem(MENU_SETTINGS_KEY);
  if (!raw) return defaultMenuSettings;

  try {
    const parsed = JSON.parse(raw) as Partial<MenuSettings>;
    return { ...defaultMenuSettings, ...parsed };
  } catch {
    return defaultMenuSettings;
  }
}

function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  return `${API_URL.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }

  return fallback;
}

async function processImageToJpeg(file: File, size = 400) {
  return new Promise<Blob | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

export default function RestaurantDataPage() {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [slug, setSlug] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuSettings, setMenuSettings] = useState<MenuSettings>(() => readMenuSettings());

  const { register, handleSubmit, setValue } = useForm<RestaurantForm>({
    resolver: zodResolver(restaurantSchema),
  });

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await api.get<RestaurantResponse>('/restaurants/me');
        const data = res.data;
        setValue('name', data.name ?? '');
        setValue('address', data.address ?? '');
        setValue('whatsapp', data.whatsapp ?? '');
        if (data.logoUrl) setLogoPreview(resolveMediaUrl(data.logoUrl));
        if (data.slug) setSlug(data.slug);

        setMenuSettings((current) => ({
          ...current,
          status: data.status ?? current.status,
          openingHours: data.openingHours ?? current.openingHours,
          deliveryTime: data.deliveryTime ?? current.deliveryTime,
          pickupTime: data.pickupTime ?? current.pickupTime,
          deliveryInfo: data.deliveryInfo ?? current.deliveryInfo,
        }));
      } catch (err) {
        setSubmitError(getErrorMessage(err, 'Erro ao carregar dados do restaurante.'));
      } finally {
        setLoading(false);
      }
    })();
  }, [setValue]);

  useEffect(() => {
    if (!slug || typeof window === 'undefined') {
      setQrCodeDataUrl(null);
      return;
    }

    const publicMenuUrl = `${window.location.origin}/r/${slug}`;
    void QRCode.toDataURL(publicMenuUrl, {
      width: 512,
      margin: 1,
    })
      .then((dataUrl: string) => setQrCodeDataUrl(dataUrl))
      .catch(() => setQrCodeDataUrl(null));
  }, [slug]);

  const publicMenuUrl = slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${slug}` : '';

  const onLogoChange = useCallback((file: File | null) => {
    setLogoFile(file);
  }, []);

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `qrcode-cardapio-${slug || 'restaurante'}.png`;
    link.click();
  };

  const handlePrintQr = () => {
    if (!qrCodeDataUrl || !publicMenuUrl) return;

    const printWindow = window.open('', '_blank', 'width=720,height=720');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head><title>QR Code Cardapio</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 24px;">
          <h2>QR Code do Cardapio</h2>
          <p>${publicMenuUrl}</p>
          <img src="${qrCodeDataUrl}" alt="QR Code do cardapio" style="width: 320px; height: 320px;" />
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

  const onSubmit = async (data: RestaurantForm) => {
    setSubmitError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await api.put('/restaurants/me', {
        ...data,
        ...menuSettings,
      });

      if (logoFile) {
        const blob = await processImageToJpeg(logoFile, 400);
        if (blob) {
          const file = new File([blob], 'logo.jpg', { type: 'image/jpeg' });
          const logoForm = new FormData();
          logoForm.append('logo', file);
          await api.post('/restaurants/me/logo', logoForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }

      setSuccess('Dados do restaurante atualizados com sucesso.');
      localStorage.setItem(MENU_SETTINGS_KEY, JSON.stringify(menuSettings));
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Erro ao atualizar dados do restaurante.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="Dados do Restaurante" subtitle="Configure o cadastro e as informacoes exibidas no cardapio">
      <Card>
        {submitError && <Alert type="error">{submitError}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4">
          <div className="grid gap-4 md:grid-cols-2 p-4">
            <Input label="Nome do restaurante" {...register('name')} />
            <Input label="WhatsApp" placeholder="(31) 99999-9999" {...register('whatsapp')} />
          </div>

          <div className="p-4">
            <Input
              label="Endereco da empresa"
              placeholder="Ex: Rua das Flores, 123 - Bairro, Cidade"
              {...register('address')}
            />
            <p className="mt-1 text-xs text-ink-500">
              Este endereco sera exibido no cardapio publico.
            </p>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
              Funcionamento e entrega
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Select
                label="Status"
                options={[
                  { value: 'open', label: 'Aberto' },
                  { value: 'closed', label: 'Fechado' },
                ]}
                value={menuSettings.status}
                onChange={(event) =>
                  setMenuSettings((current) => ({
                    ...current,
                    status: event.target.value as MenuSettings['status'],
                  }))
                }
              />

              <Input
                label="Horarios"
                placeholder="ex: Seg - Dom | 18:00 - 23:00"
                value={menuSettings.openingHours}
                onChange={(event) =>
                  setMenuSettings((current) => ({
                    ...current,
                    openingHours: event.target.value,
                  }))
                }
              />

              <Input
                label="Entrega (tempo medio)"
                placeholder="00 - 00 min"
                value={menuSettings.deliveryTime}
                onChange={(event) =>
                  setMenuSettings((current) => ({
                    ...current,
                    deliveryTime: event.target.value,
                  }))
                }
              />

              <Input
                label="Retirada (tempo medio)"
                placeholder="00 - 00 min"
                value={menuSettings.pickupTime}
                onChange={(event) =>
                  setMenuSettings((current) => ({
                    ...current,
                    pickupTime: event.target.value,
                  }))
                }
              />
            </div>

            <div className="mt-4">
              <Textarea
                label="Info de entrega"
                placeholder="Ex: Entregamos em um raio de 6 km. Taxa a partir de R$ 6,00."
                rows={2}
                value={menuSettings.deliveryInfo}
                onChange={(event) =>
                  setMenuSettings((current) => ({
                    ...current,
                    deliveryInfo: event.target.value,
                  }))
                }
              />
            </div>
            <p className="mt-2 text-xs text-ink-500">
              Estas informacoes aparecem no cardapio publico.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <AvatarUploader initialUrl={logoPreview} onChange={onLogoChange} label="Logo da loja" inputId="store-logo" />
              <p className="mt-2 text-xs text-ink-500">Tamanho recomendado: 400x400px</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" isLoading={loading}>
              Salvar
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full space-y-3 lg:max-w-xl">
            <h3 className="text-lg font-semibold text-ink-900">QR Code do Cardapio</h3>
            <p className="text-sm text-ink-600">
              Compartilhe este QR code com seus clientes para eles acessarem o cardapio online.
            </p>

            <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-700">
              {publicMenuUrl || 'Gerando link...'}
            </div>

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

          <div className="flex w-full justify-center lg:w-auto lg:justify-end">
            <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR Code do cardapio" className="h-48 w-48" />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center text-sm text-ink-500">
                  Gerando QR Code...
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Section>
  );
}
