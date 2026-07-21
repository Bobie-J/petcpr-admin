import React, { useState } from 'react';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  table: { width: '100%', borderCollapse: 'collapse' },
  td: { padding: '12px', borderBottom: '1px solid #edf2f7', fontSize: '0.9rem' }
};

const LicenseMasterScreen = ({ db, storage, licenseMasterList, setLicenseMasterList, fetchData }) => {
  const [newLicenseMaster, setNewLicenseMaster] = useState({ id: '', name: '' });
  const [uploadingLicenseId, setUploadingLicenseId] = useState(null);

  const handleAddLicenseMaster = async () => {
    const { id, name } = newLicenseMaster;
    if (!id || !name) return alert("ライセンスIDとライセンス名は必須です");
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return alert("ライセンスIDは半角英数字で入力してください");
    try {
      const docRef = doc(db, "licenses_master", id.toLowerCase());
      if ((await getDoc(docRef)).exists()) return alert("このライセンスIDは既に登録されています");
      await setDoc(docRef, { name, certFileUrl: '', createdAt: serverTimestamp() });
      setNewLicenseMaster({ id: '', name: '' });
      fetchData();
      alert("ライセンスを追加しました");
    } catch (e) { alert("追加失敗: " + e.message); }
  };

  const handleFileChange = async (e, licenseId) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLicenseId(licenseId);
    try {
      const storageRef = ref(storage, `certificate_templates/${licenseId}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "licenses_master", licenseId), { certFileUrl: downloadUrl, updatedAt: serverTimestamp() });
      fetchData();
      alert("修了証フォーマットを更新しました");
    } catch (e) { alert("アップロード失敗: " + e.message); } finally { setUploadingLicenseId(null); }
  };

  return (
    <div>
      <h1>ライセンス・修了証マスター管理</h1>
      <div style={styles.card}>
        <h3>新しいライセンスの追加</h3>
        <div style={{display: 'flex', gap: '15px'}}>
          <input type="text" placeholder="ライセンスID" style={styles.input} value={newLicenseMaster.id} onChange={e => setNewLicenseMaster({...newLicenseMaster, id: e.target.value})} />
          <input type="text" placeholder="ライセンス名" style={styles.input} value={newLicenseMaster.name} onChange={(e) => setNewLicenseMaster({...newLicenseMaster, name: e.target.value})} />
        </div>
        <button onClick={handleAddLicenseMaster} style={{ padding: '12px 24px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>追加</button>
      </div>

      <div style={styles.card}>
        <h3>登録済み一覧</h3>
        <table style={styles.table}>
          <thead><tr><th>ID</th><th>表示名</th><th>修了証フォーマット</th><th style={{textAlign:'right'}}>操作</th></tr></thead>
          <tbody>
            {licenseMasterList.map(item => (
              <tr key={item.id}>
                <td style={styles.td}><code>{item.id}</code></td>
                <td style={styles.td}>
                  <input type="text" value={item.name} style={{...styles.input, marginBottom:0, padding:'6px'}} onChange={async (e) => {
                    const n = e.target.value;
                    setLicenseMasterList(licenseMasterList.map(l => l.id === item.id ? {...l, name: n} : l));
                    await updateDoc(doc(db, "licenses_master", item.id), { name: n });
                  }} />
                </td>
                <td style={styles.td}>{item.certFileUrl ? <a href={item.certFileUrl} target="_blank" rel="noreferrer" style={{color:'#319795', fontWeight:'bold'}}>📄 確認</a> : <span style={{color:'#e53e3e'}}>❌ 未登録</span>}</td>
                <td style={{...styles.td, textAlign:'right'}}>
                  <label style={{padding:'6px 12px', background:'#edf2f7', borderRadius:'6px', cursor:'pointer', fontSize:'0.8rem'}}>
                    {uploadingLicenseId === item.id ? '⌛...' : '🔄 差し替え'}
                    <input type="file" accept="application/pdf,image/*" style={{display:'none'}} onChange={(e) => handleFileChange(e, item.id)} />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LicenseMasterScreen;