import { Response } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

/**
 * Lấy danh sách lịch sử đọc truyện của người dùng hiện tại
 */
export const getReadingHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để xem lịch sử đọc.' });
    }

    const currentUserId = req.user.id;

    const result = await pool.query(`
      SELECT 
        rh.id,
        rh.user_id,
        rh.story_id,
        rh.chapter_id,
        rh.scroll_position,
        rh.page_number,
        rh.read_at,
        rh.time_spent_seconds,
        s.title as story_title,
        s.slug as story_slug,
        s.cover_image_url as story_cover,
        s.author_name as story_author,
        s.story_type,
        s.total_chapters,
        c.title as chapter_title,
        c.slug as chapter_slug,
        c.chapter_number,
        g.name as group_name
      FROM reading_history rh
      JOIN stories s ON rh.story_id = s.id
      JOIN chapters c ON rh.chapter_id = c.id
      LEFT JOIN translation_groups g ON s.group_id = g.id
      WHERE rh.user_id = $1::uuid
      ORDER BY rh.read_at DESC;
    `, [currentUserId]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Ghi bản log lịch sử đọc khi người dùng mở một chương truyện
 */
export const saveReadingHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để lưu lịch sử đọc.' });
    }

    const { story_id, chapter_id, scroll_position = 0, page_number = 1 } = req.body;

    if (!story_id || !chapter_id) {
      return res.status(400).json({ success: false, message: 'Thiếu story_id hoặc chapter_id' });
    }

    const currentUserId = req.user.id;

    // Ghi nhận bản log riêng biệt lưu ngày tháng, chương truyện và truyện mà người dùng đã đọc
    const result = await pool.query(`
      INSERT INTO reading_history (user_id, story_id, chapter_id, scroll_position, page_number, read_at)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, NOW())
      RETURNING *;
    `, [currentUserId, story_id, chapter_id, scroll_position, page_number]);

    res.json({
      success: true,
      message: 'Đã ghi nhận lịch sử đọc thành công',
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Xóa 1 bản ghi lịch sử đọc
 */
export const deleteReadingHistoryItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
    }

    const { id } = req.params;
    const currentUserId = req.user.id;

    const deleteRes = await pool.query(
      `DELETE FROM reading_history WHERE id = $1::uuid AND user_id = $2::uuid RETURNING id;`,
      [id, currentUserId]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bản ghi không tồn tại hoặc bạn không có quyền xóa.',
      });
    }

    res.json({
      success: true,
      message: 'Đã xóa khỏi lịch sử đọc',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Xóa toàn bộ lịch sử đọc của người dùng
 */
export const clearReadingHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
    }

    const currentUserId = req.user.id;

    await pool.query(`DELETE FROM reading_history WHERE user_id = $1::uuid;`, [currentUserId]);

    res.json({
      success: true,
      message: 'Đã xóa toàn bộ lịch sử đọc của bạn',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
