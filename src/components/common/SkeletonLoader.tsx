import React from 'react';
import { motion } from 'motion/react';

export const SkeletonMetricCards: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-between shimmer-animated"
        >
          <div className="space-y-2 flex-1 pr-3">
            <div className="h-3 bg-slate-200 rounded-sm w-24" />
            <div className="h-6 bg-slate-200 rounded-sm w-12" />
          </div>
          <div className="w-9 h-9 rounded-md bg-slate-100 shrink-0" />
        </div>
      ))}
    </div>
  );
};

export const SkeletonTableRows: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 bg-slate-50 border border-slate-100 rounded-md flex items-center px-4 gap-4 shimmer-animated"
        >
          <div className="w-5 h-5 bg-slate-200 rounded-sm shrink-0" />
          <div className="w-28 h-3.5 bg-slate-200 rounded-sm shrink-0" />
          <div className="flex-1 space-y-1 min-w-0">
            <div className="w-48 h-3 bg-slate-200 rounded-sm" />
            <div className="w-32 h-2.5 bg-slate-100 rounded-sm" />
          </div>
          <div className="w-32 h-3 bg-slate-200 rounded-sm shrink-0" />
          <div className="w-24 h-5 bg-slate-200 rounded-full shrink-0" />
          <div className="w-8 h-8 bg-slate-200 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  );
};

export const SkeletonSessionLoader: React.FC<{ message?: string }> = ({
  message = 'Initializing Educore Portal & Security Context...',
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/80 backdrop-blur-xs p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg max-w-sm w-full space-y-5 text-center relative overflow-hidden"
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1], rotate: [0, -1, 1, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-14 h-14 rounded-xl bg-slate-900 p-2 flex items-center justify-center mx-auto shadow-md border border-slate-800"
        >
          <img
            src="/logo.png"
            alt="Educore Provision Logo"
            className="w-full h-full object-contain"
          />
        </motion.div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-slate-900">Loading Workspace Session</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="bg-blue-600 h-full w-1/2 rounded-full absolute"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default {
  SkeletonMetricCards,
  SkeletonTableRows,
  SkeletonSessionLoader,
};
