import React from 'react';

const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse w-full">
      {/* Title Skeleton */}
      <div className="h-8 bg-slate-200 dark:bg-slate-800/80 rounded-md w-64 mb-6"></div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="saas-card/50 p-6 rounded-xl border border-slate-200/50 dark:border-slate-700/50/50 h-[104px] flex items-center">
            <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700/50 mr-4"></div>
            <div className="flex-1 space-y-3">
              <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-3/4"></div>
              <div className="h-5 bg-slate-200 dark:bg-slate-700/50 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="saas-card/50 p-6 rounded-xl border border-slate-200/50 dark:border-slate-700/50/50 h-96 flex flex-col">
            <div className="h-5 bg-slate-200 dark:bg-slate-700/50 rounded w-1/3 mb-6"></div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-700/30 rounded-lg"></div>
          </div>
        ))}
      </div>
      
      {/* Table Skeleton */}
      <div className="saas-card/50 p-6 rounded-xl border border-slate-200/50 dark:border-slate-700/50/50 h-64 flex flex-col">
         <div className="h-5 bg-slate-200 dark:bg-slate-700/50 rounded w-48 mb-6"></div>
         <div className="space-y-4">
           {[1, 2, 3, 4].map(i => (
             <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700/30 rounded-md w-full"></div>
           ))}
         </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
