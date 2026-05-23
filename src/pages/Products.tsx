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
  available?: boolean | null;
  categoryId?: string | null;
  category?: Category | null;
  optionGroups?: Array<{
    id?: string;
    name: string;
    priceMode?: 'add' | 'replace';
    multiple?: boolean;
    required?: boolean;
    options: Array<{
      id?: string;
      name: string;
      price?: number | null;
    }>;
  }>;
};

type ProductOptionForm = {
  name: string;
  price: string;
};

type ProductOptionGroupForm = {
  name: string;
  priceMode: 'add' | 'replace';
  multiple: boolean;
  required: boolean;
  options: ProductOptionForm[];
};

const productSchema = z.object({
  name: z.string().min(2, 'Informe o nome do produto.'),
  description: z.string().optional(),
  price: z.string().min(1, 'Informe o valor do produto.'),
  categoryId: z.string().min(1, 'Selecione uma categoria.'),
  available: z.boolean().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const imageBaseUrl = API_URL.replace(/\/$/, '');
const PRODUCT_OPTION_GROUPS_KEY = 'product-option-groups';

function normalizeList<T>(payload: T[] | { [key: string]: T[] } | unknown, key: string) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object' && key in payload) {
    return (payload as { [key: string]: T[] })[key] ?? [];
  }

  return [];
}

function createEmptyOptionGroup(): ProductOptionGroupForm {
  return {
    name: '',
    priceMode: 'add',
    multiple: false,
    required: false,
    options: [{ name: '', price: '' }],
  };
}

function resolveGroupPriceMode(groupName: string, priceMode?: string): 'add' | 'replace' {
  if (priceMode === 'add' || priceMode === 'replace') {
    return priceMode;
  }

  return /tamanho|size|tam\b/i.test(groupName) ? 'replace' : 'add';
}

function normalizeOptionGroups(optionGroups: ProductOptionGroupForm[]) {
  return optionGroups
    .map((group) => ({
      name: group.name.trim(),
      priceMode: resolveGroupPriceMode(group.name, group.priceMode),
      multiple: group.multiple,
      required: group.required,
      options: group.options
        .map((option) => ({
          name: option.name.trim(),
          price: option.price.trim() ? Number(option.price) : null,
        }))
        .filter((option) => option.name),
    }))
    .filter((group) => group.name && group.options.length > 0);
}

