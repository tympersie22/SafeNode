import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { initiateSSOLogin, getSSOProviders } from '../../services/ssoService'
import type { SSOProvider } from '../../services/ssoService'

interface SocialAuthButtonsProps {
  mode: 'login' | 'signup'
  disabled?: boolean
}

const providerIcons: Record<string, React.ReactNode> = {
  google: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  microsoft: (
    <svg className="w-5 h-5" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#f25022" d="M0 0h11v11H0z"/>
      <path fill="#00a4ef" d="M12 0h11v11H12z"/>
      <path fill="#7fba00" d="M0 12h11v11H0z"/>
      <path fill="#ffb900" d="M12 12h11v11H12z"/>
    </svg>
  ),
  github: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.425 22 12.017 22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
    </svg>
  ),
  apple: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.465 2.206-1.242 2.97-.86.844-1.81 1.332-2.92 1.244-.141-1.078.39-2.232 1.166-2.985.42-.42.97-.754 1.581-.977.61-.222 1.143-.288 1.415-.252zM20.485 17.138c-.36.83-.79 1.603-1.29 2.318-.68.97-1.237 1.64-1.673 2.01-.675.607-1.398.916-2.168.93-.552 0-1.218-.157-1.996-.472-.78-.315-1.496-.473-2.147-.473-.683 0-1.416.158-2.2.473-.784.315-1.416.482-1.894.5-.738.032-1.48-.285-2.223-.95-.475-.403-1.058-1.097-1.748-2.083-.74-1.05-1.35-2.268-1.83-3.653-.515-1.497-.773-2.946-.773-4.346 0-1.605.346-2.99 1.04-4.152.545-.933 1.27-1.67 2.18-2.212.909-.542 1.891-.817 2.945-.826.578 0 1.337.179 2.28.536.942.357 1.548.536 1.818.536.202 0 .888-.214 2.057-.643 1.104-.4 2.036-.567 2.795-.5 2.058.166 3.605.979 4.64 2.441-1.84 1.114-2.751 2.674-2.733 4.677.017 1.561.583 2.862 1.697 3.902.5.48 1.058.852 1.676 1.116-.135.39-.277.77-.428 1.142z"/>
    </svg>
  ),
}

const getFallbackIcon = (name: string) => (
  <span className="text-xs font-bold uppercase">{name.slice(0, 1)}</span>
)

const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ mode, disabled = false }) => {
  const [providers, setProviders] = React.useState<SSOProvider[]>([])
  const [loadingSSO, setLoadingSSO] = React.useState(false)
  const prefersReducedMotion = useReducedMotion()

  React.useEffect(() => {
    getSSOProviders()
      .then(setProviders)
      .catch(() => setProviders([]))
  }, [])

  if (providers.length === 0) {
    return null
  }

  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">
            {mode === 'signup' ? 'Or sign up with' : 'Or continue with'}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {providers.map((provider) => (
          <motion.button
            key={provider.id}
            type="button"
            onClick={() => {
              setLoadingSSO(true)
              try {
                initiateSSOLogin(provider.id)
              } catch {
                setLoadingSSO(false)
              }
            }}
            disabled={disabled || loadingSSO}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            aria-label={`${mode === 'signup' ? 'Sign up' : 'Sign in'} with ${provider.name}`}
            title={provider.name}
          >
            {providerIcons[provider.id] || getFallbackIcon(provider.name)}
            <span className="sr-only">{provider.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default SocialAuthButtons
