import React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Calendar, ChevronLeft } from 'lucide-react'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'
import { getBlogPostBySlug } from './blogData'

const BlogPostPage: React.FC = () => {
  const navigate = useNavigate()
  const { slug = '' } = useParams<{ slug: string }>()
  const post = getBlogPostBySlug(slug)

  if (!post) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
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
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Logo variant="nav" />
              <Link to="/" className="text-xl font-bold bg-gradient-to-r from-slate-900 to-secondary-600 dark:from-white dark:to-secondary-400 bg-clip-text text-transparent">
                SafeNode
              </Link>
            </div>
            <button
              onClick={() => navigate('/blog')}
              className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              All posts
            </button>
          </div>
        </div>
      </nav>

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
