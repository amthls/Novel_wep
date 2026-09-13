import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UserReadingLog } from '../models/readingHistory.model';

/**
 * Lấy danh sách lịch sử đọc truyện của người dùng hiện tại
 * Mỗi người dùng nắm giữ một danh sách log riêng cho chính họ
 */
export const getReadingHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để xem lịch sử đọc.' });
    }

    const currentUserId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 100;

    const logs = await UserReadingLog.getLogsByUser(currentUserId, limit);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Ghi nhận bản log lịch sử đọc khi người dùng mở / đọc một chương truyện
 * Tự động tạo bản log riêng biệt ghi ngày tháng, chương truyện và truyện
 */
export const saveReadingHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để lưu lịch sử đọc.' });
    }

    const { story_id, chapter_id, scroll_position = 0, page_number = 1, time_spent_seconds = 0 } = req.body;

    if (!story_id || !chapter_id) {
      return res.status(400).json({ success: false, message: 'Thiếu story_id hoặc chapter_id' });
    }

    const currentUserId = req.user.id;

    // Sử dụng class UserReadingLog để sinh bản log mới cho người dùng
    const log = await UserReadingLog.recordLog({
      userId: currentUserId,
      storyId: story_id,
      chapterId: chapter_id,
      scrollPosition: Number(scroll_position),
      pageNumber: Number(page_number),
      timeSpentSeconds: Number(time_spent_seconds),
    });

    res.json({
      success: true,
      message: 'Đã ghi nhận lịch sử đọc thành công',
      data: log,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Xóa 1 bản ghi log lịch sử đọc
 */
export const deleteReadingHistoryItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
    }

    const { id } = req.params;
    const currentUserId = req.user.id;

    const deleted = await UserReadingLog.deleteLog(id, currentUserId);

    if (!deleted) {
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
 * Xóa toàn bộ log lịch sử đọc của người dùng
 */
export const clearReadingHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
    }

    const currentUserId = req.user.id;

    await UserReadingLog.clearAllLogs(currentUserId);

    res.json({
      success: true,
      message: 'Đã xóa toàn bộ lịch sử đọc của bạn',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
