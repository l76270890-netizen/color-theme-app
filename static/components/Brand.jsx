import React from "react";
import { Link } from "react-router-dom";

export default function Brand({ footer = false }) {
  return (
    <Link className={`brand${footer ? " footer-brand" : ""}`} to="/home" aria-label="Huecraft home">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span>huecraft<span className="brand-period">.</span></span>
    </Link>
  );
}
