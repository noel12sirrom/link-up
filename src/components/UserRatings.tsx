'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRating } from '@/types/types';

interface UserRatingsProps {
  userId: string;
  averageRating?: number;
  totalRatings?: number;
}

export default function UserRatings({ userId, averageRating = 0, totalRatings = 0 }: UserRatingsProps) {
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isOwnProfile = user?.uid === userId;

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        setError(null);
        const ratingsQuery = query(
          collection(db, 'userRatings'),
          where('toUserId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(ratingsQuery);
        const ratingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserRating[];
        setRatings(ratingsData);
      } catch (error: any) {
        console.error('Error fetching ratings:', error);
        if (error.message?.includes('requires an index')) {
          setError('Setting up the database... This may take a few minutes. Please refresh the page shortly.');
        } else {
          setError('Error loading ratings. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [userId]);

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <p className="text-yellow-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Rating */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{renderStars(Math.round(averageRating))}</span>
          <span className="text-lg font-medium">{averageRating.toFixed(1)}</span>
        </div>
        <p className="text-sm text-gray-600">
          Based on {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
        </p>
      </div>

      {/* Individual Ratings */}
      {!isOwnProfile && (
        <div className="space-y-4">
          {ratings.map((rating) => (
            <div key={rating.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{renderStars(rating.rating)}</span>
                <span className="text-sm text-gray-500">
                  {new Date(rating.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-700 mb-2">{rating.comment}</p>
              <p className="text-sm text-gray-500">
                {rating.isAnonymous ? 'Anonymous User' : 'Verified User'}
              </p>
            </div>
          ))}

          {ratings.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No ratings yet
            </p>
          )}
        </div>
      )}

      {/* For own profile, just show rating distribution */}
      {isOwnProfile && ratings.length > 0 && (
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratings.filter(r => r.rating === stars).length;
            const percentage = (count / ratings.length) * 100;
            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="w-12 text-sm text-gray-600">{stars} stars</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-12 text-sm text-gray-600">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 