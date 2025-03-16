'use client';

import { useRealtimeLocation } from '@/hooks/useRealtime';
import { useAuth } from '@/contexts/AuthContext';
import LinkUpButton from './LinkUpButton';
import { db } from '@/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import RateUser from './RateUser';

interface LocationPost {
  id?: string;
  userId: string;
  userName: string;
  placeName: string;
  meetupDateTime: string;
  userInterests: string[];
  maxPeople: number;
  description?: string;
  currentInterested: number;
  location: string;
  timestamp: Date;
}

interface LocationPostsProps {
  location: string | null;
}

export default function LocationPosts({ location }: LocationPostsProps) {
  const { posts, loading, error } = useRealtimeLocation(location);
  const { user } = useAuth();
  const [selectedUserToRate, setSelectedUserToRate] = useState<{userId: string, postId: string} | null>(null);

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const isEventPast = (dateTime: string) => {
    return new Date(dateTime) < new Date();
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-gray-100 rounded-lg p-4 h-32"/>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-8 p-4 bg-red-50 text-red-600 rounded-lg">
        Error loading posts: {error}
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-8 p-4 text-center text-gray-500">
        No one has posted about this location yet. Be the first!
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="bg-white shadow rounded-lg p-6 relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">{post.userName}</h3>
              <p className="text-sm text-gray-500">
                Meeting at: {formatDateTime(post.meetupDateTime)}
              </p>
            </div>
            <div className={`px-2 py-1 rounded-full text-sm ${
              post.maxPeople === -1 ? 'bg-blue-100 text-blue-800' :
              post.currentInterested >= post.maxPeople ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {post.currentInterested}/{post.maxPeople === -1 ? '∞' : post.maxPeople} joined
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-md font-medium">{post.placeName}</h4>
            {post.description && (
              <p className="text-sm text-gray-600 mt-2">{post.description}</p>
            )}
          </div>
          
          {post.userInterests && post.userInterests.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Interests:</h4>
              <div className="flex flex-wrap gap-2">
                {post.userInterests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div>
              {user?.uid === post.userId && (
                <button
                  className="text-sm text-red-600 hover:text-red-800"
                  onClick={() => {/* Add delete functionality later */}}
                >
                  Delete
                </button>
              )}
              {user && post.id && isEventPast(post.meetupDateTime) && user.uid !== post.userId && (
                <button
                  onClick={() => setSelectedUserToRate({ userId: post.userId, postId: post.id! })}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Rate this user
                </button>
              )}
            </div>
            <LinkUpButton 
              postId={post.id!} 
              postUserId={post.userId}
              maxPeople={post.maxPeople}
              currentInterested={post.currentInterested}
            />
          </div>
        </div>
      ))}

      {selectedUserToRate && (
        <RateUser
          toUserId={selectedUserToRate.userId}
          postId={selectedUserToRate.postId}
          onClose={() => setSelectedUserToRate(null)}
        />
      )}
    </div>
  );
} 