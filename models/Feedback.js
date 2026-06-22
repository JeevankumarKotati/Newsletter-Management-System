// Feedback model - handles user feedback and ratings for articles (MongoDB/Mongoose)

const mongoose = require("mongoose")
const { getStore } = require("./memoryStore")

const feedbackSchema = new mongoose.Schema(
  {
    article_id: { type: mongoose.Schema.Types.ObjectId, ref: "Article", required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
)

// One feedback per user per article
feedbackSchema.index({ user_id: 1, article_id: 1 }, { unique: true })
feedbackSchema.index({ article_id: 1 })
feedbackSchema.index({ rating: 1 })

const FeedbackModel = mongoose.model("Feedback", feedbackSchema)

class Feedback {
  constructor(db) {
    this.db = db
  }

  _isMemoryMode() {
    return this.db?.mode === "memory"
  }

  async createOrUpdate(feedbackData) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const existingIndex = store.feedback.findIndex((entry) => entry.article_id === feedbackData.article_id && entry.user_id === feedbackData.user_id)
      if (existingIndex >= 0) {
        store.feedback[existingIndex] = { ...store.feedback[existingIndex], rating: feedbackData.rating, comment: feedbackData.comment, created_at: new Date() }
        return store.feedback[existingIndex].id
      }

      const feedback = {
        id: `feedback_${store.counters.feedback++}`,
        article_id: feedbackData.article_id,
        user_id: feedbackData.user_id,
        rating: feedbackData.rating,
        comment: feedbackData.comment || null,
        created_at: new Date(),
      }
      store.feedback.push(feedback)
      return feedback.id
    }

    const { article_id, user_id, rating, comment } = feedbackData
    const result = await FeedbackModel.findOneAndUpdate(
      { article_id, user_id },
      { rating, comment, created_at: new Date() },
      { upsert: true, new: true }
    )
    console.log(`✅ Feedback created/updated for article ${article_id} by user ${user_id}`)
    return result._id
  }

  async getByArticle(articleId) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const feedback = store.feedback.filter((entry) => entry.article_id === articleId || entry.article_id?.toString() === articleId?.toString())
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      return feedback.map((entry) => ({
        ...entry,
        user_name: store.users.find((user) => user.id === entry.user_id || user.id?.toString() === entry.user_id?.toString())?.full_name || null,
        user_id: entry.user_id,
      }))
    }

    const feedback = await FeedbackModel.find({ article_id: articleId })
      .populate("user_id", "full_name")
      .sort({ created_at: -1 })
      .lean()
    return feedback.map((f) => ({
      ...f,
      id: f._id,
      user_name: f.user_id?.full_name || null,
      user_id: f.user_id?._id || f.user_id,
    }))
  }

  async getByUserAndArticle(userId, articleId) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const feedback = store.feedback.find((entry) => (entry.user_id === userId || entry.user_id?.toString() === userId?.toString()) && (entry.article_id === articleId || entry.article_id?.toString() === articleId?.toString()))
      return feedback ? { ...feedback } : null
    }

    const f = await FeedbackModel.findOne({ user_id: userId, article_id: articleId }).lean()
    if (f) { f.id = f._id }
    return f || null
  }

  async getAll() {
    if (this._isMemoryMode()) {
      const store = getStore()
      return store.feedback.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((entry) => ({
        ...entry,
        user_name: store.users.find((user) => user.id === entry.user_id || user.id?.toString() === entry.user_id?.toString())?.full_name || null,
        article_title: store.articles.find((article) => article.id === entry.article_id || article.id?.toString() === entry.article_id?.toString())?.title || null,
      }))
    }

    const feedback = await FeedbackModel.find()
      .populate("user_id", "full_name")
      .populate("article_id", "title")
      .sort({ created_at: -1 })
      .lean()
    return feedback.map((f) => ({
      ...f,
      id: f._id,
      user_name: f.user_id?.full_name || null,
      article_title: f.article_id?.title || null,
      user_id: f.user_id?._id || f.user_id,
      article_id: f.article_id?._id || f.article_id,
    }))
  }

  async getStats() {
    if (this._isMemoryMode()) {
      const store = getStore()
      const totalFeedback = store.feedback.length
      const averageRating = totalFeedback ? store.feedback.reduce((sum, entry) => sum + entry.rating, 0) / totalFeedback : 0
      return {
        total_feedback: totalFeedback,
        average_rating: averageRating,
        five_star_count: store.feedback.filter((entry) => entry.rating === 5).length,
        four_star_count: store.feedback.filter((entry) => entry.rating === 4).length,
        three_star_count: store.feedback.filter((entry) => entry.rating === 3).length,
        two_star_count: store.feedback.filter((entry) => entry.rating === 2).length,
        one_star_count: store.feedback.filter((entry) => entry.rating === 1).length,
      }
    }

    const stats = await FeedbackModel.aggregate([
      {
        $group: {
          _id: null,
          total_feedback: { $sum: 1 },
          average_rating: { $avg: "$rating" },
          five_star_count: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          four_star_count: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          three_star_count: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          two_star_count: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          one_star_count: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ])
    return stats[0] || {
      total_feedback: 0, average_rating: 0,
      five_star_count: 0, four_star_count: 0, three_star_count: 0,
      two_star_count: 0, one_star_count: 0,
    }
  }

  async delete(id) {
    if (this._isMemoryMode()) {
      const store = getStore()
      store.feedback = store.feedback.filter((entry) => entry.id !== id && entry.id?.toString() !== id?.toString())
      return true
    }

    const result = await FeedbackModel.findByIdAndDelete(id)
    if (result) console.log(`✅ Feedback deleted: ID ${id}`)
    return !!result
  }

  async getTopRatedArticles(limit = 10) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const articleRatings = store.feedback.reduce((acc, entry) => {
        const key = entry.article_id
        if (!acc[key]) acc[key] = { article_id: key, ratings: [], count: 0 }
        acc[key].ratings.push(entry.rating)
        acc[key].count += 1
        return acc
      }, {})

      return Object.values(articleRatings)
        .map((entry) => {
          const article = store.articles.find((articleEntry) => articleEntry.id === entry.article_id || articleEntry.id?.toString() === entry.article_id?.toString())
          if (!article || article.status !== "published") return null
          return {
            id: entry.article_id,
            title: article.title,
            average_rating: entry.ratings.reduce((sum, rating) => sum + rating, 0) / entry.ratings.length,
            feedback_count: entry.count,
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.average_rating - a.average_rating || b.feedback_count - a.feedback_count)
        .slice(0, limit)
    }

    const ArticleModel = mongoose.model("Article")
    const results = await FeedbackModel.aggregate([
      {
        $group: {
          _id: "$article_id",
          average_rating: { $avg: "$rating" },
          feedback_count: { $sum: 1 },
        },
      },
      { $match: { feedback_count: { $gte: 1 } } },
      { $sort: { average_rating: -1, feedback_count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "articles",
          localField: "_id",
          foreignField: "_id",
          as: "article",
        },
      },
      { $unwind: "$article" },
      { $match: { "article.status": "published" } },
      {
        $project: {
          id: "$_id",
          title: "$article.title",
          average_rating: 1,
          feedback_count: 1,
        },
      },
    ])
    return results
  }
}

module.exports = Feedback
module.exports.FeedbackModel = FeedbackModel
