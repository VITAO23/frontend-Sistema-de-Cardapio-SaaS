import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../services/api';
import { Input, Button, Section, Card, Alert, AvatarUploader } from '../components';
import ChangePasswordModal from '../components/ChangePasswordModal';

const profileSchema = z.object({
  name: z.string().min(2, 'Informe seu nome.'),
  email: z.string().email('Email inválido.'),
  address: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

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

export default function ProfilePage() {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [logoSyncWarning, setLogoSyncWarning] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, setValue } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await api.get('/users/me');
        const user = res.data;
        setValue('name', user.name ?? '');
        setValue('email', user.email ?? '');
        setValue('address', user.address ?? '');
        if (user.avatarUrl) setAvatarPreview(resolveMediaUrl(user.avatarUrl));

        try {
          const restaurantRes = await api.get('/restaurants/me');
          if (restaurantRes.data?.logoUrl) {
            setAvatarPreview(resolveMediaUrl(restaurantRes.data.logoUrl));
          }
          if (restaurantRes.data?.slug) {
            setSlug(restaurantRes.data.slug);
          }
        } catch {
          // Restaurant logo endpoint may be unavailable for some accounts.
        }
      } catch (err) {
        // ignore
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

  const onAvatarChange = useCallback((f: File | null) => {
    setAvatarFile(f);
  }, []);

  const publicMenuUrl = slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${slug}` : '';

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
        <head><title>QR Code Cardápio</title></head>
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

  const onSubmit = async (data: ProfileForm) => {
    setSubmitError(null);
    setSuccess(null);
    setLogoSyncWarning(null);
    setLoading(true);

    try {
      await api.put('/users/me', data);

      if (avatarFile) {
        const blob = await processImageToJpeg(avatarFile, 400);
        if (blob) {
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          const avatarForm = new FormData();
          avatarForm.append('avatar', file);
          await api.post('/users/me/avatar', avatarForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          const logoForm = new FormData();
          logoForm.append('logo', file);
          try {
            await api.post('/restaurants/me/logo', logoForm, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          } catch {
            setLogoSyncWarning(
              'Avatar salvo, mas não foi possível sincronizar a logo da loja. Verifique o endpoint /restaurants/me/logo no backend.',
            );
          }
        }
      }

      setSuccess('Perfil atualizado com sucesso.');
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Erro ao atualizar perfil.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="Meu Perfil" subtitle="Atualize suas informações pessoais">
      <Card>
        {submitError && <Alert type="error">{submitError}</Alert>}
        {logoSyncWarning && <Alert type="warning">{logoSyncWarning}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nome" {...register('name')} />
            <Input label="Email" type="email" {...register('email')} />
          </div>

          <div>
            <Input
              label="Endereço da empresa"
              placeholder="Ex: Rua das Flores, 123 - Bairro, Cidade"
              {...register('address')}
            />
            <p className="mt-1 text-xs text-ink-500">
              Este endereço será exibido no cardápio público
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <AvatarUploader initialUrl={avatarPreview} onChange={onAvatarChange} label="Logo da loja" inputId="store-logo" />
              <p className="mt-2 text-xs text-ink-500">Tamanho recomendado: 400x400px</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" isLoading={loading}>
              Salvar
            </Button>
            <button
              type="button"
              onClick={() => setPasswordOpen(true)}
              className="rounded-xl border border-ink-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-600"
            >
              Alterar senha
            </button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full space-y-3 lg:max-w-xl">
            <h3 className="text-lg font-semibold text-ink-900">QR Code do Cardápio</h3>
            <p className="text-sm text-ink-600">
              Compartilhe este QR code com seus clientes para eles acessarem o cardápio online.
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
                <img src={qrCodeDataUrl} alt="QR Code do cardápio" className="h-48 w-48" />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center text-sm text-ink-500">
                  Gerando QR Code...
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Section>
  );
}
