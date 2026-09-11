import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getComments = async (req: Request, res: Response) => {
  try {
    const { target_type, target_id, page = '1', limit = '50' } = req.query;

    if (!target_type || !target_id) {
      return res.status(400).json({ success: false, message: 'target_type và target_id là bắt buộc' });
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    const result = await pool.query(`
      SELECT 
        c.id, c.user_id, c.target_type, c.target_id, c.parent_id, c.root_id, c.depth,
        c.content, c.is_edited, c.quoted_text, c.like_count, c.reply_count, c.created_at,
        u.username, u.display_name, u.avatar_url,
        (
          SELECT array_agg(role::text) 
          FROM user_roles 
          WHERE user_id = u.id
        ) as roles
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.target_type = $1::comment_target_type 
        AND c.target_id = $2::uuid 
        AND c.is_deleted = false
      ORDER BY c.created_at ASC
      LIMIT $3 OFFSET $4;
    `, [target_type, target_id, limitNum, offset]);

    const commentMap = new Map();
    const rootComments: any[] = [];

    result.rows.forEach((comment) => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    result.rows.forEach((comment) => {
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        commentMap.get(comment.parent_id).replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    rootComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({
      success: true,
      data: rootComments,
      total: result.rows.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để bình luận.' });
    }

    const { target_type, target_id, parent_id, content, quoted_text } = req.body;

    if (!target_type || !target_id || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung bình luận.' });
    }

    const authorId = req.user.id;

    let depth = 0;
    let rootId = null;

    if (parent_id) {
      const parentRes = await pool.query(`SELECT id, root_id, depth FROM comments WHERE id = $1`, [parent_id]);
      if (parentRes.rows.length > 0) {
        const parent = parentRes.rows[0];
        depth = (parent.depth || 0) + 1;
        rootId = parent.root_id || parent.id;

        await pool.query(`UPDATE comments SET reply_count = reply_count + 1 WHERE id = $1`, [parent_id]);
      }
    }

    const insertRes = await pool.query(`
      INSERT INTO comments (
        user_id, target_type, target_id, parent_id, root_id, depth, content, quoted_text
      ) VALUES (
        $1, $2::comment_target_type, $3::uuid, $4, $5, $6, $7, $8
      ) RETURNING *;
    `, [authorId, target_type, target_id, parent_id || null, rootId || null, depth, content.trim(), quoted_text || null]);

    const newComment = insertRes.rows[0];

    const userRes = await pool.query(`
      SELECT u.username, u.display_name, u.avatar_url,
        (SELECT array_agg(role::text) FROM user_roles WHERE user_id = u.id) as roles
      FROM users u WHERE u.id = $1;
    `, [authorId]);

    const user = userRes.rows[0];
    newComment.username = user?.username || req.user.username;
    newComment.display_name = user?.display_name || req.user.display_name;
    newComment.avatar_url = user?.avatar_url || req.user.avatar_url;
    newComment.roles = user?.roles || req.user.roles;
    newComment.replies = [];

    // Increment count on target
    if (target_type === 'chapter') {
      pool.query(`UPDATE chapters SET total_comments = total_comments + 1 WHERE id = $1`, [target_id]).catch(() => {});
    } else if (target_type === 'post') {
      pool.query(`UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1`, [target_id]).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Bình luận thành công',
      data: newComment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const likeComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
    }

    const { id } = req.params;
    const authorId = req.user.id;

    const checkRes = await pool.query(`SELECT * FROM comment_likes WHERE user_id = $1 AND comment_id = $2`, [authorId, id]);

    let liked = false;
    if (checkRes.rows.length > 0) {
      await pool.query(`DELETE FROM comment_likes WHERE user_id = $1 AND comment_id = $2`, [authorId, id]);
      await pool.query(`UPDATE comments SET like_count = GREATEST(0, like_count - 1) WHERE id = $1`, [id]);
      liked = false;
    } else {
      await pool.query(`INSERT INTO comment_likes (user_id, comment_id) VALUES ($1, $2)`, [authorId, id]);
      await pool.query(`UPDATE comments SET like_count = like_count + 1 WHERE id = $1`, [id]);
      liked = true;
    }

    const commentRes = await pool.query(`SELECT like_count FROM comments WHERE id = $1`, [id]);

    res.json({
      success: true,
      liked,
      like_count: commentRes.rows[0]?.like_count || 0,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
