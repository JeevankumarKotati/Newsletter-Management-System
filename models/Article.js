// Article model - handles all article-related database operations (MongoDB/Mongoose)

const mongoose = require("mongoose")
const { getStore } = require("./memoryStore")

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true },
    summary: { type: String },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    issue_id: { type: mongoose.Schema.Types.ObjectId, ref: "Issue" },
    featured_image_url: {
      type: String,
      default: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=600",
    },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    view_count: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
)

articleSchema.index({ status: 1 })
articleSchema.index({ issue_id: 1 })
articleSchema.index({ author_id: 1 })

const ArticleModel = mongoose.model("Article", articleSchema)

class Article {
  constructor(db) {
    this.db = db
  }

  _isMemoryMode() {
    return this.db?.mode === "memory"
  }

  async create(articleData) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const article = {
        id: `article_${store.counters.article++}`,
        title: articleData.title,
        content: articleData.content,
        summary: articleData.summary,
        author_id: articleData.author_id,
        issue_id: articleData.issue_id,
        featured_image_url: articleData.featured_image_url || "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=600",
        status: articleData.status || "draft",
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      }
      store.articles.push(article)
      return article.id
    }

    const { title, content, summary, author_id, issue_id, featured_image_url, status = "draft" } = articleData
    const article = await ArticleModel.create({
      title, content, summary, author_id, issue_id, featured_image_url, status,
    })
    console.log(`✅ Article created with ID: ${article._id}`)
    return article._id
  }

  _mapArticle(article, store) {
    const author = store.users.find((entry) => entry.id === article.author_id || entry.id?.toString() === article.author_id?.toString())
    const issue = store.issues.find((entry) => entry.id === article.issue_id || entry.id?.toString() === article.issue_id?.toString())
    const feedbackEntries = store.feedback.filter((entry) => entry.article_id === article.id || entry.article_id?.toString() === article.id?.toString())
    const averageRating = feedbackEntries.length ? feedbackEntries.reduce((sum, entry) => sum + entry.rating, 0) / feedbackEntries.length : null

    return {
      ...article,
      author_name: author?.full_name || null,
      issue_title: issue?.title || null,
      issue_number: issue?.issue_number || null,
      author_id: article.author_id,
      issue_id: article.issue_id,
      average_rating: averageRating,
      feedback_count: feedbackEntries.length,
    }
  }

  async getAll(status = null) {
    if (this._isMemoryMode()) {
      const store = getStore()
      let articles = store.articles.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      if (status) articles = articles.filter((entry) => entry.status === status)
      return articles.map((article) => this._mapArticle(article, store))
    }

    const filter = status ? { status } : {}
    const articles = await ArticleModel.find(filter)
      .populate("author_id", "full_name")
      .populate("issue_id", "title issue_number")
      .sort({ created_at: -1 })
      .lean()
    return articles.map((a) => ({
      ...a,
      id: a._id,
      author_name: a.author_id?.full_name || null,
      issue_title: a.issue_id?.title || null,
      issue_number: a.issue_id?.issue_number || null,
      author_id: a.author_id?._id || a.author_id,
      issue_id: a.issue_id?._id || a.issue_id,
    }))
  }

  async getPublished() {
    if (this._isMemoryMode()) {
      const store = getStore()
      const publishedIssueIds = store.issues.filter((entry) => entry.status === "published").map((entry) => entry.id)
      const articles = store.articles.filter((entry) => entry.status === "published" && (publishedIssueIds.includes(entry.issue_id) || !entry.issue_id))
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      return articles.map((article) => this._mapArticle(article, store))
    }

    const Issue = mongoose.model("Issue")
    const publishedIssueIds = (await Issue.find({ status: "published" }, "_id").lean()).map((i) => i._id)

    const articles = await ArticleModel.find({
      status: "published",
      $or: [{ issue_id: { $in: publishedIssueIds } }, { issue_id: null }],
    })
      .populate("author_id", "full_name")
      .populate("issue_id", "title issue_number")
      .sort({ created_at: -1 })
      .lean()

    const Feedback = mongoose.model("Feedback")
    const ratings = await Feedback.aggregate([
      { $match: { article_id: { $in: articles.map((a) => a._id) } } },
      { $group: { _id: "$article_id", average_rating: { $avg: "$rating" }, feedback_count: { $sum: 1 } } },
    ])
    const ratingsMap = Object.fromEntries(ratings.map((r) => [r._id.toString(), r]))

    return articles.map((a) => {
      const r = ratingsMap[a._id.toString()] || {}
      return {
        ...a,
        id: a._id,
        author_name: a.author_id?.full_name || null,
        issue_title: a.issue_id?.title || null,
        issue_number: a.issue_id?.issue_number || null,
        author_id: a.author_id?._id || a.author_id,
        issue_id: a.issue_id?._id || a.issue_id,
        average_rating: r.average_rating || null,
        feedback_count: r.feedback_count || 0,
      }
    })
  }

  async getById(id) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const article = store.articles.find((entry) => entry.id === id || entry.id?.toString() === id?.toString())
      return article ? this._mapArticle(article, store) : null
    }

    const article = await ArticleModel.findById(id)
      .populate("author_id", "full_name")
      .populate("issue_id", "title issue_number")
      .lean()
    if (!article) return null

    const Feedback = mongoose.model("Feedback")
    const stats = await Feedback.aggregate([
      { $match: { article_id: article._id } },
      { $group: { _id: null, average_rating: { $avg: "$rating" }, feedback_count: { $sum: 1 } } },
    ])
    const r = stats[0] || {}

    return {
      ...article,
      id: article._id,
      author_name: article.author_id?.full_name || null,
      issue_title: article.issue_id?.title || null,
      issue_number: article.issue_id?.issue_number || null,
      author_id: article.author_id?._id || article.author_id,
      issue_id: article.issue_id?._id || article.issue_id,
      average_rating: r.average_rating || null,
      feedback_count: r.feedback_count || 0,
    }
  }

  async update(id, articleData) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const index = store.articles.findIndex((entry) => entry.id === id || entry.id?.toString() === id?.toString())
      if (index === -1) return false
      store.articles[index] = { ...store.articles[index], ...articleData, updated_at: new Date() }
      return true
    }

    const { title, content, summary, issue_id, featured_image_url, status } = articleData
    const result = await ArticleModel.findByIdAndUpdate(id, {
      title, content, summary, issue_id, featured_image_url, status,
    })
    if (result) console.log(`✅ Article updated: ID ${id}`)
    return !!result
  }

  async delete(id) {
    if (this._isMemoryMode()) {
      const store = getStore()
      store.articles = store.articles.filter((entry) => entry.id !== id && entry.id?.toString() !== id?.toString())
      store.feedback = store.feedback.filter((entry) => entry.article_id !== id && entry.article_id?.toString() !== id?.toString())
      return true
    }

    const result = await ArticleModel.findByIdAndDelete(id)
    if (result) console.log(`✅ Article deleted: ID ${id}`)
    return !!result
  }

  async incrementViewCount(id) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const index = store.articles.findIndex((entry) => entry.id === id || entry.id?.toString() === id?.toString())
      if (index === -1) return false
      store.articles[index] = { ...store.articles[index], view_count: (store.articles[index].view_count || 0) + 1, updated_at: new Date() }
      return true
    }

    const result = await ArticleModel.findByIdAndUpdate(id, { $inc: { view_count: 1 } })
    return !!result
  }

  async getByAuthor(authorId) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const articles = store.articles.filter((entry) => entry.author_id === authorId || entry.author_id?.toString() === authorId?.toString())
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      return articles.map((article) => this._mapArticle(article, store))
    }

    const articles = await ArticleModel.find({ author_id: authorId })
      .populate("issue_id", "title issue_number")
      .sort({ created_at: -1 })
      .lean()
    return articles.map((a) => ({
      ...a,
      id: a._id,
      issue_title: a.issue_id?.title || null,
      issue_number: a.issue_id?.issue_number || null,
      issue_id: a.issue_id?._id || a.issue_id,
    }))
  }
}

module.exports = Article
module.exports.ArticleModel = ArticleModel
