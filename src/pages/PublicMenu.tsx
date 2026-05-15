import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Button, Card } from '../components';

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
};

type Category = {
  id: string;
  name: string;
  products: Product[];
};

type Restaurant = {
  id: string;
  name: string;
  logoUrl?: string | null;
  whatsapp?: string | null;
  categories: Category[];
};

function createDemoRestaurant(slug?: string): Restaurant {
  return {
    id: 'demo-restaurant',
    name: slug ? slug.replace(/-/g, ' ') : 'Restaurante demo',
    logoUrl: null,
    whatsapp: '5531999999999',
    categories: [
      {
        id: 'cat-1',
        name: 'Hambúrgueres',
        products: [
          {
            id: 'prod-1',
            name: 'Burger da Casa',
            description: 'Pão brioche, carne 160g, queijo e molho especial.',
            price: 29.9,
            imageUrl: null,
          },
          {
            id: 'prod-2',
            name: 'Burger Bacon',
            description: 'Burger com bacon crocante e cheddar.',
            price: 34.9,
            imageUrl: null,
          },
        ],
      },
      {
        id: 'cat-2',
        name: 'Bebidas',
        products: [
          {
            id: 'prod-3',
            name: 'Refrigerante lata',
            description: '350ml gelado.',
            price: 6,
            imageUrl: null,
          },
        ],
      },
    ],
  };
}

