import React, { useState, useEffect } from 'react';
import { setDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }
};

const DiagSettingsScreen = ({ db, fetchData }) => {
  const [diagSuccessTitle, setDiagSuccessTitle] = useState('');
  const [diagSuccessContent, setDiagSuccessContent] = useState('');
  const [diagFailTitle, setDiagFailTitle] = useState('');
  const [diagFailContent, setDiagFailContent] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const docDiagSetting = await getDoc(doc(db, "settings", "diagnostic"));
      if (docDiagSetting.exists()) {
        const data = docDiagSetting.data();
        setDiagSuccessTitle(data.successTitle || '');
        setDiagSuccessContent(data.successContent || '');
        setDiagFailTitle(data.failTitle || '');
        setDiagFailContent(data.failContent || '');
      }
    };
    loadSettings();
  }, [db]);

  const handleSaveDiagSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "diagnostic"), {
        successTitle: diagSuccessTitle,
        successContent: diagSuccessContent,
        failTitle: diagFailTitle,
        failContent: diagFailContent,
        updatedAt: serverTimestamp()
      });
      alert("診断結果画面の設定を保存しました");
      fetchData();
    } catch (e) { alert("設定保存失敗: " + e.message); }
  };

  return (
    <div>
      <h1>⚙️ 診断結果メッセージの編集</h1>
      <div style={styles.card}>
        <h3>合格時</h3>
        <input type="text" value={diagSuccessTitle} onChange={e => setDiagSuccessTitle(e.target.value)} style={styles.input} />
        <ReactQuill theme="snow" value={diagSuccessContent} onChange={setDiagSuccessContent} style={{height:'200px', marginBottom:'50px'}} />
      </div>
      <div style={styles.card}>
        <h3>不合格時</h3>
        <input type="text" value={diagFailTitle} onChange={e => setDiagFailTitle(e.target.value)} style={styles.input} />
        <ReactQuill theme="snow" value={diagFailContent} onChange={setDiagFailContent} style={{height:'200px', marginBottom:'50px'}} />
      </div>
      <button onClick={handleSaveDiagSettings} style={{padding:'12px 24px', background:'#3182ce', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>保存する</button>
    </div>
  );
};

export default DiagSettingsScreen;