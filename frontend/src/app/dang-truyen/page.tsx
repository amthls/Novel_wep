'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  LogIn
} from 'lucide-react';
import ImageUploadDropzone from '@/components/common/ImageUploadDropzone';
import { useAuth } from '@/context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
          if (json.success) setTags(json.data || []);
        }
      } catch (e) {}
    }
    fetchData();
  }, []);

  const handleTagToggle = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (!title.trim() || isSubmitting) return;

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
        setFeedback('\u0110\u0103ng b\u1ed9 truy\u1ec7n th\u00e0nh c\u00f4ng! \u0110ang chuy\u1ec3n h\u01b0\u1edbng sang trang \u0111\u0103ng ch\u01b0\u01a1ng...');
        setTimeout(() => {
          router.push(`/dang-chuong?story_id=${json.data.id}`);
        }, 1500);
      } else {
        setErrorMsg(json.message || '\u0110\u0103ng truy\u1ec7n th\u1ea5t b\u1ea1i.');
      }
    } catch (e: any) {
      setErrorMsg('L\u1ed7i k\u1ebft n\u1ed1i: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-pulse text-gray-400 text-sm">
        {'\u0110ang ki\u1ec3m tra quy\u1ec1n \u0111\u0103ng truy\u1ec7n...'}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-5 shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{'Y\u00eau C\u1ea7u \u0110\u0103ng Nh\u1eadp'}</h2>
        <p className="text-sm text-gray-400 mb-6">
          {'B\u1ea1n c\u1ea7n \u0111\u0103ng nh\u1eadp t\u00e0i kho\u1ea3n \u0111\u1ec3 xu\u1ea5t b\u1ea3n t\u00e1c ph\u1ea9m v\u00e0 qu\u1ea3n l\u00fd quy\u1ec1n ch\u1ee7 th\u1ea7u b\u1ed9 truy\u1ec7n.'}
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition flex items-center justify-center gap-2 mx-auto"
        >
          <LogIn className="w-4 h-4" />
          {'\u0110\u0103ng nh\u1eadp ngay'}
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
          <span>{'Quay l\u1ea1i Nh\u00f3m D\u1ecbch'}</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-brand-500/20 bg-gradient-to-r from-brand-900/30 via-indigo-900/20 to-[#0F0F17] space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold">
          <BookOpen className="w-3.5 h-3.5 text-brand-400" /> {'H\u1ec7 Th\u1ed1ng Xu\u1ea5t B\u1ea3n T\u00e1c Ph\u1ea9m M\u1edbi'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          {'\u0110\u0103ng B\u1ed9 Truy\u1ec7n M\u1edbi L\u00ean NovelHub'}
        </h1>
        <p className="text-xs sm:text-sm text-gray-300">
          {'T\u1ea1o b\u1ed9 truy\u1ec7n m\u1edbi, thi\u1ebft l\u1eadp nh\u00f3m d\u1ecbch qu\u1ea3n l\u00fd, t\u1ea3i \u1ea3nh b\u00eca s\u1eafc n\u00e9t t\u1eeb m\u00e1y t\u00ednh v\u00e0 ph\u00e2n lo\u1ea1i th\u1ec3 lo\u1ea1i!'}
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
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Story Form */}
      <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#141420]/80 space-y-6">
        
        {/* Story Title & Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-gray-200">{'T\u00ean Truy\u1ec7n *'}</label>
            <input
              type="text"
              placeholder="e.g. V\u00ec \u0110\u00e3 Tr\u1edf Th\u00e0nh K\u1ebb Th\u00f9 C\u1ee7a Oshi..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500 font-semibold transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">{'Lo\u1ea1i Truy\u1ec7n'}</label>
            <select
              value={storyType}
              onChange={(e) => setStoryType(e.target.value as any)}
              className="w-full h-11 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500 font-semibold"
            >
              <option value="novel">Light Novel / Web Novel</option>
              <option value="manga">{'Manga / Truy\u1ec7n Tranh'}</option>
            </select>
          </div>
        </div>

        {/* Original Title & Group Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">{'T\u00ean G\u1ed1c (Ti\u1ebfng Nh\u1eadt / H\u00e0n / Trung)'}</label>
            <input
              type="text"
              placeholder="e.g. \u30aa\u30b7\u306e\u6575\u306b\u306a\u3063\u305f\u306e\u3067..."
              value={originalTitle}
              onChange={(e) => setOriginalTitle(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">{'Nh\u00f3m D\u1ecbch Qu\u1ea3n L\u00fd'}</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="">{'-- \u0110\u0103ng \u0111\u1ed9c l\u1eadp (Kh\u00f4ng thu\u1ed9c nh\u00f3m n\u00e0o) --'}</option>
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
            <label className="text-xs font-bold text-gray-200">{'T\u00e1c Gi\u1ea3'}</label>
            <input
              type="text"
              placeholder="e.g. Nagatsuki Tappei"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">{'H\u1ecda S\u0129 (Artist)'}</label>
            <input
              type="text"
              placeholder="e.g. Otsuka Shinichirou"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">{'Ng\u00f4n Ng\u1eef G\u1ed1c'}</label>
            <select
              value={originalLanguage}
              onChange={(e) => setOriginalLanguage(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="ja">{'Ti\u1ebfng Nh\u1eadt (Japanese)'}</option>
              <option value="ko">{'Ti\u1ebfng H\u00e0n (Korean)'}</option>
              <option value="zh">{'Ti\u1ebfng Trung (Chinese)'}</option>
              <option value="en">{'Ti\u1ebfng Anh (English)'}</option>
              <option value="vi">{'Ti\u1ebfng Vi\u1ec7t (S\u00e1ng t\u00e1c)'}</option>
            </select>
          </div>
        </div>

        {/* Synopsis */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-200">{'T\u00f3m T\u1eaft C\u1ed1t Truy\u1ec7n'}</label>
          <textarea
            rows={4}
            placeholder="Nh\u1eadp t\u00f3m t\u1eaft n\u1ed9i dung t\u00e1c ph\u1ea9m \u0111\u1ec3 thu h\u00fat \u0111\u1ed9c gi\u1ea3..."
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
            label="\u1ea2nh b\u00eca t\u00e1c ph\u1ea9m (Poster Cover)"
          />
        </div>

        {/* Tag Selection */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5 text-brand-400" />
              {'Ch\u1ecdn Th\u1ec3 Lo\u1ea1i / Th\u1ebb Tag ('}{selectedTags.length} {'\u0111\u00e3 ch\u1ecdn)'}
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 rounded-2xl bg-black/20 border border-white/5">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-gray-400">
            {'* Sau khi t\u1ea1o truy\u1ec7n, b\u1ea1n s\u1ebd \u0111\u01b0\u1ee3c chuy\u1ec3n th\u1eb3ng \u0111\u1ebfn Tr\u00ecnh So\u1ea1n Th\u1ea3o \u0110\u0103ng Ch\u01b0\u01a1ng'}
          </p>

          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-xl shadow-brand-500/25 flex items-center gap-2 transition hover:scale-105"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? '\u0110ang t\u1ea1o...' : 'T\u1ea1o B\u1ed9 Truy\u1ec7n & Sang \u0110\u0103ng Ch\u01b0\u01a1ng'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}

export default function CreateStoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-12 text-center text-white">{'\u0110ang t\u1ea3i bi\u1ec3u m\u1eabu...'}</div>}>
      <CreateStoryContent />
    </Suspense>
  );
}