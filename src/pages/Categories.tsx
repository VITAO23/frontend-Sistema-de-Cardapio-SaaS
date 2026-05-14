import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, Badge, Button, Card, Input, Section } from '../components'
import { api } from '../services/api'

const categorySchema = z.object({
  name: z.string().min(2, 'Informe o nome da categoria.'),
})

type CategoryFormData = z.infer<typeof categorySchema>

type Category = {
  id: string
  name: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  })

  const loadCategories = async () => {
    setLoading(true)
    try {
      const response = await api.get('/categories')
      const data = response.data as { categories?: Category[] } | Category[]
      const list = Array.isArray(data) ? data : data.categories ?? []
      setCategories(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCategories()
  }, [])

  const onSubmit = async (data: CategoryFormData) => {
    setSubmitError(null)
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, data)
      } else {
        await api.post('/categories', data)
      }
      reset()
      setEditingId(null)
      await loadCategories()
    } catch {
      setSubmitError('Não foi possível salvar a categoria.')
    }
  }

  const startEdit = (category: Category) => {
    setEditingId(category.id)
    setValue('name', category.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    reset()
  }

  const handleDelete = async (categoryId: string) => {
    setSubmitError(null)
    try {
      await api.delete(`/categories/${categoryId}`)
      await loadCategories()
    } catch {
      setSubmitError('Não foi possível excluir a categoria.')
    }
  }

  return (
    <Section
      title="Categorias"
      subtitle="Organize o cardápio em seções para facilitar o cadastro dos produtos."
    >
      <Card className="border-ink-100 bg-gradient-to-br from-ink-50 to-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Badge variant="default">
              {editingId ? 'Editando' : 'Nova categoria'}
            </Badge>
            <h3 className="mt-3 text-xl font-bold text-ink-900">
              {editingId
                ? 'Atualize o nome abaixo'
                : 'Crie uma categoria rapidamente'}
            </h3>
          </div>
          {editingId ? (
            <Button variant="secondary" size="sm" onClick={cancelEdit}>
              Cancelar
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome da categoria"
            placeholder="Ex: Pizzas, Bebidas, Sobremesas"
            error={errors.name?.message}
            {...register('name')}
          />

          {submitError ? (
            <Alert type="error" title="Erro ao salvar">
              {submitError}
            </Alert>
          ) : null}

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full"
          >
            {editingId ? 'Atualizar categoria' : 'Criar categoria'}
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-900">
            Categorias cadastradas
          </h3>
          <Badge variant="success">{categories.length}</Badge>
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-ink-900 border-r-transparent" />
            <p className="mt-3 text-ink-500">Carregando categorias...</p>
          </Card>
        ) : categories.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <p className="text-ink-500">Nenhuma categoria cadastrada ainda.</p>
            <p className="mt-1 text-xs text-ink-400">
              Crie uma para começar a organizar seu cardápio.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {categories.map((category) => (
              <Card key={category.id} className="p-4">
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-ink-900">{category.name}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      ID: {category.id.substring(0, 8)}...
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => startEdit(category)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDelete(category.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Section>
  )
}