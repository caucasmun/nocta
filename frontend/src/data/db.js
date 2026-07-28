// API-based database - all data is fetched from the backend
import * as api from './api';

const SESSION_KEY = 'nocta_session';
const API_URL = import.meta.env.VITE_API_URL || 'https://nocta-backend-3dqm.onrender.com';

// ===== Session =====
export function saveSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

// ===== Auth =====
export async function registerUser(username, password) {
    try {
        const user = await api.createUser(username);
        return { success: true, user };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function loginUser(username, password) {
    try {
        const users = await api.fetchUsers();
        const user = users.find(u => u.username === username);
        if (!user) {
            return { success: false, error: 'Неверное имя пользователя или пароль' };
        }
        return { success: true, user };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ===== Tracks =====
export async function getTracks(userId) {
    try {
        return await api.fetchUserLibraryTracks(userId);
    } catch {
        return [];
    }
}

export async function addTrack(userId, track) {
    try {
        // Create the track in the database
        const newTrack = await api.createTrack({
            title: track.title,
            artist: track.artist,
            lyrics: track.lyrics || '',
            isliked: false,
            user_id: userId,
            audio_url: track.audio_url || '',
        });

        // Add to user's library
        await api.addTrackToLibrary(userId, newTrack.id);

        // Auto-add artist if not exists
        const artists = await api.fetchArtists();
        const existingArtist = artists.find(a => a.artist === track.artist);
        if (!existingArtist) {
            const newArtist = await api.createArtist({
                artist: track.artist,
                trackscount: 1,
                about: track.about || '',
            });
            await api.addArtistToLibrary(userId, newArtist.id);
        } else {
            // Check if user is subscribed to this artist
            const userArtists = await api.fetchUserLibraryArtists(userId);
            const isSubscribed = userArtists.some(a => a.id === existingArtist.id);
            if (!isSubscribed) {
                await api.addArtistToLibrary(userId, existingArtist.id);
            }
        }

        return newTrack;
    } catch (err) {
        console.error('Error adding track:', err);
        throw err;
    }
}

export async function deleteTrack(userId, trackId) {
    try {
        await api.removeTrackFromLibrary(userId, trackId);
        await api.deleteTrack(trackId);
    } catch (err) {
        console.error('Error deleting track:', err);
    }
}

// ===== Artists =====
export async function getArtists(userId) {
    try {
        return await api.fetchUserLibraryArtists(userId);
    } catch {
        return [];
    }
}

export async function addArtist(userId, artist) {
    try {
        const newArtist = await api.createArtist({
            artist: artist.name,
            trackscount: 0,
            about: artist.bio || '',
        });
        await api.addArtistToLibrary(userId, newArtist.id);
        return newArtist;
    } catch (err) {
        console.error('Error adding artist:', err);
        throw err;
    }
}

export async function deleteArtist(userId, artistId) {
    try {
        await api.removeArtistFromLibrary(userId, artistId);
        await api.deleteArtist(artistId);
    } catch (err) {
        console.error('Error deleting artist:', err);
    }
}

// ===== Liked tracks =====
export async function toggleLike(userId, trackId) {
    try {
        const track = await api.fetchTrack(trackId);
        const newLiked = !track.isliked;
        await api.updateTrack(trackId, { isliked: newLiked });
        return newLiked;
    } catch (err) {
        console.error('Error toggling like:', err);
        return false;
    }
}

export async function getLikedTracks(userId) {
    try {
        const tracks = await api.fetchTracks();
        return tracks.filter(t => t.isliked).map(t => t.id);
    } catch {
        return [];
    }
}

// ===== File upload =====
export async function uploadAudio(file) {
    const formData = new FormData();
    formData.append('audio', file);
    
    // Безопасно склеиваем путь: убираем лишнее дублирование /api, если оно есть в VITE_API_URL
    const base = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
    
    const res = await fetch(`${base}/api/upload/audio`, {
        method: 'POST',
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url;
}

export async function uploadImage(file) {
    const formData = new FormData();
    formData.append('cover', file); // Ключ multer на бэкенде — 'cover'
    
    const base = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
    
    // Исправлен эндпоинт на /cover, так как бэкенд ждет именно его
    const res = await fetch(`${base}/api/upload/cover`, {
        method: 'POST',
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url;
}

// ===== Initialize (no-op for API mode) =====
export function initializeDB() {
    // Nothing to initialize - data comes from API
}

// ===== File helpers (for backward compatibility) =====
export async function getFile(url) {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    
    // Если бэкенд возвращает относительный путь /uploads/..., привязываем его к серверу Render
    const base = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
    return `${base}${url}`;
}

export async function storeFile(file) {
    if (file.type.startsWith('audio/')) {
        return await uploadAudio(file);
    }
    return await uploadImage(file);
}

export function deleteFile(id) {
    return Promise.resolve();
}
