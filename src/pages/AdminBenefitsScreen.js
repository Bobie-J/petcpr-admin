import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp 
} from 'firebase/firestore';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '30px' },
  input: { width: '100%', padding: '10px 12px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #e2e8f0', boxSizing: 'border-box', minHeight: '80px' },
  label: { display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '0.85rem', color: '#4a5568' },
  btnPrimary: { padding: '10px 20px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  btnDanger: { padding: '6px 12px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' },
  btnEdit: { padding: '6px 12px', background: '#319795', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', marginRight: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }
};

const AdminBenefitsScreen = ({ db }) => {
  const [benefits, setBenefits] = useState([]);
  const [editingId, setEditingId] = useState(null); // 編集中のID (nullなら新規作成)
  
  // フォーム用State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [order, setOrder] = useState(0);

  // 一覧取得
  const fetchBenefits = async () => {
    try {
      const q = query(collection(db, "benefits"), orderBy("order", "asc"));
      const snap = await getDocs(q);
      setBenefits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("特典一覧の取得エラー:", e);
    }
  };

  useEffect(() => {
    fetchBenefits();
  }, []);

  // フォーム初期化
  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setImageUrl('');
    setLinkUrl('');
    setOrder(benefits.length + 1);
  };

  // 編集モードへのセット
  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setDescription(item.description || '');
    setImageUrl(item.imageUrl || '');
    setLinkUrl(item.linkUrl || '');
    setOrder(item.order || 0);
  };

  // 保存処理（新規登録 or 編集更新）
  const handleSave = async (e) => {
    e.preventDefault();
    if (!title) return alert("特典タイトルを入力してください");

    try {
      const data = {
        title,
        description,
        imageUrl,
        linkUrl,
        order: Number(order) || 0,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        // 更新
        await updateDoc(doc(db, "benefits", editingId), data);
        alert("特典情報を更新しました");
      } else {
        // 新規作成
        await addDoc(collection(db, "benefits"), {
          ...data,
          createdAt: serverTimestamp()
        });
        alert("新規特典を追加しました");
      }

      resetForm();
      fetchBenefits();
    } catch (err) {
      alert("保存に失敗しました: " + err.message);
    }
  };

  // 削除処理
  const handleDelete = async (id) => {
    if (!window.confirm("この会員特典を削除しますか？")) return;
    try {
      await deleteDoc(doc(db, "benefits", id));
      alert("削除しました");
      fetchBenefits();
    } catch (err) {
      alert("削除エラー: " + err.message);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '25px', color: '#2d3748' }}>🎁 会員特典管理</h1>

      {/* 特典作成・編集フォーム */}
      <div style={styles.card}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2rem', color: '#3182ce' }}>
          {editingId ? '✏️ 会員特典の編集' : '＋ 新規会員特典の追加'}
        </h2>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>特典タイトル *</label>
              <input 
                type="text" 
                style={styles.input} 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="例: セミナー動画 優先視聴権"
                required 
              />
            </div>
            <div style={{ width: '120px' }}>
              <label style={styles.label}>表示順</label>
              <input 
                type="number" 
                style={styles.input} 
                value={order} 
                onChange={e => setOrder(e.target.value)} 
              />
            </div>
          </div>

          <label style={styles.label}>特典の説明文</label>
          <textarea 
            style={styles.textarea} 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="会員様向けの特典内容や利用手順などを記載"
          />

          <label style={styles.label}>バナー・サムネイル画像URL</label>
          <input 
            type="text" 
            style={styles.input} 
            value={imageUrl} 
            onChange={e => setImageUrl(e.target.value)} 
            placeholder="https://example.com/image.jpg"
          />

          <label style={styles.label}>特典リンク先URL（限定コンテンツやPDF等のリンク）</label>
          <input 
            type="text" 
            style={styles.input} 
            value={linkUrl} 
            onChange={e => setLinkUrl(e.target.value)} 
            placeholder="https://..."
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" style={styles.btnPrimary}>
              {editingId ? '更新を保存' : '特典を登録'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ ...styles.btnPrimary, background: '#e2e8f0', color: '#4a5568' }}>
                キャンセル
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 特典一覧 */}
      <h2>登録済み会員特典一覧</h2>
      {benefits.length === 0 ? (
        <p style={{ color: '#718096' }}>登録された特典はありません。</p>
      ) : (
        <div style={styles.grid}>
          {benefits.map(item => (
            <div key={item.id} style={{ ...styles.card, padding: '20px', marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {item.imageUrl && (
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '12px' }} 
                  />
                )}
                <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '4px' }}>表示順: {item.order}</div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#2d3748' }}>{item.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#4a5568', whiteSpace: 'pre-wrap', marginBottom: '15px' }}>{item.description}</p>
                {item.linkUrl && (
                  <div style={{ marginBottom: '15px' }}>
                    <a href={item.linkUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#3182ce', wordBreak: 'break-all' }}>
                      🔗 {item.linkUrl}
                    </a>
                  </div>
                )}
              </div>
              <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '12px', textAlign: 'right' }}>
                <button onClick={() => handleStartEdit(item)} style={styles.btnEdit}>編集</button>
                <button onClick={() => handleDelete(item.id)} style={styles.btnDanger}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBenefitsScreen;