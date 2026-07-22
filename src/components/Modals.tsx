import React, { useState, useEffect } from "react";
import { User, Quiz, CodingChallenge } from "../types";
import { Lock, Mail, UserPlus, X, HelpCircle, CheckCircle, Code, Award, Flame, Play, Clock, AlertTriangle, Download } from "lucide-react";
import { pdfExportService } from "../utils/pdfExportService";

/* =========================================================================
   LOGIN MODAL DIALOGUE
   ========================================================================= */
interface LoginModalProps {
  onClose: () => void;
  onSuccess: (token: string, user: User) => void;
  t: (key: string) => string;
}

export function LoginModal({ onClose, onSuccess, t }: LoginModalProps) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorFeedback, setErrorFeedback] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorFeedback("");
    window.showPowerCodeLoader?.("Loading Student Data...");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });

      const data = await res.json();
      if (data.error) {
        setErrorFeedback(data.error);
        window.hidePowerCodeLoader?.();
      } else {
        onSuccess(data.token, data.user);
        onClose();
        window.hidePowerCodeLoader?.();
      }
    } catch (err: any) {
      setErrorFeedback(`Driver connection error: ${err.message || err}`);
      window.hidePowerCodeLoader?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-sans" id="login-overlay">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#30363d]">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center pb-4 border-b border-[#21262d] mb-5">
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
            <Lock className="w-5 h-5 text-[#ff7b00]" />
            Sign In to PowerCode
          </h3>
          <p className="text-xs text-[#8b949e] mt-1">Unlock certificates, premium coding tutorials, and your personal compiler IDE.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#c9d1d9] font-semibold flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-[#ff7b00]" />
              Account Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] text-white py-2 px-3.5 rounded-lg text-sm outline-none focus:border-[#ff7b00]"
              id="login-email-input"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#c9d1d9] font-semibold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[#ff7b00]" />
              Secure Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] text-white py-2 px-3.5 rounded-lg text-sm outline-none focus:border-[#ff7b00]"
              id="login-pass-input"
              required
            />
          </div>

          {errorFeedback && (
            <div className="bg-[#f85149]/10 border border-[#f85149]/20 text-xs text-[#f85149] p-3 rounded-lg flex items-center gap-2 font-mono">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorFeedback}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-sm text-white font-bold py-2.5 rounded-lg transition-all cursor-pointer shadow-md disabled:opacity-50"
            id="login-auth-btn"
          >
            {isLoading ? "Authenticating Account credentials..." : t("login")}
          </button>
        </form>
      </div>
    </div>
  );
}


/* =========================================================================
   REGISTER ACCOUNTS MODAL
   ========================================================================= */
interface RegisterModalProps {
  onClose: () => void;
  onSuccess: (token: string, user: User) => void;
  t: (key: string) => string;
}

export function RegisterModal({ onClose, onSuccess, t }: RegisterModalProps) {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    setIsLoading(true);
    setFeedback("");
    window.showPowerCodeLoader?.("Uploading Content...");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password: password.trim() })
      });

      const data = await res.json();
      if (data.error) {
        setFeedback(data.error);
        window.hidePowerCodeLoader?.();
      } else {
        onSuccess(data.token, data.user);
        onClose();
        window.hidePowerCodeLoader?.();
      }
    } catch (err: any) {
      setFeedback(`Driver register failure: ${err.message || err}`);
      window.hidePowerCodeLoader?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-sans" id="register-overlay">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#30363d]">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center pb-4 border-b border-[#21262d] mb-5">
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
            <UserPlus className="w-5 h-5 text-[#ff7b00]" />
            Create Student Account
          </h3>
          <p className="text-xs text-[#8b949e] mt-1">Get verified certificates, tracks streaks and start learning programming today.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#c9d1d9] font-semibold">Full Student Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-[#0d1117] border border-[#30363d] text-white py-2 px-3.5 rounded-lg text-sm outline-none focus:border-[#ff7b00]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#c9d1d9] font-semibold">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="johndoe@gmail.com"
              className="w-full bg-[#0d1117] border border-[#30363d] text-white py-2 px-3.5 rounded-lg text-sm outline-none focus:border-[#ff7b00]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#c9d1d9] font-semibold">Choose Private Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters desired"
              className="w-full bg-[#0d1117] border border-[#30363d] text-white py-2 px-3.5 rounded-lg text-sm outline-none focus:border-[#ff7b00]"
              required
            />
          </div>

          {feedback && (
            <div className="bg-[#f85149]/10 border border-[#f85149]/20 text-xs text-[#f85149] p-3 rounded-lg font-mono">
              {feedback}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-sm text-white font-bold py-2.5 rounded-lg transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {isLoading ? "Provisioning verified student slot..." : "+ join me"}
          </button>
        </form>
      </div>
    </div>
  );
}


/* =========================================================================
   QUIZZING SYSTEM CONTAINER VIEW
   ========================================================================= */
interface QuizSystemProps {
  quiz: Quiz;
  user: User;
  onClose: () => void;
  onFinished: () => void;
}

export function QuizSystem({ quiz, user, onClose, onFinished }: QuizSystemProps) {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(quiz.durationMinutes * 60);
  const [results, setResults] = useState<{ score: number; passed: boolean; correctCount: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string>("");

  useEffect(() => {
    // Escape early if quiz results shown
    if (results) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitAnswers();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [results]);

  const handleSelectOption = (questionId: number, selection: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: selection
    }));
  };

  const handleSubmitAnswers = async () => {
    setSubmitting(true);
    setQuizError("");

    try {
      const res = await fetch("/api/quizzes/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({
          quizId: quiz.id,
          answers: selectedAnswers
        })
      });

      const data = await res.json();
      if (data.error) {
        setQuizError(data.error);
      } else {
        setResults({
          score: data.score,
          passed: data.passed,
          correctCount: data.correctCount,
          total: data.totalQuestions
        });
      }
    } catch (err: any) {
      setQuizError(`Quiz execution crashed: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = quiz.questions[currentIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-sans" id="quiz-flow-panel">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#30363d]">
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-between items-center pb-3 border-b border-[#21262d] mb-4 text-[#8b949e] text-xs">
          <span className="font-bold text-white uppercase tracking-wider">{quiz.title}</span>
          <span className="font-mono text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
          </span>
        </div>

        {results ? (
          /* Quiz Scoring Results Board */
          <div className="text-center py-6 space-y-4" id="quiz-results">
            <div className="bg-[#0b132b] p-6 rounded-2xl border border-[#ff7b00]/20 inline-block">
              {results.passed ? (
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
              ) : (
                <AlertTriangle className="w-14 h-14 text-orange-500 mx-auto" />
              )}
              <h4 className="text-xl font-extrabold text-white mt-3">
                {results.passed ? "Syllabus Assessment Passed!" : "Failed to achieve scores"}
              </h4>
              <p className="text-sm text-gray-400 font-mono mt-1">Accuracy scored: {results.score}%</p>
            </div>

            <p className="text-xs text-[#c9d1d9] max-w-sm mx-auto leading-relaxed">
              {results.passed
                ? `Incredible job! Scored ${results.correctCount}/${results.total} questions correct and awarded +50 XP points to your profile honors.`
                : `Score threshold was ${quiz.passingScore}%. We recommend reviewing the control loops module and testing variables in the ide sandbox first.`}
            </p>

            <div className="flex flex-wrap gap-3 justify-center items-center mt-6">
              <button
                onClick={() => pdfExportService.downloadQuizResult(quiz, user.name || user.email, results.score, selectedAnswers)}
                className="bg-zinc-850 hover:bg-zinc-800 text-gray-200 border border-zinc-700 hover:border-[#ff7b00] font-bold text-xs py-2 px-5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                type="button"
              >
                <Download className="w-3.5 h-3.5 text-[#ff7b00]" />
                <span>Download Report PDF</span>
              </button>

              <button
                onClick={() => { onFinished(); onClose(); }}
                className="bg-[#ff7b00] hover:bg-[#e66f00] text-white font-bold text-xs py-2 px-6 rounded-lg transition-colors cursor-pointer"
                type="button"
              >
                Continue path
              </button>
            </div>
          </div>
        ) : (
          /* Active Question layout */
          <div className="space-y-5" id="active-question-card">
            <div className="flex justify-between text-[#8b949e] text-[10px] uppercase font-bold tracking-widest">
              <span>QUESTION {currentIdx + 1} OF {quiz.questions.length}</span>
              <span>Pass target: {quiz.passingScore}%</span>
            </div>

            <p className="text-sm font-semibold text-white leading-relaxed">{currentQuestion.question}</p>

            <div className="space-y-2">
              {currentQuestion.options.map((opt) => {
                const active = selectedAnswers[currentQuestion.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectOption(currentQuestion.id, opt)}
                    className={`w-full text-left py-3 px-4 rounded-xl border transition-all text-xs flex justify-between items-center ${
                      active
                        ? "bg-[#ff7b00]/15 border-[#ff7b00] text-white font-bold"
                        : "bg-[#0d1117] border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]"
                    }`}
                  >
                    <span>{opt}</span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${active ? "bg-[#ff7b00] border-[#ff7b00]" : "border-gray-600"}`}>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {quizError && (
              <div className="text-xs text-red-400 font-mono py-1">{quizError}</div>
            )}

            <div className="flex justify-between border-t border-[#21262d] pt-4 mt-6">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="bg-[#21262d] hover:bg-[#30363d] text-white font-bold text-xs py-1.5 px-4 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
              >
                Previous
              </button>

              {currentIdx < quiz.questions.length - 1 ? (
                <button
                  disabled={!selectedAnswers[currentQuestion.id]}
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="bg-[#ff7b00] hover:bg-[#e66f00] text-white font-bold text-xs py-1.5 px-5 rounded-lg disabled:opacity-40 transition-all cursor-pointer"
                >
                  Next Question
                </button>
              ) : (
                <button
                  disabled={submitting || !selectedAnswers[currentQuestion.id]}
                  onClick={handleSubmitAnswers}
                  className="bg-[#2ea043] hover:bg-[#2c974b] text-white font-bold text-xs py-1.5 px-5 rounded-lg disabled:opacity-40 transition-all cursor-pointer"
                >
                  {submitting ? "Analyzing options..." : "Submit Answers"}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


/* =========================================================================
   CODING CHALLENGES SOLVER BOX
   ========================================================================= */
interface CodingChallengeModalProps {
  challenge: CodingChallenge;
  user: User;
  onClose: () => void;
  onSolved: () => void;
}

export function CodingChallengeModal({ challenge, user, onClose, onSolved }: CodingChallengeModalProps) {
  const [editorCode, setEditorCode] = useState<string>(challenge.starterCode);
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testLog, setTestLog] = useState<string>("");

  const handleSubmitSolution = async () => {
    setIsLoading(true);
    setTestLog("");
    setStatus("");

    try {
      const res = await fetch("/api/challenges/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.email}`
        },
        body: JSON.stringify({
          challengeId: challenge.id,
          code: editorCode
        })
      });

      const data = await res.json();
      setStatus(data.status);
      setTestLog(data.summary);

      if (data.status === "PASSED") {
        onSolved();
      }
    } catch (err: any) {
      setTestLog(`Connection failed inside algorithmic compiler sandbox: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-sans" id="challenge-compiler-overlay">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-4xl w-full p-5 lg:p-6 shadow-2xl relative grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Close control panel */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#30363d] z-10">
          <X className="w-5 h-5" />
        </button>

        {/* Left column: Challenge Details & Test Cases */}
        <div className="flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#30363d] pr-0 md:pr-4 pb-4 md:pb-0 h-[480px]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${
                challenge.difficulty === "EASY" ? "bg-green-500/15 text-green-400 border border-green-500/30" : "bg-yellow-500/15 text-yellow-500 border border-yellow-500/30"
              }`}>
                {challenge.difficulty} difficulty
              </span>
              <span className="text-[10px] text-gray-500 font-mono">Algorithms • +{challenge.points} XP Award</span>
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">{challenge.title}</h3>
            <p className="text-xs text-[#c9d1d9] mt-2 whitespace-pre-line leading-relaxed overflow-y-auto max-h-[220px] pr-1">
              {challenge.description}
            </p>
          </div>

          {/* Test cases and runtime stats dashboard */}
          <div className="space-y-3 pt-3 border-t border-[#21262d] mt-4">
            <span className="text-[10px] text-[#8b949e] uppercase font-bold block mb-1">Algorithmic Test Constraints:</span>
            <div className="bg-[#0d1117] border border-[#21262d] p-3 rounded-lg text-xs space-y-1.5">
              <div className="flex justify-between font-mono text-[11px] text-gray-400">
                <span>Input Variable types:</span>
                <span className="text-white">Primitive string/array</span>
              </div>
              <div className="flex justify-between font-mono text-[11px] text-gray-400">
                <span>Memory usage bound:</span>
                <span className="text-white">&lt; 128 MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Code Terminal Workspace Editor */}
        <div className="flex flex-col gap-4 h-[480px]">
          <div className="bg-[#0d1117] rounded-xl border border-[#21262d] flex-1 overflow-hidden flex flex-col">
            <div className="bg-[#161b22] py-2 px-4 border-b border-[#21262d] flex justify-between items-center text-[11px] text-[#8b949e]">
              <span className="font-mono flex items-center gap-1">
                <Code className="w-3.5 h-3.5 text-[#ff7b00]" />
                solution.js
              </span>
              <span className="text-green-500">Node JS Sandbox</span>
            </div>

            <textarea
              value={editorCode}
              onChange={(e) => setEditorCode(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none p-3 font-mono text-xs text-[#dbebd6] leading-relaxed resize-none focus:ring-0"
              spellCheck={false}
            />
          </div>

          {/* Terminal submission outcomes */}
          {testLog && (
            <div className={`p-3 rounded-xl border text-xs font-mono space-y-1.5 ${
              status === "PASSED" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-[#f85149]"
            }`}>
              <div className="font-bold flex items-center gap-1">
                {status === "PASSED" ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>{status === "PASSED" ? "Verification Success" : "Validation Failed"}</span>
              </div>
              <p className="text-[11px] leading-relaxed">{testLog}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleSubmitSolution}
              disabled={isLoading || !editorCode.trim()}
              className="bg-[#2ea043] hover:bg-[#2c974b] text-white font-bold py-2 px-6 rounded-lg text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isLoading ? "Running verifier..." : "Submit Code Solutions"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
