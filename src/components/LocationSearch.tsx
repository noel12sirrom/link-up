'use client';

import React, { useState } from 'react';
import CreatePost from './CreatePost';

declare global {
  interface Window {
    searchTimeout: NodeJS.Timeout | undefined;
  }
}

interface LocationSearchProps {
  onLocationSelect: (location: string | null) => void;
}

interface PlaceResult {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
}

export default function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [predictions, setPredictions] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (input: string) => {
    setSearchQuery(input);
    
    if (!input.trim()) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Using Nominatim API with a 1-second delay to respect rate limits
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&countrycodes=us,jm&limit=5`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
          }
        }
      );
      const data = await response.json();
      setPredictions(data);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce the search to respect Nominatim's usage policy
  const debouncedSearch = async (input: string) => {
    setSearchQuery(input);
    if (!input.trim()) {
      setPredictions([]);
      return;
    }
    
    // Clear existing timeout
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }

    // Set new timeout
    window.searchTimeout = setTimeout(() => {
      handleSearch(input);
    }, 1000); // 1 second delay
  };

  const handleSelectPlace = (place: PlaceResult) => {
    const placeName = place.display_name.split(',')[0]; // Get the first part of the address
    setSearchQuery(placeName);
    setPredictions([]);
    onLocationSelect(placeName);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      onLocationSelect(searchQuery.trim());
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => debouncedSearch(e.target.value)}
                placeholder="Search for a place (e.g., Central Park, LA Fitness)"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowCreatePost(true)}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create
            </button>
          </div>

          {predictions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[300px] overflow-y-auto divide-y divide-gray-100">
              {predictions.map((place, index) => {
                const mainText = place.display_name.split(',')[0];
                const secondaryText = place.display_name.split(',').slice(1).join(',').trim();
                const country = place.display_name.split(',').pop()?.trim();
                const isJamaica = country?.toLowerCase().includes('jamaica');

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectPlace(place)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 focus:outline-none focus:bg-blue-50 transition-colors duration-150"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{mainText}</div>
                        <div className="text-sm text-gray-600 mt-0.5 line-clamp-2">{secondaryText}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isJamaica 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isJamaica ? '🇯🇲 Jamaica' : '🇺🇸 United States'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {place.lat.slice(0, 6)}°, {place.lon.slice(0, 6)}°
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create Link Up Event</h2>
              <button
                onClick={() => setShowCreatePost(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <CreatePost 
              onSuccess={() => setShowCreatePost(false)} 
              placeName={searchQuery}
            />
          </div>
        </div>
      )}
    </div>
  );
} 