import React, { useState } from 'react';
import { addDoc, updateDoc, doc, collection, serverTimestamp } from 'firebase/firestore';

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box', height: '80px', fontFamily: 'sans-serif' }
};

const DiagQuestionsScreen = ({ db, diagQuestions, fetchData }) => {
  const [diagEditId, setDiagEditId] = useState(null);
  const [diagQuestionText, setDiagQuestionText] = useState('');
  const [diagDescription, setDiagDescription] = useState('');
  const [diagType, setDiagType] = useState('choice');
  const [diagRequired, setDiagRequired] = useState(true);
  const [diagOrder, setDiagOrder] = useState(diagQuestions.length + 1);
  const [diagChoices, setDiagChoices] = useState([{ text: '', isQualified: true, allowFreeText: false }]);

  const handleAddDiagChoice = () => { setDiagChoices([...diagChoices, { text: '', isQualified: true, allowFreeText: false }]); };
  const handleRemoveDiagChoice = (index) => {
    if (diagChoices.length === 1) return alert("選択肢は最低1つ必要です");
    setDiagChoices(diagChoices.filter((_, i) => i !== index));
  };

  const handleUpdateDiagChoiceField = (index, field, value) => {
    const updated = diagChoices.map((c, i) => i === index ? { ...c, [field]: value } : c);
    setDiagChoices(updated);
  };

  const handleSaveDiagQuestion = async () => {
    if (!diagQuestionText.trim()) return alert("設問内容を入力してください");
    if (diagType === 'choice') {
      const hasEmptyChoice = diagChoices.some(c => !c.text.trim());
      if (hasEmptyChoice) return alert("空欄の選択肢があります。入力するか削除してください");
    }
    const payload = { questionText: diagQuestionText, description: diagDescription.trim(), type: diagType, isRequired: diagRequired, order: Number(diagOrder), choices: diagType === 'choice' ? diagChoices : [], updatedAt: serverTimestamp() };
    try {
      if (diagEditId) {
        await updateDoc(doc(db, "diagnostic_questions", diagEditId), payload);
        alert("設問を更新しました");
      } else {
        await addDoc(collection(db, "diagnostic_questions"), payload);
        alert("新しい設問を追加しました");
      }
      resetDiagForm();
      fetchData();
    } catch (e) { alert("保存失敗: " + e.message); }
  };

  const resetDiagForm = () => {
    setDiagEditId(null); setDiagQuestionText(''); setDiagDescription(''); setDiagType('choice'); setDiagRequired(true); setDiagOrder(diagQuestions.length + 1); setDiagChoices([{ text: '', isQualified: true, allowFreeText: false }]);
  };

  return (
    <div>
      <h1>{diagEditId ? '⚙️ 設問の編集' : '✨ 資格診断の設問新規追加'}</h1>
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
                <button onClick={() => handleUpdateDiagChoiceField(index, 'isQualified', true)} style={{padding:'6px 12px', background: choice.isQualified ? '#48bb78' : '#fff', color: choice.isQualified ? '#fff' : '#4a5568', cursor:'pointer'}}>合格</button>
                <button onClick={() => handleUpdateDiagChoiceField(index, 'isQualified', false)} style={{padding:'6px 12px', background: !choice.isQualified ? '#f56565' : '#fff', color: !choice.isQualified ? '#fff' : '#4a5568', cursor:'pointer'}}>不合格</button>
                <button onClick={() => handleRemoveDiagChoice(index)} style={{color:'#e53e3e', border:'none', background:'none', cursor:'pointer'}}>❌</button>
              </div>
            ))}
            <button onClick={handleAddDiagChoice} style={{marginBottom:'15px', cursor:'pointer'}}>➕ 選択肢を追加</button>
          </div>
        )}
        <div style={{borderTop:'1px solid #edf2f7', paddingTop:'20px'}}>
          <button onClick={handleSaveDiagQuestion} style={{padding:'10px 20px', background:'#3182ce', color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}>{diagEditId ? '変更保存' : '新規登録'}</button>
        </div>
      </div>
    </div>
  );
};

export default DiagQuestionsScreen;