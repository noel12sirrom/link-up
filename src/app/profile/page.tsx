'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import UserEvents from '@/components/UserEvents';
import ProfileSetup from '@/components/ProfileSetup';
import UserRatings from '@/components/UserRatings';
import Link from 'next/link';

interface UserProfile {
  userId: string;
  displayName: string;
  contactInfo: string;
  interests: string[];
  totalRatings?: number;
  totalRatingSum?: number;
  age?: number;
  location?: string;
  gender?: string;
  occupation?: string;
  bio?: string;
  languages?: string[];
  contactType?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'ratings' | 'events'>('info');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const userDoc = await getDocs(query(collection(db, 'users'), where('userId', '==', user.uid)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data() as UserProfile;
          setProfile(userData);
          
          // Calculate average rating
          if (userData.totalRatings && userData.totalRatingSum) {
            setAverageRating(userData.totalRatingSum / userData.totalRatings);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, isEditing]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Please sign in to view your profile</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              ← Back to Home
            </Link>
          </div>

          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold">
                  {profile?.displayName || user.email?.split('@')[0] || 'User'}
                </h1>
                {averageRating !== null && (
                  <p className="text-gray-600">
                    Rating: {averageRating.toFixed(1)} ★ ({profile?.totalRatings} reviews)
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit Profile
              </button>
            </div>

            {/* Interests */}
            {profile?.interests && profile.interests.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Interests</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'info'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Profile Info
                </button>
                <button
                  onClick={() => setActiveTab('ratings')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'ratings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Ratings
                </button>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 ${
                    activeTab === 'events'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Events
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Age</p>
                        <p className="text-gray-900">{profile?.age || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="text-gray-900">{profile?.location || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Gender</p>
                        <p className="text-gray-900">
                          {profile?.gender === 'prefer_not_to_say' 
                            ? 'Prefer not to say'
                            : (profile?.gender && profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)) || 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Occupation</p>
                        <p className="text-gray-900">{profile?.occupation || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {profile?.bio && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">About Me</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
                    </div>
                  )}

                  {/* Languages */}
                  {profile?.languages && profile.languages.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Languages</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.languages.map((language, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interests */}
                  {profile?.interests && profile.interests.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Contact Type</p>
                        <p className="text-gray-900">
                          {profile?.contactType 
                            ? profile.contactType.charAt(0).toUpperCase() + profile.contactType.slice(1)
                            : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Contact Details</p>
                        <p className="text-gray-900">{profile?.contactInfo || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'ratings' && (
                <UserRatings
                  userId={user.uid}
                  averageRating={averageRating || 0}
                  totalRatings={profile?.totalRatings || 0}
                />
              )}
              {activeTab === 'events' && <UserEvents />}
            </div>
          </div>

          {/* Edit Profile Modal */}
          {isEditing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Edit Profile</h2>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </div>
                  <ProfileSetup onComplete={() => setIsEditing(false)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 