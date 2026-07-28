const RAW_API = import.meta.env.VITE_API_URL || 'https://nocta-backend-3dqm.onrender.com';
const API_ORIGIN = RAW_API.replace(/\/api\/?$/, '').replace(/\/$/, '') || 'https://nocta-backend-3dqm.onrender.com';
const API_BASE = `${API_ORIGIN}/api`;

export { API_ORIGIN, API_BASE };

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    };
    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// ==================== USERS ====================

export async function fetchUsers() {
    return request('/users');
}

export async function fetchUser(id) {
    return request(`/users/${id}`);
}

export async function createUser(username) {
    return request('/users', {
        method: 'POST',
        body: JSON.stringify({ username }),
    });
}

export async function updateUser(id, username) {
    return request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ username }),
    });
}

export async function deleteUser(id) {
    return request(`/users/${id}`, {
        method: 'DELETE',
    });
}

// ==================== ARTISTS ====================

export async function fetchArtists() {
    return request('/artists');
}

export async function fetchArtist(id) {
    return request(`/artists/${id}`);
}

export async function createArtist(artistData) {
    return request('/artists', {
        method: 'POST',
        body: JSON.stringify(artistData),
    });
}

export async function updateArtist(id, artistData) {
    return request(`/artists/${id}`, {
        method: 'PUT',
        body: JSON.stringify(artistData),
    });
}

export async function deleteArtist(id) {
    return request(`/artists/${id}`, {
        method: 'DELETE',
    });
}

// ==================== TRACKS ====================

export async function fetchTracks() {
    return request('/tracks');
}

export async function fetchTrack(id) {
    return request(`/tracks/${id}`);
}

export async function createTrack(trackData) {
    return request('/tracks', {
        method: 'POST',
        body: JSON.stringify(trackData),
    });
}

export async function updateTrack(id, trackData) {
    return request(`/tracks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(trackData),
    });
}

export async function deleteTrack(id) {
    return request(`/tracks/${id}`, {
        method: 'DELETE',
    });
}

// ==================== USER LIBRARY TRACKS ====================

export async function fetchUserLibraryTracks(userId) {
    return request(`/users/${userId}/library/tracks`);
}

export async function addTrackToLibrary(userId, trackId) {
    return request(`/users/${userId}/library/tracks`, {
        method: 'POST',
        body: JSON.stringify({ track_id: trackId }),
    });
}

export async function removeTrackFromLibrary(userId, trackId) {
    return request(`/users/${userId}/library/tracks/${trackId}`, {
        method: 'DELETE',
    });
}

// ==================== USER LIBRARY ARTISTS ====================

export async function fetchUserLibraryArtists(userId) {
    return request(`/users/${userId}/library/artists`);
}

export async function addArtistToLibrary(userId, artistId) {
    return request(`/users/${userId}/library/artists`, {
        method: 'POST',
        body: JSON.stringify({ artist_id: artistId }),
    });
}

export async function removeArtistFromLibrary(userId, artistId) {
    return request(`/users/${userId}/library/artists/${artistId}`, {
        method: 'DELETE',
    });
}

export async function syncUserLibrary(userId) {
    return request(`/users/${userId}/library/sync`, {
        method: 'POST',
    });
}

// ==================== FILE UPLOADS ====================

export async function uploadAudio(file) {
    const url = `${API_BASE}/upload/audio`;
    const formData = new FormData();
    formData.append('audio', file);
    
    const res = await fetch(url, {
        method: 'POST',
        body: formData,
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload audio');
    return data;
}

export async function uploadImage(file) {
    const url = `${API_BASE}/upload/image`;
    const formData = new FormData();
    formData.append('cover', file);
    
    const res = await fetch(url, {
        method: 'POST',
        body: formData,
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload image');
    return data;
}
