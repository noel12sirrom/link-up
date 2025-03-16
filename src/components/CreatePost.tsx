'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import type { UserProfile } from '@/types/types';

interface CreatePostProps {
  onSuccess?: () => void;
  placeName: string;
}

interface Location {
  lat: number;
  lng: number;
}

interface ValidationStatus {
  isValid: boolean;
  message: string;
}

interface PlaceResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function CreatePost({ onSuccess, placeName: initialPlaceName }: CreatePostProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialPlaceName || '');
  const [predictions, setPredictions] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [meetupDateTime, setMeetupDateTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus[]>([]);
  const [description, setDescription] = useState('');

  // Fetch user profile when component mounts
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      try {
        const profileDoc = await getDoc(doc(db, 'userProfiles', user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data() as UserProfile);
        } else {
          toast.error('Please set up your profile with interests first');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load your profile');
      }
    };
    fetchUserProfile();
  }, [user]);

  // Handle place search
  const handleSearch = async (input: string) => {
    setSearchQuery(input);
    
    if (!input.trim()) {
      setPredictions([]);
      setLocation(null);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&countrycodes=us,jm&limit=5`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'Link-Up App (https://github.com/your-repo/link-up)'
          },
          mode: 'cors',
          cache: 'no-cache'
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPredictions(data);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      toast.error('Failed to search for locations. Please try again.');
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce the search
  const debouncedSearch = async (input: string) => {
    setSearchQuery(input);
    if (!input.trim()) {
      setPredictions([]);
      return;
    }
    
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }

    window.searchTimeout = setTimeout(() => {
      handleSearch(input);
    }, 1000);
  };

  const handleSelectPlace = (place: PlaceResult) => {
    setSearchQuery(place.display_name.split(',')[0]);
    setLocation({
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon)
    });
    setPredictions([]);
  };

  // Update validation status whenever relevant fields change
  useEffect(() => {
    const newValidationStatus: ValidationStatus[] = [];

    // Profile validation
    if (!userProfile) {
      newValidationStatus.push({
        isValid: false,
        message: 'Loading your profile...'
      });
    } else if (!userProfile.interests || userProfile.interests.length === 0) {
      newValidationStatus.push({
        isValid: false,
        message: '⚠️ Please add interests in your profile settings before creating a post'
      });
    }

    // Place validation
    if (!searchQuery.trim()) {
      newValidationStatus.push({
        isValid: false,
        message: '📍 Please select a place for your event'
      });
    } else if (!location) {
      newValidationStatus.push({
        isValid: false,
        message: '📍 Please select a place from the suggestions'
      });
    }

    // Date/Time validation
    if (!meetupDateTime) {
      newValidationStatus.push({
        isValid: false,
        message: '⏰ Select when you want to meet'
      });
    } else {
      const selectedDate = new Date(meetupDateTime);
      if (selectedDate < new Date()) {
        newValidationStatus.push({
          isValid: false,
          message: '⚠️ The selected date and time is in the past'
        });
      }
    }

    setValidationStatus(newValidationStatus);
  }, [userProfile, meetupDateTime, location, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('👤 Please sign in to create a post');
      return;
    }

    if (!location) {
      toast.error('📍 Please select a place from the suggestions');
      return;
    }

    if (!meetupDateTime) {
      toast.error('⏰ Please select when you want to meet');
      return;
    }

    if (!userProfile || !userProfile.interests || userProfile.interests.length === 0) {
      toast.error('⚠️ Please set up your profile with interests first');
      return;
    }

    const selectedDate = new Date(meetupDateTime);
    if (selectedDate < new Date()) {
      toast.error('⚠️ Cannot create an event in the past');
      return;
    }

    setIsSubmitting(true);

    try {
      const postData = {
        userId: user.uid,
        userName: userProfile.displayName || user.email?.split('@')[0] || 'Anonymous',
        placeName: searchQuery,
        location: searchQuery, // This is what the location search uses to filter
        meetupDateTime,
        interests: userProfile.interests,
        maxPeople: maxParticipants || 2,
        currentInterested: 1,
        userInterests: userProfile.interests,
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
        status: 'active',
        acceptedRequests: [],
        description
      };

      await addDoc(collection(db, 'locationPosts'), postData);
      toast.success('🎉 Post created successfully!');
      if (onSuccess) {
        onSuccess();
      }
      router.refresh();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('❌ Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const minDateTime = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Validation Messages */}
      {validationStatus.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
          <h3 className="font-medium text-gray-700">Before you can create a post:</h3>
          {validationStatus.map((status, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 text-sm ${
                status.isValid ? 'text-green-600' : 'text-gray-600'
              }`}
            >
              {status.isValid ? (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-5 h-5 flex items-center justify-center">•</div>
              )}
              {status.message}
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Where do you want to meet?*
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => debouncedSearch(e.target.value)}
            placeholder="Search for a place (e.g., Central Park, LA Fitness)"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
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
                    type="button"
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

      {/* Date and Time Selection */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          When do you want to meet?*
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="meetupDate" className="block text-sm text-gray-600 mb-1">
              Date
            </label>
            <input
              type="date"
              id="meetupDate"
              min={format(new Date(), "yyyy-MM-dd")}
              value={meetupDateTime.split('T')[0]}
              onChange={(e) => {
                const time = meetupDateTime.split('T')[1] || '12:00';
                setMeetupDateTime(`${e.target.value}T${time}`);
              }}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            />
          </div>
          <div>
            <label htmlFor="meetupTime" className="block text-sm text-gray-600 mb-1">
              Time
            </label>
            <input
              type="time"
              id="meetupTime"
              value={meetupDateTime.split('T')[1] || ''}
              onChange={(e) => {
                const date = meetupDateTime.split('T')[0] || format(new Date(), "yyyy-MM-dd");
                setMeetupDateTime(`${date}T${e.target.value}`);
              }}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            />
          </div>
        </div>
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Add some details about your event
          <span className="text-gray-500 font-normal"> (optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Example: It's my birthday! 🎉 Let's celebrate together! Or: Bringing board games, anyone interested in joining?"
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y"
          maxLength={500}
        />
        <p className="text-sm text-gray-500 mt-1">
          {description.length}/500 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Interests
        </label>
        <div className="flex flex-wrap gap-2">
          {userProfile?.interests?.map((interest, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full"
            >
              {interest}
            </span>
          ))}
        </div>
        {(!userProfile?.interests || userProfile.interests.length === 0) && (
          <p className="text-sm text-red-500 mt-1">
            Please add interests in your profile settings first
          </p>
        )}
      </div>

      <div>
        <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700 mb-2">
          Maximum Participants
          <span className="text-gray-500 font-normal"> (optional)</span>
        </label>
        <select
          id="maxParticipants"
          value={maxParticipants || ''}
          onChange={(e) => setMaxParticipants(e.target.value ? Number(e.target.value) : null)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">No limit</option>
          {[2, 3, 4, 5, 6].map((num) => (
            <option key={num} value={num}>
              {num} people
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-1">
          Leave empty if you're flexible with the group size
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors ${
          isSubmitting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Creating...
          </div>
        ) : (
          'Create Link Up Event'
        )}
      </button>
    </form>
  );
} 