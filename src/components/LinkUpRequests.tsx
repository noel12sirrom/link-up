'use client';

import { useState, useEffect } from 'react';
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
  DocumentData,
  increment
} from 'firebase/firestore';
import type { LinkUpRequest, UserProfile } from '@/types/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { BsCheckCircleFill, BsXCircleFill, BsClock, BsPerson } from 'react-icons/bs';

export default function LinkUpRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<(LinkUpRequest & { fromUserName: string; eventDetails?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || !mounted) return;

    // Listen for real-time updates to requests
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
  }, [user, mounted]);

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

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg mb-6 border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BsClock className="text-blue-500" />
        Pending Link Up Requests
      </h3>
      <AnimatePresence>
        <div className="space-y-4">
          {requests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <BsPerson className="text-blue-500 text-xl" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{request.fromUserName}</h4>
                      {request.eventDetails && (
                        <p className="text-sm text-gray-600">
                          For: {request.eventDetails.placeName}
                        </p>
                      )}
                    </div>
                  </div>
                  {request.eventDetails && (
                    <div className="ml-13 pl-10">
                      <p className="text-sm text-gray-500">
                        {new Date(request.eventDetails.meetupDateTime).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequest(request.id!, 'accepted')}
                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors"
                    title="Accept Request"
                  >
                    <BsCheckCircleFill className="text-xl" />
                  </button>
                  <button
                    onClick={() => handleRequest(request.id!, 'declined')}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                    title="Decline Request"
                  >
                    <BsXCircleFill className="text-xl" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
} 