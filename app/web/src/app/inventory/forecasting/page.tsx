'use client';

import { useState, useEffect } from 'react';
import { getForecasts, generateForecast, getWarehouses } from '@/services/inventoryService';

export default function ForecastingPage() {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({
    productId: '',
    warehouseId: '',
    period: '',
  });
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateData, setGenerateData] = useState({
    productId: '',
    warehouseId: '',
    period: 'WEEKLY',
    periodDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.productId) params.productId = filters.productId;
      if (filters.warehouseId) params.warehouseId = filters.warehouseId;

      const [forecastsData, warehousesData] = await Promise.all([
        getForecasts(params),
        getWarehouses(true),
      ]);

      let filteredForecasts = forecastsData || [];
      if (filters.period) {
        filteredForecasts = filteredForecasts.filter((f: any) => f.period === filters.period);
      }

      setForecasts(filteredForecasts);
      setWarehouses(warehousesData || []);
    } catch (error) {
      console.error('Error fetching forecasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      await generateForecast({
        productId: generateData.productId,
        warehouseId: generateData.warehouseId || null,
        period: generateData.period,
        periodDate: new Date(generateData.periodDate),
      });
      setShowGenerateModal(false);
      setGenerateData({
        productId: '',
        warehouseId: '',
        period: 'WEEKLY',
        periodDate: new Date().toISOString().split('T')[0],
      });
      fetchData();
      alert('Forecast generated successfully');
    } catch (error) {
      console.error('Error generating forecast:', error);
      alert('Failed to generate forecast');
    } finally {
      setGenerating(false);
    }
  };

  const getPeriodColor = (period: string) => {
    switch (period) {
      case 'WEEKLY':
        return 'bg-blue-100 text-blue-800';
      case 'MONTHLY':
        return 'bg-purple-100 text-purple-800';
      case 'QUARTERLY':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBar = (confidence: number) => {
    const percentage = Math.min(100, Math.max(0, confidence));
    let bgColor = 'bg-green-500';
    if (confidence < 80) bgColor = 'bg-yellow-500';
    if (confidence < 60) bgColor = 'bg-red-500';

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${bgColor} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Demand Forecasting</h1>
            <p className="text-gray-600 mt-2">Predict future inventory demand</p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            + Generate Forecast
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Forecasts</div>
            <div className="text-2xl font-bold text-gray-900">{forecasts.length}</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
            <div className="text-sm text-blue-600">Weekly</div>
            <div className="text-2xl font-bold text-blue-900">
              {forecasts.filter(f => f.period === 'WEEKLY').length}
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4 border border-purple-200">
            <div className="text-sm text-purple-600">Monthly</div>
            <div className="text-2xl font-bold text-purple-900">
              {forecasts.filter(f => f.period === 'MONTHLY').length}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
            <div className="text-sm text-green-600">Quarterly</div>
            <div className="text-2xl font-bold text-green-900">
              {forecasts.filter(f => f.period === 'QUARTERLY').length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product ID
              </label>
              <input
                type="text"
                value={filters.productId}
                onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter product ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warehouse
              </label>
              <select
                value={filters.warehouseId}
                onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period
              </label>
              <select
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Periods</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <button
              onClick={fetchData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFilters({
                  productId: '',
                  warehouseId: '',
                  period: '',
                });
              }}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Forecasts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Predicted Demand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seasonal Factor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : forecasts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No forecasts found. Generate your first forecast to get started.
                  </td>
                </tr>
              ) : (
                forecasts.map((forecast) => (
                  <tr key={forecast.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPeriodColor(forecast.period)}`}>
                          {forecast.period}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(forecast.periodDate).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {forecast.product?.name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        SKU: {forecast.product?.sku || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {forecast.warehouse?.name || 'All Warehouses'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-blue-600">
                        {forecast.predictedDemand}
                      </div>
                      <div className="text-xs text-gray-500">
                        units
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {forecast.seasonalFactor ? `${forecast.seasonalFactor.toFixed(2)}x` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-32">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-sm font-semibold ${getConfidenceColor(forecast.confidenceScore)}`}>
                            {forecast.confidenceScore}%
                          </span>
                        </div>
                        {getConfidenceBar(forecast.confidenceScore)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(forecast.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">About Forecasting</h3>
          <p className="text-sm text-blue-800">
            Forecasts are generated using historical sales data from the past 90 days,
            adjusted for seasonal trends. Confidence scores indicate the reliability of
            predictions based on data consistency. Higher confidence scores (80%+) suggest
            more reliable forecasts.
          </p>
        </div>
      </div>

      {/* Generate Forecast Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Generate Forecast</h2>
            <form onSubmit={handleGenerateForecast} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product ID *
                </label>
                <input
                  type="text"
                  required
                  value={generateData.productId}
                  onChange={(e) => setGenerateData({ ...generateData, productId: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter product ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warehouse (Optional)
                </label>
                <select
                  value={generateData.warehouseId}
                  onChange={(e) => setGenerateData({ ...generateData, warehouseId: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forecast Period *
                </label>
                <select
                  required
                  value={generateData.period}
                  onChange={(e) => setGenerateData({ ...generateData, period: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={generateData.periodDate}
                  onChange={(e) => setGenerateData({ ...generateData, periodDate: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The date when the forecast period begins
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate Forecast'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGenerateModal(false);
                    setGenerateData({
                      productId: '',
                      warehouseId: '',
                      period: 'WEEKLY',
                      periodDate: new Date().toISOString().split('T')[0],
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
