import React, { useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }
};

const UserRegScreen = ({ db, licenseMasterList, setActiveTab, fetchData }) => {
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', prefecture: '' });
  const [newUserLicenses, setNewUserLicenses] = useState({});

  const handleNewUserLicenseCheckbox = (id, checked) => {
    setNewUserLicenses({ ...newUserLicenses, [id]: { ...newUserLicenses[id], has: checked, date: checked ? newUserLicenses[id]?.date || '' : '' } });
  };

  const handleNewUserLicenseDate = (id, val) => {
    setNewUserLicenses({ ...newUserLicenses, [id]: { ...newUserLicenses[id], date: val } });
  };

  const handleRegisterUser = async () => {
    const { name, email, password, prefecture } = newUser;
    if (!name || !email || !password) return alert("氏名、メール、パスワードは必須です");
    try {
      const counterRef = doc(db, "settings", "counters");
      let userNum = 1;
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (counterDoc.exists()) {
          userNum = counterDoc.data().userCount + 1;
          transaction.update(counterRef, { userCount: userNum });
        } else {
          transaction.set(counterRef, { userCount: 1 });
        }
        transaction.set(doc(db, "users", String(userNum)), {
          userNum, name, email, password, prefecture, needsPasswordSetup: true, licenses: newUserLicenses, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
      });
      setNewUser({ name: '', email: '', password: '', prefecture: '' });
      setNewUserLicenses({});
      setActiveTab('user-list');
      fetchData();
      alert(`会員番号 ${userNum} を登録しました`);
    } catch (e) { alert("登録失敗: " + e.message); }
  };

  return (
    <div>
      <h1>会員新規登録</h1>
      <div style={styles.card}>
        <h3>基本情報</h3>
        <input type="text" placeholder="氏名" style={styles.input} value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
        <input type="email" placeholder="メールアドレス" style={styles.input} value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
        <input type="password" placeholder="パスワード" style={styles.input} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
        <input type="text" placeholder="都道府県" style={styles.input} value={newUser.prefecture} onChange={e => setNewUser({...newUser, prefecture: e.target.value})} />
        
        <h3>ライセンス指定</h3>
        <div style={{padding:'15px', background:'#f8fafc', borderRadius:'8px', marginBottom:'15px'}}>
          {licenseMasterList.map(master => (
            <div key={master.id} style={{marginBottom: '10px'}}>
              <label style={{cursor:'pointer'}}><input type="checkbox" checked={newUserLicenses[master.id]?.has || false} onChange={e => handleNewUserLicenseCheckbox(master.id, e.target.checked)} /> {master.name}</label>
              {newUserLicenses[master.id]?.has && <input type="date" style={{...styles.input, marginTop:'5px'}} value={newUserLicenses[master.id]?.date || ''} onChange={e => handleNewUserLicenseDate(master.id, e.target.value)} />}
            </div>
          ))}
        </div>
        <button onClick={handleRegisterUser} style={{ padding: '12px 24px', background: '#48bb78', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>会員を登録する</button>
      </div>
    </div>
  );
};

export default UserRegScreen;