function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  // prefer explicit PUBLIC_ORIGIN env var, fallback to current origin
  const origin = import.meta.env.VITE_PUBLIC_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!origin) return url;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function PublicMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [cart, setCart] = useState<Array<{ product: Product; qty: number }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setIsDemo(false);
    void api
      .get(`/restaurants/${slug}`)
      .then((res) => setRestaurant(res.data))
      .catch((error) => {
        if (error?.response?.status === 404) {
          setRestaurant(createDemoRestaurant(slug));
          setIsDemo(true);
          return;
        }

        setRestaurant(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!restaurant?.categories.length) return;
    setActiveCategoryId(restaurant.categories[0].id);
  }, [restaurant]);

  const filteredCategories = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!restaurant) return [];
    if (!query) return restaurant.categories;

    return restaurant.categories
      .map((category) => ({
        ...category,
        products: category.products.filter((product) => {
          const haystack = [product.name, product.description ?? ''].join(' ').toLowerCase();
          return haystack.includes(query);
        }),
      }))
      .filter((category) => category.products.length > 0);
  }, [restaurant, searchTerm]);

  const visibleProductsCount = useMemo(
    () => filteredCategories.reduce((count, category) => count + category.products.length, 0),
    [filteredCategories],
  );

  const addToCart = (p: Product) => {
    setCart((c) => {
      const found = c.find((x) => x.product.id === p.id);
      if (found) return c.map((x) => (x.product.id === p.id ? { ...x, qty: x.qty + 1 } : x));
      return [...c, { product: p, qty: 1 }];
    });
  };

  const changeQty = (productId: string, qty: number) => {
    setCart((c) => c.map((x) => (x.product.id === productId ? { ...x, qty } : x)).filter((x) => x.qty > 0));
  };

  const total = useMemo(() => cart.reduce((s, it) => s + it.product.price * it.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  const scrollToCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    const element = categoryRefs.current[categoryId];
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const categoryLabels = useMemo(
    () => filteredCategories.map((category) => category.name),
    [filteredCategories],
  );

  function checkoutWhatsApp() {
    if (!restaurant) return;
    const phone = restaurant.whatsapp?.replace(/[^0-9]/g, '') || '';
    const lines = [`Pedido para ${restaurant.name}`];
    cart.forEach((it) => lines.push(`${it.qty}x ${it.product.name} - R$ ${formatPrice(it.product.price)}`));
    lines.push(`Total: R$ ${formatPrice(total)}`);
    const text = encodeURIComponent(lines.join('\n'));
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!restaurant) return <div className="p-6">Restaurante não encontrado.</div>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(110,231,183,0.15),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)]">
      {isDemo && (
        <div className="mx-auto mb-4 max-w-6xl rounded-none border-b border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 md:mt-4 md:rounded-2xl md:border">
          Você está vendo um cardápio demo porque o backend respondeu 404 para esta URL.
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-4 md:px-6 lg:py-6">
        <header className="overflow-hidden rounded-[2rem] border border-ink-200 bg-white/90 shadow-[0_24px_60px_rgba(31,41,55,0.10)] backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-ink-500">
                <span className="rounded-full bg-mint-100 px-3 py-1 text-mint-800">Cardápio online</span>
                <span className="rounded-full bg-ink-100 px-3 py-1 text-ink-700">Pedido via WhatsApp</span>
              </div>

              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-ink-900 text-xl font-bold text-white">
                  {restaurant.logoUrl ? (
                    (() => {
                      const src = resolveMediaUrl(restaurant.logoUrl);
                      return (
                        <img
                          src={src ?? undefined}
                          alt={restaurant.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // hide broken image and keep initials fallback
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      );
                    })()
                  ) : (
                    restaurant.name
                      .split(' ')
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-black tracking-tight text-ink-950 md:text-5xl">{restaurant.name}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-600 md:text-base">
                    Navegue por categorias, encontre promoções e finalize o pedido sem complicação.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500">Categorias</div>
                  <div className="mt-1 text-lg font-bold text-ink-950">{filteredCategories.length}</div>
                </div>
                <div className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500">Itens</div>
                  <div className="mt-1 text-lg font-bold text-ink-950">{visibleProductsCount}</div>
                </div>
                <div className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500">Carrinho</div>
                  <div className="mt-1 text-lg font-bold text-ink-950">{cartCount} itens</div>
                </div>
              </div>
            </div>

            <div className="border-t border-ink-200 bg-gradient-to-br from-ink-950 to-ink-800 p-6 text-white lg:border-l lg:border-t-0 md:p-8">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-300">Atalhos</div>
              <div className="mt-4 space-y-3 text-sm text-ink-200">
                <p>• Cardápio otimizado para celular.</p>
                <p>• Busca rápida por produto.</p>
                <p>• Abas por categoria como no exemplo.</p>
                <p>• Checkout final via WhatsApp.</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Button
                  variant="secondary"
                  className="!border-white/20 !text-white hover:bg-white/10"
                  onClick={() => scrollToCategory(filteredCategories[0]?.id ?? '')}
                >
                  Ver categorias
                </Button>
                <Button
                  variant="secondary"
                  className="!border-white/20 !text-white hover:bg-white/10"
                  onClick={checkoutWhatsApp}
                  disabled={cart.length === 0}
                >
                  Ir ao WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
          <main className="space-y-5">
            <Card className="p-4 md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-500">Operação</div>
                  <div className="mt-1 text-lg font-bold text-ink-950">
                    {categoryLabels.length ? categoryLabels.join('   •   ') : 'Categorias indisponíveis'}
                  </div>
                </div>

                <div className="w-full md:max-w-md">
                  <label htmlFor="menu-search" className="sr-only">
                    Buscar no cardápio
                  </label>
                  <input
                    id="menu-search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar produto ou descrição..."
                    className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-mint-400 focus:ring-4 focus:ring-mint-100"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {filteredCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => scrollToCategory(category.id)}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      activeCategoryId === category.id
                        ? 'border-ink-900 bg-ink-900 text-white'
                        : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </Card>

            <div className="space-y-8">
              {filteredCategories.map((category) => (
                <section
                  key={category.id}
                  ref={(element) => {
                    categoryRefs.current[category.id] = element;
                  }}
                  className="scroll-mt-28"
                >
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-500">Categoria</div>
                      <h2 className="mt-1 text-2xl font-black text-ink-950">{category.name}</h2>
                    </div>
                    <div className="text-sm font-semibold text-ink-500">{category.products.length} itens</div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                    {category.products.map((product) => (
                      <Card key={product.id} className="overflow-hidden">
                        <div className="grid h-full gap-0 sm:grid-cols-[128px_1fr]">
                          <div className="relative min-h-40 bg-ink-100">
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-mint-100 to-ink-100 text-sm font-semibold text-ink-500">
                              Sem imagem
                            </div>
                            {product.imageUrl ? (
                              (() => {
                                const src = resolveMediaUrl(product.imageUrl);
                                return (
                                  <img
                                    src={src ?? undefined}
                                    alt={product.name}
                                    className="absolute inset-0 h-full w-full object-cover"
                                    onError={(e) => {
                                      // hide broken image so fallback becomes visible
                                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                );
                              })()
                            ) : null}
                          </div>

                          <div className="flex flex-col p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-base font-bold text-ink-950">{product.name}</h3>
                                {product.description ? (
                                  <p className="mt-2 text-sm leading-6 text-ink-600">{product.description}</p>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500">A partir de</div>
                                <div className="text-xl font-black text-ink-950">R$ {formatPrice(product.price)}</div>
                              </div>
                              <Button size="sm" onClick={() => addToCart(product)}>
                                Adicionar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </main>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-ink-950">Carrinho</h3>
                    <p className="text-sm text-ink-600">Resumo do pedido em tempo real.</p>
                  </div>
                  <div className="rounded-full bg-mint-100 px-3 py-1 text-xs font-semibold text-mint-800">{cartCount} itens</div>
                </div>

                {cart.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-4 py-8 text-center text-sm text-ink-500">
                    Seu carrinho está vazio.
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between gap-4 rounded-2xl border border-ink-200 bg-white px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink-950">{item.product.name}</div>
                          <div className="text-xs text-ink-500">R$ {formatPrice(item.product.price)}</div>
                        </div>

                        <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 p-1">
                          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-ink-800" onClick={() => changeQty(item.product.id, item.qty - 1)}>
                            -
                          </button>
                          <div className="w-6 text-center text-sm font-semibold text-ink-900">{item.qty}</div>
                          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-ink-800" onClick={() => changeQty(item.product.id, item.qty + 1)}>
                            +
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between border-t border-ink-200 pt-4">
                      <div className="text-sm font-semibold text-ink-600">Total</div>
                      <div className="text-2xl font-black text-ink-950">R$ {formatPrice(total)}</div>
                    </div>

                    <Button onClick={checkoutWhatsApp} className="w-full">
                      Finalizar pedido no WhatsApp
                    </Button>
                  </div>
                )}
              </Card>

            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function formatPrice(n: number) {
  return n.toFixed(2).replace('.', ',');
}
