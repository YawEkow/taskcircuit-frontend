// src/App.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Ensure 'framer-motion' is installed (npm install framer-motion)
// Added GripVertical for drag handle
import { Plus, Loader2, Trash2, Calendar, Clock, Bell, BellOff, X, LayoutDashboard, ArrowLeft, Pencil, LogIn, UserPlus, ListChecks, GripVertical } from 'lucide-react'; // Ensure 'lucide-react' is installed (npm install lucide-react)
// Removed shadcn/ui imports - using standard elements + Tailwind
// Removed cn utility import
import axios from 'axios'; // Import axios for making API calls (Run: npm install axios)

// --- Constants ---
const APP_NAME = "TaskCircuit";
// Define the base URL for the backend API (Ensure matches backend port)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// --- Axios API Client Setup ---
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Function to set the authorization token for subsequent requests
const setAuthToken = (token) => {
    if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('taskCircuitToken', token);
        console.log("Token set in headers and localStorage");
    } else {
        delete apiClient.defaults.headers.common['Authorization'];
        localStorage.removeItem('taskCircuitToken');
        console.log("Token removed from headers and localStorage");
    }
};


// --- Types --- (Keep interfaces for reference, but they aren't enforced in JS)
/*
interface Task { ... }
interface Board { ... }
*/

