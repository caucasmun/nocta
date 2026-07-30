import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { uploadAudio, uploadImage, API_ORIGIN } from '../../data/api';
import { addTrack, addArtist, getArtists } from '../../data/db';
import cn from './AddContent.module.css';

function AddContent() {
    const { user } = useAuth();
    const { reloadTracks } = useAudio();
    const navigate = useNavigate();
    const [mode, setMode] = useState('track');
    const [title, setTitle] = useState('');
    const [selectedArtists, setSelectedArtists] = useState([]);
    const [artistInput, setArtistInput] = useState('');
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

    // Resolve artist photo URL
    const resolvePhoto = (url) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `${API_ORIGIN}${url}`;
    };

    // Filter artists for dropdown
    const filteredArtists = artistInput
        ? existingArtists.filter(a => a.artist.toLowerCase().includes(artistInput.toLowerCase()))
        : existingArtists;

    const isExistingArtist = existingArtists.some(a => a.artist.toLowerCase() === artistInput.toLowerCase().trim());

    const handleArtistSelect = (artistData) => {
        if (!selectedArtists.some(a => a.id === artistData.id)) {
            setSelectedArtists([...selectedArtists, artistData]);
        }
        setArtistInput('');
        setShowArtistDropdown(false);
    };

    const handleAddCustomArtist = () => {
        const trimmed = artistInput.trim();
        if (!trimmed) return;
        if (selectedArtists.some(a => a.artist.toLowerCase() === trimmed.toLowerCase())) return;
        setSelectedArtists([...selectedArtists, { id: null, artist: trimmed, is_custom: true }]);
        setArtistInput('');
        setShowArtistDropdown(false);
    };

    const handleRemoveArtist = (artistId) => {
        setSelectedArtists(selectedArtists.filter(a => (a.id || a.artist) !== artistId));
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
        if (!title.trim() || selectedArtists.length === 0) {
            setError('Заполните название и выберите хотя бы одного исполнителя');
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

            // Сначала создаем/находим всех исполнителей
            const artistIds = [];
            for (const selected of selectedArtists) {
                if (selected.id) {
                    artistIds.push(selected.id);
                } else {
                    // Создаем нового исполнителя
                    let photoUrl = '';
                    if (selected.photo_file) {
                        const photoData = await uploadImage(selected.photo_file);
                        photoUrl = photoData.url;
                    }
                    const newArtist = await addArtist(user.id, {
                        name: selected.artist,
                        bio: selected.bio || '',
                        photo_url: photoUrl,
                        color: selected.color || '#ff6b00',
                    });
                    artistIds.push(newArtist.id);
                }
            }

            // Создаем трек с несколькими исполнителями
            await addTrack(user.id, {
                title: title.trim(),
                artists: artistIds,
                lyrics: lyrics.trim(),
                audio_url: audioUrl,
                cover_url: coverUrl,
                color: color,
            });

            // Refresh artists list after adding track
            getArtists(user.id).then(setExistingArtists);

            reloadTracks();

            setTitle('');
            setSelectedArtists([]);
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
                    <div ref={artistDropdownRef} className={cn.artistField}>
                        <label className={cn.fieldLabel}>Исполнители *</label>
                        <div className={cn.artistInputWrapper}>
                            <svg className={cn.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input
                                type="text"
                                className={cn.artistInput}
                                placeholder="Поиск или создание исполнителя..."
                                value={artistInput}
                                onChange={(e) => {
                                    setArtistInput(e.target.value);
                                    setShowArtistDropdown(true);
                                }}
                                onFocus={() => setShowArtistDropdown(true)}
                                autoComplete="off"
                            />
                            {artistInput && (
                                <button
                                    type="button"
                                    className={cn.clearBtn}
                                    onClick={() => { setArtistInput(''); setShowArtistDropdown(false); }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </button>
                            )}
                        </div>

                        {showArtistDropdown && (
                            <div className={cn.dropdown}>
                                {filteredArtists.length > 0 && (
                                    <div className={cn.dropdownList}>
                                        {filteredArtists.map(a => {
                                            const photoUrl = resolvePhoto(a.photo_url);
                                            return (
                                                <div
                                                    key={a.id}
                                                    className={cn.dropdownItem}
                                                    onClick={() => handleArtistSelect(a)}
                                                >
                                                    <div
                                                        className={cn.dropdownAvatar}
                                                        style={{ background: a.color || '#333' }}
                                                    >
                                                        {photoUrl ? (
                                                            <img src={photoUrl} alt={a.artist} />
                                                        ) : (
                                                            <span>{a.artist.charAt(0).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    <div className={cn.dropdownInfo}>
                                                        <span className={cn.dropdownName}>{a.artist}</span>
                                                        <span className={cn.dropdownSub}>{a.trackscount || 0} треков</span>
                                                    </div>
                                                    {selectedArtists.some(sa => sa.id === a.id) && (
                                                        <svg className={cn.checkIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1db954" strokeWidth="2">
                                                            <polyline points="20 6 9 17 4 12"/>
                                                        </svg>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {artistInput.trim() && !isExistingArtist && (
                                    <div
                                        className={cn.dropdownCreate}
                                        onClick={handleAddCustomArtist}
                                    >
                                        <div className={cn.createAvatar}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M11.5 2a1 1 0 0 1 1 1v7.5H20a1 1 0 1 1 0 2h-7.5V20a1 1 0 1 1-2 0v-7.5H3a1 1 0 1 1 0-2h7.5V3a1 1 0 0 1 1-1z"/>
                                            </svg>
                                        </div>
                                        <span>Создать нового: <strong>"{artistInput.trim()}"</strong></span>
                                    </div>
                                )}
                                {filteredArtists.length === 0 && !artistInput.trim() && (
                                    <div className={cn.dropdownEmpty}>
                                        Нет существующих исполнителей. Начните вводить имя.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Selected artists tags */}
                    {selectedArtists.length > 0 && (
                        <div className={cn.selectedArtists}>
                            {selectedArtists.map((a, idx) => {
                                const photoUrl = a.photo_url ? resolvePhoto(a.photo_url) : '';
                                return (
                                    <div key={a.id || a.artist} className={cn.artistTag}>
                                        <div
                                            className={cn.tagAvatar}
                                            style={{ background: a.color || '#333' }}
                                        >
                                            {photoUrl ? (
                                                <img src={photoUrl} alt={a.artist} />
                                            ) : (
                                                <span>{a.artist.charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <span className={cn.tagName}>{a.artist}</span>
                                        {idx > 0 && <span className={cn.tagFeat}>feat.</span>}
                                        <button
                                            type="button"
                                            className={cn.tagRemove}
                                            onClick={() => handleRemoveArtist(a.id || a.artist)}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

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