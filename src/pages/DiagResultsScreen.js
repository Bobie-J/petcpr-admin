import React from 'react';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #edf2f7', color: '#718096', fontSize: '0.85rem' },
  td: { padding: '12px', borderBottom: '1px solid #edf2f7', fontSize: '0.9rem' },
  badgeGreen: { padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', background: '#c6f6d5', color: '#22543d', fontWeight: 'bold' },
  badgeRed: { padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', background: '#fed7d7', color: '#9b2c2c', fontWeight: 'bold' },
  btnEdit: { color: '#3182ce', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' },
  btnDelete: { color: '#e53e3e', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }
};

const DiagResultsScreen = ({ diagResults, openResultDetailModal, handleDelete }) => {
  return (
    <div>
      <h1>📥 受講資格診断 回答結果一覧</h1>
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>回答日時</th>
              <th style={styles.th}>回答者情報</th>
              <th style={styles.th}>判定ステータス</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {diagResults.length === 0 ? (
              <tr><td colSpan="4" style={{...styles.td, textAlign:'center', color:'#a0aec0', padding:'30px'}}>まだ診断ログがありません。</td></tr>
            ) : (
              diagResults.map(result => (
                <tr key={result.id}>
                  <td style={styles.td}>{result.createdAt?.toDate ? result.createdAt.toDate().toLocaleString() : '---'}</td>
                  <td style={styles.td}>
                    <strong>{result.respondentName || '匿名ユーザー'}</strong>
                    <div style={{fontSize:'0.75rem', color:'#718096'}}>{result.respondentEmail || 'メール登録なし'}</div>
                  </td>
                  <td style={styles.td}>{result.isPassed ? <span style={styles.badgeGreen}>🎉 受講要件クリア(合格)</span> : <span style={styles.badgeRed}>⚠️ 要件不足(不合格判定)</span>}</td>
                  <td style={styles.td}>
                    <button onClick={() => openResultDetailModal(result)} style={{...styles.btnEdit, background:'#ebf8ff', padding:'6px 12px', borderRadius:'6px'}}>👁️ 詳細を見る</button>
                    <button onClick={() => handleDelete('diagnostic_results', result.id)} style={{...styles.btnDelete, marginLeft:'15px'}}>削除</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DiagResultsScreen;