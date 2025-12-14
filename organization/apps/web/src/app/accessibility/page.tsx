import { Accessibility } from 'lucide-react';

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Accessibility className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Accessibility Statement</h1>
          </div>
          <p className="text-gray-600">Last updated: November 2024</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h2>Our Commitment</h2>
          <p>
            Broxiva is committed to ensuring digital accessibility for people with
            disabilities. We are continually improving the user experience for everyone
            and applying the relevant accessibility standards.
          </p>

          <h2>Conformance Status</h2>
          <p>
            We strive to conform to the Web Content Accessibility Guidelines (WCAG) 2.1
            at Level AA. These guidelines explain how to make web content more accessible
            for people with disabilities.
          </p>

          <h2>Accessibility Features</h2>
          <p>Our website includes the following accessibility features:</p>
          <ul>
            <li>
              <strong>Keyboard Navigation:</strong> All functionality is accessible via
              keyboard navigation
            </li>
            <li>
              <strong>Screen Reader Support:</strong> The site is compatible with popular
              screen readers
            </li>
            <li>
              <strong>Alt Text:</strong> Images include alternative text descriptions
            </li>
            <li>
              <strong>Color Contrast:</strong> Text has sufficient color contrast against
              backgrounds
            </li>
            <li>
              <strong>Resizable Text:</strong> Text can be resized up to 200% without loss
              of functionality
            </li>
            <li>
              <strong>Focus Indicators:</strong> Visible focus indicators for interactive
              elements
            </li>
            <li>
              <strong>Form Labels:</strong> All form fields have associated labels
            </li>
            <li>
              <strong>Skip Links:</strong> Skip navigation links for quick access to main content
            </li>
          </ul>

          <h2>Assistive Technologies</h2>
          <p>
            Our website is designed to be compatible with the following assistive technologies:
          </p>
          <ul>
            <li>Screen readers (JAWS, NVDA, VoiceOver, TalkBack)</li>
            <li>Screen magnification software</li>
            <li>Speech recognition software</li>
            <li>Keyboard-only navigation</li>
          </ul>

          <h2>Known Limitations</h2>
          <p>
            Despite our efforts, some content may not be fully accessible:
          </p>
          <ul>
            <li>Some older PDF documents may not be fully accessible</li>
            <li>Some third-party content may not meet accessibility standards</li>
            <li>Live video content may not always have captions immediately available</li>
          </ul>
          <p>
            We are actively working to address these limitations and improve accessibility
            across all content.
          </p>

          <h2>Feedback</h2>
          <p>
            We welcome your feedback on the accessibility of Broxiva. Please let us
            know if you encounter accessibility barriers:
          </p>
          <ul>
            <li>Email: accessibility@broxiva.com</li>
            <li>Phone: 1-800-CITADEL (option 4)</li>
            <li>Mail: Accessibility Team, 123 Commerce Street, San Francisco, CA 94102</li>
          </ul>
          <p>
            We try to respond to accessibility feedback within 2 business days.
          </p>

          <h2>Assessment Methods</h2>
          <p>
            Broxiva assesses the accessibility of our website through the following methods:
          </p>
          <ul>
            <li>Self-evaluation using automated testing tools</li>
            <li>External accessibility audits</li>
            <li>User testing with people who use assistive technologies</li>
            <li>Regular review of user feedback</li>
          </ul>

          <h2>Formal Complaints</h2>
          <p>
            If you are not satisfied with our response to your accessibility concern,
            you may file a formal complaint by contacting our Accessibility Coordinator
            at accessibility@broxiva.com. We will investigate all complaints and
            provide a response within 10 business days.
          </p>

          <h2>Continuous Improvement</h2>
          <p>
            We are committed to ongoing accessibility improvements. Our team regularly
            reviews and updates our accessibility practices to ensure we meet or exceed
            industry standards.
          </p>
        </div>
      </div>
    </div>
  );
}
