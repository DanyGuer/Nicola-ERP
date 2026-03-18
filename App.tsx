import React, { useState, useEffect } from 'react';
import { View, Client, Product, Offer, OfferStatus } from './types';
import { db } from './services/db';
import { LayoutDashboard, Users, Package, FileText, Menu, X } from 'lucide-react';

// Components
import Dashboard from './components/Dashboard';
import CRM from './components/CRM';
import Inventory from './components/Inventory';
import Sales from './components/Sales';

const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  // Load data on mount
  useEffect(() => {
    setClients(db.getClients());
    setProducts(db.getProducts());
    setOffers(db.getOffers());
  }, []);

  // CRUD Handlers
  const handleSaveClient = (client: Client) => {
    const exists = clients.find(c => c.id === client.id);
    const updated = exists 
      ? clients.map(c => c.id === client.id ? client : c)
      : [...clients, client];
    
    setClients(updated);
    db.saveClients(updated);
  };

  const handleSaveProduct = (product: Product) => {
    const exists = products.find(p => p.id === product.id);
    const updated = exists 
      ? products.map(p => p.id === product.id ? product : p)
      : [...products, product];

    setProducts(updated);
    db.saveProducts(updated);
  };

  const handleSaveOffer = (offer: Offer) => {
    // Check if offer exists to update it, otherwise add new
    const exists = offers.find(o => o.id === offer.id);
    const updated = exists
      ? offers.map(o => o.id === offer.id ? offer : o)
      : [offer, ...offers]; // Prepend new offer
      
    setOffers(updated);
    db.saveOffers(updated);
  };

  const handleUpdateOfferStatus = (offerId: string, status: OfferStatus) => {
    const updated = offers.map(o => o.id === offerId ? { ...o, status } : o);
    setOffers(updated);
    db.saveOffers(updated);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: View; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => { setCurrentView(view); setIsMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
        currentView === view 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-10 print:hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold text-slate-800">MiniERP</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Gestione Semplificata</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="crm" icon={Users} label="Clienti (CRM)" />
          <NavItem view="inventory" icon={Package} label="Articoli & Listini" />
          <NavItem view="sales" icon={FileText} label="Offerte & Vendite" />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-xs text-slate-500">Utente Connesso</p>
            <p className="text-sm font-medium text-slate-800">Mario Rossi</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center z-20 print:hidden">
        <span className="font-bold text-slate-800">MiniERP</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-10 pt-20 px-4 space-y-4 print:hidden">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="crm" icon={Users} label="Clienti (CRM)" />
          <NavItem view="inventory" icon={Package} label="Articoli & Listini" />
          <NavItem view="sales" icon={FileText} label="Offerte & Vendite" />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 pt-20 md:pt-6 print:m-0 print:p-0 print:w-full">
        <div className="max-w-7xl mx-auto print:max-w-none print:w-full">
          {currentView === 'dashboard' && <Dashboard offers={offers} />}
          {currentView === 'crm' && <CRM clients={clients} onSave={handleSaveClient} />}
          {currentView === 'inventory' && <Inventory products={products} onSave={handleSaveProduct} />}
          {currentView === 'sales' && (
            <Sales 
                offers={offers} 
                clients={clients} 
                products={products} 
                onSave={handleSaveOffer} 
                onUpdateStatus={handleUpdateOfferStatus}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;