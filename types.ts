export type ClientType = 'private' | 'company';

export interface Client {
  id: string;
  type: ClientType;
  name: string; // Ragione Sociale or Name Surname
  vat?: string; // P.IVA (only if company)
  cf?: string; // Codice Fiscale (mandatory for private, optional for company)
  address: string;
  email: string;
  phone: string;
}

export interface Product {
  id: string;
  code: string;
  description: string;
  unit: string; // mq, ml, cad, corpo
  price: number;
}

export enum OfferStatus {
  DRAFT = 'Bozza',
  SENT = 'Inviata',
  ACCEPTED = 'Accettata',
  REJECTED = 'Rifiutata',
  COMPLETED = 'Completata'
}

export interface OfferItem {
  id: string;
  productId?: string; // Optional, allows free text
  productCode: string;
  description: string; // Fully editable
  unit: string;
  quantity: number;
  unitPrice: number; // Fully editable
  total: number;
}

export interface Offer {
  id: string;
  clientId: string;
  clientName: string;
  clientAddress: string;
  clientVatOrCf: string;
  
  date: string;
  executionTime: string; // e.g. "3 settimane"
  worksiteAddress?: string; // Where the work happens
  
  items: OfferItem[];
  
  // Financials
  pricingMode: 'itemized' | 'lumpSum'; // Decide if sum of lines or manual total
  lumpSumAmount?: number; // The manual total amount
  discount?: number; // Discount amount in Euros
  
  subtotal: number; // This is now the Net Taxable Amount (Imponibile)
  vatRate: number; // Editable (standard 22, but flexible)
  vatAmount: number;
  total: number;
  
  // Terms
  paymentMethod: string; // Dropdown or free text
  paymentTerms: string; // The breakdown (30% start, etc.)
  legalTerms: string; // Fully editable legal text per offer
  notes?: string; // NEW: Notes field
  
  status: OfferStatus;
  
  // Attachments
  signedContractFile?: string; // Mock file name
  
  // Branding
  customLogoUrl?: string; // To persist the uploaded logo
}

export type View = 'dashboard' | 'crm' | 'inventory' | 'sales';