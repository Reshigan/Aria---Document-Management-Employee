'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to login page
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#1a2332] to-[#2c3e50] flex items-center justify-center shadow-xl">
            <span className="text-4xl font-bold text-white">A</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[#003d82] mb-4">ARIA Document Management</h1>
        <Spin size="large" />
        <p className="text-gray-600 mt-4">Redirecting to login...</p>
      </div>
    </div>
  );
}