'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import type { LocationPost } from '@/types/types';
import LinkUpButton from './LinkUpButton';

// Popular interests for non-logged in users
const POPULAR_INTERESTS = ['Sports', 'Music', 'Food', 'Movies', 'Gaming'];

export default function RecommendedPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<LocationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserInterests = async () => {
      if (!user) {
        setUserInterests(POPULAR_INTERESTS);
        return;
      }

      try {
        const userDoc = await getDocs(query(collection(db, 'users'), where('userId', '==', user.uid)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          setUserInterests(userData.interests || POPULAR_INTERESTS);
        }
      } catch (error) {
        console.error('Error fetching user interests:', error);
        setUserInterests(POPULAR_INTERESTS);
      }
    };

    fetchUserInterests();
  }, [user]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const now = new Date();
        
        // Get all posts that haven't happened yet
        const q = query(
          collection(db, 'locationPosts'),
          where('meetupDateTime', '>', now.toISOString()),
          orderBy('meetupDateTime', 'asc'),
          limit(50)
        );
        
        const querySnapshot = await getDocs(q);
        let fetchedPosts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate()
        })) as LocationPost[];

        // Sort posts by matching interests
        fetchedPosts = fetchedPosts.sort((a, b) => {
          const aMatches = a.userInterests.filter(interest => 
            userInterests.includes(interest)
          ).length;
          const bMatches = b.userInterests.filter(interest => 
            userInterests.includes(interest)
          ).length;
          return bMatches - aMatches;
        });

        // Only show posts with at least one matching interest
        fetchedPosts = fetchedPosts.filter(post => 
          post.userInterests.some(interest => userInterests.includes(interest))
        );

        setPosts(fetchedPosts);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userInterests.length > 0) {
      fetchPosts();
    }
  }, [userInterests]);

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

  if (!posts.length) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-8 p-4 text-center text-gray-500">
        No upcoming events match your interests. Try searching for a specific location!
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <h2 className="text-xl font-semibold mb-4">
        {user ? 'Recommended Events' : 'Popular Events'}
      </h2>
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{post.userName}</h3>
                <p className="text-sm text-gray-500">
                  Posted {post.timestamp.toLocaleString()}
                </p>
              </div>
              <div className="text-sm font-medium">
                <span className={`px-3 py-1 rounded-full ${
                  post.currentInterested >= post.maxPeople
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {post.currentInterested}/{post.maxPeople} joined
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium">{post.placeName}</h4>
              <p className="text-sm text-gray-600">
                Meeting at: {formatDateTime(post.meetupDateTime)}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Interests:</h4>
              <div className="flex flex-wrap gap-2">
                {post.userInterests.map((interest, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 text-sm rounded-full ${
                      userInterests.includes(interest)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <LinkUpButton 
                postId={post.id!} 
                postUserId={post.userId}
                maxPeople={post.maxPeople}
                currentInterested={post.currentInterested}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 