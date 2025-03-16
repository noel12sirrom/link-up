import { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface UserRatingBadgeProps {
  userId: string;
  className?: string;
}

export default function UserRatingBadge({ userId, className = '' }: UserRatingBadgeProps) {
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState<number>(0);

  useEffect(() => {
    const fetchRating = async () => {
      try {
        const userDoc = await getDocs(query(collection(db, 'users'), where('userId', '==', userId)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          if (userData.totalRatings && userData.totalRatingSum) {
            setAverageRating(userData.totalRatingSum / userData.totalRatings);
            setTotalRatings(userData.totalRatings);
          }
        }
      } catch (error) {
        console.error('Error fetching user rating:', error);
      }
    };

    fetchRating();
  }, [userId]);

  if (averageRating === null) return null;

  const renderStars = (rating: number) => {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-yellow-500">{renderStars(averageRating)}</span>
      <span className="text-sm text-gray-600">
        ({totalRatings})
      </span>
    </div>
  );
} 