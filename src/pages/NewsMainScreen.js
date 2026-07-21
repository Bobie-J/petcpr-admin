import React, { useState } from 'react';
import { addDoc, updateDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  badge: (isPublic) => ({ padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', background: isPublic ? '#c6f6d5' : '#edf2f7', color: isPublic ? '#22543d' : '#4a5568' }),
  badgeBlue: { padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', background: '#ebf8ff', color: '#2b6cb0', marginLeft: '5px' },
  btnEdit: { color: '#3182ce', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' },
  btnDelete: { color: '#e53e3e', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }
};

const NewsMainScreen = ({ db, newsList, licenseMasterList, fetchData, handleDelete }) => {
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [status, setStatus] = useState('public');
  const [newsAccessType, setNewsAccessType] = useState('all');
  const [newsAllowedLicenses, setNewsAllowedLicenses] = useState({});
  const [newsShowTitleToAll, setNewsShowTitleToAll] = useState(true);

  const handleNewsAllowedLicensesCheckbox = (id, checked) => {
    setNewsAllowedLicenses({ ...newsAllowedLicenses, [id]: checked });
  };

  const handleSaveNews = async () => {
    if (!title || !content || !publishDate) return alert("入力が不足しています");
    const allowedLicensesArray = Object.keys(newsAllowedLicenses).filter(key => newsAllowedLicenses[key]);
    if (newsAccessType === 'limited' && allowedLicensesArray.length === 0) {
      return alert("限定公開にする場合は、最低1つ以上のライセンスを指定してください。");
    }
    const accessControl = {
      isLimited: newsAccessType === 'limited',
      allowedLicenses: newsAccessType === 'limited' ? allowedLicensesArray : [],
      showTitleToAll: newsAccessType === 'limited' ? newsShowTitleToAll : true
    };
    const payload = { title, content, publishedAt: new Date(publishDate), status, accessControl, updatedAt: serverTimestamp() };
    try {
      if (editId) {
        await updateDoc(doc(db, "news", editId), payload);
        alert("ニュースを更新しました");
      } else {
        await addDoc(collection(db, "news"), { ...payload, createdAt: serverTimestamp() });
        alert("ニュースを新規投稿しました");
      }
      resetForm();
      fetchData();
    } catch (e) { alert("エラーが発生しました: " + e.message); }
  };

  const resetForm = () => {
    setEditId(null); setTitle(''); setContent(''); setPublishDate(''); setStatus('public'); setNewsAccessType('all'); setNewsAllowedLicenses({}); setNewsShowTitleToAll(true);
  };

  const startEditNews = (news) => {
    setEditId(news.id); setTitle(news.title); setContent(news.content);
    setPublishDate(news.publishedAt?.toDate ? news.publishedAt.toDate().toISOString().slice(0, 16) : '');
    setStatus(news.status);
    if (news.accessControl) {
      setNewsAccessType(news.accessControl.isLimited ? 'limited' : 'all');
      setNewsShowTitleToAll(news.accessControl.showTitleToAll !== false);
      const restoredLicenses = {};
      news.accessControl.allowedLicenses?.forEach(licId => { restoredLicenses[licId] = true; });
      setNewsAllowedLicenses(restoredLicenses);
    } else {
      setNewsAccessType('all'); setNewsAllowedLicenses({}); setNewsShowTitleToAll(true);
    }
    window.scrollTo(0, 0);
  };

  return (
    <div>
      <h1>{editId ? 'NEWS記事の編集' : 'NEWS新規作成'}</h1>
      <div style={styles.card}>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル" style={styles.input} />
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: '#718096' }}>掲載日時</label>
            <input type="datetime-local" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} style={styles.input} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: '#718096' }}>公開ステータス</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>
              <option value="public">一般公開</option>
              <option value="private">非公開（下書き）</option>
            </select>
          </div>
        </div>

        <div style={{ background: '#f7fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>🔒 閲覧権限の設定</h4>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ marginRight: '20px', cursor: 'pointer' }}><input type="radio" name="accessType" value="all" checked={newsAccessType === 'all'} onChange={() => setNewsAccessType('all')} /> 全員に公開</label>
            <label style={{ cursor: 'pointer', fontWeight: 'bold', color: '#2b6cb0' }}><input type="radio" name="accessType" value="limited" checked={newsAccessType === 'limited'} onChange={() => setNewsAccessType('limited')} /> 特定ライセンス保持者のみ</label>
          </div>
          {newsAccessType === 'limited' && (
            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #edf2f7', marginBottom: '15px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#4a5568', fontWeight: 'bold' }}>閲覧を許可するライセンス:</p>
              {licenseMasterList.map(master => (
                <label key={master.id} style={{ marginRight: '20px', display: 'inline-block', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newsAllowedLicenses[master.id] || false} onChange={(e) => handleNewsAllowedLicensesCheckbox(master.id, e.target.checked)} /> {master.name}
                </label>
              ))}
              <div style={{ marginTop: '15px', borderTop: '1px dashed #e2e8f0', paddingTop: '12px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#4a5568', fontWeight: 'bold' }}>未所持者への見せ方:</p>
                <label style={{ marginRight: '20px', cursor: 'pointer' }}><input type="radio" name="showTitle" checked={newsShowTitleToAll === true} onChange={() => setNewsShowTitleToAll(true)} /> 見出しだけ見せる</label><br />
                <label style={{ cursor: 'pointer', display: 'inline-block', marginTop: '5px' }}><input type="radio" name="showTitle" checked={newsShowTitleToAll === false} onChange={() => setNewsShowTitleToAll(false)} /> 存在自体を隠す</label>
              </div>
            </div>
          )}
        </div>

        <div style={{ background: 'white', marginBottom: '50px' }}><ReactQuill theme="snow" value={content} onChange={setContent} style={{ height: '300px' }} /></div>
        <button onClick={handleSaveNews} style={{ padding: '12px 24px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{editId ? '更新内容を保存' : '新規ニュースを保存'}</button>
        {editId && <button onClick={resetForm} style={{ marginLeft: '15px', padding: '12px 20px', borderRadius:'8px', cursor:'pointer' }}>キャンセル</button>}
      </div>

      {newsList.map(news => (
        <div key={news.id} style={{ ...styles.card, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <span style={styles.badge(news.status === 'public')}>{news.status === 'public' ? '公開中' : '非公開'}</span>
            {news.accessControl?.isLimited ? (<span style={styles.badgeBlue}>🔒 限定: {news.accessControl.allowedLicenses?.join(', ')}</span>) : (<span style={{ fontSize: '0.7rem', color: '#a0aec0', marginLeft: '10px' }}>全員公開</span>)}
            <strong style={{ marginLeft: '10px', display:'block', marginTop:'5px', fontSize:'1.1rem' }}>{news.title}</strong>
            <div style={{fontSize:'0.8rem', color:'#718096', marginTop:'4px'}}>📅 {news.publishedAt?.toDate ? news.publishedAt.toDate().toLocaleString() : ''}</div>
          </div>
          <button onClick={() => startEditNews(news)} style={styles.btnEdit}>編集</button>
          <button onClick={() => handleDelete('news', news.id)} style={styles.btnDelete}>削除</button>
        </div>
      ))}
    </div>
  );
};

export default NewsMainScreen;