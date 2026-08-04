import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, serverTimestamp, query, orderBy, getDocs,
  getDoc, setDoc, doc, deleteDoc 
} from 'firebase/firestore';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// --- Firebase�ݒ� ---
const firebaseConfig = {
  apiKey: "AIzaSyDUlCG0Nh_Yw0zquCJ5QT43DNWIPNr_DiQ",
  authDomain: "pet-cpr.firebaseapp.com",
  projectId: "pet-cpr",
  storageBucket: "pet-cpr.firebasestorage.app",
  messagingSenderId: "180722138949",
  appId: "1:180722138949:web:fca40a7798e23ba130482c",
  measurementId: "G-3HL5V91Q25"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const AdminApp = () => {
  const [activeTab, setActiveTab] = useState('news'); // 'news' or 'sns'
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [newsList, setNewsList] = useState([]);
  const [instaUrl, setInstaUrl] = useState(''); 
  const [instaLinks, setInstaLinks] = useState([]); 

  // --- �f�[�^�擾 ---
  const fetchNews = async () => {
    const q = query(collection(db, "news"), orderBy("publishedAt", "desc"));
    const snap = await getDocs(q);
    setNewsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchInstaLinks = async () => {
    const docSnap = await getDoc(doc(db, "settings", "instagram"));
    if (docSnap.exists()) setInstaLinks(docSnap.data().urls || []);
  };

  useEffect(() => { fetchNews(); fetchInstaLinks(); }, []);

  // --- NEWS�ۑ� ---
  const handleSaveNews = async () => {
    if (!title || !content || !publishDate) return alert("���͂��s�����Ă��܂�");
    try {
      await addDoc(collection(db, "news"), {
        title, content, publishedAt: new Date(publishDate), createdAt: serverTimestamp()
      });
      alert("NEWS�𓊍e���܂���");
      setTitle(''); setContent(''); setPublishDate('');
      fetchNews();
    } catch (e) { alert("�G���[���������܂���"); }
  };

  // --- Instagram�ۑ��E�폜 ---
  const handleSaveInsta = async () => {
    if (!instaUrl) return;
    const newLinks = [instaUrl, ...instaLinks];
    await setDoc(doc(db, "settings", "instagram"), { urls: newLinks });
    setInstaLinks(newLinks);
    setInstaUrl('');
  };

  const handleDeleteInsta = async (idx) => {
    if(!window.confirm("���̃����N���폜���܂����H")) return;
    const newLinks = instaLinks.filter((_, i) => i !== idx);
    await setDoc(doc(db, "settings", "instagram"), { urls: newLinks });
    setInstaLinks(newLinks);
  };

  // --- �X�^�C����`�i�R�[�h��\�邾���Ŕ��f�����邽�߁j ---
  const styles = {
    container: { display: 'flex', minHeight: '100vh', background: '#f0f2f5', fontFamily: 'sans-serif' },
    sidebar: { width: '260px', background: '#1c1c1c', color: 'white', padding: '30px 20px' },
    navItem: (active) => ({
      padding: '15px', cursor: 'pointer', borderRadius: '8px', 
      background: active ? '#333' : 'transparent', marginBottom: '10px',
      transition: '0.3s', fontWeight: active ? 'bold' : 'normal', color: active ? '#fff' : '#ccc'
    }),
    main: { flex: 1, padding: '40px', maxWidth: '900px' },
    card: { background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '30px' },
    input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' },
    button: { padding: '12px 24px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }
  };

  return (
    <div style={styles.container}>
      {/* �����F�i�r���j���[ */}
      <div style={styles.sidebar}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '40px' }}>�Ǘ��p�l��</h2>
        <div style={styles.navItem(activeTab === 'news')} onClick={() => setActiveTab('news')}>? NEWS�Ǘ�</div>
        <div style={styles.navItem(activeTab === 'sns')} onClick={() => setActiveTab('sns')}>? SNS�A�g</div>
      </div>

      {/* �E���F�R���e���c�G���A */}
      <div style={styles.main}>
        
        {activeTab === 'news' ? (
          <div>
            <h1 style={{ marginBottom: '25px' }}>NEWS�L���쐬</h1>
            <div style={styles.card}>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="�L���̃^�C�g��" style={styles.input} />
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.8rem', color: '#666' }}>�f�ړ����F</label>
                <input type="datetime-local" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} style={styles.input} />
              </div>
              <div style={{ marginBottom: '20px', background: 'white' }}>
                <ReactQuill theme="snow" value={content} onChange={setContent} style={{ height: '250px', marginBottom: '50px' }} />
              </div>
              <button onClick={handleSaveNews} style={styles.button}>NEWS�����J�ۑ�</button>
            </div>

            <h2>���e�ς�NEWS</h2>
            {newsList.map(news => (
              <div key={news.id} style={{ ...styles.card, padding: '15px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>{news.title}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#999' }}>{news.publishedAt.toDate().toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <h1 style={{ marginBottom: '25px' }}>Instagram�A�g</h1>
            <div style={styles.card}>
              <p style={{ color: '#666', marginBottom: '20px' }}>�\��������Instagram���e��URL��ǉ����Ă��������B</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" value={instaUrl} onChange={(e) => setInstaUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." style={styles.input} />
                <button onClick={handleSaveInsta} style={{ ...styles.button, background: '#e1306c', height: '45px' }}>�ǉ�</button>
              </div>
            </div>

            <h2>�o�^�ς݃����N</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {instaLinks.map((link, i) => (
                <div key={i} style={{ ...styles.card, padding: '15px', fontSize: '0.8rem' }}>
                  <div style={{ wordBreak: 'break-all', marginBottom: '10px' }}>{link}</div>
                  <button onClick={() => handleDeleteInsta(i)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>�폜</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApp;