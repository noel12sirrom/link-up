'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/config';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  increment,
} from 'firebase/firestore';
import type { LinkUpRequest, UserProfile } from '@/types/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { BsBell, BsBellFill, BsCheckCircleFill, BsXCircleFill, BsPerson } from 'react-icons/bs';
import { useClickAway } from 'react-use';
import UserRatingBadge from './UserRatingBadge';

export default function NotificationBell() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<(LinkUpRequest & { fromUserName: string; eventDetails?: any })[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useClickAway(ref, () => {
    setIsOpen(false);
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'linkUpRequests'),
      where('toUserId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newRequests = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data() as LinkUpRequest;
          
          // Get requester's profile
          const userDoc = await getDoc(doc(db, 'userProfiles', data.fromUserId));
          const userData = userDoc.data() as UserProfile | undefined;
          
          // Get event details
          const eventDoc = await getDoc(doc(db, 'locationPosts', data.postId));
          const eventData = eventDoc.exists() ? eventDoc.data() : null;
          
          return {
            ...data,
            id: docSnapshot.id,
            fromUserName: userData?.displayName || 'Unknown User',
            eventDetails: eventData
          };
        })
      );
      
      setRequests(newRequests);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleRequest = async (requestId: string, status: 'accepted' | 'declined') => {
    if (!user) return;

    try {
      // Get the request data first to get the postId
      const requestDoc = await getDoc(doc(db, 'linkUpRequests', requestId));
      const requestData = requestDoc.data();
      
      // Update request status
      await updateDoc(doc(db, 'linkUpRequests', requestId), {
        status
      });

      // If request is accepted, increment the currentInterested count
      if (status === 'accepted' && requestData) {
        const postRef = doc(db, 'locationPosts', requestData.postId);
        await updateDoc(postRef, {
          currentInterested: increment(1)
        });
      }
      
      toast.success(
        status === 'accepted' 
          ? '🤝 Request accepted! You can now see their contact info.' 
          : '❌ Request declined'
      );
      
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request. Please try again.');
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        {requests.length > 0 ? <BsBellFill className="text-xl" /> : <BsBell className="text-xl" />}
        {requests.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {requests.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && requests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 z-50"
          >
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">
                Link Up Requests ({requests.length})
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {requests.map((request) => (
                <motion.div
                  key={request.id}
                  layout
                  className="p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <BsPerson className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {request.fromUserName}
                        </p>
                        <UserRatingBadge userId={request.fromUserId} className="ml-1" />
                      </div>
                      {request.eventDetails && (
                        <>
                          <p className="text-xs text-gray-600 truncate">
                            {request.eventDetails.placeName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(request.eventDetails.meetupDateTime).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleRequest(request.id!, 'accepted')}
                        className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors"
                        title="Accept Request"
                      >
                        <BsCheckCircleFill className="text-lg" />
                      </button>
                      <button
                        onClick={() => handleRequest(request.id!, 'declined')}
                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                        title="Decline Request"
                      >
                        <BsXCircleFill className="text-lg" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 