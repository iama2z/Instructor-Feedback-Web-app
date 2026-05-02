import React, { useState, useEffect, useRef } from 'react';
import { db, auth, googleProvider, ensureDatabasePopulated, OperationType, handleFirestoreError } from './lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Search, LogIn, Loader2, Camera } from 'lucide-react';
import { InstructorDashboard } from './InstructorDashboard';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';

export default function App() {
  const [studentCode, setStudentCode] = useState('');
  const [error, setError] = useState('');
  const [studentData, setStudentData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsInstructor(true);
        // Ensure db has data on login if needed
        await ensureDatabasePopulated();
      } else {
        setIsInstructor(false);
      }
    });
    return unsub;
  }, []);

  const fetchFeedback = async () => {
    setError('');
    setStudentData(null);

    const code = studentCode.trim().toUpperCase();

    if (!code) {
      setError('Please enter your code.');
      return;
    }

    setIsLoading(true);
    try {
      const docRef = doc(db, 'students', code);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        setStudentData({ id: code, ...data });
        
        // Mark as viewed (fire and forget)
        updateDoc(docRef, {
          hasViewed: true,
          lastViewedAt: new Date().toISOString()
        }).catch(err => console.warn('Failed to update view status:', err));
        
      } else {
        setError('Code not found. Please check your spelling and try again.');
      }
    } catch (err: any) {
      // Typically, missing permissions happen if ID is wildly invalid OR if they don't have access.
      // We log via the handler but display a friendly message.
      if (err.code === 'permission-denied') {
        setError('Access denied or invalid code format.');
      } else {
        setError('Error retrieving data. Please contact your teacher.');
      }
      handleFirestoreError(err, OperationType.GET, `students/${code}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstructorLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  const handleInstructorLogout = async () => {
    await signOut(auth);
    setStudentCode('');
    setStudentData(null);
    setError('');
  };

  const resetPortal = () => {
    setStudentCode('');
    setStudentData(null);
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchFeedback();
    }
  };

  const playTriumphantSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playNote = (frequency: number, startTime: number, duration: number, type: OscillatorType) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime + startTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start(audioCtx.currentTime + startTime);
        oscillator.stop(audioCtx.currentTime + startTime + duration);
      };

      const notes = [
        { f: 523.25, start: 0, dur: 0.15 },
        { f: 659.25, start: 0.15, dur: 0.15 },
        { f: 783.99, start: 0.3, dur: 0.15 },
        { f: 1046.50, start: 0.45, dur: 0.6 }
      ];

      notes.forEach(n => playNote(n.f, n.start, n.dur, 'square'));
      notes.forEach(n => playNote(n.f, n.start, n.dur, 'sine'));
    } catch (e) {
      console.warn("Audio Context not supported", e);
    }
  };

  const handleCelebrateAndSave = async () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#14b8a6', '#3b82f6', '#ffffff'] // cyan, teal, blue, white
    });

    playTriumphantSound();

    if (cardRef.current) {
      setIsTakingScreenshot(true);
      try {
        await new Promise(r => setTimeout(r, 150));
        const dataUrl = await toPng(cardRef.current, {
          backgroundColor: '#0f172a', /* to match the background gradient somewhat, or transparent */
          pixelRatio: 2,
          filter: (node) => {
            if (node instanceof HTMLElement && node.dataset.html2canvasIgnore === 'true') {
              return false;
            }
            return true;
          }
        });
        
        const link = document.createElement('a');
        link.download = `${studentData?.name.replace(/\s+/g, '_')}_feedback.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to take screenshot:', err);
      } finally {
        setIsTakingScreenshot(false);
      }
    }
  };

  if (isInstructor) {
    return <InstructorDashboard onLogout={handleInstructorLogout} user={user} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-blue-900 flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-8 text-center relative overflow-hidden"
      >
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
          Science 8 Feedback
        </h1>
        <p className="text-slate-300 mb-8">
          Enter your unique student code to view your assignment feedback.
        </p>

        <div className="flex flex-col gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 h-5 w-5" />
            <input
              type="text"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="e.g., ABC012345"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/20 bg-white/5 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400 transition-all font-mono uppercase text-white placeholder:text-white/40 shadow-inner"
              autoComplete="off"
              spellCheck="false"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={fetchFeedback}
            disabled={isLoading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none text-slate-900 font-semibold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.7)] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Get Feedback'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-300 text-sm font-medium mb-4 bg-red-500/10 border border-red-500/20 py-3 px-4 rounded-xl backdrop-blur-sm"
            >
              {error}
            </motion.p>
          )}

          {studentData && (
            <motion.div
              layout
              ref={cardRef}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                hidden: { opacity: 0, scale: 0.95, y: 20 },
                visible: {
                  opacity: 1, scale: 1, y: 0,
                  transition: { type: 'spring', stiffness: 300, damping: 25, staggerChildren: 0.1 }
                },
                exit: { opacity: 0, scale: 0.95, y: -20 }
              }}
              className="text-left bg-white/5 border border-white/10 rounded-xl p-6 mt-4 backdrop-blur-md shadow-lg"
            >
              <motion.h2 
                variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                className="text-xl font-semibold text-white mb-2"
              >
                {studentData.name}
              </motion.h2>
              <motion.div 
                variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 mb-5 shadow-sm"
              >
                Period {studentData.period}
              </motion.div>

              <motion.div 
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                className="bg-black/20 border-l-4 border-cyan-500 p-4 rounded-r-lg shadow-inner relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-2 drop-shadow-sm relative">
                  Latest Assignment Feedback
                </h3>
                <p className="text-slate-200 leading-relaxed max-w-none break-words whitespace-pre-wrap relative">
                  {studentData.feedback}
                </p>
              </motion.div>

              <div className="flex gap-3 mt-6" data-html2canvas-ignore="true">
                <motion.button
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                  onClick={resetPortal}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 font-medium py-2.5 rounded-xl transition-all active:scale-[0.98] border border-white/5 hover:border-white/10"
                >
                  Done
                </motion.button>
                <motion.button
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                  onClick={handleCelebrateAndSave}
                  disabled={isTakingScreenshot}
                  className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isTakingScreenshot ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      Celebrate & Save!
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <div className="mt-8">
        <button 
          onClick={handleInstructorLogin}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors bg-white/5 px-4 py-2 border border-white/10 rounded-full hover:bg-white/10 backdrop-blur-sm"
        >
          <LogIn className="w-4 h-4" />
          Instructor Login
        </button>
      </div>
    </div>
  );
}
