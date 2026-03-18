import React, { useState, useRef } from 'react';
import { Client, Product, Offer, OfferItem, OfferStatus } from '../types';
import { Plus, Eye, Trash2, Printer, Save, ArrowLeft, Upload, Paperclip, Edit2, Image as ImageIcon, ToggleLeft, ToggleRight, MapPin, Download } from 'lucide-react';

interface SalesProps {
  offers: Offer[];
  clients: Client[];
  products: Product[];
  onSave: (offer: Offer) => void;
  onUpdateStatus: (offerId: string, status: OfferStatus) => void;
}

const DEFAULT_LEGAL_TERMS = `ART. 1 - DEFINIZIONE DEL BENE/SERVIZIO
1.1. Il servizio/lavoro oggetto del contratto è descritto in modo preciso nel preventivo.
1.2. Il Cliente non può modificare le specifiche pattuite senza accordo scritto.

ART. 2 - ESECUZIONE E CONSEGNA
2.1. Il lavoro sarà eseguito a regola d'arte secondo le normative vigenti.

ART. 3 - MODALITA' DI UTILIZZO
3.1. Il Cliente si impegna a fornire accesso ai locali per l'esecuzione dei lavori.

ART. 4 - LUOGO DI ESECUZIONE
4.1. I lavori saranno eseguiti nel cantiere indicato nell'ordine.

ART. 5 - DURATA
5.1. La durata dei lavori è specificata nell'ordine a titolo indicativo.
5.2. Cause di forza maggiore possono prorogare il termine di consegna.

ART. 6 - TRASPORTO
6.1. Il costo del trasporto materiali è incluso nel prezzo salvo diverso accordo.

ART. 7 - PREZZI E PAGAMENTI
7.1. I prezzi si intendono IVA esclusa.

ART. 8 - TRATTAMENTO DATI (GDPR)
8.1. I dati personali sono trattati ai sensi del Reg. UE 679/2016 per l'esecuzione del contratto.`;

