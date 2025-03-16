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
  getDoc,
  updateDoc,
  increment,
  serverTimestamp 
} from 'firebase/firestore';
import type { LinkUpRequest, UserProfile } from '@/types/types';

interface LinkUpButtonProps {
  postId: string;
  postUserId: string;
  maxPeople: number;
  currentInterested: number;
}

export default function LinkUpButton({ 
  postId, 
  postUserId,
  maxPeople,
  currentInterested
}: LinkUpButtonProps) {
  const { user } = useAuth();
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'accepted' | 'declined'>('none');
  const [contactInfo, setContactInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    if (user) {
      checkExistingRequest();
    }
    setIsFull(currentInterested >= maxPeople);
  }, [user, postId, currentInterested, maxPeople]);

  const checkExistingRequest = async () => {
    if (!user) return;

    const q = query(
      collection(db, 'linkUpRequests'),
      where('postId', '==', postId),
      where('fromUserId', '==', user.uid)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const request = querySnapshot.docs[0].data() as LinkUpRequest;
      const prevStatus = requestStatus;
      setRequestStatus(request.status);

      // If the request was just accepted, update the counter and fetch contact info
      if (prevStatus !== 'accepted' && request.status === 'accepted') {
        // Update post's interested count
        await updateDoc(doc(db, 'locationPosts', postId), {
          currentInterested: increment(1)
        });

        // Fetch contact info
        const userProfileDoc = await getDoc(doc(db, 'userProfiles', postUserId));
        if (userProfileDoc.exists()) {
          const profile = userProfileDoc.data() as UserProfile;
          setContactInfo(`${profile.contactType}: ${profile.contactInfo}`);
        }
      }
    }
  };

  const handleLinkUp = async () => {
    if (!user || isLoading || isFull) return;
    setIsLoading(true);

    try {
      // Create the link up request
      await addDoc(collection(db, 'linkUpRequests'), {
        fromUserId: user.uid,
        toUserId: postUserId,
        postId,
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      setRequestStatus('pending');
    } catch (error) {
      console.error('Error sending Link Up request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.uid === postUserId) {
    return null; // Don't show button on own posts
  }

  if (requestStatus === 'accepted' && contactInfo) {
    return (
      <div className="mt-4 p-3 bg-green-50 rounded-md">
        <p className="text-green-700 text-sm">
          Linked Up! Contact info: {contactInfo}
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={handleLinkUp}
      disabled={isLoading || requestStatus !== 'none' || isFull}
      className={`mt-4 px-4 py-2 rounded-md text-sm font-medium ${
        requestStatus === 'pending'
          ? 'bg-yellow-100 text-yellow-800'
          : requestStatus === 'declined'
          ? 'bg-red-100 text-red-800'
          : isFull
          ? 'bg-gray-100 text-gray-500'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {requestStatus === 'pending'
        ? 'Request Pending'
        : requestStatus === 'declined'
        ? 'Request Declined'
        : isFull
        ? 'Group Full'
        : 'Link Up'}
    </button>
  );
} 