// --- Helper Functions ---
const generateConfetti = (count, container) => {
    if (!container) return; if (getComputedStyle(container).position === 'static') { container.style.position = 'relative'; } container.style.overflow = 'hidden'; for (let i = 0; i < count; i++) { const confetti = document.createElement('div'); confetti.classList.add('confetti'); confetti.style.left = `${Math.random() * container.offsetWidth}px`; confetti.style.top = `${Math.random() * -50}px`; confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 60%)`; confetti.style.width = `${Math.random() * 5 + 5}px`; confetti.style.height = confetti.style.width; confetti.style.opacity = `${Math.random() * 0.5 + 0.5}`; confetti.style.transform = `rotate(${Math.random() * 360}deg)`; confetti.style.animationDuration = `${Math.random() * 3 + 2}s`; confetti.style.animationDelay = `${Math.random() * 0.5}s`; container.appendChild(confetti); confetti.addEventListener('animationend', () => confetti.remove()); }
};
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A'; try { const date = new Date(dateTimeString); return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }); } catch { return 'Invalid Date'; }
};

// --- Reusable Components ---

const KANBAN_STATUSES = ['todo', 'inprogress', 'done'];
const KANBAN_TITLES = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };

// Base styles for different button variants using Tailwind (Improved Hover Contrast)
const buttonStyles = {
    primary: "px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center transition-colors",
    secondary: "px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center transition-colors",
    outline: "px-3 py-1 border border-gray-300 dark:border-gray-500 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 transition-colors",
    ghost: "p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center transition-colors",
    destructiveGhost: "p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 disabled:opacity-50 flex items-center justify-center transition-colors",
    link: "font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50",
    icon: "p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center transition-colors",
};


const ReminderNotification = ({ message, onClose }) => {
    useEffect(() => { const timer = setTimeout(onClose, 5000); return () => clearTimeout(timer); }, [onClose]);
    if (!motion) return null;
    return ( <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed top-4 right-4 z-[100] bg-yellow-400 text-yellow-900 p-3 rounded-md shadow-lg flex items-center gap-2 border border-yellow-500"> <Bell className="w-5 h-5" /> <span className="text-sm font-medium">{message}</span> <button onClick={onClose} className={`${buttonStyles.ghost} text-yellow-900 hover:bg-yellow-500/50`}><X className="w-4 h-4" /></button> </motion.div> );
};

// Updated TaskCard with improved custom progress bar logic
const TaskCard = ({ task, onDelete, onUpdate, onDragStart, onDragEnd, isDragging }) => {
    const handleMove = (newStatus) => {
        let progressUpdate = {};
        if (newStatus === 'done') progressUpdate = { progress: 100 };
        else if (newStatus === 'todo') progressUpdate = { progress: 0 };
        else if (newStatus === 'inprogress') progressUpdate = { progress: 25 };
        onUpdate(task.id, { status: newStatus, ...progressUpdate });
    };
    const isProgressEditable = task.status === 'inprogress';

    // --- Custom Progress Bar Logic (Refined) ---
    const progressBarRef = useRef(null);
    const [isDraggingProgress, setIsDraggingProgress] = useState(false);
    const [visualProgress, setVisualProgress] = useState(task.progress);
    const latestProgressRef = useRef(task.progress);

    useEffect(() => {
        if (!isDraggingProgress) setVisualProgress(task.progress);
        latestProgressRef.current = task.progress;
    }, [task.progress, isDraggingProgress]);

    const calculateAndUpdateVisualProgress = useCallback((event) => {
        if (!progressBarRef.current) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const x = clientX - rect.left;
        const width = rect.width;
        let newProgress = Math.round((x / width) * 100);
        newProgress = Math.max(0, Math.min(100, newProgress));
        setVisualProgress(newProgress);
        latestProgressRef.current = newProgress;
    }, []);

    const handlePointerMove = useCallback((event) => {
        if (!isProgressEditable) return;
        event.preventDefault();
        calculateAndUpdateVisualProgress(event);
    }, [isProgressEditable, calculateAndUpdateVisualProgress]);

    const handlePointerUp = useCallback((event) => {
        if (event.target.hasPointerCapture?.(event.pointerId)) {
            event.target.releasePointerCapture(event.pointerId);
        }
        setIsDraggingProgress(false);
        if (latestProgressRef.current !== task.progress) {
             onUpdate(task.id, { progress: latestProgressRef.current });
        }
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
    }, [task.id, task.progress, onUpdate, handlePointerMove]);

    const handlePointerDown = (event) => {
        if (!isProgressEditable) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDraggingProgress(true);
        calculateAndUpdateVisualProgress(event);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    useEffect(() => {
        const boundHandlePointerMove = handlePointerMove;
        const boundHandlePointerUp = handlePointerUp;
        return () => {
            window.removeEventListener('pointermove', boundHandlePointerMove);
            window.removeEventListener('pointerup', boundHandlePointerUp);
        };
    }, [handlePointerMove, handlePointerUp]);
    // --- End Custom Progress Bar Logic ---


    if (!motion) return <div className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 ${isDragging ? 'opacity-60' : ''}`}>Loading...</div>;

    return (
         <div className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-xl hover:border-blue-500/80 ${isDragging ? 'opacity-60 scale-95 shadow-md' : ''}`}>
             <div className="flex justify-between items-start mb-2 gap-2">
                 {/* Drag Handle */}
                 <div
                    draggable={true}
                    onDragStart={(e) => onDragStart(e, task.id)}
                    onDragEnd={onDragEnd}
                    className="cursor-grab text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 -ml-1 pt-1"
                    title="Drag to move task"
                 >
                    <GripVertical className="h-5 w-5" />
                 </div>
                <h3 className="text-md font-semibold text-gray-900 dark:text-white leading-tight flex-1 ml-1">{task.title}</h3>
                 {task.reminderDateTime && (<div className="flex-shrink-0" title={`Reminder: ${formatDateTime(task.reminderDateTime)}`}><Bell className="w-4 h-4 text-yellow-500" /></div>)}
                <button onClick={() => onDelete(task.id)} className={`${buttonStyles.destructiveGhost} w-6 h-6`} title="Delete Task"> <Trash2 className="h-4 w-4" /> </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{task.description || 'No description.'}</p>

            {/* --- Custom Progress Bar --- */}
            <div className="mb-3">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                    Progress: {task.progress}% {/* Label shows saved progress */}
                </label>
                {/* Track */}
                <div
                    ref={progressBarRef}
                    onPointerDown={handlePointerDown}
                    style={{ touchAction: 'none' }}
                    className={`w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full relative ${isProgressEditable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                    title={isProgressEditable ? 'Click or drag to set progress' : 'Progress fixed for this status'}
                >
                    {/* Fill */}
                    <div
                        className="h-full rounded-full bg-blue-600 dark:bg-blue-500 absolute left-0 top-0 transition-width duration-75 pointer-events-none"
                        style={{ width: `${visualProgress}%` }}
                    />
                </div>
            </div>
            {/* --- End Custom Progress Bar --- */}

            <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2 mt-3">
                {task.startDate && (<div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-blue-500" /><span>Start: {formatDateTime(task.startDate)}</span></div>)}
                {task.estimatedFinishDate && (<div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-green-500" /><span>Est. Finish: {formatDateTime(task.estimatedFinishDate)}</span></div>)}
                 {(!task.startDate && !task.estimatedFinishDate) && (<div className="flex items-center gap-1.5 italic"><span>No dates specified</span></div>)}
            </div>
            <div className="flex justify-end gap-2 mt-3">
                {task.status !== 'todo' && (<button className={buttonStyles.outline} onClick={() => handleMove(KANBAN_STATUSES[KANBAN_STATUSES.indexOf(task.status) - 1])}>← Back</button>)}
                {task.status !== 'done' && (<button className={buttonStyles.outline} onClick={() => handleMove(KANBAN_STATUSES[KANBAN_STATUSES.indexOf(task.status) + 1])}>Next →</button>)}
            </div>
        </div>
    );
};

const AddTaskModal = ({ isOpen, onClose, onAdd }) => {
    const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [startDate, setStartDate] = useState(''); const [estimatedFinishDate, setEstimatedFinishDate] = useState(''); const [reminderDateTime, setReminderDateTime] = useState(''); const [isLoading, setIsLoading] = useState(false); const resetForm = () => { setTitle(''); setDescription(''); setStartDate(''); setEstimatedFinishDate(''); setReminderDateTime(''); };
    const handleAdd = async () => { if (!title.trim()) return; setIsLoading(true); try { await onAdd({ title, description, startDate: startDate || undefined, estimatedFinishDate: estimatedFinishDate || undefined, reminderDateTime: reminderDateTime || undefined, progress: 0 }); resetForm(); onClose(); } catch (error) { console.error("Failed to add task:", error); /* Add user feedback here */ } finally { setIsLoading(false); } };
    const handleClose = () => { resetForm(); onClose(); };
    if (!motion || !AnimatePresence) return null;
    return (
        <AnimatePresence> {isOpen && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"> <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">Add New Task</h2>
            <div className="space-y-4">
                <div><label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title <span className="text-red-500">*</span></label><input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter task title" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" /></div>
                <div><label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label><textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a short description (optional)" rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" /></div>
                <div><label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date & Time</label><input id="startDate" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:text-gray-400" /></div>
                <div><label htmlFor="estimatedFinishDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Finish Date & Time</label><input id="estimatedFinishDate" type="datetime-local" value={estimatedFinishDate} onChange={(e) => setEstimatedFinishDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:text-gray-400" /></div>
                <div><label htmlFor="reminderDateTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reminder Date & Time</label><input id="reminderDateTime" type="datetime-local" value={reminderDateTime} onChange={(e) => setReminderDateTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:text-gray-400" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
                <button onClick={handleClose} disabled={isLoading} className={buttonStyles.secondary}>Cancel</button>
                <button onClick={handleAdd} disabled={!title.trim() || isLoading} className={buttonStyles.primary}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : <><Plus className="mr-2 h-4 w-4" /> Add Task</>}
                </button>
            </div>
        </motion.div> </motion.div> )} </AnimatePresence>
    );
};

const KanbanBoardView = ({ board, onNavigateBack }) => {
    const [tasks, setTasks] = useState([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [taskError, setTaskError] = useState(null);
    const containerRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [draggingOverColumn, setDraggingOverColumn] = useState(null);
    const [activeReminder, setActiveReminder] = useState(null);

    const fetchTasks = useCallback(async () => {
        if (!board?.id) return;
        console.log(`Fetching tasks for board ${board.id}`);
        setIsLoadingTasks(true);
        setTaskError(null);
        try {
            const response = await apiClient.get(`/boards/${board.id}/tasks`);
            setTasks(response.data);
            console.log("Tasks fetched:", response.data);
        } catch (err) {
            console.error("Error fetching tasks:", err.response?.data || err.message);
            setTaskError(err.response?.data?.message || "Failed to load tasks.");
        } finally {
            setIsLoadingTasks(false);
        }
    }, [board?.id]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleApiAddTask = async (newTaskData) => {
         if (!board?.id) return;
         console.log("Adding task:", newTaskData);
         try {
             await apiClient.post(`/boards/${board.id}/tasks`, newTaskData);
             fetchTasks();
         } catch (err) {
             console.error("Add task failed:", err.response?.data || err.message);
             setTaskError(err.response?.data?.message || "Failed to add task.");
         }
    };

    // Updated handler to apply progress rules and refine optimistic updates
     const handleApiUpdateTask = async (taskId, updates) => {
         if (!board?.id) return;

         const finalUpdates = { ...updates };
         const isStatusChange = finalUpdates.status !== undefined;

         if (isStatusChange) {
             if (finalUpdates.status === 'done') finalUpdates.progress = 100;
             else if (finalUpdates.status === 'todo') finalUpdates.progress = 0;
             else if (finalUpdates.status === 'inprogress') {
                 if (finalUpdates.progress === undefined) finalUpdates.progress = 25;
             }
         }
         else if (finalUpdates.progress !== undefined) {
             finalUpdates.progress = Math.max(0, Math.min(100, finalUpdates.progress));
         }

         console.log(`Updating task ${taskId}:`, finalUpdates);

         try {
             // Apply optimistic update locally before API call
             let taskUpdatedLocally = false;
             setTasks(currentTasks => currentTasks.map(t => {
                 if (t.id === taskId) {
                     taskUpdatedLocally = true;
                     // Ensure progress rule is applied visually immediately if status changes
                     let optimisticProgress = t.progress;
                     if (isStatusChange) {
                         if (finalUpdates.status === 'done') optimisticProgress = 100;
                         else if (finalUpdates.status === 'todo') optimisticProgress = 0;
                         else if (finalUpdates.status === 'inprogress') optimisticProgress = finalUpdates.progress ?? 25;
                     } else if (finalUpdates.progress !== undefined) {
                         optimisticProgress = finalUpdates.progress;
                     }
                     return { ...t, ...finalUpdates, progress: optimisticProgress };
                 }
                 return t;
             }));

             if (!taskUpdatedLocally && isStatusChange) {
                console.warn("Optimistic update skipped: Task ID not found for status change.");
             }

             await apiClient.put(`/tasks/${taskId}`, finalUpdates);

             if (finalUpdates.status === 'done' && containerRef.current) {
                 console.log("Triggering confetti!");
                 generateConfetti(60, containerRef.current);
             }
             // No refetch needed if optimistic update is sufficient

         } catch (err) {
             console.error("Update task failed:", err.response?.data || err.message);
             setTaskError(err.response?.data?.message || "Failed to update task.");
             fetchTasks(); // Rollback on error by refetching all tasks
         }
     };

      const handleApiDeleteTask = async (taskId) => {
         if (!board?.id) return;
         console.log(`Deleting task ${taskId}`);
         if (window.confirm("Are you sure you want to delete this task?")) {
             try {
                 // Optimistic delete
                 setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId));
                 await apiClient.delete(`/tasks/${taskId}`);
             } catch (err) {
                 console.error("Delete task failed:", err.response?.data || err.message);
                 setTaskError(err.response?.data?.message || "Failed to delete task.");
                 fetchTasks(); // Rollback on error
             }
         }
     };
    // Drag handlers now attached to TaskCard's handle via props
    const handleDragStart = (e, id) => {
        e.dataTransfer.setData('text/plain', id);
     };
    const handleDragEnd = () => {
        setDraggingOverColumn(null);
     };

    const handleDragOver = (e, status) => { e.preventDefault(); setDraggingOverColumn(status); };
    const handleDragLeave = () => { setDraggingOverColumn(null); };
    const handleDrop = (e, targetStatus) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        handleApiUpdateTask(id, { status: targetStatus });
        setDraggingOverColumn(null);
    };

    if (!motion || !AnimatePresence) return <div>Loading animations...</div>;

    return (
        // Added `relative` class here for confetti positioning context
        <div ref={containerRef} className="p-4 md:p-8 relative min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950">
            <div className="flex justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-3">
                     {/* Apply icon style */}
                     <button onClick={onNavigateBack} title="Back to Dashboard" className={buttonStyles.icon}>
                        <ArrowLeft className="h-5 w-5" />
                     </button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{board?.name ?? 'Loading Board...'}</h1>
                </div>
                 {/* Apply primary style */}
                <button onClick={() => setIsModalOpen(true)} className={`${buttonStyles.primary} text-base`}> <Plus className="mr-2 h-5 w-5" /> Add New Task </button>
            </div>
             {isLoadingTasks && <div className="text-center py-6"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div>}
             {taskError && <p className="text-red-500 text-center mb-4">{taskError}</p>}
            {!isLoadingTasks && !taskError && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {KANBAN_STATUSES.map((status) => (
                        <div key={status} className={`rounded-lg p-4 bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 transition-colors duration-300 min-h-[200px] ${draggingOverColumn === status ? 'bg-blue-100/50 dark:bg-blue-900/30 border-blue-500/50' : ''}`}
                            onDragOver={(e) => handleDragOver(e, status)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, status)}>
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 capitalize"> {KANBAN_TITLES[status]} ({tasks.filter(t => t.status === status).length}) </h2>
                            <div className="space-y-4">
                                {/* Removed AnimatePresence and motion props from wrapper div */}
                                {tasks.filter((task) => task.status === status).map((task) => (
                                    // Simple div wrapper, key is essential
                                    <div key={task.id}>
                                        {/* Pass drag handlers down to TaskCard */}
                                        <TaskCard
                                            task={task}
                                            onDelete={handleApiDeleteTask}
                                            onUpdate={handleApiUpdateTask}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                        />
                                    </div>
                                ))}
                                {tasks.filter((task) => task.status === status).length === 0 && (<div className="text-center text-gray-500 dark:text-gray-400 py-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">No tasks yet!</div>)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
             <AddTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={handleApiAddTask} />
             {/* Ensure AnimatePresence wraps ReminderNotification if used */}
             <AnimatePresence>{activeReminder && (<ReminderNotification key={activeReminder.id} message={activeReminder.message} onClose={() => setActiveReminder(null)} />)}</AnimatePresence>
        </div>
    );
};

// Page for Auth (Login/Signup) - Updated to display password requirements
const AuthPage = ({ onAuthSuccess, initialError = '' }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(initialError);

    useEffect(() => {
        setError(initialError);
    }, [initialError]);

    const handleSwitchMode = () => {
        setIsLogin(!isLogin);
        setError(''); // Clear errors when switching modes
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        if (!isLogin && password !== confirmPassword) {
             setError("Passwords do not match.");
             return;
        }
        setIsLoading(true);
        try {
            let response;
            const endpoint = isLogin ? '/auth/login' : '/auth/signup';
            response = await apiClient.post(endpoint, { email, password });

            if (isLogin) {
                onAuthSuccess(response.data.token);
            } else {
                 alert("Signup successful! Please log in.");
                 setIsLogin(true); // Switch to login view after successful signup
                 setEmail('');
                 setPassword('');
                 setConfirmPassword('');
            }
        } catch (err) {
            console.error("Auth Error:", err.response?.data || err.message);
            setError(err.response?.data?.message || `An error occurred during ${isLogin ? 'login' : 'signup'}.`);
        }
        finally { setIsLoading(false); }
    };

    const handleGoogleAuth = () => {
         window.location.href = `${API_BASE_URL}/auth/google`;
     };

    if (!motion) return <div>Loading animation...</div>;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-white to-sky-100 dark:from-indigo-950 dark:via-gray-900 dark:to-sky-950 p-4">
            <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, type: 'spring' }} className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
                 <div className="text-center mb-8"> <ListChecks className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-500 mb-4" /> <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{APP_NAME}</h1>
                 <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed"> Welcome! Manage projects effortlessly with user-friendly boards. </p>
                 </div>
                 <h2 className="text-2xl font-semibold text-center mb-6 text-gray-800 dark:text-gray-200">{isLogin ? 'Login' : 'Sign Up'}</h2>
                 {error && <p className="text-sm text-red-500 text-center mb-4">{error}</p>}
                 <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required disabled={isLoading} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                     </div>
                     <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required disabled={isLoading} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                     </div>
                     {!isLogin && (
                        <>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                                <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required disabled={isLoading} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                            </div>
                            {/* Password Requirements Hint */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Password must contain: Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number.
                            </p>
                        </>
                     )}
                     <button type="submit" disabled={isLoading} className={`${buttonStyles.primary} w-full text-base pt-3`}> {/* Added pt-3 for spacing */}
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isLogin ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />)} {isLogin ? 'Login' : 'Sign Up'}
                     </button>
                 </form>
                 <div className="relative my-6"> <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-300 dark:border-gray-600"></span></div> <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">Or continue with</span></div> </div>
                 <button onClick={handleGoogleAuth} disabled={isLoading} className={`${buttonStyles.secondary} w-full text-base`}> <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 261.8 0 120.8 109.8 11.8 244 11.8c72.4 0 134.8 29.2 180.8 75.4l-72.8 69.8C322.4 124.8 286.8 106 244 106c-76.8 0-139.6 62.8-139.6 139.8s62.8 139.8 139.6 139.8c84.8 0 115.6-61.2 119.6-91.8H244v-83.8h236.1c2.8 14.8 4.4 30.4 4.4 46.8z"></path></svg> {isLogin ? 'Login with Google' : 'Sign Up with Google'} </button>
                 <div className="mt-6 text-center text-sm"> <span className="text-gray-600 dark:text-gray-400">{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
                 <button onClick={handleSwitchMode} className={`${buttonStyles.link} pl-1`}> {isLogin ? 'Sign Up' : 'Login'} </button> </div>
            </motion.div>
        </div>
    );
};


const DashboardPage = ({ onBoardSelect, onLogout }) => {
    const [boards, setBoards] = useState([]);
    const [isLoadingBoards, setIsLoadingBoards] = useState(true);
    const [boardError, setBoardError] = useState(null);
    const [newBoardName, setNewBoardName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingBoardId, setEditingBoardId] = useState(null);
    const [editBoardName, setEditBoardName] = useState('');

    const fetchBoards = useCallback(async () => {
        console.log("Fetching boards..."); setIsLoadingBoards(true); setBoardError(null);
        try {
            const response = await apiClient.get('/boards'); setBoards(response.data); console.log("Boards fetched:", response.data);
        } catch (err) { console.error("Error fetching boards:", err.response?.data || err.message); setBoardError(err.response?.data?.message || "Failed to load boards."); }
        finally { setIsLoadingBoards(false); }
    }, []);

    useEffect(() => { fetchBoards(); }, [fetchBoards]);

    const handleCreate = async () => {
        if (!newBoardName.trim()) return; setIsCreating(true); setBoardError(null);
        try { await apiClient.post('/boards', { name: newBoardName.trim() }); setNewBoardName(''); await fetchBoards(); }
        catch (err) { console.error("Create board error (Dashboard):", err); setBoardError(err.response?.data?.message || "Failed to create board."); }
        finally { setIsCreating(false); }
    };
    const startEditing = (board) => { setEditingBoardId(board.id); setEditBoardName(board.name); };
    const cancelEditing = () => { setEditingBoardId(null); setEditBoardName(''); };
    const handleSaveEdit = async (boardId) => {
        if (!editBoardName.trim()) return;
        try { await apiClient.put(`/boards/${boardId}`, { name: editBoardName.trim() }); cancelEditing(); await fetchBoards(); }
        catch (err) { console.error("Edit board error (Dashboard):", err); setBoardError(err.response?.data?.message || "Failed to update board."); }
    };
    const handleDelete = async (boardId, boardName) => {
        if (window.confirm(`Delete "${boardName}"? This cannot be undone.`)) {
             try { await apiClient.delete(`/boards/${boardId}`); await fetchBoards(); }
             catch (err) { console.error("Delete board error (Dashboard):", err); setBoardError(err.response?.data?.message || "Failed to delete board."); }
        }
    };

     if (!motion) return <div>Loading animations...</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-900 dark:to-blue-950 p-4 sm:p-8">
             <div className="max-w-4xl mx-auto">
                 <div className="flex justify-between items-center mb-8"> <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2"> <LayoutDashboard className="w-8 h-8 text-blue-600 dark:text-blue-500" /> Dashboard </h1>
                  {/* Apply secondary style */}
                 <button onClick={onLogout} className={buttonStyles.secondary}>Logout</button> </div>
                 <div className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"> <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create a New Board</h2> <div className="flex flex-col sm:flex-row gap-3">
                  {/* Using input base styles */}
                 <input value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} placeholder="Enter new board name..." disabled={isCreating} className="flex-grow w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                  {/* Apply primary style */}
                 <button onClick={handleCreate} disabled={!newBoardName.trim() || isCreating} className={`${buttonStyles.primary} sm:w-auto`}> {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Create Board </button> </div> </div>
                 <div>
                     <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-5">Your Boards</h2>
                     {boardError && <p className="text-red-500 text-center mb-4">{boardError}</p>}
                     {isLoadingBoards ? (<div className="text-center py-6"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-500" /></div>)
                      : boards.length === 0 ? (<p className="text-center text-gray-500 dark:text-gray-400 py-6">You haven't created any boards yet.</p>)
                      : (<div className="space-y-4"> {boards.map((board) => ( <motion.div key={board.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3"> {editingBoardId === board.id ? ( <> <input value={editBoardName} onChange={(e) => setEditBoardName(e.target.value)} className="flex-grow w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(board.id); if (e.key === 'Escape') cancelEditing(); }} /> <div className="flex gap-2 flex-shrink-0 mt-2 sm:mt-0">
                       {/* Apply primary style */}
                      <button onClick={() => handleSaveEdit(board.id)} className={`${buttonStyles.primary} text-sm px-3 py-1`}>Save</button>
                       {/* Apply secondary style */}
                      <button onClick={cancelEditing} className={`${buttonStyles.secondary} text-sm px-3 py-1`}>Cancel</button> </div> </> ) : ( <> <span className="text-lg font-medium text-gray-900 dark:text-white flex-grow truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" onClick={() => onBoardSelect(board.id)} title="View Board">{board.name}</span> <div className="flex gap-1 sm:gap-2 flex-shrink-0 mt-2 sm:mt-0">
                       {/* Apply secondary style */}
                      <button onClick={() => onBoardSelect(board.id)} className={`${buttonStyles.secondary} text-sm px-3 py-1`}>View</button>
                       {/* Apply icon style */}
                      <button onClick={() => startEditing(board)} title="Edit Board Name" className={`${buttonStyles.icon} w-7 h-7`}> <Pencil className="w-4 h-4" /> </button>
                       {/* Apply destructiveGhost style */}
                      <button onClick={() => handleDelete(board.id, board.name)} title="Delete Board" className={`${buttonStyles.destructiveGhost} w-7 h-7`}> <Trash2 className="w-4 h-4" /> </button> </div> </> )} </motion.div> ))} </div>)}
                 </div>
            </div>
        </div>
    );
};

// --- Main Application Component ---
const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('auth'); // 'auth', 'dashboard', 'board'
    const [currentBoardId, setCurrentBoardId] = useState(null);
    const [authCallbackError, setAuthCallbackError] = useState('');

    useEffect(() => {
        const handleAuthCallback = () => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');
            const error = params.get('error');

            // Clean the URL immediately
            window.history.replaceState({}, document.title, "/");

            if (token) {
                console.log("Auth callback successful, token received.");
                handleAuthSuccess(token);
                // Let state update trigger navigation
            } else if (error) {
                console.error("Auth callback error:", error);
                setAuthCallbackError("Google authentication failed. Please try again.");
                setIsAuthenticated(false);
                setCurrentPage('auth');
            }
             setAuthLoading(false);
        }

        if (window.location.pathname === '/auth/callback') {
            console.log("Handling auth callback...");
            handleAuthCallback();
        } else {
             console.log("Checking for existing token on initial load...");
             const existingToken = localStorage.getItem('taskCircuitToken');
             if (existingToken) {
                 console.log("Token found, setting auth state and header.");
                 setAuthToken(existingToken);
                 setIsAuthenticated(true);
                 setCurrentPage('dashboard');
             } else {
                 console.log("No token found.");
                 setIsAuthenticated(false);
                 setCurrentPage('auth');
             }
              setAuthLoading(false);
        }

    }, []);

    const handleAuthSuccess = (token) => {
        console.log("Handling Auth Success");
        setAuthToken(token);
        setIsAuthenticated(true);
        setCurrentPage('dashboard'); // Explicitly navigate on success
        setCurrentBoardId(null);
        setAuthCallbackError('');
    };
    const handleLogout = () => {
        console.log("Handling Logout");
        setAuthToken(null);
        setIsAuthenticated(false);
        setCurrentPage('auth');
        setCurrentBoardId(null);
        setAuthCallbackError('');
    };
    const navigateToBoard = (boardId) => { setCurrentBoardId(boardId); setCurrentPage('board'); };
    const navigateToDashboard = () => { setCurrentBoardId(null); setCurrentPage('dashboard'); };

    if (authLoading) { return (<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>); }

    let pageComponent;
     if (!isAuthenticated) {
        // Pass error state down to AuthPage
        pageComponent = <AuthPage key="auth" onAuthSuccess={handleAuthSuccess} initialError={authCallbackError} />;
    } else {
        // User is authenticated
        switch (currentPage) {
            case 'dashboard':
                pageComponent = <DashboardPage key="dashboard" onBoardSelect={navigateToBoard} onLogout={handleLogout} />;
                break;
            case 'board':
                if (currentBoardId) {
                     const boardData = { id: currentBoardId, name: "Board" };
                     pageComponent = <KanbanBoardView key="boardview" board={boardData} onNavigateBack={navigateToDashboard} />;
                } else {
                     console.warn("In 'board' state but no currentBoardId found. Redirecting to dashboard.");
                     pageComponent = <DashboardPage key="no-board-redirect" onBoardSelect={navigateToBoard} onLogout={handleLogout} />;
                }
                break;
            default:
                console.warn(`Invalid page state "${currentPage}" while authenticated. Defaulting to dashboard.`);
                 pageComponent = <DashboardPage key="default-dashboard" onBoardSelect={navigateToBoard} onLogout={handleLogout} />;
        }
    }

    if (!AnimatePresence) {
         console.warn("AnimatePresence not ready for render.");
         return pageComponent || <div>Loading...</div>;
    }

    return (
        <div className="app-container">
             <AnimatePresence mode="wait"> {pageComponent} </AnimatePresence>
        </div>
    );
};

export default App;
