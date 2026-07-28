import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { getTracks, getLikedTracks, getArtists, getFile } from '../../data/db';
import cn from './Liked.module.css';

function Liked() {
    const { user } = useAuth();
    const { playTrack } = useAudio();
    const navigate = useNavigate();
    const [tracks, setTracks] = useState([]);
    const [artists, setArtists] = useState([]);
    const [coverCache, setCoverCache] = useState({});

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }

        let cancelled = false;
        (async () => {
            const [allTracks, likedIds, userArtists] = await Promise.all([
                getTracks(user.id),
                getLikedTracks(user.id),
                getArtists(user.id)
            ]);
            if (cancelled) return;
            const likedTracks = allTracks.filter(t => likedIds.includes(t.id));
            setTracks(likedTracks);
            setArtists(userArtists);

            // Resolve covers
            likedTracks.forEach(track => {
                if (track.cover && !coverCache[track.cover]) {
                    getFile(track.cover).then(url => {
                        if (url) setCoverCache(prev => ({ ...prev, [track.cover]: url }));
                    });
                }
            });
        })();

        return () => { cancelled = true; };
    }, [user, navigate]);

    const getArtistSlug = (artistName) => {
        return artistName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
    };

    if (!user) return null;

    return (
        <section className={cn.liked}>
            <div className={cn.header}>
                <h1 className={cn.title}>Любимые треки</h1>
            </div>

            <div className={cn.content}>
                {tracks.length === 0 ? (
                    <div className={cn.empty}>
                        <p className={cn.emptyTitle}>Любимых треков нет</p>
                        <p className={cn.emptyText}>Ставьте лайки трекам, чтобы они появились здесь</p>
                        <Link to="/" className={cn.homeLink}>На главную</Link>
                    </div>
                ) : (
                    <div className={cn.trackList}>
                        {tracks.map(track => (
                            <div 
                                key={track.id} 
                                className={cn.trackItem}
                                onClick={() => playTrack(track)}
                            >
                                <div className={cn.trackArt} style={{ '--track-color': track.color || '#333' }}>
                                    {track.cover && coverCache[track.cover] ? (
                                        <img src={coverCache[track.cover]} alt={track.title} className={cn.trackCoverImg} />
                                    ) : null}
                                    <svg viewBox="0 0 24 24" fill="currentColor" style={(track.cover && coverCache[track.cover]) ? { display: 'none' } : {}}>
                                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                    </svg>
                                </div>
                                <div className={cn.trackInfo}>
                                    <p className={cn.trackName}>{track.title}</p>
                                    <Link
                                        to={`/artist/${getArtistSlug(track.artist)}`}
                                        className={cn.trackArtist}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {track.artist}
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default Liked;