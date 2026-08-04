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
  // 💡 画像を配列で管理（最大3枚）
  const [bbsFiles, setBbsFiles] = useState([]);
  const [isBbsUploading, setIsBbsUploading] = useState(false);
  const [editingBbsItem, setEditingBbsItem] = useState(null);
  const [isBbsEditModalOpen, setIsBbsEditModalOpen] = useState(false);
  const [editBbsFiles, setEditBbsFiles] = useState([]);

  // 新規投稿時の画像選択ハンドラー（最大3枚制御＆サイズチェック）
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 3) {
      alert("画像は最大3枚まで選択可能です。");
      e.target.value = '';
      setBbsFiles([]);
      return;
    }
    const overSize = selectedFiles.some(file => file.size > 2100000);
    if (overSize) {
      alert("エラー: 2MBを超える画像が含まれています。");
      e.target.value = '';
      setBbsFiles([]);
      return;
    }
    setBbsFiles(selectedFiles);
  };

  // 編集時の画像選択ハンドラー
  const handleEditFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 3) {
      alert("画像は最大3枚まで選択可能です。");
      e.target.value = '';
      setEditBbsFiles([]);
      return;
    }
    const overSize = selectedFiles.some(file => file.size > 2100000);
    if (overSize) {
      alert("エラー: 2MBを超える画像が含まれています。");
      e.target.value = '';
      setEditBbsFiles([]);
      return;
    }
    setEditBbsFiles(selectedFiles);
  };

  // 管理者新規投稿処理
  const handlePostBbsAdmin = async () => {
    if (!bbsContent.trim()) return alert("投稿内容を入力してください");
    setIsBbsUploading(true);
    try {
      const imageUrls = [];
      const storagePaths = [];

      // 💡 複数画像をループでStorageにアップロード
      for (const file of bbsFiles) {
        const path = `bbs_images/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, path);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        imageUrls.push(url);
        storagePaths.push(path);
      }

      await addDoc(collection(db, "bbs"), { 
        userId: "admin", 
        userName: "管理者", 
        content: bbsContent, 
        imageUrls: imageUrls, 
        storagePaths: storagePaths, 
        createdAt: serverTimestamp() 
      });

      setBbsContent('');
      setBbsFiles([]);
      const fileInput = document.getElementById('bbs-file-input');
      if (fileInput) fileInput.value = '';
      fetchData();
      alert("管理者として掲示板に投稿しました");
    } catch (e) { 
      alert("投稿に失敗しました: " + e.message); 
    } finally { 
      setIsBbsUploading(false); 
    }
  };

  const openEditBbsModal = (item) => { 
    setEditingBbsItem(item); 
    setEditBbsFiles([]); 
    setIsBbsEditModalOpen(true); 
  };

  // 編集更新処理
  const handleUpdateBbsItem = async () => {
    if (!editingBbsItem.content.trim()) return alert("内容を入力してください");
    setIsBbsUploading(true);
    try {
      let finalImageUrls = editingBbsItem.imageUrls || (editingBbsItem.imageUrl ? [editingBbsItem.imageUrl] : []);
      let finalStoragePaths = editingBbsItem.storagePaths || (editingBbsItem.storagePath ? [editingBbsItem.storagePath] : []);

      // 💡 新しい画像ファイル群が選択されている場合は既存画像を消して差替え
      if (editBbsFiles.length > 0) {
        // 旧画像の削除処理
        for (const path of finalStoragePaths) {
          if (path) { try { await deleteObject(ref(storage, path)); } catch (err) {} }
        }

        finalImageUrls = [];
        finalStoragePaths = [];

        // 新画像のアップロード
        for (const file of editBbsFiles) {
          const path = `bbs_images/${Date.now()}_${file.name}`;
          const fileRef = ref(storage, path);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          finalImageUrls.push(url);
          finalStoragePaths.push(path);
        }
      }

      await updateDoc(doc(db, "bbs", editingBbsItem.id), { 
        content: editingBbsItem.content, 
        imageUrls: finalImageUrls, 
        storagePaths: finalStoragePaths, 
        updatedAt: serverTimestamp() 
      });

      setIsBbsEditModalOpen(false);
      fetchData();
      alert("投稿を修正しました");
    } catch (e) { 
      alert("修正失敗: " + e.message); 
    } finally { 
      setIsBbsUploading(false); 
    }
  };

  // 投稿削除処理（紐づく画像全削除）
  const handleDeleteBbsItem = async (item) => {
    if (!window.confirm("この投稿を削除しますか？")) return;
    try {
      const targetPaths = item.storagePaths || (item.storagePath ? [item.storagePath] : []);
      for (const path of targetPaths) {
        if (path) { await deleteObject(ref(storage, path)).catch(() => {}); }
      }
      await deleteDoc(doc(db, "bbs", item.id));
      fetchData();
      alert("投稿を完全に削除しました");
    } catch (e) { 
      alert("削除失敗: " + e.message); 
    }
  };

  // 画像配列を安全に取得する補助関数（新旧互換性保持）
  const getItemImages = (item) => {
    if (item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
      return item.imageUrls;
    }
    if (item.imageUrl) {
      return [item.imageUrl];
    }
    return [];
  };

  return (
    <div>
      <h1>掲示板確認・管理</h1>
      <div style={styles.card}>
        <h3>📢 管理者として掲示板に新規投稿</h3>
        <textarea placeholder="メッセージ..." style={styles.textarea} value={bbsContent} onChange={e => setBbsContent(e.target.value)} />
        <div style={{display:'flex', flexDirection:'column', gap:'5px', marginBottom:'15px'}}>
          <input type="file" id="bbs-file-input" accept="image/*" multiple onChange={handleFileChange} />
          <span style={{fontSize:'12px', color:'#718096'}}>※画像は最大3枚まで（1枚あたり2MB以内）</span>
        </div>
        <button onClick={handlePostBbsAdmin} disabled={isBbsUploading} style={{ padding: '12px 24px', background: '#319795', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor:'pointer' }}>
          {isBbsUploading ? "投稿中..." : "投稿する"}
        </button>
      </div>

      <div style={styles.card}>
        <h3>投稿の監視・編集・削除</h3>
        <input type="text" placeholder="リアルタイム検索..." value={bbsSearchWord} onChange={e => setBbsSearchWord(e.target.value)} style={styles.input} />
        {bbsList.map(item => {
          const images = getItemImages(item);
          return (
            <div key={item.id} style={{borderBottom:'1px solid #edf2f7', padding:'20px 0', display:'flex', gap:'20px'}}>
              {/* 💡 複数画像を横並びで表示 */}
              {images.length > 0 && (
                <div style={{display:'flex', gap:'8px', flexShrink: 0}}>
                  {images.map((imgUrl, idx) => (
                    <img 
                      key={idx} 
                      src={imgUrl} 
                      style={{width:'80px', height:'80px', objectFit:'cover', borderRadius:'8px', border:'1px solid #e2e8f0'}} 
                      alt={`BBS Post ${idx + 1}`} 
                    />
                  ))}
                </div>
              )}
              <div style={{flex:1}}>
                <div style={{display:'flex', justifyContent:'space-between'}}><span style={{fontWeight:'bold'}}>{item.userName}</span></div>
                <p style={{whiteSpace:'pre-wrap'}}>{item.content}</p>
                <div style={{display:'flex', gap:'15px'}}>
                  <button style={styles.btnEdit} onClick={() => openEditBbsModal(item)}>編集</button>
                  <button style={styles.btnDelete} onClick={() => handleDeleteBbsItem(item)}>削除</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isBbsEditModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2>掲示板投稿の編集</h2>
            <textarea style={styles.textarea} value={editingBbsItem.content} onChange={e => setEditingBbsItem({...editingBbsItem, content: e.target.value})} />
            
            <div style={{marginBottom:'15px'}}>
              <label style={{display:'block', fontSize:'12px', fontWeight:'bold', marginBottom:'5px'}}>新しい画像に変更する場合（最大3枚）:</label>
              <input type="file" accept="image/*" multiple onChange={handleEditFileChange} />
            </div>

            <div style={{display:'flex', gap:'10px'}}>
              <button onClick={handleUpdateBbsItem} disabled={isBbsUploading} style={{padding:'8px 16px', background:'#3182ce', color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}>
                {isBbsUploading ? "保存中..." : "更新保存"}
              </button>
              <button onClick={() => setIsBbsEditModalOpen(false)} style={{padding:'8px 16px', background:'#e2e8f0', color:'#2d3748', border:'none', borderRadius:'6px', cursor:'pointer'}}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BbsCheckScreen;