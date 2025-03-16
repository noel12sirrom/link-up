'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/config';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc,
  increment,
  serverTimestamp 
} from 'firebase/firestore';
import type { PostInterest } from '@/types/types';

interface InterestedButtonProps {
  postId: string;
  postUserId: string;
  maxPeople: number;
  currentInterested: number;
}

export default function InterestedButton({ 
  postId, 
  postUserId, 
  maxPeople, 
  currentInterested 
}: InterestedButtonProps) {
  const { user } = useAuth();
  const [isInterested, setIsInterested] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    if (user) {
      checkIfInterested();
    }
    setIsFull(currentInterested >= maxPeople);
  }, [user, postId, currentInterested, maxPeople]);

  const checkIfInterested = async () => {
    if (!user) return;

    const q = query(
      collection(db, 'postInterests'),
      where('postId', '==', postId),
      where('userId', '==', user.uid)
    );

    const querySnapshot = await getDocs(q);
    setIsInterested(!querySnapshot.empty);
  };

  const handleInterested = async () => {
    if (!user || isLoading || isFull) return;
    setIsLoading(true);

    try {
      // Add interest record
      await addDoc(collection(db, 'postInterests'), {
        postId,
        userId: user.uid,
        userName: user.email?.split('@')[0] || 'Anonymous',
        timestamp: serverTimestamp(),
      });

      // Update post's interested count
      await updateDoc(doc(db, 'locationPosts', postId), {
        currentInterested: increment(1)
      });

      setIsInterested(true);
    } catch (error) {
      console.error('Error marking as interested:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.uid === postUserId) {
    return null; // Don't show button on own posts
  }

  if (isInterested) {
    return (
      <button
        disabled
        className="mt-4 px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium"
      >
        You're Interested!
      </button>
    );
  }

  return (
    <button
      onClick={handleInterested}
      disabled={isLoading || isFull}
      className={`mt-4 px-4 py-2 rounded-md text-sm font-medium ${
        isFull
          ? 'bg-gray-100 text-gray-500'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {isFull 
        ? 'Group Full' 
        : isLoading 
          ? 'Processing...' 
          : `Interested (${currentInterested}/${maxPeople})`}
    </button>
  );
} 