import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import cn from './LeftNav.module.css'

function LeftNav() {
    const location = useLocation();
    const { user, logout } = useAuth();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <>
            {/* Desktop sidebar */}
            <section className={cn.leftNav}>
                <div className={cn.navBar}>
                    {/* Logo */}
                    <Link to="/" className={cn.logo}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="#1db954">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                        <span className={cn.logoText}>Nocta</span>
                    </Link>

                    <ul className={cn.topBar}>
                        <li>
                            <Link to="/" className={`${cn.link} ${isActive('/') && location.pathname === '/' ? cn.active : ''}`}>
                                <svg className={cn.icon} viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h4.5v-6a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v6H20V7.577l-7.5-4.33zm-1-1.732a3 3 0 0 1 3 0l7.5 4.33a2 2 0 0 1 1 1.732V21a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-6h-3v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.577a2 2 0 0 1 1-1.732l7.5-4.33z"/>
                                </svg>
                                <p className={cn.linkTitle}>Главная</p>
                            </Link>
                        </li>
                        <li>
                            <Link to="/search" className={`${cn.link} ${isActive('/search') ? cn.active : ''}`}>
                                <svg className={cn.icon} viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28zm-7.407 9.279c0-4.006 3.302-7.279 7.407-7.279s7.407 3.273 7.407 7.279-3.302 7.279-7.407 7.279-7.407-3.273-7.407-7.279z"/>
                                </svg>
                                <p className={cn.linkTitle}>Поиск</p>
                            </Link>
                        </li>
                        <li>
                            <Link to="/library" className={`${cn.link} ${isActive('/library') ? cn.active : ''}`}>
                                <svg className={cn.icon} viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14.5 2.134a1 1 0 0 1 1 0l6 3.464a1 1 0 0 1 .5.866V21a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V3a1 1 0 0 1 .5-.866zM12 21a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.464a1 1 0 0 1 .5-.866l6-3.464a1 1 0 0 1 1 0 .5.5 0 0 1 .5.866V21zm-6-2h4V5.28l-4 2.31V19zm10-2V5.28l-4 2.31V17h4z"/>
                                </svg>
                                <p className={cn.linkTitle}>Моя библиотека</p>
                            </Link>
                        </li>
                    </ul>
                    {user && (
                        <ul className={cn.bottomBar}>
                            <li>
                                <Link to="/add" className={`${cn.link} ${isActive('/add') ? cn.active : ''}`}>
                                    <svg className={cn.icon} viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M11.5 2a1 1 0 0 1 1 1v7.5H20a1 1 0 1 1 0 2h-7.5V20a1 1 0 1 1-2 0v-7.5H3a1 1 0 1 1 0-2h7.5V3a1 1 0 0 1 1-1z"/>
                                    </svg>
                                    <p className={cn.linkTitle}>Добавить</p>
                                </Link>
                            </li>
                        </ul>
                    )}
                    <ul className={cn.bottomBar}>
                        <li>
                            <Link to="/liked" className={`${cn.link} ${isActive('/liked') ? cn.active : ''}`}>
                                <svg className={cn.icon} viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                                <p className={cn.linkTitle}>Любимые треки</p>
                            </Link>
                        </li>
                    </ul>

                    <div className={cn.authSection}>
                        {user ? (
                            <Link to="/settings" className={cn.userInfo}>
                                <div className={cn.userAvatar}>
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div className={cn.userMeta}>
                                    <p className={cn.userName}>{user.username}</p>
                                    <button className={cn.logoutBtn} onClick={(e) => { e.preventDefault(); logout(); }}>Выйти</button>
                                </div>
                            </Link>
                        ) : (
                            <Link to="/auth" className={cn.authLink}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                                </svg>
                                <span>Войти</span>
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            {/* Mobile bottom navigation */}
            <nav className={cn.mobileNav}>
                <Link to="/" className={`${cn.mobileLink} ${isActive('/') && location.pathname === '/' ? cn.mobileActive : ''}`}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h4.5v-6a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v6H20V7.577l-7.5-4.33z"/>
                    </svg>
                </Link>
                <Link to="/search" className={`${cn.mobileLink} ${isActive('/search') ? cn.mobileActive : ''}`}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28z"/>
                    </svg>
                </Link>
                <Link to="/library" className={`${cn.mobileLink} ${isActive('/library') ? cn.mobileActive : ''}`}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14.5 2.134a1 1 0 0 1 1 0l6 3.464a1 1 0 0 1 .5.866V21a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V3a1 1 0 0 1 .5-.866zM12 21a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.464a1 1 0 0 1 .5-.866l6-3.464a1 1 0 0 1 1 0 .5.5 0 0 1 .5.866V21z"/>
                    </svg>
                </Link>
                {user && (
                    <Link to="/add" className={`${cn.mobileLink} ${isActive('/add') ? cn.mobileActive : ''}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.5 2a1 1 0 0 1 1 1v7.5H20a1 1 0 1 1 0 2h-7.5V20a1 1 0 1 1-2 0v-7.5H3a1 1 0 1 1 0-2h7.5V3a1 1 0 0 1 1-1z"/>
                        </svg>
                    </Link>
                )}
                <Link to="/liked" className={`${cn.mobileLink} ${isActive('/liked') ? cn.mobileActive : ''}`}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </Link>
                {user ? (
                    <Link to="/settings" className={`${cn.mobileLink} ${isActive('/settings') ? cn.mobileActive : ''}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                    </Link>
                ) : (
                    <Link to="/auth" className={`${cn.mobileLink} ${isActive('/auth') ? cn.mobileActive : ''}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                    </Link>
                )}
            </nav>
        </>
    )
}

export default LeftNav