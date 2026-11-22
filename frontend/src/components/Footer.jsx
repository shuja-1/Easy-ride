import { Link } from 'react-router-dom';
import { Logo } from './Navbar.jsx';
import Icon from './Icon.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo light />
          <p>
            Premium self-drive car rentals from verified providers. Transparent pricing, instant
            booking requests and secure UPI payments.
          </p>
          <div className="footer-contact">
            <span>
              <Icon name="mail" size={15} /> support@easyride.com
            </span>
            <span>
              <Icon name="phone" size={15} /> +91 98765 43210
            </span>
            <span>
              <Icon name="mapPin" size={15} /> Bengaluru, India
            </span>
          </div>
        </div>

        <div className="footer-col">
          <h4>Explore</h4>
          <Link to="/cars">Browse cars</Link>
          <Link to="/#services">Services</Link>
          <Link to="/#about">About us</Link>
          <Link to="/#contact">Contact</Link>
        </div>

        <div className="footer-col">
          <h4>Get started</h4>
          <Link to="/signup">Create an account</Link>
          <Link to="/login">Customer login</Link>
          <Link to="/signup?role=provider">List your car</Link>
          <Link to="/login">Provider login</Link>
        </div>

        <div className="footer-col footer-bookings">
          <h4>Book with confidence</h4>
          <p>Pay securely with UPI after your booking is approved.</p>
          <div className="pay-badges">
            <span>UPI</span>
            <span>GPay</span>
            <span>PhonePe</span>
            <span>Paytm</span>
            <span>Razorpay</span>
          </div>
          <div className="footer-note">
            <Icon name="shield" size={16} />
            Admin-verified listings
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} EasyRide. All rights reserved.</p>
        <p>Built with React, Node.js, Express and MongoDB.</p>
      </div>
    </footer>
  );
}
