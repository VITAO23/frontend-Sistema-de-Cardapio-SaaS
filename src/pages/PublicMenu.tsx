import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card } from '../components';
import { api } from '../services/api';

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
  address?: string | null;
  categories: Category[];
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

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
          { id: 'prod-1', name: 'Burger da Casa', description: 'Pão brioche, carne 160g, queijo e molho especial.', price: 29.9, imageUrl: null },
          { id: 'prod-2', name: 'Burger Bacon', description: 'Burger com bacon crocante e cheddar.', price: 34.9, imageUrl: null },
        ],
      },
      {
        id: 'cat-2',
        name: 'Bebidas',
        products: [{ id: 'prod-3', name: 'Refrigerante lata', description: '350ml gelado.', price: 6, imageUrl: null }],
      },
    ],
  };
}

function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
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

  const addToCart = (product: Product) => {
    setCart((currentCart) => {
      const found = currentCart.find((item) => item.product.id === product.id);
      if (found) return currentCart.map((item) => (item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      return [...currentCart, { product, qty: 1 }];
    });
  };

  const changeQty = (productId: string, qty: number) => {
    setCart((currentCart) => currentCart.map((item) => (item.product.id === productId ? { ...item, qty } : item)).filter((item) => item.qty > 0));
  };

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  const scrollToCategory = (categoryId: string) => {
    if (!categoryId) return;
    setActiveCategoryId(categoryId);
    categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const categoryLabels = useMemo(() => filteredCategories.map((category) => category.name), [filteredCategories]);
  const featuredCategory = filteredCategories[0];
  const featuredProducts = featuredCategory?.products.slice(0, 3) ?? [];

  function checkoutWhatsApp() {
    if (!restaurant) return;

    const phone = restaurant.whatsapp?.replace(/[^0-9]/g, '') || '';
    const lines = [`Pedido para ${restaurant.name}`];
    cart.forEach((item) => lines.push(`${item.qty}x ${item.product.name} - R$ ${formatPrice(item.product.price)}`));
    lines.push(`Total: R$ ${formatPrice(total)}`);

    const text = encodeURIComponent(lines.join('\n'));
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!restaurant) return <div className="p-6">Restaurante não encontrado.</div>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(110,231,183,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(167,139,250,0.12),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)]">
      {isDemo && (
        <div className="mx-auto mb-4 max-w-6xl rounded-none border-b border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 md:mt-4 md:rounded-2xl md:border">
          Você está vendo um cardápio demo porque o backend respondeu 404 para esta URL.
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-4 md:px-6 lg:py-6">
        <div className="fixed bottom-0 left-0 right-0 z-40 flex gap-2 border-t border-ink-200 bg-white p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <button
            onClick={() => scrollToCategory(filteredCategories[0]?.id ?? '')}
            className="flex-1 rounded-lg border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-600 hover:border-ink-400 hover:bg-ink-50 sm:hidden"
          >
            ☰ Menu
          </button>
          <button
            onClick={checkoutWhatsApp}
            disabled={cart.length === 0}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase sm:hidden ${
              cart.length === 0
                ? 'cursor-not-allowed border border-ink-200 bg-ink-50 text-ink-400'
                : 'border border-mint-400 bg-mint-100 text-mint-800 hover:bg-mint-200'
            }`}
          >
            🛒 {cartCount} itens
          </button>
        </div>

        <div className="h-16 sm:hidden" />

        <header className="overflow-hidden rounded-[2rem] border border-ink-200 bg-white/90 shadow-[0_24px_60px_rgba(31,41,55,0.10)] backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-mint-900 p-5 text-white md:p-8">
              <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(110,231,183,0.35),transparent_24%)]" />

              <div className="relative flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-ink-200">
                <span className="rounded-full bg-white/12 px-3 py-1 text-white">Cardápio online</span>
                <span className="rounded-full bg-mint-200/20 px-3 py-1 text-mint-50">Pedido via WhatsApp</span>
              </div>

              <div className="relative mt-5 flex items-start gap-4 md:mt-6">
                <div className="flex h-18 w-18 items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/10 text-xl font-bold text-white shadow-lg shadow-black/10 md:h-20 md:w-20">
                  {restaurant.logoUrl ? (
                    (() => {
                      const src = resolveMediaUrl(restaurant.logoUrl);
                      return (
                        <img
                          src={src ?? undefined}
                          alt={restaurant.name}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            (event.currentTarget as HTMLImageElement).style.display = 'none';
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
                  <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">{restaurant.name}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-100">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                      <span>📍</span>
                      <span className="truncate">{restaurant.address || 'Endereço não informado'}</span>
                    </span>
                    <span className="rounded-full bg-mint-300/20 px-3 py-1 font-semibold text-mint-50">
                      Sempre aberto
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-100 md:text-base">
                    Navegue por categorias, encontre promoções e finalize o pedido sem complicação.
                  </p>
                </div>
              </div>

              <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-sm backdrop-blur">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-200">Categorias</div>
                  <div className="mt-1 text-lg font-bold text-white">{filteredCategories.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-sm backdrop-blur">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-200">Itens</div>
                  <div className="mt-1 text-lg font-bold text-white">{visibleProductsCount}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-sm backdrop-blur">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-200">Carrinho</div>
                  <div className="mt-1 text-lg font-bold text-white">{cartCount} itens</div>
                </div>
              </div>
            </div>

            <div className="border-t border-ink-200 bg-gradient-to-br from-white via-ink-50 to-mint-50 p-5 lg:border-l lg:border-t-0 md:p-8">
              <div className="inline-flex rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-ink-600 shadow-sm">
                Destaques
              </div>

              <div className="mt-4 grid gap-3 text-sm text-ink-700">
                <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Tempo e entrega</p>
                  <p className="mt-2 text-base font-semibold text-ink-950">Pedido rápido e visual limpo</p>
                  <p className="mt-1 text-sm text-ink-600">A experiência foi otimizada para celular, com navegação parecida com apps de delivery.</p>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Ação principal</p>
                  <p className="mt-2 text-base font-semibold text-ink-950">Clique nas categorias ou pesquise</p>
                  <p className="mt-1 text-sm text-ink-600">Você pode ir direto para os produtos ou finalizar no WhatsApp.</p>
                </div>

                <div className="rounded-2xl border border-mint-200 bg-mint-50 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-700">Sugestão</p>
                  <p className="mt-2 text-base font-semibold text-mint-950">Toque em um destaque para adicionar rápido</p>
                  <p className="mt-1 text-sm text-mint-800">Isso aproxima a experiência das telas que você enviou.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Button
                  variant="secondary"
                  className="!border-ink-300 !bg-white !text-ink-900 hover:!bg-ink-100"
                  onClick={() => scrollToCategory(featuredCategory?.id ?? '')}
                  disabled={!featuredCategory}
                >
                  Ver categorias
                </Button>
                <Button
                  variant="secondary"
                  className="!border-ink-300 !text-ink-800 hover:!bg-ink-100"
                  onClick={checkoutWhatsApp}
                  disabled={cart.length === 0}
                >
                  Ir ao WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <main className="mb-16 space-y-5 sm:mb-0">
            <Card className="p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="w-full md:max-w-sm">
                  <label htmlFor="menu-search" className="sr-only">
                    Buscar no cardápio
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-mint-400 focus-within:ring-4 focus-within:ring-mint-100">
                    <span className="text-ink-400">⌕</span>
                    <input
                      id="menu-search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar produto ou descrição..."
                      className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
                    />
                  </div>
                </div>

                <div className="w-full md:max-w-[40rem]">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {filteredCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => scrollToCategory(category.id)}
                        className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          activeCategoryId === category.id
                            ? 'border-ink-900 bg-ink-900 text-white shadow-sm'
                            : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {featuredProducts.length ? (
              <Card className="overflow-hidden border-ink-200 bg-white shadow-sm">
                <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="p-5 md:p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-500">Destaques</div>
                    <h2 className="mt-2 text-2xl font-black text-ink-950">{featuredCategory?.name}</h2>
                    <p className="mt-2 text-sm text-ink-600">Produtos selecionados para facilitar a navegação e acelerar o primeiro pedido.</p>
                    <div className="mt-5 space-y-3">
                      {featuredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addToCart(product)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-ink-200 bg-ink-50 p-3 text-left transition hover:border-mint-300 hover:bg-white"
                        >
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-xs font-semibold uppercase text-ink-400">
                            {product.imageUrl ? (
                              <img src={resolveMediaUrl(product.imageUrl) ?? undefined} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              'Foto'
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-ink-950">{product.name}</div>
                            <div className="truncate text-xs text-ink-500">R$ {formatPrice(product.price)}</div>
                          </div>
                          <div className="text-sm font-semibold text-mint-700">Adicionar</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-ink-200 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_42%),linear-gradient(180deg,_#fafafa_0%,_#ffffff_100%)] p-5 md:p-6 lg:border-l lg:border-t-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-500">Resumo</div>
                    <div className="mt-2 text-2xl font-black text-ink-950">{restaurant.name}</div>
                    <div className="mt-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Frete / entrega</div>
                      <div className="mt-2 text-sm text-ink-600">Mais tarde podemos conectar essa área com Google Maps e cálculo por CEP.</div>
                    </div>

                    {categoryLabels.length ? (
                      <div className="mt-4 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Categorias</div>
                        <p className="mt-2 text-sm text-ink-700">{categoryLabels.join(' • ')}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            ) : null}

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
                    {category.products.map((product) => {
                      const productImageSrc = resolveMediaUrl(product.imageUrl);
                      const hasProductImage = Boolean(productImageSrc);

                      return (
                        <Card key={product.id} className="overflow-hidden border-ink-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                          <div className={`grid h-full gap-0 ${hasProductImage ? 'sm:grid-cols-[144px_1fr]' : 'grid-cols-1'}`}>
                            {hasProductImage ? (
                              <div className="relative min-h-40 bg-ink-100">
                                <img
                                  src={productImageSrc ?? undefined}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                  onError={(event) => {
                                    (event.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : null}

                            <div className="flex flex-col p-4 md:p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h3 className="text-base font-bold text-ink-950">{product.name}</h3>
                                  {product.description ? <p className="mt-2 text-sm leading-6 text-ink-600">{product.description}</p> : null}
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
                      );
                    })}
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
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-ink-800"
                            onClick={() => changeQty(item.product.id, item.qty - 1)}
                          >
                            -
                          </button>
                          <div className="w-6 text-center text-sm font-semibold text-ink-900">{item.qty}</div>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-ink-800"
                            onClick={() => changeQty(item.product.id, item.qty + 1)}
                          >
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