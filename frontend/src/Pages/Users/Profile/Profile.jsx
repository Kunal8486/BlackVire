import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Profile.css';

// Create a reusable API client with base configuration
const apiClient = axios.create({
  baseURL: 'http://localhost:5100/api',
  timeout: 10000
});

// Add interceptor to include auth token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

const Profile = () => {
    const [userData, setUserData] = useState({
        fullName: '',
        username: '',
        email: '',
        bio: '',
        profilePicture: '',
        role: '',
        joinDate: '',
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({
        fullName: '',
        bio: '',
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState('');
    const { userId } = useParams();
    const navigate = useNavigate();
    
    // Flag to determine if viewing own profile
    const isCurrentUser = !userId;

    // Fetch user data - wrapped in useCallback to avoid dependency warnings
    const fetchUserData = useCallback(async () => {
        setLoading(true);
        try {
            // Determine which endpoint to use
            const endpoint = isCurrentUser ? '/users/profile' : `/users/profile/${userId}`;
            
            const response = await apiClient.get(endpoint);
            
            if (response.data) {
                // Handling both response formats (direct or with success property)
                const user = response.data.user || response.data;
                
                setUserData({
                    ...user,
                    joinDate: user.createdAt || user.joinDate || new Date().toISOString(),
                    bio: user.bio || ''
                });
                
                setEditFormData({
                    fullName: user.fullName || '',
                    bio: user.bio || '',
                });
                
                // Set profile picture preview
                setPreviewUrl(user.profilePicture || '/default-avatar.png');
            }
        } catch (err) {
            console.error('Error fetching user data:', err);
            const errorMessage = err.response?.data?.message || 'Failed to load profile data';
            setError(errorMessage);
            
            // Check for authentication errors
            if (err.response?.status === 401) {
                toast.error('Your session has expired. Please login again.');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [userId, isCurrentUser, navigate]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle file selection for avatar upload
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Validate file type and size
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            const maxSize = 5 * 1024 * 1024; // 5MB
            
            if (!validTypes.includes(file.type)) {
                toast.error('Please upload a valid image file (JPEG, PNG, GIF, WEBP)');
                return;
            }
            
            if (file.size > maxSize) {
                toast.error('File size must be less than 5MB');
                return;
            }
            
            setSelectedFile(file);
            
            // Show preview
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
            
            // Clean up the object URL when component unmounts or preview changes
            return () => URL.revokeObjectURL(objectUrl);
        }
    };

    // Upload avatar
    const handleAvatarUpload = async () => {
        if (!selectedFile) return;
        
        const formData = new FormData();
        formData.append('avatar', selectedFile);
        
        try {
            setUploadProgress(0);
            
            const response = await apiClient.post('/users/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            
            if (response.data.success) {
                setUserData(prev => ({
                    ...prev,
                    profilePicture: response.data.user.profilePicture
                }));
                setSelectedFile(null);
                setUploadProgress(0);
                toast.success('Avatar updated successfully!');
            }
        } catch (err) {
            console.error('Error uploading avatar:', err);
            toast.error(err.response?.data?.message || 'Failed to upload avatar');
        }
    };

    // Submit profile update
    const handleSubmitProfile = async (e) => {
        e.preventDefault();
        try {
            // Prepare data for update - now includes bio field
            const updateData = {
                fullName: editFormData.fullName,
                bio: editFormData.bio
            };
            
            const response = await apiClient.put('/users/profile', updateData);
            
            // Update local state with response data
            setUserData(prev => ({
                ...prev,
                fullName: response.data.fullName || response.data.user?.fullName || prev.fullName,
                bio: response.data.bio || response.data.user?.bio || editFormData.bio
            }));
            
            setIsEditing(false);
            toast.success('Profile updated successfully!');
        } catch (err) {
            console.error('Error updating profile:', err);
            toast.error(err.response?.data?.message || 'Failed to update profile');
        }
    };

    const handleEditProfile = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditFormData({
            fullName: userData.fullName || '',
            bio: userData.bio || ''
        });
    };

    if (loading) return (
        <div className="loading-container">
            <div className="loading">Loading profile...</div>
        </div>
    );
    
    if (error) return (
        <div className="error-container">
            <div className="error">
                <h3>Error</h3>
                <p>{error}</p>
                <button 
                    onClick={() => fetchUserData()} 
                    className="retry-button"
                >
                    Retry
                </button>
            </div>
        </div>
    );

    return (
        <div className="page-profile-container">
            <div className="profile-header-page">
                <div className="profile-picture-section">
                    <div className="profile-picture-container">
                        <img
                            id="avatar-preview"
                            src={previewUrl}
                            alt={`${userData.fullName || 'User'}'s profile`}
                            className="profile-picture"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/default-avatar.png';
                            }}
                        />
                    </div>
                    
                    {isCurrentUser && (
                        <div className="avatar-upload-section">
                            <input 
                                type="file" 
                                id="avatar-upload" 
                                onChange={handleFileChange} 
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="file-input"
                            />
                            <label htmlFor="avatar-upload" className="file-input-label">
                                Choose File
                            </label>
                            
                            {selectedFile && (
                                <>
                                    <div className="selected-file-name" title={selectedFile.name}>
                                        {selectedFile.name.length > 20 
                                            ? selectedFile.name.substring(0, 17) + '...' 
                                            : selectedFile.name}
                                    </div>
                                    <button 
                                        onClick={handleAvatarUpload} 
                                        className="upload-button"
                                        disabled={uploadProgress > 0 && uploadProgress < 100}
                                    >
                                        Upload
                                    </button>
                                    
                                    {uploadProgress > 0 && (
                                        <div className="progress-container">
                                            <div 
                                                className="progress-bar" 
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                            <span className="progress-text">{uploadProgress}%</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="profile-info">
                    {!isEditing ? (
                        <>
                            <h1>{userData.fullName || 'No Name Set'}</h1>
                            <p className="username">@{userData.username}</p>
                            <p className="email">{userData.email}</p>
                            <p className="role-badge">{userData.role}</p>
                            <p className="join-date">
                                Member since: {new Date(userData.joinDate).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                            
                            {isCurrentUser && (
                                <button 
                                    onClick={handleEditProfile} 
                                    className="edit-profile-button"
                                    aria-label="Edit Profile"
                                >
                                    Edit Profile
                                </button>
                            )}
                        </>
                    ) : (
                        <form onSubmit={handleSubmitProfile} className="edit-profile-form">
                            <div className="form-group">
                                <label htmlFor="fullName">Full Name</label>
                                <input
                                    type="text"
                                    id="fullName"
                                    name="fullName"
                                    value={editFormData.fullName}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
                                    maxLength={50}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="bio">Bio</label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    value={editFormData.bio}
                                    onChange={handleInputChange}
                                    placeholder="Tell others about yourself..."
                                    maxLength={500}
                                    rows="4"
                                ></textarea>
                                <div className="character-count">
                                    {editFormData.bio.length}/500
                                </div>
                            </div>
                            
                            <div className="form-actions">
                                <button type="submit" className="save-button">Save Changes</button>
                                <button type="button" onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            
            <div className="profile-body">
                <section className="bio-section">
                    <h2>Bio</h2>
                    <p>{userData.bio || 'No bio provided.'}</p>
                </section>
                
                {/* New activity section */}
                <section className="activity-section">
                    <h2>Recent Activity</h2>
                    <div className="empty-state">
                        <p>No recent activity to display.</p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Profile;