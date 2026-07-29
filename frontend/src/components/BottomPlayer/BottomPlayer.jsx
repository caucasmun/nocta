import { useNavigate, useLocation } from 'react-router-dom';
import { useAudio } from '../../context/AudioContext';
import { useAuth } from '../../context/AuthContext';
import { getArtists, getFile } from '../../data/db';
import { useState, useEffect } from 'react';
import cn from './BottomPlayer.module.css';

function BottomPlayer() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [coverSrc, setCoverSrc] = useState('');
    const [showLyrics, setShowLyrics] = useState(false);
    const [showMobileVolume, setShowMobileVolume] = useState(false);
    const [artists, setArtists] = useState([]);
    const {
        hasStarted,
        isPlaying,
        isLiked,
        progress,
        currentTime,
        duration,
        volume,
        isMuted,
        currentTrack,
        togglePlay,
        toggleLike,
        handleNext,
        handlePrev,
        toggleMute,
        handleVolumeChange,
        seekTo,
        formatTime,
    } = useAudio();

    useEffect(() => {
        if (user) {
            getArtists(user.id).then(setArtists);
        } else {
            setArtists([]);
        }
    }, [user]);

    const goToArtist = () => {
        if (!currentTrack) return;
        const slug = currentTrack.artist?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
        if (slug) {
            navigate(`/artist/${slug}`);
        }
    };

    // Resolve cover
    useEffect(() => {
        if (currentTrack?.cover_url) {
            getFile(currentTrack.cover_url).then(url => {
                if (url) setCoverSrc(url);
                else setCoverSrc(currentTrack.cover_url);
            });
        } else {
            setCoverSrc('');
        }
    }, [currentTrack]);

    // Hide BottomPlayer on the home page
    if (location.pathname === '/' || location.pathname === '') {
        return null;
    }

    if (!hasStarted || !currentTrack) {
        return null;
    }

    return (
        <>
            {/* Mobile volume popup */}
            {showMobileVolume && (
                <div className={cn.mobileVolumePopup}>
                    <input
                        type="range" min="0" max="1" step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className={cn.mobileVolumeSlider}
                    />
                </div>
            )}

            {/* Lyrics sidebar panel */}
            {showLyrics && (
                <div className={cn.lyricsOverlay} onClick={() => setShowLyrics(false)}>
                    <div className={cn.lyricsPanel} onClick={e => e.stopPropagation()}>
                        <div className={cn.lyricsPanelHeader}>
                            <p className={cn.lyricsSongName}>{currentTrack.title}</p>
                            <p className={cn.lyricsArtistName}>{currentTrack.artist}</p>
                            <button className={cn.lyricsClose} onClick={() => setShowLyrics(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                        <div className={cn.lyricsPanelBody}>
                            {currentTrack.lyrics ? (
                                <pre className={cn.lyricsText}>{currentTrack.lyrics}</pre>
                            ) : (
                                <p className={cn.lyricsPlaceholder}>Текст песни не найден</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={cn.player}>
                {/* Left: track info */}
                <div className={cn.trackInfo}>
                    <div className={cn.trackArt} style={{ '--track-color': currentTrack.color || '#333' }}>
                        {coverSrc ? (
                            <img
                                src={coverSrc}
                                alt={currentTrack.title}
                                className={cn.coverImg}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    const fallback = e.target.parentElement?.querySelector('svg');
                                    if (fallback) fallback.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <svg className={coverSrc ? cn.coverFallback : ''} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                    </div>
                    <div className={cn.trackMeta}>
                        <p className={cn.trackTitle}>{currentTrack.title}</p>
                        <p className={cn.trackArtist} onClick={goToArtist} role="button" tabIndex={0}>{currentTrack.artist}</p>
                    </div>
                    <button
                        className={`${cn.likeBtn} ${isLiked ? cn.liked : ''}`}
                        onClick={toggleLike}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                    </button>
                </div>

                {/* Center: controls + progress */}
                <div className={cn.center}>
                    <div className={cn.controls}>
                        <button className={cn.ctrlBtn} onClick={handlePrev}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
                        </button>
                        <button className={cn.playBtn} onClick={togglePlay}>
                            {isPlaying ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{transform: 'translateX(1px)'}}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            )}
                        </button>
                        <button className={cn.ctrlBtn} onClick={handleNext}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                        </button>
                    </div>
                    <div className={cn.progressRow}>
                        <span className={cn.time}>{formatTime(currentTime)}</span>
                        <div 
                            className={cn.progressBar}
                            onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const percentage = clickX / rect.width;
                                const seekTime = percentage * duration;
                                seekTo(seekTime);
                            }}
                        >
                            <div className={cn.progressFill} style={{ width: `${progress}%` }}></div>
                        </div>
                        <span className={cn.time}>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Right: lyrics + volume */}
                <div className={cn.right}>
                    <button className={cn.ctrlBtn} onClick={() => setShowLyrics(true)} title="Текст песни">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                    </button>
                    <div className={cn.volumeGroup}>
                        <button
                            className={cn.ctrlBtn}
                            onClick={(e) => {
                                if (window.innerWidth <= 768) {
                                    setShowMobileVolume(!showMobileVolume);
                                } else {
                                    toggleMute();
                                }
                            }}
                            onDoubleClick={() => { if (window.innerWidth > 768) toggleMute(); }}
                            title="Громкость"
                        >
                            {isMuted || volume === 0 ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/></svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                            )}
                        </button>
                        <input
                            type="range" min="0" max="1" step="0.01"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            className={cn.volumeSlider}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

export default BottomPlayer;