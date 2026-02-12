import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, GraduationCap, Users, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.replace(/\s/g, '');

// Inline auth function using XMLHttpRequest instead of fetch
const directSignIn = (userEmail, userPassword) => {
    console.log('[directSignIn] Called with email:', userEmail, 'password length:', userPassword?.length);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${SUPABASE_URL}/auth/v1/token?grant_type=password`);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onload = async () => {
            console.log('[directSignIn] XHR Response:', xhr.status);
            const data = JSON.parse(xhr.responseText);

            if (xhr.status === 200) {
                localStorage.setItem('supabase.auth.token', JSON.stringify(data));

                // CRITICAL: Set the session in Supabase client for database operations
                try {
                    await supabase.auth.setSession({
                        access_token: data.access_token,
                        refresh_token: data.refresh_token
                    });
                    console.log('[directSignIn] Session set in Supabase client');
                } catch (err) {
                    console.error('[directSignIn] Error setting session:', err);
                }

                resolve(data);
            } else {
                reject(new Error(data.msg || data.error_description || 'Login failed'));
            }
        };

        xhr.onerror = () => {
            console.error('[directSignIn] XHR Error');
            reject(new Error('Network error'));
        };

        xhr.send(JSON.stringify({
            email: userEmail,
            password: userPassword
        }));
    });
};

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState('');
    const [selectedRole, setSelectedRole] = useState(null); // 'student' or 'teacher'
    const [signupStep, setSignupStep] = useState(1); // 1: role selection, 2: credentials, 3: success
    const [showSuccess, setShowSuccess] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        console.log('[Auth.jsx] handleAuth called');
        console.log('[Auth.jsx] email:', email);
        console.log('[Auth.jsx] password:', password);
        console.log('[Auth.jsx] isSignUp:', isSignUp);

        try {
            let result;
            if (isSignUp) {
                // Sign up with role in metadata - using custom auth
                console.log('[Auth.jsx] Calling customSignUp');
                result = await customSignUp(email, password, { role: selectedRole });
                if (result.error) throw result.error;

                // Show success step
                setSignupStep(3);
                setShowSuccess(true);
            } else {
                // Sign in - using direct auth to bypass library bug
                console.log('[Auth.jsx] Calling directSignIn with:', email, password);
                const data = await directSignIn(email, password);
                console.log('[Auth.jsx] directSignIn result:', data);

                // Reload the page to trigger session check
                window.location.reload();
            }
        } catch (error) {
            console.error('[Auth.jsx] Error:', error);
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const resetSignup = () => {
        setIsSignUp(false);
        setSelectedRole(null);
        setSignupStep(1);
        setEmail('');
        setPassword('');
        setMessage('');
        setShowSuccess(false);
    };

    const startSignup = () => {
        setIsSignUp(true);
        setSignupStep(1);
        setMessage('');
    };

    const selectRole = (role) => {
        setSelectedRole(role);
        setTimeout(() => setSignupStep(2), 300);
    };

    // Geometric corner decoration component
    const CornerAccent = ({ position = 'top-left', color = 'purple' }) => {
        const positions = {
            'top-left': 'top-0 left-0',
            'top-right': 'top-0 right-0 rotate-90',
            'bottom-left': 'bottom-0 left-0 -rotate-90',
            'bottom-right': 'bottom-0 right-0 rotate-180',
        };

        return (
            <div className={`absolute ${positions[position]} w-16 h-16 pointer-events-none`}>
                <svg viewBox="0 0 64 64" className="w-full h-full">
                    <path
                        d="M 0 0 L 64 0 L 0 64 Z"
                        fill={color === 'purple' ? '#9333EA' : '#D4AF37'}
                        opacity="0.1"
                    />
                    <line x1="0" y1="0" x2="64" y2="0" stroke={color === 'purple' ? '#9333EA' : '#D4AF37'} strokeWidth="2" opacity="0.3" />
                    <line x1="0" y1="0" x2="0" y2="64" stroke={color === 'purple' ? '#9333EA' : '#D4AF37'} strokeWidth="2" opacity="0.3" />
                </svg>
            </div>
        );
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Header with elegant typography */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <h1 className="text-5xl font-serif font-bold text-gray-900 mb-3 tracking-tight">
                    {isSignUp ? (
                        signupStep === 3 ? 'Welcome Aboard' : 'Begin Your Journey'
                    ) : (
                        'Welcome Back'
                    )}
                </h1>
                <div className="flex items-center justify-center gap-2">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-300"></div>
                    <p className="text-lg text-gray-500 font-light">
                        {isSignUp ? (
                            signupStep === 3 ? 'Account created successfully' : 'Create your personalized learning account'
                        ) : (
                            'Continue your learning journey'
                        )}
                    </p>
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-purple-300"></div>
                </div>
            </motion.div>

            <AnimatePresence mode="wait">
                {/* SIGN UP FLOW */}
                {isSignUp && signupStep === 1 && (
                    <motion.div
                        key="role-selection"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="mb-8">
                            <h3 className="text-2xl font-serif font-semibold text-gray-800 mb-2 text-center">
                                Choose Your Path
                            </h3>
                            <p className="text-center text-gray-600 text-sm">
                                Select how you'll be using 4 Cornerstones
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Student Card */}
                            <motion.button
                                whileHover={{ scale: 1.02, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => selectRole('student')}
                                className="group relative bg-gradient-to-br from-white to-purple-50 border-2 border-purple-200 rounded-2xl p-8 text-left transition-all duration-300 hover:border-purple-400 hover:shadow-xl overflow-hidden"
                            >
                                <CornerAccent position="top-left" color="purple" />
                                <CornerAccent position="bottom-right" color="purple" />

                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                                        <GraduationCap className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <h4 className="text-2xl font-serif font-bold text-gray-900 mb-2">Student</h4>
                                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                        Learn at your own pace with AI-personalized content tailored to your unique learning style
                                    </p>
                                    <div className="flex items-center text-purple-600 font-medium text-sm">
                                        <span>Start Learning</span>
                                        <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </motion.button>

                            {/* Teacher Card */}
                            <motion.button
                                whileHover={{ scale: 1.02, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => selectRole('teacher')}
                                className="group relative bg-gradient-to-br from-white to-amber-50 border-2 border-amber-200 rounded-2xl p-8 text-left transition-all duration-300 hover:border-amber-400 hover:shadow-xl overflow-hidden"
                            >
                                <CornerAccent position="top-left" color="gold" />
                                <CornerAccent position="bottom-right" color="gold" />

                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
                                        <Users className="w-8 h-8 text-amber-700" />
                                    </div>
                                    <h4 className="text-2xl font-serif font-bold text-gray-900 mb-2">Teacher</h4>
                                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                        Create classes, share materials, and gain insights into how your students learn best
                                    </p>
                                    <div className="flex items-center text-amber-700 font-medium text-sm">
                                        <span>Start Teaching</span>
                                        <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </motion.button>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={resetSignup}
                                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                ← Back to Sign In
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* CREDENTIALS FORM (Sign In or Sign Up Step 2) */}
                {(!isSignUp || signupStep === 2) && !showSuccess && (
                    <motion.div
                        key="credentials-form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="relative bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                    >
                        <CornerAccent position="top-right" color="purple" />
                        <CornerAccent position="bottom-left" color="purple" />

                        <div className="relative z-10 p-8 md:p-10">
                            {isSignUp && selectedRole && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-6 flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-transparent rounded-xl border border-purple-100"
                                >
                                    {selectedRole === 'student' ? (
                                        <GraduationCap className="w-5 h-5 text-purple-600" />
                                    ) : (
                                        <Users className="w-5 h-5 text-amber-600" />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">
                                            Creating {selectedRole} account
                                        </p>
                                        <button
                                            onClick={() => setSignupStep(1)}
                                            className="text-xs text-purple-600 hover:text-purple-700"
                                        >
                                            Change role
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            <form onSubmit={handleAuth} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50 focus:bg-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50 focus:bg-white"
                                        required
                                        minLength={6}
                                    />
                                    {isSignUp && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Minimum 6 characters
                                        </p>
                                    )}
                                </div>

                                {message && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-4 rounded-xl text-sm ${
                                            message.includes('Check') || message.includes('success')
                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                : 'bg-red-50 text-red-700 border border-red-200'
                                        }`}
                                    >
                                        {message}
                                    </motion.div>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                                    )}
                                </motion.button>
                            </form>

                            <div className="mt-8 text-center">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white text-gray-500">
                                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={isSignUp ? resetSignup : startSignup}
                                    className="mt-4 text-purple-600 hover:text-purple-700 font-medium transition-colors"
                                >
                                    {isSignUp ? 'Sign in instead' : 'Create an account →'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* SUCCESS SCREEN */}
                {showSuccess && signupStep === 3 && (
                    <motion.div
                        key="success-screen"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, type: 'spring' }}
                        className="relative bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-xl border border-purple-100 overflow-hidden"
                    >
                        <CornerAccent position="top-left" color="purple" />
                        <CornerAccent position="bottom-right" color="purple" />

                        <div className="relative z-10 p-10 text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                            >
                                <CheckCircle2 className="w-10 h-10 text-white" />
                            </motion.div>

                            <motion.h3
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-3xl font-serif font-bold text-gray-900 mb-3"
                            >
                                Account Created!
                            </motion.h3>

                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-gray-600 mb-6"
                            >
                                Check your email for a confirmation link to activate your account.
                            </motion.p>

                            {selectedRole === 'teacher' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="inline-flex items-center gap-3 px-6 py-4 bg-amber-50 border-2 border-amber-200 rounded-xl mb-6"
                                >
                                    <ShieldCheck className="w-6 h-6 text-amber-600" />
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-amber-900">
                                            Teacher Verification Pending
                                        </p>
                                        <p className="text-xs text-amber-700">
                                            Your account will be verified within 24-48 hours
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="text-sm text-gray-500"
                            >
                                Didn't receive the email?{' '}
                                <button className="text-purple-600 hover:text-purple-700 font-medium">
                                    Resend confirmation
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Decorative elements */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-purple-100 via-transparent to-amber-100 rounded-full blur-3xl opacity-30"></div>
        </div>
    );
}
