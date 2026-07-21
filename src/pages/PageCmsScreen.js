import React, { useState } from 'react';
import { addDoc, updateDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  badgeGreen: { padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', background: '#c6f6d5', color: '#22543d', fontWeight: 'bold' },
  badgePurple: { padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', background: '#e2e8f0', color: '#4a5568', fontWeight: 'bold' },
  btnEdit: { color: '#3182ce', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' },
  btnDelete: { color: '#e53e3e', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }
};

const PageCmsScreen = ({ db, pageList, fetchData, handleDelete }) => {
  const [pageEditId, setPageEditId] = useState(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageParentId, setPageParentId] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [pageOrder, setPageOrder] = useState(pageList.length + 1);
  const [pageShowInHeader, setPageShowInHeader] = useState(true);

  const handleSavePage = async () => {
    if (!pageTitle.trim() || !pageSlug.trim()) return alert("ページタイトルとURLスラッグは必須です");
    if (!/^[a-zA-Z0-9_-]+$/.test(pageSlug)) return alert("URLスラッグは半角英数字で入力してください");

    const payload = {
      title: pageTitle.trim(),
      slug: pageSlug.trim().toLowerCase(),
      parentId: pageParentId || null,
      content: pageContent,
      order: Number(pageOrder),
      showInHeader: pageShowInHeader,
      updatedAt: serverTimestamp()
    };

    try {
      if (pageEditId) {
        await updateDoc(doc(db, "pages", pageEditId), payload);
        alert("ページ設定を更新しました");
      } else {
        const isDuplicate = pageList.some(p => p.slug === payload.slug && p.id !== pageEditId);
        if (isDuplicate) return alert("このURLスラッグは既に他のページで使用されています");
        await addDoc(collection(db, "pages"), { ...payload, createdAt: serverTimestamp() });
        alert("新しいページを作成しました");
      }
      resetPageForm();
      fetchData();
    } catch (e) {
      alert("ページ保存失敗: " + e.message);
    }
  };

  const resetPageForm = () => {
    setPageEditId(null);
    setPageTitle('');
    setPageSlug('');
    setPageParentId('');
    setPageContent('');
    setPageOrder(pageList.length + 1);
    setPageShowInHeader(true);
  };

  const startEditPage = (p) => {
    setPageEditId(p.id);
    setPageTitle(p.title);
    setPageSlug(p.slug);
    setPageParentId(p.parentId || '');
    setPageContent(p.content || '');
    setPageOrder(p.order);
    setPageShowInHeader(p.showInHeader !== false);
    window.scrollTo(0, 0);
  };

  const renderPageTree = (parentId = null, depth = 0) => {
    const currentLevelPages = pageList.filter(p => p.parentId === parentId);
    return currentLevelPages.map(p => (
      <div key={p.id} style={{ marginLeft: `${depth * 25}px`, borderLeft: depth > 0 ? '2px dashed #cbd5e0' : 'none', paddingLeft: depth > 0 ? '15px' : '0' }}>
        <div style={{ ...styles.card, padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: depth === 0 ? '#fff' : '#f8fafc', marginBottom: '10px', border: depth > 0 ? '1px solid #e2e8f0' : '1px solid #edf2f7' }}>
          <div>
            <span style={{ marginRight: '10px', fontSize: '0.8rem', background: '#4a5568', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>表示順: {p.order}</span>
            <strong style={{ fontSize: '1.05rem', color: '#1a202c' }}>{depth > 0 ? '└ ' : ''}{p.title}</strong>
            <span style={{ marginLeft: '10px', color: '#718096', fontSize: '0.85rem' }}>📌 スラッグ: <code>/{p.slug}</code></span>
            {p.showInHeader ? (
              <span style={{ ...styles.badgeGreen, marginLeft: '10px' }}>🖥️ ヘッダー表示</span>
            ) : (
              <span style={{ ...styles.badgePurple, marginLeft: '10px' }}>隠しページ</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => startEditPage(p)} style={styles.btnEdit}>編集</button>
            <button onClick={() => handleDelete('pages', p.id)} style={styles.btnDelete}>削除</button>
          </div>
        </div>
        {renderPageTree(p.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div>
      <h1>{pageEditId ? '⚙️ ページの編集・修正' : '📄 固定ページ新規追加・メニュー構築'}</h1>
      <p style={{color:'#718096', marginTop:'-10px'}}>サイト上の各紹介ページやコース詳細ページを構築します。親構造を指定可能です。</p>
      
      <div style={styles.card}>
        <div style={{display:'flex', gap:'20px'}}>
          <div style={{flex: 2}}>
            <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#4a5568'}}>ページ表示タイトル</label>
            <input type="text" placeholder="例: ベーシックコース、オンライン、About us" value={pageTitle} onChange={e => setPageTitle(e.target.value)} style={styles.input} />
          </div>
          <div style={{flex: 1}}>
            <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#4a5568'}}>URLスラッグ (半角英数)</label>
            <input type="text" placeholder="例: basic, basic-online, about" value={pageSlug} onChange={e => setPageSlug(e.target.value)} style={styles.input} disabled={!!pageEditId} />
          </div>
        </div>

        <div style={{display:'flex', gap:'20px', background:'#edf2f7', padding:'15px', borderRadius:'8px', marginBottom:'20px'}}>
          <div style={{flex: 1}}>
            <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#4a5568'}}>📁 所属する親ページ</label>
            <select value={pageParentId} onChange={e => setPageParentId(e.target.value)} style={{...styles.input, marginBottom:0, padding:'8px'}}>
              <option value="">（最上位の大項目・ルートページとして配置）</option>
              {pageList.filter(p => p.id !== pageEditId).map(p => (
                <option key={p.id} value={p.id}>
                  {p.parentId ? '└ ' : ''}{p.title} (/{p.slug})
                </option>
              ))}
            </select>
          </div>
          <div style={{width:'120px'}}>
            <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#4a5568'}}>🔢 並び順</label>
            <input type="number" value={pageOrder} onChange={e => setPageOrder(e.target.value)} style={{...styles.input, marginBottom:0, padding:'8px'}} />
          </div>
          <div style={{width:'180px'}}>
            <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#4a5568'}}>🖥️ ナビゲーション表示</label>
            <select value={pageShowInHeader ? 'true' : 'false'} onChange={e => setPageShowInHeader(e.target.value === 'true')} style={{...styles.input, marginBottom:0, padding:'8px'}}>
              <option value="true">ヘッダーに載せる</option>
              <option value="false">隠し・直リンクのみ</option>
            </select>
          </div>
        </div>

        <div style={{marginBottom:'20px'}}>
          <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#4a5568'}}>🖋️ ページ本文・紹介用コンテンツ</label>
          <div style={{background:'white', marginBottom:'50px'}}><ReactQuill theme="snow" value={pageContent} onChange={setPageContent} style={{height:'350px'}} /></div>
        </div>

        <div style={{borderTop:'1px solid #edf2f7', paddingTop:'20px', display:'flex', gap:'15px'}}>
          <button onClick={handleSavePage} style={{padding:'12px 24px', background:'#3182ce', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>
            {pageEditId ? '変更を保存する' : 'この設定でページを生成'}
          </button>
          {pageEditId && <button onClick={resetPageForm} style={{padding:'12px 20px', borderRadius:'8px', cursor:'pointer'}}>変更を破棄して新規作成へ</button>}
        </div>
      </div>

      <h2>🌳 現在のWebサイト階層・ナビゲーション構成</h2>
      <div style={{marginTop:'20px'}}>
        {pageList.length === 0 ? (
          <p style={{color:'#a0aec0', padding:'30px', background:'white', borderRadius:'12px', textAlign:'center'}}>作成された固定ページはありません。</p>
        ) : (
          renderPageTree(null, 0)
        )}
      </div>
    </div>
  );
};

export default PageCmsScreen;