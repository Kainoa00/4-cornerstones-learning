import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import VarkAssessment from './components/VarkAssessment';
import Auth from './components/Auth';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import DebugTest from './components/DebugTest';
import DirectApiTest from './components/DirectApiTest';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [session, setSession] = useState(null);
  const [step, setStep] = useState('loading'); // loading, auth, assessment, dashboard
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Set timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth loading timeout - defaulting to auth screen');
      setStep('auth');
    }, 3000);

    // Check for custom auth session first
    const customSession = localStorage.getItem('supabase.auth.token');
    if (customSession) {
      try {
        const sessionData = JSON.parse(customSession);

        // Restore the session in Supabase client
        supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token
        }).then(() => {
          console.log('Session restored in Supabase client');
        }).catch((err) => {
          console.error('Error restoring session:', err);
        });

        clearTimeout(loadingTimeout);
        setSession(sessionData);
        if (sessionData.user) checkUserProfile(sessionData.user.id);
        else setStep('auth');
        return;
      } catch (e) {
        console.error('Error parsing custom session:', e);
      }
    }

    // Fallback to regular Supabase session check
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(loadingTimeout);
        setSession(session);
        if (session) checkUserProfile(session.user.id);
        else setStep('auth');
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        clearTimeout(loadingTimeout);
        setStep('auth');
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkUserProfile(session.user.id);
      else setStep('auth');
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  const checkUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Supabase error fetching profile:', error);
        // Profile might not exist yet, proceed to assessment
        setStep('assessment');
        return;
      }

      setProfile(data);

      // Check if user has completed VARK assessment
      const hasVarkScores =
        data.vark_visual > 0 ||
        data.vark_auditory > 0 ||
        data.vark_reading_writing > 0 ||
        data.vark_kinesthetic > 0;

      if (hasVarkScores) {
        // Go directly to dashboard
        setStep('dashboard');
      } else {
        // Need to take assessment first
        setStep('assessment');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setStep('assessment');
    }
  };

  const handleAssessmentComplete = async (scores) => {
    // scores is an object: { visual: 40, auditory: 20, reading_writing: 25, kinesthetic: 15 }

    if (session) {
      try {
        // Update profile with VARK percentage scores
        const { error } = await supabase
          .from('profiles')
          .update({
            vark_visual: scores.visual,
            vark_auditory: scores.auditory,
            vark_reading_writing: scores.reading_writing,
            vark_kinesthetic: scores.kinesthetic,
            assessment_completed_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);

        if (error) {
          console.error('Error updating VARK scores:', error);
        } else {
          // Reload profile with new scores
          await checkUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error saving assessment:', error);
      }
    }
  };

  // Debug mode - show test results
  if (window.location.search.includes('debug')) {
    return <DebugTest />;
  }

  // Direct API test
  if (window.location.search.includes('apitest')) {
    return <DirectApiTest />;
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // If on dashboard, show full dashboard (no nav needed, dashboards have their own)
  if (step === 'dashboard' && profile) {
    if (profile.role === 'teacher') {
      return <TeacherDashboard />;
    } else {
      return <StudentDashboard />;
    }
  }

  // Auth and Assessment screens with nav
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30">
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-lg"></div>
            <span className="font-serif font-bold text-xl tracking-tight">4 Cornerstones</span>
          </div>
          {session && (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setSession(null);
                setProfile(null);
                setStep('auth');
                window.location.href = '/';
              }}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors font-medium"
            >
              Sign Out
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {step === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Auth />
            </motion.div>
          )}

          {step === 'assessment' && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-10">
                <h1 className="text-5xl font-serif font-bold text-gray-900 tracking-tight mb-4">
                  Discover Your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">
                    Learning Superpower
                  </span>
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-4">
                  Take the VARK assessment to unlock personalized learning tailored to how you learn best
                </p>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setSession(null);
                    setProfile(null);
                    setStep('auth');
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium underline"
                >
                  ← Back to Login
                </button>
              </div>
              <VarkAssessment onComplete={handleAssessmentComplete} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
