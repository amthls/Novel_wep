import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.username, u.display_name, u.avatar_url, u.banner_url, u.bio, u.created_at,
        COALESCE(
          json_agg(
            json_build_object('role', ur.role, 'is_visible', ur.is_visible)
          ) FILTER (WHERE ur.role IS NOT NULL), '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.is_banned = false
      GROUP BY u.id
      ORDER BY u.created_at ASC;
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin endpoint: List all users for role management
 */
export const getAdminUserList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Quản trị viên (Admin) mới có quyền truy cập danh sách này.',
      });
    }

    const { q = '' } = req.query;
    let queryStr = `
      SELECT 
        u.id, u.username, u.email, u.display_name, u.avatar_url, u.is_banned, u.created_at,
        COALESCE(
          json_agg(
            json_build_object('role', ur.role, 'is_visible', ur.is_visible)
          ) FILTER (WHERE ur.role IS NOT NULL), '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
    `;
    const params: any[] = [];
    if (q && typeof q === 'string' && q.trim()) {
      params.push(`%${q.trim()}%`);
      queryStr += ` WHERE u.username ILIKE $1 OR u.email ILIKE $1 OR u.display_name ILIKE $1`;
    }
    queryStr += ` GROUP BY u.id ORDER BY u.created_at ASC;`;

    const result = await pool.query(queryStr, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin role management: Grant or Revoke a role (e.g. 'mod', 'translator', 'author', 'reader')
 */
export const manageUserRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Quản trị viên (Admin) mới có quyền phân quyền người dùng.',
      });
    }

    const { userId } = req.params;
    const { role, action } = req.body; // action: 'grant' | 'revoke'

    const validRoles = ['admin', 'mod', 'translator', 'author', 'reader'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Vai trò không hợp lệ. Các vai trò hợp lệ: ${validRoles.join(', ')}`,
      });
    }

    if (!['grant', 'revoke'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Hành động không hợp lệ. Vui lòng chọn 'grant' hoặc 'revoke'.",
      });
    }

    // Verify target user exists
    const userCheck = await pool.query(`SELECT id, username FROM users WHERE id = $1::uuid`, [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
    }

    // Safety guard: Admin cannot revoke their own admin role
    if (userId === req.user.id && role === 'admin' && action === 'revoke') {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tự gỡ bỏ quyền Admin của chính mình.',
      });
    }

    if (action === 'grant') {
      await pool.query(
        `INSERT INTO user_roles (user_id, role, is_visible, granted_by, granted_at)
         VALUES ($1::uuid, $2, TRUE, $3::uuid, NOW())
         ON CONFLICT (user_id, role) DO UPDATE SET is_visible = TRUE;`,
        [userId, role, req.user.id]
      );
    } else if (action === 'revoke') {
      await pool.query(
        `DELETE FROM user_roles WHERE user_id = $1::uuid AND role = $2;`,
        [userId, role]
      );
    }

    // Fetch updated roles
    const updatedRolesRes = await pool.query(
      `SELECT role, is_visible FROM user_roles WHERE user_id = $1::uuid`,
      [userId]
    );

    const roleNameVi: Record<string, string> = {
      admin: 'Quản trị viên (Admin)',
      mod: 'Kiểm duyệt viên (Mod)',
      translator: 'Dịch giả',
      author: 'Tác giả',
      reader: 'Độc giả',
    };

    res.json({
      success: true,
      message: action === 'grant'
        ? `Đã cấp quyền ${roleNameVi[role] || role} cho người dùng ${userCheck.rows[0].username} thành công!`
        : `Đã thu hồi quyền ${roleNameVi[role] || role} của người dùng ${userCheck.rows[0].username}!`,
      data: {
        userId,
        username: userCheck.rows[0].username,
        roles: updatedRolesRes.rows,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCurrentUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập.' });
    }

    const currentUserId = req.user.id;

    // 1. User base and roles
    const userRes = await pool.query(`
      SELECT 
        u.id, u.username, u.email, u.display_name, u.avatar_url, u.banner_url, u.bio, u.created_at,
        COALESCE(
          json_agg(
            json_build_object('role', ur.role, 'is_visible', ur.is_visible)
          ) FILTER (WHERE ur.role IS NOT NULL), '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = $1::uuid AND u.is_banned = false
      GROUP BY u.id;
    `, [currentUserId]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const user = userRes.rows[0];

    // 2. User Settings
    const settingsRes = await pool.query(`SELECT * FROM user_settings WHERE user_id = $1::uuid`, [currentUserId]);
    user.settings = settingsRes.rows[0] || {
      theme: 'dark',
      primary_color: '#6C5CE7',
      font_family: 'Noto Serif',
      font_size: 18,
      line_height: 1.8,
      reading_mode: 'scroll',
    };

    // 3. User Statistics
    const [readRes, favRes, bmRes, postRes, cmtRes, grpRes] = await Promise.all([
      pool.query(`SELECT count(DISTINCT story_id) as count FROM reading_history WHERE user_id = $1::uuid`, [currentUserId]),
      pool.query(`SELECT count(*) as count FROM user_favorites WHERE user_id = $1::uuid`, [currentUserId]),
      pool.query(`SELECT count(*) as count FROM bookmarks WHERE user_id = $1::uuid`, [currentUserId]),
      pool.query(`SELECT count(*) as count FROM posts WHERE user_id = $1::uuid AND is_deleted = false`, [currentUserId]),
      pool.query(`SELECT count(*) as count FROM comments WHERE user_id = $1::uuid AND is_deleted = false`, [currentUserId]),
      pool.query(`SELECT count(*) as count FROM group_members WHERE user_id = $1::uuid`, [currentUserId]),
    ]);

    user.stats = {
      stories_read: parseInt(readRes.rows[0]?.count || '0'),
      favorites_count: parseInt(favRes.rows[0]?.count || '0'),
      bookmarks_count: parseInt(bmRes.rows[0]?.count || '0'),
      posts_count: parseInt(postRes.rows[0]?.count || '0'),
      comments_count: parseInt(cmtRes.rows[0]?.count || '0'),
      groups_count: parseInt(grpRes.rows[0]?.count || '0'),
    };

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const result = await pool.query(`
      SELECT 
        u.id, u.username, u.display_name, u.avatar_url, u.banner_url, u.bio, u.created_at,
        COALESCE(
          json_agg(
            json_build_object('role', ur.role, 'is_visible', ur.is_visible)
          ) FILTER (WHERE ur.role IS NOT NULL), '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.username = $1 AND u.is_banned = false
      GROUP BY u.id;
    `, [username]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const user = result.rows[0];

    const settingsRes = await pool.query(`SELECT * FROM user_settings WHERE user_id = $1`, [user.id]);
    user.settings = settingsRes.rows[0] || null;

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập.' });
    }

    const { display_name, bio, avatar_url, banner_url } = req.body;
    const currentUserId = req.user.id;

    const result = await pool.query(`
      UPDATE users SET
        display_name = COALESCE($1, display_name),
        bio = COALESCE($2, bio),
        avatar_url = COALESCE($3, avatar_url),
        banner_url = COALESCE($4, banner_url),
        updated_at = NOW()
      WHERE id = $5::uuid
      RETURNING id, username, email, display_name, avatar_url, banner_url, bio, updated_at;
    `, [display_name?.trim() || null, bio?.trim() || null, avatar_url || null, banner_url || null, currentUserId]);

    res.json({
      success: true,
      message: 'Cập nhật hồ sơ cá nhân thành công',
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập.' });
    }

    const { 
      theme, 
      primary_color, 
      font_family, 
      font_size, 
      line_height, 
      reading_mode, 
      notify_chapter_update
    } = req.body;

    const currentUserId = req.user.id;

    const result = await pool.query(`
      INSERT INTO user_settings (
        user_id, theme, primary_color, font_family, font_size, line_height, reading_mode, notify_chapter_update
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6, $7, $8
      )
      ON CONFLICT (user_id) DO UPDATE SET
        theme = COALESCE(EXCLUDED.theme, user_settings.theme),
        primary_color = COALESCE(EXCLUDED.primary_color, user_settings.primary_color),
        font_family = COALESCE(EXCLUDED.font_family, user_settings.font_family),
        font_size = COALESCE(EXCLUDED.font_size, user_settings.font_size),
        line_height = COALESCE(EXCLUDED.line_height, user_settings.line_height),
        reading_mode = COALESCE(EXCLUDED.reading_mode, user_settings.reading_mode),
        notify_chapter_update = COALESCE(EXCLUDED.notify_chapter_update, user_settings.notify_chapter_update),
        updated_at = NOW()
      RETURNING *;
    `, [
      currentUserId,
      theme || 'dark',
      primary_color || '#6C5CE7',
      font_family || 'Noto Serif',
      font_size || 18,
      line_height || 1.8,
      reading_mode || 'scroll',
      notify_chapter_update !== undefined ? notify_chapter_update : true
    ]);

    res.json({
      success: true,
      message: 'Cập nhật cấu hình trải nghiệm đọc thành công',
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
