'use strict';
'use client';

import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/store';
import { setAssignments, setCurrentAssignment, updateGenerationProgress, setError, addAssignmentToList } from '../store/assessmentSlice';
import styles from '../styles/components.module.css';
import { History, BookOpen, Trash2, Clock } from 'lucide-react';

export default function HistoryPanel() {
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => state.assessment.list);
  const current = useAppSelector((state) => state.assessment.current);
  const loading = useAppSelector((state) => state.assessment.loading);

  // Fetch past assessments from backend database
  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/assignments');
      if (!response.ok) throw new Error('Failed to load history list');
      
      const data = await response.json();
      dispatch(setAssignments(data));
    } catch (err: any) {
      console.error(err);
      dispatch(setError('Could not retrieve assessment logs.'));
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSelect = (assignment: any) => {
    // If it's already active, do nothing
    if (current && current._id === assignment._id) return;
    
    // Set current active paper
    dispatch(setCurrentAssignment(assignment));
    
    // If it's in progress, update the queue loader context
    if (assignment.status === 'generating' || assignment.status === 'pending') {
      dispatch(updateGenerationProgress({
        assignmentId: assignment._id,
        message: 'Reconnecting to background task...',
        progress: 10,
        status: assignment.status
      }));
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering select
    if (!window.confirm("Are you sure you want to delete this assessment?")) return;

    try {
      const response = await fetch(`http://localhost:4000/api/assignments/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Delete request failed.');

      // Refresh list
      const updatedList = list.filter(item => item._id !== id);
      dispatch(setAssignments(updatedList));

      // If active was deleted, clear it
      if (current && current._id === id) {
        dispatch(setCurrentAssignment(null));
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete: ' + err.message);
    }
  };

  return (
    <div className={`${styles.historyPanel} no-print`}>
      <h3 className={styles.historyTitle}>
        <History size={16} style={{ color: '#a855f7' }} />
        <span>Assessment Logs</span>
      </h3>

      <div className={styles.historyList}>
        {list.length === 0 ? (
          <div className={styles.emptyHistory}>
            No past assessments found. Create one to begin.
          </div>
        ) : (
          list.map((item) => (
            <div 
              key={item._id}
              className={`${styles.historyItem} ${current?._id === item._id ? styles.historyItemActive : ''}`}
              onClick={() => handleSelect(item)}
            >
              <div className={item.status === 'generating' ? styles.historyItemContent : ''}>
                <p className={styles.historyItemTitle}>{item.title}</p>
                
                <div className={styles.historyItemSub}>
                  <span style={{ 
                    color: 
                      item.status === 'completed' ? '#16a34a' :
                      item.status === 'failed' ? '#ef4444' : '#eab308'
                  }}>
                    {item.status}
                  </span>
                  <span>•</span>
                  <span>{item.numQuestions} Qs</span>
                  <span>•</span>
                  <span>{item.totalMarks} Marks</span>
                </div>
              </div>

              <button
                className={styles.deleteHistoryBtn}
                onClick={(e) => handleDelete(item._id, e)}
                title="Delete assignment log"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
