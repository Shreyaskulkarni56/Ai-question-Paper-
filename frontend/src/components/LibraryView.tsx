'use client';

import React, { useEffect, useState } from 'react';
import styles from '../styles/components.module.css';
import { FileText, Download, Trash2, FolderHeart, Search } from 'lucide-react';

interface LibraryFile {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  createdAt: string;
}

export default function LibraryView() {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchFiles = async () => {
    try {
      const response = await fetch('https://ai-question-paper.onrender.com/api/library');
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (err) {
      console.error('Failed to fetch library files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) return;

    try {
      const response = await fetch(`https://ai-question-paper.onrender.com/api/library/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setFiles(files.filter(f => f._id !== id));
      } else {
        alert('Failed to delete file.');
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('Error deleting file.');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const filteredFiles = files.filter(f => 
    f.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', animation: 'slideIn 0.4s ease-out' }}>
      
      {/* Header */}
      <div className={styles.filledHeader}>
        <div className={styles.filledHeaderTitleRow}>
          <div className={styles.greenDot} style={{ background: '#3b82f6' }}></div>
          <h2 className={styles.filledHeaderTitle}>My Library</h2>
        </div>
        <p className={styles.filledHeaderSub}>
          Access and manage your uploaded reference materials.
        </p>
      </div>

      {/* Action Bar */}
      <div className={styles.filterSearchBar}>
        <button className={styles.filterBtn}>
          <FolderHeart size={14} />
          <span>{files.length} Files</span>
        </button>

        <div className={styles.searchContainer}>
          <Search size={14} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search Reference Files..." 
            className={styles.searchField}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading library...
        </div>
      ) : files.length === 0 ? (
        <div className={styles.emptyStateView} style={{ minHeight: '50vh' }}>
          <FolderHeart size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 className={styles.emptyTitle}>Your Library is Empty</h3>
          <p className={styles.emptySubtext}>
            Upload PDF or Text files when creating an assignment to save them here for future reference.
          </p>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {filteredFiles.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No files match your search.
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div key={file._id} className={styles.gridCard} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '12px', color: '#3b82f6' }}>
                    <FileText size={24} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)', marginBottom: '4px' }} title={file.originalName}>
                      {file.originalName}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <a 
                    href={`https://ai-question-paper.onrender.com${file.path}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.blackPillBtn}
                    style={{ flex: 1, justifyContent: 'center', padding: '8px 16px', fontSize: '0.8rem', marginTop: 0 }}
                  >
                    <Download size={14} />
                    Download
                  </a>
                  <button 
                    onClick={(e) => handleDelete(file._id, e)}
                    className={styles.blackPillBtn}
                    style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '8px 16px', marginTop: 0 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
