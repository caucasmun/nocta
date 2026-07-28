import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../../context/AudioContext';
import { useAuth } from '../../context/AuthContext';
import { getArtists, getFile } from '../../data/db';
import cn from './Home.module.css';

function Home() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [coverSrc, setCoverSrc] = useState('');
    const [showLyrics, setShowLyrics] = useState(false);
    const [artists, setArtists] = useState([]);
    const {
        hasStarted,
        isPlaying,
        isLiked,
        toggleLike,
        progress,
        currentTime,
        duration,
        volume,
        isMuted,
        currentTrack,
        handleFirstPlay,
        togglePlay,
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

    const goToArtist = (artistName) => {
        const slug = artistName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
        if (slug) {
            navigate(`/artist/${slug}`);
        }
    };

    // Resolve cover from uploaded files
    useEffect(() => {
        if (currentTrack?.cover) {
            getFile(currentTrack.cover).then(url => {
                if (url) setCoverSrc(url);
                else setCoverSrc(currentTrack.cover);
            });
        } else {
            setCoverSrc('');
        }
    }, [currentTrack]);

    if (!hasStarted) {
        return (
            <section className={cn.home}>
                <div className={cn['glow-container']}>
                    <div className={cn['glow-1']}></div>
                    <div className={cn['glow-2']}></div>
                </div>
                <p className={cn.title}>Моя волна</p>
                <button className={cn['start-btn']} onClick={handleFirstPlay}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                </button>
            </section>
        );
    }

    return (
        <section className={cn.home}>
            <div className={`${cn['glow-container']} ${isPlaying ? cn.playing : cn.paused}`}>
                <div className={cn['glow-1']}></div>
                <div className={cn['glow-2']}></div>
            </div>

            <p className={cn.title}>Моя волна</p>

            <div className={`${cn['cover-wrapper']} ${isPlaying ? cn['cover-visible'] : cn['cover-hidden']}`}>
                <div className={cn['cover-block']}>
                    <p className={cn['cover-song-name']}>{currentTrack?.title}</p>
                    <div
                        className={cn['cover-artwork']}
                        style={{ '--cover-color': currentTrack?.color || '#ff6b00' }}
                    >
                        {coverSrc ? (
                            <img
                                src={coverSrc}
                                alt={currentTrack?.title}
                                className={cn['cover-image']}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                        ) : null}
                        <svg viewBox="0 0 24 24" fill="currentColor" className={cn['cover-note-icon']} style={coverSrc ? { display: 'none' } : {}}>
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                    </div>
                    <p className={cn['cover-artist-name']} onClick={() => goToArtist(currentTrack?.artist)} role="button" tabIndex={0}>{currentTrack?.artist}</p>
                </div>
            </div>

            <div className={cn['audio-player']}>
                <div className={cn['player-track-info']}>
                    <div className={cn['volume-block']}>
                        <div className={cn['volume-slider-container']}>
                            <input 
                                type="range" min="0" max="1" step="0.01" 
                                value={isMuted ? 0 : volume} onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                className={cn['volume-slider']}
                            />
                        </div>
                        <button className={cn['player-btn']} onClick={toggleMute}>
                            {isMuted || volume === 0 ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/></svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                            )}
                        </button>
                    </div>

                    <div className={cn['track-center']}
                        onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const percentage = clickX / rect.width;
                            const seekTime = percentage * duration;
                            seekTo(seekTime);
                        }}
                    >
                        <div className={cn['progress-bar-bg']} style={{ width: `${progress}%` }}></div>
                        <div className={cn['track-meta']}>
                            {isPlaying ? (
                                <span className={cn['track-time-only']}>
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </span>
                            ) : (
                                <>
                                    <span className={cn['track-title-paused']}>
                                        {currentTrack?.title} — {currentTrack?.artist}
                                    </span>
                                    <span className={cn['track-time-paused']}>
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </span>
                                </>
                            )}
                            <button className={cn['info-btn']} onClick={(e) => e.stopPropagation()}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            </button>
                        </div>
                    </div>

                    <div className={cn['actions-block']}>
                        <button 
                            className={`${cn['player-btn']} ${cn['heart-btn']} ${isLiked ? cn.active : ''}`}
                            onClick={toggleLike}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                        </button>
                        <button className={cn['player-btn']} onClick={() => setShowLyrics(true)} title="Текст песни">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div className={cn['player-controls']}>
                    <button className={`${cn['control-btn']} ${cn['prev-btn']}`} onClick={handlePrev}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
                    </button>
                    <button className={`${cn['control-btn']} ${cn['play-btn']}`} onClick={togglePlay}>
                        {isPlaying ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                        ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{transform: 'translateX(2px)'}}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        )}
                    </button>
                    <button className={`${cn['control-btn']} ${cn['next-btn']}`} onClick={handleNext}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                    </button>
                </div>
            </div>

            {/* Lyrics sidebar panel */}
            {showLyrics && currentTrack && (
                <div className={cn['lyrics-overlay']} onClick={() => setShowLyrics(false)}>
                    <div className={cn['lyrics-panel']} onClick={e => e.stopPropagation()}>
                        <div className={cn['lyrics-panel-header']}>
                            <p className={cn['lyrics-song-name']}>{currentTrack.title}</p>
                            <p className={cn['lyrics-artist-name']}>{currentTrack.artist}</p>
                            <button className={cn['lyrics-close']} onClick={() => setShowLyrics(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                        <div className={cn['lyrics-panel-body']}>
                            {currentTrack.lyrics ? (
                                <pre className={cn['lyrics-text']}>{currentTrack.lyrics}</pre>
                            ) : (
                                <p className={cn['lyrics-placeholder']}>Текст песни не найден</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Home;