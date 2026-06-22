// Database initialization script for MongoDB
// Seeds the database with sample data using Mongoose models

const mongoose = require("mongoose")

async function initializeDatabase() {
  try {
    console.log("🔄 Initializing MongoDB database...")

    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/newsletter_system"

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri)
    }

    console.log("✅ Connected to MongoDB server")

    // Import models (this registers schemas)
    const { UserModel } = require("../models/User")
    const { ArticleModel } = require("../models/Article")
    const { IssueModel } = require("../models/Issue")
    const { FeedbackModel } = require("../models/Feedback")

    // Step 1: Drop existing collections
    console.log("🔄 Clearing existing data...")
    const collections = await mongoose.connection.db.listCollections().toArray()
    for (const col of collections) {
      await mongoose.connection.db.dropCollection(col.name)
    }
    console.log("✅ Existing data cleared")

    // Step 2: Insert sample users
    console.log("🔄 Inserting sample data...")

    const hashedPassword = "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"

    const users = await UserModel.insertMany([
      { username: "admin_user", email: "admin@newsletter.com", password: hashedPassword, full_name: "System Administrator", role: "admin", subscription_status: "active", subscription_end_date: new Date("2025-12-31") },
      { username: "editor_john", email: "john.editor@newsletter.com", password: hashedPassword, full_name: "John Smith", role: "editor", subscription_status: "active", subscription_end_date: new Date("2025-12-31") },
      { username: "editor_sarah", email: "sarah.editor@newsletter.com", password: hashedPassword, full_name: "Sarah Johnson", role: "editor", subscription_status: "active", subscription_end_date: new Date("2025-12-31") },
      { username: "subscriber_mike", email: "mike@email.com", password: hashedPassword, full_name: "Mike Wilson", role: "subscriber", subscription_status: "active", subscription_end_date: new Date("2025-06-30") },
      { username: "subscriber_anna", email: "anna@email.com", password: hashedPassword, full_name: "Anna Davis", role: "subscriber", subscription_status: "active", subscription_end_date: new Date("2025-08-15") },
      { username: "subscriber_tom", email: "tom@email.com", password: hashedPassword, full_name: "Tom Brown", role: "subscriber", subscription_status: "expired", subscription_end_date: new Date("2024-12-31") },
      { username: "editor_lisa", email: "lisa.editor@newsletter.com", password: hashedPassword, full_name: "Lisa Chen", role: "editor", subscription_status: "active", subscription_end_date: new Date("2025-12-31") },
      { username: "subscriber_david", email: "david@email.com", password: hashedPassword, full_name: "David Rodriguez", role: "subscriber", subscription_status: "active", subscription_end_date: new Date("2025-09-20") },
    ])

    const u = users

    // Step 3: Insert sample issues
    const issues = await IssueModel.insertMany([
      { title: "Tech Trends 2025", description: "Exploring the latest technology trends and innovations shaping our digital future", issue_number: 1, publication_date: new Date("2025-01-15"), cover_image_url: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600", status: "published", created_by: u[1]._id },
      { title: "Digital Marketing Mastery", description: "Complete guide to modern digital marketing strategies, tools, and best practices", issue_number: 2, publication_date: new Date("2025-02-15"), cover_image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600", status: "published", created_by: u[2]._id },
      { title: "Future of Work", description: "How remote work, AI, and automation are reshaping the modern workplace", issue_number: 3, publication_date: new Date("2025-03-15"), cover_image_url: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=800&h=600", status: "published", created_by: u[6]._id },
      { title: "Cybersecurity Essentials", description: "Protecting your digital assets in an increasingly connected world", issue_number: 4, publication_date: new Date("2025-04-15"), cover_image_url: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600", status: "draft", created_by: u[1]._id },
      { title: "Sustainable Technology", description: "Green tech solutions for environmental challenges", issue_number: 5, publication_date: new Date("2025-05-15"), cover_image_url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600", status: "draft", created_by: u[2]._id },
    ])

    // Step 4: Insert sample articles
    const articles = await ArticleModel.insertMany([
      { title: "Artificial Intelligence Revolution", content: "Artificial Intelligence is transforming every aspect of our lives, from healthcare to transportation. This comprehensive exploration delves into the current state of AI technology, examining machine learning algorithms, neural networks, and deep learning frameworks that power modern AI systems.\n\nWe explore real-world applications across industries: AI-powered diagnostic tools in healthcare that can detect diseases earlier than human doctors, autonomous vehicles that promise to revolutionize transportation, and intelligent automation systems that are reshaping manufacturing processes.\n\nThe article also addresses critical ethical considerations surrounding AI development, including bias in algorithms, privacy concerns, and the need for responsible AI governance.", summary: "A comprehensive analysis of how artificial intelligence is revolutionizing industries and reshaping our future.", author_id: u[1]._id, issue_id: issues[0]._id, featured_image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600", status: "published", view_count: 245 },
      { title: "Social Media Marketing Strategies", content: "Social media has evolved from a simple communication platform to the cornerstone of modern digital marketing. This in-depth guide provides actionable strategies for businesses to leverage social media platforms effectively and build meaningful connections with their audience.\n\nWe begin with platform-specific strategies, examining the unique characteristics and best practices for Facebook, Instagram, Twitter, LinkedIn, TikTok, and emerging platforms.", summary: "Essential strategies and best practices for successful social media marketing campaigns.", author_id: u[2]._id, issue_id: issues[1]._id, featured_image_url: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600", status: "published", view_count: 189 },
      { title: "Remote Work Best Practices", content: "The global shift to remote work has fundamentally changed how we approach professional collaboration and productivity. This comprehensive guide outlines proven strategies for thriving in remote work environments, addressing challenges faced by both employees and managers.\n\nWe start with the fundamentals of setting up an effective home office, covering ergonomic considerations, technology requirements, and creating boundaries between work and personal spaces.", summary: "Complete guide to excelling in remote work environments.", author_id: u[1]._id, issue_id: issues[2]._id, featured_image_url: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600", status: "published", view_count: 167 },
      { title: "Cybersecurity Essentials", content: "In our increasingly digital world, cybersecurity has become more critical than ever before. This comprehensive guide covers essential cybersecurity practices for individuals and businesses, providing practical strategies to protect against evolving digital threats.\n\nWe begin with an overview of the current threat landscape, examining common attack vectors including phishing, malware, ransomware, and social engineering.", summary: "Essential cybersecurity practices and strategies to protect against digital threats.", author_id: u[2]._id, issue_id: issues[0]._id, featured_image_url: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600", status: "published", view_count: 156 },
      { title: "Cloud Computing Fundamentals", content: "Cloud computing has revolutionized how businesses approach IT infrastructure and software deployment. This comprehensive introduction covers fundamental concepts, service models, and practical implementation strategies for organizations considering cloud adoption.\n\nWe explore the three primary cloud service models: Infrastructure as a Service (IaaS), Platform as a Service (PaaS), and Software as a Service (SaaS).", summary: "Comprehensive introduction to cloud computing concepts and implementation strategies.", author_id: u[6]._id, issue_id: issues[2]._id, featured_image_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600", status: "published", view_count: 134 },
      { title: "Data Analytics for Business", content: "Data analytics has become a critical competitive advantage for modern businesses. This practical guide explores how organizations can harness the power of data to drive informed decision-making and improve business outcomes.\n\nWe begin with foundational concepts, explaining different types of analytics: descriptive, diagnostic, predictive, and prescriptive.", summary: "Practical guide to implementing data analytics in business.", author_id: u[1]._id, issue_id: issues[1]._id, featured_image_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600", status: "published", view_count: 198 },
    ])

    // Step 5: Insert sample feedback
    await FeedbackModel.insertMany([
      { article_id: articles[0]._id, user_id: u[3]._id, rating: 5, comment: "Excellent article! Very comprehensive and well-researched." },
      { article_id: articles[0]._id, user_id: u[4]._id, rating: 4, comment: "Great overview of AI trends. Would love more technical details." },
      { article_id: articles[0]._id, user_id: u[5]._id, rating: 5, comment: "This article helped me understand AI applications in my industry." },
      { article_id: articles[0]._id, user_id: u[7]._id, rating: 4, comment: "Well-written and informative." },
      { article_id: articles[1]._id, user_id: u[3]._id, rating: 4, comment: "Solid social media strategies." },
      { article_id: articles[1]._id, user_id: u[4]._id, rating: 3, comment: "Good content but could use more recent case studies." },
      { article_id: articles[1]._id, user_id: u[5]._id, rating: 5, comment: "Fantastic guide! Already seeing improved engagement." },
      { article_id: articles[2]._id, user_id: u[3]._id, rating: 5, comment: "Perfect timing for this article. Tips are practical." },
      { article_id: articles[2]._id, user_id: u[7]._id, rating: 4, comment: "Great insights on managing remote teams." },
      { article_id: articles[3]._id, user_id: u[3]._id, rating: 5, comment: "Cybersecurity is so important. Covers all the basics perfectly." },
      { article_id: articles[3]._id, user_id: u[5]._id, rating: 4, comment: "Very practical advice for business security." },
      { article_id: articles[3]._id, user_id: u[7]._id, rating: 5, comment: "Comprehensive coverage of cybersecurity essentials." },
      { article_id: articles[4]._id, user_id: u[4]._id, rating: 4, comment: "Good intro to cloud computing." },
      { article_id: articles[4]._id, user_id: u[5]._id, rating: 3, comment: "Could use more pricing comparisons." },
      { article_id: articles[5]._id, user_id: u[3]._id, rating: 5, comment: "Excellent guide to data analytics." },
      { article_id: articles[5]._id, user_id: u[7]._id, rating: 4, comment: "Well-structured. Business case studies were enlightening." },
    ])

    // Verify setup
    const userCount = await UserModel.countDocuments()
    const issueCount = await IssueModel.countDocuments()
    const articleCount = await ArticleModel.countDocuments()
    const feedbackCount = await FeedbackModel.countDocuments()

    console.log("\n📊 Database initialization complete:")
    console.log("   users: " + userCount + " records")
    console.log("   issues: " + issueCount + " records")
    console.log("   articles: " + articleCount + " records")
    console.log("   feedback: " + feedbackCount + " records")

    return true
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message)
    console.error("Full error:", error)
    throw error
  }
}

module.exports = { initializeDatabase }
