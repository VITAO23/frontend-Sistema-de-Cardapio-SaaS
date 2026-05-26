import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import { z } from 'zod';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, cachedRequest, hasFreshCache, invalidateCache, readCache } from '../services/api';
import { API_BASE_URL, API_ENDPOINTS } from '../services/endpoints';
import { Alert, AvatarUploader, Button, Card, Input, Section, Select, Textarea } from '../components';

const restaurantSchema = z.object({
  name: z.string().min(2, 'Informe o nome do restaurante.'),
  address: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  whatsapp: z.string().optional(),
  status: z.enum(['open', 'closed']).default('open'),
  openingHours: z.string().optional(),
  deliveryEnabled: z.boolean().default(true),
  deliveryTime: z.string().optional(),
  pickupTime: z.string().optional(),
  deliveryInfo: z.string().optional(),
  deliveryFee: z.coerce.number().optional(),
  deliveryRadiusKm: z.coerce.number().optional(),
});

type RestaurantForm = z.infer<typeof restaurantSchema>;

type RestaurantResponse = {
  name?: string | null;
  address?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  whatsapp?: string | null;
  logoUrl?: string | null;
  slug?: string | null;
  status?: 'open' | 'closed' | null;
  openingHours?: string | null;
  deliveryEnabled?: boolean | null;
  deliveryTime?: string | null;
  pickupTime?: string | null;
  deliveryInfo?: string | null;
  deliveryFee?: number | null;
  deliveryRadiusKm?: number | null;
  publicMenuUrl?: string | null;
  publicMenuAliasUrl?: string | null;
  qrUrl?: string | null;
};

const emptyFormValues: RestaurantForm = {
  name: '',
  address: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  whatsapp: '',
  status: 'open',
  openingHours: '',
  deliveryEnabled: true,
  deliveryTime: '',
  pickupTime: '',
  deliveryInfo: '',
  deliveryFee: undefined,
  deliveryRadiusKm: undefined,
};

const imageBaseUrl = API_BASE_URL.replace(/\/$/, '');

