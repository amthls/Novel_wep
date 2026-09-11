'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FileText, 
  Sparkles, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Image as ImageIcon, 
  BookOpen, 
  Layers, 
  Send, 
  Save, 
  Eye, 
  Check, 
  ArrowLeft, 
  UploadCloud, 
  AlignLeft, 
  HelpCircle,
  Clock,
  User,
  ShieldCheck,
  Lock,
  LogIn
} from 'lucide-react';
import SmartImage from '@/components/common/SmartImage';
import ImageUploadDropzone from '@/components/common/ImageUploadDropzone';
import { useAuth } from '@/context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface EditorLineBlock {
  id: string;
  text: string;
  note?: string;
  image_url?: string;
}

function SmartChapterEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStoryId = searchParams?.get('story_id') || '';

  const { user, isAuthenticated, isLoading: isAuthLoading, openAuthModal, authFetch, hasRole } = useAuth();

  const [stories, setStories] = useState<any[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState(initialStoryId);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  
  const [volumes, setVolumes] = useState<any[]>([]);
  const [selectedVolumeId, setSelectedVolumeId] = useState('');
  const [newVolumeTitle, setNewVolumeTitle] = useState('');
  const [isCreatingNewVolume, setIsCreatingNewVolume] = useState(false);

  const [chapterNumber, setChapterNumber] = useState<number | string>(1);
  const [chapterTitle, setChapterTitle] = useState('');

  // Line-based Smart Editor Blocks
  const [blocks, setBlocks] = useState<EditorLineBlock[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
    { id: '3', text: '' },
  ]);

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fast paste text splitter
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');

  // Load all stories
  useEffect(() => {
    async function fetchStories() {
      try {
        const res = await fetch(`${API_BASE_URL}/stories/explore?limit=100`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) setStories(json.data || []);
        }
      } catch (e) {}
    }
    fetchStories();
  }, []);

  // When story changes, load story detail (volumes & latest chapter number)
  useEffect(() => {
    if (!selectedStoryId) return;

    async function fetchStoryDetail() {
      try {
        const found = stories.find(s => s.id === selectedStoryId);
        if (found) {
          const res = await fetch(`${API_BASE_URL}/stories/${found.slug}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success) {
              setSelectedStory(json.data);
              setVolumes(json.data.volumes || []);
              if (json.data.volumes && json.data.volumes.length > 0) {
                setSelectedVolumeId(json.data.volumes[0].id);
              }
              const nextNum = (json.data.total_chapters || 0) + 1;
              setChapterNumber(nextNum);
            }
          }
        }
      } catch (e) {}
    }
    fetchStoryDetail();
  }, [selectedStoryId, stories]);

  // Filter stories manageable by current user
  const manageableStories = hasRole('admin', 'mod') 
    ? stories 
    : stories.filter(s => s.uploader_id === user?.id || (s.collaborators && s.collaborators.some((c: any) => c.user_id === user?.id)));

  // Block management
  const updateBlockText = (id: string, text: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, text } : b));
  };

  const updateBlockNote = (id: string, note: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, note } : b));
  };

  const updateBlockImage = (id: string, image_url: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, image_url } : b));
  };

  const addBlockBelow = (index: number) => {
    const newBlock: EditorLineBlock = { id: Date.now().toString(), text: '' };
    const next = [...blocks];
    next.splice(index + 1, 0, newBlock);
    setBlocks(next);
  };

  const removeBlock = (index: number) => {
    if (blocks.length <= 1) return;
    setBlocks(blocks.filter((_, idx) => idx !== index));
  };

  // Convert pasted text into line blocks
  const handleApplyPastedText = () => {
    if (!pasteRawText.trim()) return;
    const lines = pasteRawText.split(/\n\s*\n/).map(l => l.trim()).filter(Boolean);
    const newBlocks: EditorLineBlock[] = lines.map((l, i) => ({
      id: `${Date.now()}-${i}`,
      text: l,
    }));
    setBlocks(newBlocks);
    setPasteRawText('');
    setPasteModalOpen(false);
  };

  // Auto calculate word count & reading time
  const totalWords = blocks
    .map(b => b.text)
    .filter(Boolean)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

  const readingTimeMin = Math.max(1, Math.ceil(totalWords / 220));

  // Handle Create New Volume
  const handleCreateVolume = async () => {
    if (!newVolumeTitle.trim() || !selectedStoryId) return;
    try {
      const nextVolNum = volumes.length + 1;
      const res = await authFetch(`${API_BASE_URL}/stories/${selectedStoryId}/volumes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newVolumeTitle.trim(),
          volume_number: nextVolNum,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setVolumes([...volumes, json.data]);
        setSelectedVolumeId(json.data.id);
        setIsCreatingNewVolume(false);
        setNewVolumeTitle('');
      }
    } catch (e) {}
  };

  // Handle Submit / Save
  const handleSaveOrSubmit = async (isDraft: boolean) => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (!selectedStoryId || !chapterTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const formattedBlocks = blocks.map((b, idx) => ({
        block_order: idx + 1,
        text: b.text || '',
        note: b.note || null,
        image_url: b.image_url && b.image_url !== 'placeholder' ? b.image_url : null,
      }));

      const res = await authFetch(`${API_BASE_URL}/chapters/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story_id: selectedStoryId,
          volume_id: selectedVolumeId || null,
          title: chapterTitle.trim(),
          chapter_number: parseFloat(chapterNumber.toString()),
          content: blocks.map(b => b.text).filter(Boolean).join('\n\n'),
          content_blocks: formattedBlocks,
          word_count: totalWords,
          status: isDraft ? 'draft' : 'published',
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback(json.message || 'Đăng chương thành công');
        setTimeout(() => {
          if (selectedStory?.slug) {
            router.push(`/truyen/${selectedStory.slug}`);
          } else {
            router.push('/nhom-dich');
          }
        }, 1500);
      } else {
        setErrorMsg(json.message || 'Đăng chương thất bại.');
      }
    } catch (e: any) {
      setErrorMsg('Lỗi: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-pulse text-gray-400 text-sm">
        Đang kiểm tra quyền đăng chương...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-5 shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Yêu Cầu Đăng Nhập</h2>
        <p className="text-sm text-gray-400 mb-6">
          Chỉ có chủ thầu truyện, dịch giả hoặc Mod/Admin mới có quyền đăng chương truyện mới. Vui lòng đăng nhập.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition flex items-center justify-center gap-2 mx-auto"
        >
          <LogIn className="w-4 h-4" />
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-32">
      
      {/* Back Button */}
      <div>
        <Link
          href="/nhom-dich"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Quản Lý Nhóm Dịch</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-8 glass-panel border border-brand-500/30 bg-gradient-to-r from-brand-900/30 via-indigo-900/20 to-[#0F0F17] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" /> Trình Soạn Thảo Đăng Chương Siêu Hiện Đại
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
            Đăng & Soạn Thảo Chương Truyện Theo Dòng
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">
            Hỗ trợ chèn chú thích dịch giả trên từng dòng, kéo thả ảnh minh họa tại dòng, tính số từ tự động và xem trước Reader Live Preview!
          </p>
        </div>

        {/* Live Stats Capsule */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-4 text-xs shrink-0">
          <div>
            <div className="text-gray-400 text-[10px] uppercase font-bold">Tổng Số Từ</div>
            <div className="text-base font-extrabold text-brand-300">{totalWords.toLocaleString()} chữ</div>
          </div>
          <div className="w-[1px] h-8 bg-white/15" />
          <div>
            <div className="text-gray-400 text-[10px] uppercase font-bold">Thời Gian Đọc</div>
            <div className="text-base font-extrabold text-cyan-300">~{readingTimeMin} phút</div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. STEP 1: PUBLICATION METADATA BAR */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10 bg-[#12121e]/90 space-y-4 shadow-xl">
        <h2 className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> 1. Thông Tin Xuất Bản & Phân Mục Truyện
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Select Story */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">Chọn Bộ Truyện *</label>
            <select
              value={selectedStoryId}
              onChange={(e) => setSelectedStoryId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#0f0f18] border border-white/10 text-xs text-white focus:outline-none focus:border-brand-500 font-semibold"
              required
            >
              <option value="">-- Chọn bộ truyện để đăng chương --</option>
              {manageableStories.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            {manageableStories.length === 0 && (
              <p className="text-[10px] text-amber-400 mt-1">
                Bạn chưa sở hữu hoặc là cộng tác viên của bộ truyện nào. Hãy <Link href="/dang-truyen" className="underline">Đăng truyện mới</Link> trước.
              </p>
            )}
          </div>

          {/* Select or Create Volume */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-200">Chọn Tập (Volume)</label>
              <button
                type="button"
                onClick={() => setIsCreatingNewVolume(!isCreatingNewVolume)}
                className="text-[10px] text-cyan-400 hover:underline font-semibold"
              >
                + Thêm tập mới
              </button>
            </div>

            {isCreatingNewVolume ? (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <input
                  type="text"
                  placeholder="Tên tập mới (e.g. Quyển 2)..."
                  value={newVolumeTitle}
                  onChange={(e) => setNewVolumeTitle(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl bg-[#0f0f18] border border-white/10 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleCreateVolume}
                  className="px-3 h-10 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                >
                  Tạo
                </button>
              </div>
            ) : (
              <select
                value={selectedVolumeId}
                onChange={(e) => setSelectedVolumeId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#0f0f18] border border-white/10 text-xs text-white focus:outline-none focus:border-brand-500 font-semibold"
              >
                {volumes.map((v) => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
            )}
          </div>

          {/* Chapter Number & Story Group info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-200">Số Chương *</label>
              <input
                type="number"
                step="0.1"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#0f0f18] border border-white/10 text-xs text-white font-bold text-center focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-200">Nhóm Dịch</label>
              <div className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-brand-300 font-bold flex items-center truncate">
                {selectedStory?.group_name || 'Độc lập'}
              </div>
            </div>
          </div>

        </div>

        {/* Chapter Title */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-gray-200">Tiêu Đề Chương *</label>
          <input
            type="text"
            placeholder="e.g. Mở đầu: Thiên sứ về ngoài hoặc Chương 1: Khởi đầu..."
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 font-bold transition"
            required
          />
        </div>

      </div>

      {/* 2. STEP 2: SMART LINE-BASED EDITOR & LIVE READER PREVIEW */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10 bg-[#12121e]/90 space-y-6 shadow-2xl">
        
        {/* Editor Toolbar Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-1.5 rounded-lg transition ${
                  activeTab === 'editor' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                ✏️ Soạn Thảo Từng Dòng ({blocks.length} đoạn)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'preview' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Xem Trước Reader Live</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPasteModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 flex items-center gap-1.5 transition"
            >
              <AlignLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dán Văn Bản Hàng Loạt (Auto Split)</span>
            </button>
          </div>
        </div>

        {/* EDITOR TAB */}
        {activeTab === 'editor' && (
          <div className="space-y-4">
            {blocks.map((block, idx) => (
              <div 
                key={block.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-500/30 transition-all space-y-3 relative group"
              >
                {/* Line number and micro actions */}
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="font-bold text-brand-400 uppercase tracking-wider">Đoạn #{idx + 1}</span>
                  
                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition">
                    {/* Add note toggle */}
                    <button
                      type="button"
                      onClick={() => updateBlockNote(block.id, block.note !== undefined ? '' : 'Nhập lời bình dịch giả tại đây...')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${
                        block.note ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                      title="Chèn chú thích / lời bình dịch giả trên dòng này"
                    >
                      <MessageSquare className="w-3 h-3 text-amber-400" />
                      <span>{block.note ? 'Đang có Chú Thích' : '+ Chú Thích Dịch Giả'}</span>
                    </button>

                    {/* Add image toggle */}
                    <button
                      type="button"
                      onClick={() => updateBlockImage(block.id, block.image_url ? '' : 'placeholder')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${
                        block.image_url ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                      title="Chèn ảnh minh họa ngay tại dòng này"
                    >
                      <ImageIcon className="w-3 h-3 text-cyan-400" />
                      <span>{block.image_url ? 'Đang có Ảnh' : '+ Chèn Ảnh Tại Dòng'}</span>
                    </button>

                    {/* Remove Line */}
                    <button
                      type="button"
                      onClick={() => removeBlock(idx)}
                      className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                      title="Xóa đoạn này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main Paragraph Textarea */}
                <textarea
                  rows={2}
                  placeholder={`Nhập nội dung đoạn văn #${idx + 1}...`}
                  value={block.text}
                  onChange={(e) => updateBlockText(block.id, e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/30 border border-white/10 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition leading-relaxed"
                />

                {/* Translator Note Box (if enabled) */}
                {block.note !== undefined && block.note !== '' && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 uppercase">
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Lời Bình / Chú Thích Dịch Giả Tại Đoạn #{idx + 1}</span>
                      <button type="button" onClick={() => updateBlockNote(block.id, '')} className="text-rose-400 hover:underline">Gỡ chú thích</button>
                    </div>
                    <input
                      type="text"
                      placeholder="Giải thích nghĩa từ ngữ, bối cảnh, hoặc lời bình của dịch giả..."
                      value={block.note}
                      onChange={(e) => updateBlockNote(block.id, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-amber-500/20 text-xs text-amber-200 placeholder-amber-500/40 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                {/* Inline Image Dropzone (if enabled) */}
                {block.image_url !== undefined && block.image_url !== '' && (
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400 uppercase">
                      <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Ảnh Minh Họa Chèn Tại Đoạn #{idx + 1}</span>
                      <button type="button" onClick={() => updateBlockImage(block.id, '')} className="text-rose-400 hover:underline">Gỡ ảnh</button>
                    </div>

                    <ImageUploadDropzone
                      images={block.image_url && block.image_url !== 'placeholder' ? [block.image_url] : []}
                      onChange={(imgs) => updateBlockImage(block.id, imgs.length > 0 ? imgs[0] : '')}
                      maxFiles={1}
                      label={`Kéo thả ảnh minh họa đoạn #${idx + 1}`}
                    />
                  </div>
                )}

                {/* Quick Add Next Line Button */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => addBlockBelow(idx)}
                    className="text-[10px] font-bold text-gray-500 hover:text-brand-300 py-0.5 px-3 rounded-full hover:bg-white/5 transition"
                  >
                    + Thêm đoạn tiếp theo bên dưới
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addBlockBelow(blocks.length - 1)}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-white/15 hover:border-brand-500/40 text-gray-400 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-brand-400" />
              <span>Thêm Đoạn Văn Bản Mới</span>
            </button>
          </div>
        )}

        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0d0d15] border border-white/10 space-y-6 max-w-3xl mx-auto font-serif text-gray-200 text-base leading-loose shadow-inner">
            
            {/* Header Preview */}
            <div className="text-center pb-6 border-b border-white/10 space-y-2 font-sans">
              <div className="text-xs uppercase font-bold tracking-wider text-brand-400">
                {selectedStory?.title || 'Tên bộ truyện'} • Tập {volumes.find(v => v.id === selectedVolumeId)?.title || '1'}
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Chương {chapterNumber}: {chapterTitle || 'Tiêu đề chương'}
              </h1>
              <div className="flex items-center justify-center gap-3 text-xs text-gray-400 pt-1">
                <span>{totalWords.toLocaleString()} chữ</span>
                <span>•</span>
                <span>Nhóm: {selectedStory?.group_name || 'Độc lập'}</span>
                <span>•</span>
                <span>Người đăng: {user?.display_name || user?.username}</span>
              </div>
            </div>

            {/* Paragraphs and Inline Notes/Images Preview */}
            <div className="space-y-6">
              {blocks.map((b, idx) => (
                <div key={b.id} className="space-y-4">
                  {b.text && (
                    <p className="hover:bg-white/5 rounded-lg px-2 py-1 transition relative">
                      {b.text}
                    </p>
                  )}

                  {/* Translator Note in Reader */}
                  {b.note && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border-l-4 border-amber-500 text-xs font-sans text-amber-200 italic space-y-0.5">
                      <span className="font-bold text-[10px] uppercase text-amber-400 block not-italic">Chú thích dịch giả:</span>
                      {b.note}
                    </div>
                  )}

                  {/* Inline Illustration Image in Reader */}
                  {b.image_url && b.image_url !== 'placeholder' && (
                    <div className="my-6 flex flex-col items-center">
                      <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/15 max-w-lg bg-black/40">
                        <SmartImage src={b.image_url} alt={`Minh họa đoạn ${idx + 1}`} className="w-full h-auto" />
                      </div>
                      <span className="text-[11px] text-gray-500 mt-2 font-sans italic">Ảnh minh họa đoạn #{idx + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div className="text-xs text-gray-400">
            * Chỉ chủ thầu bộ truyện, thành viên nhóm dịch hoặc Mod/Admin mới có thể xuất bản chương.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleSaveOrSubmit(true)}
              disabled={!selectedStoryId || !chapterTitle.trim() || isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-bold text-xs border border-white/15 flex items-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu Bản Nháp</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveOrSubmit(false)}
              disabled={!selectedStoryId || !chapterTitle.trim() || isSubmitting}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-xl shadow-brand-500/25 flex items-center gap-2 transition hover:scale-105"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang gửi...' : 'Nộp & Xuất Bản Chương'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* PASTE BULK TEXT MODAL */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#141422] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-cyan-400" /> Dán Văn Bản Hàng Loạt (Tự Động Tách Đoạn)
              </h3>
              <button onClick={() => setPasteModalOpen(false)} className="text-gray-400 hover:text-white text-xs">Đóng</button>
            </div>
            <p className="text-xs text-gray-400">Dán toàn bộ văn bản chương vào đây. Hệ thống sẽ tự động tách thành các đoạn văn riêng biệt để bạn dễ dàng chèn chú thích và ảnh minh họa.</p>
            <textarea
              rows={8}
              placeholder="Dán toàn bộ nội dung chương truyện vào đây..."
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setPasteModalOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 text-xs">Hủy</button>
              <button onClick={handleApplyPastedText} className="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold">Tự Động Tách Đoạn</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SmartChapterEditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-12 text-center text-white">Đang tải trình soạn thảo chương...</div>}>
      <SmartChapterEditorContent />
    </Suspense>
  );
}
