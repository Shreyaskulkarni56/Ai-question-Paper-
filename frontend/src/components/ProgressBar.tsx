'use strict';
'use client';

import React from 'react';
import { useAppSelector } from '../store/store';
import styles from '../styles/components.module.css';

export default function ProgressBar() {
  const { progress, message, status } = useAppSelector(
    (state) => state.assessment.generationJob
  );

  if (status === 'idle') return null;

  // Derive contextual loading message
  let subMessage = "The background worker is currently preparing your request...";
  if (progress > 0 && progress < 25) {
    subMessage = "Reading assignment options and extracting textbook references...";
  } else if (progress >= 25 && progress < 50) {
    subMessage = "Submitting queries to Gemini AI model and generating syllabus questions...";
  } else if (progress >= 50 && progress < 80) {
    subMessage = "Assembling examination sections and verifying answer guidelines...";
  } else if (progress >= 80 && progress < 100) {
    subMessage = "Structuring academic layout and formatting database logs...";
  } else if (progress === 100) {
    subMessage = "Finished! Preparing your premium paper layout...";
  }

  return (
    <div className={`${styles.formCard} ${styles.progressCard}`}>
      <h3 className={styles.statusMessage}>AI Generation Active</h3>
      
      {/* Radial Halos Spinner */}
      <div className={styles.loadingSpinnerOuter}>
        <div className={styles.loadingProgressCircle}></div>
        <span className={styles.loadingPercentText}>{progress}%</span>
      </div>

      <div style={{ width: '100%' }}>
        {/* Progress Bar Container */}
        <div className={styles.progressBarContainer}>
          <div 
            className={styles.progressBarFill}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ fontWeight: 700, color: '#22d3ee', fontSize: '0.95rem' }}>
          {message || 'Awaiting background scheduler...'}
        </p>
        <p className={styles.subStatusMessage}>
          {subMessage}
        </p>
      </div>
    </div>
  );
}
