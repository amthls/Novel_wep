# 📚 NovelHub - Light Novel & Manga Platform

Hệ thống đọc **Light Novel (Truyện chữ)** & **Manga (Truyện tranh)** trực tuyến hiện đại với kiến trúc Full-Stack (**Next.js 14 App Router, Express RESTful API, PostgreSQL 16, Prisma ORM, Docker Compose**).

---

## 📑 Mục lục
1. [Kiến trúc & Công nghệ (Tech Stack)](#-kiến-trúc--công-nghệ-tech-stack)
2. [Thiết kế Cơ sở Dữ liệu (Database Architecture)](#-thiết-kế-cơ-sở-dữ-liệu-database-architecture)
   - [Sơ đồ Thực thể Quan hệ (ERD)](#sơ-đồ-thực-thể-quan-hệ-erd)
   - [Đặc tả các Bảng dữ liệu chính](#đặc-tả-các-bảng-dữ-liệu-chính)
3. [Danh mục Use Case chính](#-danh-mục-use-case-chính)
4. [Sơ đồ Luồng Tuần tự (Sequence Flows)](#-sơ-đồ-luồng-tuần-tự-sequence-flows)
   - [Sequence 1: Đọc chương & Tự động ghi Log Lịch sử đọc](#sequence-1-đọc-chương--tự-động-ghi-log-lịch-sử-đọc)
   - [Sequence 2: Đánh dấu Bookmark vị trí từng dòng truyện](#sequence-2-đánh-dấu-bookmark-vị-trí-từng-dòng-truyện)
   - [Sequence 3: Đăng chương mới & Tự động tạo Thông báo cho người theo dõi](#sequence-3-đăng-chương-mới--tự-động-tạo-thông-báo-cho-người-theo-dõi)
   - [Sequence 4: Người dùng tương tác Thông báo trên thanh Navbar](#sequence-4-người-dùng-tương-tác-thông-báo-trên-thanh-navbar)
5. [Danh mục RESTful API Endpoints](#-danh-mục-restful-api-endpoints-apiv1)
6. [Hướng dẫn Khởi chạy với Docker](#-hướng-dẫn-khởi-chạy-với-docker)
7. [Tài khoản Mẫu Kiểm thử](#-tài-khoản-mẫu-kiểm-thử)

---

## 🛠 Kiến trúc & Công nghệ (Tech Stack)

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend:** Node.js, Express RESTful API, TypeScript, JWT Authentication.
- **Database:** PostgreSQL 16, UUID v4 primary keys, Full-Text Search indexing.
- **ORM & Quản trị:** Prisma ORM, PostgreSQL Client, pgAdmin 4.
- **Containerization:** Docker & Docker Compose đa tầng.

---

## 🗄 Thiết kế Cơ sở Dữ liệu (Database Architecture)

### Sơ đồ Thực thể Quan hệ (ERD)

```mermaid
erDiagram
    USERS ||--o{ STORIES : "tạo / quản lý"
    USERS ||--o{ USER_FAVORITES : "theo dõi truyện"
    USERS ||--o{ BOOKMARKS : "đánh dấu dòng"
    USERS ||--o{ READING_HISTORY : "ghi log lượt đọc"
    USERS ||--o{ NOTIFICATIONS : "nhận thông báo"
    USERS ||--o{ POSTS : "đăng bài fandom"
    USERS ||--o{ COMMENTS : "bình luận"
    TRANSLATION_GROUPS ||--o{ GROUP_MEMBERS : "thành viên"
    TRANSLATION_GROUPS ||--o{ STORIES : "nhận dịch"
    STORIES ||--o{ VOLUMES : "chứa các tập"
    VOLUMES ||--o{ CHAPTERS : "chứa các chương"
    STORIES ||--o{ CHAPTERS : "thuộc truyện"
    STORIES ||--o{ USER_FAVORITES : "được theo dõi"
    STORIES ||--o{ BOOKMARKS : "được lưu bookmark"
    STORIES ||--o{ READING_HISTORY : "được đọc"
    CHAPTERS ||--o{ BOOKMARKS : "chứa dòng bookmark"
    CHAPTERS ||--o{ READING_HISTORY : "chứa chương đọc"
    CHAPTERS ||--o{ NOTIFICATIONS : "phát sinh thông báo"

    USERS {
        uuid id PK
        string username UK
        string email UK
        string password_hash
        string display_name
        string avatar_url
        user_role role
        int coins
        int exp_points
        timestamp created_at
    }

    STORIES {
        uuid id PK
        string title
        string slug UK
        story_type story_type "novel | manga"
        story_status status
        uuid uploader_id FK
        uuid group_id FK
        string cover_image_url
        int total_chapters
        bigint total_views
        int total_favorites
        timestamp last_chapter_at
    }

    VOLUMES {
        uuid id PK
        uuid story_id FK
        int volume_number
        string title
    }

    CHAPTERS {
        uuid id PK
        uuid story_id FK
        uuid volume_id FK
        decimal chapter_number
        string title
        string slug
        chapter_type chapter_type "text | image"
        text content
        jsonb images
        int view_count
        timestamp published_at
    }

    USER_FAVORITES {
        uuid id PK
        uuid user_id FK
        uuid story_id FK
        favorite_category category "reading | completed | on_hold | dropped | plan_to_read"
        boolean notify_updates "Bật nhận thông báo chương mới"
        timestamp created_at
    }

    BOOKMARKS {
        uuid id PK
        uuid user_id FK
        uuid story_id FK
        uuid chapter_id FK
        int line_index "Vị trí chỉ mục dòng trong chương"
        string paragraph_hash "Hash nhận diện đoạn văn bản"
        text line_text_preview "Trích dẫn dòng đã bookmark"
        string note "Ghi chú cá nhân"
        timestamp created_at
    }

    READING_HISTORY {
        uuid id PK
        uuid user_id FK
        uuid story_id FK
        uuid chapter_id FK
        decimal scroll_position "Tọa độ cuộn trang (%)"
        int page_number "Trang manga đang đọc"
        timestamp read_at "Thời điểm đọc (log riêng biệt từng lần)"
        int time_spent_seconds
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        notification_type type "chapter_update | system | comment_reply"
        string title
        text message
        string reference_type "chapter | story | post"
        uuid reference_id FK
        boolean is_read
        timestamp read_at
        timestamp created_at
    }
```

---

### Đặc tả các Bảng dữ liệu chính

1. **`users`**: Quản lý tài khoản, vai trò phân quyền (`admin`, `mod`, `translator`, `author`, `reader`), tiền tệ `coins`, điểm `exp_points`.
2. **`stories`**: Lưu trữ toàn bộ thông tin truyện (Light Novel & Manga), tác giả, họa sĩ, trạng thái (`ongoing`, `completed`, `hiatus`), số lượt xem, lượt theo dõi.
3. **`chapters`**: Lưu trữ nội dung từng chương (dạng văn bản chữ cho Novel hoặc danh sách ảnh minh họa/tranh vẽ JSONB cho Manga).
4. **`user_favorites` (Truyện đã lưu / Theo dõi)**:
   - Liên kết Người dùng - Truyện theo phân loại: Đang đọc, Hoàn thành, Tạm ngưng, Dự định đọc.
   - Cột `notify_updates = TRUE`: Đăng ký nhận thông báo tự động khi bộ truyện có chương mới.
5. **`bookmarks` (Đánh dấu dòng đọc dở)**:
   - Liên kết trực tiếp giữa Người dùng - Truyện - Chương - Chỉ mục dòng cụ thể (`line_index`).
   - Lưu trữ `line_text_preview` giúp người đọc bấm xem lại đúng câu chữ tâm đắc hoặc vị trí đang đọc dở.
6. **`reading_history` (Nhật ký lượt đọc)**:
   - Ghi lại **từng bản ghi log độc lập** cho mỗi lần người dùng bấm vào đọc chương (gồm `read_at`, `scroll_position`, `page_number`).
   - Cho phép thống kê tần suất đọc, tiếp tục đọc dở từ vị trí cuộn trang cũ.
7. **`notifications` (Hệ thống thông báo)**:
   - Lưu thông báo gửi đến người dùng: Khi có chương mới xuất bản của truyện đang theo dõi, phản hồi bình luận, thông báo hệ thống.
   - Ghi nhận trạng thái `is_read` và thời gian đọc `read_at`.

---

## 🎯 Danh mục Use Case chính

| Mã Use Case | Tên Use Case | Tác nhân (Actor) | Mô tả tóm tắt |
|:---|:---|:---|:---|
| **UC-01** | Tìm kiếm & Đọc truyện | Khách / Độc giả | Khám phá kho truyện qua bộ lọc (thể loại, tình trạng, lượt xem), đọc truyện chữ/tranh với giao diện tùy biến (cỡ chữ, nền tối). |
| **UC-02** | Theo dõi truyện (Favorites) | Độc giả đã đăng nhập | Bấm **"Theo dõi"** để lưu truyện vào tủ truyện cá nhân và kích hoạt nhận thông báo chương mới. |
| **UC-03** | Đánh dấu dòng (Bookmark Line) | Độc giả | Nhấn icon bookmark tại bất kỳ dòng văn bản nào trong chương để lưu lại vị trí đoạn văn và xem lại tại `/bookmark`. |
| **UC-04** | Ghi nhận Lịch sử đọc | Hệ thống / Độc giả | Tự động ghi lại log chi tiết mỗi khi mở một chương truyện; hỗ trợ xem lại và bấm **"Đọc tiếp"** tại `/lich-su`. |
| **UC-05** | Phát hành chương mới & Gửi thông báo | Nhóm dịch / Admin | Đăng tải chương mới; hệ thống tự động quét danh sách người theo dõi và phát sinh bản ghi thông báo trong DB. |
| **UC-06** | Nhận & Tương tác thông báo Navbar | Độc giả | Xem số lượng thông báo mới trên biểu tượng chuông; nhấn mở popover, đánh dấu đã đọc và chuyển thẳng đến chương mới. |
| **UC-07** | Đăng tải & Kiểm duyệt chương | Translator / Moderator | Gửi bản dịch chương mới qua form, biên tập nội dung, duyệt hoặc từ chối chương trước khi xuất bản công khai. |
| **UC-08** | Thảo luận Fandom & Bình luận | Độc giả / Dịch giả | Đăng bài viết chia sẻ trên diễn đàn Fandom, bình luận đa cấp theo từng chương và tương tác cảm xúc. |

---

## 🔄 Sơ đồ Luồng Tuần tự (Sequence Flows)

### Sequence 1: Đọc chương & Tự động ghi Log Lịch sử đọc
Khi độc giả bấm vào đọc một chương truyện, hệ thống tự động lưu vị trí và tạo một bản log lịch sử đọc riêng biệt vào database:

```mermaid
sequenceDiagram
    autonumber
    actor Reader as Độc giả
    participant Browser as Frontend (Next.js)
    participant API as Backend (Express API)
    participant DB as PostgreSQL DB

    Reader->>Browser: Truy cập /truyen/[slug]/[chapterSlug]
    Browser->>API: GET /api/v1/stories/:slug/chapters/:chapterSlug
    API->>DB: SELECT chapter content, story info
    DB-->>API: Trả về nội dung chương truyện
    API-->>Browser: 200 OK (Nội dung chương + danh sách chương)
    Browser-->>Reader: Hiển thị giao diện đọc truyện (Reader UI)

    Note over Browser,API: Kích hoạt tự động ghi nhận Log đọc truyện
    Browser->>Browser: Lưu vào localStorage (Offline / Khách)
    alt Độc giả đã đăng nhập (Token tồn tại)
        Browser->>API: POST /api/v1/history {story_id, chapter_id, scroll_position}
        API->>DB: INSERT INTO reading_history (user_id, story_id, chapter_id, scroll_position, read_at) VALUES (...)
        DB-->>API: Trả về bản ghi log mới (id, read_at)
        API-->>Browser: 201 Created {success: true}
    end

    opt Độc giả cuộn trang hoặc chuyển chương
        Browser->>API: POST /api/v1/history (Cập nhật tọa độ cuộn mới)
    end
```

---

### Sequence 2: Đánh dấu Bookmark vị trí từng dòng truyện
Người dùng có thể đánh dấu dòng câu văn cụ thể trong truyện chữ để ghi nhớ hoặc trích dẫn:

```mermaid
sequenceDiagram
    autonumber
    actor Reader as Độc giả
    participant ReaderBar as Reader Bar / Paragraph
    participant API as Backend API
    participant DB as PostgreSQL DB

    Reader->>ReaderBar: Di chuột vào đoạn văn bản -> Nhấn icon "Bookmark Dòng"
    ReaderBar->>API: POST /api/v1/bookmarks {story_id, chapter_id, line_index, line_text_preview, note}
    API->>API: Xác thực JWT Token độc giả
    API->>DB: INSERT INTO bookmarks (user_id, story_id, chapter_id, line_index, line_text_preview, note) VALUES (...)
    DB-->>API: Trả về Bookmark record
    API-->>ReaderBar: 201 Created {message: "Đã lưu bookmark thành công"}
    ReaderBar-->>Reader: Đổi màu icon dòng đã lưu & hiện Toast thông báo

    Note over Reader,DB: Khi độc giả vào trang quản lý Bookmark (/bookmark)
    Reader->>ReaderBar: Truy cập http://localhost:3000/bookmark
    ReaderBar->>API: GET /api/v1/bookmarks
    API->>DB: SELECT b.*, s.title, c.title, c.slug FROM bookmarks b JOIN stories s ...
    DB-->>API: Danh sách các dòng đã bookmark
    API-->>ReaderBar: 200 OK (Danh sách dòng trích dẫn + link nhảy thẳng đến chương)
    ReaderBar-->>Reader: Hiển thị danh sách bookmark trực quan
```

---

### Sequence 3: Đăng chương mới & Tự động tạo Thông báo cho người theo dõi
Khi nhóm dịch hoặc tác giả đăng tải chương mới được duyệt xuất bản, hệ thống lập tức thông báo cho toàn bộ người dùng đang theo dõi truyện:

```mermaid
sequenceDiagram
    autonumber
    actor Translator as Nhóm Dịch / Uploader
    participant API as Backend API
    participant NotifEngine as Notification Engine
    participant DB as PostgreSQL DB

    Translator->>API: POST /api/v1/chapters (hoặc duyệt Chapter Submission)
    API->>DB: INSERT INTO chapters (story_id, volume_id, chapter_number, title, content)
    DB-->>API: Tạo chương thành công (chapter_id, story_id)
    API->>DB: UPDATE stories SET last_chapter_at = NOW(), total_chapters = total_chapters + 1

    Note over API,NotifEngine: Kích hoạt gửi thông báo tự động (Background Job)
    API->>NotifEngine: createChapterUpdateNotifications(story_id, chapter_id, chapter_title)
    NotifEngine->>DB: SELECT user_id FROM user_favorites WHERE story_id = $1 AND notify_updates = true
    DB-->>NotifEngine: Danh sách User IDs đang theo dõi bộ truyện này
    
    loop Với từng người dùng theo dõi
        NotifEngine->>DB: INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id, is_read, created_at) VALUES (user_id, 'chapter_update', 'Chương mới: ...', '...', 'chapter', chapter_id, false, NOW())
    end
    DB-->>NotifEngine: Đã ghi nhận thông báo cho toàn bộ người theo dõi
    API-->>Translator: 201 Created (Chương truyện đã xuất bản & thông báo hoàn tất)
```

---

### Sequence 4: Người dùng tương tác Thông báo trên thanh Navbar
Độc giả nhận thấy biểu tượng chuông sáng đỏ, mở xem danh sách và click đọc ngay:

```mermaid
sequenceDiagram
    autonumber
    actor Reader as Độc giả
    participant Navbar as Navbar (Bell Icon)
    participant API as Backend API
    participant DB as PostgreSQL DB

    Navbar->>API: GET /api/v1/notifications (Định kỳ hoặc khi tải trang)
    API->>DB: SELECT n.*, s.title, s.cover_image_url, c.slug as chapter_slug, s.slug as story_slug FROM notifications n ... WHERE user_id = $user_id
    DB-->>API: Trả về danh sách thông báo & unread_count
    API-->>Navbar: 200 OK {notifications, unread_count: 2}
    Navbar-->>Reader: Hiển thị huy hiệu số lượng thông báo đỏ (Badge: "2")

    Reader->>Navbar: Nhấn vào biểu tượng Chiếc chuông (Bell Icon)
    Navbar-->>Reader: Mở popover danh sách: Ảnh bìa, Tên chương mới, Thời gian
    
    alt Độc giả nhấn vào 1 thông báo cụ thể
        Reader->>Navbar: Click vào thông báo "Chương mới: Solo Leveling..."
        Navbar->>API: PUT /api/v1/notifications/:id/read
        API->>DB: UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $id
        DB-->>API: 200 OK
        Navbar-->>Reader: Điều hướng ngay tới /truyen/[storySlug]/[chapterSlug]
    else Độc giả nhấn "Đã đọc tất cả"
        Reader->>Navbar: Click nút "Đã đọc tất cả"
        Navbar->>API: PUT /api/v1/notifications/read-all
        API->>DB: UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $user_id AND is_read = false
        DB-->>API: 200 OK
        Navbar-->>Reader: Xóa badge đỏ, đổi tất cả thông báo sang trạng thái đã đọc
    end
```

---

## 📡 Danh mục RESTful API Endpoints (`/api/v1`)

### 1. Truyện & Chương (`/stories`, `/chapters`)
- `GET /api/v1/stories`: Danh sách truyện kèm bộ lọc phân trang, tìm kiếm.
- `GET /api/v1/stories/trending`: Top truyện thịnh hành trong tuần.
- `GET /api/v1/stories/recently-updated`: Danh sách truyện vừa cập nhật chương mới.
- `GET /api/v1/stories/:slug`: Chi tiết tác phẩm, danh sách tập và chương.
- `GET /api/v1/stories/:slug/chapters/:chapterSlug`: Chi tiết nội dung chương truyện.
- `POST /api/v1/chapters`: Đăng chương mới (Yêu cầu quyền Translator / Author / Admin).

### 2. Theo dõi & Bookmark (`/favorites`, `/bookmarks`)
- `POST /api/v1/favorites/toggle`: Bật/tắt theo dõi truyện vào tủ truyện cá nhân.
- `GET /api/v1/favorites`: Lấy danh sách truyện đã lưu theo danh mục (`reading`, `completed`,...).
- `POST /api/v1/bookmarks`: Lưu vị trí bookmark theo từng dòng văn bản cụ thể.
- `GET /api/v1/bookmarks`: Lấy toàn bộ danh sách dòng đã bookmark của người dùng.
- `DELETE /api/v1/bookmarks/:id`: Xóa một dòng bookmark.

### 3. Lịch sử Đọc (`/history`)
- `GET /api/v1/history`: Lấy toàn bộ danh sách lịch sử các chương truyện đã đọc.
- `POST /api/v1/history`: Ghi nhận lượt đọc mới (Story ID, Chapter ID, tọa độ cuộn trang).
- `DELETE /api/v1/history/:id`: Xóa một mục lịch sử đọc.
- `DELETE /api/v1/history`: Xóa toàn bộ lịch sử đọc của tài khoản.

### 4. Thông báo (`/notifications`)
- `GET /api/v1/notifications`: Lấy danh sách thông báo kèm số lượng chưa đọc.
- `PUT /api/v1/notifications/:id/read`: Đánh dấu một thông báo là đã đọc.
- `PUT /api/v1/notifications/read-all`: Đánh dấu toàn bộ thông báo của người dùng là đã đọc.
- `DELETE /api/v1/notifications/:id`: Xóa thông báo khỏi danh sách.

### 5. Fandom & Bình luận (`/posts`, `/comments`)
- `GET /api/v1/posts`: Danh sách bài viết cộng đồng / blog fandom.
- `GET /api/v1/posts/:slug`: Xem chi tiết bài viết và bình luận thảo luận.
- `POST /api/v1/posts`: Tạo bài viết mới kèm ảnh tải lên.
- `POST /api/v1/comments`: Gửi bình luận đa tầng (hỗ trợ truyện, chương, bài viết).

---

## 🚀 Hướng dẫn Khởi chạy với Docker

Toàn bộ hệ thống đã được cấu hình trọn gói bằng Docker Compose. Chỉ với 1 câu lệnh để chạy toàn bộ Frontend, Backend API và PostgreSQL:

```bash
# Khởi động toàn bộ cụm dịch vụ
docker compose up -d

# Hoặc rebuild hình ảnh khi có cập nhật mới
docker compose build
docker compose up -d --force-recreate
```

### Các cổng dịch vụ mặc định:
- **Frontend App:** [http://localhost:3000](http://localhost:3000)
- **Lịch sử đọc:** [http://localhost:3000/lich-su](http://localhost:3000/lich-su)
- **Truyện đã lưu / Bookmark:** [http://localhost:3000/bookmark](http://localhost:3000/bookmark)
- **Backend API:** [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **PostgreSQL Database:** `localhost:5432` (User: `postgres`, DB: `novel_platform`)

---

## 👥 Tài khoản Mẫu Kiểm thử

Mật khẩu mặc định cho toàn bộ tài khoản bên dưới: **`password123`**

| Username | Email | Vai trò (Role) | Mô tả phân quyền |
|:---|:---|:---|:---|
| `admin` | admin@novelhub.vn | `admin` | Quản trị viên tối cao, duyệt truyện, quản lý người dùng |
| `mod_sakura` | sakura@novelhub.vn | `mod` | Moderator kiểm duyệt chương và bài viết Fandom |
| `kitsune_group` | kitsune@novelhub.vn | `translator` | Trưởng nhóm dịch Kitsune Scanlation |
| `author_minh` | minh@novelhub.vn | `author` | Tác giả sáng tác truyện chữ |
| `reader_yuki` | yuki@novelhub.vn | `reader` | Độc giả (Đang theo dõi truyện, có lịch sử đọc và thông báo) |
| `reader_hana` | hana@novelhub.vn | `reader` | Độc giả cộng đồng |
