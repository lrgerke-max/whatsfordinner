import { StoreProfile } from '../types/stores';

/**
 * Offline store profiles for the deal estimator.
 *
 * Cold-chain realism: every walkSequence puts produce early and dairy/frozen
 * late (frozen always last, right before checkout) — the way real stores are
 * laid out so cold items spend as little time as possible in the cart.
 *
 * pricingMultiplier is relative to a Walmart-baseline of 1.0. These are
 * typical-local-price estimates, NOT live prices.
 */

export const STORE_PROFILES: StoreProfile[] = [
  {
    id: 'walmart',
    name: 'Walmart',
    emoji: '🛒',
    tagline: 'One-stop supercenter with everyday low prices',
    pricingMultiplier: 1.0,
    departmentMultipliers: {},
    availability: null,
    // Classic supercenter perimeter: produce at the entrance, meat/seafood
    // along the back wall, dairy mid-back, frozen picked last before checkout.
    walkSequence: [
      { aisleLabel: 'Entrance & Produce', departments: ['produce'], note: 'Grab a cart — produce is right inside the doors.' },
      { aisleLabel: 'Bakery & Grains', departments: ['grains', 'baking'] },
      { aisleLabel: 'Snacks & Beverages', departments: ['snacks', 'beverages'], note: 'Front-of-store aisles.' },
      { aisleLabel: 'Pantry Staples', departments: ['canned', 'condiments', 'spices', 'other'] },
      { aisleLabel: 'Meat & Seafood', departments: ['meat', 'seafood'], note: 'Along the back wall.' },
      { aisleLabel: 'Dairy & Eggs', departments: ['dairy'] },
      { aisleLabel: 'Frozen — Last Stop Before Checkout', departments: ['frozen'], note: 'Picked last so nothing thaws in your cart.' },
    ],
    estMinutesPerStop: 4,
  },
  {
    id: 'aldi',
    name: 'Aldi',
    emoji: '🧺',
    tagline: 'Small store, small prices — bring a quarter for the cart',
    pricingMultiplier: 0.78,
    // Aldi's edge is center-store private label; its produce is competitive
    // with Walmart's, so the discount concentrates in canned/snacks/grains.
    departmentMultipliers: { canned: 0.85, snacks: 0.88, grains: 0.9, condiments: 0.92, spices: 0.9 },
    // Aldi carries a narrow assortment everywhere (usually 1–2 varieties of
    // anything) rather than missing whole departments — its frozen seafood
    // and Stonemill spice rack exist but can sell through.
    availability: {
      departments: ['seafood'],
      note: 'Limited selection — usually 1–2 varieties, may sell out',
    },
    // Smaller layout: produce first, center aisles, coolers along the back,
    // freezers right by the registers — frozen grabbed last.
    walkSequence: [
      { aisleLabel: 'Fresh Produce', departments: ['produce'] },
      { aisleLabel: 'Bread & Bakes', departments: ['grains', 'baking'] },
      { aisleLabel: 'Center Aisles', departments: ['canned', 'condiments', 'spices', 'beverages', 'snacks', 'other'] },
      { aisleLabel: 'Meat & Dairy Coolers', departments: ['meat', 'dairy'] },
      { aisleLabel: 'Frozen — Right Before Checkout', departments: ['frozen'] },
    ],
    estMinutesPerStop: 3,
  },
  {
    id: 'meijer',
    name: 'Meijer',
    emoji: '🍏',
    tagline: 'Supercenter known for standout produce',
    pricingMultiplier: 0.95,
    departmentMultipliers: { produce: 0.88 },
    availability: null,
    // Produce market up front, counters mid-store, dairy then frozen last
    // so cold items go straight home.
    walkSequence: [
      { aisleLabel: 'Produce Market', departments: ['produce'] },
      { aisleLabel: 'Bakery & Grains', departments: ['grains', 'baking'] },
      { aisleLabel: 'Pantry, Snacks & Beverages', departments: ['canned', 'condiments', 'spices', 'snacks', 'beverages', 'other'] },
      { aisleLabel: 'Meat & Seafood Counter', departments: ['meat', 'seafood'] },
      { aisleLabel: 'Dairy Coolers', departments: ['dairy'] },
      { aisleLabel: 'Frozen Aisle — Last', departments: ['frozen'], note: 'Straight into the cooler bag and home.' },
    ],
    estMinutesPerStop: 3.5,
  },
];
