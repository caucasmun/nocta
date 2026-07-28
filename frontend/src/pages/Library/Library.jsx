import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { getTracks, getArtists, deleteTrack, deleteArtist, getFile } from '../../data/db';
import cn from './Library.module.css';

function Library() {
    const { user } = useAuth();
    const { playTrack, reloadTracks } = useAudio();
    const navigate = useNavigate();
    const [tracks, setTracks] = useState([]);
    const [artists, setArtists] = useState([]);
    const [activeTab, setActiveTab] = useState('tracks');
    const [coverCache, setCoverCache] = useState({});

    const loadData = async () => {
        if (user) {
            const [userTracks, userArtists] = await Promise.all([
                getTracks(user.id),
                getArtists(user.id)
            ]);
            setTracks(userTracks);
            setArtists(userArtists);
        }
    };

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        loadData();
    }, [user, navigate]);

    // Resolve covers
    useEffect(() => {
        tracks.forEach(track => {
            if (track.cover && !coverCache[track.cover]) {
                getFile(track.cover).then(url => {
                    if (url) setCoverCache(prev => ({ ...prev, [track.cover]: url }));
                });
            }
        });
    }, [tracks]);

    const handleDeleteTrack = async (trackId) => {
        if (!user) return;
        await deleteTrack(user.id, trackId);
        await loadData();
        reloadTracks();
    };

    const handleDeleteArtist = async (artistId) => {
        if (!user) return;
        await deleteArtist(user.id, artistId);
        await loadData();
    };

    // Helper to create slug from artist name
    const getArtistSlug = (artistName) => {
        return artistName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
    };

    if (!user) return null;

    return (
        <section className={cn.library}>
            <div className={cn.header}>
                <h1 className={cn.title}>Моя библиотека</h1>
                <div className={cn.tabs}>
                    <button
                        className={`${cn.tab} ${activeTab === 'tracks' ? cn.active : ''}`}
                        onClick={() => setActiveTab('tracks')}
                    >
                        Треки
                    </button>
                    <button
                        className={`${cn.tab} ${activeTab === 'artists' ? cn.active : ''}`}
                        onClick={() => setActiveTab('artists')}
                    >
                        Исполнители
                    </button>
                </div>
            </div>

            {activeTab === 'tracks' && (
                <div className={cn.content}>
                    {tracks.length === 0 ? (
                        <div className={cn.empty}>
                            <p className={cn.emptyTitle}>Треки не найдены</p>
                            <p className={cn.emptyText}>Добавьте треки, чтобы они появились здесь</p>
                            <Link to="/add" className={cn.addLink}>Добавить трек</Link>
                        </div>
                    ) : (
                        <div className={cn.trackList}>
                            {tracks.map(track => (
                                <div key={track.id} className={cn.trackItem}>
                                    <div className={cn.trackMain} onClick={() => playTrack(track)}>
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
                                    <button
                                        className={cn.deleteBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTrack(track.id);
                                        }}
                                        title="Удалить трек"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'artists' && (
                <div className={cn.content}>
                    {artists.length === 0 ? (
                        <div className={cn.empty}>
                            <p className={cn.emptyTitle}>Исполнители не найдены</p>
                            <p className={cn.emptyText}>Добавьте треки, и исполнители появятся автоматически</p>
                            <Link to="/add" className={cn.addLink}>Добавить трек</Link>
                        </div>
                    ) : (
                        <div className={cn.artistList}>
                            {artists.map(artist => (
                                <div key={artist.id} className={cn.artistItem}>
                                    <Link
                                        to={`/artist/${getArtistSlug(artist.artist)}`}
                                        className={cn.artistMain}
                                    >
                                        <div className={cn.artistPhoto} style={{ '--card-color': artist.color || '#333' }}>
                                            {artist.photo ? (
                                                <img src={artist.photo} alt={artist.artist} />
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                                </svg>
                                            )}
                                        </div>
                                        <div className={cn.artistInfo}>
                                            <p className={cn.artistName}>{artist.artist}</p>
                                        </div>
                                    </Link>
                                    <button
                                        className={cn.deleteBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteArtist(artist.id);
                                        }}
                                        title="Удалить исполнителя"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

export default Library;