import React from 'react';

const ListSkeleton = ({ items = 3 }) => {
  return (
    <div className="space-y-4 animate-pulse w-full">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="border border-slate-100 dark:border-slate-700/50 rounded-xl p-4 flex justify-between items-start bg-slate-50 dark:bg-slate-800/30">
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-slate-200 dark:bg-slate-700/50 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700/30 rounded w-3/4"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700/30 rounded w-1/3 mt-4"></div>
          </div>
          <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
        </div>
      ))}
    </div>
  );
};

export default ListSkeleton;
