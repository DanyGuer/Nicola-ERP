import React, { useMemo } from 'react';
import { Offer, OfferStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  offers: Offer[];
}

const Dashboard: React.FC<DashboardProps> = ({ offers }) => {
  const metrics = useMemo(() => {
    const acceptedOffers = offers.filter(o => o.status === OfferStatus.ACCEPTED);
    const totalRevenue = acceptedOffers.reduce((acc, curr) => acc + curr.total, 0);
    const pendingCount = offers.filter(o => o.status === OfferStatus.DRAFT || o.status === OfferStatus.SENT).length;
    
    // Group by status for chart
    const statusCounts = offers.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.keys(OfferStatus).map((key) => {
        const statusValue = OfferStatus[key as keyof typeof OfferStatus];
        return {
            name: statusValue,
            count: statusCounts[statusValue] || 0
        }
    });

    return {
      acceptedCount: acceptedOffers.length,
      totalRevenue,
      pendingCount,
      chartData
    };
  }, [offers]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Ricavi (Ordini Accettati)</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">
            € {metrics.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Offerte Accettate</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{metrics.acceptedCount}</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">In Attesa / Bozza</p>
          <p className="text-3xl font-bold text-amber-500 mt-2">{metrics.pendingCount}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Stato delle Offerte</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={metrics.chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip 
                cursor={{fill: '#f1f5f9'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={50} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;