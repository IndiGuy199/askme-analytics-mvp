'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export default function TermsModal({ 
  isOpen, 
  onClose, 
  onAccept,
  showAcceptButton = false 
}: TermsModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Terms and Conditions</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> October 26, 2025
            </p>
            <p className="text-sm text-gray-600">
              <strong>Version:</strong> 1.0
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">1. Acceptance of Terms</h3>
            <p className="text-gray-700">
              By accessing and using AskMe Analytics ("Service"), you accept and agree to be bound by these Terms and Conditions. 
              If you do not agree to these terms, please do not use our Service.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">2. Data Collection and Privacy</h3>
            <p className="text-gray-700">
              By using our Service, you consent to the collection, processing, and sharing of your data as described below:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Personal Information:</strong> We collect your email address, name, company information, and usage data 
                to provide and improve our services.
              </li>
              <li>
                <strong>Analytics Data:</strong> Your email and usage data may be shared with PostHog, our analytics provider, 
                to help us understand product usage and improve user experience.
              </li>
              <li>
                <strong>Data Retention:</strong> We retain your data for as long as your account is active and as required by law.
              </li>
              <li>
                <strong>Data Security:</strong> We implement industry-standard security measures to protect your information.
              </li>
              <li>
                <strong>Third-Party Services:</strong> We use third-party services (PostHog, Stripe, OpenAI) which may have access 
                to your data as necessary to provide our services.
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">3. User Consent</h3>
            <p className="text-gray-700">
              By checking the consent box and creating an account, you explicitly consent to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>The collection and processing of your personal information</li>
              <li>Sharing your email address and usage data with PostHog for analytics purposes</li>
              <li>Receiving service-related communications via email</li>
              <li>Our use of cookies and tracking technologies to improve your experience</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4. Service Description</h3>
            <p className="text-gray-700">
              AskMe Analytics provides analytics, insights, and reporting services. We reserve the right to modify, suspend, 
              or discontinue any aspect of the Service at any time.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">5. User Responsibilities</h3>
            <p className="text-gray-700">You agree to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the Service in compliance with all applicable laws</li>
              <li>Not use the Service for any unlawful or fraudulent purposes</li>
              <li>Not attempt to reverse engineer or compromise our systems</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">6. Payment and Subscriptions</h3>
            <p className="text-gray-700">
              Paid subscriptions are processed through Stripe. By subscribing, you agree to pay all fees associated with your 
              selected plan. Subscriptions automatically renew unless canceled. Refunds are provided in accordance with our 
              refund policy.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">7. Intellectual Property</h3>
            <p className="text-gray-700">
              All content, features, and functionality of the Service are owned by AskMe Analytics and are protected by 
              copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute our content 
              without explicit permission.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">8. Limitation of Liability</h3>
            <p className="text-gray-700">
              To the fullest extent permitted by law, AskMe Analytics shall not be liable for any indirect, incidental, special, 
              consequential, or punitive damages resulting from your use or inability to use the Service.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">9. Data Rights</h3>
            <p className="text-gray-700">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to legal requirements)</li>
              <li>Withdraw consent (though this may limit service functionality)</li>
              <li>Export your data in a portable format</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">10. Termination</h3>
            <p className="text-gray-700">
              We reserve the right to terminate or suspend your account at any time for violation of these Terms. 
              You may cancel your account at any time through your account settings.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">11. Changes to Terms</h3>
            <p className="text-gray-700">
              We may update these Terms from time to time. We will notify you of significant changes via email or through 
              the Service. Your continued use after changes constitutes acceptance of the updated Terms.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">12. Governing Law</h3>
            <p className="text-gray-700">
              These Terms are governed by and construed in accordance with applicable laws. Any disputes shall be resolved 
              in the appropriate courts.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">13. Contact Information</h3>
            <p className="text-gray-700">
              For questions about these Terms or to exercise your data rights, please contact us at:
            </p>
            <p className="text-gray-700 mt-2">
              <strong>Email:</strong> proservices330@gmail.com<br />
              <strong>Support:</strong> Available through the contact form on our website
            </p>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Important:</strong> By checking the consent box and proceeding with account creation, you acknowledge 
                that you have read, understood, and agree to be bound by these Terms and Conditions, including our data 
                collection and sharing practices.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {showAcceptButton && onAccept && (
            <button
              onClick={onAccept}
              className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              I Accept
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
