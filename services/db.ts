import { Client, Product, Offer, OfferStatus } from '../types';

// Initial dummy data suited for Design & Creation
const INITIAL_CLIENTS: Client[] = [
  { 
    id: '1', 
    type: 'private',
    name: 'Antonio Rossi', 
    cf: 'RSSNTN80A01H501U', 
    address: 'Via Prof. G. Iannone, Palo del Colle',
    email: 'antonio.rossi@email.com',
    phone: '+39 333 1234567'
  },
  { 
    id: '2', 
    type: 'private',
    name: 'Piero Acquaro', 
    cf: 'CQRPR76M12L219K', 
    address: 'Via Fontana Vecchia 10, Bari',
    email: 'piero.acquaro@email.com',
    phone: '+39 333 9876543'
  },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', code: 'PITT-INT', description: 'Tinteggiatura pareti con ducotone silossanico lavabile bianco (3 mani)', unit: 'mq', price: 12.00 },
  { id: '2', code: 'RAS-STUC', description: 'Stuccatura e rasatura con stucco in pasta pareti divisorie', unit: 'mq', price: 15.00 },
  { id: '3', code: 'CART-FISS', description: 'Carteggiatura con levigatrice e applicazione fissativo aggrappante', unit: 'mq', price: 4.50 },
  { id: '4', code: 'PITT-EXT', description: 'Tinteggiatura facciate con quarzo o idrosilossanica esterna', unit: 'mq', price: 18.00 },
  { id: '5', code: 'RIP-CEM', description: 'Ripristino con materiale base cementizio resinoso', unit: 'cad', price: 50.00 },
  { id: '6', code: 'PONT', description: 'Nolo e montaggio Trabattello in acciaio con scale', unit: 'corpo', price: 250.00 },
];

// Helper to load/save
const load = <T,>(key: string, initial: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
};

const save = <T,>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// API Surface
export const db = {
  getClients: () => load<Client[]>('dc_clients', INITIAL_CLIENTS),
  saveClients: (clients: Client[]) => save('dc_clients', clients),

  getProducts: () => load<Product[]>('dc_products', INITIAL_PRODUCTS),
  saveProducts: (products: Product[]) => save('dc_products', products),

  getOffers: () => load<Offer[]>('dc_offers', []),
  saveOffers: (offers: Offer[]) => save('dc_offers', offers),
};