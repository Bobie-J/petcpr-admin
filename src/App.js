import React, { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, query, orderBy, getDocs,
  getDoc, doc, deleteDoc, updateDoc
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
import AdminBenefitsScreen from './pages/AdminBenefitsScreen';

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

// ==========================================
// パスワード保護ガード用コンポーネント (AdminGate)
// ==========================================
const AdminGate = ({ children, db }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authFlag = sessionStorage.getItem('admin_authenticated');
    if (authFlag === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const docRef = doc(db, 'system_settings', 'admin_auth');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const { access_hash } = docSnap.data();
        if (!access_hash) {
          setError('データベースにパスワードが設定されていません。');
          return;
        }

        const isMatched = await bcrypt.compare(inputPassword, access_hash);
        if (isMatched) {
          sessionStorage.setItem('admin_authenticated', 'true');
          setIsAuthenticated(true);
        } else {
          setError('パスワードが正しくありません。');
        }
      } else {
        setError('認証データ（system_settings/admin_auth）が見つかりません。');
      }
    } catch (err) {
      console.error(err);
      setError('認証処理中にエラーが発生しました。');
    }
  };

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#1a202c',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          width: '380px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#2d3748' }}>PET CPR 管理者認証</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              placeholder="アクセス用パスワード"
              required
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '15px',
                borderRadius: '6px',
                border: '1px solid #cbd5e0',
                boxSizing: 'border-box',
                fontSize: '1rem'
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#3182ce',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              ログイン
            </button>
          </form>
          {error && <p style={{ color: '#e53e3e', marginTop: '15px', fontSize: '0.9rem' }}>{error}</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// ==========================================
// パスワード設定・変更用画面コンポーネント
// ==========================================
const AdminSettingsScreen = ({ db }) => {
  const [masterPass, setMasterPass] = useState('');
  const [newAccessPass, setNewAccessPass] = useState('');
  const [newMasterPass, setNewMasterPass] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    try {
      const docRef = doc(db, 'system_settings', 'admin_auth');
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setIsError(true);
        setMessage('設定ドキュメントが見つかりません。');
        return;
      }

      const { master_hash } = docSnap.data();
      const isMasterValid = await bcrypt.compare(masterPass, master_hash);

      if (!isMasterValid) {
        setIsError(true);
        setMessage('現在の変更用パスワードが一致しません。変更権限がありません。');
        return;
      }

      const updates = {};
      if (newAccessPass) {
        updates.access_hash = await bcrypt.hash(newAccessPass, 10);
      }
      if (newMasterPass) {
        updates.master_hash = await bcrypt.hash(newMasterPass, 10);
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(docRef, updates);
        setMessage('パスワードを正常に変更しました。');
        setMasterPass('');
        setNewAccessPass('');
        setNewMasterPass('');
      } else {
        setIsError(true);
        setMessage('更新する新しいパスワードを入力してください。');
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setMessage('更新処理に失敗しました。');
    }
  };

  return (
    <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '600px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#2d3748' }}>⚙️ パスワード設定管理</h2>
      <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '25px' }}>
        アクセス用パスワード（全員共通）および変更用パスワードを更新できます。更新を行うには「現在の変更用パスワード」が必要です。
      </p>

      <form onSubmit={handleUpdatePassword}>
        <div style={{ marginBottom: '20px', background: '#fffaf0', padding: '15px', borderRadius: '8px', border: '1px solid #feebc8' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#dd6b20' }}>
            現在の変更用（マスター）パスワード <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="password"
            value={masterPass}
            onChange={(e) => setMasterPass(e.target.value)}
            required
            placeholder="管理者権限パスワード"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '25px 0' }} />

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#2d3748' }}>
            新しいアクセス用パスワード（全員共通）
          </label>
          <input
            type="password"
            value={newAccessPass}
            onChange={(e) => setNewAccessPass(e.target.value)}
            placeholder="変更しない場合は空欄"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#2d3748' }}>
            新しい変更用（マスター）パスワード
          </label>
          <input
            type="password"
            value={newMasterPass}
            onChange={(e) => setNewMasterPass(e.target.value)}
            placeholder="変更しない場合は空欄"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          style={{ background: '#3182ce', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
        >
          設定を保存
        </button>
      </form>

      {message && (
        <p style={{ marginTop: '20px', padding: '12px', borderRadius: '6px', background: isError ? '#fed7d7' : '#c6f6d5', color: isError ? '#9b2c2c' : '#22543d', fontWeight: 'bold' }}>
          {message}
        </p>
      )}
    </div>
  );
};

