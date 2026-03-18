import React, { useState } from 'react';
import { Product } from '../types';
import { Plus, Search, Edit2, Tag } from 'lucide-react';

interface InventoryProps {
  products: Product[];
  onSave: (product: Product) => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, onSave }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({ code: '', description: '', price: 0, unit: 'mq' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.code && formData.description) {
      const newProduct: Product = {
        id: editingProduct ? editingProduct.id : Date.now().toString(),
        code: formData.code,
        description: formData.description,
        price: Number(formData.price) || 0,
        unit: formData.unit || 'mq',
      };
      onSave(newProduct);
      setIsModalOpen(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Listino Articoli</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} /> Nuovo Articolo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Cerca articolo per codice o descrizione..." 
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Codice</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrizione</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unità</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prezzo Unitario</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-sm text-slate-600">
                  <span className="bg-slate-100 px-2 py-1 rounded">{product.code}</span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">{product.description}</td>
                <td className="px-6 py-4 text-slate-600 font-medium">{product.unit}</td>
                <td className="px-6 py-4 text-slate-600 font-medium">€ {product.price.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleOpenModal(product)}
                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
             {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nessun articolo trovato.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {editingProduct ? 'Modifica Articolo' : 'Nuovo Articolo'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Codice Articolo</label>
                <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                    required
                    type="text" 
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.code || ''}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unità di Misura</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.unit || 'mq'}
                      onChange={e => setFormData({...formData, unit: e.target.value})}
                    >
                        <option value="mq">mq</option>
                        <option value="ml">ml</option>
                        <option value="cad">cad</option>
                        <option value="corpo">corpo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prezzo Unitario (€)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.price || ''}
                      onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                    />
                  </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;