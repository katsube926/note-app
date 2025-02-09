import { useState, useEffect, useRef } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, doc, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';

function App() {
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      // ノートの読み込み
      const notesQuery = query(collection(db, 'notes'), where('userId', '==', userId));
      const notesSnapshot = await getDocs(notesQuery);
      const loadedNotes = notesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotes(loadedNotes);

      // フォルダの読み込み
      const foldersQuery = query(collection(db, 'folders'), where('userId', '==', userId));
      const foldersSnapshot = await getDocs(foldersQuery);
      const loadedFolders = foldersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFolders(loadedFolders);

      // 全フォルダを展開状態に
      const initialExpandedState = {};
      loadedFolders.forEach(folder => {
        initialExpandedState[folder.id] = true;
      });
      setExpandedFolders(initialExpandedState);

      if (loadedNotes.length > 0) {
        setActiveNoteId(loadedNotes[0].id);
      }
    };
    loadData();
  }, [userId]);

  // メモのリアルタイム同期を修正
  useEffect(() => {
    if (!userId) return;

    const notesRef = collection(db, 'notes');
    const q = query(
      notesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedNotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotes(loadedNotes);

      // 最初のノートをアクティブにする（必要な場合）
      if (!activeNoteId && loadedNotes.length > 0) {
        setActiveNoteId(loadedNotes[0].id);
      }
    }, (error) => {
      console.error('Error loading notes:', error);
      alert('メモの読み込みに失敗しました。');
    });

    return () => unsubscribe();
  }, [userId, activeNoteId]);

  const createNewFolder = async () => {
    const newFolder = {
      userId,
      name: '新規フォルダ',
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, 'folders'), newFolder);
    const folderWithId = { ...newFolder, id: docRef.id };
    setFolders([...folders, folderWithId]);
    setExpandedFolders(prev => ({ ...prev, [docRef.id]: true }));
    setEditingFolderId(docRef.id);
  };

  const updateFolder = async (id, updates) => {
    await updateDoc(doc(db, 'folders', id), updates);
    setFolders(folders.map(folder =>
      folder.id === id ? { ...folder, ...updates } : folder
    ));
  };

  const deleteFolder = async (folderId) => {
    if (window.confirm('このフォルダを削除してもよろしいですか？\n※フォルダ内のメモは削除されません')) {
      await deleteDoc(doc(db, 'folders', folderId));
      setFolders(folders.filter(folder => folder.id !== folderId));
      // フォルダ内のノートのfolderId を null に更新
      const folderNotes = notes.filter(note => note.folderId === folderId);
      for (const note of folderNotes) {
        await updateNote(note.id, { folderId: null });
      }
    }
  };

  const createNewNote = async (folderId = null) => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const newNote = {
        userId,
        title: '新規メモ',
        content: '',
        folderId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'notes'), newNote);
      setActiveNoteId(docRef.id);
    } catch (error) {
      console.error('Error creating note:', error);
      alert('メモの作成に失敗しました。');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const deleteNote = async (id) => {
    if (window.confirm('このメモを削除してもよろしいですか？')) {
      await deleteDoc(doc(db, 'notes', id));
      setNotes(notes.filter(note => note.id !== id));
      if (activeNoteId === id) {
        setActiveNoteId(notes[0]?.id);
      }
    }
  };

  const updateNote = async (id, updates) => {
    await updateDoc(doc(db, 'notes', id), updates);
    setNotes(notes.map(note =>
      note.id === id ? { ...note, ...updates } : note
    ));
  };

  const updateNoteTitle = (id, newTitle) => {
    if (newTitle.trim() === '') return;
    updateNote(id, { title: newTitle });
    setEditingTitleId(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('ログアウトに失敗しました:', error);
    }
  };

  // デバッグ用：isCreating の状態変化を監視
  useEffect(() => {
    console.log('isCreating changed:', isCreating);
  }, [isCreating]);

  // メモの内容を保存
  const saveNoteContent = async (noteId, content) => {
    if (!userId) return;

    try {
      const noteRef = doc(db, `users/${userId}/notes/${noteId}`);
      await updateDoc(noteRef, {
        content: content,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving note:', error);
      alert('メモの保存に失敗しました。');
    }
  };

  // メモエディタコンポーネント
  const NoteEditor = ({ note }) => {
    const [content, setContent] = useState(note?.content || '');
    const saveTimeoutRef = useRef(null);

    useEffect(() => {
      setContent(note?.content || '');
      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }, [note]);

    const handleContentChange = (newContent) => {
      setContent(newContent);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (note?.id) {
          saveNoteContent(note.id, newContent);
        }
      }, 1000);
    };

    if (!note) {
      return <div className="flex-1 p-4">メモを選択してください</div>;
    }

    return (
      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        className="w-full h-full bg-vscode-bg text-vscode-text p-2 resize-none focus:outline-none"
        placeholder="ここにメモを入力..."
      />
    );
  };

  return (
    <div className="flex h-screen bg-vscode-bg text-vscode-text">
      <div className="w-[250px] bg-vscode-sidebar border-r border-vscode-border">
        <div className="flex justify-between items-center p-2.5 text-sm font-bold bg-vscode-header">
          メモ一覧
          <div className="flex gap-2">
            <button 
              className="bg-[#404040] hover:bg-[#4a4a4a] text-vscode-text px-2 py-1 rounded text-xs cursor-pointer"
              onClick={createNewFolder}
              disabled={isCreating}
            >
              + フォルダ
            </button>
            <button 
              className={`bg-[#404040] hover:bg-[#4a4a4a] text-vscode-text px-2 py-1 rounded text-xs cursor-pointer ${
                isCreating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => createNewNote()}
              disabled={isCreating}
            >
              {isCreating ? '作成中...' : '+ 新規ファイル'}
            </button>
            <button 
              className="absolute top-2.5 right-2.5 bg-[#404040] hover:bg-[#4a4a4a] text-vscode-text px-2 py-1 rounded text-xs cursor-pointer"
              onClick={handleLogout}
            >
              ログアウト
            </button>
          </div>
        </div>
        <div className="py-2.5">
          {/* フォルダなしのノート */}
          <div className="px-2.5 mb-2">
            {notes.filter(note => !note.folderId).map(note => (
              <NoteItem 
                key={note.id}
                note={note}
                activeNoteId={activeNoteId}
                editingTitleId={editingTitleId}
                setActiveNoteId={setActiveNoteId}
                setEditingTitleId={setEditingTitleId}
                updateNote={updateNote}
                updateNoteTitle={updateNoteTitle}
                deleteNote={deleteNote}
              />
            ))}
          </div>
          
          {/* フォルダとフォルダ内のノート */}
          {folders.map(folder => (
            <div key={folder.id} className="mb-1">
              <div 
                className="group px-2.5 py-1 cursor-pointer text-sm hover:bg-vscode-hover flex items-center"
                onClick={() => toggleFolder(folder.id)}
              >
                <span className="mr-1">{expandedFolders[folder.id] ? '▼' : '▶'}</span>
                {editingFolderId === folder.id ? (
                  <input
                    type="text"
                    value={folder.name}
                    onChange={(e) => updateFolder(folder.id, { name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingFolderId(null);
                      } else if (e.key === 'Escape') {
                        setEditingFolderId(null);
                      }
                    }}
                    onBlur={() => setEditingFolderId(null)}
                    className="bg-[#3c3c3c] border border-[#3794ff] text-vscode-text px-1.5 py-0.5 text-sm rounded flex-1 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <div className="flex justify-between items-center flex-1">
                    <span
                      className="flex-1 px-1 py-0.5 rounded cursor-text hover:bg-[#3c3c3c]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFolderId(folder.id);
                      }}
                    >
                      📁 {folder.name}
                    </span>
                    <div className="flex items-center">
                      <button
                        className="opacity-0 group-hover:opacity-100 bg-transparent border-none text-gray-500 hover:text-vscode-text cursor-pointer px-1 text-xs transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          createNewNote(folder.id);
                        }}
                      >
                        +
                      </button>
                      <button
                        className="opacity-0 group-hover:opacity-100 bg-transparent border-none text-gray-500 hover:text-vscode-text cursor-pointer px-1 text-lg transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {expandedFolders[folder.id] && (
                <div className="pl-7">
                  {notes.filter(note => note.folderId === folder.id).map(note => (
                    <NoteItem 
                      key={note.id}
                      note={note}
                      activeNoteId={activeNoteId}
                      editingTitleId={editingTitleId}
                      setActiveNoteId={setActiveNoteId}
                      setEditingTitleId={setEditingTitleId}
                      updateNote={updateNote}
                      updateNoteTitle={updateNoteTitle}
                      deleteNote={deleteNote}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex bg-vscode-sidebar border-b border-vscode-border overflow-x-auto h-[35px]">
          {notes.map(note => (
            <div 
              key={note.id}
              className={`group flex items-center px-3 py-2 bg-vscode-header border-r border-vscode-border
                min-w-[120px] max-w-[200px] cursor-pointer text-sm relative
                ${note.id === activeNoteId 
                  ? 'bg-vscode-bg border-t border-[#3794ff] -mt-px' 
                  : 'hover:bg-[#2a2a2a]'
                }`}
              onClick={() => setActiveNoteId(note.id)}
            >
              <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1">
                {note.title}
              </span>
              <button 
                className="opacity-0 group-hover:opacity-100 bg-transparent border-none text-gray-500 hover:text-vscode-text cursor-pointer px-1.5 text-lg transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  deleteNote(note.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex-1 p-5 bg-vscode-bg">
          <NoteEditor 
            note={notes.find(note => note.id === activeNoteId)}
          />
        </div>
      </div>
    </div>
  );
}

const NoteItem = ({ 
  note, 
  activeNoteId, 
  editingTitleId, 
  setActiveNoteId, 
  setEditingTitleId, 
  updateNote, 
  updateNoteTitle, 
  deleteNote 
}) => {
  return (
    <div 
      className={`group px-2.5 py-1 cursor-pointer text-sm ${
        note.id === activeNoteId ? 'bg-vscode-active' : 'hover:bg-vscode-hover'
      }`}
    >
      <div className="flex justify-between items-center w-full" onClick={() => setActiveNoteId(note.id)}>
        {editingTitleId === note.id ? (
          <input
            type="text"
            value={note.title}
            onChange={(e) => {
              updateNote(note.id, { title: e.target.value });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateNoteTitle(note.id, note.title);
              } else if (e.key === 'Escape') {
                setEditingTitleId(null);
              }
            }}
            className="bg-[#3c3c3c] border border-[#3794ff] text-vscode-text px-1.5 py-0.5 text-sm rounded w-[calc(100%-30px)] focus:outline-none"
            autoFocus
          />
        ) : (
          <>
            <span 
              onClick={(e) => {
                e.stopPropagation();
                setEditingTitleId(note.id);
              }}
              className="flex-1 px-1 py-0.5 rounded cursor-text hover:bg-[#3c3c3c]"
            >
              📄 {note.title}
            </span>
            <button 
              className="opacity-0 group-hover:opacity-100 bg-transparent border-none text-gray-500 hover:text-vscode-text cursor-pointer px-1.5 text-lg transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                deleteNote(note.id);
              }}
            >
              ×
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
