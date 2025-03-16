'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  where, 
  orderBy, 
  Query,
  DocumentData 
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { LocationPost } from '@/types/types';

export function useRealtimeLocation(location: string | null) {
  const [posts, setPosts] = useState<LocationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Create a query for the specific location, ordered by timestamp
    const q = query(
      collection(db, 'locationPosts'),
      where('location', '==', location),
      orderBy('timestamp', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newPosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        })) as LocationPost[];
        
        setPosts(newPosts);
        setLoading(false);
      },
      (err) => {
        console.error('Error in real-time listener:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [location]);

  return { posts, loading, error };
} 