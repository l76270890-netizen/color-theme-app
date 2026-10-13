import React from "react";
import { Link } from "react-router-dom";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  return <div className="not-found-page page-content"><div className="eyebrow small-eyebrow">WRONG TURN?</div><h1>We couldn’t find that page.</h1><p>It may have moved, or the link may be out of date.</p><Link to="/">Back to home ↗</Link></div>;
}
