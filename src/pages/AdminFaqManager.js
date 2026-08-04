import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';

// 💡 [表示文字](URL) と https://... の両方をリンク化するヘルパー関数
const renderFormattedAnswer = (text) => {
  if (!text) return null;

  // Markdown形式の [テキスト](URL) または 通常の URL (https://...) にマッチする正規表現
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;

  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // マッチする前のテキストを追加
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      // 💡 [テキスト](URL) 形式の場合
      const label = match[1];
      const url = match[2];
      elements.push(
        <a 
          key={match.index} 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 'bold' }}
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </a>
      );
    } else if (match[3]) {
      // 💡 直貼り URL の場合
      const url = match[3];
      elements.push(
        <a 
          key={match.index} 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // 残りのテキストを追加
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements;
};

const AdminFaqManager = ({ db }) => {
  const [faqList, setFaqList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    question: '',
    answer: '',
    order: 0
  });

  const fetchFaqs = async () => {
    if (!db) return;
    try {
      setLoading(true);
      const q = query(collection(db, "faqs"), orderBy("order", "asc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFaqList(list);
    } catch (error) {
      console.error("FAQ取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, [db]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'order' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) {
      alert("質問と回答の両方を入力してください。");
      return;
    }

    try {
      if (editingId) {
        const faqRef = doc(db, "faqs", editingId);
        await updateDoc(faqRef, {
          question: form.question,
          answer: form.answer,
          order: form.order,
          updatedAt: serverTimestamp()
        });
        alert("FAQを更新しました！");
      } else {
        await addDoc(collection(db, "faqs"), {
          question: form.question,
          answer: form.answer,
          order: form.order || faqList.length + 1,
          createdAt: serverTimestamp()
        });
        alert("FAQを追加しました！");
      }

      setForm({ question: '', answer: '', order: 0 });
      setEditingId(null);
      fetchFaqs();
    } catch (error) {
      console.error("FAQ保存エラー:", error);
      alert("保存に失敗しました: " + error.message);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      question: item.question,
      answer: item.answer,
      order: item.order || 0
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ question: '', answer: '', order: 0 });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("このFAQを削除してもよろしいですか？")) return;

    try {
      await deleteDoc(doc(db, "faqs", id));
      alert("削除しました。");
      fetchFaqs();
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました。");
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        💡 FAQ（よくあるご質問）管理
      </h2>

      {/* 登録・編集フォーム */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
        <h3 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>
          {editingId ? "✏️ FAQの編集" : "➕ 新規FAQの追加"}
        </h3>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>質問 (Q)</label>
          <input 
            type="text" 
            name="question"
            value={form.question} 
            onChange={handleChange} 
            placeholder="例：ペットCPRの受講に資格は必要ですか？"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>回答 (A)</label>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>
              💡 文字リンク入力例: <code style={{ backgroundColor: '#e5e7eb', padding: '2px 4px', borderRadius: '3px' }}>[表示文字](URL)</code>
            </span>
          </div>
          <textarea 
            name="answer"
            value={form.answer} 
            onChange={handleChange} 
            rows={3}
            placeholder="例：詳細については [公式ページ](https://gemini.google.com) をご確認ください。"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
          />
        </div>

        <div style={{ width: '120px', marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>表示順</label>
          <input 
            type="number" 
            name="order"
            value={form.order} 
            onChange={handleChange} 
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="submit" 
            style={{ backgroundColor: '#18181b', color: '#fff', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', border: 'none' }}
          >
            {editingId ? "更新する" : "追加する"}
          </button>
          {editingId && (
            <button 
              type="button" 
              onClick={cancelEdit}
              style={{ backgroundColor: '#e4e4e7', color: '#18181b', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', border: 'none' }}
            >
              キャンセル
            </button>
          )}
        </div>
      </form>

      {/* FAQ一覧 */}
      {loading ? (
        <p style={{ color: '#a1a1aa', fontSize: '14px' }}>読み込み中...</p>
      ) : faqList.length === 0 ? (
        <p style={{ color: '#a1a1aa', fontSize: '14px' }}>登録されているFAQはありません。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqList.map(item => (
            <div key={item.id} style={{ border: '1px solid #e5e7eb', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ backgroundColor: '#f4f4f5', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e4e4e7' }}>
                    順序: {item.order ?? 0}
                  </span>
                  <strong style={{ fontSize: '14px', color: '#18181b' }}>Q. {item.question}</strong>
                </div>
                <p style={{ fontSize: '12px', color: '#52525b', margin: 0, whiteSpace: 'pre-wrap' }}>
                  A. {renderFormattedAnswer(item.answer)}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button 
                  onClick={() => startEdit(item)}
                  style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                >
                  編集
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFaqManager;