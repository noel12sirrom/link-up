'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/config';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc, getDoc, documentId } from 'firebase/firestore';
import RateUser from './RateUser';
import { BsPerson } from 'react-icons/bs';
import UserRatingBadge from './UserRatingBadge';

interface UserProfile {
  displayName?: string;
  contactInfo?: string;
  contactType?: string;
}

interface Event {
  id: string;
  userId: string;
  userName: string;
  placeName: string;
  meetupDateTime: string;
  userInterests?: string[];
  maxPeople: number;
  description?: string;
  currentInterested: number;
  location: string;
}

interface AcceptedParticipant {
  userId: string;
  displayName: string;
  contactInfo: string;
  contactType: string;
}

interface EditEventData {
  id: string;
  meetupDateTime: string;
  maxPeople: number;
  description?: string;
}

export default function UserEvents() {
  const { user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserToRate, setSelectedUserToRate] = useState<{userId: string, postId: string} | null>(null);
  const [editingEvent, setEditingEvent] = useState<EditEventData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [acceptedParticipants, setAcceptedParticipants] = useState<{[eventId: string]: AcceptedParticipant[]}>({});

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const now = new Date();

        // Fetch events created by the user
        const userPostsQuery = query(
          collection(db, 'locationPosts'),
          where('userId', '==', user.uid),
          orderBy('meetupDateTime', 'desc')
        );

        // Fetch events where user's request was accepted
        const acceptedRequestsQuery = query(
          collection(db, 'linkUpRequests'),
          where('toUserId', '==', user.uid),
          where('status', '==', 'accepted')
        );

        const [userPostsSnapshot, acceptedRequestsSnapshot] = await Promise.all([
          getDocs(userPostsQuery),
          getDocs(acceptedRequestsQuery)
        ]);

        // Get all posts from accepted requests
        const acceptedPostIds = acceptedRequestsSnapshot.docs.map(doc => doc.data().postId);
        
        // Initialize allEvents with user's own posts
        let allEvents = userPostsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          userInterests: doc.data().userInterests || []
        })) as Event[];

        // Only fetch accepted posts if there are any
        if (acceptedPostIds.length > 0) {
          const acceptedPostsQuery = query(
            collection(db, 'locationPosts'),
            where(documentId(), 'in', acceptedPostIds)
          );
          const acceptedPostsSnapshot = await getDocs(acceptedPostsQuery);
          
          // Add accepted posts to allEvents, avoiding duplicates
          const newEvents = acceptedPostsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            userInterests: doc.data().userInterests || []
          })) as Event[];

          // Filter out any events that are already in allEvents
          const uniqueNewEvents = newEvents.filter(newEvent => 
            !allEvents.some(existingEvent => existingEvent.id === newEvent.id)
          );
          
          allEvents = [...allEvents, ...uniqueNewEvents];
        }

        // Split into upcoming and past events
        const upcoming: Event[] = [];
        const past: Event[] = [];

        allEvents.forEach(event => {
          if (new Date(event.meetupDateTime) > now) {
            upcoming.push(event);
          } else {
            past.push(event);
          }
        });

        setUpcomingEvents(upcoming);
        setPastEvents(past);

        // Fetch accepted participants for each event
        const participantsMap: {[eventId: string]: AcceptedParticipant[]} = {};
        
        for (const event of upcoming) {
          // Get accepted requests for this event
          const eventRequestsQuery = query(
            collection(db, 'linkUpRequests'),
            where('postId', '==', event.id),
            where('status', '==', 'accepted'),
            where('toUserId', '==', event.userId)
          );
          const eventRequestsSnapshot = await getDocs(eventRequestsQuery);
          
          // Get user profiles for accepted participants
          const participants = await Promise.all(
            eventRequestsSnapshot.docs.map(async (requestDoc) => {
              const requestData = requestDoc.data();
              const userProfileRef = doc(db, 'userProfiles', requestData.fromUserId);
              const userProfileDoc = await getDoc(userProfileRef);
              const userData = userProfileDoc.data() as UserProfile;
              return {
                userId: requestData.fromUserId,
                displayName: userData.displayName || 'Unknown User',
                contactInfo: userData.contactInfo || '',
                contactType: userData.contactType || 'Email'
              };
            })
          );
          
          if (participants.length > 0) {
            participantsMap[event.id] = participants;
          }
        }
        
        setAcceptedParticipants(participantsMap);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user]);

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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      const eventRef = doc(db, 'locationPosts', editingEvent.id);
      await updateDoc(eventRef, {
        meetupDateTime: editingEvent.meetupDateTime,
        maxPeople: editingEvent.maxPeople,
        description: editingEvent.description
      });

      // Update local state
      setUpcomingEvents(events => 
        events.map(event => 
          event.id === editingEvent.id 
            ? { ...event, ...editingEvent }
            : event
        )
      );
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'locationPosts', eventId));
      
      // Update local state
      setUpcomingEvents(events => events.filter(event => event.id !== eventId));
      setEventToDelete(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="bg-gray-100 rounded-lg p-4 h-24"/>
        ))}
      </div>
    );
  }

  const renderEvent = (event: Event) => (
    <div key={event.id} className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{event.placeName}</h3>
          <p className="text-gray-600">
            {new Date(event.meetupDateTime).toLocaleDateString()} at{' '}
            {new Date(event.meetupDateTime).toLocaleTimeString()}
          </p>
          {event.description && (
            <p className="text-gray-600 mt-2">{event.description}</p>
          )}
          {event.maxPeople && (
            <p className="text-gray-600 mt-1">
              Max participants: {event.maxPeople === -1 ? 'Unlimited' : event.maxPeople}
            </p>
          )}
        </div>
        {user?.uid === event.userId && new Date(event.meetupDateTime) > new Date() && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditingEvent({
                id: event.id,
                meetupDateTime: event.meetupDateTime,
                maxPeople: event.maxPeople,
                description: event.description
              })}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
            <button
              onClick={() => setEventToDelete(event.id)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      
      {event.userInterests && event.userInterests.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {event.userInterests.map((interest, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
            >
              {interest}
            </span>
          ))}
        </div>
      )}

      {/* Show accepted participants */}
      {acceptedParticipants[event.id] && acceptedParticipants[event.id].length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Accepted Participants:</h4>
          <div className="space-y-2">
            {acceptedParticipants[event.id].map((participant) => (
              <div key={participant.userId} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <BsPerson className="text-blue-500" />
                  </div>
                  <div>
                    <span className="font-medium text-sm">{participant.displayName}</span>
                    <UserRatingBadge userId={participant.userId} className="mt-1" />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {participant.contactType}: {participant.contactInfo}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {user?.uid !== event.userId && (
        <button
          onClick={() => setSelectedUserToRate({ userId: event.userId, postId: event.id })}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Rate User
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Upcoming Events */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-4">
            {upcomingEvents.map(renderEvent)}
          </div>
        ) : (
          <p className="text-gray-500">No upcoming events</p>
        )}
      </div>

      {/* Past Events */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Past Events</h2>
        {pastEvents.length > 0 ? (
          <div className="space-y-4">
            {pastEvents.map(renderEvent)}
          </div>
        ) : (
          <p className="text-gray-500">No past events</p>
        )}
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Event</h2>
              <button
                onClick={() => setEditingEvent(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date and Time
                </label>
                <input
                  type="datetime-local"
                  value={editingEvent.meetupDateTime.slice(0, 16)}
                  onChange={(e) => setEditingEvent({
                    ...editingEvent,
                    meetupDateTime: e.target.value
                  })}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Participants
                </label>
                <input
                  type="number"
                  value={editingEvent.maxPeople || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setEditingEvent({
                      ...editingEvent,
                      maxPeople: value === 0 ? -1 : value || 2 // Default to 2 if invalid
                    });
                  }}
                  min="-1"
                  max="10"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">Enter -1 for unlimited participants</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({
                    ...editingEvent,
                    description: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Delete Event</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(eventToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate User Modal */}
      {selectedUserToRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <RateUser
              toUserId={selectedUserToRate.userId}
              postId={selectedUserToRate.postId}
              onClose={() => setSelectedUserToRate(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
} 