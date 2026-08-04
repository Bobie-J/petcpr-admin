import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, serverTimestamp, query, orderBy, getDocs,
  getDoc, setDoc, doc, deleteDoc, updateDoc
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// 各ページコンポーネント
import PageCmsScreen from './pages/PageCmsScreen';
import UserListScreen from './pages/UserListScreen';
import UserRegScreen from './pages/UserRegScreen';
import LicenseMasterScreen from './pages/LicenseMasterScreen';
import NewsMainScreen from './pages/NewsMainScreen';
import NewsInstaScreen from './pages/NewsInstaScreen';
import BbsCheckScreen from './pages/BbsCheckScreen';
import DiagResultsScreen from './pages/DiagResultsScreen';
import DiagQuestionsScreen from './pages/DiagQuestionsScreen';
import DiagSettingsScreen from './pages/DiagSettingsScreen';
import AdminFaqManager from './pages/AdminFaqManager';

// --- Firebase設定 ---
const firebaseConfig = {
  apiKey: "AIzaSyDUlCG0Nh_Yw0zquCJ5QT43DNWIPNr_DiQ",
  authDomain: "pet-cpr.firebaseapp.com",
  projectId: "pet-cpr",
  storageBucket: "pet-cpr.firebasestorage.app",
  messagingSenderId: "180722138949",
  appId: "1:180722138949:web:fca40a7798e23ba130482c",
  measurementId: "G-3HL5V91Q25"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const App = () => {
  const navigate = useNavigate();

  // サイドバーの開閉状態
  const [isUserGroupOpen, setIsUserGroupOpen] = useState(false);
  const [isLicenseGroupOpen, setIsLicenseGroupOpen] = useState(false);
  const [isNewsGroupOpen, setIsNewsGroupOpen] = useState(false);
  const [isBbsGroupOpen, setIsBbsGroupOpen] = useState(false);
  const [isDiagGroupOpen, setIsDiagGroupOpen] = useState(false);
  const [isPageGroupOpen, setIsPageGroupOpen] = useState(false);
  const [isFaqGroupOpen, setIsFaqGroupOpen] = useState(false);

  // 状態管理
  const [licenseMasterList, setLicenseMasterList] = useState([]);
  const [users, setUsers] = useState([]);
  const [totalUserCount, setTotalUserCount] = useState(0);
  const [searchWord, setSearchWord] = useState('');
  const [bbsList, setBbsList] = useState([]);
  const [bbsSearchWord, setBbsSearchWord] = useState('');
  const [newsList, setNewsList] = useState([]);
  const [instaList, setInstaList] = useState([]);
  const [diagQuestions, setDiagQuestions] = useState([]);
  const [diagResults, setDiagResults] = useState([]);
  const [pageList, setPageList] = useState([]);

  // モーダル管理
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState({ id: '', name: '', email: '', prefecture: '' });
  const [editingUserLicenses, setEditingUserLicenses] = useState({});
  const [selectedResult, setSelectedResult] = useState(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  // データ一括取得
  const fetchData = async () => {
    const snapLicenses = await getDocs(collection(db, "licenses_master"));
    setLicenseMasterList(snapLicenses.docs.map(d => ({ id: d.id, ...d.data() })));

    const snapUsers = await getDocs(query(collection(db, "users"), orderBy("userNum", "asc")));
    const allUsers = snapUsers.docs.map(d => ({ id: d.id, ...d.data() }));
    setUsers(allUsers.filter(u => 
      (u.name && u.name.includes(searchWord)) || 
      (u.email && u.email.includes(searchWord)) || 
      (u.prefecture && u.prefecture.includes(searchWord))
    ));
    setTotalUserCount(allUsers.length);

    const snapBbs = await getDocs(query(collection(db, "bbs"), orderBy("createdAt", "desc")));
    const allBbs = snapBbs.docs.map(d => ({ id: d.id, ...d.data() }));
    setBbsList(allBbs.filter(b => 
      (b.content && b.content.includes(bbsSearchWord)) || 
      (b.userName && b.userName.includes(bbsSearchWord))
    ));

    const snapNews = await getDocs(query(collection(db, "news"), orderBy("publishedAt", "desc")));
    setNewsList(snapNews.docs.map(d => ({ id: d.id, ...d.data() })));

    const snapInsta = await getDocs(query(collection(db, "instagram"), orderBy("createdAt", "desc")));
    setInstaList(snapInsta.docs.map(d => ({ id: d.id, ...d.data() })));

    const snapDiagQ = await getDocs(query(collection(db, "diagnostic_questions"), orderBy("order", "asc")));
    setDiagQuestions(snapDiagQ.docs.map(d => ({ id: d.id, ...d.data() })));

    const snapDiagResults = await getDocs(query(collection(db, "diagnostic_results"), orderBy("createdAt", "desc")));
    setDiagResults(snapDiagResults.docs.map(d => ({ id: d.id, ...d.data() })));

    const snapPages = await getDocs(query(collection(db, "pages"), orderBy("order", "asc")));
    setPageList(snapPages.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { fetchData(); }, [searchWord, bbsSearchWord]);

  // 共通削除
  const handleDelete = async (col, id) => {
    if (!window.confirm("本当に削除しますか？")) return;
    try {
      await deleteDoc(doc(db, col, id));
      alert("削除しました");
      fetchData();
    } catch (e) { alert("削除に失敗しました: " + e.message); }
  };

// モーダルを開く処理
const openEditUserModal = (user) => {
  setEditingUser({
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    password: user.password || '', // パスワードもセット（画面上は非表示）
    prefecture: user.prefecture || ''
  });
  
  // ライセンス保持状況（has, date含む構造）をセット
  // 過去データの互換性（booleanだけで入っていた場合）もケアして変換
  const initialLicenses = {};
  if (user.licenses) {
    Object.keys(user.licenses).forEach(key => {
      const val = user.licenses[key];
      if (typeof val === 'boolean') {
        initialLicenses[key] = { has: val, date: '' };
      } else if (typeof val === 'object' && val !== null) {
        initialLicenses[key] = { has: !!val.has, date: val.date || '' };
      }
    });
  }
  setEditingUserLicenses(initialLicenses);
  setIsEditModalOpen(true);
};

// モーダル内：ライセンスのチェックボックス変更時
const handleLicenseCheckboxChangeInEdit = (licenseId, checked) => {
  setEditingUserLicenses(prev => ({
    ...prev,
    [licenseId]: {
      ...prev[licenseId],
      has: checked,
      date: checked ? (prev[licenseId]?.date || '') : '' // チェックOFF時は日付初期化
    }
  }));
};

// モーダル内：ライセンス取得日の変更時
const handleLicenseDateChangeInEdit = (licenseId, dateVal) => {
  setEditingUserLicenses(prev => ({
    ...prev,
    [licenseId]: {
      ...prev[licenseId],
      date: dateVal
    }
  }));
};

// 会員情報の更新保存処理
const handleUpdateUser = async () => {
  if (!editingUser.name || !editingUser.email) {
    return alert("氏名とメールアドレスは必須です");
  }

  try {
    await updateDoc(doc(db, "users", editingUser.id), {
      name: editingUser.name,
      email: editingUser.email,
      password: editingUser.password, // パスワードも更新対象
      prefecture: editingUser.prefecture,
      licenses: editingUserLicenses,
      updatedAt: serverTimestamp()
    });
    setIsEditModalOpen(false);
    fetchData(); // データを再取得して一覧表示を更新
    alert("会員情報を更新しました");
  } catch (e) {
    alert("更新失敗: " + e.message);
  }
};

  const openResultDetailModal = (result) => { setSelectedResult(result); setIsResultModalOpen(true); };

  // スタイル定義
  const styles = {
    container: { display: 'flex', minHeight: '100vh', background: '#f4f7f6', fontFamily: 'sans-serif', margin: '-8px' },
    sidebar: { width: '260px', background: '#1a202c', color: 'white', padding: '30px 0', position: 'fixed', height: '100vh', zIndex: 10, overflowY: 'auto' },
    groupHeader: { padding: '12px 25px', fontSize: '0.75rem', color: '#fff', background: '#2d3748', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #63b3ed', marginTop: '10px' },
    navItemLink: (isChild) => ({
      display: 'block',
      padding: '12px 25px',
      paddingLeft: isChild ? '45px' : '25px',
      color: '#a0aec0',
      textDecoration: 'none',
      fontSize: '0.9rem'
    }),
    activeNavItem: {
      background: '#4a5568',
      color: '#fff',
      fontWeight: 'bold'
    },
    main: { flex: 1, padding: '40px', marginLeft: '260px' },
    input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    modalContent: { background: 'white', padding: '30px', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }
  };

  return (
    <div style={styles.container}>
      {/* サイドバー */}
      <div style={styles.sidebar}>
        <h2 style={{ padding: '0 25px', marginBottom: '40px', color: '#63b3ed' }}>PET CPR管理画面</h2>
        
        <div style={styles.groupHeader} onClick={() => setIsPageGroupOpen(!isPageGroupOpen)}>サイト構成・ページ管理 <span>{isPageGroupOpen ? '▼' : '▶'}</span></div>
        {isPageGroupOpen && (
          <div>
            <NavLink to="/pages" style={styles.navItemLink(true)} className={({ isActive }) => isActive ? 'active-link' : ''}>└ 📄 ページ管理</NavLink>
          </div>
        )}

        <div style={styles.groupHeader} onClick={() => setIsUserGroupOpen(!isUserGroupOpen)}>会員管理 <span>{isUserGroupOpen ? '▼' : '▶'}</span></div>
        {isUserGroupOpen && (
          <div>
            <NavLink to="/users" style={styles.navItemLink(true)} end>├ 会員一覧</NavLink>
            <NavLink to="/users/register" style={styles.navItemLink(true)}>└ 会員登録</NavLink>
          </div>
        )}

        <div style={styles.groupHeader} onClick={() => setIsLicenseGroupOpen(!isLicenseGroupOpen)}>ライセンス管理 <span>{isLicenseGroupOpen ? '▼' : '▶'}</span></div>
        {isLicenseGroupOpen && (
          <div>
            <NavLink to="/licenses" style={styles.navItemLink(true)}>└ ライセンス・修了証管理</NavLink>
          </div>
        )}

        <div style={styles.groupHeader} onClick={() => setIsFaqGroupOpen(!isFaqGroupOpen)}>FAQ管理 <span>{isFaqGroupOpen ? '▼' : '▶'}</span></div>
        {isFaqGroupOpen && (
          <div>
            <NavLink to="/faqmanager" style={styles.navItemLink(true)}>└ FAQ管理</NavLink>
          </div>
        )}

        <div style={styles.groupHeader} onClick={() => setIsNewsGroupOpen(!isNewsGroupOpen)}>NEWS管理 <span>{isNewsGroupOpen ? '▼' : '▶'}</span></div>
        {isNewsGroupOpen && (
          <div>
            <NavLink to="/news" style={styles.navItemLink(true)} end>├ NEWS投稿</NavLink>
            <NavLink to="/news/instagram" style={styles.navItemLink(true)}>└ インスタ連携</NavLink>
          </div>
        )}

        <div style={styles.groupHeader} onClick={() => setIsBbsGroupOpen(!isBbsGroupOpen)}>掲示板管理 <span>{isBbsGroupOpen ? '▼' : '▶'}</span></div>
        {isBbsGroupOpen && (
          <div>
            <NavLink to="/bbs" style={styles.navItemLink(true)}>└ 掲示板確認</NavLink>
          </div>
        )}

        <div style={styles.groupHeader} onClick={() => setIsDiagGroupOpen(!isDiagGroupOpen)}>受講資格診断管理 <span>{isDiagGroupOpen ? '▼' : '▶'}</span></div>
        {isDiagGroupOpen && (
          <div>
            <NavLink to="/diagnostic/results" style={styles.navItemLink(true)}>├ 📥 診断結果一覧</NavLink>
            <NavLink to="/diagnostic/questions" style={styles.navItemLink(true)}>├ 設問の追加・編集</NavLink>
            <NavLink to="/diagnostic/settings" style={styles.navItemLink(true)}>└ 結果画面メッセージ</NavLink>
          </div>
        )}
      </div>

      {/* メインコンテンツエリア（URLパスに応じて自動切り替え） */}
      <div style={styles.main}>
        <Routes>
          <Route path="/pages" element={<PageCmsScreen db={db} pageList={pageList} fetchData={fetchData} handleDelete={handleDelete} />} />
          <Route path="/users" element={<UserListScreen users={users} totalUserCount={totalUserCount} searchWord={searchWord} setSearchWord={setSearchWord} licenseMasterList={licenseMasterList} openEditUserModal={openEditUserModal} />} />
          <Route path="/users/register" element={<UserRegScreen db={db} licenseMasterList={licenseMasterList} setActiveTab={(path) => navigate(`/${path}`)} fetchData={fetchData} />} />
          <Route path="/licenses" element={<LicenseMasterScreen db={db} storage={storage} licenseMasterList={licenseMasterList} setLicenseMasterList={setLicenseMasterList} fetchData={fetchData} />} />
          <Route path="/faqmanager" element={<AdminFaqManager db={db} />} />
          <Route path="/news" element={<NewsMainScreen db={db} newsList={newsList} licenseMasterList={licenseMasterList} fetchData={fetchData} handleDelete={handleDelete} />} />
          <Route path="/news/instagram" element={<NewsInstaScreen db={db} instaList={instaList} fetchData={fetchData} handleDelete={handleDelete} />} />
          <Route path="/bbs" element={<BbsCheckScreen db={db} storage={storage} bbsList={bbsList} bbsSearchWord={bbsSearchWord} setBbsSearchWord={setBbsSearchWord} fetchData={fetchData} />} />
          <Route path="/diagnostic/results" element={<DiagResultsScreen diagResults={diagResults} openResultDetailModal={openResultDetailModal} handleDelete={handleDelete} />} />
          <Route path="/diagnostic/questions" element={<DiagQuestionsScreen db={db} diagQuestions={diagQuestions} fetchData={fetchData} />} />
          <Route path="/diagnostic/settings" element={<DiagSettingsScreen db={db} fetchData={fetchData} />} />
          {/* デフォルトアクセス時（ルート）は会員一覧へリダイレクト */}
          <Route path="*" element={<UserListScreen users={users} totalUserCount={totalUserCount} searchWord={searchWord} setSearchWord={setSearchWord} licenseMasterList={licenseMasterList} openEditUserModal={openEditUserModal} />} />
        </Routes>
      </div>

{/* 会員編集モーダル */}
{isEditModalOpen && (
  <div style={styles.modalOverlay}>
    <div style={styles.modalContent}>
      <h2 style={{ marginTop: 0, marginBottom: '20px' }}>会員情報の編集</h2>
      
      {/* 氏名 */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>氏名 <span style={{ color: 'red' }}>*</span></label>
        <input 
          type="text" 
          style={styles.input} 
          value={editingUser.name} 
          onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} 
          placeholder="氏名"
        />
      </div>

      {/* メールアドレス */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>メールアドレス <span style={{ color: 'red' }}>*</span></label>
        <input 
          type="email" 
          style={styles.input} 
          value={editingUser.email} 
          onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} 
          placeholder="メールアドレス"
        />
      </div>

      {/* パスワード（●で表示される型） */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>パスワード</label>
        <input 
          type="password" 
          style={styles.input} 
          value={editingUser.password} 
          onChange={e => setEditingUser({ ...editingUser, password: e.target.value })} 
          placeholder="新しいパスワード（変更する場合に入力）"
        />
      </div>

      {/* 都道府県 */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>都道府県</label>
        <input 
          type="text" 
          style={styles.input} 
          value={editingUser.prefecture} 
          onChange={e => setEditingUser({ ...editingUser, prefecture: e.target.value })} 
          placeholder="都道府県（例: 東京都）"
        />
      </div>

      {/* 保持ライセンス・取得日 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>保有ライセンス・取得日</label>
        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '220px', overflowY: 'auto' }}>
          {licenseMasterList.length === 0 ? (
            <p style={{ color: '#a0aec0', margin: 0, fontSize: '0.85rem' }}>登録されているライセンスがありません</p>
          ) : (
            licenseMasterList.map(lic => {
              const userLic = editingUserLicenses[lic.id] || { has: false, date: '' };
              return (
                <div key={lic.id} style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px dashed #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <input 
                      type="checkbox"
                      checked={!!userLic.has}
                      onChange={e => handleLicenseCheckboxChangeInEdit(lic.id, e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    {lic.name || lic.title}
                  </label>
                  
                  {/* チェックが入っている時だけ取得日カレンダーを表示 */}
                  {userLic.has && (
                    <div style={{ marginLeft: '25px', marginTop: '6px' }}>
                      <label style={{ fontSize: '0.75rem', color: '#718096', display: 'block', marginBottom: '2px' }}>取得日:</label>
                      <input 
                        type="date" 
                        value={userLic.date || ''} 
                        onChange={e => handleLicenseDateChangeInEdit(lic.id, e.target.value)}
                        style={{ ...styles.input, marginBottom: 0, padding: '6px 10px', fontSize: '0.85rem', width: 'auto' }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ボタンエリア */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button 
          onClick={handleUpdateUser}
          style={{ background: '#3182ce', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          保存する
        </button>
        <button 
          onClick={() => setIsEditModalOpen(false)}
          style={{ background: '#e2e8f0', color: '#4a5568', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}
        >
          キャンセル
        </button>
      </div>
    </div>
  </div>
)}

      {/* 診断詳細モーダル */}
      {isResultModalOpen && selectedResult && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalContent, width: '650px'}}>
            <h2>📋 診断回答データ詳細</h2>
            <p>回答者: {selectedResult.respondentName}</p>
            {selectedResult.answers?.map((ans, idx) => (
              <div key={idx} style={{border: '1px solid #e2e8f0', padding: '10px', marginBottom: '10px'}}>
                <strong>Q{idx+1}. {ans.questionText}</strong>
                <p>回答: {ans.type === 'text' ? ans.userAnswerText : ans.selectedChoiceText}</p>
              </div>
            ))}
            <button onClick={() => setIsResultModalOpen(false)}>閉じる</button>
          </div>
        </div>
      )}

      {/* アクティブなサイドメニューのCSSスタイルを追加 */}
      <style>{`
        .active-link {
          background-color: #4a5568 !important;
          color: #ffffff !important;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default App;