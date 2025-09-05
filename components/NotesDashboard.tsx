import React, { useState, useEffect, useCallback } from 'react';
import type { Session, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseService';
import type { Note } from '../types';
import Spinner from './Spinner';

interface NotesDashboardProps {
  session: Session;
}

const NotesDashboard: React.FC<NotesDashboardProps> = ({ session }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const fetchNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  }, [session.user.id]);

  useEffect(() => {
    fetchNotes();
    
    const channel: RealtimeChannel = supabase
      .channel(`public:notes:user_id=eq.${session.user.id}`)
      .on<Note>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          // This real-time logic will now work after enabling replication via SQL,
          // but the manual fetches below provide a robust fallback.
          if (payload.eventType === 'INSERT') {
            setNotes(currentNotes => [payload.new, ...currentNotes.filter(n => n.id !== payload.new.id)]);
          } else if (payload.eventType === 'UPDATE') {
            setNotes(currentNotes => currentNotes.map(note => note.id === payload.new.id ? payload.new : note));
          } else if (payload.eventType === 'DELETE') {
            setNotes(currentNotes => currentNotes.filter(note => note.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id, fetchNotes]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    const { error } = await supabase
      .from('notes')
      .insert({ title: newNoteTitle, content: newNoteContent, user_id: session.user.id });

    if (error) {
      setError(error.message);
    } else {
      setNewNoteTitle('');
      setNewNoteContent('');
      // Manually refetch notes to ensure UI is updated, even if real-time fails.
      await fetchNotes(); 
    }
  };
  
  const handleUpdateNote = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingNote || !editingNote.title.trim()) return;
      
      const { error } = await supabase
        .from('notes')
        .update({ title: editingNote.title, content: editingNote.content })
        .eq('id', editingNote.id);
        
      if (error) {
          setError(error.message);
      } else {
          setEditingNote(null);
          // Manually refetch notes to ensure UI is updated.
          await fetchNotes();
      }
  };

  const handleDeleteNote = async (id: number) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
        setError(error.message);
    } else {
        // Manually refetch notes to ensure UI is updated.
        await fetchNotes();
    }
  };

  const NoteForm = () => (
    <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-cyan-300">{editingNote ? "Edit Note" : "Create a New Note"}</h2>
        <form onSubmit={editingNote ? handleUpdateNote : handleAddNote} className="space-y-4">
            <input
                type="text"
                placeholder="Note Title"
                value={editingNote ? editingNote.title : newNoteTitle}
                onChange={(e) => editingNote ? setEditingNote({...editingNote, title: e.target.value}) : setNewNoteTitle(e.target.value)}
                className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                required
            />
            <textarea
                placeholder="Note Content (optional)"
                value={editingNote ? editingNote.content || '' : newNoteContent}
                onChange={(e) => editingNote ? setEditingNote({...editingNote, content: e.target.value}) : setNewNoteContent(e.target.value)}
                className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition h-24"
            />
            <div className="flex justify-end space-x-4">
                {editingNote && (
                    <button type="button" onClick={() => setEditingNote(null)} className="px-5 py-2 rounded-md bg-slate-600 hover:bg-slate-500 font-semibold transition-colors">
                        Cancel
                    </button>
                )}
                <button type="submit" className="px-5 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 font-semibold text-white transition-colors">
                    {editingNote ? "Save Changes" : "Add Note"}
                </button>
            </div>
        </form>
    </div>
  );

  if (loading) return <div className="flex justify-center mt-16"><Spinner size={12} /></div>;
  if (error) return <p className="text-center text-red-400 mt-8">Error: {error}</p>;

  return (
    <div>
        <NoteForm />
        
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {notes.map(note => (
                <div key={note.id} className="bg-slate-800 p-5 rounded-lg shadow-lg border border-slate-700 flex flex-col justify-between hover:border-cyan-500 transition-all duration-300">
                    <div>
                        <h3 className="text-xl font-bold text-slate-100 mb-2">{note.title}</h3>
                        <p className="text-slate-400 mb-4 whitespace-pre-wrap">{note.content}</p>
                    </div>
                    <div className="flex justify-between items-center mt-4 border-t border-slate-700 pt-4">
                       <p className="text-xs text-slate-500">
                           {new Date(note.created_at).toLocaleString()}
                       </p>
                        <div className="flex space-x-2">
                            <button onClick={() => setEditingNote(note)} className="p-2 text-slate-400 hover:text-yellow-400 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteNote(note.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
        {notes.length === 0 && !loading && (
            <div className="text-center py-16 px-6 bg-slate-800/50 border border-slate-700 rounded-lg">
                <h3 className="text-xl text-slate-300">No notes yet.</h3>
                <p className="text-slate-500 mt-2">Create your first note using the form above!</p>
            </div>
        )}
    </div>
  );
};

export default NotesDashboard;
