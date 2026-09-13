import { pool } from '../config/db';

/**
 * Class UserReadingLog: Mô hình thực thể ghi log lịch sử đọc truyện của người dùng.
 * Nắm giữ liên kết: Người dùng (user_id) - Truyện (story_id) - Chương (chapter_id).
 * Mỗi người dùng có một tập hợp các bản log độc lập riêng cho chính họ.
 * Mỗi khi người dùng nhấn vào đọc một chương bất kỳ, hệ thống sẽ tự động sinh ra một bản log mới.
 */
export class UserReadingLog {
  id: string;
  userId: string;
  storyId: string;
  chapterId: string;
  scrollPosition: number;
  pageNumber: number;
  readAt: Date;
  timeSpentSeconds: number;

  constructor(data: {
    id?: string;
    userId: string;
    storyId: string;
    chapterId: string;
    scrollPosition?: number;
    pageNumber?: number;
    readAt?: Date | string;
    timeSpentSeconds?: number;
  }) {
    this.id = data.id || '';
    this.userId = data.userId;
    this.storyId = data.storyId;
    this.chapterId = data.chapterId;
    this.scrollPosition = Number(data.scrollPosition) || 0;
    this.pageNumber = Number(data.pageNumber) || 1;
    this.readAt = data.readAt ? new Date(data.readAt) : new Date();
    this.timeSpentSeconds = Number(data.timeSpentSeconds) || 0;
  }

  /**
   * Tự động sinh một bản log mới của người dùng cho chương truyện vừa nhấn đọc
   */
  static async recordLog(params: {
    userId: string;
    storyId: string;
    chapterId: string;
    scrollPosition?: number;
    pageNumber?: number;
    timeSpentSeconds?: number;
  }): Promise<UserReadingLog> {
    const {
      userId,
      storyId,
      chapterId,
      scrollPosition = 0,
      pageNumber = 1,
      timeSpentSeconds = 0,
    } = params;

    // Kiểm tra xem trong vòng 10 giây gần nhất người dùng đã có log cho chương này chưa (tránh ghi trùng lặp khi vừa load trang vừa mount component)
    const recentCheck = await pool.query(
      `SELECT id FROM reading_history 
       WHERE user_id = $1::uuid AND chapter_id = $2::uuid 
         AND read_at >= (NOW() - INTERVAL '10 seconds')
       ORDER BY read_at DESC LIMIT 1;`,
      [userId, chapterId]
    );

    if (recentCheck.rows.length > 0) {
      // Cập nhật tọa độ cuộn của log vừa tạo
      const updated = await pool.query(
        `UPDATE reading_history 
         SET scroll_position = $1, page_number = $2, read_at = NOW() 
         WHERE id = $3::uuid RETURNING *;`,
        [scrollPosition, pageNumber, recentCheck.rows[0].id]
      );
      const row = updated.rows[0];
      return new UserReadingLog({
        id: row.id,
        userId: row.user_id,
        storyId: row.story_id,
        chapterId: row.chapter_id,
        scrollPosition: Number(row.scroll_position),
        pageNumber: Number(row.page_number),
        readAt: row.read_at,
        timeSpentSeconds: Number(row.time_spent_seconds),
      });
    }

    // Sinh một bản log hoàn toàn mới cho lượt đọc này
    const result = await pool.query(
      `INSERT INTO reading_history (user_id, story_id, chapter_id, scroll_position, page_number, read_at, time_spent_seconds)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, NOW(), $6)
       RETURNING *;`,
      [userId, storyId, chapterId, scrollPosition, pageNumber, timeSpentSeconds]
    );

    const row = result.rows[0];
    return new UserReadingLog({
      id: row.id,
      userId: row.user_id,
      storyId: row.story_id,
      chapterId: row.chapter_id,
      scrollPosition: Number(row.scroll_position),
      pageNumber: Number(row.page_number),
      readAt: row.read_at,
      timeSpentSeconds: Number(row.time_spent_seconds),
    });
  }

  /**
   * Lấy danh sách toàn bộ các bản log đọc truyện riêng biệt của một người dùng
   */
  static async getLogsByUser(userId: string, limit: number = 100) {
    const result = await pool.query(
      `SELECT 
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
      ORDER BY rh.read_at DESC
      LIMIT $2;`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Xóa 1 bản log cụ thể của người dùng
   */
  static async deleteLog(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM reading_history WHERE id = $1::uuid AND user_id = $2::uuid RETURNING id;`,
      [id, userId]
    );
    return result.rows.length > 0;
  }

  /**
   * Xóa toàn bộ nhật ký log đọc truyện của một người dùng
   */
  static async clearAllLogs(userId: string): Promise<void> {
    await pool.query(`DELETE FROM reading_history WHERE user_id = $1::uuid;`, [userId]);
  }
}
