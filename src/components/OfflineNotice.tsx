import React from 'react';
export const OfflineNotice: React.FC = () => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-900/80 border border-yellow-700 text-yellow-200 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-sm">
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414" /></svg>
    <span>Offline - some features unavailable</span>
  </div>
);