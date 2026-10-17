import React from "react";
import { Link } from "react-router-dom";
import Brand from "./Brand.jsx";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer site-footer">
      <div className="footer-main">
        <div className="footer-about">
          <Brand footer />
          <p>Thoughtful color for the things you make.</p>
        </div>
        <div className="footer-links">
          <strong>Discover</strong>
          <Link to="/explore">Explore palettes</Link>
          <Link to="/collections">Your collections</Link>
          <Link to="/assistant">AI color assistant</Link>
        </div>
        <div className="footer-links">
          <strong>Make it yours</strong>
          <Link to="/preview">Live website preview</Link>
          <Link to="/settings">Workspace settings</Link>
          <Link to="/home#developer-tools">Developer tools</Link>
        </div>
        <div className="footer-links">
          <strong>Learn &amp; explore</strong>
          <Link to="/home#about">About Huecraft</Link>
          <Link to="/home#home-categories-heading">Browse by project</Link>
          <Link to="/home">Back to home ↑</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Huecraft</span>
        <span>Built for curious minds <span className="footer-star">✳</span></span>
      </div>
    </footer>
  );
}
