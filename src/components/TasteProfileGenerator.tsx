import React, { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import TasteProfileDisplay from "./TasteProfileDisplay";

export default function TasteProfileGenerator({
  user,
  profile,
  books,
  ratedBooksCount,
  updateFirestoreProfile,
}: {
  user: any;
  profile: any;
  books: any[];
  ratedBooksCount: number;
  updateFirestoreProfile: (data: Partial<any>) => Promise<void>;
}) {
  const [conversationalInput, setConversationalInput] = useState("");
  const [isUpdatingTaste, setIsUpdatingTaste] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Summarizing taste...");
  const [errorMsg, setErrorMsg] = useState("");
  const autoGenerateTriggered = useRef(false);

  const loadingMessages = [
    "Analyzing semantic relationships...",
    "Normalizing cross-domain entities...",
    "Finding hidden throughlines...",
    "Building your taste graph...",
    "Distilling core aesthetics...",
    "Almost there..."
  ];

  useEffect(() => {
    let progressInterval: any;
    let messageInterval: any;
    
    if (isUpdatingTaste) {
      setLoadingProgress(0);
      setLoadingMessage(loadingMessages[0]);
      
      progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) return 95;
          return prev + Math.floor(Math.random() * 5) + 1;
        });
      }, 300);

      let msgIndex = 0;
      messageInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[msgIndex]);
      }, 2000);
    } else {
      setLoadingProgress(0);
    }

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [isUpdatingTaste]);

  const mapItemToContext = (b: any) => 
    `${b.title} (${b.category})${b.status ? " - Status: " + b.status : ""}${b.reaction ? " - Reaction: " + b.reaction : ""}${b.criticScore ? " - Score: " + b.criticScore + "/10" : ""}${b.rating ? " - " + b.rating + " stars" : ""}${b.metadata?.genres?.length ? " - Genres: " + b.metadata.genres.join('|') : ""}${b.metadata?.keywords?.length ? " - Keywords: " + b.metadata.keywords.join('|') : ""}`;

  useEffect(() => {
    if (
      user &&
      profile &&
      !profile.preferences &&
      books.length > 0 &&
      !autoGenerateTriggered.current
    ) {
      // Auto-generate profile
      autoGenerateTriggered.current = true;
      setIsUpdatingTaste(true);
      setErrorMsg("");
      const contextItems = books
        .slice(0, 50)
        .map(mapItemToContext)
        .join(", ");
      fetch("/api/update-understanding", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-api-key": localStorage.getItem("user_gemini_api_key") || "", "x-user-ai-provider": localStorage.getItem("user_ai_provider") || "gemini" },
        body: JSON.stringify({
          currentUnderstanding: "",
          userInput: "",
          itemsContext: contextItems,
          userId: profile?.id || user?.uid,
          demographicsContext: profile?.demographics || {},
        }),
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data.error || "Failed to update profile");
          return data;
        })
        .then((data) => {
          if (updateFirestoreProfile && data.newUnderstanding) {
            updateFirestoreProfile({ preferences: data.newUnderstanding });
          }
        })
        .catch((e) => {
          console.error(e);
          setErrorMsg(e.message);
          autoGenerateTriggered.current = false;
        })
        .finally(() => setIsUpdatingTaste(false));
    }
  }, [user, profile, books.length]);

  return (
    <div className="relative flex flex-col justify-center w-full">
      {!user ? (
        <div className="text-left mt-2">
          <p className="text-emerald-800/70 mb-4 text-sm font-medium">
            Sign in to let Dilecti build your personal taste matrix.
          </p>
        </div>
      ) : (
        <div className="mt-2 flex-col flex h-full">
          {profile?.preferences && profile.preferences.length > 0 && !profile.preferences.includes("Dilecti is temporarily overloaded") && !profile.preferences.includes("Dilecti encountered an error") ? (
            <div className="mb-4">
              {(() => {
                 let parsedData = null;
                 try {
                    const cleanText = profile.preferences.trim();
                    if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
                       parsedData = JSON.parse(cleanText);
                    } else {
                       const match = cleanText.match(/\{[\s\S]*\}/);
                       if (match) {
                          parsedData = JSON.parse(match[0]);
                       }
                    }
                 } catch(e) {}
                 return <TasteProfileDisplay markdown={profile.preferences} profileData={parsedData} />;
              })()}
            </div>
          ) : (
            <div className="text-emerald-900/80 leading-relaxed text-sm font-medium mb-4 flex flex-col gap-2 items-start">
              <span>
                Generating your personal taste profile based on your{" "}
                {ratedBooksCount} rated items...
              </span>
              {ratedBooksCount > 0 && !isUpdatingTaste && (
                <button
                  onClick={() => {
                    setIsUpdatingTaste(true);
                    setErrorMsg("");
                    fetch("/api/update-understanding", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "x-user-api-key": localStorage.getItem("user_gemini_api_key") || "", "x-user-ai-provider": localStorage.getItem("user_ai_provider") || "gemini" },
                      body: JSON.stringify({
                        currentUnderstanding: "",
                        userInput: "",
                        itemsContext: books
                          .slice(0, 50)
                          .map(mapItemToContext)
                          .join(", "),
                        userId: profile?.id || user?.uid,
                        demographicsContext: profile?.demographics || {},
                      }),
                    })
                      .then(async (r) => {
                        const data = await r.json().catch(() => ({}));
                        if (!r.ok) throw new Error(data.error || "Failed to update profile");
                        return data;
                      })
                      .then((data) => {
                        if (updateFirestoreProfile && data.newUnderstanding)
                          updateFirestoreProfile({
                            preferences: data.newUnderstanding,
                          });
                      })
                      .catch((e) => setErrorMsg(e.message))
                      .finally(() => setIsUpdatingTaste(false));
                  }}
                  disabled={isUpdatingTaste}
                  className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 disabled:opacity-50 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-emerald-200 transition-colors dark:text-emerald-200 dark:bg-emerald-900"
                >
                  Begin Generation
                </button>
              )}
              {isUpdatingTaste && (
                <div className="flex flex-col gap-2 w-full mt-2">
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-bold w-fit dark:text-emerald-300 dark:bg-emerald-950">
                    <Loader2 className="w-3 h-3 animate-spin" /> {loadingProgress}% - {loadingMessage}
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-1.5 dark:bg-emerald-900/50">
                    <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${loadingProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Actions (Sticky) */}
          <div className="sticky bottom-0 left-0 right-0 mt-4 pt-3 pb-2 bg-white/95 backdrop-blur-md border-t border-emerald-100 z-30 dark:border-emerald-900">
            <div className="flex flex-col gap-2">
              {profile?.preferences && profile.preferences.length > 0 && (
                <div className="flex justify-center mt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Are you sure you want to recalculate your Taste Profile entirely from scratch?")) return;
                      setIsUpdatingTaste(true);
                      setErrorMsg("");
                      try {
                        const itemsContext = books.slice(0, 50).map(mapItemToContext).join(", ");
                        const res = await fetch("/api/update-understanding", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", "x-user-api-key": localStorage.getItem("user_gemini_api_key") || "", "x-user-ai-provider": localStorage.getItem("user_ai_provider") || "gemini" },
                          body: JSON.stringify({
                            currentUnderstanding: "",
                            userInput: "Generate my first taste profile",
                            itemsContext,
                            userId: profile?.id || user?.uid,
                            demographicsContext: profile?.demographics || {},
                          }),
                        });
                        const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
                        if (!res.ok) throw new Error(data.error || "Failed to update profile");
                        if (updateFirestoreProfile && data.newUnderstanding) {
                          await updateFirestoreProfile({ preferences: data.newUnderstanding });
                        }
                      } catch (err: any) {
                        console.error(err);
                        setErrorMsg(err.message);
                      } finally {
                        setIsUpdatingTaste(false);
                      }
                    }}
                    disabled={isUpdatingTaste}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 disabled:opacity-50 text-xs font-bold transition-colors rounded-full uppercase tracking-wider dark:text-emerald-300 dark:bg-emerald-950"
                  >
                    {isUpdatingTaste ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Recalculate Taste Profile
                  </button>
                </div>
              )}
            </div>
            
            {errorMsg && (
              <div className="mt-3 flex items-start gap-2 bg-red-50/50 text-red-600 rounded-xl px-3 py-2 text-[11px] dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
