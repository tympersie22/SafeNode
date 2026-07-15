import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import MarketingHeader from '../../components/marketing/MarketingHeader'
import Footer from '../../components/marketing/Footer'
import { getBlogPostBySlug } from './blogData'

const BlogPostPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>()
  const post = getBlogPostBySlug(slug)

  if (!post) {
    return (
      <div className="sn-page min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary-600 dark:text-secondary-400">Blog</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">Post not found</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">The requested article does not exist or has been moved.</p>
          <Link to="/blog" className="inline-flex mt-6 text-sm font-semibold text-secondary-700 dark:text-secondary-300">
            Back to all posts
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="sn-page min-h-screen">
      <MarketingHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary-600 dark:text-secondary-400">{post.category}</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">{post.title}</h1>
        <div className="mt-4 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {post.date}
          </span>
          <span>{post.readTime}</span>
        </div>

        <article className="mt-10 space-y-6">
          {post.content.map((paragraph) => (
            <p key={paragraph} className="text-lg leading-8 text-slate-700 dark:text-slate-300">
              {paragraph}
            </p>
          ))}
        </article>
      </main>

      <Footer />
    </div>
  )
}

export default BlogPostPage
