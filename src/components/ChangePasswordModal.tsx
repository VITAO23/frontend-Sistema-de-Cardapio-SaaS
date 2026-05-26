import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from './Button';
import Input from './Input';
import Card from './Card';
import Alert from './Alert';
import { api } from '../services/api';
import { API_ENDPOINTS } from '../services/endpoints';

const schema = z.object({
  currentPassword: z.string().min(6, 'Informe a senha atual.'),
  newPassword: z.string().min(6, 'A nova senha precisa ter ao menos 6 caracteres.'),
  confirmPassword: z.string().min(6),
}).refine((v) => v.newPassword === v.confirmPassword, {
  message: 'Senha de confirmação não confere.',
  path: ['confirmPassword'],
});

type Form = z.infer<typeof schema>;

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }

  return fallback;
}

export default function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = 'change-password-title';

  const { register, handleSubmit, reset } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.[0]?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const onSubmit = async (data: Form) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post(API_ENDPOINTS.CHANGE_PASSWORD, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccess('Senha alterada com sucesso.');
      reset();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao alterar senha.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-md" ref={panelRef}>
        <Card>
          <h3 id={titleId} className="mb-4 text-lg font-semibold">
            Alterar senha
          </h3>
          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <Input label="Senha atual" type="password" {...register('currentPassword')} />
            <Input label="Nova senha" type="password" {...register('newPassword')} />
            <Input label="Confirmar nova senha" type="password" {...register('confirmPassword')} />

            <div className="flex gap-2">
              <Button type="submit" isLoading={loading}>
                Salvar
              </Button>
              <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">
                Fechar
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
