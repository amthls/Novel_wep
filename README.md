# 📖 NovelHub - Light Novel & Manga Platform

Hệ thống đọc Light Novel (Truyện chữ) & Manga (Truyện tranh) trực tuyến hiện đại với kiến trúc Full-Stack (Next.js, Express RESTful API, PostgreSQL, Prisma ORM, Docker Compose).

---

## 🏗️ Cấu Trúc Dự Án

```
doc/
├── .env                      # Biến môi trường chung root
├── .env.example              # Mẫu biến môi trường
├── docker-compose.yml        # Docker Compose (PostgreSQL 16, pgAdmin, Backend, Frontend)
├── package.json              # Quản lý script root bằng Yarn
├── sql/
│   └── database.sql          # Schema CSDL PostgreSQL + Seed data hoàn chỉnh
├── backend/                  # RESTful API Backend
│   ├── src/                  # Controllers, Routes, Config
│   ├── prisma/               # Prisma Schema & Client
│   ├── scripts/              # db:check, db:import
│   ├── Dockerfile
│   └── package.json
└── frontend/                 # Next.js 14 App Router Frontend
    ├── src/
    │   ├── app/              # App router pages & layouts
    │   └── components/       # UI Components (Navbar, QuickActionModal, Footer...)
    ├── Dockerfile
    └── package.json
```

---

## 🚀 Hướng Dẫn Khởi Chạy

### 1. Khởi động Cơ sở dữ liệu PostgreSQL qua Docker

```bash
yarn db:up
```

### 2. Kiểm tra trạng thái CSDL

```bash
yarn db:check
```

### 3. Nạp lại / Import CSDL nếu cần

```bash
yarn db:import
```

### 4. Mở Prisma Studio để xem dữ liệu trên Web GUI

```bash
yarn db:studio
```

### 5. Chạy ứng dụng Development (Cả Backend & Frontend)

```bash
yarn dev
```

Hoặc chạy riêng lẻ:
- **Backend API:** `yarn dev:be` (Chạy tại: `http://localhost:5000`)
- **Frontend Next.js:** `yarn dev:fe` (Chạy tại: `http://localhost:3000`)

---

## 📡 Danh Sách RESTful API Endpoints (`/api/v1`)

| Phương thức | Endpoint | Mô tả |
|------------|---------|-------|
| `GET` | `/api/v1/health` | Kiểm tra trạng thái API |
| `GET` | `/api/v1/tags` | Lấy danh sách thể loại & tag phân nhóm |
| `GET` | `/api/v1/stories` | Danh sách truyện (hỗ trợ filter type, status, search) |
| `GET` | `/api/v1/stories/trending` | Top 20 truyện hot trong tuần |
| `GET` | `/api/v1/stories/recently-updated` | 20 truyện mới cập nhật chương |
| `GET` | `/api/v1/stories/:slug` | Chi tiết truyện kèm danh sách volume & chapter |
| `GET` | `/api/v1/users` | Danh sách người dùng & role |
| `GET` | `/api/v1/users/:username` | Profile người dùng & cài đặt giao diện |
| `GET` | `/api/v1/groups` | Danh sách nhóm dịch |
| `GET` | `/api/v1/groups/:slug` | Chi tiết nhóm dịch & thành viên (trưởng nhóm/thành viên) |
| `GET` | `/api/v1/posts` | Danh sách bài viết Fandom/Blog kèm cảm xúc |
| `GET` | `/api/v1/posts/:slug` | Chi tiết bài viết Fandom kèm bình luận |

---

## 🔑 Tài Khoản Mẫu (Đã Seed Sẵn)

Tất cả tài khoản đều có mật khẩu mặc định: `password123`

| Username | Email | Vai trò (Roles) | Ghi chú |
|----------|-------|-----------------|---------|
| `admin` | admin@novelhub.vn | `admin` | Quản trị viên cao nhất |
| `mod_sakura` | sakura@novelhub.vn | `mod` | Moderator duyệt truyện |
| `mod_kaito` | kaito@novelhub.vn | `mod` | Moderator duyệt truyện |
| `neko_trans` | neko@novelhub.vn | `translator` | Trưởng nhóm Neko Translation |
| `tanuki_san` | tanuki@novelhub.vn | `translator` | Dịch giả tự do |
| `author_minh` | minh@novelhub.vn | `author` | Tác giả truyện |
| `kitsune_group` | kitsune@novelhub.vn | `translator` | Trưởng nhóm Kitsune Scanlation |
| `usagi_editor` | usagi@novelhub.vn | `translator` | Thành viên nhóm dịch |
| `reader_hana` | hana@novelhub.vn | `reader` | Độc giả |
| `reader_ryu` | ryu@novelhub.vn | `reader` | Độc giả |
| `reader_yuki` | yuki@novelhub.vn | `reader` | Độc giả |
| `reader_sora` | sora@novelhub.vn | `reader` | Độc giả |
