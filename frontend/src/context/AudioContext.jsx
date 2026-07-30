import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getTracks, getFile } from '../data/db';
import { toggleLike as toggleLikeDB, getLikedTracks } from '../data/db';
import { savePlaybackState, fetchPlaybackState } from '../data/api';

function getRandomTrack(tracksList, excludeId = null) {
    const available = excludeId
        ? tracksList.filter(t => t.id !== excludeId)
        : tracksList;
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
}

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [hasStarted, setHasStarted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [tracksList, setTracksList] = useState([]);
    const [userId, setUserId] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [savedTrack, setSavedTrack] = useState(null);
    const [savedProgress, setSavedProgress] = useState(0);

    const audioRef = useRef(null);
    const fadeIntervalRef = useRef(null);

    const loadTracks = useCallback(async (uid) => {
        if (!uid) { setTracksList([]); return; }
        const tracks = await getTracks(uid);
        setTracksList(tracks);
    }, []);

    // Load saved playback state when user changes
    useEffect(() => {
        if (!user) {
            setSavedTrack(null);
            setSavedProgress(0);
            return;
        }
        let cancelled = false;
        fetchPlaybackState(user.id)
            .then(data => {
                if (cancelled || !data || !data.track_id) return;
                const track = {
                    id: data.track_id,
                    title: data.title,
                    artist: data.artist,
                    audio_url: data.audio_url,
                    cover_url: data.cover_url,
                    lyrics: data.lyrics,
                    color: data.color,
                    artist_slug: data.artist_slug,
                };
                setSavedTrack(track);
                setSavedProgress(data.progress_seconds || 0);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [user]);

    useEffect(() => {
        if (user) {
            setUserId(user.id);
            loadTracks(user.id);
        } else {
            setUserId(null); setTracksList([]); setCurrentTrack(null);
            setHasStarted(false); setIsPlaying(false);
            if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
        }
    }, [user, loadTracks]);

    const reloadTracks = useCallback(() => {
        if (userId) loadTracks(userId);
    }, [userId, loadTracks]);

    useEffect(() => {
        if (isInitialized) return;
        const session = localStorage.getItem('nocta_session');
        if (session) {
            try {
                const userData = JSON.parse(session);
                if (!user) { setUserId(userData.id); loadTracks(userData.id); }
                if (currentTrack) {
                    getLikedTracks(userData.id).then(liked => {
                        setIsLiked(liked.includes(currentTrack.id));
                    });
                }
            } catch (e) {}
        }
        setIsInitialized(true);
    }, [currentTrack, isInitialized, user, loadTracks]);

    // Expose current audio state globally for logout save
    useEffect(() => {
        window.__audioState = { currentTrack, currentTime };
    }, [currentTrack, currentTime]);

    const playTrack = useCallback(async (track) => {
        if (!user) { navigate('/auth'); return; }
        if (!audioRef.current) audioRef.current = new Audio();
        if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }

        const audio = audioRef.current;
        let src = track.audio_url || track.url;

        // Resolve audio URL
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            const data = await getFile(src);
            if (data) src = data;
        }

        const isNewTrack = currentTrack?.id !== track.id;
        const isResumingSaved = isNewTrack && savedTrack?.id === track.id;
        if (isNewTrack) {
            audio.pause();
            audio.src = src;
        }

        const onLoaded = () => {
            setDuration(audio.duration || 0);
            // If this is the saved track, seek to saved progress
            const seekTime = isResumingSaved ? savedProgress : 0;
            setCurrentTime(seekTime);
            setProgress(seekTime > 0 ? (seekTime / (audio.duration || 1)) * 100 : 0);
            setCurrentTrack(track);

            const session = localStorage.getItem('nocta_session');
            if (session) {
                try {
                    getLikedTracks(JSON.parse(session).id).then(liked => {
                        setIsLiked(liked.includes(track.id));
                    });
                } catch { setIsLiked(false); }
            } else { setIsLiked(false); }

            audio.volume = isMuted ? 0 : volume;
            if (seekTime > 0) audio.currentTime = seekTime;
            audio.play().then(() => { setIsPlaying(true); setHasStarted(true); })
                .catch(err => console.log("Ошибка воспроизведения:", err));
            audio.removeEventListener('loadedmetadata', onLoaded);

            // Clear saved state after user actually starts playing the saved track
            if (isResumingSaved) {
                setSavedTrack(null);
                setSavedProgress(0);
                savePlaybackState(user.id, track.id, 0).catch(() => {});
            }
        };

        audio.addEventListener('loadedmetadata', onLoaded);
        if (isNewTrack) audio.load();
        else if (audio.readyState >= 2) onLoaded();
    }, [isMuted, volume, currentTrack, user, navigate, savedTrack, savedProgress]);

    useEffect(() => {
        if (!audioRef.current) return;
        const handleEnded = () => {
            const next = getRandomTrack(tracksList, currentTrack?.id);
            if (next) playTrack(next);
            else if (currentTrack) playTrack(currentTrack);
        };
        audioRef.current.addEventListener('ended', handleEnded);
        return () => { if (audioRef.current) audioRef.current.removeEventListener('ended', handleEnded); };
    }, [currentTrack, playTrack, tracksList]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;
        let isActive = true;
        const update = () => {
            if (!isActive || !audio) return;
            const ct = audio.currentTime, d = audio.duration;
            if (d && isFinite(d) && d > 0) { setDuration(d); setCurrentTime(ct); setProgress((ct / d) * 100); }
        };
        audio.addEventListener('timeupdate', update);
        audio.addEventListener('loadedmetadata', update);
        return () => { isActive = false; audio.removeEventListener('timeupdate', update); audio.removeEventListener('loadedmetadata', update); };
    }, [currentTrack]);

    const handleFirstPlay = useCallback(() => {
        if (!user) { navigate('/auth'); return; }
        if (tracksList.length === 0) return;
        // If we have a saved track, resume it; otherwise play random
        if (savedTrack) {
            const trackInList = tracksList.find(t => t.id === savedTrack.id);
            if (trackInList) playTrack(trackInList);
            else playTrack(savedTrack);
        } else {
            const first = getRandomTrack(tracksList);
            if (first) playTrack(first);
        }
    }, [playTrack, tracksList, user, navigate, savedTrack]);

    const togglePlay = useCallback(() => {
        if (!audioRef.current || !currentTrack) return;
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        if (isPlaying) {
            let cv = audioRef.current.volume;
            fadeIntervalRef.current = setInterval(() => {
                if (cv > 0.03) { cv -= 0.03; audioRef.current.volume = cv; }
                else { clearInterval(fadeIntervalRef.current); audioRef.current.pause(); audioRef.current.volume = isMuted ? 0 : volume; setIsPlaying(false); }
            }, 30);
        } else {
            audioRef.current.volume = isMuted ? 0 : volume;
            audioRef.current.play().catch(() => {}); setIsPlaying(true);
        }
    }, [isPlaying, currentTrack, isMuted, volume]);

    const handleNext = useCallback(() => {
        if (!user) { navigate('/auth'); return; }
        const avail = tracksList.filter(t => t.id !== currentTrack?.id);
        if (avail.length === 0 || tracksList.length === 1) {
            if (currentTrack && audioRef.current) { audioRef.current.currentTime = 0; setCurrentTime(0); setProgress(0); if (!isPlaying) { audioRef.current.play().catch(() => {}); setIsPlaying(true); } }
            return;
        }
        playTrack(avail[Math.floor(Math.random() * avail.length)]);
    }, [currentTrack, playTrack, isPlaying, tracksList, user, navigate]);

    const handlePrev = useCallback(() => {
        if (!user) { navigate('/auth'); return; }
        const avail = tracksList.filter(t => t.id !== currentTrack?.id);
        if (avail.length === 0 || tracksList.length === 1) {
            if (currentTrack && audioRef.current) { audioRef.current.currentTime = 0; setCurrentTime(0); setProgress(0); if (!isPlaying) { audioRef.current.play().catch(() => {}); setIsPlaying(true); } }
            return;
        }
        playTrack(avail[Math.floor(Math.random() * avail.length)]);
    }, [currentTrack, playTrack, isPlaying, tracksList, user, navigate]);

    const toggleLike = useCallback(async () => {
        if (!currentTrack || !userId) { navigate('/auth'); return; }
        const liked = await toggleLikeDB(userId, currentTrack.id);
        setIsLiked(liked);
    }, [currentTrack, userId, navigate]);

    const toggleMute = useCallback(() => { if (!audioRef.current) return; const m = !isMuted; setIsMuted(m); audioRef.current.muted = m; }, [isMuted]);

    const handleVolumeChange = useCallback((v) => { setVolume(v); if (audioRef.current) { audioRef.current.volume = v; if (v > 0 && isMuted) { setIsMuted(false); audioRef.current.muted = false; } } }, [isMuted]);

    const formatTime = (t) => {
        if (isNaN(t)) return '00:00';
        return `${Math.floor(t / 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
    };

    const seekTo = useCallback((time) => {
        if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); if (audioRef.current.duration) setProgress((time / audioRef.current.duration) * 100); }
    }, []);

    return (
        <AudioContext.Provider value={{
            hasStarted, isPlaying, isLiked, setIsLiked, toggleLike,
            progress, currentTime, duration, volume, isMuted, currentTrack,
            handleFirstPlay, togglePlay, handleNext, handlePrev,
            toggleMute, handleVolumeChange, seekTo, formatTime, playTrack, reloadTracks, tracksList,
        }}>
            {children}
        </AudioContext.Provider>
    );
}

export function useAudio() {
    const ctx = useContext(AudioContext);
    if (!ctx) throw new Error('useAudio must be used within AudioProvider');
    return ctx;
}