// Issue model - handles magazine/newsletter issue operations (MongoDB/Mongoose)

const mongoose = require("mongoose")
const { getStore } = require("./memoryStore")

const issueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String },
    issue_number: { type: Number, required: true, unique: true },
    publication_date: { type: Date, required: true },
    cover_image_url: {
      type: String,
      default: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600",
    },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
)

issueSchema.index({ status: 1 })
issueSchema.index({ publication_date: -1 })

const IssueModel = mongoose.model("Issue", issueSchema)

class Issue {
  constructor(db) {
    this.db = db
  }

  _isMemoryMode() {
    return this.db?.mode === "memory"
  }

  async create(issueData) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const issue = {
        id: `issue_${store.counters.issue++}`,
        title: issueData.title,
        description: issueData.description,
        issue_number: issueData.issue_number,
        publication_date: issueData.publication_date,
        cover_image_url: issueData.cover_image_url || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600",
        status: issueData.status || "draft",
        created_by: issueData.created_by,
        created_at: new Date(),
        updated_at: new Date(),
      }
      store.issues.push(issue)
      return issue.id
    }

    const { title, description, issue_number, publication_date, cover_image_url, status = "draft", created_by } = issueData
    const issue = await IssueModel.create({
      title, description, issue_number, publication_date, cover_image_url, status, created_by,
    })
    console.log(`✅ Issue created with ID: ${issue._id}`)
    return issue._id
  }

  _mapIssue(issue, store) {
    const creator = store.users.find((entry) => entry.id === issue.created_by || entry.id?.toString() === issue.created_by?.toString())
    const articleCount = store.articles.filter((entry) => entry.issue_id === issue.id || entry.issue_id?.toString() === issue.id?.toString()).length
    return {
      ...issue,
      creator_name: creator?.full_name || null,
      created_by: issue.created_by,
      article_count: articleCount,
    }
  }

  async getAll(status = null) {
    if (this._isMemoryMode()) {
      const store = getStore()
      let issues = store.issues.slice().sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date))
      if (status) issues = issues.filter((entry) => entry.status === status)
      return issues.map((issue) => this._mapIssue(issue, store))
    }

    const filter = status ? { status } : {}
    const issues = await IssueModel.find(filter)
      .populate("created_by", "full_name")
      .sort({ publication_date: -1 })
      .lean()

    const ArticleModel = mongoose.model("Article")
    const counts = await ArticleModel.aggregate([
      { $match: { issue_id: { $in: issues.map((i) => i._id) } } },
      { $group: { _id: "$issue_id", count: { $sum: 1 } } },
    ])
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]))

    return issues.map((i) => ({
      ...i,
      id: i._id,
      creator_name: i.created_by?.full_name || null,
      created_by: i.created_by?._id || i.created_by,
      article_count: countMap[i._id.toString()] || 0,
    }))
  }

  async getPublished() {
    if (this._isMemoryMode()) {
      const store = getStore()
      const issues = store.issues.filter((entry) => entry.status === "published")
        .slice()
        .sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date))
      return issues.map((issue) => this._mapIssue(issue, store))
    }

    const issues = await IssueModel.find({ status: "published" })
      .populate("created_by", "full_name")
      .sort({ publication_date: -1 })
      .lean()

    const ArticleModel = mongoose.model("Article")
    const counts = await ArticleModel.aggregate([
      { $match: { issue_id: { $in: issues.map((i) => i._id) }, status: "published" } },
      { $group: { _id: "$issue_id", count: { $sum: 1 } } },
    ])
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]))

    return issues.map((i) => ({
      ...i,
      id: i._id,
      creator_name: i.created_by?.full_name || null,
      created_by: i.created_by?._id || i.created_by,
      article_count: countMap[i._id.toString()] || 0,
    }))
  }

  async getById(id) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const issue = store.issues.find((entry) => entry.id === id || entry.id?.toString() === id?.toString())
      return issue ? this._mapIssue(issue, store) : null
    }

    const issue = await IssueModel.findById(id)
      .populate("created_by", "full_name")
      .lean()
    if (!issue) return null
    return {
      ...issue,
      id: issue._id,
      creator_name: issue.created_by?.full_name || null,
      created_by: issue.created_by?._id || issue.created_by,
    }
  }

  async getArticles(issueId, status = null) {
    if (this._isMemoryMode()) {
      const store = getStore()
      let articles = store.articles.filter((entry) => entry.issue_id === issueId || entry.issue_id?.toString() === issueId?.toString())
      if (status) articles = articles.filter((entry) => entry.status === status)
      return articles.map((article) => ({
        ...article,
        author_name: store.users.find((entry) => entry.id === article.author_id || entry.id?.toString() === article.author_id?.toString())?.full_name || null,
        author_id: article.author_id,
      }))
    }

    const ArticleModel = mongoose.model("Article")
    const filter = { issue_id: issueId }
    if (status) filter.status = status

    const articles = await ArticleModel.find(filter)
      .populate("author_id", "full_name")
      .sort({ created_at: -1 })
      .lean()

    return articles.map((a) => ({
      ...a,
      id: a._id,
      author_name: a.author_id?.full_name || null,
      author_id: a.author_id?._id || a.author_id,
    }))
  }

  async update(id, issueData) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const index = store.issues.findIndex((entry) => entry.id === id || entry.id?.toString() === id?.toString())
      if (index === -1) return false
      store.issues[index] = { ...store.issues[index], ...issueData, updated_at: new Date() }
      return true
    }

    const { title, description, issue_number, publication_date, cover_image_url, status } = issueData
    const result = await IssueModel.findByIdAndUpdate(id, {
      title, description, issue_number, publication_date, cover_image_url, status,
    })
    if (result) console.log(`✅ Issue updated: ID ${id}`)
    return !!result
  }

  async delete(id) {
    if (this._isMemoryMode()) {
      const store = getStore()
      store.articles = store.articles.filter((entry) => entry.issue_id !== id && entry.issue_id?.toString() !== id?.toString())
      store.issues = store.issues.filter((entry) => entry.id !== id && entry.id?.toString() !== id?.toString())
      return true
    }

    const ArticleModel = mongoose.model("Article")
    await ArticleModel.deleteMany({ issue_id: id })
    const result = await IssueModel.findByIdAndDelete(id)
    if (result) console.log(`✅ Issue deleted: ID ${id}`)
    return !!result
  }

  async getNextIssueNumber() {
    if (this._isMemoryMode()) {
      const store = getStore()
      const latest = store.issues.slice().sort((a, b) => b.issue_number - a.issue_number)[0]
      return (latest?.issue_number || 0) + 1
    }

    const latest = await IssueModel.findOne().sort({ issue_number: -1 }).lean()
    return (latest?.issue_number || 0) + 1
  }
}

module.exports = Issue
module.exports.IssueModel = IssueModel
