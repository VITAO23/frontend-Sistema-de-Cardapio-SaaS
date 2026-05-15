import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../services/api';
import { Input, Button, Section, Card, Alert, AvatarUploader } from '../components';
import ChangePasswordModal from '../components/ChangePasswordModal';

const profileSchema = z.object({
  name: z.string().min(2, 'Informe seu nome.'),
  email: z.string().email('Email inválido.'),
});

type ProfileForm = z.infer<typeof profileSchema>;

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
        if (user.avatarUrl) setAvatarPreview(user.avatarUrl);

        try {
          const restaurantRes = await api.get('/restaurants/me');
          if (restaurantRes.data?.logoUrl) {
            setAvatarPreview(restaurantRes.data.logoUrl);
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

  // avatar handled by AvatarUploader
  const onAvatarChange = useCallback((f: File | null) => {
    setAvatarFile(f);
  }, []);

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

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Input label="Nome" {...register('name')} />
            <Input label="Email" type="email" {...register('email')} />
            <div className="flex items-center gap-3">
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
          </div>

          <div className="space-y-3">
            <AvatarUploader initialUrl={avatarPreview} onChange={onAvatarChange} label="Logo da loja" inputId="store-logo" />
            <p className="text-xs text-ink-500">Tamanho recomendado: 400x400px. Esta imagem será usada no admin e no cardápio público.</p>
          </div>
        </form>
      </Card>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Section>
  );
}
