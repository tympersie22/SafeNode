/**
 * Teams Documentation Page
 * Team collaboration guide
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'

export const TeamsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3">
              <Logo variant="nav" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-secondary-600 dark:from-white dark:to-secondary-400 bg-clip-text text-transparent">
                SafeNode
              </h1>
            </Link>
            <Link
              to="/"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="prose prose-slate dark:prose-invert max-w-none"
        >
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
            Team Collaboration with SafeNode
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Learn how to collaborate securely with your team using SafeNode team vaults.
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">What are Team Vaults?</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              Team vaults allow you to securely share passwords and credentials with your team members. Each team vault is encrypted and only accessible to invited members.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Creating a Team</h2>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>Go to Teams in the sidebar</li>
              <li>Click "Create Team"</li>
              <li>Enter team name and description</li>
              <li>Set team permissions and policies</li>
              <li>Invite team members</li>
            </ol>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Team Roles</h2>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Owner</h3>
                <p className="text-blue-800 dark:text-blue-300">Full access: create, edit, delete, share, and manage team settings</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">Admin</h3>
                <p className="text-purple-800 dark:text-purple-300">Can manage members and most team settings</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">Member</h3>
                <p className="text-green-800 dark:text-green-300">Can create and edit entries, but cannot delete or share</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-200 mb-2">Viewer</h3>
                <p className="text-gray-800 dark:text-gray-300">Read-only access to team vault entries</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Sharing Entries</h2>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>Open the entry you want to share</li>
              <li>Click "Share" or "Move to Team Vault"</li>
              <li>Select the team vault</li>
              <li>Choose who can access it</li>
              <li>Confirm the share</li>
            </ol>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Best Practices</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>Use team vaults for shared accounts and credentials</li>
              <li>Keep personal passwords in your personal vault</li>
              <li>Regularly review team member access</li>
              <li>Use appropriate roles for each team member</li>
              <li>Enable audit logging for compliance</li>
            </ul>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
            <p className="text-slate-600 dark:text-slate-400">
              Need help? <Link to="/contact" className="text-secondary-600 dark:text-secondary-400 hover:underline">Contact support</Link>.
            </p>
          </div>
        </motion.article>
      </main>

      <Footer />
    </div>
  )
}

export default TeamsPage

