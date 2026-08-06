// Локальный бэкенд на http://localhost:5000
const RAW_API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_ORIGIN = RAW_API.replace(/\/api\/?$/, '').replace(/\/$/, '');
const API_BASE = `${API_ORIGIN}/api`;

export { API_ORIGIN, API_BASE };

const NETWORK_ERROR = 'Сервер недоступен. Убедитесь, что бэкенд запущен на http://localhost:5000';

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJsonSafe(res) {
    const text = await res.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        throw new Error('Сервер вернул некорректный ответ');
    }
}

async function fetchWithRetry(url, options = {}, retries = 3) {
    let lastError;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await fetch(url, options);
            return res;
        } catch (err) {
            lastError = err;
            if (attempt < retries - 1) {
                await sleep(1000 * (attempt + 1));
            }
        }
    }
    throw lastError;
}

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    };
    try {
        const res = await fetchWithRetry(url, config);
        const data = await parseJsonSafe(res);
        if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
        return data;
    } catch (err) {
        if (err instanceof TypeError || err.message === 'Failed to fetch') {
            throw new Error(NETWORK_ERROR);
        }
        throw err;
    }
}

export async function wakeBackend() {
    try {
        await fetchWithRetry(`${API_BASE}/health`, {}, 2);
    } catch {
        // ignore — основной запрос повторится сам
    }
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

export async function updateUser(id, username, bio) {
    return request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ username, bio }),
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

// ==================== TRACK ARTISTS ====================

export async function fetchTrackArtists(trackId) {
    return request(`/tracks/${trackId}/artists`);
}

export async function addTrackArtist(trackId, artistId, isPrimary = false) {
    return request(`/tracks/${trackId}/artists`, {
        method: 'POST',
        body: JSON.stringify({ artist_id: artistId, is_primary: isPrimary }),
    });
}

export async function removeTrackArtist(trackId, artistId) {
    return request(`/tracks/${trackId}/artists/${artistId}`, {
        method: 'DELETE',
    });
}

export async function updateTrackArtists(trackId, artistIds) {
    return request(`/tracks/${trackId}/artists`, {
        method: 'PUT',
        body: JSON.stringify({ artist_ids: artistIds }),
    });
}

// ==================== ALL TRACKS & ARTISTS (GLOBAL + USER) ====================

export async function fetchAllTracks(userId) {
    return request(`/users/${userId}/all-tracks`);
}

export async function fetchAllArtists(userId) {
    return request(`/users/${userId}/all-artists`);
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

// ==================== USER LIKED TRACKS ====================

export async function fetchLikedTrackIds(userId) {
    return request(`/users/${userId}/liked-tracks`);
}

export async function likeTrack(userId, trackId) {
    return request(`/users/${userId}/liked-tracks/${trackId}`, {
        method: 'POST',
    });
}

export async function unlikeTrack(userId, trackId) {
    return request(`/users/${userId}/liked-tracks/${trackId}`, {
        method: 'DELETE',
    });
}

// ==================== FILE UPLOADS ====================

export async function uploadAudio(file) {
    const url = `${API_BASE}/upload/audio`;
    const formData = new FormData();
    formData.append('audio', file);
    
    try {
        const res = await fetchWithRetry(url, { method: 'POST', body: formData });
        const data = await parseJsonSafe(res);
        if (!res.ok) throw new Error(data.error || 'Failed to upload audio');
        return data;
    } catch (err) {
        if (err instanceof TypeError || err.message === 'Failed to fetch') {
            throw new Error(NETWORK_ERROR);
        }
        throw err;
    }
}

// ==================== PLAYLISTS ====================

export async function fetchPlaylists(userId) {
    return request(`/users/${userId}/playlists`);
}

export async function fetchPlaylist(id) {
    return request(`/playlists/${id}`);
}

export async function createPlaylist(userId, data) {
    return request(`/users/${userId}/playlists`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updatePlaylist(id, data) {
    return request(`/playlists/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deletePlaylist(id) {
    return request(`/playlists/${id}`, {
        method: 'DELETE',
    });
}

export async function fetchPlaylistTracks(id) {
    return request(`/playlists/${id}/tracks`);
}

export async function addTrackToPlaylist(playlistId, trackId) {
    return request(`/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ track_id: trackId }),
    });
}

export async function removeTrackFromPlaylist(playlistId, trackId) {
    return request(`/playlists/${playlistId}/tracks/${trackId}`, {
        method: 'DELETE',
    });
}

// ==================== PLAYBACK STATE ====================

export async function savePlaybackState(userId, trackId, progressSeconds) {
    return request(`/users/${userId}/playback`, {
        method: 'PUT',
        body: JSON.stringify({ track_id: trackId, progress_seconds: progressSeconds }),
    });
}

export async function fetchPlaybackState(userId) {
    return request(`/users/${userId}/playback`);
}

export async function uploadImage(file) {
    const url = `${API_BASE}/upload/image`;
    const formData = new FormData();
    formData.append('cover', file);
    
    try {
        const res = await fetchWithRetry(url, { method: 'POST', body: formData });
        const data = await parseJsonSafe(res);
        if (!res.ok) throw new Error(data.error || 'Failed to upload image');
        return data;
    } catch (err) {
        if (err instanceof TypeError || err.message === 'Failed to fetch') {
            throw new Error(NETWORK_ERROR);
        }
        throw err;
    }
}