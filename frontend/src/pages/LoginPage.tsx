import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Globe, Loader2, GraduationCap } from 'lucide-react';
import { useAuthStore } from '../store';

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
] as const;

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem('koryopath_remember', email);
      } else {
        localStorage.removeItem('koryopath_remember');
      }
      navigate('/dashboard');
    } catch {
      // Error toast is handled in authStore
    }
  };

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setLangMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left decorative panel - hidden on mobile */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center"
        style={{
          background:
            'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #1e1b4b 60%, #312e81 100%)',
        }}
      >
        {/* Korean geometric pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(234,179,8,0.3) 40px, rgba(234,179,8,0.3) 41px),
              repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(234,179,8,0.3) 40px, rgba(234,179,8,0.3) 41px),
              repeating-linear-gradient(45deg, transparent, transparent 56px, rgba(234,179,8,0.15) 56px, rgba(234,179,8,0.15) 57px),
              repeating-linear-gradient(-45deg, transparent, transparent 56px, rgba(234,179,8,0.15) 56px, rgba(234,179,8,0.15) 57px)
            `,
          }}
        />

        {/* Gold corner accents */}
        <div className="pointer-events-none absolute left-0 top-0 h-32 w-32">
          <div
            className="absolute left-4 top-4 h-24 w-24 rounded-br-3xl border-b-2 border-r-2"
            style={{ borderColor: 'rgba(234,179,8,0.5)' }}
          />
        </div>
        <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32">
          <div
            className="absolute bottom-4 right-4 h-24 w-24 rounded-tl-3xl border-l-2 border-t-2"
            style={{ borderColor: 'rgba(234,179,8,0.5)' }}
          />
        </div>

        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(234,179,8,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Branding content */}
        <div className="relative z-10 flex flex-col items-center px-12 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/20"
          >
            <GraduationCap className="h-10 w-10 text-white" />
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mb-3 text-4xl font-extrabold tracking-tight text-white"
          >
            KoryoPath
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mb-2 text-lg text-indigo-200"
          >
            CRM
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-6"
          >
            <p
              className="text-2xl font-light"
              style={{ color: 'rgba(234,179,8,0.9)' }}
            >
              한국 유학의 시작
            </p>
            <p className="mt-2 text-sm text-indigo-300">
              {t('login.tagline', 'Your journey to Korea starts here')}
            </p>
          </motion.div>

          {/* Decorative dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-12 flex gap-2"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor:
                    i === 2 ? 'rgba(234,179,8,0.8)' : 'rgba(165,148,249,0.4)',
                }}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Right login form panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative flex w-full flex-col lg:w-1/2"
      >
        {/* Language switcher */}
        <div className="absolute right-4 top-4 z-20">
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              <Globe className="h-4 w-4" />
              {LANGUAGES.find((l) => l.code === i18n.language)?.label ?? 'Русский'}
            </button>
            {langMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => changeLanguage(lang.code)}
                    className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-gray-50 ${
                      i18n.language === lang.code
                        ? 'bg-indigo-50 font-medium text-indigo-700'
                        : 'text-gray-700'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Mobile branding header */}
        <div
          className="flex items-center justify-center gap-3 py-8 lg:hidden"
          style={{
            background:
              'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">KoryoPath</h1>
            <p className="text-xs" style={{ color: 'rgba(234,179,8,0.8)' }}>
              한국 유학의 시작
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full max-w-md"
          >
            <h2 className="mb-1 text-2xl font-bold text-gray-900">
              {t('login.title', 'Sign In')}
            </h2>
            <p className="mb-8 text-sm text-gray-500">
              {t('login.subtitle', 'Enter your credentials to access the CRM')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  {t('login.email', 'Email')}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@koryopath.com"
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  {t('login.password', 'Password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-gray-600"
                >
                  {t('login.rememberMe', 'Remember me')}
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('login.signingIn', 'Signing in...')}
                  </>
                ) : (
                  t('login.signIn', 'Sign In')
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-gray-400">
              KoryoPath CRM &copy; {new Date().getFullYear()}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
