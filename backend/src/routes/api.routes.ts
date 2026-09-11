import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../controllers/notification.controller';
﻿import { Router } from 'express';
import { getTags } from '../controllers/tag.controller';
import { 
  getStories, 
  exploreStories, 
  getTrendingStories, 
  getRecentlyUpdatedStories, 
  getFeaturedIllustrations,
  getStoryBySlug,
  getChapterBySlug,
  rateStory,
  updateStory,
  deleteStory,
  getStoryCollaborators,
  addStoryCollaborator,
  removeStoryCollaborator
} from '../controllers/story.controller';
import { 
  getUsers, 
  getUserProfile, 
  getCurrentUserProfile, 
  updateUserProfile, 
  updateUserSettings,
  getAdminUserList,
  manageUserRole
} from '../controllers/user.controller';
import { 
  login, 
  register, 
  getMe, 
  logout, 
  getDemoAccounts 
} from '../controllers/auth.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';
import { 
  getGroups, 
  getGroupBySlug, 
  createGroup, 
  updateGroup,
  approveGroup,
  addGroupMember,
  updateGroupMemberRole,
  removeGroupMember,
  getGroupMessages,
  sendGroupMessage
} from '../controllers/group.controller';
import { 
  getPosts, 
  getPostBySlug, 
  createPost, 
  updatePost,
  deletePost,
  approvePost,
  rejectPost,
  bulkApprovePosts,
  bulkRejectPosts,
  reactToPost 
} from '../controllers/post.controller';
import { getComments, createComment, likeComment } from '../controllers/comment.controller';
import { uploadMultipleImages, uploadSingleImage } from '../controllers/upload.controller';
import { uploadImages } from '../middlewares/upload.middleware';
import { 
  createStory, 
  createVolume, 
  submitChapter, 
  deleteChapter,
  getChapterSubmissions, 
  approveChapterSubmission 
} from '../controllers/chapter.controller';
import { 
  getReadingHistory, 
  saveReadingHistory, 
  deleteReadingHistoryItem, 
  clearReadingHistory 
} from '../controllers/history.controller';
import { 
  getBookmarks, 
  createBookmark, 
  deleteBookmark, 
  getFavorites, 
  toggleFavorite,
  checkFavoriteStatus
} from '../controllers/bookmark.controller';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'NovelHub RESTful API',
    version: '1.0.0',
  });
});

// Authentication & Account Management
router.post('/auth/login', login);
router.post('/auth/register', register);
router.post('/auth/logout', logout);
router.get('/auth/me', requireAuth, getMe);
router.get('/auth/accounts', getDemoAccounts);

// File & Image Uploads (Multipart/Form-Data)
router.post('/upload/images', optionalAuth, uploadImages.array('images', 10) as any, uploadMultipleImages);
router.post('/upload/image', optionalAuth, uploadImages.single('image') as any, uploadSingleImage);

// Tags & Categories
router.get('/tags', getTags);

// Stories
router.get('/stories', getStories);
router.get('/stories/explore', exploreStories);
router.get('/stories/trending', getTrendingStories);
router.get('/stories/recently-updated', getRecentlyUpdatedStories);
router.get('/stories/illustrations', getFeaturedIllustrations);
router.get('/stories/:slug', optionalAuth, getStoryBySlug);
router.get('/stories/:slug/chapters/:chapterSlug', optionalAuth, getChapterBySlug);
router.post('/stories/:slug/rate', requireAuth, rateStory);
router.post('/stories', requireAuth, createStory);
router.put('/stories/:id', requireAuth, updateStory);
router.delete('/stories/:id', requireAuth, deleteStory);
router.get('/stories/:id/collaborators', getStoryCollaborators);
router.post('/stories/:id/collaborators', requireAuth, addStoryCollaborator);
router.delete('/stories/:id/collaborators/:userId', requireAuth, removeStoryCollaborator);
router.post('/stories/:storyId/volumes', requireAuth, createVolume);

// Chapters & Submissions
router.post('/chapters/submissions', requireAuth, submitChapter);
router.get('/chapters/submissions', optionalAuth, getChapterSubmissions);
router.post('/chapters/submissions/:id/approve-active', requireAuth, approveChapterSubmission);
router.delete('/chapters/:id', requireAuth, deleteChapter);


// Notifications
router.get('/notifications', requireAuth, getNotifications);
router.put('/notifications/read-all', requireAuth, markAllNotificationsAsRead);
router.put('/notifications/:id/read', requireAuth, markNotificationAsRead);
router.delete('/notifications/:id', requireAuth, deleteNotification);

// Reading History
router.get('/history', requireAuth, getReadingHistory);
router.post('/history', requireAuth, saveReadingHistory);
router.delete('/history/:id', requireAuth, deleteReadingHistoryItem);
router.delete('/history', requireAuth, clearReadingHistory);

// Bookmarks & Favorites
router.get('/bookmarks', requireAuth, getBookmarks);
router.post('/bookmarks', requireAuth, createBookmark);
router.delete('/bookmarks/:id', requireAuth, deleteBookmark);
router.get('/favorites', requireAuth, getFavorites);
router.post('/favorites/toggle', requireAuth, toggleFavorite);
router.get('/favorites/status/:storyId', optionalAuth, checkFavoriteStatus);

// Comments
router.get('/comments', getComments);
router.post('/comments', requireAuth, createComment);
router.post('/comments/:id/like', requireAuth, likeComment);

// Fandom / Community Posts
router.get('/posts', optionalAuth, getPosts);
router.get('/posts/:slug', getPostBySlug);
router.post('/posts', requireAuth, createPost);
router.put('/posts/:id', requireAuth, updatePost);
router.delete('/posts/:id', requireAuth, deletePost);
router.post('/posts/:id/approve', requireAuth, approvePost);
router.post('/posts/:id/reject', requireAuth, rejectPost);
router.post('/posts/bulk-approve', requireAuth, bulkApprovePosts);
router.post('/posts/bulk-reject', requireAuth, bulkRejectPosts);
router.post('/posts/:id/react', requireAuth, reactToPost);

// Users & Profile Settings
router.get('/profile/me', requireAuth, getCurrentUserProfile);
router.put('/profile/me', requireAuth, updateUserProfile);
router.put('/profile/me/settings', requireAuth, updateUserSettings);
router.get('/users', getUsers);
router.get('/users/admin/all', requireAuth, getAdminUserList);
router.post('/users/:userId/roles', requireAuth, manageUserRole);
router.get('/users/:username', getUserProfile);

// Translation Groups
router.get('/groups', getGroups);
router.get('/groups/:slug', getGroupBySlug);
router.post('/groups', requireAuth, createGroup);
router.put('/groups/:id', requireAuth, updateGroup);
router.post('/groups/:id/approve', requireAuth, approveGroup);
router.post('/groups/:id/members', requireAuth, addGroupMember);
router.put('/groups/:id/members/:memberUserId', requireAuth, updateGroupMemberRole);
router.delete('/groups/:id/members/:memberUserId', requireAuth, removeGroupMember);

// Group Chatroom Messages
router.get('/groups/:id/messages', optionalAuth, getGroupMessages);
router.post('/groups/:id/messages', requireAuth, sendGroupMessage);

export default router;
