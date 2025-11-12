// frontend/src/components/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import '../App.css';

const Dashboard = () => {
    const { token, username, is_admin, logout, userId } = useAuth();
    const [myFiles, setMyFiles] = useState([]);
    const [sharedWithMeFiles, setSharedWithMeFiles] = useState([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isPrivate, setIsPrivate] = useState(true);

    const [showShareModal, setShowShareModal] = useState(false);
    const [fileToShare, setFileToShare] = useState(null);
    const [recipientEmail, setRecipientEmail] = useState('');

    const [showManageSharingModal, setShowManageSharingModal] = useState(false); // NEW state
    const [fileToManageSharing, setFileToManageSharing] = useState(null); // NEW state
    const [currentlySharedWith, setCurrentlySharedWith] = useState([]); // NEW state

    const API_BASE_URL = 'http://localhost:5000/api';

    const fetchMyFiles = useCallback(async () => {
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/files`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                // Filter to show only files owned by the current user or public files
                setMyFiles(data.filter(file => file.user_id === userId || file.is_private === 0));
            } else {
                setMessageType('error');
                setMessage(data.message || 'Failed to fetch your files.');
                if (response.status === 401) {
                    logout();
                }
            }
        } catch (error) {
            console.error('Error fetching your files:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable for your files.');
        }
    }, [token, logout, userId]);

    const fetchSharedWithMeFiles = useCallback(async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/files/shared-with-me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setSharedWithMeFiles(data);
            } else {
                setMessageType('error');
                setMessage(data.message || 'Failed to fetch files shared with you.');
                if (response.status === 401) {
                    logout();
                }
            }
        } catch (error) {
            console.error('Error fetching shared files:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable for shared files.');
        }
    }, [token, logout]);

    const fetchCurrentlySharedWith = useCallback(async (fileId) => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/files/${fileId}/shared-with`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setCurrentlySharedWith(data);
            } else {
                setMessageType('error');
                setMessage(data.message || 'Failed to fetch sharing details.');
            }
        } catch (error) {
            console.error('Error fetching sharing details:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable.');
        }
    }, [token]);


    useEffect(() => {
        fetchMyFiles();
        fetchSharedWithMeFiles();
    }, [fetchMyFiles, fetchSharedWithMeFiles]);

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setMessage('');
        setMessageType('');

        if (!selectedFile) {
            setMessageType('error');
            setMessage('Please select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('is_private', isPrivate);

        try {
            const response = await fetch(`${API_BASE_URL}/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                setMessageType('success');
                setMessage(data.message);
                setSelectedFile(null);
                document.getElementById('file-upload').value = '';
                fetchMyFiles();
            } else {
                setMessageType('error');
                setMessage(data.message || 'File upload failed.');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable.');
        }
    };

    const handleDownload = async (fileId, originalName) => {
        try {
            const response = await fetch(`${API_BASE_URL}/files/download/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = originalName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                setMessageType('success');
                setMessage(`Downloading ${originalName}...`);
            } else {
                const errorData = await response.json();
                setMessageType('error');
                setMessage(errorData.message || 'Failed to download file.');
            }
        } catch (error) {
            console.error('Download error:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable.');
        }
    };

    const handleDelete = async (fileId) => {
        if (!window.confirm('Are you sure you want to delete this file? This will also unshare it with anyone it\'s shared with.')) {
            return;
        }
        setMessage('');
        setMessageType('');

        try {
            const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                setMessageType('success');
                setMessage(data.message);
                fetchMyFiles(); // Refresh my files
                fetchSharedWithMeFiles(); // Refresh shared files (in case owner deletes a file shared with them)
            } else {
                setMessageType('error');
                setMessage(data.message || 'File deletion failed.');
            }
        } catch (error) {
            console.error('Delete error:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable.');
        }
    };

    const openShareModal = (file) => {
        setFileToShare(file);
        setRecipientEmail('');
        setShowShareModal(true);
    };

    const closeShareModal = () => {
        setShowShareModal(false);
        setFileToShare(null);
        setRecipientEmail('');
    };

    const handleShareFile = async (e) => {
        e.preventDefault();
        setMessage('');
        setMessageType('');

        if (!fileToShare || !recipientEmail) {
            setMessageType('error');
            setMessage('Please select a file and enter a recipient email.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/files/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ file_id: fileToShare.id, shared_with_email: recipientEmail })
            });

            const data = await response.json();

            if (response.ok) {
                setMessageType('success');
                setMessage(data.message);
                closeShareModal();
                // If the manage sharing modal is open, refresh its data
                if (showManageSharingModal && fileToManageSharing && fileToManageSharing.id === fileToShare.id) {
                    fetchCurrentlySharedWith(fileToShare.id);
                }
            } else {
                setMessageType('error');
                setMessage(data.message || 'File sharing failed.');
            }
        } catch (error) {
            console.error('Share file error:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable.');
        }
    };

    // NEW FUNCTIONS FOR MANAGING SHARING
    const openManageSharingModal = async (file) => {
        setFileToManageSharing(file);
        await fetchCurrentlySharedWith(file.id);
        setShowManageSharingModal(true);
    };

    const closeManageSharingModal = () => {
        setShowManageSharingModal(false);
        setFileToManageSharing(null);
        setCurrentlySharedWith([]);
        setRecipientEmail(''); // Clear recipient email for new share attempt
    };

    const handleUnshare = async (shareId, originalFileName, recipientEmail) => {
        if (!window.confirm(`Are you sure you want to unshare "${originalFileName}" from ${recipientEmail}?`)) {
            return;
        }
        setMessage('');
        setMessageType('');

        try {
            const response = await fetch(`${API_BASE_URL}/files/unshare/${shareId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                setMessageType('success');
                setMessage(data.message);
                // Refresh the list of users this file is shared with
                if (fileToManageSharing) {
                    fetchCurrentlySharedWith(fileToManageSharing.id);
                }
                // Refresh sharedWithMeFiles in case the unshared file was visible there
                fetchSharedWithMeFiles();
            } else {
                setMessageType('error');
                setMessage(data.message || 'Failed to unshare file.');
            }
        } catch (error) {
            console.error('Unshare error:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable.');
        }
    };


    return (
        <div className="dashboard-container">
            <h2>Welcome, {username}!</h2>
            {is_admin && <p className="admin-status">You are an Admin.</p>}

            {message && <p className={`status-message ${messageType}`}>{message}</p>}

            <div className="upload-section">
                <h3>Upload New File</h3>
                <form onSubmit={handleUpload}>
                    <input
                        type="file"
                        id="file-upload"
                        onChange={handleFileChange}
                        className="file-input"
                    />
                    <div className="checkbox-group">
                        <input
                            type="checkbox"
                            id="isPrivate"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                        />
                        <label htmlFor="isPrivate">Mark as Private (only you can see/download)</label>
                    </div>
                    <button type="submit" className="primary-button">Upload File</button>
                </form>
            </div>

            <div className="files-section">
                <h3>Your Files & Public Files</h3>
                {myFiles.length === 0 ? (
                    <p>No files uploaded by you or public files available yet.</p>
                ) : (
                    <ul className="file-list">
                        {myFiles.map((file) => (
                            <li key={file.id} className="file-item">
                                <span>{file.original_name} ({Math.round(file.size / 1024)} KB)</span>
                                <span className={`file-privacy ${file.is_private ? 'private' : 'public'}`}>
                                    {file.is_private ? 'Private' : 'Public'}
                                </span>
                                {file.upload_date && (
                                    <span className="file-date">
                                        Uploaded: {new Date(file.upload_date).toLocaleString()}
                                    </span>
                                )}
                                <div className="file-actions">
                                    <button onClick={() => handleDownload(file.id, file.original_name)} className="secondary-button">
                                        Download
                                    </button>
                                    {file.user_id === userId && file.is_private === 1 && ( // Only owner can share private files
                                        <>
                                            <button onClick={() => openShareModal(file)} className="share-button">
                                                Share
                                            </button>
                                            <button onClick={() => openManageSharingModal(file)} className="manage-share-button">
                                                Manage Sharing
                                            </button>
                                        </>
                                    )}
                                    {(file.user_id === userId || is_admin) && (
                                        <button onClick={() => handleDelete(file.id)} className="danger-button">
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="files-section">
                <h3>Files Shared With Me</h3>
                {sharedWithMeFiles.length === 0 ? (
                    <p>No files have been shared with you yet.</p>
                ) : (
                    <ul className="file-list">
                        {sharedWithMeFiles.map((file) => (
                            <li key={file.id} className="file-item shared-file-item">
                                <span>{file.original_name} ({Math.round(file.size / 1024)} KB)</span>
                                {file.shared_by_username && (
                                    <span className="file-shared-by">
                                        Shared by: {file.shared_by_username} ({file.shared_by_email})
                                    </span>
                                )}
                                {file.shared_date && (
                                    <span className="file-date">
                                        Shared on: {new Date(file.shared_date).toLocaleString()}
                                    </span>
                                )}
                                <div className="file-actions">
                                    <button onClick={() => handleDownload(file.id, file.original_name)} className="secondary-button">
                                        Download
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Share File Modal */}
            {showShareModal && fileToShare && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Share "{fileToShare.original_name}"</h3>
                        <form onSubmit={handleShareFile}>
                            <label htmlFor="recipientEmail">Share with (Recipient's Email):</label>
                            <input
                                type="email"
                                id="recipientEmail"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                required
                            />
                            <div className="modal-actions">
                                <button type="submit" className="primary-button">Share</button>
                                <button type="button" onClick={closeShareModal} className="secondary-button">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Sharing Modal (NEW) */}
            {showManageSharingModal && fileToManageSharing && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Manage Sharing for "{fileToManageSharing.original_name}"</h3>
                        <h4>Currently Shared With:</h4>
                        {currentlySharedWith.length === 0 ? (
                            <p>This file is not currently shared with anyone.</p>
                        ) : (
                            <ul className="shared-users-list">
                                {currentlySharedWith.map((user) => (
                                    <li key={user.share_id} className="shared-user-item">
                                        <span>{user.username} ({user.email})</span>
                                        <button
                                            onClick={() => handleUnshare(user.share_id, fileToManageSharing.original_name, user.email)}
                                            className="danger-button unshare-button"
                                        >
                                            Unshare
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <h4 style={{marginTop: '20px'}}>Share with new user:</h4>
                        <form onSubmit={handleShareFile}> {/* Re-use handleShareFile here */}
                            <label htmlFor="newRecipientEmail">Recipient's Email:</label>
                            <input
                                type="email"
                                id="newRecipientEmail"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                required
                            />
                            <div className="modal-actions">
                                <button type="submit" className="primary-button">Share New</button>
                                <button type="button" onClick={closeManageSharingModal} className="secondary-button">Done</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;