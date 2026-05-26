# Sistema de Cardápio SaaS — Frontend Admin

Painel administrativo para gerenciar cardápios de restaurantes. Desenvolvido com **React + TypeScript + Vite + Tailwind CSS**.

## Visão Geral

Este é o **frontend do painel administrativo** que valida a integração com o backend. Permite:

- ✅ Autenticação com JWT
- ✅ CRUD de categorias
- ✅ CRUD de produtos
- ✅ Upload de imagens (multipart/form-data)
- ✅ Rotas protegidas
- ✅ Interceptor automático de token

## Estrutura de Pastas

```
src/
├── components/        # Componentes reutilizáveis (futuros)
├── pages/            # Páginas: Login, Dashboard, Categories, Products
├── layouts/          # AppLayout (header + sidebar)
├── routes/           # Router, ProtectedRoute
├── contexts/         # AuthContext (autenticação global)
├── hooks/            # useAuth
├── services/         # api.ts (cliente axios com interceptor)
├── styles/           # globals.css (Tailwind), reset.css
├── App.tsx           # Raiz do app
└── main.tsx          # Entry point
```

## Setup & Execução

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar URL da API (opcional)
Crie um `.env` na raiz:
```env
VITE_API_URL=http://localhost:3333
```
Use como base o arquivo `.env.example`.

### 3. Rodar em desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:5173`.

### 4. Build para produção
```bash
npm run build
npm run preview
```

## Fluxo de Autenticação

1. **Login** (`POST /login`)
   - Email + Senha
   - Backend retorna `{ token, user }`
   - Token salvo em `localStorage`

2. **Interceptor automático**
   - Todo request adiciona `Authorization: Bearer <token>`
   - Token expirado: erro 401 (backend)

3. **Redirecionamento**
   - Após login → `/dashboard`
   - Sem token → `/login`

## Rotas Disponíveis

### Públicas
- `/login` — Tela de login

### Protegidas
- `/dashboard` — Visão geral
- `/categories` — CRUD de categorias
- `/products` — CRUD de produtos + upload

## Endpoints Esperados (Backend)

### Autenticação
```
POST /login
  Body: { email, password }
  Response: { token, user }
```

### Categorias
```
GET /categories
POST /categories
  Body: { name }
PUT /categories/:id
  Body: { name }
DELETE /categories/:id
```

### Produtos
```
GET /products
POST /products
  Body (multipart): name, description, price, categoryId, image
PUT /products/:id
  Body (multipart): name, description, price, categoryId, image
DELETE /products/:id
```

## Arquivos-Chave

| Arquivo | Propósito |
|---------|-----------|
| `src/contexts/AuthContext.tsx` | Estado global de autenticação |
| `src/hooks/useAuth.ts` | Hook para acessar contexto auth |
| `src/services/api.ts` | Cliente axios + interceptor |
| `src/routes/AppRoutes.tsx` | Definição de rotas e proteção |
| `src/pages/Login.tsx` | Tela de login com validação zod |
| `src/pages/Categories.tsx` | CRUD de categorias |
| `src/pages/Products.tsx` | CRUD de produtos + upload |
| `src/layouts/AppLayout.tsx` | Layout base (header + sidebar) |

## Validação & Formulários

- **react-hook-form** — Gerenciamento de forms
- **zod** — Validação de schemas
- **@hookform/resolvers** — Integração form + zod

## Estilização

- **Tailwind CSS v4** — Utility-first CSS
- **Paleta personalizada** — `ink` (azul-escuro) e `mint` (verde)
- **Tema claro** — Definido no `tailwind.config.js`

## Scripts

```bash
npm run dev       # Desenvolver com hot reload
npm run build     # Build para produção
npm run lint      # Validar código (ESLint)
npm run preview   # Preview do build
```

## Stack

- **React 19** — UI library
- **TypeScript** — Type safety
- **Vite** — Build tool
- **Tailwind CSS v4** — Styling
- **React Router v7** — Routing
- **Axios** — HTTP client
- **React Hook Form** — Form management
- **Zod** — Schema validation
