import React, { useState } from 'react';
import { addDoc, updateDoc, deleteDoc, doc, collection, serverTimestamp } from 'firebase/firestore';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box', height: '80px', fontFamily: 'sans-serif' },
  btnSecondary: { padding: '6px 12px', background: '#edf2f7', color: '#4a5568', border: '1px solid #cbd5e0', borderRadius: '6px', cursor: 'pointer' },
  btnDanger: { padding: '6px 12px', background: '#fed7d7', color: '#9b2c2c', border: '1px solid #feb2b2', borderRadius: '6px', cursor: 'pointer' }
};

const DiagQuestionsScreen = ({ db, diagQuestions = [], fetchData }) => {
  const [diagEditId, setDiagEditId] = useState(null);
  const [diagQuestionText, setDiagQuestionText] = useState('');
  const [diagDescription, setDiagDescription] = useState('');
  const [diagType, setDiagType] = useState('choice');
  const [diagRequired, setDiagRequired] = useState(true);
  const [diagOrder, setDiagOrder] = useState(diagQuestions.length + 1);
  const [diagChoices, setDiagChoices] = useState([{ text: '', isQualified: true, allowFreeText: false }]);

  // 1. 選択肢操作
  const handleAddDiagChoice = () => { setDiagChoices([...diagChoices, { text: '', isQualified: true, allowFreeText: false }]); };
  const handleRemoveDiagChoice = (index) => {
    if (diagChoices.length === 1) return alert("選択肢は最低1つ必要です");
    setDiagChoices(diagChoices.filter((_, i) => i !== index));
  };

  const handleUpdateDiagChoiceField = (index, field, value) => {
    const updated = diagChoices.map((c, i) => i === index ? { ...c, [field]: value } : c);
    setDiagChoices(updated);
  };

  // 2. 保存・更新
  const handleSaveDiagQuestion = async () => {
    if (!diagQuestionText.trim()) return alert("設問内容を入力してください");
    if (diagType === 'choice') {
      const hasEmptyChoice = diagChoices.some(c => !c.text.trim());
      if (hasEmptyChoice) return alert("空欄の選択肢があります。入力するか削除してください");
    }
    const payload = { 
      questionText: diagQuestionText, 
      description: diagDescription.trim(), 
      type: diagType, 
      isRequired: diagRequired, 
      order: Number(diagOrder), 
      choices: diagType === 'choice' ? diagChoices : [], 
      updatedAt: serverTimestamp() 
    };
    try {
      if (diagEditId) {
        await updateDoc(doc(db, "diagnostic_questions", diagEditId), payload);
        alert("設問を更新しました");
      } else {
        await addDoc(collection(db, "diagnostic_questions"), payload);
        alert("新しい設問を追加しました");
      }
      resetDiagForm();
      if (fetchData) fetchData();
    } catch (e) { alert("保存失敗: " + e.message); }
  };

  // 3. 編集開始（フォームにデータを反映）
  const handleEditInit = (q) => {
    setDiagEditId(q.id);
    setDiagQuestionText(q.questionText || '');
    setDiagDescription(q.description || '');
    setDiagType(q.type || 'choice');
    setDiagRequired(q.isRequired !== undefined ? q.isRequired : true);
    setDiagOrder(q.order || 1);
    setDiagChoices(q.choices && q.choices.length > 0 ? q.choices : [{ text: '', isQualified: true, allowFreeText: false }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 4. 設問の削除
  const handleDeleteQuestion = async (id, text) => {
    if (!window.confirm(`「${text}」を削除してもよろしいですか？`)) return;
    try {
      await deleteDoc(doc(db, "diagnostic_questions", id));
      alert("設問を削除しました");
      if (diagEditId === id) resetDiagForm();
      if (fetchData) fetchData();
    } catch (e) { alert("削除失敗: " + e.message); }
  };

  // 5. 表示順の変更（上移動 / 下移動）
  const handleMoveOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedQuestions.length) return;

    const currentQ = sortedQuestions[index];
    const targetQ = sortedQuestions[targetIndex];

    try {
      // 2つのドキュメントの order 値を入れ替え
      await updateDoc(doc(db, "diagnostic_questions", currentQ.id), { order: targetQ.order });
      await updateDoc(doc(db, "diagnostic_questions", targetQ.id), { order: currentQ.order });
      if (fetchData) fetchData();
    } catch (e) { alert("順序変更失敗: " + e.message); }
  };

  // 6. フォームのリセット
  const resetDiagForm = () => {
    setDiagEditId(null); 
    setDiagQuestionText(''); 
    setDiagDescription(''); 
    setDiagType('choice'); 
    setDiagRequired(true); 
    setDiagOrder(diagQuestions.length + 1); 
    setDiagChoices([{ text: '', isQualified: true, allowFreeText: false }]);
  };

  // order 順でソートした設問一覧
  const sortedQuestions = [...diagQuestions].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div>
      <h1>{diagEditId ? '⚙️ 設問の編集' : '✨ 資格診断の設問新規追加'}</h1>
      
      {/* --- 入力・編集フォーム --- */}
      <div style={styles.card}>
        <div style={{ display: 'flex', gap: '20px', background: '#edf2f7', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.85rem', color: '#4a5568', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>💡 設問タイプ</label>
            <label style={{ marginRight: '20px', cursor: 'pointer' }}><input type="radio" name="diagType" value="choice" checked={diagType === 'choice'} onChange={() => setDiagType('choice')} /> 選択肢形式</label>
            <label style={{ cursor: 'pointer' }}><input type="radio" name="diagType" value="text" checked={diagType === 'text'} onChange={() => setDiagType('text')} /> 自由記述形式</label>
          </div>
          <div style={{ width: '200px' }}>
            <label style={{ fontSize: '0.85rem', color: '#4a5568', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📌 解答の必須設定</label>
            <select value={diagRequired ? 'true' : 'false'} onChange={(e) => setDiagRequired(e.target.value === 'true')} style={{ ...styles.input, marginBottom: 0, padding: '8px' }}>
              <option value="true">必須</option>
              <option value="false">任意</option>
            </select>
          </div>
        </div>
        <div style={{display:'flex', gap:'20px'}}>
          <div style={{flex:1}}>
            <label style={{fontSize:'0.85rem', color:'#718096', fontWeight:'bold'}}>設問文</label>
            <input type="text" value={diagQuestionText} onChange={e => setDiagQuestionText(e.target.value)} style={styles.input} />
          </div>
          <div style={{width:'120px'}}>
            <label style={{fontSize:'0.85rem', color:'#718096', fontWeight:'bold'}}>表示順</label>
            <input type="number" value={diagOrder} onChange={e => setDiagOrder(e.target.value)} style={styles.input} />
          </div>
        </div>
        <textarea placeholder="補足説明文" value={diagDescription} onChange={e => setDiagDescription(e.target.value)} style={styles.textarea} />
        
        {diagType === 'choice' && (
          <div>
            {diagChoices.map((choice, index) => (
              <div key={index} style={{display:'flex', background:'#f8fafc', padding:'15px', borderRadius:'8px', gap:'15px', alignItems:'center', marginBottom:'12px'}}>
                <input type="text" value={choice.text} onChange={e => handleUpdateDiagChoiceField(index, 'text', e.target.value)} style={{...styles.input, marginBottom:0, flex:1}} />
                <button onClick={() => handleUpdateDiagChoiceField(index, 'isQualified', true)} style={{padding:'6px 12px', background: choice.isQualified ? '#48bb78' : '#fff', color: choice.isQualified ? '#fff' : '#4a5568', cursor:'pointer', border:'1px solid #cbd5e0', borderRadius:'4px'}}>合格</button>
                <button onClick={() => handleUpdateDiagChoiceField(index, 'isQualified', false)} style={{padding:'6px 12px', background: !choice.isQualified ? '#f56565' : '#fff', color: !choice.isQualified ? '#fff' : '#4a5568', cursor:'pointer', border:'1px solid #cbd5e0', borderRadius:'4px'}}>不合格</button>
                <button onClick={() => handleRemoveDiagChoice(index)} style={{color:'#e53e3e', border:'none', background:'none', cursor:'pointer'}}>❌</button>
              </div>
            ))}
            <button onClick={handleAddDiagChoice} style={{marginBottom:'15px', cursor:'pointer'}}>➕ 選択肢を追加</button>
          </div>
        )}
        <div style={{borderTop:'1px solid #edf2f7', paddingTop:'20px', display: 'flex', gap: '10px'}}>
          <button onClick={handleSaveDiagQuestion} style={{padding:'10px 20px', background:'#3182ce', color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}>{diagEditId ? '変更保存' : '新規登録'}</button>
          {diagEditId && (
            <button onClick={resetDiagForm} style={styles.btnSecondary}>キャンセル</button>
          )}
        </div>
      </div>

      {/* --- 登録済み設問一覧 --- */}
      <h2>📋 設問一覧・並び替え</h2>
      {sortedQuestions.length === 0 ? (
        <div style={{ ...styles.card, textAlign: 'center', color: '#a0aec0' }}>登録された設問はまだありません。</div>
      ) : (
        sortedQuestions.map((q, index) => (
          <div key={q.id || index} style={{ ...styles.card, marginBottom: '15px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', marginRight: '8px', fontWeight: 'bold' }}>
                  No.{q.order || index + 1}
                </span>
                <span style={{ background: q.type === 'choice' ? '#ebf8ff' : '#feebc8', color: q.type === 'choice' ? '#2b6cb0' : '#c05621', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', marginRight: '8px' }}>
                  {q.type === 'choice' ? '選択肢形式' : '自由記述形式'}
                </span>
                <span style={{ background: q.isRequired ? '#fed7d7' : '#edf2f7', color: q.isRequired ? '#9b2c2c' : '#4a5568', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                  {q.isRequired ? '必須' : '任意'}
                </span>
                <h3 style={{ margin: '10px 0 5px 0', fontSize: '1.1rem' }}>{q.questionText}</h3>
                {q.description && <p style={{ color: '#718096', fontSize: '0.9rem', margin: '0 0 10px 0' }}>{q.description}</p>}
                
                {/* 選択肢一覧表示 */}
                {q.type === 'choice' && q.choices && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {q.choices.map((c, i) => (
                      <span key={i} style={{ background: '#f7fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem' }}>
                        {c.text} {c.isQualified ? '🟢(合格)' : '🔴(不合格)'}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 操作ボタンエリア */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => handleMoveOrder(index, 'up')} disabled={index === 0} style={{ ...styles.btnSecondary, opacity: index === 0 ? 0.4 : 1 }}>▲ 上へ</button>
                  <button onClick={() => handleMoveOrder(index, 'down')} disabled={index === sortedQuestions.length - 1} style={{ ...styles.btnSecondary, opacity: index === sortedQuestions.length - 1 ? 0.4 : 1 }}>▼ 下へ</button>
                </div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                  <button onClick={() => handleEditInit(q)} style={{ ...styles.btnSecondary, background: '#ebf8ff', color: '#2b6cb0', borderColor: '#bee3f8' }}>✏️ 編集</button>
                  <button onClick={() => handleDeleteQuestion(q.id, q.questionText)} style={styles.btnDanger}>🗑️ 削除</button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default DiagQuestionsScreen;