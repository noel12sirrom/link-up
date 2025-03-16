'use client';

import React, { useState } from 'react';
import LocationSearch from '@/components/LocationSearch';
import LocationPosts from '@/components/LocationPosts';
import Auth from '@/components/Auth';
import ProfileSetup from '@/components/ProfileSetup';
import NotificationBell from '@/components/NotificationBell';
import LinkUpRequests from '@/components/LinkUpRequests';
import RecommendedPosts from '@/components/RecommendedPosts';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, logOut } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const handleSearch = (location: string) => {
    setSelectedLocation(location);
  };

  if (!user) {
    return <Auth />;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Link Up</h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <a
              href="/profile"
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Profile
            </a>
            <button
              onClick={() => logOut()}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
            >
              Log Out
            </button>
          </div>
        </div>

        {showProfile ? (
          <ProfileSetup />
        ) : (
          <>
            <p className="text-center text-gray-600 mb-8">
              Find people with similar interests at your favorite places
            </p>
            <LinkUpRequests />
            <LocationSearch onLocationSelect={setSelectedLocation} />
            {selectedLocation ? (
              <LocationPosts location={selectedLocation} />
            ) : (
              <RecommendedPosts />
            )}
          </>
        )}
      </div>
    </main>
  );
} 