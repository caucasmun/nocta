import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import cn from './Auth.module.css';

function Auth() {
    const navigate = useNavigate();
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validatePassword = (pwd) => {
        if (pwd.length < 6) {
            return 'Пароль должен содержать минимум 6 символов';
        }
        if (!/[A-Z]/.test(pwd)) {
            return 'Пароль должен содержать хотя бы одну заглавную букву';
        }
        if (!/[0-9]/.test(pwd)) {
            return 'Пароль должен содержать хотя бы одну цифру';
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!username.trim() || !password.trim()) {
            setError('Заполните все поля');
            setLoading(false);
            return;
        }

        if (!isLogin) {
            const passwordError = validatePassword(password);
            if (passwordError) {
                setError(passwordError);
                setLoading(false);
                return;
            }
        }

        try {
            const result = isLogin
                ? await login(username.trim(), password)
                : await register(username.trim(), password);

            if (result.success) {
                navigate('/');
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Произошла ошибка. Попробуйте снова.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className={cn.auth}>
            <div className={cn.card}>
                <div className={cn.logo}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#1db954">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                    <span className={cn.logoText}>Noctra</span>
                </div>
                <h1 className={cn.title}>{isLogin ? 'Войти' : 'Регистрация'}</h1>
                <form className={cn.form} onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className={cn.input}
                        placeholder="Имя пользователя"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                        type="password"
                        className={cn.input}
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && <p className={cn.error}>{error}</p>}
                    <button type="submit" className={cn.submit}>
                        {isLogin ? 'Войти' : 'Зарегистрироваться'}
                    </button>
                </form>
                <p className={cn.switch}>
                    {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
                    <button className={cn.switchBtn} onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                        {isLogin ? 'Зарегистрироваться' : 'Войти'}
                    </button>
                </p>
            </div>
        </section>
    );
}

export default Auth;