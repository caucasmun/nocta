import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSession, saveSession } from '../../data/db';
import cn from './Settings.module.css';

function Settings() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        
        const session = getSession();
        if (session) {
            setUsername(session.username || '');
            setBio(session.bio || '');
        }
    }, [user, navigate]);

    const handleSave = (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!username.trim()) {
            setError('Имя пользователя не может быть пустым');
            return;
        }

        const updatedUser = {
            ...user,
            username: username.trim(),
            bio: bio.trim(),
        };

        saveSession(updatedUser);
        setSuccess('Профиль обновлен!');
        setTimeout(() => setSuccess(''), 2000);
    };

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    if (!user) {
        return null;
    }

    return (
        <section className={cn.settings}>
            <div className={cn.card}>
                <Link to="/" className={cn.backBtn}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Назад
                </Link>
                <h1 className={cn.title}>Настройки профиля</h1>

                {success && <p className={cn.success}>{success}</p>}
                {error && <p className={cn.error}>{error}</p>}

                <form className={cn.form} onSubmit={handleSave}>
                    <div className={cn.avatarSection}>
                        <div className={cn.avatar}>
                            {username.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <div className={cn.field}>
                        <label className={cn.label}>Имя пользователя</label>
                        <input
                            type="text"
                            className={cn.input}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Введите имя пользователя"
                        />
                    </div>

                    <div className={cn.field}>
                        <label className={cn.label}>О себе</label>
                        <textarea
                            className={cn.textarea}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Расскажите о себе"
                            rows={4}
                        />
                    </div>

                    <div className={cn.field}>
                        <label className={cn.label}>ID пользователя</label>
                        <input
                            type="text"
                            className={cn.input}
                            value={user.id}
                            disabled
                        />
                    </div>

                    <div className={cn.actions}>
                        <button type="submit" className={cn.saveBtn}>
                            Сохранить изменения
                        </button>
                        <button 
                            type="button" 
                            className={cn.logoutBtn}
                            onClick={handleLogout}
                        >
                            Выйти из аккаунта
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}

export default Settings;