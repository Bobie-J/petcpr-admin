import React, { useState } from 'react';
import { addDoc, updateDoc, doc, collection, serverTimestamp } from 'firebase/firestore';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  badge: (isPublic) => ({ padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', background: isPublic ? '#c6f6d5' : '#edf2f7', color: isPublic ? '#22543d' : '#4a5568' }),
  btnDelete: { color: '#e53e3e', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }
};

const NewsInstaScreen = ({ db, instaList, fetchData, handleDelete }) => {
  const [instaUrl, setInstaUrl] = useState('');
  const [instaStatus, setInstaStatus] = useState('public');

  const handleSaveInsta = async () => {
    if (!instaUrl) return;
    try {
      await addDoc(collection(db, "instagram"), { url: instaUrl, status: instaStatus, createdAt: serverTimestamp() });
      setInstaUrl('');
      fetchData();
      alert("インスタを追加しました");
    } catch (e) { alert("保存に失敗"); }
  };

  const toggleInstaStatus = async (item) => {
    await updateDoc(doc(db, "instagram", item.id), { status: item.status === 'public' ? 'private' : 'public' });
    fetchData();
  };

  const getInstaThumbnail = (url) => {
    const baseUrl = url.split('?')[0];
    return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}media/?size=m`;
  };

  return (
    <div>
      <h1>Instagram 連携管理</h1>
      <div style={styles.card}>
        <input type="text" value={instaUrl} onChange={(e) => setInstaUrl(e.target.value)} placeholder="Instagram URL" style={styles.input} />
        <button onClick={handleSaveInsta} style={{ padding: '12px 24px', background: '#e1306c', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor:'pointer' }}>連携を追加</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {instaList.map(item => (
          <div key={item.id} style={styles.card}>
            <img src={getInstaThumbnail(item.url)} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '8px' }} onError={(e) => { e.target.src = "https://via.placeholder.com/300?text=Private+or+Deleted"; }} alt="Insta Post" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <span onClick={() => toggleInstaStatus(item)} style={{ ...styles.badge(item.status === 'public'), cursor: 'pointer' }}>{item.status === 'public' ? '公開中' : '非公開'}</span>
              <button onClick={() => handleDelete('instagram', item.id)} style={styles.btnDelete}>削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsInstaScreen;