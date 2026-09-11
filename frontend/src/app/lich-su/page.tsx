'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  History, 
  Trash2, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  Users,
  Lock,
  LogIn,
  Sparkles
} from 'lucide-react';
import SmartImage from '@/components/common/SmartImage';
import { useAuth } from '@/context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function ReadingHistoryPage() {
  const { isAuthenticated, isLoading: isAuthLoading, openAuthModal, authFetch } = useAuth();

  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    let list: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('novelhub_guest_history') || '[]';
        list = JSON.parse(raw);
      } catch (e) {}
    }

    if (isAuthenticated) {
      try {
        const res = await authFetch(`${API_BASE_URL}/history`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const apiStoryIds = new Set(json.data.map((h: any) => h.story_id));
            const guestOnly = list.filter((h: any) => !apiStoryIds.has(h.story_id));
            list = [...json.data, ...guestOnly];
          }
        }
      } catch (e) {
        console.error('Failed to fetch history:', e);
      }
    }

    setHistory(list);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [isAuthenticated]);

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('novelhub_guest_history') || '[]';
        const list = JSON.parse(raw).filter((h: any) => h.id !== id);
        localStorage.setItem('novelhub_guest_history', JSON.stringify(list));
      } catch (err) {}
    }
    if (isAuthenticated && !id.startsWith('hist-')) {
      try {
        await authFetch(`${API_BASE_URL}/history/${id}`, { method: 'DELETE' });
      } catch (err) {}
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử đọc của mình?')) return;
    setHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('novelhub_guest_history');
    }
    if (isAuthenticated) {
      try {
        await authFetch(`${API_BASE_URL}/history`, { method: 'DELETE' });
      } catch (err) {}
    }
    setFeedback('Đã xóa toàn bộ lịch sử đọc thành công!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-6 animate-pulse">
        <div className="h-36 rounded-3xl bg-white/5" />
        <div className="h-12 w-1/3 bg-white/5 rounded-2xl" />
        <div className="space-y-4">
          <div className="h-28 rounded-3xl bg-white/5" />
          <div className="h-28 rounded-3xl bg-white/5" />
        </div>
      </div>
    );
  }

  }