import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { uploadAudio, uploadImage } from '../../data/api';
import { addTrack, addArtist, getArtists } from '../../data/db';
import cn from './AddContent.module.css';

function AddContent() {
    const { user } = useAuth();
    const { reloadTracks } = useAudio();
    const navigate = useNavigate();
    const [mode, setMode] = useState('track');
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [color, setColor] = useState('#1db954');
    const [artistName, setArtistName] = useState('');
    const [artistBio, setArtistBio] = useState('');
    const [artistColor, setArtistColor] = useState('#1db954');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [audioFile, setAudioFile] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState('');
    const [artistPhotoFile, setArtistPhotoFile] = useState(null);
    const [artistPhotoPreview, setArtistPhotoPreview] = useState('');
    const [lyrics, setLyrics] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [existingArtists, setExistingArtists] = useState([]);
    const [showArtistDropdown, setShowArtistDropdown] = useState(false);
    const fileInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const artistPhotoInputRef = useRef(null);
    const artistDropdownRef = useRef(null);

    // Load existing artists for dropdown
    useEffect(() => {
        if (user) {
            getArtists(user.id).then(artists => {
                setExistingArtists(artists);
            });
        }
    }, [user]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (artistDropdownRef.current && !artistDropdownRef.current.contains(e.target)) {
                setShowArtistDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) {
        return (
            <section className={cn.add}>
                <div className={cn.empty}>
                    <p className={cn.emptyTitle}>Войдите, чтобы добавлять контент</p>
                    <button className={cn.loginBtn} onClick={() => navigate('/auth')}>Войти</button>
                </div>
            </section>
        );
    }

    // Filter artists for dropdown
    const filteredArtists = artist
        ? existingArtists.filter(a => a.artist.toLowerCase().includes(artist.toLowerCase()))
        : existingArtists;

    const isExistingArtist = existingArtists.some(a => a.artist.toLowerCase() === artist.toLowerCase().trim());

    const handleArtistSelect = (name) => {
        setArtist(name);
        setShowArtistDropdown(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('audio/')) {
                setError('Пожалуйста, выберите аудиофайл (mp3, wav и т.д.)');
                return;
            }
            if (file.size > 50 * 1024 * 1024) {
                setError('Файл слишком большой. Максимальный размер: 50MB');
                return;
            }
            setError('');
            setAudioFile(file);
            setProgress(0);
        }
    };

    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Пожалуйста, выберите изображение');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setError('Изображение слишком большое. Максимум: 5MB');
                return;
            }
            setError('');
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleArtistPhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Пожалуйста, выберите изображение');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setError('Изображение слишком большое. Максимум: 5MB');
                return;
            }
            setError('');
            setArtistPhotoFile(file);
            setArtistPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleAddTrack = async (e) => {
        e.preventDefault();
        if (!title.trim() || !artist.trim()) {
            setError('Заполните название и исполнителя');
            return;
        }
        if (!audioFile) {
            setError('Выберите аудиофайл');
            return;
        }

        setIsUploading(true);
        setError('');
        setProgress(10);

        try {
            setProgress(20);
            const audioData = await uploadAudio(audioFile);
            const audioUrl = audioData.url;
            setProgress(50);

            let coverUrl = '';
            if (coverFile) {
                const coverData = await uploadImage(coverFile);
                coverUrl = coverData.url;
            }
            setProgress(80);

            await addTrack(user.id, {
                title: title.trim(),
                artist: artist.trim(),
                lyrics: lyrics.trim(),
                audio_url: audioUrl,
                cover_url: coverUrl,
                color: color,
            });

            // Refresh artists list after adding track (new artist may have been created)
            getArtists(user.id).then(setExistingArtists);

            reloadTracks();

            setTitle('');
            setArtist('');
            setColor('#1db954');
            setAudioFile(null);
            setCoverFile(null);
            setCoverPreview('');
            setLyrics('');
            setProgress(100);
            setSuccess(`Трек "${title.trim()}" добавлен!`);
            setTimeout(() => { setSuccess(''); setProgress(0); }, 3000);
        } catch (err) {
            console.error(err);
            setError(err.message);
            setProgress(0);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddArtist = async (e) => {
        e.preventDefault();
        if (!artistName.trim()) {
            setError('Введите имя исполнителя');
            return;
        }

        setIsUploading(true);
        setError('');

        try {
            let photoUrl = '';
            if (artistPhotoFile) {
                const photoData = await uploadImage(artistPhotoFile);
                photoUrl = photoData.url;
            }

            await addArtist(user.id, {
                name: artistName.trim(),
                bio: artistBio.trim(),
                photo_url: photoUrl,
                color: artistColor,
            });

            // Refresh artists list
            getArtists(user.id).then(setExistingArtists);

            reloadTracks();

            setArtistName('');
            setArtistBio('');
            setArtistColor('#1db954');
            setArtistPhotoFile(null);
            setArtistPhotoPreview('');
            setSuccess(`Исполнитель "${artistName.trim()}" добавлен!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <section className={cn.add}>
            <h1 className={cn.title}>Добавить контент</h1>

            <div className={cn.tabs}>
                <button className={`${cn.tab} ${mode === 'track' ? cn.active : ''}`} onClick={() => setMode('track')}>Трек</button>
                <button className={`${cn.tab} ${mode === 'artist' ? cn.active : ''}`} onClick={() => setMode('artist')}>Исполнитель</button>
            </div>

            {success && <p className={cn.success}>{success}</p>}
            {error && <p className={cn.error}>{error}</p>}

            {mode === 'track' && (
                <form className={cn.form} onSubmit={handleAddTrack}>
                    <input
                        type="text" className={cn.input}
                        placeholder="Название трека *"
                        value={title} onChange={(e) => setTitle(e.target.value)} required
                    />

                    {/* Artist field with dropdown */}
                    <div ref={artistDropdownRef} style={{ position: 'relative' }}>
                        <input
                            type="text" className={cn.input}
                            placeholder="Исполнитель *"
                            value={artist}
                            onChange={(e) => {
                                setArtist(e.target.value);
                                setShowArtistDropdown(true);
                            }}
                            onFocus={() => setShowArtistDropdown(true)}
                            required
                            autoComplete="off"
                        />
                        {showArtistDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                maxHeight: '220px',
                                overflowY: 'auto',
                                zIndex: 100,
                                marginTop: '4px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            }}>
                                {filteredArtists.length > 0 && (
                                    <>
                                        {filteredArtists.slice(0, 10).map(a => (
                                            <div
                                                key={a.id}
                                                onClick={() => handleArtistSelect(a.artist)}
                                                style={{
                                                    padding: '10px 14px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid #222',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    background: a.color || '#333',
                                                    flexShrink: 0,
                                                    overflow: 'hidden',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    {a.photo_url ? (
                                                        <img src={a.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                                                            {a.artist.charAt(0).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <span>{a.artist}</span>
                                            </div>
                                        ))}
                                    </>
                                )}
                                {artist.trim() && !isExistingArtist && (
                                    <div
                                        onClick={() => handleArtistSelect(artist.trim())}
                                        style={{
                                            padding: '10px 14px',
                                            cursor: 'pointer',
                                            color: '#1db954',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            borderTop: filteredArtists.length > 0 ? '1px solid #333' : 'none',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M11.5 2a1 1 0 0 1 1 1v7.5H20a1 1 0 1 1 0 2h-7.5V20a1 1 0 1 1-2 0v-7.5H3a1 1 0 1 1 0-2h7.5V3a1 1 0 0 1 1-1z"/>
                                        </svg>
                                        <span>Создать нового: "{artist.trim()}"</span>
                                    </div>
                                )}
                                {filteredArtists.length === 0 && !artist.trim() && (
                                    <div style={{ padding: '10px 14px', color: '#666' }}>
                                        Нет существующих исполнителей. Начните вводить имя.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={cn.fileUpload}>
                        <label className={cn.fileLabel}>Аудиофайл (mp3) *</label>
                        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} className={cn.fileInput} />
                        <button type="button" className={cn.fileBtn} onClick={() => fileInputRef.current?.click()}>
                            {audioFile ? '✓ Файл выбран' : 'Выбрать аудиофайл'}
                        </button>
                        {audioFile && <p className={cn.fileName}>{audioFile.name}</p>}
                    </div>

                    <div className={cn.fileUpload}>
                        <label className={cn.fileLabel}>Обложка (jpg/png)</label>
                        <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className={cn.fileInput} />
                        <button type="button" className={cn.fileBtn} onClick={() => coverInputRef.current?.click()}>
                            {coverFile ? '✓ Обложка выбрана' : 'Выбрать обложку'}
                        </button>
                        {coverPreview && (
                            <div className={cn.coverPreview}>
                                <img src={coverPreview} alt="Обложка" className={cn.coverPreviewImg} />
                            </div>
                        )}
                    </div>

                    <div className={cn.colorRow}>
                        <label className={cn.colorLabel}>Цвет (если нет обложки):</label>
                        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className={cn.colorInput} />
                    </div>

                    <div className={cn.lyricsField}>
                        <label className={cn.fileLabel}>Текст песни</label>
                        <textarea
                            className={cn.textarea}
                            placeholder="Введите текст песни..."
                            value={lyrics}
                            onChange={(e) => setLyrics(e.target.value)}
                            rows={6}
                        />
                    </div>

                    {isUploading && (
                        <div className={cn.progressBar}>
                            <div className={cn.progressFill} style={{ width: `${progress}%` }}></div>
                            <span className={cn.progressText}>Загрузка: {progress}%</span>
                        </div>
                    )}

                    <button type="submit" className={cn.submit} disabled={isUploading}>
                        {isUploading ? `Загрузка ${progress}%...` : 'Добавить трек'}
                    </button>
                </form>
            )}

            {mode === 'artist' && (
                <form className={cn.form} onSubmit={handleAddArtist}>
                    <input type="text" className={cn.input} placeholder="Имя исполнителя *"
                        value={artistName} onChange={(e) => setArtistName(e.target.value)} required />
                    <textarea className={cn.textarea} placeholder="Биография"
                        value={artistBio} onChange={(e) => setArtistBio(e.target.value)} rows={4} />

                    <div className={cn.fileUpload}>
                        <label className={cn.fileLabel}>Фото исполнителя</label>
                        <input ref={artistPhotoInputRef} type="file" accept="image/*" onChange={handleArtistPhotoChange} className={cn.fileInput} />
                        <button type="button" className={cn.fileBtn} onClick={() => artistPhotoInputRef.current?.click()}>
                            {artistPhotoFile ? '✓ Фото выбрано' : 'Выбрать фото'}
                        </button>
                        {artistPhotoPreview && (
                            <div className={cn.coverPreview}>
                                <img src={artistPhotoPreview} alt="Фото" className={cn.coverPreviewImg} />
                            </div>
                        )}
                    </div>

                    <div className={cn.colorRow}>
                        <label className={cn.colorLabel}>Цвет:</label>
                        <input type="color" value={artistColor} onChange={(e) => setArtistColor(e.target.value)} className={cn.colorInput} />
                    </div>
                    <button type="submit" className={cn.submit} disabled={isUploading}>
                        {isUploading ? 'Загрузка...' : 'Добавить исполнителя'}
                    </button>
                </form>
            )}
        </section>
    );
}

export default AddContent;