const Sales: React.FC<SalesProps> = ({ offers, clients, products, onSave, onUpdateStatus }) => {
  const [view, setView] = useState<'list' | 'editor' | 'preview'>('list');
  const [activeOffer, setActiveOffer] = useState<Offer | null>(null);

  // --- EDITOR STATE ---
  const [clientId, setClientId] = useState('');
  const [offerDate, setOfferDate] = useState(new Date().toISOString().split('T')[0]);
  const [executionTime, setExecutionTime] = useState('3 settimane');
  const [worksiteAddress, setWorksiteAddress] = useState('');
  const [vatRate, setVatRate] = useState(22);
  const [items, setItems] = useState<OfferItem[]>([]);
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState('Bonifico Bancario');
  const [paymentTerms, setPaymentTerms] = useState(
`Acconto Inizio Lavori: 30%
Acconto in corso d'opera: 40%
Saldo a Fine Lavoro: 30%`
  );

  // Notes & Legal
  const [notes, setNotes] = useState('');
  const [legalTerms, setLegalTerms] = useState(DEFAULT_LEGAL_TERMS);

  // Advanced Config
  const [pricingMode, setPricingMode] = useState<'itemized' | 'lumpSum'>('itemized');
  const [lumpSumAmount, setLumpSumAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0); 
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  // --- HANDLERS ---
  const initEditor = (offer?: Offer) => {
    if (offer) {
      setClientId(offer.clientId);
      setOfferDate(offer.date.split('T')[0]);
      setExecutionTime(offer.executionTime);
      setWorksiteAddress(offer.worksiteAddress || '');
      setVatRate(offer.vatRate);
      setItems(offer.items);
      setPaymentMethod(offer.paymentMethod);
      setPaymentTerms(offer.paymentTerms);
      setPricingMode(offer.pricingMode || 'itemized');
      setLumpSumAmount(offer.lumpSumAmount || 0);
      setDiscount(offer.discount || 0);
      setLegalTerms(offer.legalTerms || DEFAULT_LEGAL_TERMS);
      setNotes(offer.notes || '');
      setCustomLogo(offer.customLogoUrl || null);
      setActiveOffer(offer);
    } else {
      setClientId('');
      setOfferDate(new Date().toISOString().split('T')[0]);
      setExecutionTime('14 gg lavorativi');
      setWorksiteAddress('');
      setVatRate(22);
      setItems([]);
      setPaymentMethod('Bonifico Bancario');
      setPaymentTerms(`Acconto Inizio Lavori: 30%\nAcconto in corso d'opera: 40%\nSaldo a Fine Lavoro: 30%`);
      setPricingMode('itemized');
      setLumpSumAmount(0);
      setDiscount(0);
      setLegalTerms(DEFAULT_LEGAL_TERMS);
      setNotes('');
      setCustomLogo(null);
      setActiveOffer(null);
    }
    setView('editor');
  };

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      productCode: '',
      description: '',
      unit: 'mq',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }]);
  };

  const updateItem = (index: number, field: keyof OfferItem, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product) {
            item.productId = product.id;
            item.productCode = product.code;
            item.description = product.description;
            item.unit = product.unit;
            item.unitPrice = product.price;
        }
    } else {
        (item as any)[field] = value;
    }
    // Calculate total only if relevant, but we always store it
    item.total = item.quantity * item.unitPrice;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateTotals = () => {
    // 1. Raw Subtotal
    let rawSubtotal = 0;
    if (pricingMode === 'itemized') {
        rawSubtotal = items.reduce((acc, i) => acc + i.total, 0);
    } else {
        rawSubtotal = lumpSumAmount;
    }
    
    // 2. Apply Discount to get Taxable Base
    const taxableAmount = Math.max(0, rawSubtotal - discount);

    // 3. Calculate VAT on Taxable Base
    const vatAmount = taxableAmount * (vatRate / 100);
    
    // 4. Final Total
    const total = taxableAmount + vatAmount;

    return { rawSubtotal, taxableAmount, vatAmount, total };
  };

  const saveOffer = () => {
    const client = clients.find(c => c.id === clientId);
    if (!client) { alert("Seleziona un cliente"); return; }
    
    const { taxableAmount, vatAmount, total } = calculateTotals();

    const offer: Offer = {
        id: activeOffer ? activeOffer.id : Date.now().toString(),
        clientId: client.id,
        clientName: client.name,
        clientAddress: client.address,
        clientVatOrCf: client.type === 'company' ? (client.vat || '') : (client.cf || ''),
        date: new Date(offerDate).toISOString(),
        executionTime,
        worksiteAddress,
        items,
        
        pricingMode,
        lumpSumAmount: pricingMode === 'lumpSum' ? lumpSumAmount : undefined,
        discount, 

        subtotal: taxableAmount,
        vatRate,
        vatAmount,
        total,
        
        paymentMethod,
        paymentTerms,
        legalTerms, 
        notes, // New field
        customLogoUrl: customLogo || undefined,

        status: activeOffer ? activeOffer.status : OfferStatus.DRAFT,
        signedContractFile: activeOffer?.signedContractFile
    };
    onSave(offer);
    setActiveOffer(offer);
    alert("Salvato!");
    setView('list');
  };

  // Helper to extract percentages from text and calculate amounts
  const calculatePaymentBreakdown = (text: string, totalAmount: number) => {
    const regex = /(\d+(?:[.,]\d+)?)\s*%/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        const percentString = match[1].replace(',', '.');
        const percent = parseFloat(percentString);
        if (!isNaN(percent)) {
            const amount = totalAmount * (percent / 100);
            matches.push({ percent, amount });
        }
    }
    return matches;
  };

  // --- VIEWS ---

  if (view === 'editor') {
    const { rawSubtotal, taxableAmount, vatAmount, total } = calculateTotals();

    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-20">
        <div className="flex items-center justify-between sticky top-16 md:top-0 bg-slate-50 py-4 z-10 border-b border-slate-200">
            <div className="flex items-center gap-4">
                <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-800"><ArrowLeft /></button>
                <h2 className="text-2xl font-bold text-slate-800">{activeOffer ? 'Modifica Contratto' : 'Nuovo Contratto'}</h2>
            </div>
            <div className="flex gap-2">
                <button onClick={() => { if(!clientId) return alert("Scegli cliente"); setView('preview'); }} className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded hover:bg-slate-50"><Eye size={18} /> Anteprima PDF</button>
                <button onClick={saveOffer} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"><Save size={18} /> Salva</button>
            </div>
        </div>

        {/* --- 1. SETTINGS & HEADER --- */}
        <div className="bg-white p-6 rounded shadow border space-y-4">
             <h3 className="font-bold text-slate-700 border-b pb-2">Dati Generali</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-bold mb-1">Cliente</label>
                    <select className="w-full border p-2 rounded bg-slate-50" value={clientId} onChange={e => setClientId(e.target.value)}>
                        <option value="">Seleziona...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold mb-1">Data Offerta</label>
                    <input type="date" className="w-full border p-2 rounded" value={offerDate} onChange={e => setOfferDate(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-1">Tempo di Esecuzione</label>
                    <input type="text" className="w-full border p-2 rounded" placeholder="Es. 15 giorni lavorativi" value={executionTime} onChange={e => setExecutionTime(e.target.value)} />
                </div>
                <div className="lg:col-span-2">
                    <label className="block text-sm font-bold mb-1">Luogo di Esecuzione / Cantiere</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            className="w-full pl-9 pr-3 py-2 border p-2 rounded" 
                            placeholder="Inserisci indirizzo cantiere (lascia vuoto se uguale al cliente)" 
                            value={worksiteAddress} 
                            onChange={e => setWorksiteAddress(e.target.value)} 
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold mb-1">Logo Personalizzato</label>
                    <div className="flex items-center gap-4">
                         {customLogo && <img src={customLogo} alt="Logo" className="h-10 object-contain" />}
                         <label className="cursor-pointer bg-slate-200 px-3 py-1 rounded text-sm hover:bg-slate-300 flex items-center gap-2">
                             <ImageIcon size={16}/> Carica Logo
                             <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload}/>
                         </label>
                    </div>
                </div>
            </div>
        </div>

        {/* --- 2. PRICING CONFIG --- */}
        <div className="bg-white p-6 rounded shadow border space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
                 <h3 className="font-bold text-slate-700">Righe e Prezzi</h3>
                 <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                     <button 
                        onClick={() => setPricingMode('itemized')}
                        className={`px-3 py-1 text-sm rounded ${pricingMode === 'itemized' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                     >
                         Dettagliato (Somma)
                     </button>
                     <button 
                        onClick={() => setPricingMode('lumpSum')}
                        className={`px-3 py-1 text-sm rounded ${pricingMode === 'lumpSum' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                     >
                         A Corpo (Totale Manuale)
                     </button>
                 </div>
            </div>

            {/* ITEMS LIST */}
            <div className="space-y-2">
                {items.map((item, idx) => (
                    <div key={item.id} className="flex flex-col md:flex-row gap-2 items-start border-b pb-4 mb-2">
                        <div className="w-full md:w-auto flex-1 space-y-1">
                             <label className="text-[10px] uppercase font-bold text-slate-400">Descrizione</label>
                             <textarea className="w-full border p-2 rounded text-sm h-20" placeholder="Descrizione Lavorazione" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="w-20">
                                <label className="text-[10px] uppercase font-bold text-slate-400">Q.tà</label>
                                <input type="number" className="w-full border p-2 rounded text-sm" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value))} />
                            </div>
                            <div className={`w-24 ${pricingMode === 'lumpSum' ? 'opacity-50 grayscale' : ''}`}>
                                <label className="text-[10px] uppercase font-bold text-slate-400">Prezzo Unit.</label>
                                <input 
                                    type="number" 
                                    className="w-full border p-2 rounded text-sm" 
                                    value={item.unitPrice} 
                                    onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value))}
                                    disabled={pricingMode === 'lumpSum'} 
                                />
                            </div>
                            <div className="pt-6">
                                <button onClick={() => removeItem(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                ))}
                <button onClick={addItem} className="text-indigo-600 text-sm font-medium hover:underline">+ Aggiungi Riga Lavorazione</button>
            </div>

            {/* TOTALS AREA */}
            <div className="bg-slate-50 p-4 rounded-lg flex flex-col items-end gap-2 mt-4">
                 {pricingMode === 'lumpSum' && (
                     <div className="w-64">
                         <label className="block text-sm font-bold text-indigo-700 mb-1">IMPORTO LORDO (A CORPO)</label>
                         <input 
                            type="number" 
                            className="w-full border-2 border-indigo-200 p-2 rounded text-right font-bold text-lg" 
                            value={lumpSumAmount}
                            onChange={(e) => setLumpSumAmount(parseFloat(e.target.value))}
                         />
                     </div>
                 )}
                 
                 <div className="w-72 border-t border-slate-300 pt-2 mt-2 space-y-2">
                     <div className="flex justify-between text-sm items-center">
                         <span>Importo Lordo:</span>
                         <span className="font-medium">€ {rawSubtotal.toFixed(2)}</span>
                     </div>
                     
                     <div className="flex justify-between items-center">
                         <span className="text-sm font-bold text-red-600">Sconto (€):</span>
                         <input 
                            type="number" 
                            min="0"
                            className="w-24 border p-1 rounded text-right text-sm text-red-600 border-red-200 bg-red-50" 
                            value={discount} 
                            onChange={e => setDiscount(parseFloat(e.target.value))} 
                         />
                     </div>

                     <div className="flex justify-between text-sm items-center border-t border-dashed border-slate-300 pt-2">
                         <span className="font-semibold">Imponibile Netto:</span>
                         <span className="font-semibold">€ {taxableAmount.toFixed(2)}</span>
                     </div>

                     <div className="flex justify-between items-center text-sm">
                         <span>IVA %:</span>
                         <input 
                            type="number" 
                            className="w-16 border p-1 text-right text-xs rounded" 
                            value={vatRate} 
                            onChange={e => setVatRate(parseFloat(e.target.value))} 
                         />
                     </div>
                     <div className="flex justify-between text-sm">
                         <span>Importo IVA:</span>
                         <span>€ {vatAmount.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between font-bold text-lg text-slate-800 pt-2 border-t border-slate-300">
                         <span>Totale:</span>
                         <span>€ {total.toFixed(2)}</span>
                     </div>
                 </div>
            </div>
        </div>

         {/* --- 3. CONDITIONS, NOTES & PAYMENT --- */}
         <div className="bg-white p-6 rounded shadow border space-y-6">
             <div>
                 <h3 className="font-bold text-slate-700 mb-2">Metodo e Termini di Pagamento</h3>
                 <p className="text-xs text-slate-500 mb-2">Inserisci le percentuali (es. 30%, 40%) per calcolare automaticamente le rate.</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <input 
                        type="text" 
                        className="border p-2 rounded w-full" 
                        placeholder="Metodo (es. Bonifico)" 
                        value={paymentMethod} 
                        onChange={e => setPaymentMethod(e.target.value)}
                     />
                     <textarea 
                        className="border p-2 rounded w-full h-24 text-sm" 
                        placeholder="Dettagli scadenze (es. 30% acconto...)"
                        value={paymentTerms}
                        onChange={e => setPaymentTerms(e.target.value)}
                     />
                 </div>
             </div>

             <div>
                <h3 className="font-bold text-slate-700 mb-2">Note (Visibili nel PDF)</h3>
                <textarea 
                    className="w-full border p-2 rounded h-32 text-sm"
                    placeholder="Note aggiuntive..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                />
             </div>
             
             <div>
                 <h3 className="font-bold text-slate-700 mb-2">Condizioni Generali di Contratto (Modificabili)</h3>
                 <p className="text-xs text-slate-500 mb-2">Puoi modificare il testo legale qui sotto per questo specifico contratto.</p>
                 <textarea 
                    className="w-full border p-4 rounded-lg h-96 font-mono text-xs leading-relaxed"
                    value={legalTerms}
                    onChange={e => setLegalTerms(e.target.value)}
                 />
             </div>
         </div>
      </div>
    );
  }

  // 2. PREVIEW (THE PDF REWRITE)
  if (view === 'preview') {
    const client = clients.find(c => c.id === clientId);
    const { rawSubtotal, taxableAmount, vatAmount, total } = calculateTotals();
    const year = new Date(offerDate).getFullYear();
    const offerNum = activeOffer ? activeOffer.id.slice(-5) : "00001";
    // Use uploaded logo or placeholder
    const logoSrc = customLogo || "https://placehold.co/400x200?text=Inserisci+Logo+Qui";

    // Auto-calculate payment breakdown based on text matches
    const paymentBreakdown = calculatePaymentBreakdown(paymentTerms, total);

    // PDF Download Handler
    const handleDownloadPdf = () => {
        const element = document.getElementById('pdf-content');
        const safeClientName = client?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'cliente';
        const filename = `Contratto_${safeClientName}_${offerDate}.pdf`;
        
        const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // @ts-ignore
        if (window.html2pdf) {
            // @ts-ignore
            window.html2pdf().set(opt).from(element).save();
        } else {
            alert("Libreria PDF non ancora caricata. Attendi qualche secondo e riprova.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-500 py-8 px-4 print:bg-white print:p-0">
            {/* Print Toolbar */}
            <div className="max-w-[210mm] mx-auto mb-4 flex justify-between print:hidden">
                <button onClick={() => setView('editor')} className="bg-white px-4 py-2 rounded shadow">Indietro</button>
                <div className="flex gap-2">
                    <button 
                      onClick={handleDownloadPdf} 
                      className="bg-green-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-green-700"
                    >
                      <Download size={18}/> Scarica PDF
                    </button>
                    <button 
                      onClick={() => window.print()} 
                      className="bg-blue-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-blue-700"
                    >
                      <Printer size={18}/> Stampa
                    </button>
                </div>
            </div>

            {/* A4 PAGE CONTAINER - WRAPPED FOR PDF GENERATION */}
            {/* Reduced text size to 11px and tweaked vertical rhythm */}
            <div id="pdf-content" className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:w-full text-black text-[11px] leading-tight font-sans print:m-0 print:border-none">
                
                {/* --- PAGE 1 CONTENT --- */}
                {/* Fixed height 297mm to visualize A4 limit, use overflow-hidden if needed */}
                <div className="p-[10mm] h-[297mm] flex flex-col relative bg-white">
                    
                    {/* Header: Logo and Title - Reduced bottom margin */}
                    <div className="flex justify-between items-end mb-4 border-b-2 border-red-600 pb-2">
                        <div className="flex-1">
                             {/* Logo Image Tag - Slightly reduced height to fit more content */}
                             <img 
                                src={logoSrc} 
                                alt="Design & Creation Logo" 
                                className="h-40 max-w-full object-contain object-left" 
                             />
                        </div>
                        <div className="text-right shrink-0">
                             <h2 className="text-xl font-bold mb-1">Offerta N. {year}/{offerNum}</h2>
                             <p>Del {new Date(offerDate).toLocaleDateString('it-IT')}</p>
                        </div>
                    </div>

                    {/* Client Details Section (Form Style) - Compact */}
                    <div className="mb-4 space-y-1">
                        <div className="flex items-end">
                            <span className="w-24 font-bold">Cliente:</span>
                            <div className="flex-1 border-b border-black px-2">{client?.name}</div>
                        </div>
                        <div className="flex items-end">
                            <span className="w-24 font-bold">Indirizzo:</span>
                            <div className="flex-1 border-b border-black px-2">{client?.address}</div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex flex-1 items-end">
                                <span className="w-10 font-bold">P.IVA/CF:</span>
                                <div className="flex-1 border-b border-black px-2">{client?.vat || client?.cf}</div>
                            </div>
                            {/* Conditional Phone - Only show if data exists */}
                            {client?.phone && (
                                <div className="flex flex-1 items-end">
                                    <span className="w-10 font-bold">Tel:</span>
                                    <div className="flex-1 border-b border-black px-2">{client.phone}</div>
                                </div>
                            )}
                        </div>
                        {/* Conditional Email - Only show if data exists */}
                        {client?.email && (
                            <div className="flex items-end">
                                <span className="w-24 font-bold">Email:</span>
                                <div className="flex-1 border-b border-black px-2">{client.email}</div>
                            </div>
                        )}
                    </div>

                    {/* Conditions Header - Compact */}
                    <div className="mb-2">
                        <h3 className="font-bold underline mb-1">CONDIZIONI PARTICOLARI:</h3>
                        <div className="flex gap-4 mb-1">
                            <div className="font-bold">a) Luogo di Esecuzione:</div>
                            <div>{worksiteAddress || client?.address}</div>
                        </div>
                        <div className="flex gap-4 mb-1">
                            <div className="font-bold">b) Tempo di Esecuzione:</div>
                            <div>{executionTime}</div>
                        </div>
                         <div className="flex gap-4">
                            <div className="font-bold">c) Pagamento:</div>
                            <div>{paymentMethod}</div>
                        </div>
                    </div>

                    {/* Items Table - Responsive to Pricing Mode - Reduced Spacing */}
                    <div className="mb-4">
                        <div className="font-bold mb-1">d) Oggetto del contratto</div>
                        <table className="w-full border-collapse border border-black">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="border border-black p-1 text-left w-[50%]">Descrizione</th>
                                    <th className="border border-black p-1 text-center w-[10%]">Qta</th>
                                    {/* Hide Price Columns if Lump Sum */}
                                    {pricingMode === 'itemized' && (
                                        <>
                                            <th className="border border-black p-1 text-right w-[15%]">Listino</th>
                                            <th className="border border-black p-1 text-right w-[15%]">Tot. Riga</th>
                                            <th className="border border-black p-1 text-center w-[10%]">IVA</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-black p-1 whitespace-pre-wrap">{item.description}</td>
                                        <td className="border border-black p-1 text-center">{item.quantity}</td>
                                        {pricingMode === 'itemized' && (
                                            <>
                                                <td className="border border-black p-1 text-right">€ {item.unitPrice.toFixed(2)}</td>
                                                <td className="border border-black p-1 text-right">€ {item.total.toFixed(2)}</td>
                                                <td className="border border-black p-1 text-center">{vatRate}%</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                                {/* Spacer rows - Reduced count */}
                                {items.length < 3 && Array.from({length: 3 - items.length}).map((_, i) => (
                                    <tr key={`empty-${i}`}>
                                        <td className="border border-black p-3"></td>
                                        <td className="border border-black p-3"></td>
                                        {pricingMode === 'itemized' && (
                                            <>
                                                <td className="border border-black p-3"></td>
                                                <td className="border border-black p-3"></td>
                                                <td className="border border-black p-3"></td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Section */}
                    <div className="flex justify-end mb-4">
                        <div className="w-1/2 border border-black p-2 bg-slate-50">
                             <div className="flex justify-between mb-1">
                                <span>Importo Lordo {pricingMode === 'lumpSum' ? '(A CORPO)' : ''}:</span>
                                <span>€ {rawSubtotal.toFixed(2)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between mb-1 text-red-700">
                                    <span>Sconto applicato:</span>
                                    <span>- € {discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between mb-1 font-semibold border-t border-slate-300 pt-1">
                                <span>Imponibile Netto:</span>
                                <span>€ {taxableAmount.toFixed(2)}</span>
                            </div>
                             <div className="flex justify-between mb-1">
                                <span>IVA ({vatRate}%):</span>
                                <span>€ {vatAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t border-black pt-1 mt-1 text-sm">
                                <span className="font-bold">TOTALE LAVORAZIONE:</span>
                                <span className="font-bold">€ {total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Terms Text & Automatic Breakdown */}
                    <div className="mb-4 border border-black p-2 bg-slate-50">
                        <div className="font-bold underline mb-1">Modalità di pagamento dettagliate:</div>
                        <pre className="whitespace-pre-wrap font-sans text-xs mb-2">{paymentTerms}</pre>
                        
                        {/* Auto-Calculated Payment Breakdown */}
                        {paymentBreakdown.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-dashed border-slate-400">
                                <span className="font-bold text-xs block mb-1">Ripartizione Rate (Stima su Totale Lavorazione):</span>
                                <div className="flex flex-wrap gap-4">
                                    {paymentBreakdown.map((item, idx) => (
                                        <div key={idx} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded">
                                            <span className="font-bold">{item.percent}%</span> = € {item.amount.toFixed(2)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* First Page Signature */}
                    <div className="mt-auto">
                        <div className="flex justify-between items-end border-t-2 border-black pt-4">
                             <div className="w-1/2">
                                 <p className="mb-4">Data Accettazione: _________________</p>
                             </div>
                             <div className="w-1/2 text-center">
                                 <p className="mb-8 font-bold">TIMBRO E FIRMA COMMITTENTE</p>
                                 <p className="text-xs">(Legale rappresentante)</p>
                             </div>
                        </div>
                        
                        {/* Footer Company Info */}
                        <div className="text-center text-[10px] text-slate-500 mt-4 pt-2 border-t border-slate-300">
                            <p className="font-bold text-black">DESIGN & CREATION di Nicola Guerra</p>
                            <p>Sede Legale: Via P.le Caldarulo 18, Bari 70132 - P.IVA 03445000734</p>
                            <p>Email: guerranicola76@gmail.com - Tel: +39 379 143 0601</p>
                        </div>
                    </div>
                </div>

                {/* --- PAGE BREAK & CONDITIONS --- */}
                <div className="page-break"></div>

                {/* --- PAGE 2+ (General Conditions) --- */}
                <div className="p-[10mm] h-[297mm] flex flex-col bg-white">
                    <div className="border-b-2 border-red-600 mb-4 pb-2 shrink-0">
                         <h2 className="text-lg font-bold text-center">CONDIZIONI GENERALI DI CONTRATTO</h2>
                         <p className="text-center text-xs">Rif. Offerta N. {year}/{offerNum}</p>
                    </div>

                    {/* 2-Column Text Layout for Legal Terms (Now using dynamic state) */}
                    {/* Added flex-1 to occupy available space, removed fixed min-height constraints elsewhere */}
                    <div className="columns-2 gap-8 text-[9px] text-justify leading-tight mb-4 whitespace-pre-line flex-1 overflow-hidden">
                        {legalTerms}
                    </div>

                    {/* NOTES SECTION - Reduced height significantly to ensure it fits */}
                    <div className="mb-4 border border-black p-2 h-[150px] shrink-0">
                        <div className="font-bold underline mb-1">Note:</div>
                        <div className="whitespace-pre-wrap font-sans text-xs">
                            {notes}
                        </div>
                    </div>

                    {/* Final Specific Approvals (Required by Italian Law Art 1341) */}
                    <div className="mt-auto border-t-2 border-black pt-4 shrink-0">
                        <p className="mb-4 font-bold text-sm">
                            Il cliente firmando il contratto accetta tutte le condizioni di questo contratto.
                        </p>
                        
                        <div className="flex justify-between items-end mt-8">
                             <div className="w-1/2">
                                 <p>Luogo e Data: _______________________</p>
                             </div>
                             <div className="w-1/2 text-center">
                                 <p className="mb-10 font-bold">TIMBRO E FIRMA PER ACCETTAZIONE</p>
                                 <div className="border-b border-black w-3/4 mx-auto"></div>
                             </div>
                        </div>
                    </div>
                     {/* Footer Repeated */}
                     <div className="text-center text-[10px] text-slate-500 mt-4 pt-2 border-t border-slate-300 shrink-0">
                        <p>DESIGN & CREATION di Nicola Guerra - Pagina 2</p>
                    </div>
                </div>

            </div>
        </div>
    );
  }

  // 3. LIST VIEW (Default)
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestione Contratti</h2>
        <button onClick={() => initEditor()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm"><Plus size={18} /> Nuovo Contratto</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Data</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Totale</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Stato</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {offers.map((offer) => (
                <tr key={offer.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">{offer.clientName}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(offer.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium">€ {offer.total.toFixed(2)}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">{offer.status}</span></td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                         <button onClick={() => initEditor(offer)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={18} /></button>
                    </td>
                </tr>
            ))}
             {offers.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nessun contratto presente.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sales;