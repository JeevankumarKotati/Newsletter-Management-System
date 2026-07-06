const bcrypt = require("bcryptjs")

const store = {
  mode: "mongo",
  initialized: false,
  users: [],
  articles: [],
  issues: [],
  feedback: [],
  counters: { user: 1, article: 1, issue: 1, feedback: 1 },
}

function makeId(prefix) {
  const value = store.counters[prefix]++
  return `${prefix}_${value}`
}

function setMemoryMode(enabled) {
  store.mode = enabled ? "memory" : "mongo"
}

function isMemoryMode() {
  return store.mode === "memory"
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data))
}

function getStore() {
  return store
}

function resetStore() {
  store.mode = "memory"
  store.initialized = false
  store.users = []
  store.articles = []
  store.issues = []
  store.feedback = []
  store.counters = { user: 1, article: 1, issue: 1, feedback: 1 }
}

async function seedDefaultData() {
  resetStore()
  const hashedPassword = "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"

  const users = [
    { id: makeId("user"), username: "admin_user", email: "admin@newsletter.com", password: hashedPassword, full_name: "System Administrator", role: "admin", subscription_status: "active", subscription_end_date: new Date("2025-12-31") },
    { id: makeId("user"), username: "editor_john", email: "john.editor@newsletter.com", password: hashedPassword, full_name: "John Smith", role: "editor", subscription_status: "active", subscription_end_date: new Date("2025-12-31") },
    { id: makeId("user"), username: "editor_sarah", email: "sarah.editor@newsletter.com", password: hashedPassword, full_name: "Sarah Johnson", role: "editor", subscription_status: "active", subscription_end_date: new Date("2025-12-31") },
    { id: makeId("user"), username: "subscriber_mike", email: "mike@email.com", password: hashedPassword, full_name: "Mike Wilson", role: "subscriber", subscription_status: "active", subscription_end_date: new Date("2025-06-30") },
    { id: makeId("user"), username: "subscriber_anna", email: "anna@email.com", password: hashedPassword, full_name: "Anna Davis", role: "subscriber", subscription_status: "active", subscription_end_date: new Date("2025-08-15") },
    { id: makeId("user"), username: "subscriber_tom", email: "tom@email.com", password: hashedPassword, full_name: "Tom Brown", role: "subscriber", subscription_status: "expired", subscription_end_date: new Date("2024-12-31") },
    { id: makeId("user"), username: "editor_lisa", email: "lisa.editor@newsletter.com", password: hashedPassword, full_name: "Lisa Chen", role: "editor", subscription_status: "active", subscription_end_date: new Date("2025-12-31") },
    { id: makeId("user"), username: "subscriber_david", email: "david@email.com", password: hashedPassword, full_name: "David Rodriguez", role: "subscriber", subscription_status: "active", subscription_end_date: new Date("2025-09-20") },
  ]

  store.users = users.map((user) => ({ ...user, account_status: "active", created_at: new Date(), updated_at: new Date() }))

  const issues = [
    { id: makeId("issue"), title: "Tech Trends 2025", description: "Exploring the latest technology trends and innovations shaping our digital future", issue_number: 1, publication_date: new Date("2025-01-15"), cover_image_url: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600", status: "published", created_by: store.users[1].id, created_at: new Date(), updated_at: new Date() },
    { id: makeId("issue"), title: "Digital Marketing Mastery", description: "Complete guide to modern digital marketing strategies, tools, and best practices", issue_number: 2, publication_date: new Date("2025-02-15"), cover_image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600", status: "published", created_by: store.users[2].id, created_at: new Date(), updated_at: new Date() },
    { id: makeId("issue"), title: "Future of Work", description: "How remote work, AI, and automation are reshaping the modern workplace", issue_number: 3, publication_date: new Date("2025-03-15"), cover_image_url: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=800&h=600", status: "published", created_by: store.users[6].id, created_at: new Date(), updated_at: new Date() },
    { id: makeId("issue"), title: "Cybersecurity Essentials", description: "Protecting your digital assets in an increasingly connected world", issue_number: 4, publication_date: new Date("2025-04-15"), cover_image_url: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600", status: "draft", created_by: store.users[1].id, created_at: new Date(), updated_at: new Date() },
  ]

  store.issues = issues

  const articles = [
    { id: makeId("article"), title: "Artificial Intelligence Revolution", content: "Artificial Intelligence is transforming every aspect of our lives.", summary: "A comprehensive analysis of how artificial intelligence is revolutionizing industries.", author_id: store.users[1].id, issue_id: store.issues[0].id, featured_image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600", status: "published", view_count: 245, created_at: new Date(), updated_at: new Date() },
    { id: makeId("article"), title: "Social Media Marketing Strategies", content: "Social media has evolved into the cornerstone of modern digital marketing.", summary: "Essential strategies and best practices for successful social media marketing campaigns.", author_id: store.users[2].id, issue_id: store.issues[1].id, featured_image_url: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600", status: "published", view_count: 189, created_at: new Date(), updated_at: new Date() },
    { id: makeId("article"), title: "Remote Work Best Practices", content: "The global shift to remote work has fundamentally changed professional collaboration.", summary: "Complete guide to excelling in remote work environments.", author_id: store.users[1].id, issue_id: store.issues[2].id, featured_image_url: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600", status: "published", view_count: 167, created_at: new Date(), updated_at: new Date() },
    { id: makeId("article"), title: "Cybersecurity Essentials", content: "Cybersecurity has become more critical than ever before.", summary: "Essential cybersecurity practices and strategies to protect against digital threats.", author_id: store.users[2].id, issue_id: store.issues[0].id, featured_image_url: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600", status: "published", view_count: 156, created_at: new Date(), updated_at: new Date() },
  ]

  store.articles = articles

  store.feedback = [
    { id: makeId("feedback"), article_id: store.articles[0].id, user_id: store.users[3].id, rating: 5, comment: "Excellent article!", created_at: new Date() },
    { id: makeId("feedback"), article_id: store.articles[0].id, user_id: store.users[4].id, rating: 4, comment: "Great overview.", created_at: new Date() },
    { id: makeId("feedback"), article_id: store.articles[1].id, user_id: store.users[5].id, rating: 5, comment: "Fantastic guide!", created_at: new Date() },
    { id: makeId("feedback"), article_id: store.articles[2].id, user_id: store.users[7].id, rating: 4, comment: "Great insights.", created_at: new Date() },
  ]

  store.initialized = true
  return true
}

module.exports = {
  setMemoryMode,
  isMemoryMode,
  getStore,
  resetStore,
  seedDefaultData,
  cloneData,
}
