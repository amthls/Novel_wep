'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Eye, BookOpen } from 'lucide-react';
import SmartImage from '@/components/common/SmartImage';

export interface Story {
  id: string;
  title: string;
  slug: string;
  original_title?: string;
  synopsis?: string;
  cover_image_url?: string;
  story_type: 'novel' | 'manga';
  status: 'ongoing' | 'completed' | 'hiatus' | 'dropped';
  original_language?: string;
  author_name?: string;
  artist_name?: string;
  total_chapters: number;
  total_views: string | number;
  total_favorites: string | number;
  rating_avg: number | string;
  rating_count: number;
  last_chapter_at?: string;
  group_name?: string;
  tags?: { id: string; name: string; slug: string }[];
  illustrations?: string[];
  latest_chapter?: {
    title: string;
    chapter_number: number;
    slug: string;
    published_at: string;
  };
}

export default function StoryCardGrid({ story }: { story: Story }) {
  const isNovel = story.story_type === 'novel';
  const rating = typeof story.rating_avg === 'number' ? story.rating_avg.toFixed(1) : parseFloat(story.rating_avg || '0').toFixed(1);

  return (
    <div className="group relative flex flex-col rounded-2xl glass-panel border border-white/10 hover:border-brand-500/40 transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10">
      {/* Poster Image */}
      <Link href={`/truyen/${story.slug}`} className="relative aspect-[3/4] w-full overflow-hidden bg-gray-900 block">
        <SmartImage
          src={story.cover_image_url}
          alt={story.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F17] via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-sm ${
            isNovel ? 'bg-indigo-600/90' : 'bg-rose-600/90'
          }`}>
            {isNovel ? 'Novel' : 'Manga'}
          </span>

          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-amber-300 backdrop-blur-md flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-300" />
            {rating}
          </span>
        </div>

        {/* Bottom stats inside cover */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-gray-300">
          <span className="flex items-center gap-1 font-medium bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
            <BookOpen className="w-3 h-3 text-brand-400" />
            {story.total_chapters || 0} chương
          </span>
          <span className="flex items-center gap-1 font-medium bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
            <Eye className="w-3 h-3 text-cyan-400" />
            {typeof story.total_views === 'number' ? story.total_views.toLocaleString() : story.total_views}
          </span>
        </div>
      </Link>

      {/* Content Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          {/* Title */}
          <Link href={`/truyen/${story.slug}`}>
            <h3 className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors line-clamp-2 leading-snug" title={story.title}>
              {story.title}
            </h3>
          </Link>

          {/* Author & Group */}
          <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between gap-2">
            <span className="truncate">{story.author_name || 'Chưa rõ tác giả'}</span>
            {story.group_name && (
              <span className="text-brand-300 shrink-0 text-[10px] font-medium px-1.5 py-0.2 rounded bg-brand-500/10">
                {story.group_name}
              </span>
            )}
          </div>
        </div>

        {/* Latest chapter & tags */}
        <div className="pt-2 border-t border-white/5 space-y-1.5">
          {story.latest_chapter ? (
            <Link 
              href={`/truyen/${story.slug}/${story.latest_chapter.slug}`}
              className="text-[11px] text-gray-300 hover:text-brand-400 flex items-center justify-between transition group/chap"
            >
              <span className="truncate font-medium group-hover/chap:underline">
                {story.latest_chapter.title}
              </span>
              <span className="text-[10px] text-gray-500 shrink-0 ml-1">Mới</span>
            </Link>
          ) : (
            <div className="text-[11px] text-gray-500 italic">Đang cập nhật...</div>
          )}

          {/* Tag Pills */}
          {story.tags && story.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 overflow-hidden h-5">
              {story.tags.slice(0, 3).map((tag) => (
                <span key={tag.id} className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-gray-400 border border-white/5">
                  {tag.name}
                </span>
              ))}
              {story.tags.length > 3 && (
                <span className="text-[9px] text-gray-500 self-center">+{story.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
