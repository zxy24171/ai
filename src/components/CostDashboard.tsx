import React from 'react';
import type { CostMetrics } from '../types';
interface Props { costMetrics: CostMetrics; }
export const CostDashboard: React.FC<Props> = ({ costMetrics }) => (
  <div className="bg-gray-800/50 rounded-xl p-3 space-y-2">
    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Usage</h4>
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-gray-900/50 rounded-lg p-2 text-center"><p className="text-lg font-semibold text-blue-400">{costMetrics.requestCount}</p><p className="text-[10px] text-gray-500">Requests</p></div>
      <div className="bg-gray-900/50 rounded-lg p-2 text-center"><p className="text-lg font-semibold text-green-400">{costMetrics.totalTokens > 1000 ? (costMetrics.totalTokens / 1000).toFixed(1) + 'K' : costMetrics.totalTokens}</p><p className="text-[10px] text-gray-500">Tokens</p></div>
      <div className="bg-gray-900/50 rounded-lg p-2 text-center"><p className="text-lg font-semibold text-yellow-400">{costMetrics.estimatedCost < 0.01 ? '<$0.01' : '$' + costMetrics.estimatedCost.toFixed(2)}</p><p className="text-[10px] text-gray-500">Cost</p></div>
    </div>
  </div>
);
