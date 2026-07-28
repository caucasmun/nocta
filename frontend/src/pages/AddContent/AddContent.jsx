import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAudio } from '../../context/AudioContext';
import { uploadAudio, uploadImage } from '../../data/api';
import cn from './AddContent.module.css';

// Базовый URL вашего Express-сервера на Render
const API_BASE_URL = 'https://onrender.com';

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
    const fileInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const artistPhotoInputRef = useRef(null);

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

            const trackData = {
                title: title.trim(),
                artist: artist.trim(),
                lyrics: lyrics.trim(),
                isliked: false,
                user_id: user.id,
                audio_url: audioUrl,
                cover_url: coverUrl 
            };

            const trackRes = await fetch(`${API_BASE_URL}/api/tracks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(trackData),
            });

            if (!trackRes.ok) {
                const errData = await trackRes.json().catch(() => ({}));
                throw new Error(errData.error || 'Не удалось сохранить трек в базу данных');
            }

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

            const artistData = {
                artist: artistName.trim(), 
                about: artistBio.trim(),   
                trackscount: 0,
                photo_url: photoUrl
            };

            const artistRes = await fetch(`${API_BASE_URL}/api/artists`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(artistData),
            });

            if (!artistRes.ok) {
                const errData = await artistRes.json().catch(() => ({}));
                throw new Error(errData.error || 'Не удалось сохранить артиста в базу данных');
            }

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
                    <input
                        type="text" className={cn.input}
                        placeholder="Исполнитель *"
                        value={artist} onChange={(e) => setArtist(e.target.value)} required
                    />

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

