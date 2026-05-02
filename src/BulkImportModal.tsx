import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bot, Check, AlertCircle, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ParsedFeedback {
  studentNameOrId: string;
  feedback: string;
  matchedId?: string;
  matchedName?: string;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (assignmentTitle: string, parsedData: ParsedFeedback[]) => void;
  existingStudents: any[];
}

export function BulkImportModal({ isOpen, onClose, onImport, existingStudents }: BulkImportModalProps) {
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  const [parsedResults, setParsedResults] = useState<ParsedFeedback[] | null>(null);

  const handleParse = async () => {
    setError('');
    
    if (!assignmentTitle.trim()) {
      setError('Please provide an assignment title.');
      return;
    }
    
    if (!rawText.trim()) {
      setError('Please paste the feedback text to parse.');
      return;
    }

    setIsParsing(true);
    setParsedResults(null);

    try {
      // Create a simplified list of students for the AI to match against (name and ID)
      const studentDirectory = existingStudents.map(s => ({ id: s.id, name: s.name }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `I have pasted some raw feedback text from an instructor. The format is roughly "[student name]: [feedback]", but it might be messy or have slight misspellings of names.
        
Please extract all the feedback into a structured list.
Here is the list of students in the class with their IDs:
${JSON.stringify(studentDirectory)}

Try to match the extracted student name to the provided student directory. 
If you find a good match, provide the "matchedId" and "matchedName". If not, just provide the raw extracted "studentNameOrId" and "feedback" and leave matchedId/Name empty.

Raw Text:
"""
${rawText}
"""
`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                studentNameOrId: {
                  type: Type.STRING,
                  description: "The raw student name or identifier extracted from the text.",
                },
                feedback: {
                  type: Type.STRING,
                  description: "The feedback text for the student.",
                },
                matchedId: {
                  type: Type.STRING,
                  description: "The matched student ID from the class list, if found.",
                },
                matchedName: {
                  type: Type.STRING,
                  description: "The matched student name from the class list, if found.",
                }
              },
              required: ["studentNameOrId", "feedback"]
            }
          }
        }
      });

      const extractedData = JSON.parse(response.text.trim()) as ParsedFeedback[];
      setParsedResults(extractedData);
    } catch (err) {
      console.error('Error parsing feedback:', err);
      setError('Failed to parse feedback. Please try again or check your format.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedResults) {
      onImport(assignmentTitle, parsedResults);
      setAssignmentTitle('');
      setRawText('');
      setParsedResults(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 m-auto z-50 w-full max-w-2xl h-fit max-h-[90vh] bg-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10"
          >
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30">
                  <Bot className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">AI Bulk Import</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {!parsedResults ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Assignment Title
                    </label>
                    <input
                      type="text"
                      value={assignmentTitle}
                      onChange={(e) => setAssignmentTitle(e.target.value)}
                      placeholder="e.g. Science Fair Project Part 1"
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/20 focus:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder:text-slate-500 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center justify-between">
                      <span>Raw Feedback Text</span>
                      <span className="text-xs text-slate-500 font-normal">Format: Name: Feedback</span>
                    </label>
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Angelique C. Quintana-Galindo: Great work on the hypothesis!&#10;Emery E. Burns: Needs more detail in the conclusion..."
                      className="w-full h-64 px-4 py-3 rounded-xl border border-white/10 bg-black/20 focus:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder:text-slate-500 resize-none font-mono text-sm leading-relaxed shadow-inner"
                    />
                  </div>
                  
                  {error && (
                    <div className="bg-red-500/20 text-red-300 p-3 rounded-xl text-sm flex items-center gap-2 border border-red-500/30 backdrop-blur-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleParse}
                    disabled={isParsing || !rawText.trim() || !assignmentTitle.trim()}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none text-slate-900 font-semibold py-3 flex justify-center items-center gap-2 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.7)] active:scale-[0.98]"
                  >
                    {isParsing ? (
                      <React.Fragment>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing Feedback with AI...
                      </React.Fragment>
                    ) : (
                      "Parse Feedback"
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl">
                    <h3 className="font-semibold text-cyan-400 mb-1">Review Parsed Feedback</h3>
                    <p className="text-cyan-200/80 text-sm">
                      AI successfully extracted {parsedResults.length} feedback entries for "{assignmentTitle}". 
                      Review the matches below before importing.
                    </p>
                  </div>

                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                    {parsedResults.map((result, idx) => (
                      <div key={idx} className="border border-white/10 p-4 rounded-xl bg-black/20 shadow-inner">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-white">
                            {result.matchedName ? (
                              <span className="flex items-center gap-2 text-emerald-400">
                                <Check className="w-4 h-4" />
                                {result.matchedName}
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-amber-400">
                                <AlertCircle className="w-4 h-4" />
                                <input 
                                  type="text" 
                                  value={result.studentNameOrId} 
                                  onChange={(e) => {
                                    const newResults = [...parsedResults];
                                    newResults[idx].studentNameOrId = e.target.value;
                                    setParsedResults(newResults);
                                  }}
                                  className="border-b border-dashed border-amber-500/50 text-amber-200 bg-transparent focus:outline-none"
                                />
                                (No Exact Match)
                              </span>
                            )}
                          </div>
                          {result.matchedId && (
                            <span className="text-xs bg-black/40 border border-white/10 px-2 py-1 rounded text-slate-300 font-mono">
                              {result.matchedId}
                            </span>
                          )}
                        </div>
                        <textarea
                          value={result.feedback}
                          onChange={(e) => {
                            const newResults = [...parsedResults];
                            newResults[idx].feedback = e.target.value;
                            setParsedResults(newResults);
                          }}
                          className="w-full text-sm text-slate-200 bg-black/20 p-3 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white/5 resize-none"
                          rows={3}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-white/10 mt-6">
                    <button
                      onClick={() => setParsedResults(null)}
                      className="flex-1 px-4 py-2 rounded-xl text-slate-300 font-medium hover:bg-white/10 transition-colors bg-white/5"
                    >
                      Back to Edit
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    >
                      Confirm Import
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
