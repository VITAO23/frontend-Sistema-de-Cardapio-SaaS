import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Badge, Button, Input } from '../components';
import { useAuth } from '../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Informe um email válido.'),
  password: z.string().min(6, 'Informe uma senha com 6 caracteres.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
  });

  const onSubmit = async (data: LoginFormData) => {
    setSubmitError(null);
    try {
      await login(data);
      navigate('/dashboard');
    } catch {
      setSubmitError('Não foi possível entrar. Verifique seus dados.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-50 via-white to-mint-50 text-ink-900">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-center gap-6">
            <Badge variant="default">Painel administrativo</Badge>
            <h1 className="text-4xl font-bold leading-tight text-ink-900 md:text-5xl">
              Gerencie seu cardápio em minutos.
            </h1>
            <p className="max-w-xl text-base text-ink-600">
              Controle categorias, produtos e imagens sem perder tempo. Comece pelo login e valide
              toda a API agora mesmo.
            </p>
            <div className="flex items-center gap-4 text-sm text-ink-500">
              <div className="h-px w-10 bg-ink-200" />
              <span>Backend pronto para integrar</span>
            </div>
          </div>

          <div className="fade-in rounded-3xl border border-ink-200 bg-white/90 p-8 shadow-[0_24px_60px_rgba(31,41,55,0.1)] backdrop-blur">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-ink-900">Entrar</h2>
              <p className="mt-2 text-sm text-ink-500">
                Use o usuário demo para testar a integração completa.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Input
                type="email"
                label="Email"
                placeholder="victor@email.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                type="password"
                label="Senha"
                placeholder="••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />

              {submitError ? <Alert type="error">{submitError}</Alert> : null}

              <Button type="submit" isLoading={isSubmitting} className="w-full">
                Entrar
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 text-xs">
              <p className="font-semibold text-ink-700">Credenciais de demo:</p>
              <p className="mt-1 font-mono text-ink-600">victor@email.com / 123456</p>
            </div>

            <div className="mt-4 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-600">
              Ainda não tem conta?{' '}
              <Link to="/register" className="font-semibold text-ink-900 underline underline-offset-4">
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
