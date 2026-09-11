import { pool } from '../src/config/db';

async function seedFandom() {
  try {
    const userRes = await pool.query('SELECT id FROM users LIMIT 2');
    const storyRes = await pool.query("SELECT id FROM stories WHERE slug = 'vi-da-tro-thanh-ke-thu-cua-oshi'");
    
    if (userRes.rows.length === 0 || storyRes.rows.length === 0) {
      console.log('Missing user or story for seeding fandom');
      process.exit(0);
    }

    const userId1 = userRes.rows[0].id;
    const userId2 = userRes.rows[1]?.id || userId1;
    const storyId = storyRes.rows[0].id;

    // Delete existing sample posts if needed to reseed
    await pool.query("DELETE FROM posts WHERE slug ILIKE '%fandom%' OR slug ILIKE '%vi-da-tro-thanh-ke-thu-cua-oshi%'");

    const p1 = await pool.query(`
      INSERT INTO posts (user_id, title, slug, content, cover_image_url, story_id, is_published, reaction_count)
      VALUES (
        $1,
        'Cảm nhận & Đánh giá Quyển 1: Vì Đã Trở Thành Kẻ Thù Của Oshi - Siêu phẩm Romance Supernatural mới!',
        'cam-nhan-danh-gia-quyen-1-vi-da-tro-thanh-ke-thu-cua-oshi',
        'Phải nói là lâu lắm rồi mới đọc được một bộ Light Novel cuốn như thế này. Thiết lập thế giới về những người mang năng lực Thiên Bẩm (Lux) rất chặt chẽ, tương tác giữa nam chính và nữ chính vừa hài hước vừa kịch tính.\n\nĐặc biệt là 21 bức ảnh minh họa của Quyển 1 nét căng cực kỳ! Mọi người đã đọc tới chương mấy rồi?',
        '/uploads/stories/vi-da-tro-thanh-ke-thu-cua-oshi/vol-1/chuong-1-minh-hoa/img_001.webp',
        $2,
        true,
        15
      ) RETURNING id;
    `, [userId1, storyId]);

    const p2 = await pool.query(`
      INSERT INTO posts (user_id, title, slug, content, cover_image_url, story_id, is_published, reaction_count)
      VALUES (
        $1,
        '[Spoiler Thảo Luận] Dự đoán diễn biến tiếp theo ở Quyển 2 - Thân thế thực sự của Haruto?',
        'spoiler-thao-luan-du-doan-dien-bien-quyen-2',
        'Sau khi kết thúc sự kiện ở Quyển 1, mình có cảm giác sức mạnh thực sự của Haruto không chỉ dừng lại ở mức B-Rank như học viện công bố. Có bạn nào nhận thấy manh mối ở bức ảnh minh họa số 14 không?\n\nCùng vào thảo luận nhé!',
        '/uploads/stories/vi-da-tro-thanh-ke-thu-cua-oshi/vol-1/chuong-1-minh-hoa/img_014.webp',
        $2,
        true,
        9
      ) RETURNING id;
    `, [userId2, storyId]);

    const p3 = await pool.query(`
      INSERT INTO posts (user_id, title, slug, content, cover_image_url, story_id, is_published, reaction_count)
      VALUES (
        $1,
        'Chào mừng mọi người đến với diễn đàn NovelHub Fandom!',
        'chao-mung-moi-nguoi-den-voi-dien-dan-novelhub-fandom',
        'Nơi đây là không gian tự do dành cho tất cả các bạn độc giả, tác giả và dịch giả giao lưu, chia sẻ bài viết, trao đổi về các bộ truyện yêu thích. Hãy cùng nhau xây dựng một cộng đồng văn minh và sôi nổi nhé!',
        NULL,
        NULL,
        true,
        28
      ) RETURNING id;
    `, [userId1]);

    // Seed some reactions
    if (p1.rows[0]) {
      await pool.query(`
        INSERT INTO post_reactions (post_id, user_id, reaction)
        VALUES 
          ($1, $2, 'love'::reaction_type),
          ($1, $3, 'like'::reaction_type)
        ON CONFLICT DO NOTHING;
      `, [p1.rows[0].id, userId1, userId2]);
    }

    // Seed sample comment
    if (p1.rows[0]) {
      await pool.query(`
        INSERT INTO comments (user_id, target_type, target_id, content)
        VALUES ($1, 'post', $2, 'Công nhận bộ này dịch mượt và minh họa đẹp mê li luôn ạ!');
      `, [userId2, p1.rows[0].id]);
    }

    console.log('✅ Seeded sample Fandom posts, reactions, and comments successfully!');
  } catch (err) {
    console.error('Failed to seed fandom:', err);
  } finally {
    process.exit(0);
  }
}

seedFandom();
