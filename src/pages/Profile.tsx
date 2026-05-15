import { useEffect, useState } from 'react';
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
        if (user.avatarUrl) setAvatarPreview(user.avatarUrl);
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [setValue]);

  // avatar handled by AvatarUploader
  const onAvatarChange = (f: File | null) => {
    setAvatarFile(f);
    setAvatarPreview(f ? URL.createObjectURL(f) : avatarPreview);
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
    setLoading(true);

    try {
      await api.put('/users/me', data);

      if (avatarFile) {
        const blob = await processImageToJpeg(avatarFile, 400);
        if (blob) {
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          const form = new FormData();
          form.append('avatar', file);
          await api.post('/users/me/avatar', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }

      setSuccess('Perfil atualizado com sucesso.');
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="Meu Perfil" subtitle="Atualize suas informações pessoais">
      <Card>
        {submitError && <Alert type="error">{submitError}</Alert>}
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
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-500">Avatar</label>
            <AvatarUploader initialUrl={avatarPreview} onChange={onAvatarChange} />
            <p className="text-xs text-ink-500">Tamanho recomendado: 400x400px</p>
          </div>
        </form>
      </Card>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Section>
  );
}
