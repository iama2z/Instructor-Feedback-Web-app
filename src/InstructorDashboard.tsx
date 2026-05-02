import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, LogOut, Upload, CheckCircle2, Loader2, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { BulkImportModal, ParsedFeedback } from './BulkImportModal';
import { db, OperationType, handleFirestoreError } from './lib/firebase';
import { collection, onSnapshot, doc, writeBatch, updateDoc } from 'firebase/firestore';

export function InstructorDashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const resetViewStatus = async (studentId: string) => {
    try {
      await updateDoc(doc(db, 'students', studentId), {
        hasViewed: false,
        lastViewedAt: ''
      });
      setSuccessMessage(`Reset view status for student ${studentId}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${studentId}`);
    }
  };
  
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort alphabetically by name
      studentData.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setStudents(studentData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredStudents = students.filter((s: any) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.period.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImport = async (assignmentTitle: string, parsedData: ParsedFeedback[]) => {
    const updates = parsedData
      .filter(p => p.matchedId)
      .map(p => ({
        id: p.matchedId!,
        feedback: `[${assignmentTitle}] ${p.feedback}`
      }));

    if (updates.length > 0) {
      try {
        const batch = writeBatch(db);
        updates.forEach(update => {
          const docRef = doc(db, 'students', update.id);
          batch.update(docRef, { 
            feedback: update.feedback,
            hasViewed: false,
            lastViewedAt: ''
          });
        });
        
        await batch.commit();
        setSuccessMessage(`Successfully updated feedback for ${updates.length} students in Database.`);
        setTimeout(() => setSuccessMessage(''), 5000);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'students');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-blue-900 p-6 selection:bg-cyan-500/30">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Instructor Dashboard</h1>
            <p className="text-slate-300">Welcome, {user?.email}</p>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 bg-white/10 border border-white/20 text-white hover:bg-white/20 px-4 py-2 rounded-lg transition-colors font-medium text-sm backdrop-blur-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </header>

        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 p-4 rounded-xl mb-6 flex items-center gap-3 shadow-lg backdrop-blur-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white/10 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <h2 className="text-lg font-semibold text-white">Student Directory</h2>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
                disabled={loading}
              >
                <Upload className="w-4 h-4" />
                Bulk Import
              </button>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 h-4 w-4" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-white/20 bg-black/20 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder:text-white/40 shadow-inner"
                disabled={loading}
              />
            </div>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center py-20 text-white/50">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-300 text-sm">
                    <th className="pb-3 font-semibold px-4">Student ID / Code</th>
                    <th className="pb-3 font-semibold px-4">Name</th>
                    <th className="pb-3 font-semibold px-4">Period</th>
                    <th className="pb-3 font-semibold px-4 min-w-[200px]">Latest Feedback</th>
                    <th className="pb-3 font-semibold px-4 text-center">Viewed</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student: any) => (
                      <motion.tr 
                        key={student.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-b last:border-0 border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-4 px-4 font-mono text-slate-300 text-xs w-32">
                          <span className="bg-black/30 px-2 py-1 rounded-md border border-white/10 text-white/80">{student.id}</span>
                        </td>
                        <td className="py-4 px-4 font-medium text-white">{student.name}</td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                            {student.period}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-300 leading-relaxed">
                          <div className="line-clamp-2 max-w-md">{student.feedback}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-3">
                            {student.hasViewed ? (
                              <div className="flex flex-col items-center group relative">
                                <Eye className="w-5 h-5 text-emerald-400" />
                                <span className="absolute -top-8 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                  {student.lastViewedAt ? new Date(student.lastViewedAt).toLocaleString() : 'Viewed'}
                                </span>
                              </div>
                            ) : (
                              <EyeOff className="w-5 h-5 text-slate-500" />
                            )}
                            <button 
                              onClick={() => resetViewStatus(student.id)}
                              className="text-slate-500 hover:text-cyan-400 transition-colors p-1 rounded-full hover:bg-white/10"
                              title="Reset view status"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No students found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      
      <BulkImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImport={handleImport}
        existingStudents={students}
      />
    </div>
  );
}
