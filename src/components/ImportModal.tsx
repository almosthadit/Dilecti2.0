import React, { useState, useRef } from "react";
import { ArrowLeft, Smartphone, List, Download, Loader2, Image as ImageIcon, FileText, Library, Tv, Headphones, ShoppingBag, Globe, Plus, X, Bot, Copy, Check, Video, MonitorUp, Upload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Papa from "papaparse";

import { useUserItems, useUserProfile } from "../hooks";
import { useUser } from "../context/UserContext";
import { enrichItemsInBackground } from "../lib/enrichment";

export default function ImportModal({ 
  isOpen, 
  onClose, 
  initialMode
}: { 
  isOpen: boolean; 
  onClose: () => void, 
  initialMode?: string | null
}) {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const { saveMultipleItems } = useUserItems();
  const { profile, updateProfile } = useUserProfile();
  const { user } = useUser();
  
  const [urlInput, setUrlInput] = useState("");
  const [isUrlMode, setIsUrlMode] = useState(false);
  
  const [aiMemoryInput, setAiMemoryInput] = useState("");
  const [isAiMemoryMode, setIsAiMemoryMode] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [hasCopiedPrompt, setHasCopiedPrompt] = useState(false);
  
  const aiPrompt = "You are helping me import context from one AI assistant to another. Your job is to go through our past conversations and sum up what you know about me. Focus on my preferences, tastes, habits, and specific media or items I like.";

  const [isLibbyView, setIsLibbyView] = useState(false);
  
  React.useEffect(() => {
    if (!isOpen) { 
       setIsAiMemoryMode(false);
       setSelectedIntegration(null);
       setIsUrlMode(false);
       setIsLibbyView(false);
       return; 
    }
    if (initialMode === 'ai-memory') {
       setIsAiMemoryMode(true);
    } else if (initialMode === 'upload') {
       setTimeout(() => {
          csvInputRef.current?.click();
       }, 100);
    } else if (initialMode === 'url') {
       setIsUrlMode(true);
    }
  }, [isOpen, initialMode]);

  const performSave = async (parsedItems: any[]) => {
    const itemsToSave: any[] = [];
    parsedItems.forEach((item, idx) => {
       const newItem = {
          id: `imported-${Date.now()}-${idx}`,
          title: item.title,
          subtitle: item.subtitle || item.author || "",
          category: item.category || 'book',
          rating: item.rating || 0,
          reaction: item.reaction || null,
          review: item.review || "",
          dateAdded: item.dateAdded || Date.now(),
          status: item.status || 'completed',
          collections: item.collections || [],
          coverUrl: item.coverUrl || "",
          description: item.description || "Imported Item",
          sourceAttribution: item.sourceAttribution || "Imported"
       };
       itemsToSave.push(newItem);
    });
    
    await saveMultipleItems(itemsToSave);
    

    
    alert(`Successfully imported ${itemsToSave.length} items!`);
    handleClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files || e.target.files.length === 0) return;
     const file = e.target.files[0];
     
     setIsParsing(true);
     setError("");

     try {
       const reader = new FileReader();
       reader.onloadend = async () => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
              if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            const base64String = canvas.toDataURL("image/jpeg", 0.8);
            
            try {
              const res = await fetch('/api/scan-bulk', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ images: [base64String] })
              });

              const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
              if (!res.ok) throw new Error(data.error || "Failed to parse image.");
              setIsParsing(false);
              
              if (data && Array.isArray(data) && data.length > 0) {
                 performSave(data.map((p: any) => ({ ...p, sourceAttribution: "Smart Photo Scan" })));
              } else {
                 setError("No items found in the image. Try clearer text or an image with obvious titles.");
              }
            } catch (err: any) {
              setIsParsing(false);
              setError(err.message || "API Error: Failed to parse image.");
            }
          };
          img.onerror = () => {
            setIsParsing(false);
            setError("Failed to process image.");
          };
          img.src = reader.result as string;
       };
       reader.onerror = () => {
          setIsParsing(false);
          setError("Failed to read file.");
       };
       reader.readAsDataURL(file);
     } catch (err) {
       setIsParsing(false);
       setError("Something went wrong processing your file.");
     }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsParsing(true);
    setError("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsParsing(false);
        const items = results.data
          .filter((row: any) => row.Title || row.Name)
          .map((row: any) => {
            let status = 'completed';
            let rating = Number(row['Rating'] || row['My Rating']) || 0;
            let review = row['Review'] || row['My Review'] || "";
            let categoryText = (row['Category'] || row['Type'] || "").toLowerCase();
            
            let category = 'book';
            if (categoryText.includes('movie') || categoryText.includes('film')) category = 'movie';
            else if (categoryText.includes('music') || categoryText.includes('album')) category = 'music';
            else if (categoryText.includes('game')) category = 'game';
            else if (categoryText.includes('food') || categoryText.includes('restaurant')) category = 'food';
            else if (categoryText.includes('place') || categoryText.includes('travel')) category = 'place';
            else if (categoryText.includes('product')) category = 'product';

            return {
              title: row.Title || row.Name,
              subtitle: row.Author || row.Creator || row.Director || row.Artist || "",
              rating,
              review,
              status,
              collections: [],
              dateAdded: Date.now(),
              category,
              sourceAttribution: "CSV Import"
            };
          });

        if (items.length > 0) {
          performSave(items);
        } else {
          setError("No items found in the CSV. Make sure it has recognized columns.");
        }
      },
      error: (err) => {
        setIsParsing(false);
        setError("Failed to parse CSV file.");
        console.error(err);
      }
    });
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setIsParsing(true);
    setError("");
    
    try {
      const res = await fetch("/api/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput })
      });
      const parsedItems = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
      setIsParsing(false);
      
      if (parsedItems && parsedItems.length > 0) {
         performSave(parsedItems.map((p: any) => ({ ...p, sourceAttribution: "URL Import" })));
      } else {
         setError("No valid items found at this URL.");
      }
    } catch (e) {
      setIsParsing(false);
      setError("Failed to extract data from this URL.");
    }
  };

  const handleAiMemoryImport = async () => {
    if (!aiMemoryInput.trim()) return;
    setIsParsing(true);
    setError("");
    
    try {
      const res = await fetch("/api/parse-ai-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiMemoryInput })
      });
      const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
      setIsParsing(false);
      
      if (data && (data.items?.length > 0 || data.preferences)) {
         if (data.preferences && user) {
            updateProfile({ preferences: (profile?.preferences ? profile.preferences + "\n" : "") + data.preferences });
         }
         
         if (data.items?.length > 0) {
            performSave(data.items.map((p: any) => ({ ...p, sourceAttribution: "AI Memory Import" })));
         } else {
            alert("Memory imported successfully!");
            handleClose();
         }
      } else {
         setError("No valid items or preferences found in this text.");
      }
    } catch (e) {
      setIsParsing(false);
      setError("Failed to extract data from this text.");
    }
  };

  
  const processVideoFile = async (file: Blob | File) => {
    setIsParsing(true);
    setStatusText("Extracting frames securely...");
    try {
      const fileUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = fileUrl;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          if (video.duration === Infinity || isNaN(video.duration)) {
             video.currentTime = 1e101;
             video.onseeked = () => {
                video.onseeked = null;
                video.currentTime = 0;
                resolve(null);
             };
          } else {
             resolve(null);
          }
        };
        video.onerror = reject;
        setTimeout(resolve, 3000);
      });

      const duration = video.duration && isFinite(video.duration) ? video.duration : 30;
      const maxFrames = 15;
      const interval = Math.max(0.2, duration / maxFrames);
      const base64Images: string[] = [];
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = video.videoWidth || 800;
      let height = video.videoHeight || 800;

      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      for (let time = 0; time < duration; time += interval) {
         video.currentTime = time;
         await new Promise(r => {
            const onSeeked = () => { video.removeEventListener('seeked', onSeeked); r(null); };
            video.addEventListener('seeked', onSeeked);
            setTimeout(onSeeked, 500); // timeout
         });
         ctx?.drawImage(video, 0, 0, width, height);
         base64Images.push(canvas.toDataURL("image/jpeg", 0.6));
      }

      setStatusText("Analyzing content locally...");
      
      const res = await fetch("/api/scan-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images })
      });
      
      const data = await res.json().catch((e) => { console.warn("JSON parse error:", e); return {} as any; });
      setIsParsing(false);
      
      // We securely delete the recording out of memory (Blob goes out of scope, garbage collected)
      URL.revokeObjectURL(fileUrl);
      
      if (!res.ok) {
         setError(data.error || "Failed to scan video. Please try again.");
         return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
         const itemsToSave = data.map((it: any) => ({
           id: `imported-${Date.now()}-${Math.random().toString(36).substring(7)}`,
           title: it.title,
           subtitle: it.subtitle || "",
           category: it.category || "movie",
           rating: 0,
           reaction: null,
           review: "",
           dateAdded: Date.now(),
           status: 'completed' as "completed",
           collections: [],
           coverUrl: "",
           description: "Imported via Screen Recording",
           sourceAttribution: `${selectedIntegration} Import`
         }));
         
         await saveMultipleItems(itemsToSave);
         alert(`Successfully extracted and imported ${itemsToSave.length} items from your ${selectedIntegration} recording!`);
         handleClose();
      } else {
         setError("No items were detected in the recording. Please try scrolling a bit slower.");
      }
    } catch (err: any) {
      console.error(err);
      setIsParsing(false);
      setError("Failed to process the recording.");
    }
  };

  const startScreenRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
         setError("Screen recording is not supported in this view. Please try opening the app in a new tab (click the arrow icon in the top right), or use a different browser.");
         return;
      }
      
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = () => {
         const blob = new Blob(chunks, { type: 'video/webm' });
         processVideoFile(blob);
         stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setStatusText("Recording screen... Scroll through your history, then stop sharing.");
      setIsParsing(true);
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'NotAllowedError') {
         setError("Screen recording failed or is not supported. Please try opening the app in a new tab, or upload a video instead.");
      }
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    processVideoFile(e.target.files[0]);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setHasCopiedPrompt(true);
      setTimeout(() => setHasCopiedPrompt(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleMockIntegration = (name: string) => {
    setSelectedIntegration(name);
  };

  const handleClose = () => {
       sessionStorage.removeItem('dilecti_return_to_add');
       onClose();
  };

  const handleBack = () => {
       sessionStorage.removeItem('dilecti_return_to_add');
       onClose();
       window.dispatchEvent(new CustomEvent('open-universal-add-item', { detail: { } }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[150]"
        />
      )}
      {isOpen && (
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[600px] bg-white rounded-t-[32px] md:rounded-[32px] shadow-2xl z-[200] overflow-hidden flex flex-col max-h-[85vh] dark:bg-[#1a1a1a]"
        >
            <div className="flex items-start p-6 border-b border-black/5 bg-white shrink-0 dark:bg-[#1a1a1a] dark:border-white/5">
               {sessionStorage.getItem('dilecti_return_to_add') && (
                 <button
                   onClick={handleBack}
                   className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-black/60 transition-colors shrink-0 mr-4 mt-1 dark:bg-white/5 dark:text-white/60"
                 >
                   <ArrowLeft className="w-5 h-5" />
                 </button>
               )}
               <div className="flex-1">
                  {selectedIntegration ? (
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedIntegration(null)} className="w-6 h-6 flex items-center justify-center bg-black/5 rounded-full hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors">
                         <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h2 className="font-serif text-2xl font-medium tracking-tight">Import Integrations</h2>
                    </div>
                  ) : (
                    <h2 className="font-serif text-2xl font-medium tracking-tight">Import Integrations</h2>
                  )}
                  <p className="text-black/50 text-sm mt-1 dark:text-white/50">Connect your accounts or upload data to build your Taste Graph.</p>
               </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-black/60 transition-colors ml-auto shrink-0 mt-1 dark:bg-white/5 dark:text-white/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
               {isParsing ? (
                  <div className="flex flex-col items-center justify-center py-12">
                     <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4 dark:text-emerald-400" />
                     <p className="text-black/70 font-medium dark:text-white/70">{statusText || "Processing..."}</p>
                  </div>
               ) : (
                  <>
                    {error && <p className="text-red-500 text-sm mb-4 px-4 py-3 bg-red-50 rounded-xl dark:bg-red-950">{error}</p>}
                    <input 
                       type="file" 
                       accept="image/*" 
                       className="hidden" 
                       ref={fileInputRef} 
                       onChange={handleFileChange} 
                    />
                    <input 
                       type="file" 
                       accept=".csv" 
                       className="hidden" 
                       ref={csvInputRef} 
                       onChange={handleCSVImport} 
                    />
                    
                    {!selectedIntegration ? (
                      <>
                        <h4 className="text-xs font-semibold text-black/40 uppercase tracking-widest mb-2 px-1">Connect Accounts</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                            <ImportOption 
                              icon={Tv}
                              title="Import Netflix History" 
                              description="Sync watch history" 
                              onClick={() => handleMockIntegration("Netflix")}
                              colorClass="text-[#E50914] bg-[#E50914]/10 group-hover:bg-[#E50914] group-hover:text-white"
                              
                            />
                            <ImportOption 
                              icon={Headphones}
                              title="Import Spotify History" 
                              description="Sync top artists & tracks" 
                              onClick={() => handleMockIntegration("Spotify")}
                              colorClass="text-[#1DB954] bg-[#1DB954]/10 group-hover:bg-[#1DB954] group-hover:text-white"
                              
                            />
                            <ImportOption 
                              icon={Library}
                              title="Import Goodreads History" 
                              description="Sync book ratings" 
                              onClick={() => handleMockIntegration("Goodreads")}
                              colorClass="text-[#382110] bg-[#382110]/10 group-hover:bg-[#382110] group-hover:text-white"
                              
                            />
                            <ImportOption 
                              icon={ShoppingBag}
                              title="Import Amazon History" 
                              description="Extract product preferences" 
                              onClick={() => handleMockIntegration("Amazon")}
                              colorClass="text-[#FF9900] bg-[#FF9900]/10 group-hover:bg-[#FF9900] group-hover:text-white"
                              
                            />
                        </div>
                        
                        {isAiMemoryMode && (
                            <div className="space-y-3">
                              <div className="bg-black/5 p-4 rounded-2xl border border-black/10 dark:border-white/10 dark:bg-white/5 space-y-4">
                                <div className="space-y-2">
                                   <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-black/60 dark:text-white/60 shrink-0">1</div>
                                      <p className="text-sm font-semibold text-black/80 dark:text-white/80">Copy this prompt into a chat with your other AI provider</p>
                                   </div>
                                   <div className="relative bg-white dark:bg-black/20 p-3 rounded-xl border border-black/5 dark:border-white/5 text-sm text-black/70 dark:text-white/70">
                                      {aiPrompt}
                                      <button 
                                         onClick={copyPrompt}
                                         className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white dark:bg-[#1a1a1a] shadow-sm border border-black/10 dark:border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                      >
                                         {hasCopiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                         {hasCopiedPrompt ? 'Copied' : 'Copy'}
                                      </button>
                                   </div>
                                </div>
                                <div className="space-y-2 pt-2">
                                   <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-black/60 dark:text-white/60 shrink-0">2</div>
                                      <p className="text-sm font-semibold text-black/80 dark:text-white/80">Paste the response here</p>
                                   </div>
                                   <div className="relative">
                                      <textarea
                                        value={aiMemoryInput}
                                        onChange={e => setAiMemoryInput(e.target.value)}
                                        placeholder="Paste your info here..."
                                        className="w-full h-32 bg-white dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-xl p-3 text-sm outline-none resize-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5"
                                      />
                                      <div className="absolute bottom-3 right-3">
                                        <button
                                          onClick={handleAiMemoryImport}
                                          disabled={!aiMemoryInput.trim()}
                                          className="flex items-center gap-1.5 bg-black/10 text-black/50 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-black hover:text-white transition-colors dark:bg-white/10 dark:text-white/50 dark:hover:bg-white dark:hover:text-black"
                                        >
                                          <Plus className="w-4 h-4" /> Add memory
                                        </button>
                                      </div>
                                   </div>
                                </div>
                              </div>
                            </div>
                        )}
                        
                        {isUrlMode && (
                            <div className="space-y-3">
                              <div className="flex bg-black/5 p-2 rounded-2xl border border-black/10 dark:border-white/10 dark:bg-white/5">
                                <input
                                   type="url"
                                   value={urlInput}
                                   onChange={e => setUrlInput(e.target.value)}
                                   placeholder="https://letterboxd.com/... or https://goodreads.com/..."
                                   className="bg-transparent border-none outline-none flex-1 px-3 py-2 text-sm"
                                />
                                <button
                                  onClick={handleUrlImport}
                                  className="bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-black/80 transition-colors dark:bg-white"
                                >
                                  Import
                                </button>
                              </div>
                            </div>
                        )}
                      </>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                             <h3 className="font-bold text-emerald-900 dark:text-emerald-400 mb-2">How to import your {selectedIntegration} history</h3>
                              <ol className="list-decimal list-inside space-y-2 text-sm text-emerald-800 dark:text-emerald-500">
                               <li>Start a screen recording using your device's built-in recorder</li>
                               <li>Open the {selectedIntegration} app or website</li>
                               <li>Navigate to your history or saved items page and scroll slowly through your list</li>
                               <li>Stop the recording and upload the video below</li>
                             </ol>
                          </div>
                          
                          <div className="flex flex-col gap-3">
                             <input 
                               type="file" 
                               accept="video/*" 
                               className="hidden" 
                               ref={videoInputRef}
                               onChange={handleVideoUpload}
                             />
                             <button 
                                onClick={() => videoInputRef.current?.click()}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-colors shadow-sm flex items-center justify-center gap-2"
                             >
                                <Upload className="w-5 h-5" />
                                Upload Video
                             </button>
                             <button 
                                onClick={startScreenRecording}
                                className="w-full py-4 bg-white dark:bg-[#1a1a1a] hover:bg-black/5 dark:hover:bg-white/5 text-emerald-700 dark:text-emerald-400 font-bold rounded-2xl transition-colors border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2"
                             >
                                <MonitorUp className="w-5 h-5" />
                                Record Tab (Desktop)
                             </button>
                          </div>
                        </div>
                    )}
                  </>
               )}
            </div>

            {!isParsing && (
               <div className="p-6 bg-black/5 text-xs text-black/50 text-center shrink-0 dark:bg-white/5 dark:text-white/50">
                 Dilecti securely analyzes your files and accounts locally or selectively via our secure endpoints.
               </div>
            )}
          </motion.div>
      )}
    </AnimatePresence>
  );
}

function ImportOption({ title, description, icon: Icon, onClick, colorClass, isComingSoon }: { title: string, description: string, icon: any, onClick?: () => void, colorClass?: string, isComingSoon?: boolean }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-black/10 hover:border-black/30 hover:bg-black/5 transition-all group text-left bg-white shadow-sm hover:shadow-md dark:bg-[#1a1a1a] dark:border-white/10 relative overflow-hidden">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${colorClass}`}>
         <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
         <div className="flex items-center gap-2">
           <div className="font-semibold text-neutral-900 dark:text-white truncate">{title}</div>
           {isComingSoon && (
             <span className="text-[9px] font-bold uppercase tracking-wider text-black/40 bg-black/5 px-1.5 py-0.5 rounded-sm dark:text-white/40 dark:bg-white/5 shrink-0">Soon</span>
           )}
         </div>
         <div className="text-xs text-neutral-500 leading-tight mt-0.5 dark:text-neutral-400 truncate">{description}</div>
      </div>
    </button>
  )
}

