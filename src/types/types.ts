export interface LinkUpRequest {
  id?: string;
  fromUserId: string;
  toUserId: string;
  postId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: Date;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  contactInfo: string;  // Could be phone, Instagram, etc.
  contactType: 'phone' | 'instagram' | 'other';
  interests: string[];
  photoURL?: string;
  averageRating?: number;
  totalRatings?: number;
  // Personal Information
  age?: number;
  location?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  occupation?: string;
  languages?: string[];
}

export interface LocationPost {
  id?: string;
  userId: string;
  userName: string;
  location: string;
  placeName: string;
  meetupDateTime: string;  // ISO string format
  maxPeople: number;
  currentInterested: number;
  userInterests: string[];
  description?: string;
  timestamp: Date;
}

export interface PostInterest {
  id?: string;
  postId: string;
  userId: string;
  userName: string;
  userInterests: string[];
  timestamp: Date;
}

export interface UserRating {
  id?: string;
  fromUserId: string;
  toUserId: string;
  postId: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: string;
  isAnonymous: boolean;
} 