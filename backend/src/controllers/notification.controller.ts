import { Response } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

/**
 * Lấy danh sách thông báo của người dùng hiện tại
 */
export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
    }

    const currentUserId = req.user.id;

    // Lấy thông báo kèm theo thông tin chi tiết của chương và truyện (nếu là thông báo chương mới)
    const result = await pool.query(`
      SELECT 
        n.id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        n.reference_type,
        n.reference_id,
        n.is_read,
        n.read_at,
        n.created_at,
        c.title as chapter_title,
        c.slug as chapter_slug,
        c.chapter_number,
        s.id as story_id,
        s.title as story_title,
        s.slug as story_slug,
        s.cover_image_url as story_cover
      FROM notifications n
      LEFT JOIN chapters c ON n.reference_id = c.id AND n.reference_type = 'chapter'
      LEFT JOIN stories s ON c.story_id = s.id
      WHERE n.user_id = $1::uuid
      ORDER BY n.created_at DESC
      LIMIT 50;
    `, [currentUserId]);

    const unreadCountRes = await pool.query(`
      SELECT COUNT(*)::int as count FROM notifications
      WHERE user_id = $1::uuid AND is_read = false;
    `, [currentUserId]);

    res.json({
      success: true,
      data: {
        notifications: result.rows,
        unread_count: unreadCountRes.rows[0]?.count || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Đánh dấu 1 thông báo là đã đọc
 */
export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
    }

    const { id } = req.params;
    const currentUserId = req.user.id;

    await pool.query(`
      UPDATE notifications SET is_read = true, read_at = NOW()
      WHERE id = $1::uuid AND user_id = $2::uuid;
    `, [id, currentUserId]);

    res.json({ success: true, message: 'Đã đánh dấu thông báo là đã đọc.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Đánh dấu tất cả thông báo của người dùng là đã đọc
 */
export const markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
    }

    const currentUserId = req.user.id;

    await pool.query(`
      UPDATE notifications SET is_read = true, read_at = NOW()
      WHERE user_id = $1::uuid AND is_read = false;
    `, [currentUserId]);

    res.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Xóa 1 thông báo
 */
export const deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
    }

    const { id } = req.params;
    const currentUserId = req.user.id;

    await pool.query(`
      DELETE FROM notifications WHERE id = $1::uuid AND user_id = $2::uuid;
    `, [id, currentUserId]);

    res.json({ success: true, message: 'Đã xóa thông báo.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Hàm helper tự động phát thông báo tới tất cả độc giả đang theo dõi truyện khi có chương mới
 */
export async function createChapterUpdateNotifications(
  storyId: string,
  chapterId: string,
  chapterTitle: string,
  uploaderId?: string
) {
  try {
    const res = await pool.query(`
      INSERT INTO notifications (
        user_id, type, title, message, reference_type, reference_id, sender_id, is_read, created_at
      )
      SELECT 
        uf.user_id,
        'chapter_update'::notification_type,
        'Chương mới: ' || s.title,
        'Bộ truyện "' || s.title || '" vừa có chương mới: ' || $1,
        'chapter',
        $2::uuid,
        $3::uuid,
        false,
        NOW()
      FROM user_favorites uf
      JOIN stories s ON uf.story_id = s.id
      WHERE uf.story_id = $4::uuid AND (uf.notify_updates = true OR uf.notify_updates IS NULL)
      RETURNING id;
    `, [chapterTitle, chapterId, uploaderId || null, storyId]);

    console.log(`[Notification] Created ${res.rowCount} notifications for followers of story ${storyId}`);
    return res.rowCount;
  } catch (err) {
    console.error('[Notification] Failed to create chapter update notifications:', err);
    return 0;
  }
}
