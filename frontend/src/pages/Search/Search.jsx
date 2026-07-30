import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { getTracks, getArtists, getFile } from '../../data/db';
import cn from './Search.module.css';

function Search() {
    const [query, setQuery] = useState('');
    const [tracks, setTracks] = useState([]);
    const [artists, setArtists] = useState([]);
    const [coverCache, setCoverCache] = useState({});
    const { playTrack } = useAudio();
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            let cancelled = false;
            (async () => {
                const [userArtists, userTracks] = await Promise.all([
                    getArtists(user.id),
                    getTracks(user.id)
                ]);
                if (cancelled) return;
                setArtists(userArtists);
                setTracks(userTracks);
            })();
            return () => { cancelled = true; };
        } else {
            setArtists([]);
            setTracks([]);
        }
    }, [user]);

    // Resolve covers
    useEffect(() => {
        tracks.forEach(track => {
            if (track.cover_url && !coverCache[track.cover_url]) {
                getFile(track.cover_url).then(url => {
                    if (url) setCoverCache(prev => ({ ...prev, [track.cover_url]: url }));
                });
            }
        });
    }, [tracks]);

    const normalizedQuery = useMemo(() => query.toLowerCase().trim(), [query]);

    const foundTracks = useMemo(() => {
        if (!normalizedQuery) return [];
        return tracks.filter(t => {
            const titleMatch = t.title.toLowerCase().includes(normalizedQuery);
            const artistMatch = t.track_artists && Array.isArray(t.track_artists)
                ? t.track_artists.some(ta => ta.artist.toLowerCase().includes(normalizedQuery))
                : (t.artist || '').toLowerCase().includes(normalizedQuery);
            return titleMatch || artistMatch;
        });
    }, [normalizedQuery, tracks]);

    const foundArtists = useMemo(() => {
        if (!normalizedQuery) return [];
        return artists.filter(a =>
            a.artist.toLowerCase().includes(normalizedQuery)
        );
    }, [normalizedQuery, artists]);

    const hasResults = foundTracks.length > 0 || foundArtists.length > 0;

    const getArtistSlug = (artistName) => {
        return artistName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
    };

    return (
        <section className={cn.search}>
            <div className={cn.header}>
                <h1 className={cn.title}>Поиск</h1>
                <div className={cn.inputWrapper}>
                    <svg className={cn.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        type="text"
                        className={cn.input}
                        placeholder="Что хочешь послушать?"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    {query && (
                        <button className={cn.clearBtn} onClick={() => setQuery('')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className={cn.results}>
                {!normalizedQuery && (
                    <div className={cn.empty}>
                        <p className={cn.emptyTitle}>Начни поиск</p>
                        <p className={cn.emptyText}>Найди любимые треки и исполнителей</p>
                    </div>
                )}

                {normalizedQuery && !hasResults && (
                    <div className={cn.empty}>
                        <p className={cn.emptyTitle}>Ничего не найдено</p>
                        <p className={cn.emptyText}>Попробуй изменить запрос</p>
                    </div>
                )}

                {foundArtists.length > 0 && (
                    <div className={cn.section}>
                        <h2 className={cn.sectionTitle}>Исполнители</h2>
                        <div className={cn.artistGrid}>
                            {foundArtists.map(artist => (
                                <Link
                                    key={artist.id}
                                    to={`/artist/${getArtistSlug(artist.artist)}`}
                                    className={cn.artistCard}
                                    style={{ '--card-color': artist.color || '#333' }}
                                >
                                    <div className={cn.artistPhoto}>
                                        {artist.photo_url ? (
                                            <img src={artist.photo_url} alt={artist.artist} />
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                            </svg>
                                        )}
                                    </div>
                                    <p className={cn.artistName}>{artist.artist}</p>
                                    <p className={cn.artistLabel}>Исполнитель</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {foundTracks.length > 0 && (
                    <div className={cn.section}>
                        <h2 className={cn.sectionTitle}>Треки</h2>
                        <div className={cn.trackList}>
                            {foundTracks.map(track => (
                                <div 
                                    key={track.id} 
                                    className={cn.trackItem}
                                    onClick={() => playTrack(track)}
                                >
                                    <div
                                        className={cn.trackArt}
                                        style={{ '--track-color': track.color || '#333' }}
                                    >
                                        {track.cover_url && coverCache[track.cover_url] ? (
                                            <img src={coverCache[track.cover_url]} alt={track.title} className={cn.trackCoverImg} />
                                        ) : null}
                                        <svg viewBox="0 0 24 24" fill="currentColor" style={(track.cover_url && coverCache[track.cover_url]) ? { display: 'none' } : {}}>
                                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                        </svg>
                                    </div>
                                    <div className={cn.trackInfo}>
                                        <p className={cn.trackName}>{track.title}</p>
                                        <div className={cn.trackArtistsList}>
                                            {track.track_artists && Array.isArray(track.track_artists) ? (
                                                track.track_artists.map((ta, idx) => (
                                                    <span key={ta.artist_id}>
                                                        <Link
                                                            to={`/artist/${ta.slug || getArtistSlug(ta.artist)}`}
                                                            className={cn.trackArtist}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {ta.artist}
                                                        </Link>
                                                        {idx < track.track_artists.length - 1 && (
                                                            <span className={cn.featSeparator}> feat. </span>
                                                        )}
                                                    </span>
                                                ))
                                            ) : (
                                                <Link
                                                    to={`/artist/${getArtistSlug(track.artist)}`}
                                                    className={cn.trackArtist}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {track.artist}
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export default Search;