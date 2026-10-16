import React from "react";
import { Link } from "react-router-dom";
import TypingHeading from "../components/TypingHeading.jsx";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  return <div className="not-found-page page-content"><div className="eyebrow small-eyebrow">WRONG TURN?</div><TypingHeading text="We couldn’t find that page." /><p>It may have moved, or the link may be out of date.</p><Link to="/">Back to home ↗</Link></div>;
}
