'use client';

import { useState } from 'react';
import { doc, setDoc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { FaStar } from 'react-icons/fa';

interface RateUserProps {
  toUserId: string;
  postId: string;
  onClose: () => void;
}

export default function RateUser({ toUserId, postId, onClose }: RateUserProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      setError('');

      // Check if user has already rated this post
      const ratingRef = doc(db, 'ratings', `${postId}_${user.uid}`);
      const ratingDoc = await getDoc(ratingRef);
      
      if (ratingDoc.exists()) {
        setError('You have already rated this user for this event');
        return;
      }

      // Create the rating document
      await setDoc(ratingRef, {
        fromUserId: user.uid,
        fromUserName: isAnonymous ? 'Anonymous' : user.displayName || 'Unknown User',
        toUserId,
        postId,
        rating,
        comment,
        isAnonymous,
        createdAt: new Date().toISOString(),
      });

      // Update user's average rating
      const userRef = doc(db, 'users', toUserId);
      await updateDoc(userRef, {
        totalRatings: increment(1),
        totalRatingSum: increment(rating),
      });

      onClose();
    } catch (err) {
      setError('Failed to submit rating. Please try again.');
      console.error('Error submitting rating:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Rate User</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="text-2xl focus:outline-none"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
              >
                <FaStar 
                  className={`${
                    star <= (hover || rating) 
                      ? 'text-yellow-400' 
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Leave a comment (optional)"
            className="w-full p-2 border rounded-lg resize-none h-32"
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="anonymous">Rate anonymously</label>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!rating || isSubmitting}
              className={`px-4 py-2 rounded-lg ${
                !rating || isSubmitting
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 