import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, AlertTriangle, Trash2, Eye, EyeOff, FileText, Plus, Edit, X, Check, Loader, ArrowLeft, Flag, RefreshCw, Upload, Image, Crown, Users, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { GlassCard, Button } from '../components/UIComponents';
import { FirebaseService } from '../firebaseService';
import { formatAddress, DataService } from '../services';
import { BadgeType } from '../types';

interface AdminViewProps {
  onBack: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'reports' | 'hidden' | 'blogs' | 'badges' | 'users'>('reports');
  
  // Reports state
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  
  // Hidden posts state
  const [hiddenPosts, setHiddenPosts] = useState<string[]>([]);
  const [loadingHidden, setLoadingHidden] = useState(false);
  
  // Blog state
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [showBlogEditor, setShowBlogEditor] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [blogForm, setBlogForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    coverImage: '',
    tags: ''
  });
  const [savingBlog, setSavingBlog] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Badge state
  const [badges, setBadges] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'pending' | 'active' | 'expired'>('pending');

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showAssignBadge, setShowAssignBadge] = useState(false);
  const [assigningBadge, setAssigningBadge] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedBadgeType, setSelectedBadgeType] = useState<BadgeType>('blue');

  // Badge password gate state
  const [showBadgePasswordModal, setShowBadgePasswordModal] = useState(false);
  const [badgePassword, setBadgePassword] = useState('');
  const [showBadgePassword, setShowBadgePassword] = useState(false);
  const [badgePasswordError, setBadgePasswordError] = useState('');
  const [verifyingBadgePassword, setVerifyingBadgePassword] = useState(false);
  const [pendingBadgeAction, setPendingBadgeAction] = useState<{
    type: 'assign' | 'revoke';
    badgeId?: string;
    userAddress?: string;
  } | null>(null);

  // Handle login
  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('adminAuth', 'true');
        loadData();
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to verify password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check session on mount
  useEffect(() => {
    const isAuth = sessionStorage.getItem('adminAuth');
    if (isAuth === 'true') {
      setIsAuthenticated(true);
      loadData();
    }
  }, []);

  // Load all data
  const loadData = async () => {
    loadReports();
    loadHiddenPosts();
    loadBlogs();
    loadBadges();
    loadUsers();
  };

  // Load reports
  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const data = await FirebaseService.getReports();
      setReports(data);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  // Load hidden posts
  const loadHiddenPosts = async () => {
    setLoadingHidden(true);
    try {
      const data = await FirebaseService.getHiddenPosts();
      setHiddenPosts(data);
    } catch (err) {
      console.error('Error loading hidden posts:', err);
    } finally {
      setLoadingHidden(false);
    }
  };

  // Load blogs
  const loadBlogs = async () => {
    setLoadingBlogs(true);
    try {
      const data = await FirebaseService.getBlogPosts(false);
      setBlogs(data);
    } catch (err) {
      console.error('Error loading blogs:', err);
    } finally {
      setLoadingBlogs(false);
    }
  };

  // Load badges
  const loadBadges = async () => {
    setLoadingBadges(true);
    try {
      const data = await FirebaseService.getAllBadges();
      setBadges(data);
    } catch (err) {
      console.error('Error loading badges:', err);
    } finally {
      setLoadingBadges(false);
    }
  };

  // Load users
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await FirebaseService.getAllUsersWithBadges();
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Approve badge
  const handleApproveBadge = async (badgeId: string) => {
    try {
      await FirebaseService.updateBadgeStatus(badgeId, 'active', 'admin');
      DataService.invalidateCache();
      loadBadges();
    } catch (err) {
      console.error('Error approving badge:', err);
      alert('Failed to approve badge');
    }
  };

  // Reject badge
  const handleRejectBadge = async (badgeId: string) => {
    try {
      await FirebaseService.updateBadgeStatus(badgeId, 'rejected', undefined, 'Rejected by admin');
      DataService.invalidateCache();
      loadBadges();
    } catch (err) {
      console.error('Error rejecting badge:', err);
      alert('Failed to reject badge');
    }
  };

  // Verify badge password
  const verifyBadgePassword = async (): Promise<boolean> => {
    if (!badgePassword.trim()) {
      setBadgePasswordError('Please enter the badge password');
      return false;
    }
    
    setVerifyingBadgePassword(true);
    setBadgePasswordError('');
    
    try {
      const response = await fetch('/api/admin/verify-badge-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: badgePassword })
      });
      
      if (response.ok) {
        return true;
      } else {
        const data = await response.json();
        setBadgePasswordError(data.error || 'Invalid badge password');
        return false;
      }
    } catch (err) {
      console.error('Badge password verification error:', err);
      setBadgePasswordError('Failed to verify password. Please try again.');
      return false;
    } finally {
      setVerifyingBadgePassword(false);
    }
  };

  // Handle badge password submit
  const handleBadgePasswordSubmit = async () => {
    const isValid = await verifyBadgePassword();
    if (!isValid) return;
    
    setShowBadgePasswordModal(false);
    setBadgePassword('');
    setBadgePasswordError('');
    
    if (pendingBadgeAction?.type === 'assign') {
      await executeAssignBadge();
    } else if (pendingBadgeAction?.type === 'revoke' && pendingBadgeAction.badgeId && pendingBadgeAction.userAddress) {
      await executeRevokeBadge(pendingBadgeAction.badgeId, pendingBadgeAction.userAddress);
    }
    
    setPendingBadgeAction(null);
  };

  // Close badge password modal
  const closeBadgePasswordModal = () => {
    setShowBadgePasswordModal(false);
    setBadgePassword('');
    setBadgePasswordError('');
    setPendingBadgeAction(null);
  };

  // Revoke badge - now with password gate
  const handleRevokeBadge = async (badgeId: string, userAddress: string) => {
    if (!confirm('Are you sure you want to revoke this badge?')) return;
    
    setPendingBadgeAction({ type: 'revoke', badgeId, userAddress });
    setShowBadgePasswordModal(true);
  };

  // Execute revoke badge after password verification
  const executeRevokeBadge = async (badgeId: string, userAddress: string) => {
    try {
      await FirebaseService.revokeBadge(userAddress, badgeId, 'admin');
      DataService.invalidateCache();
      loadBadges();
      loadUsers();
    } catch (err) {
      console.error('Error revoking badge:', err);
      alert('Failed to revoke badge');
    }
  };

  // Assign badge to user - now with password gate
  const handleAssignBadge = async () => {
    if (!selectedUser) return;
    
    setPendingBadgeAction({ type: 'assign' });
    setShowBadgePasswordModal(true);
  };

  // Execute assign badge after password verification
  const executeAssignBadge = async () => {
    if (!selectedUser) return;
    
    setAssigningBadge(true);
    try {
      await FirebaseService.assignBadge(selectedUser.address, selectedBadgeType, 'admin');
      DataService.invalidateCache();
      setShowAssignBadge(false);
      setSelectedUser(null);
      loadBadges();
      loadUsers();
    } catch (err) {
      console.error('Error assigning badge:', err);
      alert('Failed to assign badge');
    } finally {
      setAssigningBadge(false);
    }
  };

  // Filter badges
  const filteredBadges = badges.filter(badge => {
    if (badgeFilter === 'all') return true;
    return badge.status === badgeFilter;
  });

  // Filter users by search
  const filteredUsers = users.filter(user => {
    if (!userSearch.trim()) return true;
    const search = userSearch.toLowerCase();
    return user.address.toLowerCase().includes(search) ||
           (user.ens && user.ens.toLowerCase().includes(search));
  });

  // Handle hide post
  const handleHidePost = async (postId: string, reportId?: string) => {
    try {
      await FirebaseService.hidePost(postId);
      if (reportId) {
        await FirebaseService.updateReportStatus(reportId, 'resolved');
      }
      loadReports();
      loadHiddenPosts();
    } catch (err) {
      console.error('Error hiding post:', err);
      alert('Failed to hide post');
    }
  };

  // Handle unhide post
  const handleUnhidePost = async (postId: string) => {
    try {
      await FirebaseService.unhidePost(postId);
      loadHiddenPosts();
    } catch (err) {
      console.error('Error unhiding post:', err);
      alert('Failed to unhide post');
    }
  };

  // Handle dismiss report
  const handleDismissReport = async (reportId: string) => {
    try {
      await FirebaseService.updateReportStatus(reportId, 'dismissed');
      loadReports();
    } catch (err) {
      console.error('Error dismissing report:', err);
      alert('Failed to dismiss report');
    }
  };

  // Handle delete report
  const handleDeleteReport = async (reportId: string) => {
    try {
      await FirebaseService.deleteReport(reportId);
      loadReports();
    } catch (err) {
      console.error('Error deleting report:', err);
      alert('Failed to delete report');
    }
  };

  // Open blog editor
  const openBlogEditor = (blog?: any) => {
    if (blog) {
      setEditingBlog(blog);
      setBlogForm({
        title: blog.title || '',
        excerpt: blog.excerpt || '',
        content: blog.content || '',
        coverImage: blog.coverImage || '',
        tags: (blog.tags || []).join(', ')
      });
    } else {
      setEditingBlog(null);
      setBlogForm({ title: '', excerpt: '', content: '', coverImage: '', tags: '' });
    }
    setShowBlogEditor(true);
  };

  // Save blog
  const handleSaveBlog = async () => {
    if (!blogForm.title.trim() || !blogForm.content.trim()) {
      alert('Title and content are required');
      return;
    }
    
    setSavingBlog(true);
    try {
      const tags = blogForm.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      if (editingBlog) {
        await FirebaseService.updateBlogPost(editingBlog.id, {
          title: blogForm.title,
          excerpt: blogForm.excerpt,
          content: blogForm.content,
          coverImage: blogForm.coverImage,
          tags
        });
      } else {
        await FirebaseService.createBlogPost({
          title: blogForm.title,
          excerpt: blogForm.excerpt,
          content: blogForm.content,
          coverImage: blogForm.coverImage,
          author: 'BSN Team',
          tags
        });
      }
      
      setShowBlogEditor(false);
      loadBlogs();
    } catch (err) {
      console.error('Error saving blog:', err);
      alert('Failed to save blog');
    } finally {
      setSavingBlog(false);
    }
  };

  // Delete blog
  const handleDeleteBlog = async (blogId: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    
    try {
      await FirebaseService.deleteBlogPost(blogId);
      loadBlogs();
    } catch (err) {
      console.error('Error deleting blog:', err);
      alert('Failed to delete blog');
    }
  };

  // Compress image before upload
  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Could not compress image'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('Could not load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setUploadingImage(true);
    try {
      const compressedFile = await compressImage(file);
      console.log(`Compressed image from ${(file.size / 1024).toFixed(1)}KB to ${(compressedFile.size / 1024).toFixed(1)}KB`);
      
      const imageUrl = await FirebaseService.imageToBase64(compressedFile);
      setBlogForm({ ...blogForm, coverImage: imageUrl });
    } catch (err: any) {
      console.error('Error uploading image:', err);
      alert(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Remove cover image
  const handleRemoveImage = () => {
    setBlogForm({ ...blogForm, coverImage: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Logout
  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
    setPassword('');
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-gray-400 text-sm">Enter your password to continue</p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="relative mb-6">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Enter admin password"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader size={18} className="animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Access Admin Panel'
            )}
          </Button>
          
          <button
            onClick={onBack}
            className="w-full mt-4 text-gray-400 hover:text-white text-sm transition-colors"
          >
            Back to Home
          </button>
        </GlassCard>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield size={24} className="text-primary" />
              Admin Panel
            </h1>
            <p className="text-gray-500 text-sm">Manage reports, posts, and blog content</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'reports', label: 'Reports', icon: Flag, count: reports.filter(r => r.status === 'pending').length },
          { id: 'hidden', label: 'Hidden Posts', icon: EyeOff, count: hiddenPosts.length },
          { id: 'blogs', label: 'Blog Posts', icon: FileText, count: blogs.length },
          { id: 'badges', label: 'Badges', icon: Crown, count: badges.filter(b => b.status === 'pending').length },
          { id: 'users', label: 'Users', icon: Users, count: users.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-black/20' : 'bg-white/10'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">User Reports</h2>
            <button
              onClick={loadReports}
              disabled={loadingReports}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw size={18} className={loadingReports ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {loadingReports ? (
            <div className="flex justify-center py-12">
              <Loader size={24} className="text-primary animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <Flag size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No reports yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`p-4 rounded-xl border ${
                    report.status === 'pending'
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          report.status === 'pending' ? 'bg-red-500/20 text-red-400' :
                          report.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {report.status}
                        </span>
                        <span className="text-gray-500 text-xs">
                          Post #{report.postId}
                        </span>
                        <span className="text-gray-600 text-xs">
                          {formatDate(report.timestamp)}
                        </span>
                      </div>
                      <p className="text-white font-medium mb-1">{report.reason}</p>
                      <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                        "{report.postContent}"
                      </p>
                      <p className="text-gray-500 text-xs">
                        By: {report.postAuthor} | Reporter: {formatAddress(report.reporterAddress)}
                      </p>
                    </div>
                    
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleHidePost(report.postId, report.id)}
                          className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                        >
                          Hide Post
                        </button>
                        <button
                          onClick={() => handleDismissReport(report.id)}
                          className="px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg text-sm hover:bg-white/10 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Hidden Posts Tab */}
      {activeTab === 'hidden' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Hidden Posts</h2>
            <button
              onClick={loadHiddenPosts}
              disabled={loadingHidden}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw size={18} className={loadingHidden ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {loadingHidden ? (
            <div className="flex justify-center py-12">
              <Loader size={24} className="text-primary animate-spin" />
            </div>
          ) : hiddenPosts.length === 0 ? (
            <div className="text-center py-12">
              <EyeOff size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No hidden posts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hiddenPosts.map((postId) => (
                <div
                  key={postId}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10"
                >
                  <div>
                    <span className="text-white font-medium">Post #{postId}</span>
                    <span className="text-gray-500 text-sm ml-2">Hidden from feed</span>
                  </div>
                  <button
                    onClick={() => handleUnhidePost(postId)}
                    className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors flex items-center gap-1"
                  >
                    <Eye size={14} />
                    Unhide
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Blogs Tab */}
      {activeTab === 'blogs' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Blog Posts</h2>
            <div className="flex gap-2">
              <button
                onClick={loadBlogs}
                disabled={loadingBlogs}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw size={18} className={loadingBlogs ? 'animate-spin' : ''} />
              </button>
              <Button onClick={() => openBlogEditor()} size="sm">
                <Plus size={16} className="mr-1" />
                New Post
              </Button>
            </div>
          </div>
          
          {loadingBlogs ? (
            <div className="flex justify-center py-12">
              <Loader size={24} className="text-primary animate-spin" />
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No blog posts yet</p>
              <Button onClick={() => openBlogEditor()}>
                Create Your First Post
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {blogs.map((blog) => (
                <div
                  key={blog.id}
                  className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                >
                  {blog.coverImage && (
                    <img
                      src={blog.coverImage}
                      alt={blog.title}
                      className="w-24 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{blog.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-1">{blog.excerpt}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-gray-500 text-xs">{formatDate(blog.createdAt)}</span>
                      {blog.tags?.length > 0 && (
                        <div className="flex gap-1">
                          {blog.tags.slice(0, 2).map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openBlogEditor(blog)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteBlog(blog.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Badge Requests</h2>
            <div className="flex items-center gap-2">
              <select
                value={badgeFilter}
                onChange={(e) => setBadgeFilter(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="all">All</option>
              </select>
              <button
                onClick={loadBadges}
                disabled={loadingBadges}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw size={18} className={loadingBadges ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {loadingBadges ? (
            <div className="flex justify-center py-12">
              <Loader size={24} className="text-primary animate-spin" />
            </div>
          ) : filteredBadges.length === 0 ? (
            <div className="text-center py-12">
              <Crown size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No {badgeFilter !== 'all' ? badgeFilter : ''} badge requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-4 rounded-xl border ${
                    badge.status === 'pending'
                      ? 'bg-yellow-500/10 border-yellow-500/20'
                      : badge.status === 'active'
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <img 
                          src={badge.badgeType === 'gold' ? '/check/gold.svg' : '/check/blue.svg'}
                          alt={`${badge.badgeType} Badge`}
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium capitalize">{badge.badgeType} Badge</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            badge.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            badge.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            badge.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {badge.status}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm font-mono">{formatAddress(badge.userAddress)}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {new Date(badge.purchaseDate).toLocaleDateString()} • {badge.amountPaid} ETH
                        </p>
                      </div>
                    </div>
                    
                    {badge.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveBadge(badge.id)}
                          className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          onClick={() => handleRejectBadge(badge.id)}
                          className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}
                    
                    {badge.status === 'active' && (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-gray-500 text-xs">Expires</p>
                          <p className="text-gray-300 text-sm">{new Date(badge.expiryDate).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleRevokeBadge(badge.id, badge.userAddress)}
                          className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                          title="Revoke Badge"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-bold text-white">All Users</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by address..."
                  className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 w-48"
                />
              </div>
              <button
                onClick={loadUsers}
                disabled={loadingUsers}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw size={18} className={loadingUsers ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {loadingUsers ? (
            <div className="flex justify-center py-12">
              <Loader size={24} className="text-primary animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.address}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.address}`}
                        alt=""
                        className="w-10 h-10 rounded-full bg-gray-800"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{user.ens || formatAddress(user.address)}</span>
                          {user.activeBadge && (
                            <img 
                              src={user.activeBadge.badgeType === 'gold' ? '/check/gold.svg' : '/check/blue.svg'}
                              alt={`${user.activeBadge.badgeType} Badge`}
                              className="w-5 h-5 object-contain"
                            />
                          )}
                        </div>
                        <p className="text-gray-500 text-sm font-mono">{user.address}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {user.activeBadge ? (
                        <>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.activeBadge.badgeType === 'gold' 
                              ? 'bg-yellow-500/20 text-yellow-400' 
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {user.activeBadge.badgeType} badge
                          </span>
                          <button
                            onClick={() => handleRevokeBadge(user.activeBadge.id, user.address)}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            <X size={14} />
                            Remove
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowAssignBadge(true);
                          }}
                          className="px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <Crown size={14} />
                          Assign Badge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Assign Badge Modal */}
      {showAssignBadge && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <GlassCard className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Assign Badge</h2>
              <button
                onClick={() => {
                  setShowAssignBadge(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-400 mb-2">User:</p>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <img
                  src={selectedUser.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedUser.address}`}
                  alt=""
                  className="w-10 h-10 rounded-full bg-gray-800"
                />
                <div>
                  <p className="text-white font-medium">{selectedUser.ens || formatAddress(selectedUser.address)}</p>
                  <p className="text-gray-500 text-sm font-mono">{selectedUser.address.substring(0, 20)}...</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-400 mb-3">Select Badge Type:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedBadgeType('blue')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedBadgeType === 'blue'
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="w-12 h-12 flex items-center justify-center mx-auto mb-2">
                    <img src="/check/blue.svg" alt="Blue Badge" className="w-10 h-10 object-contain" />
                  </div>
                  <p className="text-white font-medium">Blue Badge</p>
                  <p className="text-gray-500 text-sm">0.01 BNB</p>
                </button>
                <button
                  onClick={() => setSelectedBadgeType('gold')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedBadgeType === 'gold'
                      ? 'border-yellow-500 bg-yellow-500/20'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="w-12 h-12 flex items-center justify-center mx-auto mb-2">
                    <img src="/check/gold.svg" alt="Gold Badge" className="w-10 h-10 object-contain" />
                  </div>
                  <p className="text-white font-medium">Gold Badge</p>
                  <p className="text-gray-500 text-sm">0.029 BNB</p>
                </button>
              </div>
            </div>

            <Button
              onClick={handleAssignBadge}
              disabled={assigningBadge}
              className="w-full"
              size="lg"
            >
              {assigningBadge ? (
                <>
                  <Loader size={18} className="animate-spin mr-2" />
                  Assigning...
                </>
              ) : (
                'Assign Badge'
              )}
            </Button>
          </GlassCard>
        </div>
      )}

      {/* Blog Editor Modal */}
      {showBlogEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-xl p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingBlog ? 'Edit Blog Post' : 'Create Blog Post'}
              </h2>
              <button
                onClick={() => setShowBlogEditor(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={blogForm.title}
                  onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                  placeholder="Enter blog title"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Excerpt</label>
                <input
                  type="text"
                  value={blogForm.excerpt}
                  onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                  placeholder="Brief description for preview"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cover Image</label>
                
                {blogForm.coverImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <img
                      src={blogForm.coverImage}
                      alt="Cover preview"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm hover:bg-white/30 transition-colors flex items-center gap-2"
                      >
                        <Upload size={16} />
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-4 py-2 bg-red-500/20 backdrop-blur-sm rounded-lg text-red-400 text-sm hover:bg-red-500/30 transition-colors flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !uploadingImage && fileInputRef.current?.click()}
                    className={`border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {uploadingImage ? (
                      <div className="flex flex-col items-center">
                        <Loader size={32} className="text-primary animate-spin mb-3" />
                        <p className="text-gray-400 text-sm">Uploading image...</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Image size={28} className="text-gray-500" />
                        </div>
                        <p className="text-white font-medium mb-1">Click to upload cover image</p>
                        <p className="text-gray-500 text-sm">PNG, JPG or WEBP (max 5MB)</p>
                      </>
                    )}
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={blogForm.tags}
                  onChange={(e) => setBlogForm({ ...blogForm, tags: e.target.value })}
                  placeholder="blockchain, web3, technology"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content * (Markdown supported)</label>
                
                <div className="flex items-center gap-2 mb-2 p-2 bg-white/5 rounded-lg border border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      const textarea = document.getElementById('blog-content') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = blogForm.content;
                        const selectedText = text.substring(start, end);
                        const newText = text.substring(0, start) + `**${selectedText || 'bold text'}**` + text.substring(end);
                        setBlogForm({ ...blogForm, content: newText });
                      }
                    }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold text-sm transition-colors"
                    title="Bold (select text first)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const textarea = document.getElementById('blog-content') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = blogForm.content;
                        const selectedText = text.substring(start, end);
                        const newText = text.substring(0, start) + `*${selectedText || 'italic text'}*` + text.substring(end);
                        setBlogForm({ ...blogForm, content: newText });
                      }
                    }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white italic text-sm transition-colors"
                    title="Italic (select text first)"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = blogForm.content;
                      const newText = text + '\n\n# ';
                      setBlogForm({ ...blogForm, content: newText });
                    }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                    title="Heading"
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = blogForm.content;
                      const newText = text + '\n\n## ';
                      setBlogForm({ ...blogForm, content: newText });
                    }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                    title="Subheading"
                  >
                    H2
                  </button>
                  <div className="flex-1" />
                  <span className="text-[10px] text-gray-500">**bold** | *italic* | # heading</span>
                </div>
                
                <textarea
                  id="blog-content"
                  value={blogForm.content}
                  onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                  placeholder="Write your blog content here...&#10;&#10;Use **text** for bold&#10;Use *text* for italic&#10;Use # for headings"
                  rows={12}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 resize-none font-mono text-sm"
                />
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-xl p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setShowBlogEditor(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBlog}
                disabled={savingBlog || !blogForm.title.trim() || !blogForm.content.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-yellow-400 text-black font-bold transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingBlog ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {editingBlog ? 'Update Post' : 'Publish Post'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Password Modal */}
      {showBadgePasswordModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <GlassCard className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Lock size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Badge Password Required</h2>
                  <p className="text-gray-400 text-sm">
                    {pendingBadgeAction?.type === 'assign' ? 'Enter password to assign badge' : 'Enter password to remove badge'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeBadgePasswordModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {badgePasswordError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                {badgePasswordError}
              </div>
            )}

            <div className="relative mb-6">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={showBadgePassword ? 'text' : 'password'}
                value={badgePassword}
                onChange={(e) => setBadgePassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBadgePasswordSubmit()}
                placeholder="Enter badge password"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
                autoFocus
              />
              <button
                onClick={() => setShowBadgePassword(!showBadgePassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showBadgePassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeBadgePasswordModal}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors font-medium"
              >
                Cancel
              </button>
              <Button
                onClick={handleBadgePasswordSubmit}
                disabled={verifyingBadgePassword}
                className="flex-1"
                size="lg"
              >
                {verifyingBadgePassword ? (
                  <>
                    <Loader size={18} className="animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
