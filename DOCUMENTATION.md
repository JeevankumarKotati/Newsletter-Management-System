# Newsletter Management System — Complete Documentation

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture & Project Structure](#3-architecture--project-structure)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Authentication Pipeline](#5-authentication-pipeline)
6. [Database Schema (MongoDB)](#6-database-schema-mongodb)
7. [Content Management Pipeline](#7-content-management-pipeline)
8. [Feedback & Rating System](#8-feedback--rating-system)
9. [Subscription System](#9-subscription-system)
10. [API Endpoints Reference](#10-api-endpoints-reference)
11. [Frontend Pages](#11-frontend-pages)
12. [Middleware](#12-middleware)
13. [Data Seeding & Initialization](#13-data-seeding--initialization)
14. [Request–Response Lifecycle](#14-requestresponse-lifecycle)
15. [Demo Accounts](#15-demo-accounts)
16. [How to Run](#16-how-to-run)

---

## 1. System Overview

**NewsletterHub** is a full-stack web application for managing digital magazines and newsletters. It allows administrators to oversee the entire platform, editors to create and publish articles grouped into magazine issues, and subscribers to read content and leave ratings/feedback.

### Core Functionalities

| Feature | Description |
|---|---|
| **User Management** | Registration, login/logout, role-based dashboards, profile editing |
| **Article Management** | CRUD operations for articles with draft/published/archived lifecycle |
| **Issue (Magazine) Management** | Group articles into numbered magazine issues with cover images |
| **Feedback & Ratings** | Subscribers rate articles 1–5 stars and leave comments |
| **Subscription Management** | Monthly/yearly subscription renewal, active/expired/cancelled statuses |
| **Admin Dashboard** | Platform-wide statistics, user management, content moderation, reports |
| **Public Preview** | Unauthenticated visitors can browse a limited preview of published content |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (v22+) |
| **Web Framework** | Express.js |
| **Database** | MongoDB (via Mongoose ODM) |
| **Authentication** | express-session (server-side sessions with cookies) |
| **Password Hashing** | bcryptjs (pure JavaScript implementation) |
| **Frontend** | Static HTML pages with vanilla JavaScript |
| **CSS Framework** | Tailwind CSS (CDN) |
| **Icons** | Lucide Icons (CDN) |

### Dependencies (package.json)

```
bcryptjs        – Password hashing (pure JS, no native compilation)
express         – Web framework
express-session – Session management
mongoose        – MongoDB ODM
```

---

## 3. Architecture & Project Structure

The application follows an **MVC (Model-View-Controller)** pattern with RESTful API routes:

```
newsletter-management-system/
├── server.js                    # Entry point — Express app setup, MongoDB connection
├── package.json                 # Dependencies & scripts
├── README.md                    # Project readme
│
├── middleware/
│   └── auth.js                  # Role-based access control middleware
│
├── models/                      # Mongoose schemas & data access classes
│   ├── User.js                  # User model (authentication, profiles, subscriptions)
│   ├── Article.js               # Article model (CRUD, publishing, view counts)
│   ├── Issue.js                 # Issue/Magazine model (CRUD, article grouping)
│   └── Feedback.js              # Feedback model (ratings, comments, aggregations)
│
├── routes/                      # Express route handlers (Controllers)
│   ├── auth.js                  # Authentication routes (/auth/*)
│   ├── admin.js                 # Admin routes (/admin/*)
│   ├── editor.js                # Editor routes (/editor/*)
│   ├── subscriber.js            # Subscriber routes (/subscriber/*)
│   └── public.js                # Public routes (/, /api/*)
│
├── public/                      # Static frontend files (Views)
│   ├── index.html               # Landing/home page
│   ├── login.html               # Login page
│   ├── register.html            # Registration page
│   └── dashboard.html           # Role-adaptive dashboard (single page for all roles)
│
└── scripts/
    ├── 01-create-database.sql   # Legacy MySQL schema (not used)
    ├── 02-seed-data.sql         # Legacy MySQL seed data (not used)
    └── 03-initialize-database.js # MongoDB seed script (active)
```

### Data Flow

```
Client (Browser)
    ↓ HTTP Request
Express Router (routes/)
    ↓ Middleware check (auth.js)
Route Handler
    ↓ Model method call
Model (models/)
    ↓ Mongoose query
MongoDB Database
    ↑ Results
Model → Route Handler → JSON Response → Client
```

---

## 4. User Roles & Permissions

The system has three distinct user roles, each with escalating privileges:

### Role Hierarchy

```
Admin (highest)
  └── Editor
       └── Subscriber (lowest)
```

### Permission Matrix

| Action | Subscriber | Editor | Admin |
|---|:---:|:---:|:---:|
| View published articles | ✅ | ✅ | ✅ |
| View published issues | ✅ | ✅ | ✅ |
| Submit article feedback (1-5 stars + comment) | ✅ | ✅ | ✅ |
| Manage own profile | ✅ | ✅ | ✅ |
| Renew subscription | ✅ | ✅ | ✅ |
| Create articles | ❌ | ✅ | ✅ |
| Edit own articles | ❌ | ✅ | ✅ |
| Delete own articles | ❌ | ✅ | ✅ |
| Create issues | ❌ | ✅ | ✅ |
| Edit issues | ❌ | ✅ | ✅ |
| View all articles (any status) | ❌ | ✅ | ✅ |
| View admin dashboard & stats | ❌ | ❌ | ✅ |
| Manage all users | ❌ | ❌ | ✅ |
| Delete any article | ❌ | ❌ | ✅ |
| Delete any issue | ❌ | ❌ | ✅ |
| Delete any feedback | ❌ | ❌ | ✅ |
| View system reports | ❌ | ❌ | ✅ |

### Middleware Enforcement

```
requireAuth       → Any authenticated user
requireSubscriber → subscriber | editor | admin
requireEditor     → editor | admin
requireAdmin      → admin only
```

---

## 5. Authentication Pipeline

### Registration Flow

```
1. User submits form → POST /auth/register
2. Server validates:
   - All required fields present (username, email, password, full_name)
   - Email format (regex validation)
   - Password ≥ 6 characters
   - Username 3-50 characters
   - Role is valid (admin | editor | subscriber)
3. Check for duplicate email
4. Check for duplicate username
5. Hash password with bcryptjs (10 salt rounds)
6. Create user in MongoDB
7. Return success → Redirect to /login
```

### Login Flow

```
1. User submits form → POST /auth/login
2. Server validates email format & required fields
3. Look up user by email in MongoDB
4. Compare password with bcrypt.compare()
5. On success → Create server-side session:
   {
     id, username, email, full_name, role,
     subscription_status, subscription_end_date
   }
6. Set HTTP-only cookie (24h expiry)
7. Return success → Client redirects to /dashboard
```

### Session Management

```
- Cookie: HTTP-only, 24-hour max age, not secure (HTTP dev mode)
- Session store: In-memory (default express-session MemoryStore)
- Auth check: Every protected route reads req.session.user
- Logout: POST /auth/logout → session.destroy()
```

### Auth Status Check (used by dashboard)

```
GET /auth/me
  → Returns { success: true, user: {...} } if session exists
  → Returns 401 if not authenticated
  → Dashboard JS uses this on load to detect current user & role
```

---

## 6. Database Schema (MongoDB)

### Users Collection

| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `username` | String | Unique, required, 3-50 chars |
| `email` | String | Unique, required |
| `password` | String | Required (bcrypt hashed) |
| `full_name` | String | Required, max 100 chars |
| `role` | String | Enum: `admin`, `editor`, `subscriber` (default) |
| `subscription_status` | String | Enum: `active`, `expired`, `cancelled` (default: active) |
| `subscription_end_date` | Date | |
| `created_at` | Date | Auto-generated timestamp |
| `updated_at` | Date | Auto-generated timestamp |

**Indexes:** `role`, `subscription_status`, unique on `username`, unique on `email`

### Articles Collection

| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `title` | String | Required, max 200 chars |
| `content` | String | Required (full article body) |
| `summary` | String | Optional short description |
| `author_id` | ObjectId | Ref → Users |
| `issue_id` | ObjectId | Ref → Issues (nullable) |
| `featured_image_url` | String | Default: Unsplash placeholder |
| `status` | String | Enum: `draft`, `published`, `archived` (default: draft) |
| `view_count` | Number | Default: 0, incremented on read |
| `created_at` | Date | Auto-generated timestamp |
| `updated_at` | Date | Auto-generated timestamp |

**Indexes:** `status`, `issue_id`, `author_id`

### Issues Collection

| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `title` | String | Required, max 200 chars |
| `description` | String | Optional |
| `issue_number` | Number | Required, unique, auto-incremented |
| `publication_date` | Date | Required |
| `cover_image_url` | String | Default: Unsplash placeholder |
| `status` | String | Enum: `draft`, `published`, `archived` (default: draft) |
| `created_by` | ObjectId | Ref → Users |
| `created_at` | Date | Auto-generated timestamp |
| `updated_at` | Date | Auto-generated timestamp |

**Indexes:** `status`, `publication_date`

### Feedback Collection

| Field | Type | Constraints |
|---|---|---|
| `_id` | ObjectId | Auto-generated primary key |
| `article_id` | ObjectId | Ref → Articles, required |
| `user_id` | ObjectId | Ref → Users, required |
| `rating` | Number | Required, range 1-5 |
| `comment` | String | Optional |
| `created_at` | Date | Auto-generated timestamp |

**Indexes:** Unique compound `(user_id, article_id)`, `article_id`, `rating`

### Entity Relationships

```
Users ──1:N──▶ Articles     (author_id)
Users ──1:N──▶ Issues       (created_by)
Users ──1:N──▶ Feedback     (user_id)
Issues ──1:N──▶ Articles    (issue_id)
Articles ──1:N──▶ Feedback  (article_id)

Constraint: One feedback per user per article (unique compound index)
```

---

## 7. Content Management Pipeline

### Article Lifecycle

```
                 ┌────────────┐
  Editor creates │   DRAFT    │
  an article     └─────┬──────┘
                       │
              Editor publishes
                       │
                 ┌─────▼──────┐
                 │ PUBLISHED  │◄── Visible to subscribers
                 └─────┬──────┘    Visible in public preview
                       │
              Admin/Editor archives
                       │
                 ┌─────▼──────┐
                 │  ARCHIVED  │◄── Hidden from subscribers
                 └────────────┘
```

### Issue (Magazine) Lifecycle

```
  Editor creates    ┌────────────┐
  a new issue  ────▶│   DRAFT    │
                    └─────┬──────┘
                          │
                 Editor publishes
                 (articles become
                  visible if also
                  published)
                          │
                    ┌─────▼──────┐
                    │ PUBLISHED  │◄── Articles visible to subscribers
                    └─────┬──────┘
                          │
                 Admin/Editor archives
                          │
                    ┌─────▼──────┐
                    │  ARCHIVED  │
                    └────────────┘
```

### Article Visibility Rules

An article is visible to subscribers only if:
1. The article's `status` is `published`, **AND**
2. Either the article has no `issue_id` (standalone), **OR** its parent issue also has `status: published`

### Content Creation Workflow

```
1. Editor creates an Issue (title, description, publication date, cover image)
   → Auto-assigned next issue_number
   → Starts as "draft"

2. Editor writes Articles (title, content, summary, featured image)
   → Assigns article to an issue (optional)
   → Starts as "draft"

3. Editor publishes the article (status → "published")

4. Editor publishes the issue (status → "published")
   → All published articles in the issue become visible

5. Subscribers can now:
   → Read full articles (view_count incremented)
   → Rate and comment on articles
```

### Cascade Deletion

- Deleting an **Issue** also deletes all articles belonging to that issue
- Deleting an **Article** removes it from the database (feedback for it remains unless cleaned separately)

---

## 8. Feedback & Rating System

### How It Works

1. **Any authenticated user** (subscriber, editor, or admin) can submit feedback on published articles
2. Each user can submit **one rating per article** (enforced by unique compound index)
3. Subsequent submissions **upsert** (update the existing feedback)
4. Feedback consists of:
   - **Rating**: Integer from 1 to 5 stars
   - **Comment**: Optional text comment

### Aggregation Pipeline

The system uses MongoDB aggregation to compute:

- **Per-article average rating** — `$avg` on the `rating` field grouped by `article_id`
- **Per-article feedback count** — `$sum: 1` per group
- **Top-rated articles** — Sorted by average rating (desc), then feedback count (desc), with `$lookup` to join article titles
- **Global feedback stats** — Total feedback, global average rating, star distribution (1–5 counts)

### Where Ratings Appear

| Context | Data Shown |
|---|---|
| Public preview (homepage) | Average rating per article |
| Subscriber dashboard | Top-rated articles list |
| Subscriber article view | All feedback + user's own feedback |
| Admin dashboard | Average rating stat card |
| Admin reports | Top 10 rated articles |

---

## 9. Subscription System

### Subscription Statuses

| Status | Meaning |
|---|---|
| `active` | User has a valid subscription |
| `expired` | Subscription end date has passed |
| `cancelled` | User cancelled their subscription |

### Renewal

- **Endpoint**: `POST /subscriber/subscription/renew`
- **Options**: `monthly` (current date + 1 month) or `yearly` (current date + 1 year)
- Updates `subscription_status` to `active` and sets new `subscription_end_date`
- Session data is updated immediately

> **Note**: The current implementation does not enforce content access based on subscription status — all authenticated users can view published content. The subscription status is tracked but acts as metadata rather than a hard gate.

---

## 10. API Endpoints Reference

### Public Routes (No Auth Required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Serve landing page (index.html) |
| `GET` | `/login` | Serve login page |
| `GET` | `/register` | Serve registration page |
| `GET` | `/dashboard` | Serve dashboard page (auth checked client-side) |
| `GET` | `/api/preview` | Get limited public content preview (3 articles, 2 issues, top rated) |
| `GET` | `/api/health` | Health check (status, uptime, memory) |
| `GET` | `/api/stats` | Public statistics (published article/issue counts) |

### Auth Routes (`/auth/*`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create new user account |
| `POST` | `/auth/login` | Authenticate and create session |
| `POST` | `/auth/logout` | Destroy session |
| `GET` | `/auth/me` | Get current session user data |
| `GET` | `/auth/status` | Check authentication status |

### Admin Routes (`/admin/*`) — Requires `admin` role

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/dashboard` | Aggregated platform stats (users, articles, issues, feedback) |
| `GET` | `/admin/users` | List all users |
| `PUT` | `/admin/users/:id` | Update user (role, status, profile) |
| `GET` | `/admin/articles` | List all articles (any status) |
| `DELETE` | `/admin/articles/:id` | Delete any article |
| `GET` | `/admin/issues` | List all issues |
| `DELETE` | `/admin/issues/:id` | Delete any issue (cascades to articles) |
| `GET` | `/admin/feedback` | List all feedback |
| `DELETE` | `/admin/feedback/:id` | Delete any feedback entry |
| `GET` | `/admin/reports` | Top rated articles report |

### Editor Routes (`/editor/*`) — Requires `editor` or `admin` role

| Method | Path | Description |
|---|---|---|
| `GET` | `/editor/dashboard` | Editor's articles + stats + all issues |
| `GET` | `/editor/issues` | List all issues |
| `POST` | `/editor/issues` | Create new issue (auto issue_number) |
| `PUT` | `/editor/issues/:id` | Update issue |
| `GET` | `/editor/articles` | List all articles |
| `GET` | `/editor/articles/:id` | Get specific article for editing |
| `POST` | `/editor/articles` | Create new article |
| `PUT` | `/editor/articles/:id` | Update article |
| `DELETE` | `/editor/articles/:id` | Delete article (own articles only, unless admin) |

### Subscriber Routes (`/subscriber/*`) — Requires any authenticated role

| Method | Path | Description |
|---|---|---|
| `GET` | `/subscriber/dashboard` | Published content feed + top rated + subscription info |
| `GET` | `/subscriber/articles` | All published articles |
| `GET` | `/subscriber/articles/:id` | Read article (increments view count) + feedback |
| `POST` | `/subscriber/articles/:id/feedback` | Submit/update rating & comment |
| `GET` | `/subscriber/issues` | All published issues |
| `GET` | `/subscriber/issues/:id` | Issue detail with articles list |
| `GET` | `/subscriber/profile` | Get user profile |
| `PUT` | `/subscriber/profile` | Update username & full name |
| `POST` | `/subscriber/subscription/renew` | Renew subscription (monthly/yearly) |

---

## 11. Frontend Pages

### Landing Page (`index.html`)

- **Purpose**: Public-facing marketing page for unauthenticated visitors
- **Sections**:
  - **Navigation bar**: Logo ("NewsletterHub"), Login & Sign Up links
  - **Hero section**: Headline, description, CTA buttons ("Get Started", "Browse Content") with background image
  - **Features section**: Three feature cards — Role-Based Access, Content Management, Feedback System
  - **Content preview section**: Dynamically loads from `/api/preview` — shows recent articles (grid of 3), magazine issues (grid of 2), and top-rated articles (ranked list)
  - **CTA section**: "Ready to get started?" with sign-up prompt
  - **Footer**: Copyright and tagline

### Login Page (`login.html`)

- **Purpose**: User authentication
- **Features**:
  - Email + password form
  - Client-side validation
  - Error message display
  - Demo accounts info panel (admin, editor, subscriber credentials)
  - Auto-fill on demo account click
  - POST to `/auth/login` → redirect to `/dashboard` on success

### Registration Page (`register.html`)

- **Purpose**: New user account creation
- **Features**:
  - Fields: Full Name, Username, Email, Password
  - Account type selector: Subscriber (default) or Editor
  - Client-side password strength validation (≥ 6 chars)
  - POST to `/auth/register` → success message → redirect to `/login`
  - Error/success message display

### Dashboard Page (`dashboard.html`)

- **Purpose**: Single adaptive dashboard that serves all three roles
- **Initialization flow**:
  1. On load, calls `GET /auth/me` to detect user role
  2. If not authenticated → redirect to `/login`
  3. Builds role-specific navigation menu
  4. Loads role-specific dashboard view

#### Admin Dashboard View
- **Navigation**: Dashboard, Users, Articles, Issues, Feedback, Reports
- **Stats cards**: Total Users, Published Articles, Published Issues, Average Rating
- **Recent activity panels**: Latest user registrations + recent article activity
- **Section views**: Users, Articles, Issues, Feedback, Reports (placeholder UI)

#### Editor Dashboard View
- **Navigation**: Dashboard, My Articles, All Articles, Issues
- **Quick actions**: "New Article" and "New Issue" buttons
- **Stats cards**: My Articles, Published count, Drafts count
- **Recent articles list**: Editor's own articles with status badges and edit buttons

#### Subscriber Dashboard View
- **Navigation**: Dashboard, Articles, Issues, Profile
- **Subscription status banner** with renewal button if expired
- **Latest articles grid** with images, summaries, ratings, and "Read Article" buttons
- **Latest issues grid** with cover images and "Read Issue" buttons
- **Top rated articles** ranked list

---

## 12. Middleware

### Authentication Middleware (`middleware/auth.js`)

Four middleware functions applied as Express middleware on route groups:

| Function | Allowed Roles | Applied To |
|---|---|---|
| `requireAuth` | Any authenticated user | General protected routes |
| `requireSubscriber` | subscriber, editor, admin | `/subscriber/*` routes |
| `requireEditor` | editor, admin | `/editor/*` routes |
| `requireAdmin` | admin only | `/admin/*` routes |

**Behavior on failure**:
- No session → `401 Authentication required`
- Wrong role → `403 [Role] access required`

### Request Processing Pipeline

```
Incoming Request
    │
    ▼
express.json()          ← Parse JSON body (10MB limit)
express.urlencoded()    ← Parse URL-encoded body
express.static("public") ← Serve static files
express-session()       ← Attach session, set cookie
    │
    ▼
req.db = mongoose.connection  ← Make DB available to routes
    │
    ▼
Route matching: /auth, /admin, /editor, /subscriber, /
    │
    ▼
Role middleware (requireAdmin, requireEditor, etc.)
    │
    ▼
Route handler → Model queries → JSON response
    │
    ▼
Global error handler (500) or 404 handler
```

---

## 13. Data Seeding & Initialization

On every server start, `scripts/03-initialize-database.js` runs and:

1. **Drops all existing collections** (fresh start each time)
2. **Creates 8 users**:
   - 1 Admin: `admin@newsletter.com`
   - 3 Editors: `john.editor@`, `sarah.editor@`, `lisa.editor@newsletter.com`
   - 4 Subscribers: `mike@`, `anna@`, `tom@`, `david@email.com`
   - (Tom has `expired` subscription)
3. **Creates 5 issues**:
   - 3 Published: "Tech Trends 2025", "Digital Marketing Mastery", "Future of Work"
   - 2 Draft: "Cybersecurity Essentials", "Sustainable Technology"
4. **Creates 6 published articles**:
   - "Artificial Intelligence Revolution" (245 views)
   - "Social Media Marketing Strategies" (189 views)
   - "Remote Work Best Practices" (167 views)
   - "Cybersecurity Essentials" (156 views)
   - "Cloud Computing Fundamentals" (134 views)
   - "Data Analytics for Business" (198 views)
5. **Creates 16 feedback entries**: Ratings 3–5 with realistic comments across articles

> **Note**: All demo passwords are "password" (stored as bcrypt hash).

---

## 14. Request–Response Lifecycle

### Example: Subscriber reads an article

```
1. Browser → GET /subscriber/articles/674abc123...
   Cookie: connect.sid=s%3A...

2. Express session middleware → Reads session from store
   → req.session.user = { id, role: "subscriber", ... }

3. requireSubscriber middleware → role is "subscriber" ✅ → next()

4. Route handler (subscriber.js):
   a. Instantiate Article model and Feedback model
   b. Promise.all([
        articleModel.getById(id),       ← Mongoose findById + populate author + issue + rating aggregation
        feedbackModel.getByArticle(id)  ← Mongoose find + populate user names
      ])
   c. Check article exists and is published
   d. articleModel.incrementViewCount(id)  ← $inc: { view_count: 1 }
   e. feedbackModel.getByUserAndArticle(userId, articleId)  ← Check for existing user feedback
   f. Return JSON: { article, feedback, userFeedback }

5. Browser receives JSON → Renders article content, feedback list, rating form
```

### Example: Editor creates an article

```
1. Browser → POST /editor/articles
   Body: { title, content, summary, issue_id, featured_image_url, status }
   Cookie: connect.sid=...

2. Session middleware → req.session.user = { id, role: "editor" }

3. requireEditor middleware → role is "editor" ✅

4. Route handler:
   a. Validate title and content are present
   b. articleModel.create({
        ...body,
        author_id: req.session.user.id,
        status: status || "draft"
      })
   c. Return 201: { message, articleId }
```

---

## 15. Demo Accounts

| Role | Email | Password | Username |
|---|---|---|---|
| **Admin** | admin@newsletter.com | password | admin_user |
| **Editor** | john.editor@newsletter.com | password | editor_john |
| **Editor** | sarah.editor@newsletter.com | password | editor_sarah |
| **Editor** | lisa.editor@newsletter.com | password | editor_lisa |
| **Subscriber** | mike@email.com | password | subscriber_mike |
| **Subscriber** | anna@email.com | password | subscriber_anna |
| **Subscriber** | tom@email.com | password | subscriber_tom |
| **Subscriber** | david@email.com | password | subscriber_david |

> Tom Brown (`tom@email.com`) is the only user with `expired` subscription status.

---

## 16. How to Run

### Prerequisites

- **Node.js** v18+ installed
- **MongoDB** running locally on `localhost:27017`

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start the server (auto-seeds database)
node server.js

# 3. Open browser
# → http://localhost:3000
```

### Environment Variables (optional)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `MONGO_URI` | `mongodb://localhost:27017/newsletter_system` | MongoDB connection string |
| `SESSION_SECRET` | `newsletter-secret-key-change-in-production` | Session secret |
| `NODE_ENV` | — | Set to `production` to hide error stacks |

---

*Generated documentation for the Newsletter Management System codebase.*
