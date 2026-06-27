import { Shield, ArrowLeft } from "lucide-react";

export default function Policy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <a href="/" className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-[#5B9BD5]">
          <ArrowLeft size={16} />
          Back to Home
        </a>

        <div className="rounded-2xl bg-white p-8 shadow-sm sm:p-12">
          <div className="mb-8 flex items-center gap-3">
            <Shield size={28} className="text-[#5B9BD5]" />
            <h1 className="font-heading text-2xl font-bold text-gray-900">
              Privacy Policy &amp; Terms of Service
            </h1>
          </div>

          <p className="mb-8 text-sm text-gray-500">
            Last updated: 27 June 2026
          </p>

          <section className="mb-8">
            <h2 className="mb-3 font-heading text-lg font-semibold text-gray-900">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              AIPCA Bahati Cathedral ("we", "our", "us") operates the Harambee Development Fund platform at{" "}
              <strong>aipcaharambee.com</strong>. By using this website and submitting your information, you agree to
              the collection and use of your data as described in this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 font-heading text-lg font-semibold text-gray-900">2. Information We Collect</h2>
            <ul className="list-disc space-y-1 pl-5 text-gray-600 leading-relaxed">
              <li><strong>Name</strong> — provided when making a pledge or donation</li>
              <li><strong>Phone number</strong> — provided for SMS communication and M-Pesa payments</li>
              <li><strong>Pledge &amp; donation amounts</strong> — recorded for the Harambee fundraising campaign</li>
              <li><strong>Email address</strong> — only collected for admin account registration</li>
              <li><strong>Payment transaction data</strong> — M-Pesa transaction IDs and receipts</li>
            </ul>
            <p className="mt-3 text-gray-600 leading-relaxed">
              We do <strong>not</strong> collect sensitive personal data (financial account numbers, ID numbers,
              location data) beyond what is listed above.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 font-heading text-lg font-semibold text-gray-900">3. How We Use Your Information</h2>
            <ul className="list-disc space-y-1 pl-5 text-gray-600 leading-relaxed">
              <li>To send SMS confirmations, receipts, and reminders related to your pledge or donation</li>
              <li>To process M-Pesa payments via the Safaricom M-Pesa API</li>
              <li>To track fundraising progress and display contribution totals (without revealing your identity)</li>
              <li>To communicate church updates (only if you have opted in)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 font-heading text-lg font-semibold text-gray-900">4. Data Sharing &amp; Third Parties</h2>
            <p className="text-gray-600 leading-relaxed">
              We share your data only with essential service providers:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-600 leading-relaxed">
              <li>
                <strong>Supabase</strong> — cloud database hosting all pledge, donation, and user records.
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer"
                   className="ml-1 text-[#5B9BD5] hover:underline">Privacy Policy</a>
              </li>
              <li>
                <strong>Safaricom M-Pesa</strong> — payment processing. Your name and phone number are sent to
                Safaricom to initiate the STK Push payment prompt.
              </li>
              <li>
                <strong>SAJSOFT</strong> — SMS delivery service. Your phone number is shared with SAJSOFT to
                deliver text messages.
                <a href="https://sajsoft.co.ke/privacy" target="_blank" rel="noopener noreferrer"
                   className="ml-1 text-[#5B9BD5] hover:underline">Privacy Policy</a>
              </li>
              <li>
                <strong>Vercel</strong> — hosting platform. Standard server logs may include your IP address.
                <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer"
                   className="ml-1 text-[#5B9BD5] hover:underline">Privacy Policy</a>
              </li>
            </ul>
            <p className="mt-3 text-gray-600 leading-relaxed">
              We do <strong>not</strong> sell, rent, or share your personal data with advertisers or any other
              third parties not listed here.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 font-heading text-lg font-semibold text-gray-900">5. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              Your data is retained for as long as necessary to administer the Harambee Development Fund and
              related church activities. If you request deletion, we will remove your personal data within 30
              days, subject to legal or financial record-keeping obligations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 font-heading text-lg font-semibold text-gray-900">6. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed">
              You have the right to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-600 leading-relaxed">
              <li>Request access to the personal data we hold about you</li>
              <li>Request correction of inaccurate data (e.g., update your phone number)</li>
              <li>Request deletion of your data ("right to be forgotten")</li>
              <li>Withdraw consent for SMS communication at any time</li>
            </ul>
            <p className="mt-3 text-gray-600 leading-relaxed">
              To exercise any of these rights, contact us at the details below.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 font-heading text-lg font-semibold text-gray-900">7. SMS Consent &amp; Communication</h2>
            <p className="text-gray-600 leading-relaxed">
              By submitting your phone number through our platform, you consent to receive SMS messages related
              to your pledge or donation, including confirmations, receipts, payment reminders, and thank-you
              messages with Bible verses. Message and data rates may apply.
            </p>
            <p className="mt-3 text-gray-600 leading-relaxed">
              You may opt out of non-essential SMS at any time by contacting us. Essential transactional
              messages (payment receipts) cannot be opted out of while a pledge is active.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 font-heading text-lg font-semibold text-gray-900">8. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement reasonable security measures including encrypted connections (HTTPS), database access
              controls, and authentication for admin accounts. However, no method of electronic storage or
              transmission is 100% secure. You use this platform at your own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 font-heading text-lg font-semibold text-gray-900">9. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              AIPCA Bahati Cathedral shall not be liable for any indirect, incidental, special, consequential,
              or punitive damages arising out of or relating to your use of this platform, including but not
              limited to: failed SMS delivery, M-Pesa transaction errors, data loss, or service interruptions
              caused by third-party providers (Supabase, Safaricom, SAJSOFT, Vercel).
            </p>
            <p className="mt-3 text-gray-600 leading-relaxed">
              The platform is provided "as is" and "as available" without warranty of any kind, either express
              or implied, including but not limited to the implied warranties of merchantability or fitness for
              a particular purpose.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 font-heading text-lg font-semibold text-gray-900">10. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this policy from time to time. Changes will be posted on this page with an updated
              date. Continued use of the platform after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section className="rounded-xl bg-gray-50 p-6">
            <h2 className="mb-3 font-heading text-lg font-semibold text-gray-900">11. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions, data requests, or concerns about this policy:
            </p>
            <div className="mt-3 space-y-1 text-gray-600">
              <p><strong>AIPCA Bahati Cathedral</strong></p>
              <p>Jogoo Road, Nairobi, Kenya</p>
              <p>Phone: <a href="tel:0727278577" className="text-[#5B9BD5] hover:underline">0727 278 577</a></p>
              <p>Email: <a href="mailto:jkama3@gmail.com" className="text-[#5B9BD5] hover:underline">jkama3@gmail.com</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