function saveLocalOptionGroups(productId: string, optionGroups: ProductOptionGroupForm[]) {
  const normalizedOptionGroups = normalizeOptionGroups(optionGroups);

  if (typeof window === 'undefined') return;

  const currentValue = localStorage.getItem(PRODUCT_OPTION_GROUPS_KEY);
  const currentMap = currentValue ? (JSON.parse(currentValue) as Record<string, unknown>) : {};
  currentMap[productId] = normalizedOptionGroups;
  localStorage.setItem(PRODUCT_OPTION_GROUPS_KEY, JSON.stringify(currentMap));
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroupForm[]>([]);
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
      available: true,
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
      setValue('available', editingProduct.available ?? true);
      setOptionGroups(
        editingProduct.optionGroups?.length
          ? editingProduct.optionGroups.map((group) => ({
              name: group.name,
              priceMode: resolveGroupPriceMode(group.name, group.priceMode),
              multiple: Boolean(group.multiple),
              required: Boolean(group.required),
              options: group.options.length
                ? group.options.map((option) => ({
                    name: option.name,
                    price: option.price == null ? '' : String(option.price),
                  }))
                : [{ name: '', price: '' }],
            }))
          : [],
      );
    }
  }, [editingProduct, setValue]);

  const updateOptionGroup = (
    groupIndex: number,
    updater: (group: ProductOptionGroupForm) => ProductOptionGroupForm,
  ) => {
    setOptionGroups((current) => current.map((group, index) => (index === groupIndex ? updater(group) : group)));
  };

  const addOptionGroup = () => {
    setOptionGroups((current) => [...current, createEmptyOptionGroup()]);
  };

  const removeOptionGroup = (groupIndex: number) => {
    setOptionGroups((current) => current.filter((_, index) => index !== groupIndex));
  };

  const addOptionToGroup = (groupIndex: number) => {
    updateOptionGroup(groupIndex, (group) => ({
      ...group,
      options: [...group.options, { name: '', price: '' }],
    }));
  };

  const removeOptionFromGroup = (groupIndex: number, optionIndex: number) => {
    updateOptionGroup(groupIndex, (group) => ({
      ...group,
      options: group.options.filter((_, index) => index !== optionIndex),
    }));
  };

  const onSubmit = async (data: ProductFormData) => {
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('price', data.price);
      formData.append('categoryId', data.categoryId);
      formData.append('available', String(data.available ?? true));

      if (data.description) {
        formData.append('description', data.description);
      }

      formData.append('optionGroups', JSON.stringify(normalizeOptionGroups(optionGroups)));

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      if (editingId) {
        await api.put(`/products/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        saveLocalOptionGroups(editingId, optionGroups);
      } else {
        const response = await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const createdId = response.data?.id ?? response.data?.product?.id;
        if (typeof createdId === 'string') {
          saveLocalOptionGroups(createdId, optionGroups);
        }
      }

      reset();
      setSelectedFile(null);
      setEditingId(null);
      setOptionGroups([]);
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
    setValue('available', product.available ?? true);
    setSelectedFile(null);
    setOptionGroups(
      product.optionGroups?.length
        ? product.optionGroups.map((group) => ({
            name: group.name,
            priceMode: resolveGroupPriceMode(group.name, group.priceMode),
            multiple: Boolean(group.multiple),
            required: Boolean(group.required),
            options: group.options.length
              ? group.options.map((option) => ({
                  name: option.name,
                  price: option.price == null ? '' : String(option.price),
                }))
              : [{ name: '', price: '' }],
          }))
        : [],
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSelectedFile(null);
    setOptionGroups([]);
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

            <label className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-700 md:col-span-2">
              <input type="checkbox" className="h-4 w-4 accent-ink-900" {...register('available')} />
              Produto disponível no cardápio
            </label>

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

            <div className="md:col-span-2 rounded-2xl border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Grupos de opções</p>
                  <p className="mt-1 text-sm text-ink-600">
                    Tamanho, adicionais e complementos ficam aqui. A observação do cliente vai no pedido, não no produto.
                  </p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={addOptionGroup}>
                  Adicionar grupo
                </Button>
              </div>

              <div className="mt-4 space-y-4">
                {optionGroups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 py-6 text-sm text-ink-500">
                    Nenhum grupo adicionado ainda.
                  </div>
                ) : null}

                {optionGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto_auto] md:items-end">
                      <Input
                        label="Nome do grupo"
                        placeholder="Ex: Tamanho"
                        value={group.name}
                        onChange={(event) =>
                          updateOptionGroup(groupIndex, (current) => ({ ...current, name: event.target.value }))
                        }
                      />

                      <label className="space-y-1 text-sm">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-ink-500">Modo de preço</span>
                        <select
                          value={group.priceMode}
                          onChange={(event) =>
                            updateOptionGroup(groupIndex, (current) => ({
                              ...current,
                              priceMode: event.target.value as 'add' | 'replace',
                            }))
                          }
                          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                        >
                          <option value="add">Somar ao preço base</option>
                          <option value="replace">Substituir preço base</option>
                        </select>
                      </label>

                      <label className="flex items-center gap-2 text-sm text-ink-700">
                        <input
                          type="checkbox"
                          checked={group.multiple}
                          onChange={(event) =>
                            updateOptionGroup(groupIndex, (current) => ({ ...current, multiple: event.target.checked }))
                          }
                        />
                        Múltipla escolha
                      </label>

                      <label className="flex items-center gap-2 text-sm text-ink-700">
                        <input
                          type="checkbox"
                          checked={group.required}
                          onChange={(event) =>
                            updateOptionGroup(groupIndex, (current) => ({ ...current, required: event.target.checked }))
                          }
                        />
                        Obrigatório
                      </label>

                      <Button type="button" size="sm" variant="danger" onClick={() => removeOptionGroup(groupIndex)}>
                        Remover grupo
                      </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {group.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="grid gap-3 md:grid-cols-[1fr_140px_auto] md:items-end">
                          <Input
                            label="Opção"
                            placeholder="Ex: Média"
                            value={option.name}
                            onChange={(event) =>
                              updateOptionGroup(groupIndex, (current) => ({
                                ...current,
                                options: current.options.map((currentOption, currentIndex) =>
                                  currentIndex === optionIndex ? { ...currentOption, name: event.target.value } : currentOption,
                                ),
                              }))
                            }
                          />
                          <Input
                            label="Preço adicional"
                            placeholder="0.00"
                            inputMode="decimal"
                            value={option.price}
                            onChange={(event) =>
                              updateOptionGroup(groupIndex, (current) => ({
                                ...current,
                                options: current.options.map((currentOption, currentIndex) =>
                                  currentIndex === optionIndex ? { ...currentOption, price: event.target.value } : currentOption,
                                ),
                              }))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => removeOptionFromGroup(groupIndex, optionIndex)}
                          >
                            Remover
                          </Button>
                        </div>
                      ))}

                      <Button type="button" size="sm" variant="secondary" onClick={() => addOptionToGroup(groupIndex)}>
                        Adicionar opção
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
