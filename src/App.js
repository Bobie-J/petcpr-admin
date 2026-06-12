import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, serverTimestamp, query, orderBy, getDocs,
  getDoc, setDoc, doc, deleteDoc, updateDoc, runTransaction
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

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
  // --- ナビゲーション管理 ---
  const [activeTab, setActiveTab] = useState('user-list');
  const [isUserGroupOpen, setIsUserGroupOpen] = useState(true);
  const [isLicenseGroupOpen, setIsLicenseGroupOpen] = useState(true);
  const [isNewsGroupOpen, setIsNewsGroupOpen] = useState(true);
  const [isBbsGroupOpen, setIsBbsGroupOpen] = useState(true);
  const [isDiagGroupOpen, setIsDiagGroupOpen] = useState(true);
  const [isPageGroupOpen, setIsPageGroupOpen] = useState(true); // 💡【新設】

  // ==========================================
  // 状態管理（既存機能用）
  // ==========================================
  const [licenseMasterList, setLicenseMasterList] = useState([]);
  const [newLicenseMaster, setNewLicenseMaster] = useState({ id: '', name: '' });
  const [uploadingLicenseId, setUploadingLicenseId] = useState(null);

  const [users, setUsers] = useState([]);
  const [totalUserCount, setTotalUserCount] = useState(0);
  const [searchWord, setSearchWord] = useState('');
  const [newUserLicenses, setNewUserLicenses] = useState({});
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', prefecture: '' });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUserLicenses, setEditingUserLicenses] = useState({});
  const [editingUser, setEditingUser] = useState({ id: '', name: '', email: '', prefecture: '' });

  const [bbsList, setBbsList] = useState([]);
  const [bbsSearchWord, setBbsSearchWord] = useState('');
  const [bbsContent, setBbsContent] = useState('');
  const [bbsFile, setBbsFile] = useState(null);
  const [isBbsUploading, setIsBbsUploading] = useState(false);
  const [editingBbsItem, setEditingBbsItem] = useState(null);
  const [isBbsEditModalOpen, setIsBbsEditModalOpen] = useState(false);
  const [editBbsFile, setEditBbsFile] = useState(null);

  const [newsList, setNewsList] = useState([]);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [status, setStatus] = useState('public');

  const [newsAccessType, setNewsAccessType] = useState('all');
  const [newsAllowedLicenses, setNewsAllowedLicenses] = useState({});
  const [newsShowTitleToAll, setNewsShowTitleToAll] = useState(true);

  const [instaList, setInstaList] = useState([]);
  const [instaUrl, setInstaUrl] = useState('');
  const [instaStatus, setInstaStatus] = useState('public');

  const [diagQuestions, setDiagQuestions] = useState([]);
  const [diagEditId, setDiagEditId] = useState(null);
  const [diagQuestionText, setDiagQuestionText] = useState('');
  const [diagDescription, setDiagDescription] = useState(''); 
  const [diagType, setDiagType] = useState('choice'); 
  const [diagRequired, setDiagRequired] = useState(true); 
  const [diagOrder, setDiagOrder] = useState(1);
  const [diagChoices, setDiagChoices] = useState([{ text: '', isQualified: true, allowFreeText: false }]);

  const [diagSuccessTitle, setDiagSuccessTitle] = useState('');
  const [diagSuccessContent, setDiagSuccessContent] = useState('');
  const [diagFailTitle, setDiagFailTitle] = useState('');
  const [diagFailContent, setDiagFailContent] = useState('');

  const [diagResults, setDiagResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  // ==========================================
  // 💡【新設】ページ・CMS管理用 状態管理
  // ==========================================
  const [pageList, setPageList] = useState([]);
  const [pageEditId, setPageEditId] = useState(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState(''); // URLの末尾（例: basic-online）
  const [pageParentId, setPageParentId] = useState(''); // 親ページのID（空なら大項目）
  const [pageContent, setPageContent] = useState('');
  const [pageOrder, setPageOrder] = useState(1);
  const [pageShowInHeader, setPageShowInHeader] = useState(true);

  // ==========================================
  // データ一括取得
  // ==========================================
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

    const docDiagSetting = await getDoc(doc(db, "settings", "diagnostic"));
    if (docDiagSetting.exists()) {
      const data = docDiagSetting.data();
      setDiagSuccessTitle(data.successTitle || '');
      setDiagSuccessContent(data.successContent || '');
      setDiagFailTitle(data.failTitle || '');
      setDiagFailContent(data.failContent || '');
    }

    const snapDiagResults = await getDocs(query(collection(db, "diagnostic_results"), orderBy("createdAt", "desc")));
    setDiagResults(snapDiagResults.docs.map(d => ({ id: d.id, ...d.data() })));

    // 💡【新設】固定ページデータの取得（表示順）
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

  // ==========================================
  // 各種既存機能のハンドラー（維持）
  // ==========================================
  const handleAddLicenseMaster = async () => {
    const { id, name } = newLicenseMaster;
    if (!id || !name) return alert("ライセンスIDとライセンス名は必須です");
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return alert("ライセンスIDは半角英数字で入力してください");
    try {
      const docRef = doc(db, "licenses_master", id.toLowerCase());
      if ((await getDoc(docRef)).exists()) return alert("このライセンスIDは既に登録されています");
      await setDoc(docRef, { name, certFileUrl: '', createdAt: serverTimestamp() });
      setNewLicenseMaster({ id: '', name: '' }); fetchData(); alert("ライセンスを追加しました");
    } catch (e) { alert("追加失敗: " + e.message); }
  };

  const handleFileChange = async (e, licenseId) => {
    const file = e.target.files[0]; if (!file) return; setUploadingLicenseId(licenseId);
    try {
      const storageRef = ref(storage, `certificate_templates/${licenseId}_${file.name}`);
      await uploadBytes(storageRef, file); const downloadUrl = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "licenses_master", licenseId), { certFileUrl: downloadUrl, updatedAt: serverTimestamp() });
      fetchData(); alert("修了証フォーマットを更新しました");
    } catch (e) { alert("アップロード失敗: " + e.message); } finally { setUploadingLicenseId(null); }
  };

  const handleRegisterUser = async () => {
    const { name, email, password, prefecture } = newUser; if (!name || !email || !password) return alert("氏名、メール、パスワードは必須です");
    try {
      const counterRef = doc(db, "settings", "counters"); let userNum = 1;
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (counterDoc.exists()) { userNum = counterDoc.data().userCount + 1; transaction.update(counterRef, { userCount: userNum }); }
        else { transaction.set(counterRef, { userCount: 1 }); }
        transaction.set(doc(db, "users", String(userNum)), {
          userNum, name, email, password, prefecture, needsPasswordSetup: true, licenses: newUserLicenses, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
      });
      setNewUser({ name: '', email: '', password: '', prefecture: '' }); setNewUserLicenses({}); setActiveTab('user-list'); fetchData(); alert(`会員番号 ${userNum} を登録しました`);
    } catch (e) { alert("登録失敗: " + e.message); }
  };

  const openEditUserModal = (user) => {
    setEditingUser({ id: user.id, name: user.name || '', email: user.email || '', prefecture: user.prefecture || '' });
    setEditingUserLicenses(user.licenses || {}); setIsEditModalOpen(true);
  };
  const handleUpdateUser = async () => {
    if (!editingUser.name || !editingUser.email) return alert("氏名とメールは必須です");
    try { await updateDoc(doc(db, "users", editingUser.id), { name: editingUser.name, email: editingUser.email, prefecture: editingUser.prefecture, licenses: editingUserLicenses, updatedAt: serverTimestamp() }); setIsEditModalOpen(false); fetchData(); alert("会員情報を更新しました"); } catch (e) { alert("更新失敗: " + e.message); }
  };
  const handleNewUserLicenseCheckbox = (id, checked) => { setNewUserLicenses({ ...newUserLicenses, [id]: { ...newUserLicenses[id], has: checked, date: checked ? newUserLicenses[id]?.date || '' : '' } }); };
  const handleNewUserLicenseDate = (id, val) => { setNewUserLicenses({ ...newUserLicenses, [id]: { ...newUserLicenses[id], date: val } }); };
  const handleEditUserLicenseCheckbox = (id, checked) => { setEditingUserLicenses({ ...editingUserLicenses, [id]: { ...editingUserLicenses[id], has: checked, date: checked ? editingUserLicenses[id]?.date || '' : '' } }); };
  const handleEditUserLicenseDate = (id, val) => { setEditingUserLicenses({ ...editingUserLicenses, [id]: { ...editingUserLicenses[id], date: val } }); };

  const handlePostBbsAdmin = async () => {
    if (!bbsContent.trim()) return alert("投稿内容を入力してください"); if (bbsFile && bbsFile.size > 2100000) return alert("エラー: 画像ファイルの容量が2MBを超えています。"); setIsBbsUploading(true);
    try {
      let imageUrl = ''; let storagePath = ''; if (bbsFile) { storagePath = `bbs_images/${Date.now()}_${bbsFile.name}`; const fileRef = ref(storage, storagePath); await uploadBytes(fileRef, bbsFile); imageUrl = await getDownloadURL(fileRef); }
      await addDoc(collection(db, "bbs"), { userId: "admin", userName: "管理者", content: bbsContent, imageUrl: imageUrl, storagePath: storagePath, createdAt: serverTimestamp() });
      setBbsContent(''); setBbsFile(null); const fileInput = document.getElementById('bbs-file-input'); if (fileInput) fileInput.value = ''; fetchData(); alert("管理者として掲示板に投稿しました");
    } catch (e) { alert("投稿に失敗しました: " + e.message); } finally { setIsBbsUploading(false); }
  };
  const openEditBbsModal = (item) => { setEditingBbsItem(item); setEditBbsFile(null); setIsBbsEditModalOpen(true); };
  const handleUpdateBbsItem = async () => {
    if (!editingBbsItem.content.trim()) return alert("内容を入力してください"); if (editBbsFile && editBbsFile.size > 2100000) return alert("エラー: 画像が2MBを超えています。"); setIsBbsUploading(true);
    try {
      let finalImageUrl = editingBbsItem.imageUrl || ''; let finalStoragePath = editingBbsItem.storagePath || ''; if (editBbsFile) { if (editingBbsItem.storagePath) { try { await deleteObject(ref(storage, editingBbsItem.storagePath)); } catch (err) {} } finalStoragePath = `bbs_images/${Date.now()}_${editBbsFile.name}`; const fileRef = ref(storage, finalStoragePath); await uploadBytes(fileRef, editBbsFile); finalImageUrl = await getDownloadURL(fileRef); }
      await updateDoc(doc(db, "bbs", editingBbsItem.id), { content: editingBbsItem.content, imageUrl: finalImageUrl, storagePath: finalStoragePath, updatedAt: serverTimestamp() }); setIsBbsEditModalOpen(false); fetchData(); alert("投稿を修正しました");
    } catch (e) { alert("修正失敗: " + e.message); } finally { setIsBbsUploading(false); }
  };
  const handleDeleteBbsItem = async (item) => { if (!window.confirm("この投稿を削除しますか？")) return; try { if (item.storagePath) { await deleteObject(ref(storage, item.storagePath)).catch(() => {}); } await deleteDoc(doc(db, item.id)); fetchData(); alert("投稿を完全に削除しました"); } catch (e) { alert("削除失敗: " + e.message); } };

  const handleNewsAllowedLicensesCheckbox = (id, checked) => { setNewsAllowedLicenses({ ...newsAllowedLicenses, [id]: checked }); };
  const handleSaveNews = async () => {
    if (!title || !content || !publishDate) return alert("入力が不足しています"); const allowedLicensesArray = Object.keys(newsAllowedLicenses).filter(key => newsAllowedLicenses[key]); if (newsAccessType === 'limited' && allowedLicensesArray.length === 0) { return alert("限定公開にする場合は、最低1つ以上のライセンスを指定してください。"); }
    const accessControl = { isLimited: newsAccessType === 'limited', allowedLicenses: newsAccessType === 'limited' ? allowedLicensesArray : [], showTitleToAll: newsAccessType === 'limited' ? newsShowTitleToAll : true };
    const payload = { title, content, publishedAt: new Date(publishDate), status, accessControl, updatedAt: serverTimestamp() };
    try { if (editId) { await updateDoc(doc(db, "news", editId), payload); alert("ニュースを更新しました"); } else { await addDoc(collection(db, "news"), { ...payload, createdAt: serverTimestamp() }); alert("ニュースを新規投稿しました"); } resetForm(); fetchData(); } catch (e) { alert("エラーが発生しました: " + e.message); }
  };
  const resetForm = () => { setEditId(null); setTitle(''); setContent(''); setPublishDate(''); setStatus('public'); setNewsAccessType('all'); setNewsAllowedLicenses({}); setNewsShowTitleToAll(true); };
  const startEditNews = (news) => {
    setEditId(news.id); setTitle(news.title); setContent(news.content); setPublishDate(news.publishedAt.toDate().toISOString().slice(0, 16)); setStatus(news.status);
    if (news.accessControl) { setNewsAccessType(news.accessControl.isLimited ? 'limited' : 'all'); setNewsShowTitleToAll(news.accessControl.showTitleToAll !== false); const restoredLicenses = {}; news.accessControl.allowedLicenses?.forEach(licId => { restoredLicenses[licId] = true; }); setNewsAllowedLicenses(restoredLicenses); } else { setNewsAccessType('all'); setNewsAllowedLicenses({}); setNewsShowTitleToAll(true); } window.scrollTo(0, 0);
  };

  const handleSaveInsta = async () => { if (!instaUrl) return; try { await addDoc(collection(db, "instagram"), { url: instaUrl, status: instaStatus, createdAt: serverTimestamp() }); setInstaUrl(''); fetchData(); alert("インスタを追加しました"); } catch (e) { alert("保存に失敗"); } };
  const toggleInstaStatus = async (item) => { await updateDoc(doc(db, "instagram", item.id), { status: item.status === 'public' ? 'private' : 'public' }); fetchData(); };
  const getInstaThumbnail = (url) => { const baseUrl = url.split('?')[0]; return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}media/?size=m`; };

  // 資格診断用 ハンドラー
  const handleAddDiagChoice = () => { setDiagChoices([...diagChoices, { text: '', isQualified: true, allowFreeText: false }]); };
  const handleRemoveDiagChoice = (index) => { if (diagChoices.length === 1) return alert("選択肢は最低1つ必要です"); setDiagChoices(diagChoices.filter((_, i) => i !== index)); };
  const handleUpdateDiagChoiceField = (index, field, value) => { const updated = diagChoices.map((c, i) => i === index ? { ...c, [field]: value } : c); setDiagChoices(updated); };
  const handleSaveDiagQuestion = async () => {
    if (!diagQuestionText.trim()) return alert("設問内容を入力してください");
    if (diagType === 'choice') { const hasEmptyChoice = diagChoices.some(c => !c.text.trim()); if (hasEmptyChoice) return alert("空欄の選択肢があります。入力するか削除してください"); }
    const payload = { questionText: diagQuestionText, description: diagDescription.trim(), type: diagType, isRequired: diagRequired, order: Number(diagOrder), choices: diagType === 'choice' ? diagChoices : [], updatedAt: serverTimestamp() };
    try { if (diagEditId) { await updateDoc(doc(db, "diagnostic_questions", diagEditId), payload); alert("設問を更新しました"); } else { await addDoc(collection(db, "diagnostic_questions"), payload); alert("新しい設問を追加しました"); } resetDiagForm(); fetchData(); } catch (e) { alert("保存失敗: " + e.message); }
  };
  const resetDiagForm = () => { setDiagEditId(null); setDiagQuestionText(''); setDiagDescription(''); setDiagType('choice'); setDiagRequired(true); setDiagOrder(diagQuestions.length + 1); setDiagChoices([{ text: '', isQualified: true, allowFreeText: false }]); };
  const startEditDiagQuestion = (q) => { setDiagEditId(q.id); setDiagQuestionText(q.questionText); setDiagDescription(q.description || ''); setDiagType(q.type || 'choice'); setDiagRequired(q.isRequired !== false); setDiagOrder(q.order); setDiagChoices(q.choices || [{ text: '', isQualified: true, allowFreeText: false }]); window.scrollTo(0, 0); };
  const handleSaveDiagSettings = async () => { try { await setDoc(doc(db, "settings", "diagnostic"), { successTitle: diagSuccessTitle, successContent: diagSuccessContent, failTitle: diagFailTitle, failContent: diagFailContent, updatedAt: serverTimestamp() }); alert("診断結果画面の設定を保存しました"); fetchData(); } catch (e) { alert("設定保存失敗: " + e.message); } };
  const openResultDetailModal = (result) => { setSelectedResult(result); setIsResultModalOpen(true); };

  // ==========================================
  // 💡【新設】ページ・構成管理（CMS）処理関数
  // ==========================================
  const handleSavePage = async () => {
    if (!pageTitle.trim() || !pageSlug.trim()) return alert("ページタイトルとURLスラッグは必須です");
    if (!/^[a-zA-Z0-9_-]+$/.test(pageSlug)) return alert("URLスラッグは半角英数字（ハイフン、アンダースコア可）で入力してください");

    const payload = {
      title: pageTitle.trim(),
      slug: pageSlug.trim().toLowerCase(),
      parentId: pageParentId || null, // 空文字の場合はルート大項目（null）
      content: pageContent,
      order: Number(pageOrder),
      showInHeader: pageShowInHeader,
      updatedAt: serverTimestamp()
    };

    try {
      if (pageEditId) {
        await updateDoc(doc(db, "pages", pageEditId), payload);
        alert("ページ設定を更新しました");
      } else {
        // 重複チェック
        const isDuplicate = pageList.some(p => p.slug === payload.slug && p.id !== pageEditId);
        if (isDuplicate) return alert("このURLスラッグは既に他のページで使用されています");
        await addDoc(collection(db, "pages"), { ...payload, createdAt: serverTimestamp() });
        alert("新しいページを作成しました");
      }
      resetPageForm();
      fetchData();
    } catch (e) {
      alert("ページ保存失敗: " + e.message);
    }
  };

  const resetPageForm = () => {
    setPageEditId(null);
    setPageTitle('');
    setPageSlug('');
    setPageParentId('');
    setPageContent('');
    setPageOrder(pageList.length + 1);
    setPageShowInHeader(true);
  };

  const startEditPage = (p) => {
    setPageEditId(p.id);
    setPageTitle(p.title);
    setPageSlug(p.slug);
    setPageParentId(p.parentId || '');
    setPageContent(p.content || '');
    setPageOrder(p.order);
    setPageShowInHeader(p.showInHeader !== false);
    window.scrollTo(0, 0);
  };

  // 再帰的にページ木構造をレンダーするヘルパー関数
  const renderPageTree = (parentId = null, depth = 0) => {
    const currentLevelPages = pageList.filter(p => p.parentId === parentId);
    
    return currentLevelPages.map(p => (
      <div key={p.id} style={{ marginLeft: `${depth * 25}px`, borderLeft: depth > 0 ? '2px dashed #cbd5e0' : 'none', paddingLeft: depth > 0 ? '15px' : '0' }}>
        <div style={{ ...styles.card, padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: depth === 0 ? '#fff' : '#f8fafc', marginBottom: '10px', border: depth > 0 ? '1px solid #e2e8f0' : '1px solid #edf2f7' }}>
          <div>
            <span style={{ marginRight: '10px', fontSize: '0.8rem', background: '#4a5568', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>表示順: {p.order}</span>
            <strong style={{ fontSize: '1.05rem', color: '#1a202c' }}>{depth > 0 ? '└ ' : ''}{p.title}</strong>
            <span style={{ marginLeft: '10px', color: '#718096', fontSize: '0.85rem' }}>📌 スラッグ: <code>/{p.slug}</code></span>
            {p.showInHeader ? (
              <span style={{ ...styles.badgeGreen, marginLeft: '10px' }}>🖥️ ヘッダー表示</span>
            ) : (
              <span style={{ ...styles.badgePurple, marginLeft: '10px' }}>隠しページ</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => startEditPage(p)} style={styles.btnEdit}>編集</button>
            <button onClick={() => handleDelete('pages', p.id)} style={styles.btnDelete}>削除</button>
          </div>
        </div>
        {/* 子要素（小項目）があれば再帰呼び出し */}
        {renderPageTree(p.id, depth + 1)}
      </div>
    ));
  };


  // ==========================================
  // スタイル定義
  // ==========================================
  const styles = {
    container: { display: 'flex', minHeight: '100vh', background: '#f4f7f6', fontFamily: 'sans-serif', margin: '-8px' },
    sidebar: { width: '260px', background: '#1a202c', color: 'white', padding: '30px 0', position: 'fixed', height: '100vh', zIndex: 10, overflowY: 'auto' },
    groupHeader: { padding: '12px 25px', fontSize: '0.75rem', color: '#fff', background: '#2d3748', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #63b3ed', marginTop: '10px' },
    navItem: (active, isChild) => ({ padding: '12px 25px', paddingLeft: isChild ? '45px' : '25px', cursor: 'pointer', background: active ? '#4a5568' : 'transparent', color: active ? '#fff' : '#a0aec0', fontSize: '0.9rem' }),
    main: { flex: 1, padding: '40px', marginLeft: '260px' },
    card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' },
    input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box', height: '8px', minHeight:'80px', fontFamily: 'sans-serif' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '2px solid #edf2f7', color: '#718096', fontSize: '0.85rem' },
    td: { padding: '12px', borderBottom: '1px solid #edf2f7', fontSize: '0.9rem' },
    badge: (isPublic) => ({ padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', background: isPublic ? '#c6f6d5' : '#edf2f7', color: isPublic ? '#22543d' : '#4a5568' }),
    badgeBlue: { padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', background: '#ebf8ff', color: '#2b6cb0', marginLeft: '5px' },
    badgeGreen: { padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', background: '#c6f6d5', color: '#22543d', fontWeight: 'bold' },
    badgeRed: { padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', background: '#fed7d7', color: '#9b2c2c', fontWeight: 'bold' },
    badgePurple: { padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', background: '#e2e8f0', color: '#4a5568', fontWeight: 'bold' },
    btnEdit: { color: '#3182ce', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' },
    btnDelete: { color: '#e53e3e', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    modalContent: { background: 'white', padding: '30px', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }
  };

  return (
    <div style={styles.container}>
      {/* サイドバー */}
      <div style={styles.sidebar}>
        <h2 style={{ padding: '0 25px', marginBottom: '40px', color: '#63b3ed' }}>PET CPR</h2>
        
        {/* 💡【新設】サイト構成・ページ管理 */}
        <div style={styles.groupHeader} onClick={() => setIsPageGroupOpen(!isPageGroupOpen)}>サイト構成・ページ管理 <span>{isPageGroupOpen ? '▼' : '▶'}</span></div>
        {isPageGroupOpen && (
          <div>
            <div style={styles.navItem(activeTab === 'page-cms', true)} onClick={() => setActiveTab('page-cms')}>└ 📄 ページ管理</div>
          </div>
        )}

        <div style={styles.groupHeader} onClick={() => setIsUserGroupOpen(!isUserGroupOpen)}>会員管理 <span>{isUserGroupOpen ? '▼' : '▶'}</span></div>
        {isUserGroupOpen && (
          <div>
            <div style={styles.navItem(activeTab === 'user-list', true)} onClick={() => setActiveTab('user-list')}>├ 会員一覧</div>
            <div style={styles.navItem(activeTab === 'user-reg', true)} onClick={() => setActiveTab('user-reg')}>└ 会員登録</div>
          </div>
        )}

        <div style={styles.groupHeader} onClick={() => setIsLicenseGroupOpen(!isLicenseGroupOpen)}>ライセンス管理 <span>{isLicenseGroupOpen ? '▼' : '▶'}</span></div>
        {isLicenseGroupOpen && (
          <div>
            <div style={styles.navItem(activeTab === 'license-master', true)} onClick={() => setActiveTab('license-master')}>└ ライセンス・修了証管理</div>
          </div>
        )}

        <div style={styles.groupHeader} onClick={() => setIsNewsGroupOpen(!isNewsGroupOpen)}>NEWS管理 <span>{isNewsGroupOpen ? '▼' : '▶'}</span></div>
        {isNewsGroupOpen && (
          <div>
            <div style={styles.navItem(activeTab === 'news-main', true)} onClick={() => setActiveTab('news-main')}>├ NEWS投稿</div>
            <div style={styles.navItem(activeTab === 'news-insta', true)} onClick={() => setActiveTab('news-insta')}>└ インスタ連携</div>
          </div>
        )}

        <div style={styles.groupHeader} onClick={() => setIsBbsGroupOpen(!isBbsGroupOpen)}>掲示板管理 <span>{isBbsGroupOpen ? '▼' : '▶'}</span></div>
        {isBbsGroupOpen && (
          <div>
            <div style={styles.navItem(activeTab === 'bbs-check', true)} onClick={() => setActiveTab('bbs-check')}>└ 掲示板確認</div>
          </div>
        )}

        <div style={styles.groupHeader} onClick={() => setIsDiagGroupOpen(!isDiagGroupOpen)}>受講資格診断管理 <span>{isDiagGroupOpen ? '▼' : '▶'}</span></div>
        {isDiagGroupOpen && (
          <div>
            <div style={styles.navItem(activeTab === 'diag-results', true)} onClick={() => setActiveTab('diag-results')}>├ 📥 診断結果一覧</div>
            <div style={styles.navItem(activeTab === 'diag-questions', true)} onClick={() => setActiveTab('diag-questions')}>├ 設問の追加・編集</div>
            <div style={styles.navItem(activeTab === 'diag-settings', true)} onClick={() => setActiveTab('diag-settings')}>└ 結果画面メッセージ</div>
          </div>
        )}
      </div>

      {/* メインコンテンツ */}
      <div style={styles.main}>
        
        {/* 💡【新設】固定ページ・メニュー構築CMSタブ */}
        {activeTab === 'page-cms' && (
          <div>
            <h1>{pageEditId ? '⚙️ ページの編集・修正' : '📄 固定ページ新規追加・メニュー構築'}</h1>
            <p style={{color:'#718096', marginTop:'-10px'}}>サイト上の各紹介ページやコース詳細ページを構築します。親子関係（階層構造）を自由に指定可能です。</p>
            
            <div style={styles.card}>
              <div style={{display:'flex', gap:'20px'}}>
                <div style={{flex: 2}}>
                  <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#4a5568'}}>ページ表示タイトル</label>
                  <input type="text" placeholder="例: ベーシックコース、オンライン、About us" value={pageTitle} onChange={e => setPageTitle(e.target.value)} style={styles.input} />
                </div>
                <div style={{flex: 1}}>
                  <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#4a5568'}}>URLスラッグ (半角英数)</label>
                  <input type="text" placeholder="例: basic, basic-online, about" value={pageSlug} onChange={e => setPageSlug(e.target.value)} style={styles.input} disabled={!!pageEditId} />
                </div>
              </div>

              <div style={{display:'flex', gap:'20px', background:'#edf2f7', padding:'15px', borderRadius:'8px', marginBottom:'20px'}}>
                <div style={{flex: 1}}>
                  <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#4a5568'}}>📁 所属する親ページ（大項目・小項目階層）</label>
                  <select value={pageParentId} onChange={e => setPageParentId(e.target.value)} style={{...styles.input, marginBottom:0, padding:'8px'}}>
                    <option value="">（最上位の大項目・ルートページとして配置）</option>
                    {pageList.filter(p => p.id !== pageEditId).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.parentId ? '└ ' : ''}{p.title} (/{p.slug})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{width:'120px'}}>
                  <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#4a5568'}}>🔢 並び順</label>
                  <input type="number" value={pageOrder} onChange={e => setPageOrder(e.target.value)} style={{...styles.input, marginBottom:0, padding:'8px'}} />
                </div>
                <div style={{width:'180px'}}>
                  <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#4a5568'}}>🖥️ ナビゲーション表示</label>
                  <select value={pageShowInHeader ? 'true' : 'false'} onChange={e => setPageShowInHeader(e.target.value === 'true')} style={{...styles.input, marginBottom:0, padding:'8px'}}>
                    <option value="true">ヘッダーに載せる</option>
                    <option value="false">隠し・直リンクのみ</option>
                  </select>
                </div>
              </div>

              <div style={{marginBottom:'20px'}}>
                <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#4a5568'}}>🖋️ ページ本文・紹介用コンテンツ</label>
                <div style={{background:'white', marginBottom:'50px'}}><ReactQuill theme="snow" value={pageContent} onChange={setPageContent} style={{height:'350px'}} /></div>
              </div>

              <div style={{borderTop:'1px solid #edf2f7', paddingTop:'20px', display:'flex', gap:'15px'}}>
                <button onClick={handleSavePage} style={{padding:'12px 24px', background:'#3182ce', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>
                  {pageEditId ? '変更を保存する' : 'この設定でページを生成'}
                </button>
                {pageEditId && <button onClick={resetPageForm} style={{padding:'12px 20px', borderRadius:'8px', cursor:'pointer'}}>変更を破棄して新規作成へ</button>}
              </div>
            </div>

            <h2>🌳 現在のWebサイト階層・ナビゲーション構成</h2>
            <p style={{color:'#718096', marginTop:'-10px'}}>以下のツリー構造通りにフロント側のヘッダーおよび動的ページが生成されます。</p>
            <div style={{marginTop:'20px'}}>
              {pageList.length === 0 ? (
                <p style={{color:'#a0aec0', padding:'30px', background:'white', borderRadius:'12px', textAlign:'center'}}>作成された固定ページはありません。上のフォームからTOPページやコースページを作成してください。</p>
              ) : (
                renderPageTree(null, 0)
              )}
            </div>
          </div>
        )}

        {/* 会員一覧タブ */}
        {activeTab === 'user-list' && (
          <div>
            <h1>会員一覧 <span style={{fontSize:'1.1rem', color:'#718096'}}>(全: {totalUserCount}件)</span></h1>
            <div style={styles.card}><input type="text" placeholder="氏名、メール、都道府県で検索..." value={searchWord} onChange={(e) => setSearchWord(e.target.value)} style={styles.input} /></div>
            <div style={styles.card}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>No.</th><th style={styles.th}>氏名</th><th style={styles.th}>メールアドレス</th><th style={styles.th}>都道府県</th><th style={styles.th}>保有ライセンス</th><th style={styles.th}>操作</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={styles.td}>{u.userNum}</td><td style={styles.td}><strong>{u.name}</strong></td><td style={styles.td}>{u.email}</td><td style={styles.td}>{u.prefecture}</td>
                      <td style={styles.td}>{licenseMasterList.map(master => { const userLic = u.licenses?.[master.id]; return userLic?.has ? <div key={master.id} style={{fontSize:'0.75rem', color:'#2b6cb0'}}>● {master.name} ({userLic.date || '未設定'})</div> : null; })}</td>
                      <td style={styles.td}><button style={styles.btnEdit} onClick={() => openEditUserModal(u)}>編集</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 会員登録タブ */}
        {activeTab === 'user-reg' && (
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
        )}

        {/* ライセンス・修了証マスター管理タブ */}
        {activeTab === 'license-master' && (
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
                      <td style={styles.td}><input type="text" value={item.name} style={{...styles.input, marginBottom:0, padding:'6px'}} onChange={async (e) => { const n = e.target.value; setLicenseMasterList(licenseMasterList.map(l => l.id === item.id ? {...l, name: n} : l)); await updateDoc(doc(db, "licenses_master", item.id), { name: n }); }} /></td>
                      <td style={styles.td}>{item.certFileUrl ? <a href={item.certFileUrl} target="_blank" rel="noreferrer" style={{color:'#319795', fontWeight:'bold'}}>📄 確認</a> : <span style={{color:'#e53e3e'}}>❌ 未登録</span>}</td>
                      <td style={styles.td} style={{textAlign:'right'}}><label style={{padding:'6px 12px', background:'#edf2f7', borderRadius:'6px', cursor:'pointer', fontSize:'0.8rem'}}>{uploadingLicenseId === item.id ? '⌛...' : '🔄 差し替え'}<input type="file" accept="application/pdf,image/*" style={{display:'none'}} onChange={(e) => handleFileChange(e, item.id)} /></label></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NEWS投稿タブ */}
        {activeTab === 'news-main' && (
          <div>
            <h1>{editId ? 'NEWS記事の編集' : 'NEWS新規作成'}</h1>
            <div style={styles.card}>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル" style={styles.input} />
              <div style={{ display: 'flex', gap: '20px' }}><div style={{ flex: 1 }}><label style={{ fontSize: '0.8rem', color: '#718096' }}>掲載日時</label><input type="datetime-local" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} style={styles.input} /></div><div style={{ flex: 1 }}><label style={{ fontSize: '0.8rem', color: '#718096' }}>公開ステータス</label><select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}><option value="public">一般公開</option><option value="private">非公開（下書き）</option></select></div></div>
              <div style={{ background: '#f7fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}><h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>🔒 閲覧権限の設定</h4><div style={{ marginBottom: '15px' }}><label style={{ marginRight: '20px', cursor: 'pointer' }}><input type="radio" name="accessType" value="all" checked={newsAccessType === 'all'} onChange={() => setNewsAccessType('all')} /> 全員に公開</label><label style={{ cursor: 'pointer', fontWeight: 'bold', color: '#2b6cb0' }}><input type="radio" name="accessType" value="limited" checked={newsAccessType === 'limited'} onChange={() => setNewsAccessType('limited')} /> 特定ライセンス保持者のみ</label></div>
              {newsAccessType === 'limited' && (<div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #edf2f7', marginBottom: '15px' }}><p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#4a5568', fontWeight: 'bold' }}>閲覧を許可するライセンス:</p>{licenseMasterList.map(master => (<label key={master.id} style={{ marginRight: '20px', display: 'inline-block', cursor: 'pointer' }}><input type="checkbox" checked={newsAllowedLicenses[master.id] || false} onChange={(e) => handleNewsAllowedLicensesCheckbox(master.id, e.target.checked)} /> {master.name}</label>))}<div style={{ marginTop: '15px', borderTop: '1px dashed #e2e8f0', paddingTop: '12px' }}><p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#4a5568', fontWeight: 'bold' }}>未所持者への見せ方:</p><label style={{ marginRight: '20px', cursor: 'pointer' }}><input type="radio" name="showTitle" checked={newsShowTitleToAll === true} onChange={() => setNewsShowTitleToAll(true)} /> 見出しだけ見せる</label><br /><label style={{ cursor: 'pointer', display: 'inline-block', marginTop: '5px' }}><input type="radio" name="showTitle" checked={newsShowTitleToAll === false} onChange={() => setNewsShowTitleToAll(false)} /> 存在自体を隠す</label></div></div>)}</div>
              <div style={{ background: 'white', marginBottom: '50px' }}><ReactQuill theme="snow" value={content} onChange={setContent} style={{ height: '300px' }} /></div>
              <button onClick={handleSaveNews} style={{ padding: '12px 24px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{editId ? '更新内容を保存' : '新規ニュースを保存'}</button>{editId && <button onClick={resetForm} style={{ marginLeft: '15px', padding: '12px 20px', borderRadius:'8px', cursor:'pointer' }}>キャンセル</button>}
            </div>
            {newsList.map(news => (<div key={news.id} style={{ ...styles.card, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ flex: 1 }}><span style={styles.badge(news.status === 'public')}>{news.status === 'public' ? '公開中' : '非公開'}</span>{news.accessControl?.isLimited ? (<span style={styles.badgeBlue}>🔒 限定: {news.accessControl.allowedLicenses?.join(', ')}</span>) : (<span style={{ fontSize: '0.7rem', color: '#a0aec0', marginLeft: '10px' }}>全員公開</span>)}<strong style={{ marginLeft: '10px', display:'block', marginTop:'5px', fontSize:'1.1rem' }}>{news.title}</strong><div style={{fontSize:'0.8rem', color:'#718096', marginTop:'4px'}}>📅 {news.publishedAt?.toDate()?.toLocaleString()}</div></div><button onClick={() => startEditNews(news)} style={styles.btnEdit}>編集</button><button onClick={() => handleDelete('news', news.id)} style={styles.btnDelete}>削除</button></div>))}
          </div>
        )}

        {/* インスタ連携タブ */}
        {activeTab === 'news-insta' && (
          <div>
            <h1>Instagram 連携管理</h1>
            <div style={styles.card}><input type="text" value={instaUrl} onChange={(e) => setInstaUrl(e.target.value)} placeholder="Instagram URL" style={styles.input} /><button onClick={handleSaveInsta} style={{ padding: '12px 24px', background: '#e1306c', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>連携を追加</button></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>{instaList.map(item => (<div key={item.id} style={styles.card}><img src={getInstaThumbnail(item.url)} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '8px' }} onError={(e) => { e.target.src = "https://via.placeholder.com/300?text=Private+or+Deleted"; }} /><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}><span onClick={() => toggleInstaStatus(item)} style={{ ...styles.badge(item.status === 'public'), cursor: 'pointer' }}>{item.status === 'public' ? '公開中' : '非公開'}</span><button onClick={() => handleDelete('instagram', item.id)} style={styles.btnDelete}>削除</button></div></div>))}</div>
          </div>
        )}

        {/* 掲示板確認タブ */}
        {activeTab === 'bbs-check' && (
          <div>
            <h1>掲示板確認・管理</h1>
            <div style={styles.card}><h3>📢 管理者として掲示板に新規投稿</h3><textarea placeholder="メッセージ..." style={styles.textarea} value={bbsContent} onChange={e => setBbsContent(e.target.value)} /><div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'15px'}}><div><input type="file" id="bbs-file-input" accept="image/*" onChange={e => setBbsFile(e.target.files[0])} /></div></div><button onClick={handlePostBbsAdmin} disabled={isBbsUploading} style={{ padding: '12px 24px', background: '#319795', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>投稿する</button></div>
            <div style={styles.card}><h3>投稿の監視・編集・削除</h3><input type="text" placeholder="リアルタイム検索..." value={bbsSearchWord} onChange={e => setBbsSearchWord(e.target.value)} style={styles.input} />{bbsList.map(item => (<div key={item.id} style={{borderBottom:'1px solid #edf2f7', padding:'20px 0', display:'flex', gap:'20px'}}>{item.imageUrl && <img src={item.imageUrl} style={{width:'100px', height:'100px', objectFit:'cover', borderRadius:'8px'}} />}<div style={{flex:1}}><div style={{display:'flex', justifyContent:'space-between'}}><span style={{fontWeight:'bold'}}>{item.userName}</span></div><p style={{whiteSpace:'pre-wrap'}}>{item.content}</p><div style={{display:'flex', gap:'15px'}}><button style={styles.btnEdit} onClick={() => openEditBbsModal(item)}>編集</button><button style={styles.btnDelete} onClick={() => handleDeleteBbsItem(item)}>削除</button></div></div></div>))}</div>
          </div>
        )}

        {/* 診断結果一覧タブ */}
        {activeTab === 'diag-results' && (
          <div>
            <h1>📥 受講資格診断 回答結果一覧</h1>
            <div style={styles.card}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>回答日時</th><th style={styles.th}>回答者情報</th><th style={styles.th}>判定ステータス</th><th style={styles.th}>操作</th></tr></thead>
                <tbody>
                  {diagResults.length === 0 ? (<tr><td colSpan="4" style={{...styles.td, textAlign:'center', color:'#a0aec0', padding:'30px'}}>まだ診断ログがありません。</td></tr>) : (
                    diagResults.map(result => (
                      <tr key={result.id}>
                        <td style={styles.td}>{result.createdAt?.toDate ? result.createdAt.toDate().toLocaleString() : '---'}</td>
                        <td style={styles.td}><strong>{result.respondentName || '匿名ユーザー'}</strong><div style={{fontSize:'0.75rem', color:'#718096'}}>{result.respondentEmail || 'メール登録なし'}</div></td>
                        <td style={styles.td}>{result.isPassed ? <span style={styles.badgeGreen}>🎉 受講要件クリア(合格)</span> : <span style={styles.badgeRed}>⚠️ 要件不足(不合格判定)</span>}</td>
                        <td style={styles.td}><button onClick={() => openResultDetailModal(result)} style={{...styles.btnEdit, background:'#ebf8ff', padding:'6px 12px', borderRadius:'6px'}}>👁️ 詳細を見る</button><button onClick={() => handleDelete('diagnostic_results', result.id)} style={{...styles.btnDelete, marginLeft:'15px'}}>削除</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 診断の設問管理画面 */}
        {activeTab === 'diag-questions' && (
          <div>
            <h1>{diagEditId ? '⚙️ 設問の編集' : '✨ 資格診断の設問新規追加'}</h1>
            <div style={styles.card}>
              <div style={{ display: 'flex', gap: '20px', background: '#edf2f7', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: '0.85rem', color: '#4a5568', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>💡 設問タイプ</label><label style={{ marginRight: '20px', cursor: 'pointer' }}><input type="radio" name="diagType" value="choice" checked={diagType === 'choice'} onChange={() => setDiagType('choice')} /> 選択肢形式</label><label style={{ cursor: 'pointer' }}><input type="radio" name="diagType" value="text" checked={diagType === 'text'} onChange={() => setDiagType('text')} /> 自由記述形式</label></div>
                <div style={{ width: '200px' }}><label style={{ fontSize: '0.85rem', color: '#4a5568', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📌 解答の必須設定</label><select value={diagRequired ? 'true' : 'false'} onChange={(e) => setDiagRequired(e.target.value === 'true')} style={{ ...styles.input, marginBottom: 0, padding: '8px' }}><option value="true">必須</option><option value="false">任意</option></select></div>
              </div>
              <div style={{display:'flex', gap:'20px'}}><div style={{flex:1}}><label style={{fontSize:'0.85rem', color:'#718096', fontWeight:'bold'}}>設問文</label><input type="text" value={diagQuestionText} onChange={e => setDiagQuestionText(e.target.value)} style={styles.input} /></div><div style={{width:'120px'}}><label style={{fontSize:'0.85rem', color:'#718096', fontWeight:'bold'}}>表示順</label><input type="number" value={diagOrder} onChange={e => setDiagOrder(e.target.value)} style={styles.input} /></div></div>
              <textarea placeholder="補足説明文" value={diagDescription} onChange={e => setDiagDescription(e.target.value)} style={styles.textarea} />
              {diagType === 'choice' && (
                <div>
                  {diagChoices.map((choice, index) => (
                    <div key={index} style={{display:'flex', background:'#f8fafc', padding:'15px', borderRadius:'8px', gap:'15px', alignItems:'center', marginBottom:'12px'}}>
                      <input type="text" value={choice.text} onChange={e => handleUpdateDiagChoiceField(index, 'text', e.target.value)} style={{...styles.input, marginBottom:0, flex:1}} />
                      <button onClick={() => handleUpdateDiagChoiceField(index, 'isQualified', true)} style={{padding:'6px 12px', background: choice.isQualified ? '#48bb78' : '#fff', color: choice.isQualified ? '#fff' : '#4a5568'}}>合格</button>
                      <button onClick={() => handleUpdateDiagChoiceField(index, 'isQualified', false)} style={{padding:'6px 12px', background: !choice.isQualified ? '#f56565' : '#fff', color: !choice.isQualified ? '#fff' : '#4a5568'}}>不合格</button>
                      <button onClick={() => handleRemoveDiagChoice(index)} style={{color:'#e53e3e', border:'none', background:'none'}}>❌</button>
                    </div>
                  ))}
                  <button onClick={handleAddDiagChoice}>➕ 選択肢を追加</button>
                </div>
              )}
              <div style={{borderTop:'1px solid #edf2f7', paddingTop:'20px'}}><button onClick={handleSaveDiagQuestion}>{diagEditId ? '変更保存' : '新規登録'}</button></div>
            </div>
          </div>
        )}

        {/* 診断結果メッセージ設定 */}
        {activeTab === 'diag-settings' && (
          <div>
            <h1>⚙️ 診断結果メッセージの編集</h1>
            <div style={styles.card}>
              <h3>合格時</h3><input type="text" value={diagSuccessTitle} onChange={e => setDiagSuccessTitle(e.target.value)} style={styles.input} />
              <ReactQuill theme="snow" value={diagSuccessContent} onChange={setDiagSuccessContent} style={{height:'200px', marginBottom:'50px'}} />
            </div>
            <div style={styles.card}>
              <h3>不合格時</h3><input type="text" value={diagFailTitle} onChange={e => setDiagFailTitle(e.target.value)} style={styles.input} />
              <ReactQuill theme="snow" value={diagFailContent} onChange={setDiagFailContent} style={{height:'200px', marginBottom:'50px'}} />
            </div>
            <button onClick={handleSaveDiagSettings}>保存する</button>
          </div>
        )}
      </div>

      {/* モーダル群 (会員編集、掲示板編集、診断詳細モーダルなど既存のものを全て完備) */}
      {isEditModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2>会員情報の編集</h2>
            <input type="text" style={styles.input} value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
            <input type="email" style={styles.input} value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
            <button onClick={handleUpdateUser}>保存</button><button onClick={() => setIsEditModalOpen(false)}>閉じる</button>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default App;