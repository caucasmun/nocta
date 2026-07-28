import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { getArtists, getTracks, getFile } from '../../data/db';
import cn from './Artist.module.css';

function Artist() {
    const { slug } = useParams();
    const { user } = useAuth();
    const [coverCache, setCoverCache] = useState({});
    const [artist, setArtist] = useState(null);
    const [artistTracks, setArtistTracks] = useState([]);
    const { playTrack } = useAudio();

    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        (async () => {
            const artists = await getArtists(user.id);
            if (cancelled) return;
            const foundArtist = artists.find(a => a.slug === slug);
            setArtist(foundArtist);

            if (foundArtist) {
                const allTracks = await getTracks(user.id);
                if (cancelled) return;
                const filtered = allTracks.filter(t => t.artist === foundArtist.artist);
                setArtistTracks(filtered);

                // Resolve covers
                filtered.forEach(track => {
                    if (track.cover && !coverCache[track.cover]) {
                        getFile(track.cover).then(url => {
                            if (url) setCoverCache(prev => ({ ...prev, [track.cover]: url }));
                        });
                    }
                });
            }
        })();

        return () => { cancelled = true; };
    }, [slug, user]);

    if (!artist) {
        return (
            <section className={cn.artist}>
                <div className={cn.notFound}>
                    <p className={cn.notFoundTitle}>Исполнитель не найден</p>
                    <Link to="/" className={cn.backLink}>Вернуться на главную</Link>
                </div>
            </section>
        );
    }

    return (
        <section className={cn.artist}>
            <div className={cn.hero} style={{ '--hero-color': artist.color || '#333' }}>
                <Link to="/" className={cn.backArrow}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6"/>
                    </svg>
                </Link>
                <div className={cn.heroContent}>
                    <div className={cn.heroPhoto}>
                        {artist.photo ? (
                            <img src={artist.photo} alt={artist.artist} className={cn.heroImg} />
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" className={cn.heroPhotoPlaceholder}>
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                        )}
                    </div>
                    <div className={cn.heroInfo}>
                        <p className={cn.heroLabel}>Исполнитель</p>
                        <h1 className={cn.heroName}>{artist.artist}</h1>
                        <p className={cn.heroStats}>{artistTracks.length} треков</p>
                    </div>
                </div>
            </div>

            <div className={cn.body}>
                <div className={cn.bioSection}>
                    <h2 className={cn.sectionTitle}>Об исполнителе</h2>
                    <p className={cn.bioText}>{artist.about}</p>
                </div>

                <div className={cn.discographySection}>
                    <h2 className={cn.sectionTitle}>Дискография</h2>
                    <div className={cn.trackList}>
                        {artistTracks.map(track => (
                            <div 
                                key={track.id} 
                                className={cn.trackItem}
                                onClick={() => playTrack(track)}
                            >
                                <div className={cn.trackNum}>{artistTracks.indexOf(track) + 1}</div>
                                <div className={cn.trackArt}>
                                    {(track.cover && coverCache[track.cover]) ? (
                                        <img src={coverCache[track.cover]} alt={track.title} className={cn.trackCoverImg} />
                                    ) : null}
                                    <svg viewBox="0 0 24 24" fill="currentColor" style={(track.cover && coverCache[track.cover]) ? { display: 'none' } : {}}>
                                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                    </svg>
                                </div>
                                <div className={cn.trackInfo}>
                                    <p className={cn.trackName}>{track.title}</p>
                                    <p className={cn.trackArtist}>{artist.artist}</p>
                                </div>
                            </div>
                        ))}
                        {artistTracks.length === 0 && (
                            <p className={cn.noTracks}>Треки не найдены</p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Artist;