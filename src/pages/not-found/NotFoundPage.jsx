import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../../components/common/BrandLogo';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#F4F5F8] flex items-center justify-center p-6 text-center">
      <div className="max-w-md bg-white p-8 rounded-3xl shadow-lg border border-neutral-200/80 flex flex-col items-center gap-4">
        <BrandLogo size="default" showText={true} theme="dark" />
        <span className="text-6xl font-black text-neutral-900 mt-2">404</span>
        <h1 className="text-xl font-bold text-neutral-800">Page Not Found</h1>
        <p className="text-xs text-neutral-500">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/login"
          className="mt-2 w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold transition-all"
        >
          Return to Sign In
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
