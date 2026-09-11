import { createChapterUpdateNotifications } from './notification.controller';
﻿import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { canUserManageStory } from './story.controller';

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface ContentBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'image' | 'separator';
  text?: string;
  note?: string; // Translator Note on this line
  image_url?: string; // Inline illustration at this line
}

export const submitChapter = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để đăng chương truyện.',
      });
    }

    const {
      story_id,
      volume_id,
      chapter_number,
      title,
      content_blocks = [],
      raw_content,
      group_id,
      is_draft = false,
    } = req.body;

    if (!story_id || !title || !title.trim() || chapter_number === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: story_id, title, chapter_number',
      });
    }

    const uploaderId = req.user.id;
    const userRoles = req.user.roles || [];

    // Check permissions: ONLY Story Owner, Assigned Group Members, or Admin/Mod
    const isAuthorized = await canUserManageStory(uploaderId, story_id, userRoles);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không phải chủ thầu của truyện này (người đăng, nhóm dịch phụ trách hoặc Admin/Mod) nên không có quyền đăng chương cho tác phẩm này.',
      });
    }

    const storyRes = await pool.query(`SELECT * FROM stories WHERE id = $1`, [story_id]);
    if (storyRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bộ truyện không tồn tại' });
    }
    const story = storyRes.rows[0];

    // Calculate word count from content_blocks
    let calculatedWordCount = 0;
    let fullPlainText = '';

    if (Array.isArray(content_blocks) && content_blocks.length > 0) {
      fullPlainText = content_blocks
        .map((b: ContentBlock) => {
          let line = b.text || '';
          if (b.image_url) line += `\n![Minh Họa](${b.image_url})`;
          return line;
        })
        .filter(Boolean)
        .join('\n\n');
      
      calculatedWordCount = fullPlainText.split(/\s+/).filter(Boolean).length;
    } else if (raw_content) {
      fullPlainText = raw_content;
      calculatedWordCount = raw_content.split(/\s+/).filter(Boolean).length;
    }

    let chapterSlug = `chuong-${chapter_number}-${slugify(title.trim())}`;
    const actualGroupId = group_id || story.group_id;

    // Check if uploader is leader/mod of the group or site admin/mod
    let isLeader = false;
    if (userRoles.includes('admin') || userRoles.includes('mod') || story.uploader_id === uploaderId) {
      isLeader = true;
    } else if (actualGroupId) {
      const memRes = await pool.query(`
        SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2
      `, [actualGroupId, uploaderId]);
      if (memRes.rows.length > 0 && ['leader', 'mod'].includes(memRes.rows[0].role)) {
        isLeader = true;
      }
    }

    const initialApproval = is_draft ? 'draft' : (isLeader ? 'approved' : 'pending');

    // 1. Insert into chapter_submissions
    const submissionRes = await pool.query(`
      INSERT INTO chapter_submissions (
        story_id, volume_id, chapter_number, title, slug,
        content_blocks, raw_content, word_count,
        uploader_id, group_id, approval_status, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12
      ) RETURNING *;
    `, [
      story_id,
      volume_id || null,
      chapter_number,
      title.trim(),
      chapterSlug,
      JSON.stringify(content_blocks || []),
      fullPlainText,
      calculatedWordCount,
      uploaderId,
      actualGroupId || null,
      initialApproval,
      initialApproval === 'approved'
    ]);

    const submission = submissionRes.rows[0];

    // 2. If approved immediately (by owner/leader), sync to public chapters table!
    if (initialApproval === 'approved' && !is_draft) {
      await syncSubmissionToPublicChapter(submission);
    }

    res.status(201).json({
      success: true,
      message: is_draft
        ? 'Đã lưu bản nháp chương thành công'
        : (initialApproval === 'approved'
            ? 'Đăng chương thành công và đã xuất bản cho độc giả'
            : 'Đã nộp bản dịch chương, vui lòng chờ Trưởng nhóm hoặc Chủ thầu duyệt'),
      data: submission,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

async function syncSubmissionToPublicChapter(sub: any) {
  // Extract line annotations and inline images
  const translatorNotes = sub.content_blocks
    ? sub.content_blocks.filter((b: any) => b.note).map((b: any) => ({ text: b.text, note: b.note }))
    : [];

  const chapterRes = await pool.query(`
    INSERT INTO chapters (
      story_id, volume_id, chapter_number, title, slug,
      content, content_blocks, word_count, is_published,
      approval_status, uploader_id, group_id, translator_notes, published_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7::jsonb, $8, true, 'approved', $9, $10, $11::jsonb, NOW()
    )
    ON CONFLICT (story_id, chapter_number) DO UPDATE SET
      volume_id = EXCLUDED.volume_id,
      title = EXCLUDED.title,
      slug = EXCLUDED.slug,
      content = EXCLUDED.content,
      content_blocks = EXCLUDED.content_blocks,
      word_count = EXCLUDED.word_count,
      uploader_id = EXCLUDED.uploader_id,
      group_id = EXCLUDED.group_id,
      translator_notes = EXCLUDED.translator_notes,
      updated_at = NOW()
    RETURNING id;
  `, [
    sub.story_id,
    sub.volume_id || null,
    sub.chapter_number,
    sub.title,
    sub.slug,
    sub.raw_content,
    JSON.stringify(sub.content_blocks || []),
    sub.word_count,
    sub.uploader_id,
    sub.group_id,
    JSON.stringify(translatorNotes)
  ]);

  const chapterId = chapterRes.rows[0]?.id;

  // Insert inline images into chapter_pages if any
  if (chapterId && Array.isArray(sub.content_blocks)) {
    const inlineImages = sub.content_blocks.filter((b: any) => b.image_url);
    for (let i = 0; i < inlineImages.length; i++) {
      await pool.query(`
        INSERT INTO chapter_pages (chapter_id, page_number, image_url)
        VALUES ($1, $2, $3)
        ON CONFLICT (chapter_id, page_number) DO UPDATE SET image_url = EXCLUDED.image_url;
      `, [chapterId, i + 1, inlineImages[i].image_url]);
    }
  }

  // Update story total chapters and last_chapter_at
  await pool.query(`
    UPDATE stories SET
      total_chapters = (SELECT count(*) FROM chapters WHERE story_id = $1 AND is_published = true),
      last_chapter_at = NOW(),
      updated_at = NOW()
    WHERE id = $1;
  `, [sub.story_id]);

  // Mark this submission as active
  await pool.query(`
    UPDATE chapter_submissions SET is_active = (id = $1)
    WHERE story_id = $2 AND chapter_number = $3;
  `, [sub.id, sub.story_id, sub.chapter_number]);

  // Notify all users following this story
  if (chapterId) {
    createChapterUpdateNotifications(sub.story_id, chapterId, sub.title, sub.uploader_id).catch((err: any) => {
      console.error('[Notification] Error creating notifications in syncSubmissionToPublicChapter:', err);
    });
  }
}

/**
 * Delete Chapter (Admin, Mod, Story Owner, or Chapter Uploader)
 */
export const deleteChapter = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập.' });
    }

    const { id } = req.params;
    const currentUserId = req.user.id;
    const userRoles = req.user.roles || [];

    const chapterRes = await pool.query(
      `SELECT c.id, c.title, c.chapter_number, c.story_id, c.uploader_id, s.uploader_id as story_uploader_id, s.group_id
       FROM chapters c
       JOIN stories s ON c.story_id = s.id
       WHERE c.id = $1`,
      [id]
    );

    if (chapterRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chương không tồn tại hoặc đã bị xóa.' });
    }

    const chapter = chapterRes.rows[0];
    const isAdminOrMod = userRoles.includes('admin') || userRoles.includes('mod');
    const isChapterUploader = chapter.uploader_id === currentUserId;
    const isStoryOwner = chapter.story_uploader_id === currentUserId;

    let isGroupLeader = false;
    if (chapter.group_id) {
      const gRes = await pool.query(
        `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [chapter.group_id, currentUserId]
      );
      if (gRes.rows.length > 0 && ['leader', 'mod'].includes(gRes.rows[0].role)) {
        isGroupLeader = true;
      }
    }

    if (!isAdminOrMod && !isChapterUploader && !isStoryOwner && !isGroupLeader) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa chương này. Chỉ người đăng chương, chủ thầu truyện hoặc Admin/Mod mới có quyền xóa.',
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Delete chapter pages, submissions, comments
      await client.query(`DELETE FROM chapter_pages WHERE chapter_id = $1`, [id]);
      await client.query(`DELETE FROM chapter_submissions WHERE story_id = $1 AND chapter_number = $2`, [chapter.story_id, chapter.chapter_number]);
      await client.query(`DELETE FROM comments WHERE target_type = 'chapter' AND target_id = $1`, [id]);
      await client.query(`DELETE FROM reading_history WHERE chapter_id = $1`, [id]);
      await client.query(`DELETE FROM story_views WHERE chapter_id = $1`, [id]);

      // 2. Delete chapter
      await client.query(`DELETE FROM chapters WHERE id = $1`, [id]);

      // 3. Update story total_chapters count
      await client.query(`
        UPDATE stories SET
          total_chapters = (SELECT count(*) FROM chapters WHERE story_id = $1 AND is_published = true),
          updated_at = NOW()
        WHERE id = $1;
      `, [chapter.story_id]);

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: `Đã xóa Chương ${chapter.chapter_number}: "${chapter.title}" thành công!`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getChapterSubmissions = async (req: Request, res: Response) => {
  try {
    const { story_id, chapter_number, group_id, status } = req.query;

    const params: any[] = [];
    let conditions = 'WHERE 1=1';

    if (story_id) {
      params.push(story_id);
      conditions += ` AND cs.story_id = $${params.length}::uuid`;
    }

    if (chapter_number) {
      params.push(chapter_number);
      conditions += ` AND cs.chapter_number = $${params.length}`;
    }

    if (group_id) {
      params.push(group_id);
      conditions += ` AND cs.group_id = $${params.length}::uuid`;
    }

    if (status) {
      params.push(status);
      conditions += ` AND cs.approval_status = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT 
        cs.*,
        u.username as uploader_username,
        u.display_name as uploader_name,
        u.avatar_url as uploader_avatar,
        s.title as story_title,
        s.slug as story_slug,
        g.name as group_name,
        v.title as volume_title
      FROM chapter_submissions cs
      JOIN users u ON cs.uploader_id = u.id
      JOIN stories s ON cs.story_id = s.id
      LEFT JOIN translation_groups g ON cs.group_id = g.id
      LEFT JOIN volumes v ON cs.volume_id = v.id
      ${conditions}
      ORDER BY cs.chapter_number ASC, cs.created_at DESC;
    `, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveChapterSubmission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập.' });
    }

    const { id } = req.params;
    const leaderId = req.user.id;

    const subRes = await pool.query(`SELECT * FROM chapter_submissions WHERE id = $1`, [id]);
    if (subRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bản dịch không tồn tại' });
    }

    const submission = subRes.rows[0];

    // Update submission approval
    await pool.query(`
      UPDATE chapter_submissions SET
        approval_status = 'approved',
        approved_by = $1,
        approved_at = NOW(),
        is_active = true,
        updated_at = NOW()
      WHERE id = $2;
    `, [leaderId, id]);

    // Sync to public chapters table
    await syncSubmissionToPublicChapter(submission);

    res.json({
      success: true,
      message: `Đã duyệt bản dịch Chương ${submission.chapter_number} làm phiên bản chính thức cho độc giả!`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createStory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để đăng truyện mới.',
      });
    }

    const {
      title,
      original_title,
      synopsis,
      cover_image_url,
      banner_image_url,
      story_type = 'novel',
      status = 'ongoing',
      group_id,
      author_name,
      artist_name,
      original_language = 'ja',
      tags = [],
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Tên truyện không được để trống' });
    }

    const uploaderId = req.user.id;

    let baseSlug = slugify(title.trim());
    if (!baseSlug) baseSlug = 'truyen-moi';
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const storyRes = await pool.query(`
      INSERT INTO stories (
        title, slug, original_title, synopsis, cover_image_url, banner_image_url,
        story_type, status, group_id, uploader_id,
        author_name, artist_name, original_language, approval_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::story_type, $8::story_status, $9, $10, $11, $12, $13, 'approved'
      ) RETURNING *;
    `, [
      title.trim(),
      uniqueSlug,
      original_title?.trim() || null,
      synopsis?.trim() || null,
      cover_image_url || null,
      banner_image_url || null,
      story_type,
      status,
      group_id || null,
      uploaderId,
      author_name?.trim() || null,
      artist_name?.trim() || null,
      original_language
    ]);

    const story = storyRes.rows[0];

    // Automatically create Volume 1 by default
    await pool.query(`
      INSERT INTO volumes (story_id, title, volume_number)
      VALUES ($1, 'Tập 1', 1)
      ON CONFLICT DO NOTHING;
    `, [story.id]);

    // Insert tags
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tagId of tags) {
        await pool.query(`
          INSERT INTO story_tags (story_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;
        `, [story.id, tagId]);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Đăng bộ truyện mới thành công!',
      data: story,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createVolume = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập.' });
    }

    const { storyId } = req.params;
    const { title, volume_number, cover_image_url, description } = req.body;

    const isAuthorized = await canUserManageStory(req.user.id, storyId, req.user.roles || []);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không phải chủ thầu của truyện này để thêm tập mới.',
      });
    }

    const num = parseInt(volume_number) || 1;
    const volTitle = title?.trim() || `Tập ${num}`;

    const volRes = await pool.query(`
      INSERT INTO volumes (story_id, title, volume_number, cover_image_url, description)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (story_id, volume_number) DO UPDATE SET
        title = EXCLUDED.title,
        cover_image_url = EXCLUDED.cover_image_url,
        description = EXCLUDED.description
      RETURNING *;
    `, [storyId, volTitle, num, cover_image_url || null, description || null]);

    // Update total_volumes
    await pool.query(`
      UPDATE stories SET total_volumes = (SELECT count(*) FROM volumes WHERE story_id = $1)
      WHERE id = $1;
    `, [storyId]);

    res.status(201).json({
      success: true,
      message: `Tạo ${volTitle} thành công`,
      data: volRes.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
