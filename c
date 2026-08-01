import { useState, useEffect, useRef } from 'react';
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
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const coverRef = useRef(null);
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

    const goToArtist = (slug) => {
        if (slug) {
            navigate(`/artist/${slug}`);
        }
    };

    // Resolve cover from uploaded files
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

    // 3D tilt effect on mouse move
    const handleMouseMove = (e) => {
        if (!coverRef.current) return;
        const rect = coverRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setMousePos({ x, y });
    };

    const handleMouseLeave = () => {
        setMousePos({ x: 0, y: 0 });
    };

    if (!hasStarted) {
        return (
            <section className={cn.home}>
                <div className={cn['glow-container']}>
                    <div className={cn['glow-1']}></div>
                    <div className={cn['glow-2']}></div>
                    <div className={cn['glow-3']}></div>
                </div>

                {/* Grain overlay */}
                <div className={cn.grain}></div>

                <div className={cn['start-screen']}>
                    <div className={cn['start-equalizer']}>
                        {[...Array(7)].map((_, i) => (
                            <span key={i} className={cn['eq-bar']} style={{ '--delay': `${i * 0.15}s` }} />
                        ))}
                    </div>
                    <p className={cn.title}>Моя волна</p>
                    <p className={cn.subtitle}>Нажми, чтобы начать слушать</p>
                    <button className={cn['start-btn']} onClick={handleFirstPlay}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        <span className={cn['start-btn-ring']}></span>
                        <span className={cn['start-btn-ring2']}></span>
                    </button>
                </div>
            </section>
        );
    }

    const trackArtists = (currentTrack?.track_artists && Array.isArray(currentTrack.track_artists)) ? currentTrack.track_artists : [];

    return (
        <section className={cn.home}>
            <div className={`${cn['glow-container']} ${isPlaying ? cn.playing : cn.paused}`}>
                <div className={cn['glow-1']}></div>
                <div className={cn['glow-2']}></div>
                <div className={cn['glow-3']}></div>
            </div>

            {/* Grain overlay */}
            <div className={cn.grain}></div>

            <p className={cn.title}>Моя волна</p>

            <div className={`${cn['cover-wrapper']} ${isPlaying ? cn['cover-visible'] : cn['cover-hidden']}`}>
                <div className={cn['cover-block']}>
                    <p className={cn['cover-song-name']}>{currentTrack?.title}</p>

                    {/* Vinyl + Cover with 3D tilt */}
                    <div
                        className={cn['cover-stage']}
                        ref={coverRef}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                        {/* Spinning vinyl record */}
                        <div className={`${cn.vinyl} ${isPlaying ? cn['vinyl-spinning'] : ''}`}>
                            <div className={cn['vinyl-grooves']}></div>
                            <div className={cn['vinyl-center']}></div>
                        </div>

                        {/* Glowing ring */}
                        <div className={cn['cover-ring']} style={{ '--cover-color': currentTrack?.color || '#ff6b00' }}></div>

                        {/* Cover artwork with 3D tilt */}
                        <div
                            className={cn['cover-artwork']}
                            style={{
                                '--cover-color': currentTrack?.color || '#ff6b00',
                                '--tilt-x': `${mousePos.y * -15}deg`,
                                '--tilt-y': `${mousePos.x * 15}deg`,
                            }}
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

                        {/* Equalizer bars overlay */}
                        {isPlaying && (
                            <div className={cn['cover-equalizer']}>
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className={cn['cover-eq-bar']} style={{ '--delay': `${i * 0.2}s` }} />
                                ))}
                            </div>
                        )}
                    </div>

                    <p className={cn['cover-artist-name']}>
                        {trackArtists.map((ta, idx) => (
                            <span key={ta.artist_id}>
                                <span
                                    className={cn['artist-link']}
                                    onClick={() => goToArtist(ta.slug)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    {ta.artist}
                                </span>
                                {idx < trackArtists.length - 1 && <span className={cn['feat-separator']}> feat. </span>}
                            </span>
                        ))}
                    </p>
                </div>
            </div>

            <div className={cn['audio-player']}>
                {/* Track info row — title/artist only when paused */}
                {!isPlaying && (
                    <div className={cn['player-track-row']}>
                        <div className={cn['player-track-text']}>
                            <span className={cn['player-track-title']}>{currentTrack?.title}</span>
                            <span className={cn['player-track-artist']}>
                                {trackArtists.map((ta, idx) => (
                                    <span key={ta.artist_id}>
                                        <span
                                            className={cn['artist-link']}
                                            onClick={() => goToArtist(ta.slug)}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            {ta.artist}
                                        </span>
                                        {idx < trackArtists.length - 1 && <span className={cn['feat-separator']}> feat. </span>}
                                    </span>
                                ))}
                            </span>
                        </div>
                    </div>
                )}

                {/* Progress bar */}
                <div className={cn['progress-row']}>
                    <div className={cn['volume-block']}>
                        <div className={cn['volume-slider-container']}>
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={isMuted ? 0 : volume} onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                className={cn['volume-slider']}
                            />
                        </div>
                        <button className={cn['icon-btn']} onClick={toggleMute}>
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
                            <span className={cn['track-time']}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Controls — with like and lyrics buttons on the sides */}
                <div className={cn['player-controls']}>
                    <button
                        className={`${cn['icon-btn']} ${cn['heart-btn']} ${isLiked ? cn.active : ''}`}
                        onClick={toggleLike}
                        title="Лайк"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                    </button>
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
                    <button className={cn['icon-btn']} onClick={() => setShowLyrics(true)} title="Текст песни">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Lyrics sidebar panel */}
            {showLyrics && currentTrack && (
                <div className={cn['lyrics-overlay']} onClick={() => setShowLyrics(false)}>
                    <div className={cn['lyrics-panel']} onClick={e => e.stopPropagation()}>
                        <div className={cn['lyrics-panel-header']}>
                            <p className={cn['lyrics-song-name']}>{currentTrack.title}</p>
                            <p className={cn['lyrics-artist-name']}>
                                {trackArtists.map(ta => ta.artist).join(' feat. ')}
                            </p>
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