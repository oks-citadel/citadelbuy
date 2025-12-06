import { FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-gray-600">Last updated: November 2024</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using CitadelBuy&apos;s website and services, you agree to be bound
            by these Terms of Service. If you do not agree to these terms, please do not
            use our services.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            CitadelBuy is an e-commerce platform that connects buyers with sellers. We provide
            a marketplace for purchasing various products and services.
          </p>

          <h2>3. User Accounts</h2>
          <p>To use certain features, you must create an account. You agree to:</p>
          <ul>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Be responsible for all activities under your account</li>
          </ul>

          <h2>4. Purchases and Payments</h2>
          <p>When making purchases through CitadelBuy:</p>
          <ul>
            <li>All prices are displayed in USD unless otherwise stated</li>
            <li>Prices are subject to change without notice</li>
            <li>Payment must be made at the time of purchase</li>
            <li>We accept major credit cards and other payment methods as displayed</li>
            <li>Sales tax will be calculated and applied as required by law</li>
          </ul>

          <h2>5. Shipping and Delivery</h2>
          <p>
            Shipping times and costs vary by product and delivery location. We are not
            responsible for delays caused by carriers or customs. Risk of loss passes
            to you upon delivery to the carrier.
          </p>

          <h2>6. Returns and Refunds</h2>
          <p>
            Our return policy allows returns within 30 days of delivery for most items.
            Products must be unused and in original packaging. Some items may have
            different return policies as noted on their product pages.
          </p>

          <h2>7. Intellectual Property</h2>
          <p>
            All content on CitadelBuy, including text, graphics, logos, and software,
            is our property or the property of our licensors and is protected by
            intellectual property laws.
          </p>

          <h2>8. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use our services for any illegal purpose</li>
            <li>Violate any laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Upload malicious code or interfere with our systems</li>
            <li>Engage in fraudulent activities</li>
            <li>Harass or harm other users</li>
          </ul>

          <h2>9. Disclaimer of Warranties</h2>
          <p>
            Our services are provided &quot;as is&quot; without warranties of any kind. We do not
            guarantee that our services will be uninterrupted, error-free, or secure.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, CitadelBuy shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages arising from
            your use of our services.
          </p>

          <h2>11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless CitadelBuy and its officers, directors,
            employees, and agents from any claims arising from your use of our services
            or violation of these terms.
          </p>

          <h2>12. Governing Law</h2>
          <p>
            These Terms shall be governed by the laws of the State of California,
            without regard to conflict of law principles.
          </p>

          <h2>13. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Continued use of
            our services after changes constitutes acceptance of the modified Terms.
          </p>

          <h2>14. Contact Information</h2>
          <p>
            For questions about these Terms, please contact us at:
          </p>
          <ul>
            <li>Email: legal@citadelbuy.com</li>
            <li>Address: 123 Commerce Street, San Francisco, CA 94102</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
