import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingScreen = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col h-screen items-center justify-center bg-slate-900 text-white relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Glowing Spinner */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-4 rounded-full blur-lg bg-blue-500/30 animate-pulse"></div>
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
        </div>
        
        {/* Text */}
        <p className="mt-8 text-slate-300 font-medium tracking-[0.2em] uppercase text-sm animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
