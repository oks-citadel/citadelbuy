import { Cookie } from 'lucide-react';

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Cookie className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Cookie Policy</h1>
          </div>
          <p className="text-gray-600">Last updated: November 2024</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h2>What Are Cookies?</h2>
          <p>
            Cookies are small text files that are stored on your device when you visit
            our website. They help us provide you with a better experience by remembering
            your preferences and how you use our site.
          </p>

          <h2>Types of Cookies We Use</h2>

          <h3>Essential Cookies</h3>
          <p>
            These cookies are necessary for the website to function properly. They enable
            basic functions like page navigation, access to secure areas, and shopping
            cart functionality. The website cannot function properly without these cookies.
          </p>

          <h3>Analytics Cookies</h3>
          <p>
            These cookies help us understand how visitors interact with our website by
            collecting and reporting information anonymously. This helps us improve our
            website and services.
          </p>

          <h3>Functional Cookies</h3>
          <p>
            These cookies enable enhanced functionality and personalization, such as
            remembering your language preferences, region, and login details.
          </p>

          <h3>Marketing Cookies</h3>
          <p>
            These cookies are used to track visitors across websites to display relevant
            advertisements. They help us measure the effectiveness of our marketing campaigns.
          </p>

          <h2>Cookies We Use</h2>
          <table>
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>session_id</td>
                <td>Maintains user session</td>
                <td>Session</td>
              </tr>
              <tr>
                <td>cart_items</td>
                <td>Stores shopping cart contents</td>
                <td>30 days</td>
              </tr>
              <tr>
                <td>user_prefs</td>
                <td>Remembers user preferences</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td>_ga</td>
                <td>Google Analytics tracking</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td>_fbp</td>
                <td>Facebook pixel tracking</td>
                <td>90 days</td>
              </tr>
            </tbody>
          </table>

          <h2>Managing Cookies</h2>
          <p>
            You can control and manage cookies in several ways:
          </p>
          <ul>
            <li>
              <strong>Browser Settings:</strong> Most browsers allow you to refuse or
              accept cookies, delete existing cookies, and set preferences for certain websites.
            </li>
            <li>
              <strong>Our Cookie Banner:</strong> When you first visit our site, you can
              choose which types of cookies to accept or reject.
            </li>
            <li>
              <strong>Opt-Out Links:</strong> Some third-party cookies can be opted out of
              through industry opt-out mechanisms.
            </li>
          </ul>

          <h2>Impact of Disabling Cookies</h2>
          <p>
            If you choose to disable cookies, some features of our website may not work
            properly. For example:
          </p>
          <ul>
            <li>You may not be able to add items to your cart</li>
            <li>You may need to log in every time you visit</li>
            <li>Your preferences may not be remembered</li>
            <li>Some pages may not display correctly</li>
          </ul>

          <h2>Third-Party Cookies</h2>
          <p>
            Some cookies on our site are set by third-party services, including:
          </p>
          <ul>
            <li>Google Analytics (analytics)</li>
            <li>Facebook Pixel (marketing)</li>
            <li>Stripe (payment processing)</li>
            <li>Cloudflare (security and performance)</li>
          </ul>

          <h2>Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time. Any changes will be
            posted on this page with an updated revision date.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about our use of cookies, please contact us at:
          </p>
          <ul>
            <li>Email: privacy@broxiva.com</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
