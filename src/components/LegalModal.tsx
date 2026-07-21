import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield } from 'lucide-react';

export function LegalModal({ isOpen, onClose, type }: { isOpen: boolean, onClose: () => void, type: 'privacy' | 'terms' }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-neutral-900 dark:text-white">
                    {type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-black/50 dark:text-white/50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 text-sm text-neutral-600 dark:text-neutral-300 space-y-6">
              {type === 'privacy' ? (
                <>
                  <section>
                    <h3 className="font-bold text-neutral-900 dark:text-white mb-2">1. Introduction & Core Principles</h3>
                    <p>
                      At Dilecti, we are committed to protecting your privacy and security. We believe that your personal data, taste preferences, and usage metrics belong to you. This Privacy Policy details how we handle, process, and secure your information. Our primary directive is data minimization: we only collect what is strictly necessary to power the Dilecti engine.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-bold text-neutral-900 dark:text-white mb-2">2. Data Collection</h3>
                    <p>
                      <strong>Information you provide:</strong> We store items you add to your library, your ratings, reviews, and taste profile quiz answers. This is used solely to generate recommendations and match you with compatible taste profiles.
                      <br /><br />
                      <strong>Information we do NOT collect:</strong> We do not track your location, we do not sell your personal data to third parties or ad networks, and we do not use your private library data to train public AI models.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-bold text-neutral-900 dark:text-white mb-2">3. Security Audits & Compliance</h3>
                    <p>
                      We employ continuous security monitoring, end-to-end encryption for authentication tokens, and strict Firestore Security Rules to ensure that your data is only accessible to you and the friends you explicitly grant permission to. Private items remain entirely encrypted and siloed from public feeds. We regularly conduct internal security audits to identify and patch potential vulnerabilities, ensuring compliance with industry standards.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-bold text-neutral-900 dark:text-white mb-2">4. AI Processing</h3>
                    <p>
                      When using AI-assisted features (like memory imports or recommendations), data is processed transiently and securely via our API endpoints. Your data is never persistently stored by third-party LLM providers for model training purposes.
                    </p>
                  </section>
                </>
              ) : (
                <>
                  <section>
                    <h3 className="font-bold text-neutral-900 dark:text-white mb-2">1. Acceptance of Terms</h3>
                    <p>
                      By accessing or using Dilecti, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application. Dilecti is provided "as is" without warranty of any kind, either express or implied.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-bold text-neutral-900 dark:text-white mb-2">2. User Conduct & Acceptable Use</h3>
                    <p>
                      You are responsible for the content you submit. You agree not to upload, share, or promote content that is illegal, abusive, harassing, or violates the intellectual property rights of others. Dilecti reserves the right to suspend or terminate accounts that violate these principles.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-bold text-neutral-900 dark:text-white mb-2">3. Limitation of Liability & Indemnification</h3>
                    <p>
                      To the maximum extent permitted by law, Dilecti and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. You agree to indemnify and hold harmless Dilecti from any claims, damages, or expenses arising from your violation of these terms. We do not guarantee continuous, uninterrupted, or secure access to the application.
                    </p>
                  </section>
                  <section>
                    <h3 className="font-bold text-neutral-900 dark:text-white mb-2">4. Data Ownership & Rights</h3>
                    <p>
                      You retain full ownership of all data you input into Dilecti. By using the service, you grant us a limited license to process, store, and display this data solely for the purpose of operating the application and providing its core functionality to you.
                    </p>
                  </section>
                </>
              )}
            </div>
            <div className="p-4 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex justify-end shrink-0">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                I Understand
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
