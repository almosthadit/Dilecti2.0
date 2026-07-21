import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { ViewState } from "../types";
import { useUser } from "../context/UserContext";
import { useUserProfile } from "../hooks";

export default function OnboardingModal({
  isOpen,
  onClose,
  onNavigate,
  onOpenImport,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
  onOpenImport: () => void;
}) {
  const [step, setStep] = useState(1);
  const { user } = useUser();
  const { updateProfile: updateFirestoreProfile } = useUserProfile();
  const [demographics, setDemographics] = useState({
    birthday: "",
    gender: "",
    location: "",
    lifestyle: "",
    employment: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // State for Step 3
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [hasTried, setHasTried] = useState<boolean | null>(null);
  const [trainingFeedbacks, setTrainingFeedbacks] = useState<string[]>([]);
  const baselineItems = [
    { title: "Dune", category: "movie", desc: "Epic sci-fi adventure" },
    { title: "Sushi", category: "food", desc: "Japanese cuisine" },
    { title: "The Office", category: "watch", desc: "Workplace comedy" },
    { title: "Hiking", category: "places", desc: "Outdoor activity" },
  ];

  const handleSave = () => {
    setIsSaving(true);
    if (user && updateFirestoreProfile) {
      updateFirestoreProfile({ 
        demographics,
        preferences: trainingFeedbacks.join(". ")
      });
    }
    setTimeout(() => {
      setIsSaving(false);
      localStorage.setItem("fiona_onboarding_completed", "true");
      onClose();
    }, 1200);
  };

  const handleNextTraining = (feedback?: string) => {
    if (feedback) {
      setTrainingFeedbacks(prev => [...prev, feedback]);
    }
    if (trainingIndex < baselineItems.length - 1) {
      setTrainingIndex(prev => prev + 1);
      setIsRejecting(false);
      setRejectionReason("");
      setHasTried(null);
    } else {
      if (feedback) {
        // Need to wait one tick for state to update, or just use current array
        if (user && updateFirestoreProfile) {
           updateFirestoreProfile({ 
             demographics,
             preferences: [...trainingFeedbacks, feedback].join(". ")
           });
        }
      }
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 min-h-screen z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          className="w-full max-w-lg bg-[#f0ede6] rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center p-6 border-b border-black/5 dark:border-white/5">
            <h2 className="font-serif text-2xl font-medium">
              Welcome to Dilecti
            </h2>
            {step !== 1 && (
              <button
                onClick={onClose}
                className="p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors dark:bg-white/5"
              >
                <X className="w-5 h-5 text-black/60 dark:text-white/60" />
              </button>
            )}
          </div>

          <div className="p-6 overflow-y-auto">
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2 mb-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl mx-auto flex items-center justify-center mb-4 dark:bg-emerald-900">
                    <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-medium">
                    Let's set up your profile
                  </h3>
                  <p className="text-black/60 text-sm dark:text-white/60">
                    To give you the best AI recommendations possible, we need a
                    little context about who you are.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-white p-4 rounded-2xl border border-black/5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex items-center gap-4 text-left dark:bg-[#1a1a1a] dark:border-white/5"
                  >
                    <div className="bg-emerald-50 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 dark:bg-emerald-950">
                      <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        Personalize Dilecti
                      </h4>
                      <p className="text-xs text-black/50 dark:text-white/50">
                        Quick 2-minute demographic setup
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-black/20" />
                  </button>

                  <button
                    onClick={handleSave}
                    className="w-full bg-transparent p-4 text-center group"
                  >
                    <span className="font-medium text-sm text-black/40 group-hover:text-black/70 transition-colors">
                      Skip for now
                    </span>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95">
                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-medium mb-1">
                    A bit about you
                  </h3>
                  <p className="text-sm text-black/50 mb-3 dark:text-white/50">
                    Tappable context to dramatically improve recommendations.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-black/60 uppercase mb-2 dark:text-white/60">
                      Birthday
                    </label>
                    <input
                      type="date"
                      value={demographics.birthday}
                      onChange={(e) =>
                        setDemographics({
                          ...demographics,
                          birthday: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:bg-[#1a1a1a] dark:border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/60 uppercase mb-2 dark:text-white/60">
                      Gender
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        "Male",
                        "Female",
                        "Non-binary",
                        "Prefer not to say",
                      ].map((g) => (
                        <button
                          key={g}
                          onClick={() =>
                            setDemographics({ ...demographics, gender: g })
                          }
                          className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${demographics.gender === g ? "bg-emerald-600 text-white border-transparent" : "bg-white text-black/70 border-black/10 hover:bg-black/5"} dark:border-white/10 dark:text-white/70`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/60 uppercase mb-2 dark:text-white/60">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pacific Northwest, New York..."
                      value={demographics.location}
                      onChange={(e) =>
                        setDemographics({
                          ...demographics,
                          location: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:bg-[#1a1a1a] dark:border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/60 uppercase mb-2 dark:text-white/60">
                      Lifestyle & Family
                    </label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {[
                        "Single",
                        "Married",
                        "Kids",
                        "College Student",
                        "Retiree",
                        "Digital Nomad",
                      ].map((g) => (
                        <button
                          key={g}
                          onClick={() =>
                            setDemographics({ ...demographics, lifestyle: g })
                          }
                          className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${demographics.lifestyle === g ? "bg-emerald-600 text-white border-transparent" : "bg-white text-black/70 border-black/10 hover:bg-black/5"} dark:border-white/10 dark:text-white/70`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="or type custom..."
                      value={demographics.lifestyle}
                      onChange={(e) =>
                        setDemographics({
                          ...demographics,
                          lifestyle: e.target.value,
                        })
                      }
                      className="w-full mt-2 bg-white border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:bg-[#1a1a1a] dark:border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/60 uppercase mb-2 dark:text-white/60">
                      Employment
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Software Engineer, Healthcare..."
                      value={demographics.employment}
                      onChange={(e) =>
                        setDemographics({
                          ...demographics,
                          employment: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:bg-[#1a1a1a] dark:border-white/10"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95">
                 <div className="text-center space-y-2 mb-6">
                   <h3 className="font-serif text-lg font-medium">Algorithm Calibration</h3>
                   <p className="text-sm text-black/50 dark:text-white/50">Teach Dilecti about your taste using baselines.</p>
                 </div>
                 <div className="bg-white border rounded-3xl p-6 text-center shadow-sm dark:bg-[#1a1a1a]">
                   <h4 className="text-2xl font-bold font-serif mb-1">{baselineItems[trainingIndex].title}</h4>
                   <p className="text-sm text-neutral-500 mb-6 dark:text-neutral-400">{baselineItems[trainingIndex].desc}</p>

                   {hasTried === null && !isRejecting && (
                     <div className="space-y-3">
                       <button onClick={() => setHasTried(true)} className="w-full bg-black/5 hover:bg-black/10 py-3 rounded-xl font-bold transition-colors dark:bg-white/5">I've tried this</button>
                       <button onClick={() => handleNextTraining()} className="w-full border py-3 rounded-xl font-semibold text-black/60 hover:bg-black/5 transition-colors dark:text-white/60">I haven't tried this (Skip)</button>
                     </div>
                   )}

                   {hasTried === true && !isRejecting && (
                     <div className="space-y-3">
                       <button onClick={() => handleNextTraining(`Likes ${baselineItems[trainingIndex].title}`)} className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 py-3 rounded-xl font-bold transition-colors dark:text-emerald-200 dark:bg-emerald-900">I'm a Fan</button>
                       <button onClick={() => setIsRejecting(true)} className="w-full bg-red-100 hover:bg-red-200 text-red-800 py-3 rounded-xl font-bold transition-colors mb-2">Not For Me</button>
                       <button onClick={() => setHasTried(null)} className="text-xs text-black/40 font-semibold underline">Back</button>
                     </div>
                   )}

                   {isRejecting && (
                     <div className="text-left animate-in fade-in slide-in-from-bottom-4">
                       <label className="block text-sm font-bold text-red-800 mb-2">Why aren't you interested?</label>
                       <p className="text-xs text-red-600/80 mb-3">You must provide a reason so we don't skew your algorithm with a generic dislike.</p>
                       <textarea 
                         value={rejectionReason}
                         onChange={e => setRejectionReason(e.target.value)}
                         className="w-full bg-red-50 border border-red-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 mb-3 resize-none h-24 dark:bg-red-950"
                         placeholder="E.g. I don't like raw fish..."
                       />
                       <button 
                         disabled={rejectionReason.length < 5}
                         onClick={() => handleNextTraining(`Dislikes ${baselineItems[trainingIndex].title} because: ${rejectionReason}`)} 
                         className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
                       >
                         Confirm
                       </button>
                     </div>
                   )}
                 </div>
              </div>
            )}
          </div>

          {step === 2 && (
            <div className="bg-white p-6 border-t border-black/5 flex gap-3 dark:bg-[#1a1a1a] dark:border-white/5">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-black/5 hover:bg-black/10 text-black/70 font-semibold py-3 rounded-xl transition-colors dark:bg-white/5 dark:text-white/70"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                Next 
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
