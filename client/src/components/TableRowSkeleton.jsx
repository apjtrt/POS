import React from 'react';

const TableRowSkeleton = ({ rows = 5, columns = 5 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse border-b border-slate-100 dark:border-slate-700/30">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
              <div className={`h-4 bg-slate-200 dark:bg-slate-700/50 rounded ${colIndex === 0 ? 'w-1/2' : 'w-3/4'}`}></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default TableRowSkeleton;
