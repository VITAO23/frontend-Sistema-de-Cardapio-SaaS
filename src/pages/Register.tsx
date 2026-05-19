import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Badge, Button, Input } from '../components';
import { useAuth } from '../hooks/useAuth';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Informe seu nome.'),
    email: z.string().email('Informe um email válido.'),
    password: z.string().min(6, 'Informe uma senha com 6 caracteres.'),
    confirmPassword: z.string().min(6, 'Confirme sua senha.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onSubmit',
  });

  const onSubmit = async (data: RegisterFormData) => {
    setSubmitError(null);

    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      navigate('/dashboard');
    } catch {
      setSubmitError('Não foi possível criar sua conta. Verifique os dados e tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-50 via-white to-mint-50 text-ink-900">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-center gap-6">
            <Badge variant="default">Criar conta</Badge>
            <h1 className="text-4xl font-bold leading-tight text-ink-900 md:text-5xl">
              Comece sua operação em poucos minutos.
            </h1>
            <p className="max-w-xl text-base text-ink-600">
              Crie seu acesso para configurar cardápio, imagens, categorias e a experiência do cliente.
            </p>
            <div className="flex items-center gap-4 text-sm text-ink-500">
              <div className="h-px w-10 bg-ink-200" />
              <span>Cadastro ligado à API</span>
            </div>
          </div>

          <div className="fade-in rounded-3xl border border-ink-200 bg-white/90 p-8 shadow-[0_24px_60px_rgba(31,41,55,0.1)] backdrop-blur">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-ink-900">Criar conta</h2>
              <p className="mt-2 text-sm text-ink-500">
                Preencha os dados abaixo para começar.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Input
                type="text"
                label="Nome"
                placeholder="Seu nome completo"
                autoComplete="name"
                error={errors.name?.message}
                {...register('name')}
              />

              <Input
                type="email"
                label="Email"
                placeholder="voce@email.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                type="password"
                label="Senha"
                placeholder="••••••"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                type="password"
                label="Confirmar senha"
                placeholder="••••••"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              {submitError ? <Alert type="error">{submitError}</Alert> : null}

              <Button type="submit" isLoading={isSubmitting} className="w-full">
                Criar conta
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-600">
              Já tem conta?{' '}
              <Link to="/login" className="font-semibold text-ink-900 underline underline-offset-4">
                Entrar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}