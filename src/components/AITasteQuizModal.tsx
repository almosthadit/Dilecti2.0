import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { useUserProfile, useUserItems } from "../hooks";
import { auth } from "../lib/firebase";

export default function AITasteQuizModal({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile } = useUserProfile();
  const { userItems: items } = useUserItems();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    setLoading(true);
    const itemsContext = items.map(i => `${i.title} (${i.category})`).join(", ");

    fetch("/api/generate-taste-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemsContext })
    })
    .then(res => res.json().catch(() => ({})))
    .then(data => {
        if(data.questions && data.questions.length > 0) {
            setQuestions(data.questions);
        } else {
             // Fallback
             setQuestions([
                 { title: "Which weekend activity appeals more?", optionA: "Quiet espresso at a bookstore", optionB: "Energetic night at a concert" },
                 { title: "If you could only watch one genre for a year?", optionA: "Mind-bending Sci-Fi", optionB: "Heartwarming Drama" }
             ]);
        }
        setLoading(false);
    })
    .catch(() => setLoading(false));
  }, [items]);

  const handleAnswer = async (answer: string) => {
     const newAnswers = [...quizAnswers, `Q: ${questions[currentQIndex].title} A: ${answer}`];
     setQuizAnswers(newAnswers);
     
     if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(currentQIndex + 1);
     } else {
        setEvaluating(true);
        try {
            const userInput = "I just took a new taste validation quiz. Here are my answers. Please update my profile to reflect these aesthetics: \n" + newAnswers.join("\n");
            const itemsContext = items.map(i => `${i.title} (${i.category})`).join(", ");

            const res = await fetch("/api/update-understanding", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-api-key": localStorage.getItem("user_gemini_api_key") || "", "x-user-ai-provider": localStorage.getItem("user_ai_provider") || "gemini" },
                body: JSON.stringify({
                    currentUnderstanding: profile?.preferences || "",
                    userInput: userInput,
                    itemsContext: itemsContext,
                    userId: auth?.currentUser?.uid,
                    demographicsContext: profile?.demographics || {}
                })
            });
            const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
            if (data.newUnderstanding && updateProfile) {
                await updateProfile({ preferences: data.newUnderstanding });
                window.dispatchEvent(new CustomEvent('toast-alert', { detail: { type: 'success', message: 'Taste Profile updated successfully.' }}));
            }
        } catch (e) {
            console.error(e);
        }
        setEvaluating(false);
        onClose();
     }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl relative z-10 p-8 flex flex-col items-center text-center dark:bg-[#1a1a1a]"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-black/40 hover:bg-black/5 rounded-full" disabled={evaluating}>
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 dark:text-emerald-400 dark:bg-emerald-900">
           <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-2xl font-medium mb-2 text-neutral-900 dark:text-white">Taste Alignment Quiz</h2>
        <p className="text-sm text-black/50 mb-8 dark:text-white/50">Help the Dilecti engine understand your unique sensibilities mathematically.</p>

        {loading ? (
           <div className="py-12 flex flex-col items-center text-black/40">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Looking for hidden connections across your items...</p>
           </div>
        ) : evaluating ? (
           <div className="py-12 flex flex-col items-center text-emerald-900 dark:text-emerald-100">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-serif text-xl font-medium mb-2">Re-mapping your aesthetic...</h3>
              <p className="text-black/60 text-sm dark:text-white/60">Processing your answers and updating your taste dimensions.</p>
           </div>
        ) : (
           <AnimatePresence mode="wait">
              {questions[currentQIndex] && (
                 <motion.div 
                   key={currentQIndex}
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="w-full space-y-6"
                 >
                    <h3 className="font-medium text-lg leading-snug">{questions[currentQIndex].title}</h3>
                    <div className="flex flex-col gap-3">
                       <button 
                         onClick={() => handleAnswer(questions[currentQIndex].optionA)}
                         className="p-4 rounded-xl border border-black/10 hover:border-emerald-600 hover:bg-black/5 text-left text-sm font-medium transition-colors dark:border-white/10"
                       >
                         {questions[currentQIndex].optionA}
                       </button>
                       <button 
                         onClick={() => handleAnswer(questions[currentQIndex].optionB)}
                         className="p-4 rounded-xl border border-black/10 hover:border-emerald-600 hover:bg-black/5 text-left text-sm font-medium transition-colors dark:border-white/10"
                       >
                         {questions[currentQIndex].optionB}
                       </button>
                    </div>
                 </motion.div>
              )}
           </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}
