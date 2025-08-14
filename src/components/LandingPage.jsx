import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Building,
  Search,
  Grid3x3,
  Send,
} from "react-bootstrap-icons";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./styles/LandingPage.css";
import { useNavigate } from "react-router-dom";

function LandingPage() {
  const [visibleSections, setVisibleSections] = useState({
    error: false,
    features: false,
    stats: false,
    contact: false,
    cta: false,
  });

  const [hasAnimated, setHasAnimated] = useState(false);

  const errorSectionRef = useRef(null);
  const featuresSectionRef = useRef(null);
  const statsSectionRef = useRef(null);
  const contactSectionRef = useRef(null);
  const ctaSectionRef = useRef(null);

  const businessCountRef = useRef(null);
  const usersCountRef = useRef(null);
  const citiesCountRef = useRef(null);
  const satisfactionCountRef = useRef(null);

  const navigate = useNavigate();

  const animateCounter = (element, start, end, duration) => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentCount = Math.floor(progress * (end - start) + start);

      if (element) {
        if (end >= 1000) {
          element.textContent = currentCount.toLocaleString() + "+";
        } else {
          element.textContent = currentCount + "+";
        }
      }

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  };

  useEffect(() => {
    const handleScroll = () => {
      const isVisible = (element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.top <= window.innerHeight * 0.75;
      };

      setVisibleSections((prevSections) => ({
        ...prevSections,
        error: isVisible(errorSectionRef.current),
        features: isVisible(featuresSectionRef.current),
        stats: isVisible(statsSectionRef.current),
        contact: isVisible(contactSectionRef.current),
        cta: isVisible(ctaSectionRef.current),
      }));
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (visibleSections.stats && !hasAnimated) {
      animateCounter(businessCountRef.current, 0, 1000, 2000);
      animateCounter(usersCountRef.current, 0, 50000, 2000);
      animateCounter(citiesCountRef.current, 0, 100, 2000);
      animateCounter(satisfactionCountRef.current, 0, 95, 2000);
      setHasAnimated(true);
    }
  }, [visibleSections.stats, hasAnimated]);

  const handleFindServicesClick = () => {
    navigate("/login");
  };

  const handleExploreNowClick = () => {
    navigate("/login");
  };

  const handleJoinAsBusiness = () => {
    navigate("/register-business");
  };

  const handleBusinessLogin = () => {
    navigate("/business-login");
  };

  return (
    <div className="app-container">

      <header className={`navbar-container container py-3 glass-panel `}>
        <nav className="d-flex justify-content-between align-items-center w-100">
          <div className="logo">UdhyogUnity</div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="auth-buttons d-flex gap-2">
            <button className="btn-get-started neon-button" onClick={handleFindServicesClick}>
              Find Services
            </button>
            <div className="dropdown">
              <button
                className="btn-get-started neon-button2 dropdown-toggle"
                type="button"
                id="businessDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                For Business
              </button>
              <ul className="dropdown-menu" aria-labelledby="businessDropdown">
                <li><a className="dropdown-item" onClick={handleBusinessLogin}>Business Login</a></li>
                <li><a className="dropdown-item" onClick={handleJoinAsBusiness}>Register Business</a></li>
              </ul>
            </div>
          </div>
        </nav>
      </header>

      <section className="hero-section container text-center">
        <h1>
          Connecting
          <span className="text-accent"> Cities Through Local Business</span>
        </h1>
        <p className="hero-subtitle">
          Discover and connect with local businesses in your city. Build
          stronger communities through digital transformation.
        </p>
        <button className="btn-explore neon-button" onClick={handleExploreNowClick}>
          Explore Now
        </button>
        <div className="imgContainer">
          <img
            src="https://4kwallpapers.com/images/walls/thumbs_3t/11209.jpg"
            alt="city"
          />
        </div>
      </section>

      <section
        id="features"
        ref={featuresSectionRef}
        className={`features-section container text-center ${visibleSections.features ? "visible" : ""
          }`}
      >
        <h2>Powerful Features</h2>
        <p className="features-subtitle">
          Everything you need to discover and connect with local businesses in
          your area
        </p>

        <div className="row feature-cards">
          <motion.div className="col-md-4" whileHover={{ scale: 1.05 }}>
            <div className="feature-card">
              <div className="feature-icon business-icon">
                <Building />
              </div>
              <h3>Business Profiles</h3>
              <p>
                Create detailed business profiles with all the information your
                customers need
              </p>
            </div>
          </motion.div>
          <motion.div className="col-md-4" whileHover={{ scale: 1.05 }}>
            <div className="feature-card">
              <div className="feature-icon search-icon">
                <Search />
              </div>
              <h3>Smart Search</h3>
              <p>
                Find exactly what you are looking for with our intelligent
                search system
              </p>
            </div>
          </motion.div>
          <motion.div className="col-md-4" whileHover={{ scale: 1.05 }}>
            <div className="feature-card">
              <div className="feature-icon categories-icon">
                <Grid3x3 />
              </div>
              <h3>Service Categories</h3>
              <p>
                Browse businesses by categories to find the perfect match for
                your needs
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section
        id="about"
        className={`about-section container text-center ${visibleSections.about ? "visible" : ""}`}
      >
        <h2>About Us</h2>
        <p className="about-subtitle">
          UdhyogUnity is dedicated to connecting cities through local businesses. Our mission is to empower local businesses and build stronger communities through digital transformation.
        </p>
        <div className="row about-content">
          <div className="col-md-6">
            <img
              src="./src/assets/aboutus.png"
              alt="About Us"
              className="about-image"
            />
          </div>
          <div className="col-md-6">
            <p>
              We believe in the power of local businesses to drive economic growth and create vibrant communities. Our platform provides the tools and resources needed for businesses to thrive in the digital age.
            </p>
          </div>
        </div>
      </section>

      <section
        ref={statsSectionRef}
        className={`stats-section container ${visibleSections.stats ? "visible" : ""
          }`}
      >
        <div className="stats-container">
          <div className="row">
            <div className="col-md-3 text-center">
              <div className="stat-number" ref={businessCountRef}>
                0+
              </div>
              <div className="stat-label">Active Businesses</div>
            </div>
            <div className="col-md-3 text-center">
              <div className="stat-number" ref={usersCountRef}>
                0+
              </div>
              <div className="stat-label">Monthly Users</div>
            </div>
            <div className="col-md-3 text-center">
              <div className="stat-number" ref={citiesCountRef}>
                0+
              </div>
              <div className="stat-label">Cities Covered</div>
            </div>
            <div className="col-md-3 text-center">
              <div className="stat-number" ref={satisfactionCountRef}>
                0+
              </div>
              <div className="stat-label">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="contact"
        ref={contactSectionRef}
        className={`contact-section container text-center ${visibleSections.contact ? "visible" : ""
          }`}
      >
        <h2>Get in Touch</h2>
        <p className="contact-subtitle">
          Have questions or want to join our network? We would love to hear from
          you.
        </p>

        <div className="row contact-container">
          <div className="col-md-6">
            <img src="./src/assets/contactus.png" alt="Contactus" className="contact-img" />
          </div>
          <div className="col-md-6">
            <div className="contact-form">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Name
                </label>
                <input
                  type="text"
                  className="form-control form-input"
                  id="name"
                  placeholder="Your name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  className="form-control form-input"
                  id="email"
                  placeholder="your@email.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="message" className="form-label">
                  Message
                </label>
                <textarea
                  className="form-control form-input"
                  id="message"
                  rows="4"
                  placeholder="Your message"
                ></textarea>
              </div>
              <button className="btn-send-message neon-button">
                Send Message <Send className="send-icon" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={ctaSectionRef}
        className={`cta-section container text-center ${visibleSections.cta ? "visible" : ""
          }`}
      >
        <h2>Ready to Get Started?</h2>
        <p className="cta-subtitle">
          Join thousands of businesses already growing with UdhyogUnity
        </p>
        <button className="btn-join-now neon-button" onClick={handleJoinAsBusiness}>
          Join Now
        </button>
      </section>

      <footer className="footer-section container text-center">
        <p>&copy;2025 <b>UdhyogUnity.</b> All rights reserved </p>
        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <a href="#privacy">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