function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  return `${imageBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }

  return fallback;
}

function mapRestaurantToForm(data: RestaurantResponse): RestaurantForm {
  return {
    ...emptyFormValues,
    name: data.name ?? '',
    address: data.address ?? '',
    street: data.street ?? '',
    number: data.number ?? '',
    complement: data.complement ?? '',
    neighborhood: data.neighborhood ?? '',
    city: data.city ?? '',
    state: data.state ?? '',
    zipCode: data.zipCode ?? '',
    whatsapp: data.whatsapp ?? '',
    status: data.status ?? 'open',
    openingHours: data.openingHours ?? '',
    deliveryEnabled: data.deliveryEnabled ?? true,
    deliveryTime: data.deliveryTime ?? '',
    pickupTime: data.pickupTime ?? '',
    deliveryInfo: data.deliveryInfo ?? '',
    deliveryFee: data.deliveryFee ?? undefined,
    deliveryRadiusKm: data.deliveryRadiusKm ?? undefined,
  };
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
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(null);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function RestaurantDataPage() {
  const [loading, setLoading] = useState(() => !readCache<RestaurantResponse>('restaurants/me'));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [slug, setSlug] = useState('');
  const [restaurantReady, setRestaurantReady] = useState(false);
  const [restaurantData, setRestaurantData] = useState<RestaurantResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, reset } = useForm<RestaurantForm>({
    defaultValues: emptyFormValues,
    resolver: zodResolver(restaurantSchema) as Resolver<RestaurantForm>,
  });

  useEffect(() => {
    void (async () => {
      const hasCache = hasFreshCache('restaurants/me');

      if (!hasCache) {
        setLoading(true);
      }
      setSubmitError(null);
      try {
        const data = await cachedRequest<RestaurantResponse>('restaurants/me', async () => {
          const res = await api.get<RestaurantResponse>(API_ENDPOINTS.RESTAURANT);
          return res.data;
        });
        setRestaurantData(data);
        setRestaurantReady(true);
        setIsEditing(false);
        reset(mapRestaurantToForm(data));
        if (data.logoUrl) setLogoPreview(resolveMediaUrl(data.logoUrl));
        if (data.slug) setSlug(data.slug);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setRestaurantReady(false);
          setRestaurantData(null);
          setIsEditing(true);
          reset(emptyFormValues);
          setSlug('');
          setLogoPreview(null);
          return;
        }

        setSubmitError(getErrorMessage(err, 'Erro ao carregar dados do restaurante.'));
      } finally {
        setLoading(false);
      }
    })();
  }, [reset]);

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
      const payload = {
        name: data.name,
        address: data.address?.trim() || `${data.street ?? ''} ${data.number ?? ''}`.trim(),
        street: data.street,
        number: data.number,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        whatsapp: data.whatsapp,
        status: data.status,
        openingHours: data.openingHours,
        deliveryEnabled: data.deliveryEnabled,
        deliveryTime: data.deliveryTime,
        pickupTime: data.pickupTime,
        deliveryInfo: data.deliveryInfo,
        deliveryFee: data.deliveryFee,
        deliveryRadiusKm: data.deliveryRadiusKm,
      };

      const response = await api.put<RestaurantResponse>(API_ENDPOINTS.RESTAURANT, payload);
      const savedRestaurant = response.data;
      invalidateCache('restaurants/me');
      setRestaurantReady(true);
      setRestaurantData(savedRestaurant);
      setIsEditing(false);
      setSlug(savedRestaurant.slug ?? slug);
      if (savedRestaurant.logoUrl) setLogoPreview(resolveMediaUrl(savedRestaurant.logoUrl));
      reset(mapRestaurantToForm({ ...savedRestaurant, address: savedRestaurant.address ?? payload.address }));

      if (logoFile) {
        const blob = await processImageToJpeg(logoFile, 400);
        if (blob) {
          const file = new File([blob], 'logo.jpg', { type: 'image/jpeg' });
          const logoForm = new FormData();
          logoForm.append('logo', file);
          await api.post(API_ENDPOINTS.RESTAURANT_LOGO, logoForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          invalidateCache('restaurants/me');
        }
      }

      setSuccess(restaurantReady ? 'Dados do restaurante atualizados com sucesso.' : 'Restaurante criado e dados salvos com sucesso.');
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Erro ao atualizar dados do restaurante.'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (restaurantData) {
      reset(mapRestaurantToForm(restaurantData));
    } else {
      reset(emptyFormValues);
    }

    setLogoFile(null);
    setIsEditing(false);
  };

  const isFormLocked = restaurantReady && !isEditing;
  const showSubmitAction = !restaurantReady || isEditing;

  return (
    <Section
      title="Dados do Restaurante"
      subtitle="Configure o cadastro e as informacoes exibidas no cardapio"
    >
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4">
          {!restaurantReady && (
            <Alert type="warning">
              Ainda não existe um restaurante vinculado a este usuário. Preencha os dados abaixo e salve para criar.
            </Alert>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-ink-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Formulário</p>
              <p className="text-sm text-ink-600">
                {restaurantReady
                  ? isEditing
                    ? 'Edição liberada. Salve para aplicar as mudanças.'
                    : 'Dados bloqueados. Clique em Editar para alterar.'
                  : 'Preencha os dados e salve para criar seu restaurante.'}
              </p>
            </div>
            {restaurantReady ? (
              isEditing ? (
                <Button type="button" variant="secondary" size="sm" onClick={handleCancelEdit}>
                  Cancelar edição
                </Button>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={handleEdit}>
                  Editar formulário
                </Button>
              )
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 p-4">
            <Input label="Nome do restaurante" {...register('name')} disabled={isFormLocked} />
            <Input label="WhatsApp" placeholder="(31) 99999-9999" {...register('whatsapp')} disabled={isFormLocked} />
            <Input label="CEP" placeholder="30100-000" {...register('zipCode')} disabled={isFormLocked} />
            <Input label="Estado" placeholder="MG" {...register('state')} disabled={isFormLocked} />
            <Input label="Cidade" placeholder="Belo Horizonte" {...register('city')} disabled={isFormLocked} />
            <Input label="Bairro" placeholder="Centro" {...register('neighborhood')} disabled={isFormLocked} />
          </div>

          <div className="grid gap-4 md:grid-cols-3 p-4">
            <Input label="Rua" placeholder="Rua das Flores" {...register('street')} disabled={isFormLocked} />
            <Input label="Número" placeholder="123" {...register('number')} disabled={isFormLocked} />
            <Input label="Complemento" placeholder="Loja A" {...register('complement')} disabled={isFormLocked} />
          </div>

          <div className="p-4">
            <Input
              label="Endereço completo"
              placeholder="Rua das Flores, 123 - Centro, Cidade"
              {...register('address')}
              disabled={isFormLocked}
            />
            <p className="mt-1 text-xs text-ink-500">Se vazio, o sistema pode montar o endereço com rua, número e cidade.</p>
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
                disabled={isFormLocked}
                {...register('status')}
              />

              <Input
                label="Horarios"
                placeholder="ex: Seg - Dom | 18:00 - 23:00"
                disabled={isFormLocked}
                {...register('openingHours')}
              />

              <label className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm font-medium text-ink-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-ink-300"
                  disabled={isFormLocked}
                  {...register('deliveryEnabled')}
                />
                Entrega habilitada
              </label>

              <Input
                label="Entrega (tempo medio)"
                placeholder="00 - 00 min"
                disabled={isFormLocked}
                {...register('deliveryTime')}
              />

              <Input
                label="Retirada (tempo medio)"
                placeholder="00 - 00 min"
                disabled={isFormLocked}
                {...register('pickupTime')}
              />

              <Input
                label="Taxa de entrega"
                type="number"
                step="0.01"
                placeholder="6.00"
                disabled={isFormLocked}
                {...register('deliveryFee')}
              />

              <Input
                label="Raio de entrega (km)"
                type="number"
                step="0.1"
                placeholder="6"
                disabled={isFormLocked}
                {...register('deliveryRadiusKm')}
              />
            </div>

            <div className="mt-4">
              <Textarea
                label="Info de entrega"
                placeholder="Ex: Entregamos em um raio de 6 km. Taxa a partir de R$ 6,00."
                rows={2}
                disabled={isFormLocked}
                {...register('deliveryInfo')}
              />
            </div>
            <p className="mt-2 text-xs text-ink-500">
              Estas informacoes aparecem no cardapio publico.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-1">
            <div>
              <AvatarUploader
                initialUrl={logoPreview}
                onChange={onLogoChange}
                label="Logo da loja"
                inputId="store-logo"
                disabled={isFormLocked}
              />
              <p className="mt-2 text-xs text-ink-500">Tamanho recomendado: 400x400px</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {showSubmitAction ? (
              <Button type="submit" isLoading={loading}>
                Salvar
              </Button>
            ) : null}
            {submitError && <Alert type="error">{submitError}</Alert>}
            {success && <Alert type="success">{success}</Alert>}
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
