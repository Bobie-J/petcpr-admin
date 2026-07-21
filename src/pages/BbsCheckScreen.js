import React, { useState } from 'react';
import { addDoc, updateDoc, deleteDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box', height: '80px', fontFamily: 'sans-serif' },
  btnEdit: { color: '#3182ce', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' },
  btnDelete: { color: '#e53e3e', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalContent: { background: 'white', padding: '30px', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }
};

const BbsCheckScreen = ({ db, storage, bbsList, bbsSearchWord, setBbsSearchWord, fetchData }) => {
  const [bbsContent, setBbsContent] = useState('');
  const [bbsFile, setBbsFile] = useState(null);
  const [isBbsUploading, setIsBbsUploading] = useState(false);
  const [editingBbsItem, setEditingBbsItem] = useState(null);
  const [isBbsEditModalOpen, setIsBbsEditModalOpen] = useState(false);
  const [editBbsFile, setEditBbsFile] = useState(null);

  const handlePostBbsAdmin = async () => {
    if (!bbsContent.trim()) return alert("投稿内容を入力してください");
    if (bbsFile && bbsFile.size > 2100000) return alert("エラー: 画像ファイルの容量が2MBを超えています。");
    setIsBbsUploading(true);
    try {
      let imageUrl = '';
      let storagePath = '';
      if (bbsFile) {
        storagePath = `bbs_images/${Date.now()}_${bbsFile.name}`;
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, bbsFile);
        imageUrl = await getDownloadURL(fileRef);
      }
      await addDoc(collection(db, "bbs"), { userId: "admin", userName: "管理者", content: bbsContent, imageUrl: imageUrl, storagePath: storagePath, createdAt: serverTimestamp() });
      setBbsContent('');
      setBbsFile(null);
      const fileInput = document.getElementById('bbs-file-input');
      if (fileInput) fileInput.value = '';
      fetchData();
      alert("管理者として掲示板に投稿しました");
    } catch (e) { alert("投稿に失敗しました: " + e.message); } finally { setIsBbsUploading(false); }
  };

  const openEditBbsModal = (item) => { setEditingBbsItem(item); setEditBbsFile(null); setIsBbsEditModalOpen(true); };

  const handleUpdateBbsItem = async () => {
    if (!editingBbsItem.content.trim()) return alert("内容を入力してください");
    if (editBbsFile && editBbsFile.size > 2100000) return alert("エラー: 画像が2MBを超えています。");
    setIsBbsUploading(true);
    try {
      let finalImageUrl = editingBbsItem.imageUrl || '';
      let finalStoragePath = editingBbsItem.storagePath || '';
      if (editBbsFile) {
        if (editingBbsItem.storagePath) { try { await deleteObject(ref(storage, editingBbsItem.storagePath)); } catch (err) {} }
        finalStoragePath = `bbs_images/${Date.now()}_${editBbsFile.name}`;
        const fileRef = ref(storage, finalStoragePath);
        await uploadBytes(fileRef, editBbsFile);
        finalImageUrl = await getDownloadURL(fileRef);
      }
      await updateDoc(doc(db, "bbs", editingBbsItem.id), { content: editingBbsItem.content, imageUrl: finalImageUrl, storagePath: finalStoragePath, updatedAt: serverTimestamp() });
      setIsBbsEditModalOpen(false);
      fetchData();
      alert("投稿を修正しました");
    } catch (e) { alert("修正失敗: " + e.message); } finally { setIsBbsUploading(false); }
  };

  const handleDeleteBbsItem = async (item) => {
    if (!window.confirm("この投稿を削除しますか？")) return;
    try {
      if (item.storagePath) { await deleteObject(ref(storage, item.storagePath)).catch(() => {}); }
      await deleteDoc(doc(db, "bbs", item.id));
      fetchData();
      alert("投稿を完全に削除しました");
    } catch (e) { alert("削除失敗: " + e.message); }
  };

  return (
    <div>
      <h1>掲示板確認・管理</h1>
      <div style={styles.card}>
        <h3>📢 管理者として掲示板に新規投稿</h3>
        <textarea placeholder="メッセージ..." style={styles.textarea} value={bbsContent} onChange={e => setBbsContent(e.target.value)} />
        <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'15px'}}>
          <input type="file" id="bbs-file-input" accept="image/*" onChange={e => setBbsFile(e.target.files[0])} />
        </div>
        <button onClick={handlePostBbsAdmin} disabled={isBbsUploading} style={{ padding: '12px 24px', background: '#319795', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor:'pointer' }}>投稿する</button>
      </div>

      <div style={styles.card}>
        <h3>投稿の監視・編集・削除</h3>
        <input type="text" placeholder="リアルタイム検索..." value={bbsSearchWord} onChange={e => setBbsSearchWord(e.target.value)} style={styles.input} />
        {bbsList.map(item => (
          <div key={item.id} style={{borderBottom:'1px solid #edf2f7', padding:'20px 0', display:'flex', gap:'20px'}}>
            {item.imageUrl && <img src={item.imageUrl} style={{width:'100px', height:'100px', objectFit:'cover', borderRadius:'8px'}} alt="BBS Post" />}
            <div style={{flex:1}}>
              <div style={{display:'flex', justifyContent:'space-between'}}><span style={{fontWeight:'bold'}}>{item.userName}</span></div>
              <p style={{whiteSpace:'pre-wrap'}}>{item.content}</p>
              <div style={{display:'flex', gap:'15px'}}>
                <button style={styles.btnEdit} onClick={() => openEditBbsModal(item)}>編集</button>
                <button style={styles.btnDelete} onClick={() => handleDeleteBbsItem(item)}>削除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isBbsEditModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2>掲示板投稿の編集</h2>
            <textarea style={styles.textarea} value={editingBbsItem.content} onChange={e => setEditingBbsItem({...editingBbsItem, content: e.target.value})} />
            <input type="file" accept="image/*" onChange={e => setEditBbsFile(e.target.files[0])} style={{marginBottom:'15px'}} />
            <div>
              <button onClick={handleUpdateBbsItem} disabled={isBbsUploading}>更新保存</button>
              <button onClick={() => setIsBbsEditModalOpen(false)} style={{marginLeft:'10px'}}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BbsCheckScreen;