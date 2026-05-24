'use strict';
'use client';

import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/store';
import { clearGenerationJob, startGenerationJob, setLoading, setError } from '../store/assessmentSlice';
import styles from '../styles/components.module.css';
import { Printer, Eye, EyeOff, RotateCcw, AlertTriangle, CheckCircle2, Award, Edit, X, Save } from 'lucide-react';
import { setCurrentAssignment } from '../store/assessmentSlice';

export default function AssessmentViewer() {
  const dispatch = useAppDispatch();
  const current = useAppSelector((state) => state.assessment.current);
  
  // Teacher view toggle for answers
  const [showAnswers, setShowAnswers] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    schoolName: '',
    subject: '',
    className: ''
  });

  if (!current) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleEditOpen = () => {
    setEditForm({
      title: current.title || '',
      schoolName: current.schoolName || '',
      subject: current.subject || '',
      className: current.className || ''
    });
    setIsEditing(true);
  };

  const handleEditSave = async () => {
    dispatch(setLoading(true));
    try {
      const response = await fetch(`http://localhost:4000/api/assignments/${current._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!response.ok) throw new Error('Failed to update details');
      const updated = await response.json();
      dispatch(setCurrentAssignment(updated));
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      dispatch(setLoading(false));
    }
  };


  
  const handleRegenerate = async () => {
    if (!window.confirm("Are you sure you want to regenerate this question paper? This will overwrite the current content.")) {
      return;
    }
    
    dispatch(setLoading(true));
    dispatch(clearGenerationJob());

    try {
      const response = await fetch(`http://localhost:4000/api/assignments/${current._id}/regenerate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start regeneration');
      }

      const assignment = await response.json();
      dispatch(startGenerationJob(assignment._id));
    } catch (err: any) {
      dispatch(setError(err?.message || 'Regeneration initiation failed.'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className={styles.viewerShell}>
      {/* Dark AI Greeting Banner */}
      <div className={`${styles.greetingBanner} no-print`}>
        <p className={styles.greetingText}>
          Here is your customized question paper: <strong style={{color: 'white'}}>{current.title}</strong>
        </p>
        
        <div className={styles.bannerControls}>
          {/* PDF Print Download Action */}
          <button 
            className={`${styles.bannerBtn} ${styles.bannerBtnPrimary}`}
            onClick={handlePrint}
            title="Print or save this layout as a PDF"
          >
            <Printer size={16} />
            <span>Download as PDF</span>
          </button>

          {/* Edit Details Action */}
          <button 
            className={styles.bannerBtn}
            onClick={handleEditOpen}
            title="Edit school, subject, class, or title"
          >
            <Edit size={16} />
            <span>Edit Details</span>
          </button>

          {/* Answer Key Toggle */}
          <button 
            className={styles.bannerBtn}
            onClick={() => setShowAnswers(!showAnswers)}
            title="Toggle showing correct answers for grading review"
          >
            {showAnswers ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{showAnswers ? 'Hide Answer Key' : 'Show Answer Key'}</span>
          </button>

          {/* Regenerate Action */}
          <button 
            className={styles.bannerBtn}
            onClick={handleRegenerate}
            title="Regenerate questions using AI"
          >
            <RotateCcw size={16} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Lined Premium Paper */}
      <div className={`${styles.academicPaper} print-page`}>
        {/* School Header Block */}
        <div style={{ textAlign: 'center', marginBottom: '24px', color: '#1e293b' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            {current.schoolName || 'Your School Name'}
          </h1>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 6px 0' }}>
            Subject: {current.subject || 'Not Specified'}
          </h2>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 28px 0' }}>
            Class: {current.className || 'Not Specified'}
          </h3>
        </div>

        {/* Details Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '24px', color: '#1e293b', fontSize: '0.95rem' }}>
          <span>Time Allowed: 45 minutes</span>
          <span>Maximum Marks: {current.totalMarks || 20}</span>
        </div>

        {/* Instructions */}
        <div style={{ fontWeight: 600, marginBottom: '32px', color: '#1e293b', fontSize: '0.95rem' }}>
          All questions are compulsory unless stated otherwise.
        </div>

        {/* Lined Student Identity Grid */}
        <div className={styles.studentInfoBlock} style={{ marginBottom: '40px' }}>
          <div className={styles.studentLine}>
            <span>Name:</span>
            <div className={styles.dottedLine}></div>
          </div>
          <div className={styles.studentLine}>
            <span>Roll Number:</span>
            <div className={styles.dottedLine}></div>
          </div>
          <div className={styles.studentLine}>
            <span style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              Class: {current.className || '___'} <span style={{ marginLeft: '12px' }}>Section:</span>
            </span>
            <div className={styles.dottedLine}></div>
          </div>
        </div>

        {/* Render sections */}
        {current.sections && current.sections.map((section, sIdx) => {
          // split title by colon for figma-accurate section layout
          const parts = section.title.split(':');
          const sectionHeader = parts[0]?.trim();
          const sectionSub = parts[1]?.trim();

          return (
            <div key={sIdx} className={styles.sectionContainer}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px', pageBreakInside: 'avoid' }}>
                <h2 style={{ 
                  textAlign: 'center', 
                  fontSize: '1.25rem', 
                  fontWeight: 800, 
                  margin: '0 auto',
                  textTransform: 'uppercase',
                  color: '#000000'
                }}>
                  {sectionHeader}
                </h2>
                {sectionSub && (
                  <h3 style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 700, 
                    margin: '8px 0 0 0',
                    color: '#0f172a',
                    textAlign: 'left'
                  }}>
                    {sectionSub}
                  </h3>
                )}
              </div>
              
              <span className={styles.sectionInstructions}>
                {section.instructions}
              </span>

              {/* Questions list */}
              <div className={styles.questionList}>
                {section.questions && section.questions.map((question, qIdx) => {
                  const getDifficultyLabel = (difficulty: string) => {
                    const diff = difficulty?.toLowerCase();
                    if (diff === 'easy') return 'Easy';
                    if (diff === 'medium' || diff === 'moderate') return 'Moderate';
                    return 'Challenging';
                  };
                  const difficultyLabel = getDifficultyLabel(question.difficulty);

                  return (
                    <div key={qIdx} className={question.options && question.options.length > 0 ? "" : styles.questionItem} style={{ pageBreakInside: 'avoid' }}>
                      {/* Text & Marks */}
                      <div className={styles.questionHeader}>
                        <p className={styles.questionText}>
                          <span style={{ fontWeight: 800 }}>{qIdx + 1}.</span>{' '}
                          <span style={{ fontWeight: 'normal', color: '#475569', marginRight: '4px' }}>
                            [{difficultyLabel}]
                          </span>{' '}
                          {question.text}{' '}
                          <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '4px', fontSize: '0.92rem' }}>
                            [{question.marks} {question.marks === 1 ? 'Mark' : 'Marks'}]
                          </span>
                        </p>
                      </div>

                      {/* MCQ Options grid */}
                      {question.options && question.options.length > 0 && (
                        <div className={styles.optionsGrid} style={{ marginBottom: '16px' }}>
                          {question.options.map((opt, oIdx) => (
                            <div key={oIdx} className={styles.optionItem}>
                              <span style={{ fontWeight: 800 }}>
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Answer Key Block (if toggled) */}
        <div className="no-print">
          {showAnswers && (
            <div style={{ marginTop: '32px', pageBreakBefore: 'always' }}>
              <h2 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 800, 
                borderBottom: '2.5px solid #000000', 
                paddingBottom: '6px', 
                marginBottom: '20px', 
                color: '#000000',
                textTransform: 'uppercase'
              }}>
                Answer Key:
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(() => {
                  let qNumber = 0;
                  return current.sections.map((section) => 
                    section.questions.map((question) => {
                      qNumber++;
                      return (
                        <div key={question.id} style={{ fontSize: '1rem', color: '#1e293b', lineHeight: '1.5' }}>
                          <span style={{ fontWeight: 800 }}>{qNumber}. </span>
                          <span>{question.answerKey || 'Answer guideline not provided.'}</span>
                        </div>
                      );
                    })
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Details Modal Overlay */}
      {isEditing && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Edit Assignment Details</h3>
              <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20}/></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Paper Title</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>School Name</label>
                <input type="text" value={editForm.schoolName} onChange={e => setEditForm({...editForm, schoolName: e.target.value})} placeholder="e.g. Delhi Public School" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Subject</label>
                <input type="text" value={editForm.subject} onChange={e => setEditForm({...editForm, subject: e.target.value})} placeholder="e.g. English" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>Class</label>
                <input type="text" value={editForm.className} onChange={e => setEditForm({...editForm, className: e.target.value})} placeholder="e.g. 5th" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setIsEditing(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>Cancel</button>
              <button onClick={handleEditSave} disabled={!editForm.title.trim()} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', opacity: editForm.title.trim() ? 1 : 0.5 }}><Save size={16}/> Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
