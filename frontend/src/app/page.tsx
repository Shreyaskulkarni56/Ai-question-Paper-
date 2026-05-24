'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/store';
import { updateGenerationProgress, clearGenerationJob, setAssignments, setCurrentAssignment } from '../store/assessmentSlice';
import CreateForm from '../components/CreateForm';
import ProgressBar from '../components/ProgressBar';
import AssessmentViewer from '../components/AssessmentViewer';
import LibraryView from '../components/LibraryView';
import styles from '../styles/components.module.css';
import { io, Socket } from 'socket.io-client';
import { 
  Sparkles, 
  GraduationCap, 
  ChevronRight, 
  HelpCircle, 
  Sun, 
  Moon, 
  LayoutGrid, 
  Users, 
  FileText, 
  Wrench, 
  FolderHeart, 
  Settings, 
  Bell, 
  ChevronDown, 
  ArrowLeft,
  Plus,
  Menu,
  SlidersHorizontal,
  Search,
  MoreVertical
} from 'lucide-react';

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const current = useAppSelector((state) => state.assessment.current);
  const { assignmentId, status } = useAppSelector((state) => state.assessment.generationJob);
  const list = useAppSelector((state) => state.assessment.list);
  
  const socketRef = useRef<Socket | null>(null);
  
  // Theme state defaulting to light mode for crisp Figma fidelity
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Sidebar navigation tab selection state
  const [activeTab, setActiveTab] = useState<'home' | 'groups' | 'assignments' | 'toolkit' | 'library'>('assignments');
  
  // Controls if the creation form is active (when not generating/previewing)
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Mobile sidebar drawer open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search input state
  const [searchTerm, setSearchTerm] = useState('');

  // Keeps track of which assignment card three-dots menu is active
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Click listener to automatically close active card dropdowns & handle form cancellation
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    const handleFormClose = () => {
      setIsFormOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('form-close', handleFormClose);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('form-close', handleFormClose);
    };
  }, []);

  // Initialize WebSockets
  useEffect(() => {
    // Connect to Backend Socket.io Server
    const socket = io('http://localhost:4000', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Successfully connected to WebSocket server');
    });

    // Listen for progress updates emitted from BullMQ worker or fallback queue
    socket.on('generation-progress', (data: any) => {
      console.log('Received WebSocket generation progress update:', data);
      dispatch(updateGenerationProgress({
        assignmentId: data.assignmentId,
        message: data.message,
        progress: data.progress,
        status: data.status,
        result: data.result
      }));

      // If finished, refresh history logs list
      if (data.status === 'completed' || data.status === 'failed') {
        refreshHistory();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch]);

  // Join dedicated assignment channel when a job begins
  useEffect(() => {
    if (socketRef.current && assignmentId && (status === 'pending' || status === 'generating')) {
      console.log(`Emitting join event to register for Assignment room: ${assignmentId}`);
      socketRef.current.emit('join-assignment', assignmentId);
    }
  }, [assignmentId, status]);

  // Fetch list logs on mount
  useEffect(() => {
    refreshHistory();
  }, [dispatch]);

  // Helper to fetch list logs
  const refreshHistory = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/assignments');
      if (response.ok) {
        const data = await response.json();
        dispatch(setAssignments(data));
      }
    } catch (err) {
      console.error('Failed to sync history:', err);
    }
  };

  // Navigates back to the main empty dashboard
  const handleBack = () => {
    dispatch(setCurrentAssignment(null));
    setIsFormOpen(false);
    dispatch(clearGenerationJob());
    setIsMobileMenuOpen(false);
  };

  // Opens the Create Assignment Form
  const handleCreateAssignment = () => {
    dispatch(setCurrentAssignment(null));
    dispatch(clearGenerationJob());
    setIsFormOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleTabSelect = (tab: 'home' | 'groups' | 'assignments' | 'toolkit' | 'library') => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    if (tab === 'assignments') {
      handleBack();
    }
  };

  // Filter list by search term
  const filteredList = list.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Card click loads the selected sheet
  const handleSelectCard = (assignment: any) => {
    dispatch(setCurrentAssignment(assignment));
    if (assignment.status === 'generating' || assignment.status === 'pending') {
      dispatch(updateGenerationProgress({
        assignmentId: assignment._id,
        message: 'Reconnecting to background task...',
        progress: 10,
        status: assignment.status
      }));
    }
  };

  // Ellipsis menu actions
  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop parent card click
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleDeleteCard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div className={styles.appLayout}>
      
      {/* 1. LEFT SIDEBAR PANEL (RESPONSIVE DRAWER OVERLAY ON MOBILE) */}
      <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''} no-print`}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* VedaAI Brand Header */}
          <div className={styles.logoArea}>
            <div className={styles.logoIcon}>V</div>
            <span className={styles.logoText}>VedaAI</span>
          </div>

          {/* CTA Create Button */}
          <button 
            className={styles.orangeGlowBtn}
            onClick={handleCreateAssignment}
          >
            <Sparkles size={16} />
            <span>Create Assignment</span>
          </button>

          {/* Navigation Menu */}
          <nav className={styles.navMenu}>
            <button 
              className={`${styles.navItem} ${activeTab === 'home' ? styles.navItemActive : ''}`}
              onClick={() => handleTabSelect('home')}
            >
              <LayoutGrid size={18} />
              <span>Home</span>
            </button>
            
            <button 
              className={`${styles.navItem} ${activeTab === 'groups' ? styles.navItemActive : ''}`}
              onClick={() => handleTabSelect('groups')}
            >
              <Users size={18} />
              <span>My Groups</span>
            </button>
            
            <button 
              className={`${styles.navItem} ${activeTab === 'assignments' ? styles.navItemActive : ''}`}
              onClick={() => handleTabSelect('assignments')}
            >
              <FileText size={18} />
              <span>Assignments</span>
              
              {/* Dynamic red notification pill matching Figma */}
              {list.length > 0 && (
                <span style={{
                  background: '#f43f5e',
                  color: '#fff',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '50px',
                  marginLeft: 'auto',
                  fontWeight: 750,
                  boxShadow: '0 2px 5px rgba(244, 63, 94, 0.2)'
                }}>
                  {list.length}
                </span>
              )}
            </button>
            
            <button 
              className={`${styles.navItem} ${activeTab === 'toolkit' ? styles.navItemActive : ''}`}
              onClick={() => handleTabSelect('toolkit')}
            >
              <Wrench size={18} />
              <span>AI Teacher's Toolkit</span>
            </button>
            
            <button 
              className={`${styles.navItem} ${activeTab === 'library' ? styles.navItemActive : ''}`}
              onClick={() => handleTabSelect('library')}
            >
              <FolderHeart size={18} />
              <span>My Library</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer block */}
        <div className={styles.sidebarFooter}>
          <button className={styles.navItem} style={{ padding: '8px 16px' }} onClick={() => setIsMobileMenuOpen(false)}>
            <Settings size={18} />
            <span>Settings</span>
          </button>

          {/* Delhi Public School Profile Panel */}
          <div className={styles.profilePanel}>
            <img 
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80" 
              alt="School Logo" 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--accent-primary)'
              }}
            />
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>Delhi Public School</span>
              <span className={styles.profileSub}>Bokaro Steel City</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER BACKDROP MASK */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 99,
          }}
          className="no-print"
        ></div>
      )}

      {/* 2. MAIN CONTENT AREA */}
      <main className={styles.mainContent}>
        
        {/* Top Header Navigation Bar */}
        <div className={`${styles.headerBar} no-print`}>
          
          {/* BREADCRUMBS BARS (DESKTOP ONLY) */}
          <div className={styles.headerBreadcrumb}>
            {/* Conditional back arrow if in form or viewer state */}
            {(isFormOpen || current || status === 'pending' || status === 'generating') && (
              <button 
                onClick={handleBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '8px'
                }}
                title="Go back to dashboard"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <LayoutGrid size={18} style={{ color: 'var(--text-muted)' }} />
            <span>{isFormOpen || current || status === 'pending' || status === 'generating' ? 'Create New' : 'Assignment'}</span>
          </div>

          {/* MOBILE LOGO HEADER (MOBILE ONLY) */}
          <div className={styles.mobileHeaderLogo}>
            <div className={styles.logoIcon} style={{ width: '28px', height: '28px', fontSize: '1rem' }}>V</div>
            <span className={styles.logoText} style={{ fontSize: '1.2rem', color: '#0f172a' }}>VedaAI</span>
          </div>

          {/* Right Header Panel Actions */}
          <div className={styles.headerActions}>
            {/* Elegant Circular Theme Toggle Button */}
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              style={{
                background: 'var(--card-background)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-main)',
                padding: '10px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
                boxShadow: 'var(--shadow-sm)'
              }}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Notification Bell */}
            <div className={styles.notificationBell}>
              <Bell size={18} />
              <div className={styles.notificationBellDot}></div>
            </div>

            {/* User Profile Selector (Avatar) */}
            <div className={styles.headerUserMenu}>
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&q=80" 
                alt="Avatar" 
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span className={styles.headerUsername}>John Doe</span>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} className={styles.headerBreadcrumb} />
            </div>

            {/* Mobile hamburger drawer menu icon (visible only on mobile) */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                background: 'none',
                border: 'none',
                color: '#0f172a',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="mobile-only-toggle"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* 3. ADAPTIVE CONTENT ROUTER */}
        <div>
          {current ? (
            /* Show Exam Lined Paper View */
            <AssessmentViewer />
          ) : status === 'pending' || status === 'generating' ? (
            /* Show WebSocket Live Queue Loader */
            <ProgressBar />
          ) : isFormOpen ? (
            /* Show Glassmorphic Input settings Form */
            <CreateForm />
          ) : activeTab === 'library' ? (
            /* Show Library Viewer */
            <LibraryView />
          ) : activeTab !== 'assignments' ? (
            /* Show Placeholder for other pages */
            <div className={styles.emptyStateView} style={{ minHeight: '60vh' }}>
              <h3 className={styles.emptyTitle} style={{ fontSize: '1.8rem', marginTop: '20px' }}>Coming Soon</h3>
              <p className={styles.emptySubtext} style={{ fontSize: '1rem', maxWidth: '500px' }}>
                The <strong>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</strong> page is currently under development. Please check back later!
              </p>
              <button 
                className={styles.blackPillBtn}
                onClick={() => handleTabSelect('assignments')}
                style={{ marginTop: '16px' }}
              >
                Return to Assignments
              </button>
            </div>
          ) : list.length === 0 ? (
            /* RENDER FIGMA EMPTY STATE */
            <div className={styles.emptyStateView}>
              
              {/* Custom Crisp Vector SVG Empty State Graphic */}
              <div className={styles.emptyIllustration}>
                <svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Circle Background Glow Plate */}
                  <circle cx="110" cy="110" r="85" fill="#EEF2F6" />
                  
                  {/* Curly line decorator */}
                  <path d="M45 105C38 85 58 75 52 60" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
                  
                  {/* Sparkle star bottom left */}
                  <path d="M52 145L54 139L60 137L54 135L52 129L50 135L44 137L50 139L52 145Z" fill="#38BDF8" />
                  
                  {/* Tiny circle sparkle */}
                  <circle cx="168" cy="128" r="4" fill="#3B82F6" />

                  {/* Paper Document */}
                  <rect x="75" y="65" width="70" height="90" rx="8" fill="white" stroke="#CBD5E1" strokeWidth="2" />
                  <line x1="88" y1="85" x2="132" y2="85" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
                  <line x1="88" y1="98" x2="120" y2="98" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
                  <line x1="88" y1="111" x2="132" y2="111" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
                  <line x1="88" y1="124" x2="110" y2="124" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />

                  {/* Red Cross Badge Circle */}
                  <circle cx="128" cy="128" r="22" fill="#EF4444" />
                  {/* White Cross Icon */}
                  <path d="M121 121L135 135M135 121L121 135" stroke="white" strokeWidth="3.5" strokeLinecap="round" />

                  {/* Magnifying Glass */}
                  <circle cx="152" cy="92" r="16" stroke="#94A3B8" strokeWidth="3.5" fill="none" />
                  <line x1="163" y1="103" x2="182" y2="122" stroke="#94A3B8" strokeWidth="4.5" strokeLinecap="round" />
                </svg>
              </div>

              <h3 className={styles.emptyTitle}>No assignments yet</h3>
              <p className={styles.emptySubtext}>
                Create your first assignment to start collecting and grading student submissions. You can set up rubrics, define marking criteria, and let AI assist with grading.
              </p>

              {/* Main Action Pill button */}
              <button 
                className={styles.blackPillBtn}
                onClick={handleCreateAssignment}
              >
                <Plus size={16} />
                <span>Create Your First Assignment</span>
              </button>
            </div>
          ) : (
            /* RENDER FIGMA FILLED STATE (ASSIGNMENTS GRID) */
            <div style={{ display: 'flex', flexDirection: 'column', animation: 'slideIn 0.4s ease-out' }}>
              
              {/* Classroom Assignments Title header */}
              <div className={styles.filledHeader}>
                <div className={styles.filledHeaderTitleRow}>
                  <div className={styles.greenDot}></div>
                  <h2 className={styles.filledHeaderTitle}>Assignments</h2>
                </div>
                <p className={styles.filledHeaderSub}>
                  Manage and create assignments for your classes.
                </p>
              </div>

              {/* Dynamic Filter Search action bar */}
              <div className={styles.filterSearchBar}>
                <button className={styles.filterBtn}>
                  <SlidersHorizontal size={14} />
                  <span>Filter By</span>
                </button>

                <div className={styles.searchContainer}>
                  <Search size={14} className={styles.searchIcon} />
                  <input 
                    type="text" 
                    placeholder="Search Assignment..." 
                    className={styles.searchField}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Responsive Cards Grid */}
              <div className={styles.cardGrid}>
                {filteredList.length === 0 ? (
                  <div style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '48px',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.92rem'
                  }}>
                    No assignments match your search term.
                  </div>
                ) : (
                  filteredList.map((assignment) => (
                    <div 
                      key={assignment._id}
                      className={styles.gridCard}
                      onClick={() => handleSelectCard(assignment)}
                    >
                      {/* Card Title & Three-dots Ellipsis context menu */}
                      <div className={styles.cardTopRow}>
                        <h4 className={styles.cardTitle}>{assignment.title}</h4>
                        
                        <button 
                          className={styles.cardMenuBtn}
                          onClick={(e) => toggleMenu(assignment._id, e)}
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* Dropdown menu drawer (Absolute positioned overlay) */}
                        {activeMenuId === assignment._id && (
                          <div className={styles.contextMenu}>
                            <button 
                              className={styles.contextMenuItem}
                              onClick={() => handleSelectCard(assignment)}
                            >
                              View Assignment
                            </button>
                            <button 
                              className={`${styles.contextMenuItem} ${styles.contextMenuItemDelete}`}
                              onClick={(e) => handleDeleteCard(assignment._id, e)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Dates Footer Metadata */}
                      <div className={styles.cardMetaFooter}>
                        <div>
                          <span>Assigned on : </span>
                          <span className={styles.cardMetaLabel}>
                            {new Date(assignment.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            }).replace(/\//g, '-')}
                          </span>
                        </div>
                        
                        <div>
                          <span>Due : </span>
                          <span className={styles.cardMetaLabel}>
                            {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            }).replace(/\//g, '-') : 'N/A'}
                          </span>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

              {/* Desktop Sticky Centered Bottom CTA */}
              <div className={styles.desktopBottomCtaWrapper}>
                <button 
                  className={styles.desktopBottomCta}
                  onClick={handleCreateAssignment}
                >
                  <Plus size={16} />
                  <span>Create Assignment</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </main>

      {/* 4. MOBILE FLOATING ACTION BUTTON (FAB) (VISIBLE ONLY ON MOBILE) */}
      <button 
        className={`${styles.mobileFab} no-print`}
        onClick={handleCreateAssignment}
        title="Create new assignment"
        style={{
          display: 'none', // Overridden to flex by media query in components.module.css
        }}
      >
        <Plus size={24} strokeWidth={2.8} />
      </button>

      {/* 5. MOBILE FLOATING BOTTOM CAPSULE NAV BAR (VISIBLE ONLY ON MOBILE) */}
      <div className={`${styles.bottomNavBar} no-print`} style={{ display: 'none' }}>
        <button 
          className={`${styles.bottomNavItem} ${activeTab === 'home' ? styles.bottomNavItemActive : ''}`}
          onClick={() => handleTabSelect('home')}
        >
          <LayoutGrid size={20} />
          <span>Home</span>
        </button>

        <button 
          className={`${styles.bottomNavItem} ${activeTab === 'assignments' ? styles.bottomNavItemActive : ''}`}
          onClick={() => handleTabSelect('assignments')}
        >
          <FileText size={20} />
          <span>Assignments</span>
        </button>

        <button 
          className={`${styles.bottomNavItem} ${activeTab === 'library' ? styles.bottomNavItemActive : ''}`}
          onClick={() => handleTabSelect('library')}
        >
          <FolderHeart size={20} />
          <span>Library</span>
        </button>

        <button 
          className={`${styles.bottomNavItem} ${activeTab === 'toolkit' ? styles.bottomNavItemActive : ''}`}
          onClick={() => handleTabSelect('toolkit')}
        >
          <Wrench size={20} />
          <span>AI Toolkit</span>
        </button>
      </div>

    </div>
  );
}
