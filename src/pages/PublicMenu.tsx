import { useEffect, useMemo, useState } from 'react';
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

export default function PublicMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [cart, setCart] = useState<Array<{ product: Product; qty: number }>>([]);

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
    <div className="mx-auto max-w-5xl p-6">
      {isDemo && (
        <div className="mb-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          Você está vendo um cardápio demo porque o backend respondeu 404 para esta URL.
        </div>
      )}

      <header className="mb-6 flex items-center gap-4">
        {restaurant.logoUrl && <img src={restaurant.logoUrl} alt="logo" className="h-16 w-16 rounded-lg object-cover" />}
        <div>
          <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <section>
          {restaurant.categories.map((cat) => (
            <div key={cat.id} className="mb-6">
              <h2 className="mb-3 text-lg font-semibold">{cat.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {cat.products.map((p) => (
                  <Card key={p.id}>
                    <div className="flex gap-4">
                      {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="h-20 w-28 rounded-md object-cover" />}
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold">{p.name}</h3>
                        <p className="text-xs text-ink-500">{p.description}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-sm font-semibold">R$ {formatPrice(p.price)}</div>
                          <Button size="sm" onClick={() => addToCart(p)}>
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </section>

        <aside>
          <div className="sticky top-6">
            <Card>
              <h3 className="mb-2 text-lg font-semibold">Carrinho</h3>
              {cart.length === 0 ? (
                <div className="text-sm text-ink-500">Seu carrinho está vazio</div>
              ) : (
                <div className="space-y-3">
                  {cart.map((it) => (
                    <div key={it.product.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">{it.product.name}</div>
                        <div className="text-xs text-ink-500">R$ {formatPrice(it.product.price)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="rounded border px-2" onClick={() => changeQty(it.product.id, it.qty - 1)}>-</button>
                        <div className="w-6 text-center">{it.qty}</div>
                        <button className="rounded border px-2" onClick={() => changeQty(it.product.id, it.qty + 1)}>+</button>
                      </div>
                    </div>
                  ))}

                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">Total</div>
                    <div className="text-sm font-semibold">R$ {formatPrice(total)}</div>
                  </div>

                  <div className="mt-4">
                    <Button onClick={checkoutWhatsApp} className="w-full">
                      Finalizar pedido (WhatsApp)
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatPrice(n: number) {
  return n.toFixed(2).replace('.', ',');
}
