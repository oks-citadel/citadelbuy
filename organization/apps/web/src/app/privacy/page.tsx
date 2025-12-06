import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-gray-600">Last updated: November 2024</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h2>1. Introduction</h2>
          <p>
            CitadelBuy (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information
            when you visit our website or use our services.
          </p>

          <h2>2. Information We Collect</h2>
          <h3>Personal Information</h3>
          <p>We may collect personal information that you voluntarily provide, including:</p>
          <ul>
            <li>Name, email address, and phone number</li>
            <li>Billing and shipping addresses</li>
            <li>Payment information (processed securely via third-party providers)</li>
            <li>Account credentials</li>
            <li>Order history and preferences</li>
          </ul>

          <h3>Automatically Collected Information</h3>
          <p>When you access our services, we may automatically collect:</p>
          <ul>
            <li>Device information (type, operating system, browser)</li>
            <li>IP address and location data</li>
            <li>Browsing behavior and preferences</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Process and fulfill your orders</li>
            <li>Provide customer support</li>
            <li>Personalize your shopping experience</li>
            <li>Send promotional communications (with your consent)</li>
            <li>Improve our products and services</li>
            <li>Detect and prevent fraud</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>4. Information Sharing</h2>
          <p>We may share your information with:</p>
          <ul>
            <li>Service providers who assist in our operations</li>
            <li>Payment processors for secure transactions</li>
            <li>Shipping partners to deliver your orders</li>
            <li>Marketing partners (with your consent)</li>
            <li>Legal authorities when required by law</li>
          </ul>

          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your
            personal information against unauthorized access, alteration, disclosure, or destruction.
          </p>

          <h2>6. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Delete your personal information</li>
            <li>Opt-out of marketing communications</li>
            <li>Data portability</li>
            <li>Withdraw consent</li>
          </ul>

          <h2>7. Cookies</h2>
          <p>
            We use cookies and similar technologies to enhance your experience.
            You can manage your cookie preferences through your browser settings
            or our cookie consent tool.
          </p>

          <h2>8. Children&apos;s Privacy</h2>
          <p>
            Our services are not intended for children under 13. We do not knowingly
            collect personal information from children under 13.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you
            of any changes by posting the new policy on this page and updating the
            &quot;Last updated&quot; date.
          </p>

          <h2>10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <ul>
            <li>Email: privacy@citadelbuy.com</li>
            <li>Address: 123 Commerce Street, San Francisco, CA 94102</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
