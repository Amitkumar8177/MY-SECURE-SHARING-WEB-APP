// frontend/src/components/AdminDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import '../App.css';

const AdminDashboard = () => {
    const { token, logout } = useAuth();
    const [users, setUsers] = useState([]);
    const [files, setFiles] = useState([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const API_BASE_URL = 'http://localhost:5000/api';

    const fetchUsers = useCallback(async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setUsers(data);
            } else {
                setMessageType('error');
                setMessage(data.message || 'Failed to fetch users.');
                if (response.status === 401 || response.status === 403) {
                    logout();
                }
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable for users.');
        }
    }, [token, logout]);

    const fetchAllFiles = useCallback(async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/files`, { // Admin fetches all files
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setFiles(data);
            } else {
                setMessageType('error');
                setMessage(data.message || 'Failed to fetch all files.');
                if (response.status === 401 || response.status === 403) {
                    logout();
                }
            }
        } catch (error) {
            console.error('Error fetching all files:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable for files.');
        }
    }, [token, logout]);


    useEffect(() => {
        fetchUsers();
        fetchAllFiles();
    }, [fetchUsers, fetchAllFiles]);

    const handleDeleteUser = async (userId, usernameToDelete) => {
        if (!window.confirm(`Are you sure you want to delete user "${usernameToDelete}" and ALL their files?`)) {
            return;
        }
        setMessage('');
        setMessageType('');
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setMessageType('success');
                setMessage(data.message);
                fetchUsers();
                fetchAllFiles();
            } else {
                setMessageType('error');
                setMessage(data.message || 'User deletion failed.');
            }
        } catch (error) {
            console.error('Delete user error:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable.');
        }
    };

    const handleToggleAdminStatus = async (userId, currentStatus, usernameToToggle) => {
        const newStatus = !currentStatus;
        if (!window.confirm(`Are you sure you want to change admin status for "${usernameToToggle}" to ${newStatus}?`)) {
            return;
        }
        setMessage('');
        setMessageType('');
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/admin`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ is_admin: newStatus })
            });
            const data = await response.json();
            if (response.ok) {
                setMessageType('success');
                setMessage(data.message);
                fetchUsers();
            } else {
                setMessageType('error');
                setMessage(data.message || 'Failed to update admin status.');
            }
        } catch (error) {
            console.error('Update admin status error:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable.');
        }
    };

    const handleDeleteFile = async (fileId, fileName) => {
        if (!window.confirm(`Are you sure you want to delete the file "${fileName}"?`)) {
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
                fetchAllFiles();
            } else {
                setMessageType('error');
                setMessage(data.message || 'File deletion failed.');
            }
        } catch (error) {
            console.error('Delete file error:', error);
            setMessageType('error');
            setMessage('Network error or server unreachable.');
        }
    };

    return (
        <div className="admin-dashboard-container">
            <h2>Admin Dashboard</h2>
            {message && <p className={`status-message ${messageType}`}>{message}</p>}

            <div className="admin-section">
                <h3>Manage Users</h3>
                {users.length === 0 ? (
                    <p>No users registered yet.</p>
                ) : (
                    <ul className="user-list">
                        {users.map((user) => (
                            <li key={user.id} className="user-item">
                                <span>{user.username} ({user.email}) - {user.is_admin ? 'Admin' : 'User'}</span>
                                <div className="user-actions">
                                    <button
                                        onClick={() => handleToggleAdminStatus(user.id, user.is_admin, user.username)}
                                        className={user.is_admin ? 'secondary-button' : 'primary-button'}
                                    >
                                        {user.is_admin ? 'Demote to User' : 'Promote to Admin'}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                        className="danger-button"
                                    >
                                        Delete User
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="admin-section">
                <h3>Manage All Files</h3>
                {files.length === 0 ? (
                    <p>No files uploaded yet.</p>
                ) : (
                    <ul className="file-list">
                        {files.map((file) => (
                            <li key={file.id} className="file-item">
                                <span>{file.original_name} (Uploaded by User ID: {file.user_id})</span>
                                <span className={`file-privacy ${file.is_private ? 'private' : 'public'}`}>
                                    {file.is_private ? 'Private' : 'Public'}
                                </span>
                                {/* Display upload date */}
                                {file.upload_date && (
                                    <span className="file-date">
                                        Uploaded: {new Date(file.upload_date).toLocaleString()}
                                    </span>
                                )}
                                <div className="file-actions">
                                    <button onClick={() => handleDeleteFile(file.id, file.original_name)} className="danger-button">
                                        Delete File
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;