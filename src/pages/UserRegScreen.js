import React, { useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  tabBtn: (active) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    border: 'none',
    borderBottom: active ? '3px solid #48bb78' : '3px solid transparent',
    background: 'none',
    fontWeight: active ? 'bold' : 'normal',
    color: active ? '#2f855a' : '#718096',
    fontSize: '1rem',
    marginRight: '15px'
  })
};

const UserRegScreen = ({ db, licenseMasterList, setActiveTab, fetchData }) => {
  const [mode, setMode] = useState('single'); // 'single' | 'csv'
  
  // 個別登録用 State
  const [newUser, setNewUser] = useState({ name: '', certName: '', email: '', password: '', prefecture: '' });
  const [newUserLicenses, setNewUserLicenses] = useState({});

  // CSV 一括登録用 State
  const [csvFile, setCsvFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // ----------------------------------------------------
  // 個別登録処理
  // ----------------------------------------------------
  const handleNewUserLicenseCheckbox = (id, checked) => {
    setNewUserLicenses({ ...newUserLicenses, [id]: { ...newUserLicenses[id], has: checked, date: checked ? newUserLicenses[id]?.date || '' : '' } });
  };

  const handleNewUserLicenseDate = (id, val) => {
    setNewUserLicenses({ ...newUserLicenses, [id]: { ...newUserLicenses[id], date: val } });
  };

  const handleRegisterUser = async () => {
    const { name, certName, email, password, prefecture } = newUser;
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
          userNum, 
          name, 
          certName: certName || '',
          email, 
          password, 
          prefecture, 
          needsPasswordSetup: true, 
          licenses: newUserLicenses, 
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp()
        });
      });
      setNewUser({ name: '', certName: '', email: '', password: '', prefecture: '' });
      setNewUserLicenses({});
      setActiveTab('user-list');
      fetchData();
      alert(`会員番号 ${userNum} を登録しました`);
    } catch (e) { alert("登録失敗: " + e.message); }
  };

  // ----------------------------------------------------
  // CSV ファイル解析処理（ライセンスデータ対応）
  // ----------------------------------------------------
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      parseCSV(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseCSV = (text) => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      alert("有効なデータが見つかりません。ヘッダーと最低1行のデータが必要です。");
      return;
    }

    const rows = [];
    // 1行目はヘッダーとしてスキップ
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
      if (cols.length >= 3) {
        const basicDate = cols[5] || '';
        const educatorDate = cols[6] || '';

        // Firestoreの構造（basic / educator）に合わせたオブジェクトを構築
        const licenses = {
          basic: {
            has: Boolean(basicDate),
            date: basicDate
          },
          educator: {
            has: Boolean(educatorDate),
            date: educatorDate
          }
        };

        rows.push({
          name: cols[0] || '',
          certName: cols[1] || '',
          email: cols[2] || '',
          password: cols[3] || '',
          prefecture: cols[4] || '',
          licenses
        });
      }
    }
    setParsedData(rows);
  };

  // ----------------------------------------------------
  // CSV 一括登録処理
  // ----------------------------------------------------
  const handleBulkRegisterCSV = async () => {
    if (parsedData.length === 0) return alert("登録対象のデータがありません");
    if (!window.confirm(`${parsedData.length} 件の会員を一括登録しますか？`)) return;

    setIsProcessing(true);
    let successCount = 0;

    try {
      for (const row of parsedData) {
        if (!row.name || !row.email || !row.password) continue;

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
            userNum,
            name: row.name,
            certName: row.certName || '',
            email: row.email,
            password: row.password,
            prefecture: row.prefecture || '',
            needsPasswordSetup: true,
            licenses: row.licenses, // 👈 basic, educator のライセンス情報を反映
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });
        successCount++;
      }

      alert(`${successCount} 件の会員を正常に登録しました！`);
      setCsvFile(null);
      setParsedData([]);
      setActiveTab('user-list');
      fetchData();
    } catch (e) {
      alert("一括登録中にエラーが発生しました: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h1>会員新規登録</h1>

      {/* タブ切替 */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
        <button style={styles.tabBtn(mode === 'single')} onClick={() => setMode('single')}>
          👤 個別登録
        </button>
        <button style={styles.tabBtn(mode === 'csv')} onClick={() => setMode('csv')}>
          📂 CSV一括登録
        </button>
      </div>

      {/* A. 個別登録フォーム */}
      {mode === 'single' && (
        <div style={styles.card}>
          <h3>基本情報</h3>
          <input type="text" placeholder="氏名 *" style={styles.input} value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
          
          <div style={{ marginBottom: '15px' }}>
            <input 
              type="text" 
              placeholder="修了証用表記名（例：PET TARO ※空欄の場合は氏名が使われます）" 
              style={{ ...styles.input, marginBottom: '5px' }} 
              value={newUser.certName} 
              onChange={e => setNewUser({ ...newUser, certName: e.target.value })} 
            />
            <span style={{ fontSize: '0.75rem', color: '#718096' }}>※ 修了証PDFに印字される氏名です。指定がない場合は上記の「氏名」が反映されます。</span>
          </div>

          <input type="email" placeholder="メールアドレス *" style={styles.input} value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
          <input type="password" placeholder="パスワード *" style={styles.input} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
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
      )}

      {/* B. CSV一括登録フォーム */}
      {mode === 'csv' && (
        <div style={styles.card}>
          <h3>CSVファイルの選択</h3>
          <p style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '15px' }}>
            フォーマット（1行目はヘッダー行として読み飛ばされます）：<br />
            <code>氏名,修了証用表記名,メールアドレス,パスワード,都道府県,ベーシック取得日,エデュケーター取得日</code><br />
            <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>※取得日は YYYY-MM-DD 形式（例: 2026-06-02）で入力してください。未取得の場合は空欄で問題ありません。</span>
          </p>

          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange} 
            style={{ marginBottom: '20px' }}
          />

          {/* プレビュー表示 */}
          {parsedData.length > 0 && (
            <div>
              <h4>取り込みプレビュー（{parsedData.length} 件）</h4>
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f7fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>氏名</th>
                      <th style={{ padding: '8px' }}>メール</th>
                      <th style={{ padding: '8px' }}>都道府県</th>
                      <th style={{ padding: '8px' }}>ベーシック</th>
                      <th style={{ padding: '8px' }}>エデュケーター</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                        <td style={{ padding: '8px' }}>{row.name}</td>
                        <td style={{ padding: '8px' }}>{row.email}</td>
                        <td style={{ padding: '8px' }}>{row.prefecture || '-'}</td>
                        <td style={{ padding: '8px' }}>
                          {row.licenses.basic.has ? `〇 (${row.licenses.basic.date})` : '-'}
                        </td>
                        <td style={{ padding: '8px' }}>
                          {row.licenses.educator.has ? `〇 (${row.licenses.educator.date})` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button 
                onClick={handleBulkRegisterCSV} 
                disabled={isProcessing}
                style={{ 
                  padding: '12px 24px', 
                  background: isProcessing ? '#cbd5e0' : '#3182ce', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: 'bold', 
                  cursor: isProcessing ? 'not-allowed' : 'pointer' 
                }}
              >
                {isProcessing ? '登録処理中...' : `${parsedData.length} 件を一括登録する`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserRegScreen;