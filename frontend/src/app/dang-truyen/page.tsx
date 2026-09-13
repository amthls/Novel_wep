'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BookOpen, 
  Sparkles, 
  Users, 
  Send, 
  Check, 
  ArrowLeft, 
  Layers, 
  Tag as TagIcon,
  Lock,
  LogIn,
  Search,
  X,
  AlertCircle
} from 'lucide-react';
import ImageUploadDropzone from '@/components/common/ImageUploadDropzone';
import { useAuth } from '@/context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface TagItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface TagCategory {
  category_id: string;
  category_name: string;
  category_label: string;
  tags: TagItem[];
}

function CreateStoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedGroupId = searchParams?.get('group_id') || '';
  const { user, isAuthenticated, isLoading: isAuthLoading, openAuthModal, authFetch } = useAuth();

  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [storyType, setStoryType] = useState<'novel' | 'manga'>('novel');
  const [selectedGroupId, setSelectedGroupId] = useState(preselectedGroupId);
  const [originalLanguage, setOriginalLanguage] = useState('ja');
  
  const [groups, setGroups] = useState<any[]>([]);
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');
  const [tagSearch, setTagSearch] = useState('');
  const [coverImages, setCoverImages] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [groupRes, tagRes] = await Promise.all([
          fetch(`${API_BASE_URL}/groups`),
          fetch(`${API_BASE_URL}/tags`),
        ]);
        if (groupRes.ok) {
          const json = await groupRes.json();
          if (json.success) setGroups(json.data || []);
        }
        if (tagRes.ok) {
          const json = await tagRes.json();
          if (json.success && Array.isArray(json.data)) {
            setTagCategories(json.data);
          }
        }
      } catch (e) {
        console.error('Lỗi khi tải dữ liệu nhóm/tag:', e);
      }
    }
    fetchData();
  }, []);

  // Flattened all tags map
  const allTags = useMemo(() => {
    const list: TagItem[] = [];
    const seen = new Set<string>();
    tagCategories.forEach((cat) => {
      if (Array.isArray(cat.tags)) {
        cat.tags.forEach((t) => {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            list.push(t);
          }
        });
      }
    });
    return list;
  }, [tagCategories]);

  // Filtered tags according to active category tab and search query
  const displayedCategories = useMemo(() => {
    const query = tagSearch.trim().toLowerCase();
    
    return tagCategories
      .filter((cat) => activeCategoryTab === 'all' || cat.category_name === activeCategoryTab)
      .map((cat) => {
        const filteredTags = (cat.tags || []).filter((t) => {
          if (!query) return true;
          return (
            t.name.toLowerCase().includes(query) ||
            t.slug.toLowerCase().includes(query) ||
            (t.description && t.description.toLowerCase().includes(query))
          );
        });
        return {
          ...cat,
          tags: filteredTags,
        };
      })
      .filter((cat) => cat.tags.length > 0);
  }, [tagCategories, activeCategoryTab, tagSearch]);

  const handleTagToggle = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((id) => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleClearSelectedTags = () => {
    setSelectedTags([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (!title.trim() || isSubmitting) return;

    if (selectedTags.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một thể loại hoặc thẻ tag cho tác phẩm.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          original_title: originalTitle.trim() || null,
          author_name: authorName.trim() || null,
          artist_name: artistName.trim() || null,
          synopsis: synopsis.trim() || null,
          story_type: storyType,
          group_id: selectedGroupId || null,
          original_language: originalLanguage,
          cover_image_url: coverImages.length > 0 ? coverImages[0] : null,
          tags: selectedTags,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback('Đăng bộ truyện thành công! Đang chuyển hướng sang trang đăng chương...');
        setTimeout(() => {
          router.push(`/dang-chuong?story_id=${json.data.id}`);
        }, 1500);
      } else {
        setErrorMsg(json.message || 'Đăng truyện thất bại.');
      }
    } catch (e: any) {
      setErrorMsg('Lỗi kết nối: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-pulse text-gray-400 text-sm">
        Đang kiểm tra quyền đăng truyện...
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
          Bạn cần đăng nhập tài khoản để xuất bản tác phẩm và quản lý quyền chủ thầu bộ truyện.
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-24">
      
      {/* Back Link */}
      <div>
        <Link
          href="/nhom-dich"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Nhóm Dịch</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl border border-brand-500/20 bg-[#141420] bg-gradient-to-r from-brand-950/60 via-[#161626] to-[#0F0F17] space-y-2 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold">
          <BookOpen className="w-3.5 h-3.5 text-brand-400" /> Hệ Thống Xuất Bản Tác Phẩm Mới
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Đăng Bộ Truyện Mới Lên NovelHub
        </h1>
        <p className="text-xs sm:text-sm text-gray-300">
          Tạo bộ truyện mới, thiết lập nhóm dịch quản lý, tải ảnh bìa sắc nét và phân loại thể loại chi tiết!
        </p>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Story Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#141420] shadow-2xl space-y-6">
        
        {/* Story Title & Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-gray-200">Tên Truyện *</label>
            <input
              type="text"
              placeholder="e.g. Vì Đã Trở Thành Kẻ Thù Của Oshi..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500 font-semibold transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">Loại Truyện</label>
            <select
              value={storyType}
              onChange={(e) => setStoryType(e.target.value as any)}
              className="w-full h-11 px-3 rounded-xl bg-[#0f0f17] border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
            >
              <option value="novel">Light Novel / Web Novel</option>
              <option value="manga">Manga / Truyện Tranh</option>
            </select>
          </div>
        </div>

        {/* Original Title & Group Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">Tên Gốc (Tiếng Nhật / Hàn / Trung)</label>
            <input
              type="text"
              placeholder="e.g. オシの敵になったので..."
              value={originalTitle}
              onChange={(e) => setOriginalTitle(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">Nhóm Dịch Quản Lý</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-[#0f0f17] border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="">-- Đăng độc lập (Không thuộc nhóm nào) --</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Author & Artist & Language */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">Tác Giả</label>
            <input
              type="text"
              placeholder="e.g. Nagatsuki Tappei"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">Họa Sĩ (Artist)</label>
            <input
              type="text"
              placeholder="e.g. Otsuka Shinichirou"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">Ngôn Ngữ Gốc</label>
            <select
              value={originalLanguage}
              onChange={(e) => setOriginalLanguage(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#0f0f17] border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="ja">Tiếng Nhật (Japanese)</option>
              <option value="ko">Tiếng Hàn (Korean)</option>
              <option value="zh">Tiếng Trung (Chinese)</option>
              <option value="en">Tiếng Anh (English)</option>
              <option value="vi">Tiếng Việt (Sáng tác)</option>
            </select>
          </div>
        </div>

        {/* Synopsis */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-200">Tóm Tắt Cốt Truyện</label>
          <textarea
            rows={4}
            placeholder="Nhập tóm tắt nội dung tác phẩm để thu hút độc giả..."
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500 resize-none leading-relaxed"
          />
        </div>

        {/* Cover Image Dropzone */}
        <div className="space-y-2">
          <ImageUploadDropzone
            images={coverImages}
            onChange={setCoverImages}
            maxFiles={1}
            label="Ảnh bìa tác phẩm (Poster Cover)"
          />
        </div>

        {/* Tag Selection Section */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
              <TagIcon className="w-4 h-4 text-brand-400" />
              <span>Chọn Thể Loại / Thẻ Tag</span>
              <span className="text-rose-400">*</span>
              <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-semibold">
                {selectedTags.length} đã chọn
              </span>
            </div>

            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelectedTags}
                className="text-[11px] text-gray-400 hover:text-rose-400 font-medium transition cursor-pointer self-start sm:self-auto"
              >
                Bỏ chọn tất cả
              </button>
            )}
          </div>

          {/* Selected Tags Display */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl bg-[#0f0f17] border border-brand-500/20">
              <span className="text-[11px] text-gray-400 font-medium mr-1">Đã chọn:</span>
              {selectedTags.map((tagId) => {
                const tagObj = allTags.find((t) => t.id === tagId);
                if (!tagObj) return null;
                return (
                  <span
                    key={tagId}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand-600 text-white text-xs font-medium shadow-sm transition hover:bg-brand-700"
                  >
                    <span>{tagObj.name}</span>
                    <button
                      type="button"
                      onClick={() => handleTagToggle(tagId)}
                      className="p-0.5 rounded-full hover:bg-white/20 transition cursor-pointer"
                      title="Bỏ chọn"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Tag Filter Controls: Tabs & Search */}
          <div className="space-y-2.5 p-4 rounded-2xl bg-[#0f0f17] border border-white/10">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Category Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeCategoryTab === 'all'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Tất cả ({allTags.length})
                </button>
                {tagCategories.map((cat) => (
                  <button
                    key={cat.category_id}
                    type="button"
                    onClick={() => setActiveCategoryTab(cat.category_name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeCategoryTab === cat.category_name
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {cat.category_label} ({cat.tags?.length || 0})
                  </button>
                ))}
              </div>

              {/* Tag Quick Search Bar */}
              <div className="relative sm:w-56 shrink-0">
                <input
                  type="text"
                  placeholder="Tìm thể loại..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-7 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-brand-500 transition"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {tagSearch && (
                  <button
                    type="button"
                    onClick={() => setTagSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Tag List Grouped by Categories */}
            <div className="max-h-64 overflow-y-auto space-y-4 pt-2 pr-1 divide-y divide-white/5">
              {displayedCategories.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs">
                  Không tìm thấy thể loại nào phù hợp với từ khóa &ldquo;{tagSearch}&rdquo;
                </div>
              ) : (
                displayedCategories.map((cat) => (
                  <div key={cat.category_id} className="pt-3 first:pt-0 space-y-2">
                    {activeCategoryTab === 'all' && (
                      <div className="text-[11px] font-bold text-brand-300 uppercase tracking-wider">
                        {cat.category_label}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {cat.tags.map((tag) => {
                        const isSelected = selectedTags.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleTagToggle(tag.id)}
                            title={tag.description || tag.name}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 select-none ${
                              isSelected
                                ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-500/25 font-semibold'
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                            <span>{tag.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-gray-400">
            * Sau khi tạo truyện, bạn sẽ được chuyển thẳng đến Trình Soạn Thảo Đăng Chương
          </p>

          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-xl shadow-brand-500/25 flex items-center gap-2 transition hover:scale-105 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Đang tạo...' : 'Tạo Bộ Truyện & Sang Đăng Chương'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}

export default function CreateStoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-12 text-center text-white">Đang tải biểu mẫu...</div>}>
      <CreateStoryContent />
    </Suspense>
  );
}
