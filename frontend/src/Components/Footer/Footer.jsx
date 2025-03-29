// Footer.jsx
import React, { useState } from 'react';
import {
    Globe,
    Mail,
    Phone,
    ArrowRight,
    MessageSquare,
    CheckCircle,

} from 'lucide-react';
import './Footer.css';

// // Import social icons properly - assuming these are available
// // If you're not using SVG imports, you can keep the original approach
// // Uncommenting these imports will need the actual files to exist
// import GitHub from '/icons/git.svg';
// import TwitterIcon from '/icons/twitter.svg';
// import LinkedInIcon from '/icons/linkedln.svg';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const handleNewsletterSubmit = (e) => {
        e.preventDefault();
        if (!email) return;

        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setSubmitSuccess(true);
            setEmail('');

            // Hide success message after 3 seconds
            setTimeout(() => setSubmitSuccess(false), 3000);
        }, 1000);
    };

    return (
        <footer className="blackvire-footer" role="contentinfo">
            <div className="footer-glow"></div>

                <div className="footer-main">
                    <div className="footer-brand">
                        <img
                            src="/img/BlackVireLogoSqr.png"
                            alt="BlackVire Security Logo"
                            className="footer-logo"
                        />
                        <h2 className="footer-title">BlackVire Security</h2>
                        <p className="footer-description">
                            Advanced security solutions for modern enterprises. Protecting your digital assets with cutting-edge technology.
                        </p>
                        <div className="footer-social">

                            <a href="https://github.com" className="social-icon" aria-label="GitHub">
                                <img src='/icons/git.svg' alt="GitHub" />
                            </a>
                            <a href="https://twitter.com" className="social-icon" aria-label="Twitter">
                                <img src='/icons/twitter.svg' alt="Twitter" />
                            </a>
                            <a href="https://linkedin.com" className="social-icon" aria-label="LinkedIn">
                                <img src='/icons/linkedln.svg' alt="LinkedIn" />
                            </a>

                        </div>
                    </div>

                    <div className="footer-links-container">
                        <div className="footer-links">
                            <h3 className="footer-links-title">Company</h3>
                            <ul className="footer-links-list">
                                <li><a href="/about">About Us</a></li>
                                <li><a href="/careers">Careers</a></li>
                                <li><a href="/partners">Partners</a></li>
                                <li><a href="/press">Press Kit</a></li>
                            </ul>
                        </div>

                        <div className="footer-links">
                            <h3 className="footer-links-title">Products</h3>
                            <ul className="footer-links-list">
                                <li><a href="/products/endpoint">Endpoint Security</a></li>
                                <li><a href="/products/cloud">Cloud Security</a></li>
                                <li><a href="/products/network">Network Protection</a></li>
                                <li><a href="/products/threat">Threat Intelligence</a></li>
                            </ul>
                        </div>

                        <div className="footer-links">
                            <h3 className="footer-links-title">Resources</h3>
                            <ul className="footer-links-list">
                                <li><a href="/resources/documentation">Documentation</a></li>
                                <li><a href="/resources/blog">Blog</a></li>
                                <li><a href="/resources/whitepapers">Whitepapers</a></li>
                                <li><a href="/resources/webinars">Webinars</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="footer-newsletter">
                        <h3 className="footer-newsletter-title">Stay Updated</h3>
                        <p className="footer-newsletter-description">
                            Subscribe to our newsletter for the latest security insights and updates.
                        </p>
                        <form
                            className="newsletter-form"
                            onSubmit={handleNewsletterSubmit}
                            aria-label="Newsletter signup"
                        >
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="newsletter-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                aria-label="Email address"
                            />
                            <button
                                type="submit"
                                className="newsletter-button"
                                aria-label="Subscribe"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="loading-spinner"></span>
                                ) : (
                                    <ArrowRight size={16} />
                                )}
                            </button>
                        </form>
                        {submitSuccess && (
                            <p className="newsletter-success">
                                <CheckCircle size={14} />
                                <span>Thanks for subscribing!</span>
                            </p>
                        )}
                        <div className="newsletter-benefits">
                            <div className="benefit-item">
                                <CheckCircle size={14} />
                                <span>Weekly security briefings</span>
                            </div>
                            <div className="benefit-item">
                                <CheckCircle size={14} />
                                <span>Exclusive research access</span>
                            </div>
                            <div className="benefit-item">
                                <CheckCircle size={14} />
                                <span>Early feature updates</span>
                            </div>
                        </div>
                    </div>
                </div>





            <div className="footer-contact">
                <div className="contact-item">
                    <Globe size={16} />
                    <span>1234 Cyber Street, Tech City, TC 98765</span>
                </div>
                <div className="contact-item">
                    <Mail size={16} />
                    <a href="mailto:contact@blackvire.com">contact@blackvire.com</a>
                </div>
                <div className="contact-item">
                    <Phone size={16} />
                    <a href="tel:+1-555-123-4567">+1-555-123-4567</a>
                </div>
                <div className="contact-item">
                    <MessageSquare size={16} />
                    <a href="/support">Support Portal</a>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="footer-copyright">
                    &copy; {currentYear} BlackVire Security. All rights reserved.
                </div>
                <div className="footer-legal">
                    <a href="/terms">Terms</a>
                    <a href="/privacy">Privacy</a>
                    <a href="/cookies">Cookies</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;