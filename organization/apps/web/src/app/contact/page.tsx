'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, MapPin, Phone, Send, Clock } from 'lucide-react';
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <BroxivaBackground variant="default">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-bx-text">Get in </span>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 50%, var(--bx-cyan) 100%)' }}
              >
                Touch
              </span>
            </h1>
            <p className="text-bx-text-muted text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
              Have a question or need assistance? We are here to help.
              Reach out to us and we will get back to you as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Information */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-bx-text mb-8">
                Contact Information
              </h2>

              <div className="space-y-6">
                {/* Email */}
                <div className="flex items-start gap-4 p-6 rounded-bx-card bg-bx-bg-2 border border-[var(--bx-border)]">
                  <div className="w-12 h-12 rounded-xl bg-bx-bg-3 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-bx-pink" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-bx-text mb-1">Email Us</h3>
                    <p className="text-bx-text-muted mb-2">For general inquiries and support</p>
                    <a
                      href="mailto:support@broxiva.com"
                      className="text-bx-violet hover:text-bx-pink transition-colors"
                    >
                      support@broxiva.com
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4 p-6 rounded-bx-card bg-bx-bg-2 border border-[var(--bx-border)]">
                  <div className="w-12 h-12 rounded-xl bg-bx-bg-3 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-bx-violet" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-bx-text mb-1">Visit Us</h3>
                    <p className="text-bx-text-muted mb-2">Our headquarters</p>
                    <p className="text-bx-text-secondary">
                      123 Commerce Street<br />
                      San Francisco, CA 94102<br />
                      United States
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4 p-6 rounded-bx-card bg-bx-bg-2 border border-[var(--bx-border)]">
                  <div className="w-12 h-12 rounded-xl bg-bx-bg-3 flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-bx-cyan" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-bx-text mb-1">Call Us</h3>
                    <p className="text-bx-text-muted mb-2">Mon-Fri, 9am-6pm PST</p>
                    <a
                      href="tel:+1-800-BROXIVA"
                      className="text-bx-violet hover:text-bx-pink transition-colors"
                    >
                      +1 (800) BROXIVA
                    </a>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="flex items-start gap-4 p-6 rounded-bx-card bg-bx-bg-2 border border-[var(--bx-border)]">
                  <div className="w-12 h-12 rounded-xl bg-bx-bg-3 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-bx-mint" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-bx-text mb-1">Business Hours</h3>
                    <p className="text-bx-text-muted mb-2">When we are available</p>
                    <div className="text-bx-text-secondary space-y-1">
                      <p>Monday - Friday: 9:00 AM - 6:00 PM PST</p>
                      <p>Saturday: 10:00 AM - 4:00 PM PST</p>
                      <p>Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-bx-text mb-8">
                Send Us a Message
              </h2>

              <div className="p-8 rounded-bx-card bg-bx-bg-2 border border-[var(--bx-border)]">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-bx-bg-3 flex items-center justify-center mx-auto mb-6">
                      <Send className="w-8 h-8 text-bx-mint" />
                    </div>
                    <h3 className="text-xl font-semibold text-bx-text mb-2">
                      Message Sent!
                    </h3>
                    <p className="text-bx-text-muted mb-6">
                      Thank you for reaching out. We will get back to you within 24 hours.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setSubmitted(false)}
                      className="border-[var(--bx-border-hover)] text-bx-text hover:bg-bx-bg-3"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name" className="text-bx-text mb-2 block">
                        Your Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="bg-bx-bg-3 border-[var(--bx-border)] text-bx-text placeholder:text-bx-text-dim focus-visible:ring-bx-violet"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-bx-text mb-2 block">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="bg-bx-bg-3 border-[var(--bx-border)] text-bx-text placeholder:text-bx-text-dim focus-visible:ring-bx-violet"
                      />
                    </div>

                    <div>
                      <Label htmlFor="subject" className="text-bx-text mb-2 block">
                        Subject
                      </Label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        placeholder="How can we help?"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="bg-bx-bg-3 border-[var(--bx-border)] text-bx-text placeholder:text-bx-text-dim focus-visible:ring-bx-violet"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message" className="text-bx-text mb-2 block">
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Tell us more about your inquiry..."
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        className="bg-bx-bg-3 border-[var(--bx-border)] text-bx-text placeholder:text-bx-text-dim focus-visible:ring-bx-violet resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full"
                      style={{ background: 'linear-gradient(135deg, var(--bx-pink) 0%, var(--bx-violet) 100%)' }}
                    >
                      {isSubmitting ? (
                        <>Sending...</>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ CTA */}
      <section className="py-16 border-t border-[var(--bx-border)]">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-bx-text mb-4">
              Looking for quick answers?
            </h2>
            <p className="text-bx-text-muted mb-6">
              Check out our Help Center for frequently asked questions and guides.
            </p>
            <Link href="/help">
              <Button
                variant="outline"
                className="border-[var(--bx-border-hover)] text-bx-text hover:bg-bx-bg-3"
              >
                Visit Help Center
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </BroxivaBackground>
  );
}
