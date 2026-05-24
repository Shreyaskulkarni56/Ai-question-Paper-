'use strict';
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import { startGenerationJob, setError, setLoading, clearGenerationJob } from '../store/assessmentSlice';
import styles from '../styles/components.module.css';
import { 
  FileText, 
  UploadCloud, 
  X, 
  ChevronRight, 
  Mic, 
  ArrowLeft,
  ArrowRight,
  Plus
} from 'lucide-react';

interface QuestionRow {
  id: string;
  type: string;
  count: number;
  marks: number;
}

export default function CreateForm() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state) => state.assessment.loading);

  // Form states
  const [title, setTitle] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  
  // Dynamic question type rows
  const [rows, setRows] = useState<QuestionRow[]>([
    { id: '1', type: 'mcq', count: 4, marks: 1 },
    { id: '2', type: 'short', count: 3, marks: 2 },
    { id: '3', type: 'diagram', count: 5, marks: 5 },
    { id: '4', type: 'numerical', count: 5, marks: 5 }
  ]);

  useEffect(() => {
    // Reset default rows to match figma exactly
    setRows([
      { id: '1', type: 'mcq', count: 4, marks: 1 },
      { id: '2', type: 'short', count: 3, marks: 2 },
      { id: '3', type: 'diagram', count: 5, marks: 5 },
      { id: '4', type: 'numerical', count: 5, marks: 5 }
    ]);
  }, []);

  const [file, setFile] = useState<File | null>(null);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available question formats matching Figma dropdown options
  const questionFormats = [
    { value: 'mcq', label: 'Multiple Choice Questions' },
    { value: 'short', label: 'Short Questions' },
    { value: 'diagram', label: 'Diagram/Graph-Based Questions' },
    { value: 'numerical', label: 'Numerical Problems' },
    { value: 'long', label: 'Essay / Long Answer Questions' }
  ];

  // Helper row modifiers
  const handleAddRow = () => {
    const newId = (rows.length > 0 ? Math.max(...rows.map(r => parseInt(r.id) || 0)) + 1 : 1).toString();
    setRows([...rows, { id: newId, type: 'mcq', count: 5, marks: 2 }]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const handleRowChange = (id: string, field: 'type' | 'count' | 'marks', value: any) => {
    setRows(rows.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  // Dynamically compute summaries
  const totalQuestions = rows.reduce((sum, r) => sum + r.count, 0);
  const totalMarks = rows.reduce((sum, r) => sum + (r.count * r.marks), 0);

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validTypes = ['application/pdf', 'text/plain'];
      if (validTypes.includes(droppedFile.type)) {
        setFile(droppedFile);
        setErrors(prev => ({ ...prev, file: '' }));
      } else {
        setErrors(prev => ({ ...prev, file: 'Only PDF or TXT files are accepted.' }));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrors(prev => ({ ...prev, file: '' }));
    }
  };

  // Submit to background BullMQ worker
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (totalQuestions <= 0) {
      newErrors.rows = 'Total questions count must be greater than zero.';
    }

    if (!title.trim()) {
      newErrors.title = 'Paper Title is required.';
    }

    if (totalMarks <= 0) {
      newErrors.rows = 'Total marks sum must be greater than zero.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    dispatch(setLoading(true));

    try {
      // Gather all selected question types for parsing
      const selectedTypes = Array.from(new Set(rows.map(r => r.type)));

      const formData = new FormData();
      formData.append('title', title || 'AI Generated Assessment');
      formData.append('schoolName', schoolName);
      formData.append('subject', subject);
      formData.append('className', className);
      formData.append('dueDate', dueDate);
      formData.append('questionTypes', JSON.stringify(selectedTypes));
      formData.append('numQuestions', totalQuestions.toString());
      formData.append('totalMarks', totalMarks.toString());
      formData.append('additionalInstructions', additionalInstructions || `Please use this dynamic breakdown: ${JSON.stringify(rows)}`);
      
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('https://ai-question-paper.onrender.com/api/assignments', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server rejected creation request.');
      }

      const assignment = await response.json();
      console.log('Assignment successfully queued:', assignment);
      
      // Tell Redux store to launch Socket.io listening room
      dispatch(startGenerationJob(assignment._id));

    } catch (err: any) {
      console.error('Submission failed:', err);
      dispatch(setError(err?.message || 'Failed to submit assignment request.'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleCancel = () => {
    dispatch(clearGenerationJob());
    // Trigger parent return by resetting state
    const customEvent = new CustomEvent('form-close');
    window.dispatchEvent(customEvent);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* progress Stepper Bar */}
      <div className={styles.stepperBar}>
        <div className={styles.stepperActiveFill}></div>
      </div>

      <form onSubmit={handleSubmit} className={styles.formSectionCard}>
        <div>
          <h3 className={styles.formSectionTitle}>Assignment Details</h3>
          <p className={styles.formSectionSub}>Basic information about your assignment</p>
        </div>

        {/* Basic Info Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '8px' }}>
          <div>
            <label className={styles.formLabel} style={{ color: 'var(--text-main)' }}>Paper Title *</label>
            <input 
              type="text" 
              className={styles.textareaField} 
              style={{ minHeight: '44px', padding: '10px 16px', borderRadius: '8px' }}
              placeholder="e.g. Science Mid-Term Examination"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={loading}
            />
            {errors.title && <div className={styles.errorText}>{errors.title}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className={styles.formLabel} style={{ color: 'var(--text-main)' }}>School Name</label>
              <input 
                type="text" 
                className={styles.textareaField} 
                style={{ minHeight: '44px', padding: '10px 16px', borderRadius: '8px' }}
                placeholder="e.g. Delhi Public School"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className={styles.formLabel} style={{ color: 'var(--text-main)' }}>Subject</label>
              <input 
                type="text" 
                className={styles.textareaField} 
                style={{ minHeight: '44px', padding: '10px 16px', borderRadius: '8px' }}
                placeholder="e.g. Physics"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className={styles.formLabel} style={{ color: 'var(--text-main)' }}>Class / Grade</label>
              <input 
                type="text" 
                className={styles.textareaField} 
                style={{ minHeight: '44px', padding: '10px 16px', borderRadius: '8px' }}
                placeholder="e.g. 10th"
                value={className}
                onChange={e => setClassName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* 1. Dotted Reference File Upload Zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {!file ? (
            <div 
              className={styles.figmaUploadZone}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className={styles.cloudIcon} size={32} strokeWidth={1.5} />
              <span className={styles.uploadTitleText}>Choose a file or drag & drop it here</span>
              <span className={styles.uploadSubtext}>JPEG, PNG, PDF or TXT up to 10MB</span>
              
              <button type="button" className={styles.browseFilesBtn}>
                Browse Files
              </button>

              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.txt,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>
          ) : (
            <div className={styles.fileSelectedBadge}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: '#EA580C' }} />
                <span className={styles.fileName}>{file.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              <button 
                type="button" 
                className={styles.clearFileBtn}
                onClick={() => setFile(null)}
                title="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
            Upload images or books of your preferred document/image
          </span>
          {errors.file && <div className={styles.errorText}>{errors.file}</div>}
        </div>

        {/* 2. Due Date Pill input */}
        <div className={styles.dueDateWrapper}>
          <label className={styles.formLabel} style={{ color: 'var(--text-main)' }}>
            Due Date
          </label>
          <div className={styles.dateInputContainer}>
            <input
              type="date"
              className={styles.datePickerField}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* 3. Dynamic Question Types table list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Header Row (Desktop only) */}
          <div className={styles.qTypeHeaderRow}>
            <span>Question Type</span>
            <span>No. of Questions</span>
            <span>Marks</span>
          </div>

          {/* Rows List */}
          <div className={styles.qTypeRowList}>
            {rows.map((row) => (
              <div key={row.id} className={styles.qTypeRow}>
                
                {/* Format Dropdown & removal x button */}
                <div className={styles.qTypeDropdownWrapper}>
                  <button 
                    type="button" 
                    className={styles.rowRemoveBtn}
                    onClick={() => handleRemoveRow(row.id)}
                    disabled={loading || rows.length === 1}
                    title="Remove category row"
                  >
                    <X size={16} />
                  </button>

                  <select
                    className={styles.dropdownSelect}
                    value={row.type}
                    onChange={(e) => handleRowChange(row.id, 'type', e.target.value)}
                    disabled={loading}
                  >
                    {questionFormats.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Counters blocks (Adaptive desktop columns / stacked mobile cards) */}
                <div className={styles.mobileCounterContainer}>
                  
                  {/* Questions quantity counter */}
                  <div className={styles.mobileCounterSubBlock}>
                    <span className={`${styles.mobileCounterLabel} mobile-only`}>No. of Questions</span>
                    <div className={styles.counterPill}>
                      <button 
                        type="button" 
                        className={styles.counterBtn}
                        onClick={() => handleRowChange(row.id, 'count', Math.max(1, row.count - 1))}
                        disabled={loading}
                      >
                        -
                      </button>
                      <span className={styles.counterValue}>{row.count}</span>
                      <button 
                        type="button" 
                        className={styles.counterBtn}
                        onClick={() => handleRowChange(row.id, 'count', row.count + 1)}
                        disabled={loading}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Marks counter */}
                  <div className={styles.mobileCounterSubBlock}>
                    <span className={`${styles.mobileCounterLabel} mobile-only`}>Marks</span>
                    <div className={styles.counterPill}>
                      <button 
                        type="button" 
                        className={styles.counterBtn}
                        onClick={() => handleRowChange(row.id, 'marks', Math.max(1, row.marks - 1))}
                        disabled={loading}
                      >
                        -
                      </button>
                      <span className={styles.counterValue}>{row.marks}</span>
                      <button 
                        type="button" 
                        className={styles.counterBtn}
                        onClick={() => handleRowChange(row.id, 'marks', row.marks + 1)}
                        disabled={loading}
                      >
                        +
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            ))}
          </div>

          {errors.rows && <div className={styles.errorText} style={{ textAlign: 'center' }}>{errors.rows}</div>}

          {/* Add question type Action Row */}
          <button 
            type="button" 
            className={styles.addTypeBtn}
            onClick={handleAddRow}
            disabled={loading}
          >
            <div className={styles.addTypeIconCircle}>
              <Plus size={12} strokeWidth={3} />
            </div>
            <span className={styles.addTypeText}>Add Question Type</span>
          </button>

          {/* Automatic Summarizer Block */}
          <div className={styles.totalsSummaryBlock}>
            <div>
              <span>Total Questions : </span>
              <span className={styles.totalsSummaryValue}>{totalQuestions}</span>
            </div>
            <div>
              <span>Total Marks : </span>
              <span className={styles.totalsSummaryValue}>{totalMarks}</span>
            </div>
          </div>
        </div>

        {/* 4. Labeled Additional Information textarea */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label className={styles.formLabel} style={{ color: 'var(--text-main)' }}>
            Additional Information (For better output)
          </label>
          <div style={{ position: 'relative', width: '100%' }}>
            <textarea
              className={styles.textareaField}
              style={{ paddingRight: '40px', minHeight: '90px', borderRadius: '16px' }}
              placeholder="e.g. Generate a question paper for 3 hour exam duration..."
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              disabled={loading}
            />
            {/* Microphone icon decoration inside bottom right */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }} title="Voice prompting (Decorative)">
              <Mic size={16} />
            </div>
          </div>
        </div>

        {/* 5. Navigation Pill footer */}
        <div className={styles.formNavigationFooter}>
          <button 
            type="button" 
            className={styles.pillBtnPrevious}
            onClick={handleCancel}
            disabled={loading}
          >
            <ArrowLeft size={16} />
            <span>Previous</span>
          </button>

          <button 
            type="submit" 
            className={styles.pillBtnNext}
            disabled={loading}
          >
            <span>Next</span>
            <ArrowRight size={16} />
          </button>
        </div>

      </form>
    </div>
  );
}
