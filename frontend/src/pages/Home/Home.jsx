import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
    const [accentColor, setAccentColor] = useState('255, 107, 0');
    const coverRef = useRef(null);
    const vinylRef = useRef(null);

    // Audio analysis refs
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const rafRef = useRef(null);
    const accentColorRef = useRef('255, 107, 0');
    const isPlayingRef = useRef(false);

    // Canvas refs
    const visualizerCanvasRef = useRef(null);
    const particlesCanvasRef = useRef(null);
    const ringCanvasRef = useRef(null);

    // Animation state refs (no setState in rAF)
    const particlesRef = useRef([]);
    const smoothBassRef = useRef(0);
    const rotationRef = useRef(0);
    const smoothSpeedRef = useRef(0);
    const smoothBarsRef = useRef(new Float32Array(64));
    const smoothRingRef = useRef(new Float32Array(64));
    const fakeDataRef = useRef(new Uint8Array(128));
    const swipeStartRef = useRef(null);
    const wheelTimeoutRef = useRef(null);
    const swipeTimeoutRef = useRef(null);
    const sectionRef = useRef(null);
    const [swipeAnim, setSwipeAnim] = useState(null);

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
        audioRef,
    } = useAudio();

    // Update refs directly in render body (safe, no re-render triggered)
    accentColorRef.current = accentColor;
    isPlayingRef.current = isPlaying;

    useEffect(() => {
        if (user) {
            getArtists(user.id).then(setArtists);
        } else {
            setArtists([]);
        }
    }, [user]);

    const goToArtist = useCallback((slug) => {
        if (slug) {
            navigate(`/artist/${slug}`);
        }
    }, [navigate]);

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

    // Note: createMediaElementSource causes audio playback issues on some browsers
    // (it reroutes audio through AudioContext which may be suspended).
    // Using simulated visualizer data instead for reliability — still looks realistic
    // and responds to play/pause state with smooth animations.

    // Extract dominant color from cover image using Canvas
    useEffect(() => {
        if (!coverSrc) { setAccentColor('255, 107, 0'); return; }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 50;
            canvas.width = size;
            canvas.height = size;
            ctx.drawImage(img, 0, 0, size, size);
            try {
                const data = ctx.getImageData(0, 0, size, size).data;
                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 4) {
                    const br = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    if (br > 30 && br < 230) {
                        r += data[i];
                        g += data[i + 1];
                        b += data[i + 2];
                        count++;
                    }
                }
                if (count > 0) {
                    r = Math.round(r / count);
                    g = Math.round(g / count);
                    b = Math.round(b / count);
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    if (max > min) {
                        r = Math.min(255, Math.round(r + (r - min) * 0.5));
                        g = Math.min(255, Math.round(g + (g - min) * 0.5));
                        b = Math.min(255, Math.round(b + (b - min) * 0.5));
                    }
                    setAccentColor(`${r}, ${g}, ${b}`);
                }
            } catch (e) {}
        };
        img.onerror = () => {};
        img.src = coverSrc;
    }, [coverSrc]);

    // Initialize particles — fewer on mobile for performance
    useEffect(() => {
        if (!hasStarted) return;
        const isMobile = window.innerWidth < 768;
        const count = isMobile ? 40 : 70;
        const particles = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                size: Math.random() * 2 + 0.5,
                baseOpacity: Math.random() * 0.4 + 0.1,
                phase: Math.random() * Math.PI * 2,
            });
        }
        particlesRef.current = particles;
    }, [hasStarted]);

    // Resize particles canvas
    useEffect(() => {
        if (!hasStarted) return;
        const handleResize = () => {
            if (particlesCanvasRef.current) {
                particlesCanvasRef.current.width = window.innerWidth;
                particlesCanvasRef.current.height = window.innerHeight;
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [hasStarted]);

    // Main animation loop — runs only when fullscreen player is open
    useEffect(() => {
        if (!hasStarted) return;

        const animate = () => {
            const data = fakeDataRef.current;
            let bass = 0;
            let hasData = false;

            // Generate simulated frequency data — realistic looking
            if (isPlayingRef.current) {
                const time = performance.now() / 1000;
                for (let i = 0; i < data.length; i++) {
                    const freq = i / data.length;
                    const val = (0.4 * Math.sin(time * 3 + i * 0.2) + 0.3 * Math.sin(time * 5 + i * 0.5)) * (1 - freq * 0.4) + 0.15 * Math.random();
                    data[i] = Math.max(0, Math.min(255, val * 255));
                }
                hasData = true;
                for (let i = 0; i < 10; i++) bass += data[i];
                bass = bass / 10 / 255;
            }

            // Smooth values — slower interpolation = smoother visuals
            const targetBass = hasData ? bass : 0;
            smoothBassRef.current += (targetBass - smoothBassRef.current) * 0.05;
            const targetSpeed = isPlayingRef.current ? 1 : 0;
            smoothSpeedRef.current += (targetSpeed - smoothSpeedRef.current) * 0.02;

            // Update vinyl rotation and scale via CSS custom properties
            if (vinylRef.current) {
                rotationRef.current += smoothSpeedRef.current * 0.75;
                const scale = 1 + smoothBassRef.current * 0.02;
                vinylRef.current.style.setProperty('--vinyl-rotation', `${rotationRef.current}deg`);
                vinylRef.current.style.setProperty('--vinyl-scale', `${scale}`);
            }

            // Draw visualizer (64 bands) with per-bar smoothing
            const vCanvas = visualizerCanvasRef.current;
            if (vCanvas) {
                const vCtx = vCanvas.getContext('2d');
                vCtx.clearRect(0, 0, vCanvas.width, vCanvas.height);
                const bars = 64;
                const barWidth = vCanvas.width / bars;
                const smoothBars = smoothBarsRef.current;
                for (let i = 0; i < bars; i++) {
                    const idx = data ? Math.floor(i * data.length / bars) : 0;
                    const val = data && hasData ? data[idx] / 255 : 0;
                    smoothBars[i] += (val - smoothBars[i]) * 0.15;
                    const h = Math.max(1.5, smoothBars[i] * vCanvas.height);
                    const barH = Math.min(h, vCanvas.height);
                    vCtx.fillStyle = `rgba(${accentColorRef.current}, ${0.3 + smoothBars[i] * 0.7})`;
                    vCtx.fillRect(i * barWidth, vCanvas.height - barH, barWidth - 1, barH);
                }
            }

            // Draw floating particles — use fillRect for performance
            const pCanvas = particlesCanvasRef.current;
            if (pCanvas) {
                const pCtx = pCanvas.getContext('2d');
                pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
                const particles = particlesRef.current;
                const bassBoost = smoothBassRef.current;
                for (const p of particles) {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.phase += 0.008;
                    if (p.x < 0) p.x = pCanvas.width;
                    if (p.x > pCanvas.width) p.x = 0;
                    if (p.y < 0) p.y = pCanvas.height;
                    if (p.y > pCanvas.height) p.y = 0;
                    const opacity = p.baseOpacity * (0.5 + 0.5 * Math.sin(p.phase)) * (1 + bassBoost * 0.4);
                    const size = p.size * (1 + bassBoost * 0.25);
                    pCtx.fillStyle = `rgba(${accentColorRef.current}, ${Math.min(1, opacity)})`;
                    pCtx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
                }
            }

            // Draw spectrum ring with per-bar smoothing
            const rCanvas = ringCanvasRef.current;
            if (rCanvas) {
                const rCtx = rCanvas.getContext('2d');
                rCtx.clearRect(0, 0, rCanvas.width, rCanvas.height);
                const cx = rCanvas.width / 2;
                const cy = rCanvas.height / 2;
                const radius = Math.min(cx, cy) - 10;
                const bars = 64;
                const smoothRing = smoothRingRef.current;
                for (let i = 0; i < bars; i++) {
                    const angle = (i / bars) * Math.PI * 2;
                    const idx = data ? Math.floor(i * data.length / bars) : 0;
                    const val = data && hasData ? data[idx] / 255 : 0;
                    smoothRing[i] += (val - smoothRing[i]) * 0.12;
                    const len = 4 + smoothRing[i] * 22;
                    const x1 = cx + Math.cos(angle) * radius;
                    const y1 = cy + Math.sin(angle) * radius;
                    const x2 = cx + Math.cos(angle) * (radius + len);
                    const y2 = cy + Math.sin(angle) * (radius + len);
                    rCtx.strokeStyle = `rgba(${accentColorRef.current}, ${0.35 + smoothRing[i] * 0.65})`;
                    rCtx.lineWidth = 2;
                    rCtx.beginPath();
                    rCtx.moveTo(x1, y1);
                    rCtx.lineTo(x2, y2);
                    rCtx.stroke();
                }
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [hasStarted]);

    // 3D tilt effect on mouse move
    const handleMouseMove = useCallback((e) => {
        if (!coverRef.current) return;
        const rect = coverRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setMousePos({ x, y });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setMousePos({ x: 0, y: 0 });
    }, []);

    // Touch support for mobile tilt
    const handleTouchMove = useCallback((e) => {
        if (!coverRef.current || !e.touches[0]) return;
        const rect = coverRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) / rect.width - 0.5;
        const y = (touch.clientY - rect.top) / rect.height - 0.5;
        setMousePos({ x, y });
    }, []);

    // Swipe gesture: desktop mouse drag, mobile touch, touchpad two-finger
    const SWIPE_THRESHOLD = 80;

    const isInteractiveTarget = (target) => {
        return target.closest?.('button, input, a, .track-center, .volume-block, .icon-btn, .control-btn');
    };

    const handleSwipeStart = useCallback((clientX, clientY, target) => {
        if (isInteractiveTarget(target)) return;
        swipeStartRef.current = { x: clientX, y: clientY, time: Date.now() };
    }, []);

    const handleSwipeEnd = useCallback((clientX, clientY) => {
        if (!swipeStartRef.current) return;
        const start = swipeStartRef.current;
        swipeStartRef.current = null;
        const dx = clientX - start.x;
        const dy = clientY - start.y;
        const dt = Date.now() - start.time;
        if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 1000) {
            if (dx < 0) {
                setSwipeAnim('left');
                handleNext();
            } else {
                setSwipeAnim('right');
                handlePrev();
            }
            if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
            swipeTimeoutRef.current = setTimeout(() => setSwipeAnim(null), 400);
        }
    }, [handleNext, handlePrev]);

    const handleSwipeMouseDown = useCallback((e) => {
        // Prevent text/image selection during swipe drag
        if (!isInteractiveTarget(e.target)) {
            e.preventDefault();
        }
        handleSwipeStart(e.clientX, e.clientY, e.target);
    }, [handleSwipeStart]);

    const handleSwipeMouseUp = useCallback((e) => {
        handleSwipeEnd(e.clientX, e.clientY);
    }, [handleSwipeEnd]);

    const handleSwipeTouchStart = useCallback((e) => {
        if (!e.touches[0]) return;
        handleSwipeStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, [handleSwipeStart]);

    const handleSwipeTouchEnd = useCallback((e) => {
        if (!e.changedTouches[0]) return;
        handleSwipeEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }, [handleSwipeEnd]);

    // Touchpad two-finger horizontal swipe (wheel event)
    const handleSwipeWheel = useCallback((e) => {
        if (Math.abs(e.deltaX) < 30) return;
        if (wheelTimeoutRef.current) return;
        if (e.deltaX > 0) {
            setSwipeAnim('left');
            handleNext();
        } else {
            setSwipeAnim('right');
            handlePrev();
        }
        if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
        swipeTimeoutRef.current = setTimeout(() => setSwipeAnim(null), 400);
        wheelTimeoutRef.current = setTimeout(() => {
            wheelTimeoutRef.current = null;
        }, 600);
    }, [handleNext, handlePrev]);

    // Native wheel listener with passive: false to prevent browser back/forward navigation
    useEffect(() => {
        if (!hasStarted) return;
        const section = sectionRef.current;
        if (!section) return;
        const handleWheelNative = (e) => {
            if (Math.abs(e.deltaX) > 30) {
                e.preventDefault();
            }
        };
        section.addEventListener('wheel', handleWheelNative, { passive: false });
        return () => section.removeEventListener('wheel', handleWheelNative);
    }, [hasStarted]);

    const trackArtists = useMemo(() =>
        (currentTrack?.track_artists && Array.isArray(currentTrack.track_artists)) ? currentTrack.track_artists : [],
        [currentTrack]
    );

    if (!hasStarted) {
        return (
            <section className={cn.home} style={{ '--accent-color': accentColor }}>
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

    return (
        <section
            ref={sectionRef}
            className={`${cn.home} ${swipeAnim === 'left' ? cn['swipe-left'] : ''} ${swipeAnim === 'right' ? cn['swipe-right'] : ''}`}
            style={{ '--accent-color': accentColor, '--mouse-x': mousePos.x, '--mouse-y': mousePos.y }}
            onMouseDown={handleSwipeMouseDown}
            onMouseUp={handleSwipeMouseUp}
            onTouchStart={handleSwipeTouchStart}
            onTouchEnd={handleSwipeTouchEnd}
            onWheel={handleSwipeWheel}
        >
            {/* Dynamic ambient background */}
            <div className={cn['ambient-bg']}></div>

            {/* Floating particles canvas */}
            <canvas ref={particlesCanvasRef} className={cn['particles-canvas']}></canvas>

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
                        onTouchMove={handleTouchMove}
                    >
                        {/* Spectrum ring canvas */}
                        <canvas ref={ringCanvasRef} className={cn['ring-canvas']} width={320} height={320}></canvas>

                        {/* Spinning vinyl record */}
                        <div className={`${cn.vinyl} ${isPlaying ? cn['vinyl-spinning'] : ''}`} ref={vinylRef}>
                            <div className={cn['vinyl-grooves']}></div>
                            <div className={cn['vinyl-center']}></div>
                        </div>

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

                        {/* Audio visualizer canvas (replaces decorative equalizer) */}
                        <canvas ref={visualizerCanvasRef} className={cn['visualizer-canvas']} width={120} height={40}></canvas>
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

                {/* Controls */}
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

                {/* Like & lyrics buttons — bottom right, not affecting layout */}
                <div className={cn['player-actions']}>
                    <button
                        className={`${cn['icon-btn']} ${cn['heart-btn']} ${isLiked ? cn.active : ''}`}
                        onClick={toggleLike}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
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