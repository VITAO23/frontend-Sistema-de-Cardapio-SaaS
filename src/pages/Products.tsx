import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Badge, Button, Card, Input, Section, Select, Textarea } from '../components';
import { api } from '../services/api';

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  categoryId?: string | null;
  category?: Category | null;
};

const productSchema = z.object({
  name: z.string().min(2, 'Informe o nome do produto.'),
  description: z.string().optional(),
  price: z.string().min(1, 'Informe o valor do produto.'),
  categoryId: z.string().min(1, 'Selecione uma categoria.'),
});

type ProductFormData = z.infer<typeof productSchema>;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const imageBaseUrl = API_URL.replace(/\/$/, '');

function normalizeList<T>(payload: T[] | { [key: string]: T[] } | unknown, key: string) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object' && key in payload) {
    return (payload as { [key: string]: T[] })[key] ?? [];
  }

  return [];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '',
      categoryId: '',
    },
  });

  const editingProduct = useMemo(
    () => products.find((product) => product.id === editingId) || null,
    [editingId, products],
  );

  const loadData = async () => {
    setLoading(true);

    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
      ]);

      setProducts(normalizeList<Product>(productsResponse.data, 'products'));
      setCategories(normalizeList<Category>(categoriesResponse.data, 'categories'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (editingProduct) {
      setValue('name', editingProduct.name);
      setValue('description', editingProduct.description ?? '');
      setValue('price', String(editingProduct.price ?? ''));
      setValue('categoryId', editingProduct.categoryId ?? editingProduct.category?.id ?? '');
    }
  }, [editingProduct, setValue]);

  const onSubmit = async (data: ProductFormData) => {
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('price', data.price);
      formData.append('categoryId', data.categoryId);

      if (data.description) {
        formData.append('description', data.description);
      }

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      if (editingId) {
        await api.put(`/products/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      reset();
      setSelectedFile(null);
      setEditingId(null);
      await loadData();
    } catch {
      setSubmitError('Nao foi possivel salvar o produto.');
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setValue('name', product.name);
    setValue('description', product.description ?? '');
    setValue('price', String(product.price ?? ''));
    setValue('categoryId', product.categoryId ?? product.category?.id ?? '');
    setSelectedFile(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSelectedFile(null);
    reset();
  };

  const handleDelete = async (productId: string) => {
    setSubmitError(null);

    try {
      await api.delete(`/products/${productId}`);
      await loadData();
    } catch {
      setSubmitError('Nao foi possivel excluir o produto.');
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const previewSource = selectedFile ? URL.createObjectURL(selectedFile) : null;

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  return (
    <Section
      title="Produtos"
      subtitle="Cadastre itens com imagem para validar o fluxo completo de integração."
    >
      <Card className="border-ink-100 bg-gradient-to-br from-ink-50 to-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Badge variant={editingId ? 'warning' : 'default'}>
              {editingId ? 'Editando' : 'Novo produto'}
            </Badge>
            <h3 className="mt-3 text-xl font-bold text-ink-900">
              {editingId ? 'Atualize os dados' : 'Crie um novo produto'}
            </h3>
          </div>
          {editingId ? (
            <Button variant="secondary" size="sm" onClick={cancelEdit}>
              Cancelar
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Nome do produto"
                placeholder="Ex: Pizza Margherita"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            <div className="md:col-span-2">
              <Textarea
                label="Descrição"
                placeholder="Descrição curta do produto"
                rows={3}
                error={errors.description?.message}
                {...register('description')}
              />
            </div>

            <Input
              label="Preço"
              type="text"
              placeholder="29.90"
              inputMode="decimal"
              error={errors.price?.message}
              {...register('price')}
            />

            <Select
              label="Categoria"
              options={categoryOptions}
              placeholder="Selecione uma categoria"
              error={errors.categoryId?.message}
              {...register('categoryId')}
            />

            <div className="space-y-1 md:col-span-2">
              <label
                htmlFor="product-image"
                className="block text-xs font-semibold uppercase tracking-wide text-ink-500"
              >
                Imagem
              </label>
              <input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full rounded-xl border border-dashed border-ink-300 bg-white px-4 py-3 text-sm text-ink-600 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:text-white"
              />
              <p className="text-xs text-ink-500">Enviado como multipart/form-data</p>
            </div>
          </div>

          {submitError ? (
            <Alert type="error" title="Erro ao salvar">
              {submitError}
            </Alert>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
              {editingId ? 'Atualizar produto' : 'Criar produto'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-[160px_1fr]">
        <Card className="flex flex-col items-center justify-center p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Preview</p>
          {previewSource || editingProduct?.imageUrl ? (
            <div className="mt-3 aspect-square w-full overflow-hidden rounded-xl bg-ink-100">
              {previewSource ? (
                <img src={previewSource} alt="Preview" className="h-full w-full object-cover" />
              ) : editingProduct?.imageUrl ? (
                <img
                  src={`${imageBaseUrl}/${editingProduct.imageUrl.replace(/^\//, '')}`}
                  alt={editingProduct.name}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-500">Sem imagem</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="font-semibold text-ink-900">Fluxo de upload</p>
          <p className="mt-2 text-sm text-ink-600">
            O backend recebe: <strong>name</strong>, <strong>description</strong>,
            <strong> price</strong>, <strong>categoryId</strong> e <strong>image</strong>{' '}
            (multipart).
          </p>
          <p className="mt-3 text-xs text-mint-700">
            ✓ Imagens servidas estaticamente em{' '}
            <code className="bg-ink-100 px-2 py-1">/uploads</code>
          </p>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-900">Produtos cadastrados</h3>
          <Badge variant="success">{products.length}</Badge>
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-ink-900 border-r-transparent" />
            <p className="mt-3 text-ink-500">Carregando produtos...</p>
          </Card>
        ) : products.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <p className="text-ink-500">Nenhum produto cadastrado ainda.</p>
            <p className="mt-1 text-xs text-ink-400">Crie um novo para começar.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                {product.imageUrl ? (
                  <div className="aspect-[4/3] bg-ink-100">
                    <img
                      src={`${imageBaseUrl}/${product.imageUrl.replace(/^\//, '')}`}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="space-y-3 p-4">
                  <div>
                    <Badge variant="default" size="sm">
                      {product.category?.name || 'Sem categoria'}
                    </Badge>
                    <h4 className="mt-2 font-semibold text-ink-900">{product.name}</h4>
                    {product.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-ink-600">
                        {product.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                    <span className="font-semibold text-ink-900">
                      {Number(product.price).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="secondary" size="sm" onClick={() => startEdit(product)}>
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(product.id)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}
