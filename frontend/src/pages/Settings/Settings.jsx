import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSession } from '../../data/db';
import cn from './Settings.module.css';

function Settings() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');

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

                <div className={cn.form}>
                    <div className={cn.avatarSection}>
                        <div className={cn.avatar}>
                            {username.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <div className={cn.field}>
                        <label className={cn.label}>Имя пользователя</label>
                        <p className={cn.value}>{username}</p>
                    </div>

                    <div className={cn.field}>
                        <label className={cn.label}>О себе</label>
                        <p className={cn.value}>{bio || '—'}</p>
                    </div>

                    <div className={cn.field}>
                        <label className={cn.label}>ID пользователя</label>
                        <p className={cn.value}>{user.id}</p>
                    </div>

                    <div className={cn.actions}>
                        <button 
                            type="button" 
                            className={cn.logoutBtn}
                            onClick={handleLogout}
                        >
                            Выйти из аккаунта
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Settings;