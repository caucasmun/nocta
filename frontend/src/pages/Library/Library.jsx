import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { getTracks, getArtists, deleteTrack, deleteArtist, getFile } from '../../data/db';
import { fetchPlaylists, createPlaylist, deletePlaylist, fetchPlaylistTracks, addTrackToPlaylist, removeTrackFromPlaylist } from '../../data/api';
import cn from './Library.module.css';

function Library() {
    const { user } = useAuth();
    const { playTrack, reloadTracks } = useAudio();
    const navigate = useNavigate();
    const [tracks, setTracks] = useState([]);
    const [artists, setArtists] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [activeTab, setActiveTab] = useState('tracks');
    const [coverCache, setCoverCache] = useState({});
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newPlaylistColor, setNewPlaylistColor] = useState('#1db954');
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistTracks, setPlaylistTracks] = useState([]);
    const [showAddTrackModal, setShowAddTrackModal] = useState(false);

    const loadData = async () => {
        if (user) {
            const [userTracks, userArtists, userPlaylists] = await Promise.all([
                getTracks(user.id),
                getArtists(user.id),
                fetchPlaylists(user.id)
            ]);
            setTracks(userTracks);
            setArtists(userArtists);
            setPlaylists(userPlaylists);
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
            if (track.cover_url && !coverCache[track.cover_url]) {
                getFile(track.cover_url).then(url => {
                    if (url) setCoverCache(prev => ({ ...prev, [track.cover_url]: url }));
                });
            }
        });
    }, [tracks]);

    // Resolve artist photos (относительные /uploads/... пути через API origin)
    useEffect(() => {
        artists.forEach(artist => {
            if (artist.photo_url && !artist.photo_url.startsWith('http') && !artist.photo_url.startsWith('data:')) {
                getFile(artist.photo_url).then(url => {
                    if (url) {
                        setArtists(prev => prev.map(a => a.id === artist.id ? { ...a, photo_url: url } : a));
                    }
                });
            }
        });
    }, [artists]);

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

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        if (!user || !newPlaylistName.trim()) return;
        try {
            await createPlaylist(user.id, {
                name: newPlaylistName.trim(),
                color: newPlaylistColor,
            });
            setNewPlaylistName('');
            setNewPlaylistColor('#1db954');
            setShowCreatePlaylist(false);
            await loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeletePlaylist = async (playlistId) => {
        try {
            await deletePlaylist(playlistId);
            if (selectedPlaylist?.id === playlistId) {
                setSelectedPlaylist(null);
                setPlaylistTracks([]);
            }
            await loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const openPlaylist = async (playlist) => {
        setSelectedPlaylist(playlist);
        const plTracks = await fetchPlaylistTracks(playlist.id);
        setPlaylistTracks(plTracks);
        // Resolve covers for playlist tracks
        plTracks.forEach(track => {
            if (track.cover_url && !coverCache[track.cover_url]) {
                getFile(track.cover_url).then(url => {
                    if (url) setCoverCache(prev => ({ ...prev, [track.cover_url]: url }));
                });
            }
        });
    };

    const handleAddTrackToPlaylist = async (trackId) => {
        if (!selectedPlaylist) return;
        try {
            await addTrackToPlaylist(selectedPlaylist.id, trackId);
            const plTracks = await fetchPlaylistTracks(selectedPlaylist.id);
            setPlaylistTracks(plTracks);
            setShowAddTrackModal(false);
            await loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveFromPlaylist = async (trackId) => {
        if (!selectedPlaylist) return;
        try {
            await removeTrackFromPlaylist(selectedPlaylist.id, trackId);
            const plTracks = await fetchPlaylistTracks(selectedPlaylist.id);
            setPlaylistTracks(plTracks);
            await loadData();
        } catch (err) {
            console.error(err);
        }
    };

    // Helper to create slug from artist name
    const getArtistSlug = (artistName) => {
        return artistName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
    };

    if (!user) return null;

    // Playlist detail view
    if (selectedPlaylist) {
        return (
            <section className={cn.library}>
                <div className={cn.header}>
                    <button className={cn.backBtn} onClick={() => setSelectedPlaylist(null)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                        Назад
                    </button>
                </div>

                <div className={cn.playlistHeader} style={{ '--pl-color': selectedPlaylist.color || '#1db954' }}>
                    <div className={cn.playlistCover}>
                        {selectedPlaylist.cover_url && coverCache[selectedPlaylist.cover_url] ? (
                            <img src={coverCache[selectedPlaylist.cover_url]} alt={selectedPlaylist.name} />
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                            </svg>
                        )}
                    </div>
                    <div className={cn.playlistInfo}>
                        <p className={cn.playlistLabel}>Плейлист</p>
                        <h1 className={cn.playlistName}>{selectedPlaylist.name}</h1>
                        <p className={cn.playlistStats}>{playlistTracks.length} треков</p>
                    </div>
                </div>

                <div className={cn.content}>
                    <div className={cn.playlistActions}>
                        <button className={cn.addTrackBtn} onClick={() => setShowAddTrackModal(true)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Добавить трек
                        </button>
                    </div>

                    {playlistTracks.length === 0 ? (
                        <div className={cn.empty}>
                            <p className={cn.emptyTitle}>Плейлист пуст</p>
                            <p className={cn.emptyText}>Добавьте треки в этот плейлист</p>
                        </div>
                    ) : (
                        <div className={cn.trackList}>
                            {playlistTracks.map((track, idx) => (
                                <div key={track.id} className={cn.trackItem}>
                                    <div className={cn.trackMain} onClick={() => playTrack(track)}>
                                        <div className={cn.trackNum}>{idx + 1}</div>
                                        <div className={cn.trackArt} style={{ '--track-color': track.color || '#333' }}>
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
                                                    track.track_artists.map((ta, i) => (
                                                        <span key={ta.artist_id}>
                                                            <Link
                                                                to={`/artist/${ta.slug || getArtistSlug(ta.artist)}`}
                                                                className={cn.trackArtist}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {ta.artist}
                                                            </Link>
                                                            {i < track.track_artists.length - 1 && (
                                                                <span className={cn.featSeparator}> feat. </span>
                                                            )}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className={cn.trackArtist}>{track.artist}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className={cn.deleteBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveFromPlaylist(track.id);
                                        }}
                                        title="Убрать из плейлиста"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add track modal */}
                {showAddTrackModal && (
                    <div className={cn.modal} onClick={() => setShowAddTrackModal(false)}>
                        <div className={cn.modalContent} onClick={e => e.stopPropagation()}>
                            <div className={cn.modalHeader}>
                                <h2 className={cn.modalTitle}>Добавить трек в плейлист</h2>
                                <button className={cn.modalClose} onClick={() => setShowAddTrackModal(false)}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </button>
                            </div>
                            <div className={cn.modalTrackList}>
                                {tracks.filter(t => !playlistTracks.some(pt => pt.id === t.id)).map(track => (
                                    <div
                                        key={track.id}
                                        className={cn.modalTrackItem}
                                        onClick={() => handleAddTrackToPlaylist(track.id)}
                                    >
                                        <div className={cn.trackArt} style={{ '--track-color': track.color || '#333' }}>
                                            {track.cover_url && coverCache[track.cover_url] ? (
                                                <img src={coverCache[track.cover_url]} alt={track.title} className={cn.trackCoverImg} />
                                            ) : null}
                                            <svg viewBox="0 0 24 24" fill="currentColor" style={(track.cover_url && coverCache[track.cover_url]) ? { display: 'none' } : {}}>
                                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                            </svg>
                                        </div>
                                        <div className={cn.trackInfo}>
                                            <p className={cn.trackName}>{track.title}</p>
                                            <p className={cn.trackArtist}>
                                                {track.track_artists?.map(ta => ta.artist).join(' feat. ') || track.artist}
                                            </p>
                                        </div>
                                        <svg className={cn.addIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1db954" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                        </svg>
                                    </div>
                                ))}
                                {tracks.filter(t => !playlistTracks.some(pt => pt.id === t.id)).length === 0 && (
                                    <p className={cn.emptyText}>Все треки уже добавлены</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </section>
        );
    }

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
                    <button
                        className={`${cn.tab} ${activeTab === 'playlists' ? cn.active : ''}`}
                        onClick={() => setActiveTab('playlists')}
                    >
                        Плейлисты
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
                                            {artist.photo_url ? (
                                                <img src={artist.photo_url} alt={artist.artist} />
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

            {activeTab === 'playlists' && (
                <div className={cn.content}>
                    <div className={cn.playlistActions}>
                        <button className={cn.createPlaylistBtn} onClick={() => setShowCreatePlaylist(true)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Создать плейлист
                        </button>
                    </div>

                    {playlists.length === 0 && !showCreatePlaylist ? (
                        <div className={cn.empty}>
                            <p className={cn.emptyTitle}>Плейлисты не найдены</p>
                            <p className={cn.emptyText}>Создайте свой первый плейлист</p>
                        </div>
                    ) : (
                        <div className={cn.playlistGrid}>
                            {playlists.map(pl => (
                                <div key={pl.id} className={cn.playlistCard}>
                                    <div className={cn.playlistCardMain} onClick={() => openPlaylist(pl)}>
                                        <div className={cn.playlistCardCover} style={{ '--pl-color': pl.color || '#1db954' }}>
                                            {pl.cover_url && coverCache[pl.cover_url] ? (
                                                <img src={coverCache[pl.cover_url]} alt={pl.name} />
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                                </svg>
                                            )}
                                        </div>
                                        <div className={cn.playlistCardInfo}>
                                            <p className={cn.playlistCardName}>{pl.name}</p>
                                            <p className={cn.playlistCardCount}>{pl.track_count || 0} треков</p>
                                        </div>
                                    </div>
                                    <button
                                        className={cn.deleteBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletePlaylist(pl.id);
                                        }}
                                        title="Удалить плейлист"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Create playlist form */}
                    {showCreatePlaylist && (
                        <div className={cn.createForm}>
                            <form onSubmit={handleCreatePlaylist}>
                                <input
                                    type="text"
                                    className={cn.createInput}
                                    placeholder="Название плейлиста"
                                    value={newPlaylistName}
                                    onChange={(e) => setNewPlaylistName(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <div className={cn.colorRow}>
                                    <label className={cn.colorLabel}>Цвет:</label>
                                    <input
                                        type="color"
                                        value={newPlaylistColor}
                                        onChange={(e) => setNewPlaylistColor(e.target.value)}
                                        className={cn.colorInput}
                                    />
                                </div>
                                <div className={cn.formActions}>
                                    <button type="submit" className={cn.submitBtn}>Создать</button>
                                    <button type="button" className={cn.cancelBtn} onClick={() => setShowCreatePlaylist(false)}>Отмена</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

export default Library;
