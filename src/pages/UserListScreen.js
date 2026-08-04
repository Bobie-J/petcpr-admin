import React from 'react';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #edf2f7', color: '#718096', fontSize: '0.85rem' },
  td: { padding: '12px', borderBottom: '1px solid #edf2f7', fontSize: '0.9rem' },
  btnEdit: { color: '#3182ce', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }
};

const UserListScreen = ({ users, totalUserCount, searchWord, setSearchWord, licenseMasterList, openEditUserModal }) => {
  return (
    <div>
      <h1>会員一覧 <span style={{fontSize:'1.1rem', color:'#718096'}}>(全: {totalUserCount}件)</span></h1>
      <div style={styles.card}>
        <input type="text" placeholder="氏名、メール、都道府県で検索..." value={searchWord} onChange={(e) => setSearchWord(e.target.value)} style={styles.input} />
      </div>
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>No.</th>
              <th style={styles.th}>氏名</th>
              <th style={styles.th}>メールアドレス</th>
              <th style={styles.th}>都道府県</th>
              <th style={styles.th}>保有ライセンス</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={styles.td}>{u.userNum}</td>
                <td style={styles.td}>
                  <strong>{u.name}</strong>
                  {/* 💡 修了証用名義（certName）が登録されている場合のみ表示 */}
                  {u.certName && (
                    <div style={{ fontSize: '0.75rem', color: '#3182ce', marginTop: '3px' }}>
                      📄 修了証名義: {u.certName}
                    </div>
                  )}
                </td>
                <td style={styles.td}>{u.email}</td>
                <td style={styles.td}>{u.prefecture}</td>
                <td style={styles.td}>
                  {licenseMasterList.map(master => {
                    const userLic = u.licenses?.[master.id];
                    return userLic?.has ? <div key={master.id} style={{fontSize:'0.75rem', color:'#2b6cb0'}}>● {master.name} ({userLic.date || '未設定'})</div> : null;
                  })}
                </td>
                <td style={styles.td}><button style={styles.btnEdit} onClick={() => openEditUserModal(u)}>編集</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserListScreen;