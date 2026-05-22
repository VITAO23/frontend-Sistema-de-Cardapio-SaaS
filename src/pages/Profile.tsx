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
        if (user.avatarUrl) setAvatarPreview(resolveMediaUrl(user.avatarUrl));
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [setValue]);

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4">
          <div className="grid gap-4 md:grid-cols-2 p-4">
            <Input label="Nome" {...register('name')} />
            <Input label="Email" type="email" {...register('email')} />
          </div>

          <div className="grid gap-4 md:grid-cols-1">
            <div>
              <AvatarUploader initialUrl={avatarPreview} onChange={onAvatarChange} label="Foto do usuario" inputId="user-avatar" />
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
            {submitError && <Alert type="error">{submitError}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

          </div>
        </form>
      </Card>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Section>
  );
}
