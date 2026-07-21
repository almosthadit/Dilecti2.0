import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 7.5 seconds to match the animation sequence before holding
    const t = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 600);
    }, 7500);

    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] bg-[#f7f7f5] flex items-center justify-center overflow-hidden"
        >
          <iframe 
            src="/dilecti-log-in-animation.html" 
            title="Dilecti Welcome Animation"
            className="w-full h-full border-0 pointer-events-none mix-blend-multiply" 
            scrolling="no" 
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