// ==========================================
// メイン App コンポーネント
// ==========================================
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
  const [isBenefitsGroupOpen, setIsBenefitsGroupOpen] = useState(false);
  const [isSettingsGroupOpen, setIsSettingsGroupOpen] = useState(false);

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
  const [editingUser, setEditingUser] = useState({ id: '', name: '', certName: '', email: '', prefecture: '' });
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
      (u.certName && u.certName.includes(searchWord)) || 
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
      certName: user.certName || '',
      email: user.email || '',
      password: user.password || '',
      prefecture: user.prefecture || ''
    });
    
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

  const handleLicenseCheckboxChangeInEdit = (licenseId, checked) => {
    setEditingUserLicenses(prev => ({
      ...prev,
      [licenseId]: {
        ...prev[licenseId],
        has: checked,
        date: checked ? (prev[licenseId]?.date || '') : ''
      }
    }));
  };

  const handleLicenseDateChangeInEdit = (licenseId, dateVal) => {
    setEditingUserLicenses(prev => ({
      ...prev,
      [licenseId]: {
        ...prev[licenseId],
        date: dateVal
      }
    }));
  };

  const handleUpdateUser = async () => {
    if (!editingUser.name || !editingUser.email) {
      return alert("氏名とメールアドレスは必須です");
    }

    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        name: editingUser.name,
        certName: editingUser.certName || '',
        email: editingUser.email,
        password: editingUser.password,
        prefecture: editingUser.prefecture,
        licenses: editingUserLicenses,
        updatedAt: new Date()
      });
      setIsEditModalOpen(false);
      fetchData();
      alert("会員情報を更新しました");
    } catch (e) {
      alert("更新失敗: " + e.message);
    }
  };

  const openResultDetailModal = (result) => { setSelectedResult(result); setIsResultModalOpen(true); };

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
    main: { flex: 1, padding: '40px', marginLeft: '260px' },
    input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    modalContent: { background: 'white', padding: '30px', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }
  };

  return (
    <AdminGate db={db}>
      <div style={styles.container}>
        {/* サイドバー */}
        <div style={styles.sidebar}>
          <h2 style={{ padding: '0 25px', marginBottom: '40px', color: '#63b3ed' }}>PET CPR管理画面</h2>
          
          <div style={styles.groupHeader} onClick={() => setIsPageGroupOpen(!isPageGroupOpen)}>サイト構成・ページ管理 <span>{isPageGroupOpen ? '▼' : '▶'}</span></div>
          {isPageGroupOpen && (
            <div>
              <NavLink to="/pages" style={styles.navItemLink(true)}>└ 📄 ページ管理</NavLink>
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

          <div style={styles.groupHeader} onClick={() => setIsBenefitsGroupOpen(!isBenefitsGroupOpen)}>
            会員特典管理 <span>{isBenefitsGroupOpen ? '▼' : '▶'}</span>
          </div>
          {isBenefitsGroupOpen && (
            <div>
              <NavLink to="/benefits" style={styles.navItemLink(true)}>└ 特典一覧・編集</NavLink>
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

          {/* 設定グループ */}
          <div style={styles.groupHeader} onClick={() => setIsSettingsGroupOpen(!isSettingsGroupOpen)}>システム設定 <span>{isSettingsGroupOpen ? '▼' : '▶'}</span></div>
          {isSettingsGroupOpen && (
            <div>
              <NavLink to="/settings" style={styles.navItemLink(true)}>└ ⚙️ パスワード設定</NavLink>
            </div>
          )}
        </div>

        {/* メインコンテンツエリア */}
        <div style={styles.main}>
          <Routes>
            <Route path="/pages" element={<PageCmsScreen db={db} pageList={pageList} fetchData={fetchData} handleDelete={handleDelete} />} />
            <Route path="/users" element={<UserListScreen users={users} totalUserCount={totalUserCount} searchWord={searchWord} setSearchWord={setSearchWord} licenseMasterList={licenseMasterList} openEditUserModal={openEditUserModal} />} />
            <Route path="/users/register" element={<UserRegScreen db={db} licenseMasterList={licenseMasterList} setActiveTab={(path) => navigate(`/${path}`)} fetchData={fetchData} />} />
            <Route path="/licenses" element={<LicenseMasterScreen db={db} storage={storage} licenseMasterList={licenseMasterList} setLicenseMasterList={setLicenseMasterList} fetchData={fetchData} />} />
            <Route path="/benefits" element={<AdminBenefitsScreen db={db} />} />
            <Route path="/faqmanager" element={<AdminFaqManager db={db} />} />
            <Route path="/news" element={<NewsMainScreen db={db} newsList={newsList} licenseMasterList={licenseMasterList} fetchData={fetchData} handleDelete={handleDelete} />} />
            <Route path="/news/instagram" element={<NewsInstaScreen db={db} instaList={instaList} fetchData={fetchData} handleDelete={handleDelete} />} />
            <Route path="/bbs" element={<BbsCheckScreen db={db} storage={storage} bbsList={bbsList} bbsSearchWord={bbsSearchWord} setBbsSearchWord={setBbsSearchWord} fetchData={fetchData} />} />
            <Route path="/diagnostic/results" element={<DiagResultsScreen diagResults={diagResults} openResultDetailModal={openResultDetailModal} handleDelete={handleDelete} />} />
            <Route path="/diagnostic/questions" element={<DiagQuestionsScreen db={db} diagQuestions={diagQuestions} fetchData={fetchData} />} />
            <Route path="/diagnostic/settings" element={<DiagSettingsScreen db={db} fetchData={fetchData} />} />
            <Route path="/settings" element={<AdminSettingsScreen db={db} />} />
            <Route path="*" element={<UserListScreen users={users} totalUserCount={totalUserCount} searchWord={searchWord} setSearchWord={setSearchWord} licenseMasterList={licenseMasterList} openEditUserModal={openEditUserModal} />} />
          </Routes>
        </div>

        {/* 会員編集モーダル */}
        {isEditModalOpen && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={{ marginTop: 0, marginBottom: '20px' }}>会員情報の編集</h2>
              
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

              <div style={{ background: '#ebf8ff', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #bee3f8' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#2b6cb0' }}>
                  📄 修了証用表記名（PDF印字用）
                </label>
                <input 
                  type="text" 
                  style={{ ...styles.input, marginBottom: '5px' }} 
                  value={editingUser.certName} 
                  onChange={e => setEditingUser({ ...editingUser, certName: e.target.value })} 
                  placeholder="例: PET TARO（空欄の場合は上記の氏名が印字されます）"
                />
                <span style={{ fontSize: '0.75rem', color: '#4a5568' }}>
                  ※ マイページでダウンロードされる修了証PDF等に表示される表記名です。
                </span>
              </div>

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

        <style>{`
          .active-link {
            background-color: #4a5568 !important;
            color: #ffffff !important;
            font-weight: bold;
          }
        `}</style>
      </div>
    </AdminGate>
  );
};

export default App;