import React, { useState } from 'react';
import { Client, ClientType } from '../types';
import { Plus, Search, Edit2, User, Building2, Mail, Phone, MapPin } from 'lucide-react';

interface CRMProps {
  clients: Client[];
  onSave: (client: Client) => void;
}

const CRM: React.FC<CRMProps> = ({ clients, onSave }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Client>>({ type: 'private' });

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData({ 
        type: 'private', 
        name: '', 
        vat: '', 
        cf: '', 
        address: '', 
        email: '', 
        phone: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      const newClient: Client = {
        id: editingClient ? editingClient.id : Date.now().toString(),
        type: formData.type || 'private',
        name: formData.name,
        vat: formData.vat || '',
        cf: formData.cf || '',
        address: formData.address || '',
        email: formData.email || '',
        phone: formData.phone || '',
      };
      onSave(newClient);
      setIsModalOpen(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.vat && c.vat.includes(searchTerm)) ||
    (c.cf && c.cf.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Anagrafica Clienti</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} /> Nuovo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Cerca per nome, P.IVA o Codice Fiscale..." 
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid of Cards (More visual than table) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${client.type === 'company' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                  {client.type === 'company' ? <Building2 size={20} /> : <User size={20} />}
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">{client.name}</h3>
                    <span className="text-xs text-slate-500 uppercase">{client.type === 'company' ? 'Azienda' : 'Privato'}</span>
                </div>
              </div>
              <button 
                onClick={() => handleOpenModal(client)}
                className="text-slate-400 hover:text-indigo-600 p-1"
              >
                <Edit2 size={16} />
              </button>
            </div>
            
            <div className="space-y-2 text-sm text-slate-600">
              {client.vat && (
                <div className="flex gap-2">
                  <span className="font-medium min-w-[50px]">P.IVA:</span>
                  <span>{client.vat}</span>
                </div>
              )}
              {client.cf && (
                <div className="flex gap-2">
                  <span className="font-medium min-w-[50px]">C.F.:</span>
                  <span>{client.cf}</span>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <Phone size={14} className="text-slate-400" />
                <span>{client.phone || '-'}</span>
              </div>
              <div className="flex gap-2 items-center">
                <Mail size={14} className="text-slate-400" />
                <span>{client.email || '-'}</span>
              </div>
              <div className="flex gap-2 items-start">
                <MapPin size={14} className="text-slate-400 mt-0.5" />
                <span className="truncate">{client.address}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredClients.length === 0 && (
        <div className="text-center py-10 text-slate-500">Nessun cliente trovato con questi criteri.</div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">
              {editingClient ? 'Modifica Anagrafica' : 'Nuovo Cliente'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Type Switcher */}
              <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
                <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'private'})}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        formData.type === 'private' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Privato
                </button>
                <button
                    type="button"
                    onClick={() => setFormData({...formData, type: 'company'})}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        formData.type === 'company' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Azienda
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    {formData.type === 'company' ? 'Ragione Sociale' : 'Nome e Cognome'}
                </label>
                <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {formData.type === 'company' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Partita IVA</label>
                        <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.vat || ''}
                        onChange={e => setFormData({...formData, vat: e.target.value})}
                        />
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Codice Fiscale</label>
                    <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                    value={formData.cf || ''}
                    onChange={e => setFormData({...formData, cf: e.target.value.toUpperCase()})}
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
                    <input 
                    type="tel" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                    type="email" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Indirizzo Completo</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.address || ''}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Salva Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;