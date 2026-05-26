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
  available?: boolean | null;
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

type SelectedOption = {
  groupName: string;
  optionName: string;
  optionPrice: number;
  priceMode: 'add' | 'replace';
};

type CartItem = {
  product: Product;
  qty: number;
  selectedOptions: SelectedOption[];
  observation: string;
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
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  status?: 'open' | 'closed';
  openingHours?: string | null;
  deliveryEnabled?: boolean | null;
  deliveryTime?: string | null;
  pickupTime?: string | null;
  deliveryInfo?: string | null;
  deliveryFee?: number | null;
  deliveryRadiusKm?: number | null;
  deliveryArea?: unknown;
  publicMenuUrl?: string | null;
  publicMenuAliasUrl?: string | null;
  qrUrl?: string | null;
  categories: Category[];
};

const API_URL = import.meta.env.VITE_API_URL || 'https://api-saas-sistema-cardapio.onrender.com';
const PRODUCT_OPTION_GROUPS_KEY = 'product-option-groups';

function createDemoRestaurant(slug?: string): Restaurant {
  return {
    id: 'demo-restaurant',
    name: slug ? slug.replace(/-/g, ' ') : 'Restaurante demo',
    logoUrl: null,
    whatsapp: '5531999999999',
    status: 'open',
    openingHours: 'Seg - Dom | 18:00 - 23:00',
    deliveryTime: '50 - 70 min',
    pickupTime: '25 - 40 min',
    deliveryInfo: 'Entregas em um raio de 6 km. Taxa a partir de R$ 6,00.',
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

function buildFullAddress(restaurant: Restaurant) {
  const parts = [
    restaurant.address,
    [restaurant.street, restaurant.number].filter(Boolean).join(', '),
    [restaurant.neighborhood, restaurant.city, restaurant.state].filter(Boolean).join(' - '),
    restaurant.zipCode,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return parts.join(' | ');
}

function formatOptionGroupPreview(group: NonNullable<Product['optionGroups']>[number]) {
  const optionNames = group.options.map((option) => option.name).filter(Boolean);
  const mode = group.multiple ? 'múltipla' : 'única';
  const required = group.required ? 'obrigatória' : 'opcional';
  const suffix = optionNames.length ? `: ${optionNames.slice(0, 3).join(', ')}` : '';

  return `${group.name} (${mode}, ${required})${suffix}`;
}

function resolveGroupPriceMode(groupName: string, priceMode?: string): 'add' | 'replace' {
  if (priceMode === 'add' || priceMode === 'replace') {
    return priceMode;
  }

  return /tamanho|size|tam\b/i.test(groupName) ? 'replace' : 'add';
}

function getCartItemUnitPrice(item: CartItem) {
  const replacementOptions = item.selectedOptions.filter((option) => option.priceMode === 'replace');
  const replacementBase = replacementOptions.length
    ? replacementOptions[replacementOptions.length - 1].optionPrice
    : item.product.price;

  const additiveOptions = item.selectedOptions
    .filter((option) => option.priceMode === 'add')
    .reduce((sum, option) => sum + option.optionPrice, 0);

  return replacementBase + additiveOptions;
}

function getCartItemTotalPrice(item: CartItem) {
  return getCartItemUnitPrice(item) * item.qty;
}

function readLocalOptionGroups(productId: string) {
  if (typeof window === 'undefined') return [] as NonNullable<Product['optionGroups']>;

  const raw = localStorage.getItem(PRODUCT_OPTION_GROUPS_KEY);
  if (!raw) return [] as NonNullable<Product['optionGroups']>;

  try {
    const parsed = JSON.parse(raw) as Record<string, NonNullable<Product['optionGroups']>>;
    return parsed[productId] ?? [];
  } catch {
    return [] as NonNullable<Product['optionGroups']>;
  }
}

function hydrateProductOptionGroups(product: Product): Product {
  if (product.optionGroups?.length) return product;

  const localOptionGroups = readLocalOptionGroups(product.id);
  if (!localOptionGroups.length) return product;

  return {
    ...product,
    optionGroups: localOptionGroups,
  };
}

function hydrateRestaurantOptionGroups(restaurant: Restaurant): Restaurant {
  return {
    ...restaurant,
    categories: restaurant.categories.map((category) => ({
      ...category,
      products: category.products.map(hydrateProductOptionGroups),
    })),
  };
}

export default function PublicMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [configuringProduct, setConfiguringProduct] = useState<Product | null>(null);
  const [selectedOptionValues, setSelectedOptionValues] = useState<Record<string, string[]>>({});
  const [selectedObservation, setSelectedObservation] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNeighborhood, setCustomerNeighborhood] = useState('');
  const [customerComplement, setCustomerComplement] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [orderObservation, setOrderObservation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pagamento no cartão');
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setIsDemo(false);

    void api
      .get(`/restaurants/${slug}`)
      .then((res) => setRestaurant(hydrateRestaurantOptionGroups(res.data)))
      .catch((error) => {
        if (error?.response?.status === 404) {
          setRestaurant(hydrateRestaurantOptionGroups(createDemoRestaurant(slug)));
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
    if (!restaurant) return [];
    return restaurant.categories;
  }, [restaurant]);

  const buildCartItemKey = (productId: string, selectedOptions: SelectedOption[], observation: string) =>
    [productId, observation.trim().toLowerCase(), ...selectedOptions.map((option) => `${option.groupName}:${option.optionName}`)].join('|');

  const addToCart = (product: Product, selectedOptions: SelectedOption[] = [], observation = '') => {
    setCart((currentCart) => {
      const nextKey = buildCartItemKey(product.id, selectedOptions, observation);
      const found = currentCart.find((item) => buildCartItemKey(item.product.id, item.selectedOptions, item.observation) === nextKey);

      if (found) {
        return currentCart.map((item) =>
          buildCartItemKey(item.product.id, item.selectedOptions, item.observation) === nextKey
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }

      return [...currentCart, { product, qty: 1, selectedOptions, observation }];
    });
  };

  const openProductConfig = (product: Product) => {
    const firstSelections: Record<string, string[]> = {};

    product.optionGroups?.forEach((group) => {
      firstSelections[group.name] = [];
    });

    setConfiguringProduct(product);
    setSelectedOptionValues(firstSelections);
    setSelectedObservation('');
  };

  const closeProductConfig = () => {
    setConfiguringProduct(null);
    setSelectedOptionValues({});
    setSelectedObservation('');
  };

  const toggleGroupOption = (groupName: string, optionName: string, multiple: boolean) => {
    setSelectedOptionValues((current) => {
      const groupValues = current[groupName] ?? [];

      if (!multiple) {
        return { ...current, [groupName]: [optionName] };
      }

      return groupValues.includes(optionName)
        ? { ...current, [groupName]: groupValues.filter((value) => value !== optionName) }
        : { ...current, [groupName]: [...groupValues, optionName] };
    });
  };

  const confirmConfiguredProduct = () => {
    if (!configuringProduct) return;

    const selectedOptions: SelectedOption[] = [];
    const missingRequiredGroup = configuringProduct.optionGroups?.some((group) => {
      const selectedNames = selectedOptionValues[group.name] ?? [];

      if (group.required && selectedNames.length === 0) {
        return true;
      }

      selectedNames.forEach((optionName) => {
        const match = group.options.find((option) => option.name === optionName);
        if (match) {
          selectedOptions.push({
            groupName: group.name,
            optionName: match.name,
            optionPrice: typeof match.price === 'number' ? match.price : 0,
            priceMode: resolveGroupPriceMode(group.name, group.priceMode),
          });
        }
      });

      return false;
    });

    if (missingRequiredGroup) return;

    addToCart(configuringProduct, selectedOptions, selectedObservation);
    closeProductConfig();
  };

  const changeQty = (lineKey: string, qty: number) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          buildCartItemKey(item.product.id, item.selectedOptions, item.observation) === lineKey
            ? { ...item, qty }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const total = useMemo(() => cart.reduce((sum, item) => sum + getCartItemTotalPrice(item), 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const scrollToCategory = (categoryId: string) => {
    if (!categoryId) return;
    setActiveCategoryId(categoryId);
    categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const categoryLabels = useMemo(() => filteredCategories.map((category) => category.name), [filteredCategories]);
  const featuredCategory = filteredCategories[0];
  const featuredProducts = featuredCategory?.products.slice(0, 3) ?? [];
  const isOpen = (restaurant?.status ?? 'open') === 'open';
  const statusLabel = isOpen ? 'Aberto' : 'Fechado';
  const openingHours = restaurant?.openingHours || 'Horários não informados';
  const deliveryTime = restaurant?.deliveryTime || 'Tempo de entrega a confirmar';
  const pickupTime = restaurant?.pickupTime || 'Tempo de retirada a confirmar';
  const deliveryInfo = restaurant?.deliveryInfo;
  const deliveryEnabled = restaurant?.deliveryEnabled ?? true;
  const deliveryFee = typeof restaurant?.deliveryFee === 'number' ? restaurant.deliveryFee : null;
  const deliveryRadiusKm = typeof restaurant?.deliveryRadiusKm === 'number' ? restaurant.deliveryRadiusKm : null;
  const fullAddress = buildFullAddress(restaurant ?? ({} as Restaurant));
  const restaurantLocationQuery = fullAddress || restaurant?.name || '';
  const mapsEmbedUrl = restaurantLocationQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(restaurantLocationQuery)}&z=16&output=embed`
    : '';
  const configuringSelectedOptions: SelectedOption[] = configuringProduct?.optionGroups
    ? configuringProduct.optionGroups.flatMap((group) => {
        const groupMode = resolveGroupPriceMode(group.name, group.priceMode);
        const selectedNames = selectedOptionValues[group.name] ?? [];

        return selectedNames
          .map((selectedName) => {
            const option = group.options.find((item) => item.name === selectedName);
            if (!option) return null;

            return {
              groupName: group.name,
              optionName: option.name,
              optionPrice: typeof option.price === 'number' ? option.price : 0,
              priceMode: groupMode,
            } satisfies SelectedOption;
          })
          .filter((option): option is SelectedOption => Boolean(option));
      })
    : [];
  const configuringPreviewPrice = configuringProduct
    ? getCartItemUnitPrice({
        product: configuringProduct,
        qty: 1,
        selectedOptions: configuringSelectedOptions,
        observation: selectedObservation,
      })
    : 0;

  function checkoutWhatsApp() {
    if (!restaurant) return;

    const phone = restaurant.whatsapp?.replace(/[^0-9]/g, '') || '';
    const orderId = `#${String(Date.now()).slice(-6)}`;
    const subtotal = cart.reduce((sum, item) => sum + getCartItemTotalPrice(item), 0);
    const orderDeliveryFee = deliveryEnabled ? deliveryFee ?? 0 : 0;
    const grandTotal = subtotal + orderDeliveryFee;
    const trackingToken = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    const trackingUrl = `${window.location.origin}/app/${slug ?? restaurant.id}/track?token=${trackingToken}`;

    const itemLines = cart
      .map((item) => {
        const itemUnitPrice = getCartItemUnitPrice(item);
        const itemTotal = itemUnitPrice * item.qty;
        const optionsText = item.selectedOptions.length
          ? item.selectedOptions
              .map((option) => {
                if (option.priceMode === 'replace') {
                  return `    • ${option.groupName}: ${option.optionName} (preço base R$ ${formatPrice(option.optionPrice)})`;
                }

                return `    • ${option.groupName}: ${option.optionName}${option.optionPrice ? ` (+R$ ${formatPrice(option.optionPrice)})` : ''}`;
              })
              .join('\n')
          : '    • Sem opções selecionadas';

        return [
          `• *${item.qty}x ${item.product.name}* — *R$ ${formatPrice(itemUnitPrice)}*`,
          optionsText,
          `    📝 Observação: ${item.observation ? item.observation : 'sem observações'}`,
          `    Subtotal do item: *R$ ${formatPrice(itemTotal)}*`,
        ].join('\n');
      })
      .join('\n\n');

    const sep = '----------------------------------------';

    const lines = [
      '✅ *NOVO PEDIDO*',
      sep,
      '🔔 *RESUMO DO PEDIDO*',
      `${orderId}`,
      sep,
      `🔗 Link para acompanhar: ${trackingUrl}`,
      sep,
      itemLines,
      sep,
      `*SUBTOTAL:* *R$ ${formatPrice(subtotal)}*`,
      `*Taxa de Entrega:* *R$ ${formatPrice(orderDeliveryFee)}*`,
      sep,
      `🔖 *TOTAL: R$ ${formatPrice(grandTotal)}*`,
      sep,
      '📦 *DADOS PARA ENTREGA*',
      `*Nome:* ${customerName || 'Não informado'}`,
      `*Endereço:* ${customerAddress || restaurant.address || 'Não informado'}`,
      `*Bairro:* ${customerNeighborhood || 'Não informado'}`,
      `*Complemento:* ${customerComplement || 'Não informado'}`,
      `*Ponto de Referência:* ${customerReference || 'Não informado'}`,
      `*Telefone:* ${customerPhone || 'Não informado'}`,
      sep,
      '💳 *PAGAMENTO*',
      `${paymentMethod}`,
      sep,
      '🗒️ *OBSERVAÇÕES DO PEDIDO*',
      `${orderObservation || 'Sem observações'}`,
    ].filter(Boolean);

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


        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
          <button
            onClick={() => setIsCartOpen(true)}
            disabled={cart.length === 0}
            className={`w-full rounded-lg px-3 py-2 text-xs font-semibold uppercase ${
              cart.length === 0
                ? 'cursor-not-allowed border border-ink-200 bg-ink-50 text-ink-400'
                : 'border border-mint-400 bg-mint-100 text-mint-800 hover:bg-mint-200'
            }`}
          >
            🛒 {cartCount} itens
          </button>
        </div>

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
                    <button
                      type="button"
                      onClick={() => setIsMapOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-left transition hover:bg-white/15"
                    >
                      <span>📍</span>
                      <span className="truncate">{fullAddress || 'Endereço não informado'}</span>
                    </button>
                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${
                        isOpen
                          ? 'bg-mint-300/20 text-mint-50'
                          : 'bg-red-400/20 text-red-100'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-100 md:text-base">
                    Navegue por categorias, encontre promoções e finalize o pedido sem complicação.
                  </p>
                </div>
              </div>

              <div className="relative mt-6">
                <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                  Destaques
                </div>
                <div className="mt-4 grid gap-3 text-sm text-ink-50 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-sm backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">Entrega</p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {deliveryEnabled ? deliveryTime : 'Entrega desativada'}
                    </p>
                    <p className="mt-1 text-xs text-ink-100">{deliveryInfo}</p>
                    {deliveryFee !== null || deliveryRadiusKm !== null ? (
                      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-ink-200">
                        {deliveryFee !== null ? `Taxa: R$ ${formatPrice(deliveryFee)}` : 'Taxa sob consulta'}
                        {deliveryRadiusKm !== null ? ` · Raio: ${deliveryRadiusKm} km` : ''}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-sm backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">Retirada</p>
                    <p className="mt-2 text-base font-semibold text-white">{pickupTime}</p>
                    <p className="mt-1 text-xs text-ink-100">Retire no balcao conforme disponibilidade.</p>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-sm backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">Horarios</p>
                    <p className="mt-2 text-base font-semibold text-white">{openingHours}</p>
                    <p className="mt-1 text-xs text-ink-100">
                      {isOpen ? 'Estamos atendendo agora.' : 'Estamos fechados no momento.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-ink-200 bg-gradient-to-br from-white via-ink-50 to-mint-50 p-5 lg:border-l lg:border-t-0 md:p-8">
              <div className="inline-flex rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-ink-600 shadow-sm">
                Acoes rapidas
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
                {/* <Button
                  variant="secondary"
                  className="!border-ink-300 !text-ink-800 hover:!bg-ink-100"
                  onClick={checkoutWhatsApp}
                  disabled={cart.length === 0}
                >
                  Ir ao WhatsApp
                </Button> */}
              </div>
            </div>
          </div>
        </header>

        {isMapOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Localização</p>
                  <h3 className="text-lg font-bold text-ink-950">{restaurant.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMapOpen(false)}
                  className="rounded-full border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600 transition hover:bg-ink-100"
                >
                  Fechar
                </button>
              </div>

              <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
                <div className="min-h-[320px] bg-ink-100">
                  {mapsEmbedUrl ? (
                    <iframe
                      title={`Mapa de ${restaurant.name}`}
                      src={mapsEmbedUrl}
                      className="h-full min-h-[320px] w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="flex min-h-[320px] items-center justify-center p-6 text-center text-sm text-ink-500">
                      Endereço não disponível para exibir no mapa.
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-5">
                  <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Endereço</p>
                    <p className="mt-2 text-sm leading-6 text-ink-800">
                      {restaurant.address || 'Endereço não informado'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Abrir no Google Maps</p>
                    <a
                      href={mapsEmbedUrl ? mapsEmbedUrl.replace('/maps?q=', '/maps/search/?api=1&query=') : '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center rounded-xl border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-900 transition hover:bg-ink-100"
                    >
                      Abrir em nova aba
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <main className="mb-16 space-y-5 sm:mb-0">
            <div className="sticky top-0 z-30 -mx-4 px-4 py-3 pb-4 sm:static sm:mx-0 sm:px-0 sm:py-0">
              <Card className="p-4 md:p-5">
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
              </Card>
            </div>

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
                          onClick={() => (product.optionGroups?.length ? openProductConfig(product) : addToCart(product))}
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
                            {product.optionGroups?.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {product.optionGroups.slice(0, 3).map((group) => (
                                  <span
                                    key={`${product.id}-${group.name}`}
                                    className="rounded-full border border-mint-200 bg-mint-50 px-2.5 py-1 text-[11px] font-semibold text-mint-800"
                                  >
                                    {formatOptionGroupPreview(group)}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="text-sm font-semibold text-mint-700">
                            {product.optionGroups?.length ? 'Personalizar' : 'Adicionar'}
                          </div>
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

                  <div className="grid gap-5 grid-cols-1">
                    {category.products.map((product) => {
                      const productImageSrc = resolveMediaUrl(product.imageUrl);
                      const hasProductImage = Boolean(productImageSrc);

                      return (
                        <Card key={product.id} className="overflow-hidden border-ink-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                          <div
                            className={`grid h-full items-stretch gap-4 ${
                              hasProductImage
                                ? 'grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr]'
                                : 'grid-cols-1'
                            }`}
                          >
                            {hasProductImage ? (
                              <div className="relative min-h-[120px] bg-ink-100">
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
                                  {product.optionGroups?.length ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {product.optionGroups.slice(0, 3).map((group) => (
                                        <span
                                          key={`${product.id}-${group.name}`}
                                          className="rounded-full border border-mint-200 bg-mint-50 px-2.5 py-1 text-[11px] font-semibold text-mint-800"
                                        >
                                          {formatOptionGroupPreview(group)}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div className="mt-5 flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500">A partir de</div>
                                  <div className="text-xl font-black text-ink-950">R$ {formatPrice(product.price)}</div>
                                </div>
                                <Button size="sm" onClick={() => (product.optionGroups?.length ? openProductConfig(product) : addToCart(product))}>
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

          <aside className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
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
                    <div className="grid gap-3 rounded-2xl border border-ink-200 bg-ink-50 p-4 md:grid-cols-2">
                      <label className="space-y-1 text-sm">
                        <span className="font-semibold text-ink-700">Nome</span>
                        <input
                          value={customerName}
                          onChange={(event) => setCustomerName(event.target.value)}
                          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                          placeholder="Seu nome"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-semibold text-ink-700">Telefone</span>
                        <input
                          value={customerPhone}
                          onChange={(event) => setCustomerPhone(event.target.value)}
                          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                          placeholder="(31) 99999-9999"
                        />
                      </label>
                      <label className="space-y-1 text-sm md:col-span-2">
                        <span className="font-semibold text-ink-700">Endereço</span>
                        <input
                          value={customerAddress}
                          onChange={(event) => setCustomerAddress(event.target.value)}
                          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                          placeholder="Rua, número"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-semibold text-ink-700">Bairro</span>
                        <input
                          value={customerNeighborhood}
                          onChange={(event) => setCustomerNeighborhood(event.target.value)}
                          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                          placeholder="Bairro"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-semibold text-ink-700">Complemento</span>
                        <input
                          value={customerComplement}
                          onChange={(event) => setCustomerComplement(event.target.value)}
                          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                          placeholder="Casa, apto, bloco"
                        />
                      </label>
                      <label className="space-y-1 text-sm md:col-span-2">
                        <span className="font-semibold text-ink-700">Ponto de referência</span>
                        <input
                          value={customerReference}
                          onChange={(event) => setCustomerReference(event.target.value)}
                          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                          placeholder="Ex: perto do posto"
                        />
                      </label>
                      <label className="space-y-1 text-sm md:col-span-2">
                        <span className="font-semibold text-ink-700">Pagamento</span>
                        <select
                          value={paymentMethod}
                          onChange={(event) => setPaymentMethod(event.target.value)}
                          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                        >
                          <option>Pagamento no cartão</option>
                          <option>Pagamento no pix</option>
                          <option>Pagamento em dinheiro</option>
                        </select>
                      </label>
                      <label className="space-y-1 text-sm md:col-span-2">
                        <span className="font-semibold text-ink-700">Observações do pedido</span>
                        <textarea
                          value={orderObservation}
                          onChange={(event) => setOrderObservation(event.target.value)}
                          className="min-h-24 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                          placeholder="Ex: sem cebola, pouco molho..."
                        />
                      </label>
                    </div>

                    {cart.map((item) => {
                      const lineKey = buildCartItemKey(item.product.id, item.selectedOptions, item.observation);

                      return (
                      <div key={lineKey} className="rounded-2xl border border-ink-200 bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-ink-950">{item.product.name}</div>
                            <div className="text-xs text-ink-500">R$ {formatPrice(getCartItemUnitPrice(item))}</div>
                            {item.selectedOptions.length ? (
                              <div className="mt-2 space-y-1 text-xs text-ink-600">
                                {item.selectedOptions.map((option) => (
                                  <p key={`${option.groupName}-${option.optionName}`}>
                                    {option.groupName}: {option.optionName}
                                      {option.priceMode === 'replace'
                                        ? ` (base R$ ${formatPrice(option.optionPrice)})`
                                        : option.optionPrice
                                          ? ` (+R$ ${formatPrice(option.optionPrice)})`
                                          : ''}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                            {item.observation ? <p className="mt-2 text-xs text-ink-600">Obs: {item.observation}</p> : null}
                          </div>

                          <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 p-1">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-ink-800"
                              onClick={() => changeQty(lineKey, item.qty - 1)}
                            >
                              -
                            </button>
                            <div className="w-6 text-center text-sm font-semibold text-ink-900">{item.qty}</div>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-ink-800"
                              onClick={() => changeQty(lineKey, item.qty + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                    })}

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
          <div className="sm:hidden">
            {isCartOpen ? (
              <div className="fixed inset-0 z-50">
                <button
                  type="button"
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setIsCartOpen(false)}
                />
                <div className="absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Carrinho</p>
                      <h3 className="text-lg font-bold text-ink-950">{cartCount} itens</h3>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600"
                      onClick={() => setIsCartOpen(false)}
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
                    {cart.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-4 py-8 text-center text-sm text-ink-500">
                        Seu carrinho está vazio.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid gap-3 rounded-2xl border border-ink-200 bg-ink-50 p-4">
                          <label className="space-y-1 text-sm">
                            <span className="font-semibold text-ink-700">Nome</span>
                            <input
                              value={customerName}
                              onChange={(event) => setCustomerName(event.target.value)}
                              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                              placeholder="Seu nome"
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-semibold text-ink-700">Telefone</span>
                            <input
                              value={customerPhone}
                              onChange={(event) => setCustomerPhone(event.target.value)}
                              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                              placeholder="(31) 99999-9999"
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-semibold text-ink-700">Endereço</span>
                            <input
                              value={customerAddress}
                              onChange={(event) => setCustomerAddress(event.target.value)}
                              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                              placeholder="Rua, número"
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-semibold text-ink-700">Bairro</span>
                            <input
                              value={customerNeighborhood}
                              onChange={(event) => setCustomerNeighborhood(event.target.value)}
                              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                              placeholder="Bairro"
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-semibold text-ink-700">Complemento</span>
                            <input
                              value={customerComplement}
                              onChange={(event) => setCustomerComplement(event.target.value)}
                              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                              placeholder="Casa, apto, bloco"
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-semibold text-ink-700">Ponto de referência</span>
                            <input
                              value={customerReference}
                              onChange={(event) => setCustomerReference(event.target.value)}
                              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                              placeholder="Ex: perto do posto"
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-semibold text-ink-700">Pagamento</span>
                            <select
                              value={paymentMethod}
                              onChange={(event) => setPaymentMethod(event.target.value)}
                              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                            >
                              <option>Pagamento no cartão</option>
                              <option>Pagamento no pix</option>
                              <option>Pagamento em dinheiro</option>
                            </select>
                          </label>
                        </div>

                        {cart.map((item) => {
                          const lineKey = buildCartItemKey(item.product.id, item.selectedOptions, item.observation);

                          return (
                          <div key={lineKey} className="rounded-2xl border border-ink-200 bg-white px-4 py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-ink-950">{item.product.name}</div>
                                <div className="text-xs text-ink-500">R$ {formatPrice(getCartItemUnitPrice(item))}</div>
                                {item.selectedOptions.length ? (
                                  <div className="mt-2 space-y-1 text-xs text-ink-600">
                                    {item.selectedOptions.map((option) => (
                                      <p key={`${option.groupName}-${option.optionName}`}>
                                        {option.groupName}: {option.optionName}
                                        {option.priceMode === 'replace'
                                          ? ` (base R$ ${formatPrice(option.optionPrice)})`
                                          : option.optionPrice
                                            ? ` (+R$ ${formatPrice(option.optionPrice)})`
                                            : ''}
                                      </p>
                                    ))}
                                  </div>
                                ) : null}
                                {item.observation ? <p className="mt-2 text-xs text-ink-600">Obs: {item.observation}</p> : null}
                              </div>
                              <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 p-1">
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-ink-800"
                                  onClick={() => changeQty(lineKey, item.qty - 1)}
                                >
                                  -
                                </button>
                                <div className="w-6 text-center text-sm font-semibold text-ink-900">{item.qty}</div>
                                <button
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-ink-800"
                                  onClick={() => changeQty(lineKey, item.qty + 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 border-t border-ink-200 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-ink-600">Total</div>
                      <div className="text-xl font-black text-ink-950">R$ {formatPrice(total)}</div>
                    </div>
                    <Button onClick={checkoutWhatsApp} className="w-full" disabled={cart.length === 0}>
                      Finalizar pedido
                    </Button>
                    <Button variant="secondary" className="w-full" onClick={() => setIsCartOpen(false)}>
                      Continuar comprando
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {configuringProduct ? (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
              <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Personalizar item</p>
                    <h3 className="mt-1 text-xl font-black text-ink-950">{configuringProduct.name}</h3>
                    {configuringProduct.description ? <p className="mt-2 text-sm text-ink-600">{configuringProduct.description}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={closeProductConfig}
                    className="rounded-full border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600 transition hover:bg-ink-100"
                  >
                    Fechar
                  </button>
                </div>

                <div className="max-h-[70vh] space-y-4 overflow-auto px-5 py-5">
                  <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Preço base</p>
                    <p className="mt-2 text-2xl font-black text-ink-950">R$ {formatPrice(configuringProduct.price)}</p>
                  </div>

                  {configuringProduct.optionGroups?.length ? (
                    <div className="space-y-4">
                      {configuringProduct.optionGroups.map((group) => {
                        const selectedValues = selectedOptionValues[group.name] ?? [];

                        return (
                          <div key={group.name} className="rounded-2xl border border-ink-200 p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="text-base font-bold text-ink-950">{group.name}</h4>
                                <p className="mt-1 text-xs text-ink-500">
                                  {group.multiple ? 'Seleção múltipla' : 'Seleção única'}
                                  {group.required ? ' · obrigatório' : ' · opcional'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 space-y-3">
                              {group.options.map((option) => {
                                const checked = selectedValues.includes(option.name);
                                const inputType = group.multiple ? 'checkbox' : 'radio';
                                const inputName = `group-${group.name}`;

                                return (
                                  <div
                                    key={option.name}
                                    className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition ${
                                      checked ? 'border-mint-400 bg-mint-50' : 'border-ink-200 bg-white hover:border-ink-300'
                                    }`}
                                  >
                                    <span className="flex items-center gap-3">
                                      <input
                                        type={inputType}
                                        name={inputName}
                                        checked={checked}
                                        onChange={() => toggleGroupOption(group.name, option.name, Boolean(group.multiple))}
                                        className="h-4 w-4 accent-ink-900"
                                      />
                                      <span>
                                        <span className="block text-sm font-semibold text-ink-950">{option.name}</span>
                                        {typeof option.price === 'number' ? (
                                          <span className="block text-xs text-ink-500">
                                            {resolveGroupPriceMode(group.name, group.priceMode) === 'replace'
                                              ? `Preço base: R$ ${formatPrice(option.price)}`
                                              : `+ R$ ${formatPrice(option.price)}`}
                                          </span>
                                        ) : null}
                                      </span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-4 py-6 text-sm text-ink-500">
                      Este produto não possui grupos de opções.
                    </div>
                  )}

                  <div className="rounded-2xl border border-ink-200 bg-white p-4">
                    <label className="space-y-1 text-sm">
                      <span className="font-semibold text-ink-700">Observação do item</span>
                      <textarea
                        value={selectedObservation}
                        onChange={(event) => setSelectedObservation(event.target.value)}
                        className="min-h-24 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-mint-400"
                        placeholder="Ex: sem cebola, pouco molho, ponto da carne..."
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-ink-200 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Total do item</p>
                    <p className="mt-1 text-xl font-black text-ink-950">R$ {formatPrice(configuringPreviewPrice)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={closeProductConfig}>
                      Cancelar
                    </Button>
                    <Button onClick={confirmConfiguredProduct}>Adicionar ao pedido</Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatPrice(n: number) {
  return n.toFixed(2).replace('.', ',');
}